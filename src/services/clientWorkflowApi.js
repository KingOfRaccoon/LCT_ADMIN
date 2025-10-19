/**
 * Client Workflow API
 * 
 * API клиент для работы с клиентским workflow через /client/workflow endpoint.
 * Использует client_session_id для поддержания состояния между запросами.
 */

import { getClientSessionId, touchClientSession } from '../utils/clientSession.js';
import { getApiUrl, API_ENDPOINTS, logApiRequest, logApiResponse, logApiError } from '../config/api.js';

// Глобальная защита от повторных запусков одного и того же workflow
const startingWorkflows = new Map(); // workflowId -> Promise
// Кэш для данных workflow, чтобы избежать повторных запросов
const workflowDataCache = new Map(); // workflowId -> { data, timestamp }
const CACHE_TTL = 5 * 60 * 1000; // 5 минут

/**
 * Нормализует контекст от API: преобразует строковые "None", "null", "undefined", "False", "True" в null/boolean
 * и пытается распарсить JSON-строки в объекты/массивы
 * @param {Object} context - Контекст от API
 * @returns {Object} - Нормализованный контекст
 */
function normalizeContext(context) {
  if (!context || typeof context !== 'object') {
    return context;
  }

  const normalized = {};
  
  for (const [key, value] of Object.entries(context)) {
    // Преобразуем строковые пустышки в null
    if (value === 'None' || value === 'null' || value === 'undefined') {
      normalized[key] = null;
      continue;
    }

    // Преобразуем строковые булевы значения (Python возвращает "True"/"False")
    if (value === 'False' || value === 'false') {
      normalized[key] = false;
      continue;
    }
    if (value === 'True' || value === 'true') {
      normalized[key] = true;
      continue;
    }

    // Пытаемся распарсить JSON-строки (Python возвращает строки с одинарными кавычками)
    if (typeof value === 'string' && (value.startsWith('[') || value.startsWith('{'))) {
      try {
        // Заменяем одинарные кавычки на двойные для корректного JSON.parse
        const jsonString = value.replace(/'/g, '"');
        normalized[key] = JSON.parse(jsonString);
        continue;
      } catch {
        // Не удалось распарсить — оставляем как есть
      }
    }

    normalized[key] = value;
  }

  return normalized;
}

/**
 * Формат ответа от /client/workflow
 * @typedef {Object} ClientWorkflowResponse
 * @property {string} session_id - ID сессии
 * @property {Object} context - Текущий контекст (включая __workflow_id, __created_at)
 * @property {string} current_state - Имя текущего состояния
 * @property {string} state_type - Тип состояния (screen, technical, integration, service)
 * @property {Object} screen - Объект экрана (для state_type === 'screen')
 */

/**
 * Запускает новый workflow (первый запрос при входе)
 * 
 * @param {string} workflowId - ID workflow для запуска
 * @param {Object} initialContext - Начальный контекст (опционально)
 * @param {boolean} useCache - Использовать ли кэш (по умолчанию true)
 * @returns {Promise<ClientWorkflowResponse>}
 */
export async function startClientWorkflow(workflowId, initialContext = {}, useCache = true) {
  // ✅ Проверяем кэш
  if (useCache) {
    const cached = workflowDataCache.get(workflowId);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      console.log('📦 [ClientWorkflow] Using cached workflow data:', workflowId);
      return cached.data;
    }
  }
  
  // ✅ ГЛОБАЛЬНАЯ ЗАЩИТА: если уже идёт запуск этого workflow, возвращаем существующий Promise
  if (startingWorkflows.has(workflowId)) {
    console.warn('⚠️ [ClientWorkflow] startClientWorkflow blocked: already starting workflow', workflowId);
    return startingWorkflows.get(workflowId);
  }
  
  const clientSessionId = getClientSessionId();
  const url = getApiUrl(API_ENDPOINTS.WORKFLOW);
  const payload = {
    client_session_id: clientSessionId,
    client_workflow_id: workflowId,
    initial_context: initialContext
  };
  
  console.log('🚀 [ClientWorkflow] Starting workflow:', {
    workflowId,
    clientSessionId,
    initialContext,
    timestamp: new Date().toISOString(),
    stack: new Error().stack?.split('\n').slice(2, 5).join('\n') // Stack trace для отладки
  });
  
  const startTime = Date.now();
  logApiRequest('POST', url, payload);

  // Создаём Promise и сохраняем его
  const startPromise = (async () => {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to start workflow: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      const duration = Date.now() - startTime;
      logApiResponse('POST', url, response, duration);
      touchClientSession();
      
      // Нормализуем контекст
      if (data.context) {
        data.context = normalizeContext(data.context);
      }
      
      console.log('✅ [ClientWorkflow] Workflow started:', {
        session_id: data.session_id,
        current_state: data.current_state,
        state_type: data.state_type
      });

      // Сохраняем в кэш
      if (useCache) {
        workflowDataCache.set(workflowId, {
          data,
          timestamp: Date.now()
        });
      }

      return data;
    } catch (error) {
      const duration = Date.now() - startTime;
      logApiError('POST', url, error, duration);
      console.error('❌ [ClientWorkflow] Start failed:', error);
      throw error;
    } finally {
      // Удаляем из Map после завершения (успеха или ошибки)
      startingWorkflows.delete(workflowId);
    }
  })();
  
  // Сохраняем Promise в Map
  startingWorkflows.set(workflowId, startPromise);
  
  return startPromise;
}

/**
 * Отправляет action и получает следующее состояние
 * 
 * @param {string} eventName - Название события (например, "click", "submit")
 * @param {Object} inputs - Данные формы/инпутов
 * @returns {Promise<ClientWorkflowResponse>}
 */
export async function sendClientAction(eventName, inputs = {}) {
  const clientSessionId = getClientSessionId();
  const url = `${getApiUrl(API_ENDPOINTS.WORKFLOW)}`;
  const payload = {
    client_session_id: clientSessionId,
    event_name: eventName,
    context: inputs
  };
  
  console.log('📤 [ClientWorkflow] Sending action:', {
    clientSessionId,
    eventName,
    inputs
  });
  
  const startTime = Date.now();
  logApiRequest('POST', url, payload);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to send action: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const duration = Date.now() - startTime;
    logApiResponse('POST', url, response, duration);
    touchClientSession();
    
    // Нормализуем контекст
    if (data.context) {
      data.context = normalizeContext(data.context);
    }
    
    console.log('✅ [ClientWorkflow] Action processed:', {
      session_id: data.session_id,
      current_state: data.current_state,
      state_type: data.state_type
    });

    return data;
  } catch (error) {
    const duration = Date.now() - startTime;
    logApiError('POST', url, error, duration);
    console.error('❌ [ClientWorkflow] Action failed:', error);
    throw error;
  }
}

/**
 * Получает текущее состояние workflow без изменений
 * 
 * @returns {Promise<ClientWorkflowResponse>}
 */
export async function getCurrentWorkflowState() {
  const clientSessionId = getClientSessionId();
  const url = `${getApiUrl(API_ENDPOINTS.WORKFLOW)}/state`;
  const payload = { client_session_id: clientSessionId };
  
  console.log('🔍 [ClientWorkflow] Getting current state for:', clientSessionId);
  
  const startTime = Date.now();
  logApiRequest('POST', url, payload);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get state: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const duration = Date.now() - startTime;
    logApiResponse('POST', url, response, duration);
    
    // Нормализуем контекст
    if (data.context) {
      data.context = normalizeContext(data.context);
    }
    
    console.log('✅ [ClientWorkflow] Current state:', {
      session_id: data.session_id,
      current_state: data.current_state,
      state_type: data.state_type
    });

    return data;
  } catch (error) {
    const duration = Date.now() - startTime;
    logApiError('POST', url, error, duration);
    console.error('❌ [ClientWorkflow] Get state failed:', error);
    throw error;
  }
}

/**
 * Сбрасывает workflow (начинает с начала)
 * 
 * @returns {Promise<ClientWorkflowResponse>}
 */
export async function resetClientWorkflow() {
  const clientSessionId = getClientSessionId();
  const url = `${getApiUrl(API_ENDPOINTS.WORKFLOW)}`;
  const payload = { client_session_id: clientSessionId };
  
  console.log('🔄 [ClientWorkflow] Resetting workflow for:', clientSessionId);
  
  const startTime = Date.now();
  logApiRequest('POST', url, payload);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to reset workflow: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const duration = Date.now() - startTime;
    logApiResponse('POST', url, response, duration);
    
    // Нормализуем контекст
    if (data.context) {
      data.context = normalizeContext(data.context);
    }
    
    console.log('✅ [ClientWorkflow] Workflow reset:', {
      session_id: data.session_id,
      current_state: data.current_state
    });

    return data;
  } catch (error) {
    const duration = Date.now() - startTime;
    logApiError('POST', url, error, duration);
    console.error('❌ [ClientWorkflow] Reset failed:', error);
    throw error;
  }
}

/**
 * Health check для API
 * 
 * @returns {Promise<boolean>}
 */
export async function checkClientWorkflowHealth() {
  const url = `${getApiUrl(API_ENDPOINTS.WORKFLOW).replace('/client/workflow', '')}/healthcheck`;
  try {
    logApiRequest('GET', url);
    const response = await fetch(url, {
      method: 'GET'
    });
    logApiResponse('GET', url, response, 0);
    return response.ok;
  } catch (error) {
    logApiError('GET', url, error, 0);
    console.warn('⚠️ [ClientWorkflow] Health check failed:', error);
    return false;
  }
}

/**
 * Очистить кэш workflow (используется при явном сбросе или выходе)
 * 
 * @param {string} [workflowId] - ID конкретного workflow, если не указан - очищается весь кэш
 */
export function clearWorkflowCache(workflowId) {
  if (workflowId) {
    workflowDataCache.delete(workflowId);
    console.log('🗑️ [ClientWorkflow] Cache cleared for workflow:', workflowId);
  } else {
    workflowDataCache.clear();
    console.log('🗑️ [ClientWorkflow] All workflow cache cleared');
  }
}

export default {
  startClientWorkflow,
  sendClientAction,
  getCurrentWorkflowState,
  resetClientWorkflow,
  checkClientWorkflowHealth,
  clearWorkflowCache
};
