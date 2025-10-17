/**
 * Workflow API Client
 * 
 * Клиент для интеграции с серверным Workflow API
 * Включает валидацию и нормализацию согласно integration-guide.md
 */

import '../types/workflowContract.js';
import { getBaseUrl } from '../config/api';

/**
 * Workflow API Client Class
 */
export class WorkflowAPI {
  /**
   * @param {string} baseUrl - Базовый URL сервера
   */
  constructor(baseUrl = getBaseUrl()) {
    this.baseUrl = baseUrl;
  }

  /**
   * Сохранить workflow на сервер
   * @param {StateModel[]} states - Массив состояний
   * @param {Object} context - Предопределенный контекст
   * @returns {Promise<SaveWorkflowResponse>}
   */
  async saveWorkflow(states, context = {}) {
    try {
      // Валидация перед отправкой
      this.validateWorkflow(states);
    } catch (validationError) {
      // Валидация бросила ошибку - пробрасываем с контекстом
      console.error('❌ Workflow validation failed:', validationError);
      throw new Error(`Ошибка валидации workflow: ${validationError.message}`);
    }

    // Нормализация состояний
    const normalizedStates = states.map(state => this.normalizeState(state));

    // Правильная структура запроса
    /** @type {SaveWorkflowRequest} */
    const requestBody = {
      states: {
        states: normalizedStates  // Обертка в объект
      },
      predefined_context: context
    };

    console.log('📤 Sending workflow to server:', {
      url: `${this.baseUrl}/workflow/save`,
      statesCount: normalizedStates.length,
      requestBody
    });

    // Детальное логирование screen полей
    console.log('🔍 Screen fields in states:');
    normalizedStates.forEach((state, index) => {
      const hasScreen = state.screen && Object.keys(state.screen).length > 0;
      console.log(`  [${index}] ${state.name} (${state.state_type}): screen=${hasScreen ? 'YES' : 'NO'}`, 
        hasScreen ? `(${Object.keys(state.screen).join(', ')})` : ''
      );
    });

    try {
      const response = await fetch(`${this.baseUrl}/workflow/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('📥 Server response status:', response.status, response.statusText);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ 
          detail: `HTTP ${response.status}: ${response.statusText}` 
        }));
        console.error('❌ Server returned error:', error);
        throw new Error(error.detail || `Failed to save workflow (${response.status})`);
      }

      const result = await response.json();
      console.log('✅ Workflow saved successfully:', result);
      return result;
    } catch (error) {
      // Если это сетевая ошибка (сервер недоступен)
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        console.error('❌ Network error - server unreachable');
        throw new Error(
          `❌ Сервер недоступен!\n\n` +
          `URL: ${this.baseUrl}\n\n` +
          `Возможные причины:\n` +
          `1. Сервер не запущен - выполните:\n` +
          `   cd server && uvicorn main:app --reload --port 8000\n\n` +
          `2. Неправильный URL - проверьте настройки\n\n` +
          `3. CORS блокирует запрос - настройте на сервере\n\n` +
          `📖 Подробнее: SERVER_NOT_RUNNING.md`
        );
      }
      
      // Если это наша ошибка - пробрасываем как есть
      if (error.message && (error.message.includes('HTTP') || error.message.includes('удалось'))) {
        throw error;
      }
      
      // Любая другая ошибка - логируем и форматируем
      console.error('❌ Unexpected error in saveWorkflow:', error);
      const errorMessage = error?.message || String(error);
      throw new Error(`Ошибка отправки workflow: ${errorMessage}`);
    }
  }

  /**
   * Валидация workflow перед отправкой
   * @param {StateModel[]} states - Массив состояний
   * @throws {Error} Если валидация не прошла
   */
  validateWorkflow(states) {
    if (!Array.isArray(states) || states.length === 0) {
      throw new Error('States array must not be empty');
    }

    // 1. Ровно 1 initial_state
    const initialCount = states.filter(s => s.initial_state).length;
    if (initialCount !== 1) {
      throw new Error(`Expected exactly 1 initial state, got ${initialCount}`);
    }

    // 2. Минимум 1 final_state
    const finalCount = states.filter(s => s.final_state).length;
    if (finalCount < 1) {
      throw new Error(`Expected at least 1 final state, got ${finalCount}`);
    }

    // 3. Уникальные имена
    const names = states.map(s => s.name);
    const uniqueNames = new Set(names);
    if (uniqueNames.size !== names.length) {
      const duplicates = names.filter((name, index) => names.indexOf(name) !== index);
      throw new Error(`State names must be unique. Duplicates: ${duplicates.join(', ')}`);
    }

    // 4. Integration State правила
    states.forEach(state => {
      if (state.state_type === 'integration') {
        if (state.transitions.length !== 1) {
          throw new Error(
            `Integration state "${state.name}" must have exactly 1 transition, got ${state.transitions.length}`
          );
        }
        if (state.transitions[0]?.case !== null) {
          throw new Error(
            `Integration state "${state.name}" transition must have case=null`
          );
        }
      }
    });

    // 5. Существование state_id
    const stateNames = new Set(names);
    states.forEach(state => {
      state.transitions.forEach(t => {
        if (!stateNames.has(t.state_id)) {
          throw new Error(
            `State "${state.name}" has transition to non-existent state "${t.state_id}"`
          );
        }
      });
    });

    // 6. Обязательные поля
    states.forEach(state => {
      if (!state.state_type) {
        throw new Error(`State "${state.name}" missing state_type`);
      }
      if (!state.name) {
        throw new Error('State missing name field');
      }
      if (typeof state.initial_state !== 'boolean') {
        throw new Error(`State "${state.name}" initial_state must be boolean`);
      }
      if (typeof state.final_state !== 'boolean') {
        throw new Error(`State "${state.name}" final_state must be boolean`);
      }
      if (!Array.isArray(state.expressions)) {
        throw new Error(`State "${state.name}" expressions must be an array`);
      }
      if (!Array.isArray(state.transitions)) {
        throw new Error(`State "${state.name}" transitions must be an array`);
      }
    });
  }

  /**
   * Нормализация состояния (добавление дефолтных значений)
   * @param {Partial<StateModel>} state - Частичное состояние
   * @returns {StateModel} Нормализованное состояние
   */
  normalizeState(state) {
    const normalized = {
      state_type: state.state_type || 'screen',
      name: state.name || state.state_name || '',
      screen: state.screen || {},                   // ✅ Добавлено поле screen
      initial_state: Boolean(state.initial_state),  // Принудительно boolean
      final_state: Boolean(state.final_state),      // Принудительно boolean
      expressions: state.expressions || [],         // Дефолт пустой массив
      transitions: state.transitions || [],         // Дефолт пустой массив
    };

    // Фикс для Integration State
    if (normalized.state_type === 'integration' && normalized.transitions.length > 0) {
      normalized.transitions = [
        {
          state_id: normalized.transitions[0].state_id,
          case: null,  // Принудительно null
          variable: normalized.transitions[0].variable
        }
      ];
    }

    return normalized;
  }

  /**
   * Создать Technical Expression
   * @param {string} variable - Имя переменной
   * @param {string[]} deps - Зависимости
   * @param {string} expr - Выражение
   * @returns {TechnicalExpression}
   */
  createTechnicalExpression(variable, deps, expr) {
    return { 
      variable, 
      dependent_variables: deps, 
      expression: expr 
    };
  }

  /**
   * Создать Integration Expression
   * @param {string} variable - Имя переменной
   * @param {string} url - URL
   * @param {Object} params - Параметры
   * @param {HttpMethod} method - HTTP метод
   * @returns {IntegrationExpression}
   */
  createIntegrationExpression(variable, url, params, method = 'get') {
    return { 
      variable, 
      url, 
      params, 
      method: method.toLowerCase() 
    };
  }

  /**
   * Создать Event Expression
   * @param {string} eventName - Имя события
   * @returns {EventExpression}
   */
  createEventExpression(eventName) {
    return { 
      event_name: eventName 
    };
  }

  /**
   * Проверка здоровья API
   * @returns {Promise<boolean>}
   */
  async healthCheck() {
    try {
      const response = await fetch(`${this.baseUrl}/healthcheck`, {
        method: 'GET',
      });
      return response.ok;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }

  /**
   * Получить информацию о сохраненном workflow
   * @param {string} wfDescriptionId - ID описания workflow
   * @returns {Promise<Object>}
   */
  async getWorkflow(wfDescriptionId) {
    const response = await fetch(
      `${this.baseUrl}/workflow/${wfDescriptionId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch workflow');
    }

    return response.json();
  }
}

/**
 * Singleton instance (опционально)
 */
let workflowApiInstance = null;

/**
 * Получить singleton instance WorkflowAPI
 * @param {string} [baseUrl] - Базовый URL (только при первом вызове)
 * @returns {WorkflowAPI}
 */
export function getWorkflowAPI(baseUrl) {
  if (!workflowApiInstance) {
    workflowApiInstance = new WorkflowAPI(baseUrl);
  }
  return workflowApiInstance;
}

export default WorkflowAPI;
