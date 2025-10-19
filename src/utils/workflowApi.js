/**
 * Утилита для работы с Workflow API
 */

import { getBaseUrl, getApiUrl, API_ENDPOINTS, logApiRequest, logApiResponse, logApiError } from '../config/api';
import { getClientSessionId } from './clientSession.js';
import { startClientWorkflow } from '../services/clientWorkflowApi.js';

/**
 * Получить workflow по client_session_id и client_workflow_id
 * УСТАРЕЛО: Используйте startClientWorkflow из clientWorkflowApi.js
 * Эта функция оставлена для обратной совместимости и просто делегирует вызов
 * 
 * @param {string} clientSessionId - ID сессии клиента
 * @param {string} clientWorkflowId - ID workflow клиента
 * @returns {Promise<Object>} - Workflow данные
 * 
 * @example
 * const workflow = await fetchWorkflowById('1234567890', '68dc7bc60335a481514bbb4c');
 * console.log(workflow.nodes, workflow.edges, workflow.initialContext);
 */
export async function fetchWorkflowById(clientSessionId, clientWorkflowId) {
  console.log('[fetchWorkflowById] DEPRECATED: Используйте startClientWorkflow вместо этой функции');
  console.log('[fetchWorkflowById] Delegating to startClientWorkflow:', { clientSessionId, clientWorkflowId });
  
  if (!clientSessionId || !clientWorkflowId) {
    throw new Error('clientSessionId и clientWorkflowId обязательны');
  }

  // Делегируем вызов к единому API
  return startClientWorkflow(clientWorkflowId, {}, true);
}

/**
 * Преобразовать workflow из API в формат для Sandbox/Preview
 * 
 * @param {Object} workflowData - Данные workflow от API
 * @returns {Object} - Нормализованные данные для рендеринга
 */
export function normalizeWorkflowData(workflowData) {
  if (!workflowData) {
    throw new Error('Данные workflow не могут быть пустыми');
  }

  // Извлекаем структуру в зависимости от формата API
  const nodes = workflowData.nodes || [];
  const edges = workflowData.edges || [];
  const screens = workflowData.screens || {};
  const initialContext = workflowData.initialContext || workflowData.initial_context || {};
  const variableSchemas = workflowData.variableSchemas || workflowData.variable_schemas || {};

  // Находим стартовый узел
  const startNode = nodes.find(node => node.start === true) || nodes[0];
  
  if (!startNode) {
    throw new Error('Workflow не содержит стартового узла');
  }

  return {
    nodes,
    edges,
    screens,
    initialContext,
    variableSchemas,
    startNodeId: startNode.id,
    metadata: {
      id: workflowData.id || workflowData._id || 'unknown',
      name: workflowData.name || 'Unnamed Workflow',
      version: workflowData.version || '1.0.0',
    }
  };
}

/**
 * Загрузить и нормализовать workflow для использования в Sandbox/Preview
 * 
 * @param {string} clientSessionId - ID сессии клиента
 * @param {string} clientWorkflowId - ID workflow клиента
 * @returns {Promise<Object>} - Нормализованные данные workflow
 */
export async function loadWorkflow(clientSessionId, clientWorkflowId) {
  const rawData = await fetchWorkflowById(clientSessionId, clientWorkflowId);
  return normalizeWorkflowData(rawData);
}

/**
 * Получить URL параметры для workflow (для использования в URL)
 * 
 * @param {string} clientSessionId - ID сессии клиента
 * @param {string} clientWorkflowId - ID workflow клиента
 * @returns {URLSearchParams}
 */
export function getWorkflowUrlParams(clientSessionId, clientWorkflowId) {
  const params = new URLSearchParams();
  if (clientSessionId) params.set('session_id', clientSessionId);
  if (clientWorkflowId) params.set('workflow_id', clientWorkflowId);
  return params;
}

/**
 * Распарсить URL параметры для workflow
 * 
 * @param {URLSearchParams|string} searchParams - URL параметры
 * @returns {Object} - { clientSessionId, clientWorkflowId }
 */
export function parseWorkflowUrlParams(searchParams) {
  const params = typeof searchParams === 'string' 
    ? new URLSearchParams(searchParams) 
    : searchParams;
  
  const sessionId = params.get('session_id');
  const workflowId = params.get('workflow_id');
  
  console.log('[parseWorkflowUrlParams] Raw params:', {
    sessionId,
    workflowId,
    allParams: Array.from(params.entries())
  });
    
  const result = {
    clientSessionId: sessionId || getClientSessionId(), // ✅ FIX: используем getClientSessionId() вместо generateSessionId()
    clientWorkflowId: workflowId || "68dedc98ea73d715d90e40dd",
  };
  
  console.log('[parseWorkflowUrlParams] Result:', result);
  
  return result;
}
