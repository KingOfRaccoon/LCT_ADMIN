/**
 * Глобальная конфигурация API endpoints
 * 
 * Измените BASE_URL для переключения между окружениями
 */

// ====================================
// 🔧 ГЛАВНАЯ НАСТРОЙКА - МЕНЯЙТЕ ЗДЕСЬ
// ====================================

/**
 * Базовый URL для всех API запросов
 * 
 * Варианты:
 * - Production: 'https://sandkittens.me/api'
 * - Localhost: 'http://127.0.0.1:8080'
 * - Custom: 'https://your-server.com'
 */
export const BASE_URL = 'https://sandkittens.me';
// export const BASE_URL = 'http://127.0.0.1:8000';

// ====================================
// Дополнительные настройки (опционально)
// ====================================

/**
 * Timeout для API запросов (мс)
 */
export const API_TIMEOUT = 30000; // 30 секунд

/**
 * Включить логирование API запросов
 */
export const ENABLE_API_LOGGING = true;

/**
 * Retry настройки
 */
export const API_RETRY_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000, // 1 секунда
  retryOn: [408, 500, 502, 503, 504], // HTTP коды для retry
};

/**
 * API endpoints
 */
export const API_ENDPOINTS = {
  // Workflow API
  WORKFLOW: '/client/workflow',
  WORKFLOWS_LIST: '/api/workflows',
  WORKFLOW_SAVE: '/api/workflows',
  
  // Sandbox API (legacy)
  SANDBOX_START: '/api/start',
  SANDBOX_ACTION: '/api/action',
};

/**
 * Получить полный URL для endpoint
 * 
 * @param {string} endpoint - Endpoint путь (из API_ENDPOINTS)
 * @returns {string} - Полный URL
 * 
 * @example
 * const url = getApiUrl(API_ENDPOINTS.WORKFLOW);
 * // => 'https://sandkittens.me/client/workflow'
 */
export function getApiUrl(endpoint) {
  const base = BASE_URL.replace(/\/$/, ''); // Убираем trailing slash
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${base}${path}`;
}

/**
 * Логировать API запрос (если включено)
 */
export function logApiRequest(method, url, data = null) {
  if (ENABLE_API_LOGGING) {
    console.log(`[API] ${method} ${url}`, data ? data : '');
  }
}

/**
 * Логировать API ответ (если включено)
 */
export function logApiResponse(method, url, response, duration) {
  if (ENABLE_API_LOGGING) {
    console.log(`[API] ${method} ${url} → ${response.status} (${duration}ms)`);
  }
}

/**
 * Логировать API ошибку (если включено)
 */
export function logApiError(method, url, error, duration) {
  if (ENABLE_API_LOGGING) {
    console.error(`[API] ${method} ${url} → ERROR (${duration}ms)`, error.message);
  }
}

// ====================================
// Environment-based override
// ====================================

/**
 * Получить BASE_URL с учётом environment variable
 * Приоритет: VITE_WORKFLOW_API_BASE > BASE_URL из этого файла
 */
export function getBaseUrl() {
  return (import.meta.env.VITE_WORKFLOW_API_BASE ?? BASE_URL).replace(/\/$/, '');
}

// ====================================
// Экспорт для удобства
// ====================================

export default {
  BASE_URL: getBaseUrl(),
  API_TIMEOUT,
  ENABLE_API_LOGGING,
  API_RETRY_CONFIG,
  API_ENDPOINTS,
  getApiUrl,
  logApiRequest,
  logApiResponse,
  logApiError,
};
