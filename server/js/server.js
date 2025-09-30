import express from 'express';
import cors from 'cors';
import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { applyContextPatch } from '../../src/pages/Sandbox/utils/bindings.js';

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

const DEFAULT_INPUTS = { email: '', promo: '' };

const EVENT_RULES = {
  pay: { edgeId: 'edge-submit-success', targetNode: 'success' },
  cancel: { edgeId: 'edge-submit-cancel', targetNode: 'cancelled' },
  resume: { edgeId: 'edge-cancelled-retry', targetNode: 'checkout' },
  restart: { edgeId: 'edge-success-new-order', targetNode: 'checkout', keepInputs: false }
};

const BUTTON_EVENT_INJECTIONS = {
  'screen-checkout': {
    'button-3yqrdr-1758927807107': 'pay',
    'button-krym27-1758927807107': 'cancel'
  }
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
  const email = inputs.email?.trim();
  const promo = inputs.promo?.trim();

  if (event === 'pay') {
    const messageParts = [];
    if (email) {
      patch['data.user.email'] = email;
      messageParts.push(`чек отправлен на ${email}`);
    } else {
      messageParts.push('чек отправлен клиенту');
    }
    if (promo) {
      messageParts.push(`применён промокод ${promo}`);
    }
    let message = 'Платёж завершён';
    if (messageParts.length > 0) {
      message = `${message}, ${messageParts.join(', ')}`;
    }
    patch['ui.notifications.lastAction'] = message;
  } else if (event === 'cancel') {
    const parts = [];
    if (email) {
      patch['data.user.email'] = email;
      parts.push(`email клиента: ${email}`);
    }
    if (promo) {
      parts.push(`промокод: ${promo}`);
    }
    const base = 'Заказ перенесён в отменённые';
    patch['ui.notifications.lastAction'] = parts.length > 0 ? `${base}. ${parts.join(' ')}` : base;
  } else if (event === 'resume' || event === 'restart') {
    if (email) {
      patch['data.user.email'] = email;
    }
  }

  return patch;
};

const buildPatchForEvent = (event, inputs) => {
  const rule = EVENT_RULES[event];
  if (!rule) {
    throw new HttpError(404, `Unknown event '${event}'`);
  }
  const edge = EDGE_REGISTRY.get(rule.edgeId);
  if (!edge) {
    throw new HttpError(500, `Edge '${rule.edgeId}' is not defined in sandbox flow`);
  }
  const patch = deepClone(edge.contextPatch ?? {});
  const dynamicPatch = buildDynamicPatch(event, inputs);
  return { ...patch, ...dynamicPatch };
};

const applyPatchToContext = (baseContext, patch) => {
  if (!patch || Object.keys(patch).length === 0) {
    return deepClone(baseContext);
  }
  return applyContextPatch(baseContext, patch, baseContext);
};

const makeStateSnapshot = (context, overrides, inputs) => {
  const ui = (context && typeof context === 'object') ? context.ui ?? {} : {};
  const data = (context && typeof context === 'object') ? context.data ?? {} : {};
  const order = (data && typeof data === 'object') ? data.order ?? {} : {};
  const notifications = (ui && typeof ui === 'object') ? ui.notifications ?? {} : {};

  let cartItems = [];
  const cart = data.cart;
  if (cart && typeof cart === 'object' && Array.isArray(cart.items)) {
    cartItems = cart.items
      .filter((item) => item && typeof item === 'object' && typeof item.title === 'string')
      .map((item) => item.title);
  }

  const details = [];
  const overrideMessage = overrides?.lastMessage;
  const notificationMessage = notifications.lastAction;
  const message = overrideMessage ?? (typeof notificationMessage === 'string' ? notificationMessage : '');
  if (message) {
    details.push(message);
  }

  const email = inputs.email?.trim();
  const promo = inputs.promo?.trim();
  if (email) {
    details.push(`Email клиента: ${email}`);
  }
  if (promo) {
    details.push(`Промокод: ${promo}`);
  }

  return {
    title: overrides?.title
      ?? (ui?.screen && typeof ui.screen === 'object' && typeof ui.screen.title === 'string' ? ui.screen.title : 'E-commerce Dashboard'),
    status: overrides?.status ?? (typeof order.status === 'string' ? order.status : 'draft'),
    orderNumber: overrides?.orderNumber ?? order.number ?? 'ORD-1024',
    total: order.total,
    totalFormatted: order.totalFormatted,
    lastMessage: message,
    details: overrides?.details ?? details,
    items: overrides?.items ?? cartItems
  };
};

const buildApiContext = (coreContext, inputs, stateOverrides) => {
  const payload = {
    ui: deepClone(coreContext.ui ?? {}),
    data: deepClone(coreContext.data ?? {}),
    inputs: { ...DEFAULT_INPUTS, ...(inputs ?? {}) }
  };
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

const buildStartResponse = () => {
  const core = cloneBaseContext();
  const context = buildApiContext(core, DEFAULT_INPUTS, stateOverridesForNode('checkout'));
  const screenId = resolveScreenId('checkout');
  return makeScreenResponse(screenId, context);
};

const handleEvent = (eventName, query) => {
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
  const patch = buildPatchForEvent(normalized, inputs);

  const baseContext = cloneBaseContext();
  const patchedContext = applyPatchToContext(baseContext, patch);

  const email = inputs.email?.trim();
  if (email) {
    if (!patchedContext.data || typeof patchedContext.data !== 'object') {
      patchedContext.data = {};
    }
    if (!patchedContext.data.user || typeof patchedContext.data.user !== 'object') {
      patchedContext.data.user = {};
    }
    patchedContext.data.user.email = email;
  }

  const keepInputs = rule.keepInputs ?? true;
  const inputsForContext = keepInputs ? inputs : deepClone(DEFAULT_INPUTS);
  const screenId = resolveScreenId(rule.targetNode);
  const context = buildApiContext(patchedContext, inputsForContext, stateOverridesForNode(rule.targetNode));
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

app.get('/api/start/', (req, res) => {
  try {
    const payload = buildStartResponse();
    logExchange('GET /api/start/', req, { status: 200, body: payload });
    res.json(payload);
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    const errorBody = { detail: error.message };
    logExchange('GET /api/start/', req, { status, body: errorBody, error });
    res.status(status).json(errorBody);
  }
});

app.get('/api/action', (req, res) => {
  const eventParam = typeof req.query.event === 'string' ? req.query.event : Array.isArray(req.query.event) ? req.query.event[0] : undefined;
  try {
    const payload = handleEvent(eventParam, req.query);
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
