/**
 * Workflow Contract Types
 * 
 * Типы данных для интеграции с серверным Workflow API
 * согласно руководству integration-guide.md
 */

/**
 * @typedef {'technical' | 'integration' | 'screen' | 'service'} StateType
 */

/**
 * @typedef {'get' | 'post' | 'put' | 'delete' | 'patch'} HttpMethod
 */

/**
 * Technical Expression - вычисления на основе других переменных
 * @typedef {Object} TechnicalExpression
 * @property {string} variable - Имя переменной для сохранения результата
 * @property {string[]} dependent_variables - Список зависимых переменных
 * @property {string} expression - Выражение для вычисления
 */

/**
 * Integration Expression - вызов внешнего API
 * @typedef {Object} IntegrationExpression
 * @property {string} variable - Имя переменной для сохранения результата
 * @property {string} url - URL для запроса
 * @property {Object.<string, any>} params - Параметры запроса
 * @property {HttpMethod} method - HTTP метод
 */

/**
 * Event Expression - событие экрана
 * @typedef {Object} EventExpression
 * @property {string} event_name - Имя события
 */

/**
 * @typedef {TechnicalExpression | IntegrationExpression | EventExpression} Expression
 */

/**
 * Переход между состояниями
 * @typedef {Object} Transition
 * @property {string} state_id - ID целевого состояния
 * @property {string|null} case - Условие перехода (null для безусловного)
 * @property {string} [variable] - Переменная для условного перехода (опционально)
 */

/**
 * State Model - состояние в workflow
 * @typedef {Object} StateModel
 * @property {StateType} state_type - Тип состояния
 * @property {string} name - Уникальное имя состояния
 * @property {boolean} initial_state - Является ли начальным
 * @property {boolean} final_state - Является ли финальным
 * @property {Expression[]} expressions - Список выражений
 * @property {Transition[]} transitions - Список переходов
 */

/**
 * Save Workflow Request - запрос на сохранение workflow
 * @typedef {Object} SaveWorkflowRequest
 * @property {Object} states - Обертка для массива состояний
 * @property {StateModel[]} states.states - Массив состояний
 * @property {Object.<string, any>} predefined_context - Предопределенный контекст
 */

/**
 * Save Workflow Response - ответ на сохранение workflow
 * @typedef {Object} SaveWorkflowResponse
 * @property {'success' | 'error'} status - Статус операции
 * @property {string} wf_description_id - ID описания workflow
 * @property {string} wf_context_id - ID контекста workflow
 */

// Export types for JSDoc usage
export default {};
