import express from 'express';
import cors from 'cors';
import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import {
  applyContextPatch,
  resolveBindingValue,
  isBindingValue,
  getContextValue
} from '../../src/pages/Sandbox/utils/bindings.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..', '..');
const DATASET_PATH = path.resolve(ROOT_DIR, 'src/pages/Sandbox/data/ecommerceDashboard.json');

const deepClone = (value) => {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value));
};

const loadDataset = async () => {
  try {
    const fileContent = await readFile(DATASET_PATH, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error) {
    const help = `Не удалось прочитать JSON-панель по пути ${pathToFileURL(DATASET_PATH).href}`;
    console.error('[sandbox-js] dataset load failed', help, error);
    throw new Error(`${help}: ${error.message}`);
  }
};

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

const dataset = await loadDataset();

const BASE_CONTEXT = deepClone(dataset.initialContext ?? {});
const SCREEN_REGISTRY = dataset.screens ?? {};
const NODE_REGISTRY = new Map();
const EDGE_REGISTRY = new Map();

(dataset.nodes ?? []).forEach((node) => {
  if (!node || typeof node !== 'object' || !node.id) {
    return;
  }
  NODE_REGISTRY.set(node.id, node);
  (node.edges ?? []).forEach((edge) => {
    if (!edge || typeof edge !== 'object' || !edge.id) {
      return;
    }
    EDGE_REGISTRY.set(edge.id, { ...edge, source: node.id });
  });
});

const DEFAULT_INPUTS = { email: '' };

const EVENT_RULES = {
  checkemail: { sourceNode: 'email-entry', edgeId: 'edge-email-submit', keepInputs: true },
  retryfromsuccess: { sourceNode: 'email-valid', edgeId: 'edge-valid-retry', keepInputs: false },
  retryfromerror: { sourceNode: 'email-invalid', edgeId: 'edge-invalid-retry', keepInputs: false }
};

const BUTTON_EVENT_INJECTIONS = {};

const FETCH_TIMEOUT_MS = Number(process.env.SANDBOX_FETCH_TIMEOUT ?? 2000);
const PREFETCH_CACHE_TTL = Number(process.env.SANDBOX_PREFETCH_TTL ?? 60000);
const REMOTE_PREFETCH_URL = process.env.SANDBOX_PREFETCH_URL ?? 'https://dummyjson.com/quotes/random';
const REMOTE_SUCCESS_URL = process.env.SANDBOX_SUCCESS_URL ?? 'https://dummyjson.com/todos/random';
const DISABLE_REMOTE_FETCH = process.env.SANDBOX_FETCH_DISABLED === '1';
const SUCCESS_NODE_ID = 'email-valid';

const PREFETCH_FALLBACK = {
  title: 'Совет перед проверкой',
  description: 'Убедитесь, что адрес содержит @ и домен, прежде чем продолжить.'
};

let cachedPrefetchPayload = null;
let cachedPrefetchFetchedAt = 0;

const fetchJsonWithTimeout = async (url) => {
  if (DISABLE_REMOTE_FETCH || typeof fetch !== 'function') {
    return null;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      return null;
    }
    return await response.json();
  } catch (error) {
    if (process.env.NODE_ENV !== 'test') {
      console.warn('[sandbox-js] remote fetch failed', url, error?.message ?? error);
    }
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
};

const mapPrefetchResponse = (payload) => {
  if (!payload || typeof payload !== 'object') {
    return null;
  }
  const quote = typeof payload.quote === 'string' ? payload.quote.trim() : '';
  const author = typeof payload.author === 'string' ? payload.author.trim() : '';
  if (!quote) {
    return null;
  }
  const title = author ? `Совет от ${author}` : 'Совет от внешнего сервиса';
  return { title, description: quote };
};

const mapSuccessResponse = (payload) => {
  if (!payload || typeof payload !== 'object') {
    return null;
  }
  const todo = typeof payload.todo === 'string' ? payload.todo.trim() : '';
  if (!todo) {
    return null;
  }
  const completed = payload.completed === true;
  const title = completed ? 'Совет успешно выполнен' : 'Рекомендация для следующего шага';
  return {
    title,
    description: todo
  };
};

const getPrefetchData = async () => {
  const now = Date.now();
  if (cachedPrefetchPayload && (now - cachedPrefetchFetchedAt) < PREFETCH_CACHE_TTL) {
    return cachedPrefetchPayload;
  }

  const remotePayload = await fetchJsonWithTimeout(REMOTE_PREFETCH_URL);
  const mapped = mapPrefetchResponse(remotePayload) ?? PREFETCH_FALLBACK;
  cachedPrefetchPayload = mapped;
  cachedPrefetchFetchedAt = now;
  return mapped;
};

const getSuccessData = async () => {
  const remotePayload = await fetchJsonWithTimeout(REMOTE_SUCCESS_URL);
  return mapSuccessResponse(remotePayload) ?? {
    title: 'Совет по дальнейшим шагам',
    description: 'Используйте подтверждённый email, чтобы отправить приветственное письмо или запросить дополнительную информацию.'
  };
};

const mergeExternalData = (context, path, payload) => {
  if (!payload || typeof payload !== 'object') {
    return context;
  }
  return applyContextPatch(context, { [path]: payload }, context);
};

const safeJsonStringify = (value) => {
  try {
    return JSON.stringify(value, (_key, val) => {
      if (typeof val === 'bigint') {
        return val.toString();
      }
      return val;
    }, 2);
  } catch {
    return undefined;
  }
};

const cleanupObject = (value) => {
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  if (Array.isArray(value)) {
    return value.length > 0 ? value : undefined;
  }
  return Object.keys(value).length > 0 ? value : undefined;
};

const resolveConditionSourceValue = (condition, context) => {
  if (!condition || typeof condition !== 'object') {
    return undefined;
  }

  const { source, path, fallback, value } = condition;

  if (source !== undefined) {
    if (isBindingValue(source)) {
      return resolveBindingValue(source, context, fallback);
    }
    if (typeof source === 'string') {
      if (source.startsWith('${') && source.endsWith('}')) {
        return resolveBindingValue({ reference: source, value: fallback }, context, fallback);
      }
      return source;
    }
    return source;
  }

  if (typeof path === 'string' && path.trim().length > 0) {
    return getContextValue(context, path.trim());
  }

  return value;
};

const isEmptyValue = (candidate) => {
  if (candidate === null || candidate === undefined) {
    return true;
  }
  if (typeof candidate === 'string') {
    return candidate.trim().length === 0;
  }
  if (Array.isArray(candidate)) {
    return candidate.length === 0;
  }
  if (typeof candidate === 'object') {
    return Object.keys(candidate).length === 0;
  }
  return false;
};

const evaluateCondition = (condition, context) => {
  if (!condition || typeof condition !== 'object') {
    return false;
  }

  const type = typeof condition.type === 'string' ? condition.type : 'truthy';
  const rawValue = resolveConditionSourceValue(condition, context);
  let result = false;

  switch (type) {
    case 'regex': {
      const pattern = typeof condition.pattern === 'string' ? condition.pattern : '';
      if (!pattern) {
        result = false;
        break;
      }
      const flags = typeof condition.flags === 'string' ? condition.flags : '';
      try {
        const regex = new RegExp(pattern, flags);
        result = regex.test(String(rawValue ?? ''));
      } catch {
        result = false;
      }
      break;
    }
    case 'empty': {
      result = isEmptyValue(rawValue);
      break;
    }
    case 'nonEmpty': {
      result = !isEmptyValue(rawValue);
      break;
    }
    case 'equals': {
      result = rawValue === condition.value;
      break;
    }
    default: {
      result = Boolean(rawValue);
      break;
    }
  }

  if (condition.negate) {
    return !result;
  }
  return result;
};

const resolveConditionEdge = (node, context) => {
  if (!node || node.type !== 'action') {
    return null;
  }

  const edges = Array.isArray(node.edges) ? node.edges : [];
  const config = node.data?.config ?? {};
  const conditions = Array.isArray(config.conditions) ? config.conditions : [];

  for (let index = 0; index < conditions.length; index += 1) {
    const condition = conditions[index];
    const targetEdge = edges.find((edge) => edge && edge.id === condition?.edgeId);
    if (!targetEdge) {
      continue;
    }
    if (evaluateCondition(condition, context)) {
      return targetEdge;
    }
  }

  if (typeof config.fallbackEdgeId === 'string' && config.fallbackEdgeId.trim()) {
    const fallbackEdge = edges.find((edge) => edge && edge.id === config.fallbackEdgeId);
    if (fallbackEdge) {
      return fallbackEdge;
    }
  }

  if (edges.length === 1) {
    return edges[0];
  }

  return null;
};

const runEdgeSequence = (edgeId, sourceNodeId, startingContext) => {
  if (!edgeId) {
    return { context: startingContext, finalNodeId: sourceNodeId };
  }

  let context = startingContext;
  let currentEdgeId = edgeId;
  let currentSourceNodeId = sourceNodeId;
  let guard = 0;
  let lastTargetNodeId = sourceNodeId;

  while (currentEdgeId) {
    const edge = EDGE_REGISTRY.get(currentEdgeId);
    if (!edge) {
      throw new HttpError(500, `Edge '${currentEdgeId}' is not defined in sandbox flow`);
    }
    if (edge.source && edge.source !== currentSourceNodeId) {
      throw new HttpError(500, `Edge '${currentEdgeId}' is not connected to node '${currentSourceNodeId}'`);
    }

    context = applyContextPatch(context, edge.contextPatch ?? {}, context);
    lastTargetNodeId = edge.target ?? lastTargetNodeId;

    const targetNode = edge.target ? NODE_REGISTRY.get(edge.target) : undefined;
    if (!targetNode || targetNode.type !== 'action') {
      return {
        context,
        finalNodeId: targetNode?.id ?? lastTargetNodeId
      };
    }

    guard += 1;
    if (guard > 20) {
      throw new HttpError(500, `Action node '${targetNode.id}' produced too many transitions`);
    }

    const nextEdge = resolveConditionEdge(targetNode, context);
    if (!nextEdge) {
      return {
        context,
        finalNodeId: targetNode.id
      };
    }

    currentEdgeId = nextEdge.id;
    currentSourceNodeId = targetNode.id;
  }

  return {
    context,
    finalNodeId: lastTargetNodeId ?? currentSourceNodeId
  };
};

const logExchange = (label, req, { status, body, error } = {}) => {
  const payload = {
    method: req.method,
    url: req.originalUrl || req.url,
    requestQuery: cleanupObject(req.query),
    requestBody: cleanupObject(req.body),
    responseStatus: status,
    responseBody: body,
    error: error ? error.message : undefined
  };

  const serialized = safeJsonStringify(payload);
  if (serialized) {
    console.log(`[sandbox-js] ${label} exchange`, serialized);
  } else {
    console.log(`[sandbox-js] ${label} exchange`, payload);
  }
};

const cloneBaseContext = () => deepClone(BASE_CONTEXT);

const buildBaseContextWithPrefetch = async () => {
  const base = cloneBaseContext();
  const prefetchPayload = await getPrefetchData();
  return mergeExternalData(base, 'data.external.prefetch', prefetchPayload);
};

const stateOverridesForNode = (nodeId) => {
  const node = NODE_REGISTRY.get(nodeId);
  if (!node) {
    return {};
  }
  const { label } = node;
  if (typeof label === 'string' && label.trim()) {
    return { title: label.trim() };
  }
  return {};
};

const resolveScreenId = (nodeId) => {
  const node = NODE_REGISTRY.get(nodeId);
  if (!node) {
    throw new HttpError(500, `Unknown node '${nodeId}' in sandbox flow`);
  }
  const { screenId } = node;
  if (typeof screenId !== 'string' || !screenId.trim()) {
    throw new HttpError(500, `Node '${nodeId}' has no screenId binding`);
  }
  return screenId;
};

const injectButtonEvents = (screenId, screen) => {
  const injections = BUTTON_EVENT_INJECTIONS[screenId];
  if (!injections || !screen || typeof screen !== 'object') {
    return;
  }

  const componentMap = new Map();

  const registerComponent = (component) => {
    if (!component || typeof component !== 'object') {
      return;
    }
    if (component.id && !componentMap.has(component.id)) {
      componentMap.set(component.id, component);
    }
    const children = Array.isArray(component.children) ? component.children : [];
    children.forEach((child) => {
      if (child && typeof child === 'object') {
        registerComponent(child);
        return;
      }
      if (typeof child === 'string' && componentMap.has(child)) {
        registerComponent(componentMap.get(child));
      }
    });
  };

  const baseComponents = Array.isArray(screen.components) ? screen.components : [];
  baseComponents.forEach((component) => {
    if (component && typeof component === 'object' && component.id) {
      componentMap.set(component.id, component);
    }
  });
  baseComponents.forEach(registerComponent);

  if (screen.sections && typeof screen.sections === 'object') {
    Object.values(screen.sections).forEach(registerComponent);
  }

  Object.entries(injections).forEach(([componentId, eventName]) => {
    if (!eventName) {
      return;
    }
    const component = componentMap.get(componentId);
    if (!component || typeof component !== 'object') {
      return;
    }

    if (component.props && typeof component.props === 'object') {
      component.props.event = eventName;
    }
    if (component.properties && typeof component.properties === 'object') {
      component.properties.event = eventName;
    } else if (!component.props || typeof component.props !== 'object') {
      component.properties = { event: eventName };
    }
    component.event = eventName;
  });
};

const getScreenPayload = (screenId) => {
  const screen = SCREEN_REGISTRY[screenId];
  if (!screen || typeof screen !== 'object') {
    throw new HttpError(500, `Unknown screen '${screenId}' in sandbox flow`);
  }
  const screenCopy = deepClone(screen);
  injectButtonEvents(screenId, screenCopy);
  return screenCopy;
};

const buildDynamicPatch = (event, inputs) => {
  const patch = {};
  if (typeof inputs.email === 'string') {
    patch['inputs.email'] = inputs.email.trim();
  }
  return patch;
};

const applyPatchToContext = (baseContext, patch) => {
  if (!patch || Object.keys(patch).length === 0) {
    return deepClone(baseContext);
  }
  return applyContextPatch(baseContext, patch, baseContext);
};

const makeStateSnapshot = (context, overrides, inputs) => {
  const ui = (context && typeof context === 'object') ? context.ui ?? {} : {};
  const notifications = (ui && typeof ui === 'object') ? ui.notifications ?? {} : {};
  const data = (context && typeof context === 'object') ? context.data ?? {} : {};
  const validation = (data && typeof data === 'object') ? data.validation ?? {} : {};

  const status = overrides?.status
    ?? (typeof validation.status === 'string' ? validation.status : 'idle');

  const validationMessage = typeof validation.message === 'string' ? validation.message : undefined;
  const notificationMessage = typeof notifications.lastAction === 'string' ? notifications.lastAction : undefined;
  const message = overrides?.message ?? validationMessage ?? notificationMessage ?? '';

  const emailFromInputs = typeof inputs?.email === 'string' ? inputs.email.trim() : '';
  const emailFromContext = getContextValue(context, 'data.user.email');
  const email = overrides?.email
    ?? (emailFromInputs || (typeof emailFromContext === 'string' ? emailFromContext : ''));

  const details = Array.isArray(overrides?.details) ? overrides.details : [];
  if (details.length === 0) {
    const computed = [];
    if (message) {
      computed.push(message);
    }
    if (email) {
      computed.push(`Email: ${email}`);
    }
    return {
      title: overrides?.title
        ?? (ui?.screen && typeof ui.screen === 'object' && typeof ui.screen.title === 'string' ? ui.screen.title : 'Проверка email'),
      status,
      message,
      email,
      lastAction: typeof notifications.lastAction === 'string' ? notifications.lastAction : '',
      details: computed
    };
  }

  return {
    title: overrides?.title
      ?? (ui?.screen && typeof ui.screen === 'object' && typeof ui.screen.title === 'string' ? ui.screen.title : 'Проверка email'),
    status,
    message,
    email,
    lastAction: typeof notifications.lastAction === 'string' ? notifications.lastAction : '',
    details
  };
};

const buildApiContext = (coreContext, inputs, stateOverrides) => {
  const payload = {
    ui: deepClone(coreContext.ui ?? {}),
    data: deepClone(coreContext.data ?? {}),
    inputs: { ...DEFAULT_INPUTS, ...(inputs ?? {}) }
  };
  if (typeof payload.inputs.email === 'string') {
    payload.inputs.email = payload.inputs.email.trim();
  }
  payload.state = makeStateSnapshot(payload, stateOverrides ?? {}, payload.inputs);
  return payload;
};

const makeScreenResponse = (screenId, context) => ({
  screen: getScreenPayload(screenId),
  context
});

const extractFormValues = (query) => {
  const result = {};
  Object.entries(query).forEach(([key, value]) => {
    if (key === 'event') {
      return;
    }
    if (Array.isArray(value)) {
      result[key] = value[value.length - 1];
      return;
    }
    if (typeof value === 'string') {
      result[key] = value.trim();
      return;
    }
    result[key] = value;
  });
  return result;
};

const buildStartResponse = async () => {
  const core = await buildBaseContextWithPrefetch();
  const context = buildApiContext(core, DEFAULT_INPUTS, stateOverridesForNode('email-entry'));
  const screenId = resolveScreenId('email-entry');
  return makeScreenResponse(screenId, context);
};

const handleEvent = async (eventName, query) => {
  if (!eventName) {
    throw new HttpError(400, "Parameter 'event' is required");
  }
  const normalized = eventName.trim().toLowerCase();
  const rule = EVENT_RULES[normalized];
  if (!rule) {
    throw new HttpError(404, `Unknown event '${eventName}'`);
  }

  const formValues = extractFormValues(query);
  const inputs = { ...DEFAULT_INPUTS, ...formValues };
  if (typeof inputs.email === 'string') {
    inputs.email = inputs.email.trim();
  }

  const dynamicPatch = buildDynamicPatch(normalized, inputs);
  const baseContext = await buildBaseContextWithPrefetch();
  const contextWithInputs = applyPatchToContext(baseContext, dynamicPatch);

  const edgeResult = runEdgeSequence(rule.edgeId, rule.sourceNode, contextWithInputs);
  const finalNodeId = edgeResult.finalNodeId;
  let contextAfterFlow = edgeResult.context;

  if (finalNodeId === SUCCESS_NODE_ID) {
    const successPayload = await getSuccessData();
    contextAfterFlow = mergeExternalData(contextAfterFlow, 'data.external.success', successPayload);
  }

  if (!finalNodeId) {
    throw new HttpError(500, `Event '${eventName}' did not resolve to a target node`);
  }

  const keepInputs = rule.keepInputs ?? true;
  const inputsForContext = keepInputs ? inputs : deepClone(DEFAULT_INPUTS);
  const screenId = resolveScreenId(finalNodeId);
  const context = buildApiContext(contextAfterFlow, inputsForContext, stateOverridesForNode(finalNodeId));
  return makeScreenResponse(screenId, context);
};

const app = express();
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:4173',
    'http://127.0.0.1:4173'
  ],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json());

app.get('/api/start/', async (req, res) => {
  try {
    const payload = await buildStartResponse();
    logExchange('GET /api/start/', req, { status: 200, body: payload });
    res.json(payload);
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    const errorBody = { detail: error.message };
    logExchange('GET /api/start/', req, { status, body: errorBody, error });
    res.status(status).json(errorBody);
  }
});

app.get('/api/action', async (req, res) => {
  const eventParam = typeof req.query.event === 'string' ? req.query.event : Array.isArray(req.query.event) ? req.query.event[0] : undefined;
  try {
    const payload = await handleEvent(eventParam, req.query);
    logExchange('GET /api/action', req, { status: 200, body: payload });
    res.json(payload);
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    const errorBody = { detail: error.message };
    logExchange('GET /api/action', req, { status, body: errorBody, error });
    res.status(status).json(errorBody);
  }
});

const DEFAULT_PORT = Number(process.env.SANDBOX_API_PORT || process.env.PORT || 5050);

export const startServer = (port = DEFAULT_PORT) => {
  return app.listen(port, () => {
    console.log(`Sandbox JS API listening on http://localhost:${port}`);
  });
};

const isDirectRun = Array.isArray(process.argv)
  && process.argv.length > 1
  && pathToFileURL(process.argv[1]).href === import.meta.url;

if (isDirectRun) {
  startServer();
}
