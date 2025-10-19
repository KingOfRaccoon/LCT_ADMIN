import { v4 as uuidv4 } from 'uuid';
import {
  getApiUrl,
  API_ENDPOINTS,
  logApiRequest,
  logApiResponse,
  logApiError
} from '../config/api.js';

const PRODUCTS_ENDPOINT = API_ENDPOINTS.PRODUCTS;
const PRODUCTS_WORKFLOW_ENDPOINT = API_ENDPOINTS.PRODUCTS_BY_WORKFLOW;
const DEFAULT_PRODUCT_VERSION = '1.0.0';

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function safeJsonParse(value) {
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    try {
      return JSON.parse(value.replace(/'/g, '"'));
    } catch (innerError) {
      console.warn('[productApi] Failed to parse workflow JSON', error, innerError);
      return null;
    }
  }
}

function countScreens(workflow) {
  if (!workflow) {
    return 0;
  }

  if (Number.isFinite(workflow.totalScreens)) {
    return workflow.totalScreens;
  }

  if (Array.isArray(workflow.nodes)) {
    return workflow.nodes.filter((node) => node?.type === 'screen').length;
  }

  if (isObject(workflow.screens)) {
    return Object.keys(workflow.screens).length;
  }

  return 0;
}

function countComponents(workflow) {
  if (!workflow) {
    return 0;
  }

  if (Number.isFinite(workflow.totalComponents)) {
    return workflow.totalComponents;
  }

  if (Array.isArray(workflow.nodes)) {
    return workflow.nodes.reduce((acc, node) => {
      const components = Number.parseInt(node?.data?.componentsCount ?? 0, 10);
      return acc + (Number.isFinite(components) ? components : 0);
    }, 0);
  }

  if (isObject(workflow.screens)) {
    return Object.values(workflow.screens).reduce((acc, screen) => {
      const components = Number.parseInt(screen?.components ?? screen?.componentsCount ?? 0, 10);
      return acc + (Number.isFinite(components) ? components : 0);
    }, 0);
  }

  return 0;
}

function createEmptyWorkflow(workflowId = uuidv4()) {
  const id = workflowId || uuidv4();
  return {
    id,
    workflow_id: id,
    name: 'New Workflow',
    version: DEFAULT_PRODUCT_VERSION,
    nodes: [],
    edges: [],
    screens: {},
    variableSchemas: {},
    initialContext: {}
  };
}

function prepareWorkflowPayload({
  workflow,
  workflowAsString,
  workflowId
} = {}) {
  let resolvedWorkflow = workflow;

  if (typeof resolvedWorkflow === 'string') {
    resolvedWorkflow = safeJsonParse(resolvedWorkflow);
  }

  if (!resolvedWorkflow && typeof workflowAsString === 'string') {
    resolvedWorkflow = safeJsonParse(workflowAsString);
  }

  if (!isObject(resolvedWorkflow)) {
    resolvedWorkflow = null;
  }

  let resolvedWorkflowId = workflowId;

  if (resolvedWorkflow) {
    resolvedWorkflowId = resolvedWorkflow.workflow_id
      || resolvedWorkflow.workflowId
      || resolvedWorkflow.id
      || resolvedWorkflowId;
  }

  if (!resolvedWorkflowId) {
    resolvedWorkflowId = uuidv4();
  }

  if (!resolvedWorkflow) {
    resolvedWorkflow = createEmptyWorkflow(resolvedWorkflowId);
  } else if (!resolvedWorkflow.workflow_id) {
    resolvedWorkflow = {
      ...resolvedWorkflow,
      workflow_id: resolvedWorkflowId,
      id: resolvedWorkflow.id ?? resolvedWorkflowId
    };
  }

  const serialized = workflowAsString
    ?? (typeof workflow === 'string' ? workflow : JSON.stringify(resolvedWorkflow));

  const screens = countScreens(resolvedWorkflow);
  const components = countComponents(resolvedWorkflow);

  return {
    id: resolvedWorkflowId,
    object: resolvedWorkflow,
    string: serialized,
    estimatedScreens: screens,
    estimatedComponents: components
  };
}

function normalizeProductDto(dto, { parseWorkflow = false } = {}) {
  if (!isObject(dto)) {
    return null;
  }

  const numericId = Number.isFinite(dto.id)
    ? dto.id
    : Number.parseInt(dto.id ?? Number.NaN, 10);

  const serializedWorkflow = dto.workflowAsString
    ?? (typeof dto.workflow === 'string' ? dto.workflow : null);

  const parsedWorkflow = parseWorkflow
    ? (isObject(dto.workflow) ? dto.workflow : safeJsonParse(serializedWorkflow))
    : null;

  const totalScreens = Number.isFinite(dto.totalScreens)
    ? dto.totalScreens
    : countScreens(parsedWorkflow);

  const totalComponents = Number.isFinite(dto.totalComponents)
    ? dto.totalComponents
    : countComponents(parsedWorkflow);

  const createdAt = dto.createdAt ?? dto.created_at ?? null;
  const updatedAt = dto.updatedAt ?? dto.updated_at ?? null;

  const fallbackId = dto.workflow_id
    ?? parsedWorkflow?.workflow_id
    ?? parsedWorkflow?.workflowId
    ?? parsedWorkflow?.id
    ?? uuidv4();

  const resolvedId = Number.isFinite(dto.id) || (typeof dto.id === 'string' && dto.id)
    ? dto.id
    : fallbackId;

  return {
    id: String(resolvedId),
    numericId: Number.isFinite(numericId) ? numericId : null,
    workflowId: dto.workflow_id ?? parsedWorkflow?.workflow_id ?? null,
    name: dto.name ?? 'Untitled Product',
    description: dto.description ?? '',
    totalScreens: Number.isFinite(totalScreens) ? totalScreens : 0,
    totalComponents: Number.isFinite(totalComponents) ? totalComponents : 0,
    workflow: parseWorkflow ? (parsedWorkflow ?? createEmptyWorkflow()) : null,
    workflowSerialized: serializedWorkflow,
    variableSchemas: parseWorkflow ? (dto.variableSchemas ?? parsedWorkflow?.variableSchemas ?? {}) : null,
    metadata: {
      createdAt,
      updatedAt
    },
    isRemote: true
  };
}

async function request(method, endpoint, { body, signal } = {}) {
  const url = endpoint.startsWith('http') ? endpoint : getApiUrl(endpoint);
  const startTime = Date.now();

  const headers = {};
  const init = {
    method,
    signal,
    headers
  };

  let payloadForLog = undefined;

  if (body !== undefined) {
    payloadForLog = body;
    if (!(body instanceof FormData) && typeof body !== 'string') {
      headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(body);
    } else {
      init.body = body;
    }
  }

  logApiRequest(method, url, payloadForLog);

  try {
    const response = await fetch(url, init);
    const raw = response.status === 204 ? null : await response.text();
    const duration = Date.now() - startTime;
    logApiResponse(method, url, response, duration);

    if (!response.ok) {
      const error = new Error(`Product API request failed with status ${response.status}`);
      error.status = response.status;
      error.body = raw;
      throw error;
    }

    if (!raw) {
      return null;
    }

    const contentType = response.headers.get('content-type') ?? '';

    if (contentType.includes('application/json')) {
      try {
        return JSON.parse(raw);
      } catch (parseError) {
        console.warn('[productApi] Failed to parse JSON response', parseError);
        return raw;
      }
    }

    return raw;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw error;
    }

    const duration = Date.now() - startTime;
    logApiError(method, url, error, duration);
    throw error;
  }
}

export async function listProducts({ signal, parseWorkflow = false } = {}) {
  const data = await request('GET', PRODUCTS_ENDPOINT, { signal });
  if (!Array.isArray(data)) {
    return [];
  }
  return data
    .map((dto) => normalizeProductDto(dto, { parseWorkflow }))
    .filter(Boolean);
}

export async function getProductById(productId, { signal, parseWorkflow = true } = {}) {
  if (!productId && productId !== 0) {
    throw new Error('productId is required');
  }

  const endpoint = `${PRODUCTS_ENDPOINT}/${productId}`;
  const data = await request('GET', endpoint, { signal });
  return normalizeProductDto(data, { parseWorkflow });
}

export async function getProductsByWorkflow(workflowId, { signal, parseWorkflow = false } = {}) {
  if (!workflowId) {
    throw new Error('workflowId is required');
  }

  const endpoint = `${PRODUCTS_WORKFLOW_ENDPOINT}/${workflowId}`;
  const data = await request('GET', endpoint, { signal });

  if (!Array.isArray(data)) {
    return [];
  }

  return data
    .map((dto) => normalizeProductDto(dto, { parseWorkflow }))
    .filter(Boolean);
}

export async function createProduct(
  {
    name = 'Untitled Product',
    description = '',
    totalScreens,
    totalComponents,
    workflow,
    workflowAsString,
    workflowId
  } = {},
  { parseWorkflow = true } = {}
) {
  const preparedWorkflow = prepareWorkflowPayload({ workflow, workflowAsString, workflowId });

  const body = {
    name,
    description,
    totalScreens: Number.isFinite(totalScreens) ? totalScreens : preparedWorkflow.estimatedScreens,
    totalComponents: Number.isFinite(totalComponents) ? totalComponents : preparedWorkflow.estimatedComponents,
    workflow: preparedWorkflow.object,
    workflowAsString: preparedWorkflow.string,
    workflow_id: preparedWorkflow.id
  };

  const data = await request('POST', PRODUCTS_ENDPOINT, { body });
  return normalizeProductDto(data, { parseWorkflow });
}

export async function updateProduct(
  productId,
  {
    name,
    description,
    totalScreens,
    totalComponents,
    workflow,
    workflowAsString,
    workflowId
  } = {},
  { parseWorkflow = true } = {}
) {
  if (!productId && productId !== 0) {
    throw new Error('productId is required');
  }

  const body = {};

  if (name !== undefined) {
    body.name = name;
  }

  if (description !== undefined) {
    body.description = description;
  }

  if (totalScreens !== undefined) {
    body.totalScreens = totalScreens;
  }

  if (totalComponents !== undefined) {
    body.totalComponents = totalComponents;
  }

  if (workflow !== undefined || workflowAsString !== undefined || workflowId !== undefined) {
    const preparedWorkflow = prepareWorkflowPayload({ workflow, workflowAsString, workflowId });
    body.workflow = preparedWorkflow.object;
    body.workflowAsString = preparedWorkflow.string;
    body.workflow_id = preparedWorkflow.id;
    if (body.totalScreens === undefined) {
      body.totalScreens = preparedWorkflow.estimatedScreens;
    }
    if (body.totalComponents === undefined) {
      body.totalComponents = preparedWorkflow.estimatedComponents;
    }
  }

  const endpoint = `${PRODUCTS_ENDPOINT}/${productId}`;
  const data = await request('PUT', endpoint, { body });
  return normalizeProductDto(data, { parseWorkflow });
}

export async function deleteProduct(productId, { signal } = {}) {
  if (!productId && productId !== 0) {
    throw new Error('productId is required');
  }

  const endpoint = `${PRODUCTS_ENDPOINT}/${productId}`;
  await request('DELETE', endpoint, { signal });
}

export default {
  listProducts,
  getProductById,
  getProductsByWorkflow,
  createProduct,
  updateProduct,
  deleteProduct
};
