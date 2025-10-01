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

// Support multiple presets: switch via environment variable or default to avitoDemo
const PRESET_NAME = process.env.SANDBOX_PRESET || 'avitoDemo';
const DATASET_PATH = path.resolve(ROOT_DIR, `src/pages/Sandbox/data/${PRESET_NAME}.json`);

console.log(`[sandbox-js] Loading preset: ${PRESET_NAME} from ${DATASET_PATH}`);

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

// Find the start node dynamically
const findStartNode = () => {
  for (const node of NODE_REGISTRY.values()) {
    if (node.start === true) {
      return node.id;
    }
  }
  // Fallback to first node if no start node marked
  return NODE_REGISTRY.size > 0 ? NODE_REGISTRY.keys().next().value : null;
};

const START_NODE_ID = findStartNode();

const DEFAULT_INPUTS = { email: '' };

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
  
  // Special case: random selection for adding recommended items
  if (node.id === 'action-add-recommended' && edges.length > 0) {
    const randomIndex = Math.floor(Math.random() * edges.length);
    console.log(`[sandbox-js] Random selection for ${node.id}: edge ${randomIndex + 1}/${edges.length} (${edges[randomIndex].id})`);
    return edges[randomIndex];
  }
  
  // Special case: modify-cart-item actions (increment/decrement)
  if (node.data?.actionType === 'modify-cart-item' && edges.length > 0) {
    const edge = edges[0]; // Используем первый (и единственный) edge
    const operation = node.data.operation; // 'increment' или 'decrement'
    const config = node.data.config || {};
    
    // Получаем itemId из query parameters (переданный через inputs)
    const itemIdParam = config.itemIdParam || 'itemId';
    const itemId = context._queryParams?.[itemIdParam];
    
    if (!itemId) {
      console.warn(`[sandbox-js] modify-cart-item: missing ${itemIdParam} parameter`);
      return edge;
    }
    
    // Применяем трансформацию и создаём динамический contextPatch
    const patch = applyCartItemModification(context, itemId, operation, config);
    
    // Возвращаем edge с обновлённым contextPatch
    return {
      ...edge,
      contextPatch: patch
    };
  }
  
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

// Вспомогательная функция для модификации товаров в корзине
const applyCartItemModification = (context, itemId, operation, config) => {
  const patch = {};
  const minQty = config.minQuantity ?? 1;
  const maxQty = config.maxQuantity ?? 99;
  const arrays = config.arrays || ['cart.pearStoreItems', 'cart.technoStoreItems'];
  
  // Ищем товар во всех указанных массивах
  for (const arrayPath of arrays) {
    const items = getContextValue(context, arrayPath) ?? [];
    const itemIndex = items.findIndex(item => item?.id === itemId);
    
    if (itemIndex !== -1) {
      const item = items[itemIndex];
      const currentQty = item?.quantity ?? 1;
      
      // Вычисляем новое количество в зависимости от операции
      let newQty = currentQty;
      if (operation === 'increment') {
        newQty = Math.min(currentQty + 1, maxQty);
      } else if (operation === 'decrement') {
        newQty = Math.max(currentQty - 1, minQty);
      }
      
      // Устанавливаем новое количество
      patch[`${arrayPath}.${itemIndex}.quantity`] = newQty;
      
      // Пересчитываем totalPrice и selectedCount если указано в конфиге
      if (Array.isArray(config.recalculate) && config.recalculate.length > 0) {
        const totals = calculateCartTotals(context, arrays, arrayPath, itemIndex, newQty);
        
        config.recalculate.forEach(field => {
          if (field === 'cart.totalPrice' && totals.totalPrice !== undefined) {
            patch['cart.totalPrice'] = totals.totalPrice;
          } else if (field === 'cart.selectedCount' && totals.selectedCount !== undefined) {
            patch['cart.selectedCount'] = totals.selectedCount;
          }
        });
      }
      
      console.log(`[sandbox-js] modify-cart-item: ${operation} ${itemId} → qty=${newQty}, total=${patch['cart.totalPrice']}, count=${patch['cart.selectedCount']}`);
      return patch;
    }
  }
  
  console.warn(`[sandbox-js] modify-cart-item: item ${itemId} not found`);
  return patch;
};

// Вспомогательная функция для расчёта итогов корзины
const calculateCartTotals = (context, arrayPaths, modifiedArrayPath, modifiedIndex, newQty) => {
  let totalPrice = 0;
  let selectedCount = 0;
  
  arrayPaths.forEach(arrayPath => {
    const items = getContextValue(context, arrayPath) ?? [];
    items.forEach((item, idx) => {
      const qty = (arrayPath === modifiedArrayPath && idx === modifiedIndex) 
        ? newQty 
        : (item?.quantity ?? 1);
      const price = item?.price ?? 0;
      
      totalPrice += qty * price;
      selectedCount += qty;
    });
  });
  
  return { totalPrice, selectedCount };
};

const runEdgeSequence = (edgeId, sourceNodeId, startingContext) => {
  if (!edgeId) {
    return { context: startingContext, finalNodeId: sourceNodeId };
  }

  let context = startingContext;
  let currentEdgeId = edgeId;
  let currentEdge = null; // Храним сам edge, не только ID
  let currentSourceNodeId = sourceNodeId;
  let guard = 0;
  let lastTargetNodeId = sourceNodeId;

  while (currentEdgeId) {
    // Используем уже найденный edge или берём из registry
    const edge = currentEdge || EDGE_REGISTRY.get(currentEdgeId);
    currentEdge = null; // Сбрасываем для следующей итерации
    
    if (!edge) {
      throw new HttpError(500, `Edge '${currentEdgeId}' is not defined in sandbox flow`);
    }
    if (edge.source && edge.source !== currentSourceNodeId) {
      throw new HttpError(500, `Edge '${currentEdgeId}' is not connected to node '${currentSourceNodeId}'`);
    }

    context = applyContextPatch(context, edge.contextPatch ?? {}, context);
    
    // DEBUG: Проверяем, применился ли патч
    if (Object.keys(edge.contextPatch ?? {}).length > 0) {
      console.log(`[sandbox-js] Applied patch from edge ${edge.id}:`, JSON.stringify(edge.contextPatch, null, 2));
      console.log(`[sandbox-js] Context after patch - item-1 qty:`, getContextValue(context, 'cart.pearStoreItems.0.quantity'));
    }
    
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

    // Сохраняем и ID, и сам edge для следующей итерации
    currentEdgeId = nextEdge.id;
    currentEdge = nextEdge; // КЛЮЧЕВОЕ ИЗМЕНЕНИЕ: используем модифицированный edge
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

const getScreenPayload = (screenId) => {
  const screen = SCREEN_REGISTRY[screenId];
  if (!screen || typeof screen !== 'object') {
    throw new HttpError(500, `Unknown screen '${screenId}' in sandbox flow`);
  }
  // События уже описаны в компонентах JSON, инъекция не требуется
  return deepClone(screen);
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
  if (PRESET_NAME === 'ecommerceDashboard') {
    // ecommerceDashboard specific structure
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
  }
  
  // For other presets (avitoDemo), preserve full context
  return deepClone(coreContext);
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
  if (!START_NODE_ID) {
    throw new HttpError(500, 'No start node found in dataset');
  }
  const core = await buildBaseContextWithPrefetch();
  const context = buildApiContext(core, DEFAULT_INPUTS, stateOverridesForNode(START_NODE_ID));
  const screenId = resolveScreenId(START_NODE_ID);
  return makeScreenResponse(screenId, context);
};

const handleEvent = async (eventName, query) => {
  if (!eventName) {
    throw new HttpError(400, "Parameter 'event' is required");
  }
  const normalized = eventName.trim().toLowerCase();
  
  // Ищем ребро с событием в EDGE_REGISTRY (любой source, который имеет event)
  let matchingEdge = null;
  let sourceNodeId = null;
  
  for (const [edgeId, edge] of EDGE_REGISTRY.entries()) {
    if (edge.event && edge.event.toLowerCase() === normalized) {
      matchingEdge = edge;
      sourceNodeId = edge.source || START_NODE_ID;
      break;
    }
  }
  
  if (!matchingEdge) {
    throw new HttpError(404, `Unknown event '${eventName}'`);
  }

  const formValues = extractFormValues(query);
  const inputs = { ...DEFAULT_INPUTS, ...formValues };
  if (typeof inputs.email === 'string') {
    inputs.email = inputs.email.trim();
  }

  const baseContext = await buildBaseContextWithPrefetch();
  
  // Добавляем query params в контекст для доступа в action-узлах
  const contextWithParams = {
    ...baseContext,
    _queryParams: formValues
  };
  
  // Для ecommerceDashboard добавляем inputs напрямую в контекст
  if (PRESET_NAME === 'ecommerceDashboard') {
    contextWithParams.inputs = { ...DEFAULT_INPUTS, ...inputs };
  }

  const edgeResult = runEdgeSequence(matchingEdge.id, sourceNodeId, contextWithParams);
  const finalNodeId = edgeResult.finalNodeId;
  let contextAfterFlow = edgeResult.context;

  if (finalNodeId === SUCCESS_NODE_ID) {
    const successPayload = await getSuccessData();
    contextAfterFlow = mergeExternalData(contextAfterFlow, 'data.external.success', successPayload);
  }

  if (!finalNodeId) {
    throw new HttpError(500, `Event '${eventName}' did not resolve to a target node`);
  }

  const keepInputs = matchingEdge.keepInputs ?? true;
  const inputsForContext = keepInputs ? inputs : deepClone(DEFAULT_INPUTS);
  const screenId = resolveScreenId(finalNodeId);
  
  // Удаляем внутренние служебные поля перед отправкой
  const cleanContext = { ...contextAfterFlow };
  delete cleanContext._queryParams;
  
  const context = buildApiContext(cleanContext, inputsForContext, stateOverridesForNode(finalNodeId));
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
