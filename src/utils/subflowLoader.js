/**
 * Загрузчик определений Subflow из JSON файлов
 */

import onboardingFlowData from '../pages/Sandbox/data/subflows/onboardingFlow.json';

/**
 * Библиотека определений subflow
 * Каждый subflow - это отдельный mini-workflow
 */
export const SUBFLOW_DEFINITIONS = {
  'onboarding-flow': {
    name: 'onboarding-flow',
    description: 'Двухэкранный онбординг для новых пользователей',
    input_variables: ['user_id', 'store_name'],
    output_variables: ['completed', 'user_preferences'],
    // Определение загружается из JSON файла
    definition: onboardingFlowData
  },
  
  // Пример как добавить ещё один subflow:
  // 'insurance-offer': {
  //   name: 'insurance-offer',
  //   description: 'Предложение страховки',
  //   input_variables: ['product_price', 'product_type'],
  //   output_variables: ['accepted', 'monthly_premium'],
  //   definition: insuranceFlowData
  // }
};

/**
 * Получить определение subflow
 * @param {string} name - Имя subflow
 * @returns {Object} - Определение subflow
 */
export function getSubflowDefinition(name) {
  const subflow = SUBFLOW_DEFINITIONS[name];
  if (!subflow) {
    throw new Error(`Subflow "${name}" not found`);
  }
  return subflow;
}

/**
 * Получить список всех доступных subflow
 * @returns {Array<string>} - Список имён
 */
export function listSubflows() {
  return Object.keys(SUBFLOW_DEFINITIONS);
}

/**
 * Инициализировать registry с определениями из файлов
 * @param {SubflowRegistry} registry - Instance registry
 */
export function initializeRegistry(registry) {
  Object.keys(SUBFLOW_DEFINITIONS).forEach(name => {
    const subflow = SUBFLOW_DEFINITIONS[name];
    registry.register(name, subflow.definition, {
      description: subflow.description,
      input_variables: subflow.input_variables,
      output_variables: subflow.output_variables
    });
  });
  
  console.log('[SubflowLoader] Initialized registry with', Object.keys(SUBFLOW_DEFINITIONS).length, 'subflows');
}

export default {
  SUBFLOW_DEFINITIONS,
  getSubflowDefinition,
  listSubflows,
  initializeRegistry
};
