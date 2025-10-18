/**
 * SubflowRegistry Service - Библиотека переиспользуемых subflow
 * 
 * Позволяет:
 * 1. Сохранить subflow на бэкенд и получить ID
 * 2. Использовать ID в разных workflow
 * 3. Не дублировать определения subflow
 * 
 * Данные кэшируются в localStorage, но ID получаем с бэкенда
 */

import { getWorkflowAPI } from './workflowApi';
import { mapGraphDataToWorkflow } from '../utils/workflowMapper';
import { initializeRegistry as loadDefinitions } from '../utils/subflowLoader';

/**
 * Реестр известных subflow
 * Формат: { name: { id, description, input_variables, output_variables } }
 */
const SUBFLOW_REGISTRY = {
  'onboarding-flow': {
    id: null, // Будет получен с бэкенда
    name: 'onboarding-flow',
    description: 'Двухэкранный онбординг для новых пользователей',
    input_variables: ['user_id', 'store_name'],
    output_variables: ['completed', 'user_preferences'],
    // Определение будет загружено из файла
    definition: null
  },
  'insurance-offer': {
    id: null,
    name: 'insurance-offer',
    description: 'Предложение страховки при покупке',
    input_variables: ['product_price', 'product_type'],
    output_variables: ['accepted', 'monthly_premium'],
    definition: null
  }
};

/**
 * Класс для управления subflow (сохранение на бэкенд + localStorage кэш)
 */
export class SubflowRegistry {
  constructor(baseUrl) {
    this.api = getWorkflowAPI(baseUrl);
    this.registry = { ...SUBFLOW_REGISTRY };
    this.loadFromLocalStorage();
    
    // Автоматически загружаем определения из файлов
    loadDefinitions(this);
  }

  /**
   * Загрузить все данные из localStorage
   */
  loadFromLocalStorage() {
    try {
      const saved = localStorage.getItem('subflow_registry');
      if (saved) {
        const parsed = JSON.parse(saved);
        Object.keys(parsed).forEach(name => {
          if (this.registry[name]) {
            // Восстанавливаем ID и определение
            this.registry[name].id = parsed[name].id;
            if (parsed[name].definition) {
              this.registry[name].definition = parsed[name].definition;
            }
          }
        });
        console.log('[SubflowRegistry] Loaded from localStorage:', this.registry);
      }
    } catch (error) {
      console.error('[SubflowRegistry] Failed to load from localStorage:', error);
    }
  }

  /**
   * Сохранить все данные в localStorage
   */
  saveToLocalStorage() {
    try {
      const toSave = {};
      Object.keys(this.registry).forEach(name => {
        toSave[name] = {
          id: this.registry[name].id,
          name: this.registry[name].name,
          description: this.registry[name].description,
          input_variables: this.registry[name].input_variables,
          output_variables: this.registry[name].output_variables,
          definition: this.registry[name].definition
        };
      });
      localStorage.setItem('subflow_registry', JSON.stringify(toSave));
      console.log('[SubflowRegistry] Saved to localStorage:', toSave);
    } catch (error) {
      console.error('[SubflowRegistry] Failed to save to localStorage:', error);
    }
  }

  /**
   * Зарегистрировать новый subflow
   * @param {string} name - Имя subflow
   * @param {Object} definition - GraphData определение subflow
   * @param {Object} metadata - Метаданные (description, input_variables, output_variables)
   */
  register(name, definition, metadata = {}) {
    this.registry[name] = {
      id: null,
      name,
      description: metadata.description || '',
      input_variables: metadata.input_variables || [],
      output_variables: metadata.output_variables || [],
      definition
    };
    console.log(`[SubflowRegistry] Registered: ${name}`, this.registry[name]);
  }

  /**
   * Сохранить subflow на бэкенд и получить wf_description_id
   * @param {string} name - Имя subflow из реестра
   * @returns {Promise<string>} - wf_description_id с бэкенда
   */
  async save(name) {
    const subflow = this.registry[name];
    if (!subflow) {
      throw new Error(`Subflow "${name}" not found in registry`);
    }

    if (!subflow.definition) {
      throw new Error(`Subflow "${name}" has no definition`);
    }

    console.log(`[SubflowRegistry] Saving ${name} to backend...`);

    try {
      // Определяем формат definition
      let states, context;
      
      if (subflow.definition.nodes && Array.isArray(subflow.definition.nodes)) {
        // GraphData формат - конвертируем через маппер
        console.log(`[SubflowRegistry] Converting GraphData to StateModel for ${name}...`);
        const mapped = mapGraphDataToWorkflow(subflow.definition, {});
        states = mapped.states;
        context = mapped.predefined_context || {};
        console.log(`[SubflowRegistry] Converted ${subflow.definition.nodes.length} nodes → ${states.length} states`);
      } else if (subflow.definition.states && Array.isArray(subflow.definition.states)) {
        // StateModel формат - используем как есть
        console.log(`[SubflowRegistry] Using StateModel format for ${name}`);
        states = subflow.definition.states;
        context = subflow.definition.predefined_context || {};
      } else {
        throw new Error(`Unknown subflow definition format for ${name}`);
      }

      // Сохраняем на бэкенд
      const response = await this.api.saveWorkflow(states, context);

      const wfDescriptionId = response.wf_description_id;
      
      // Сохраняем ID, полученный с бэкенда
      subflow.id = wfDescriptionId;
      this.saveToLocalStorage();

      console.log(`[SubflowRegistry] ✅ Saved ${name} → ${wfDescriptionId}`);
      
      return wfDescriptionId;
    } catch (error) {
      console.error(`[SubflowRegistry] ❌ Failed to save ${name}:`, error);
      throw error;
    }
  }

  /**
   * Получить ID subflow (сохранить на бэкенд если ещё не сохранён)
   * @param {string} name - Имя subflow
   * @returns {Promise<string>} - wf_description_id
   */
  async getId(name) {
    const subflow = this.registry[name];
    if (!subflow) {
      throw new Error(`Subflow "${name}" not found in registry`);
    }

    // Если ID уже есть - вернуть его
    if (subflow.id) {
      console.log(`[SubflowRegistry] Using cached ID for ${name}: ${subflow.id}`);
      return subflow.id;
    }

    // Иначе сохранить на бэкенд и вернуть новый ID
    return await this.save(name);
  }

  /**
   * Получить метаданные subflow
   * @param {string} name - Имя subflow
   * @returns {Object} - Метаданные
   */
  getMetadata(name) {
    const subflow = this.registry[name];
    if (!subflow) {
      throw new Error(`Subflow "${name}" not found in registry`);
    }

    return {
      name: subflow.name,
      description: subflow.description,
      input_variables: subflow.input_variables,
      output_variables: subflow.output_variables,
      id: subflow.id
    };
  }

  /**
   * Получить список всех зарегистрированных subflow
   * @returns {Array} - Список subflow с метаданными
   */
  list() {
    return Object.keys(this.registry).map(name => ({
      name,
      ...this.registry[name]
    }));
  }

  /**
   * Проверить, сохранён ли subflow
   * @param {string} name - Имя subflow
   * @returns {boolean}
   */
  isSaved(name) {
    return !!(this.registry[name] && this.registry[name].id);
  }

  /**
   * Сбросить ID (например, для пересохранения)
   * @param {string} name - Имя subflow
   */
  reset(name) {
    if (this.registry[name]) {
      this.registry[name].id = null;
      this.saveToLocalStorage();
      console.log(`[SubflowRegistry] Reset: ${name}`);
    }
  }

  /**
   * Сохранить все несохранённые subflow на бэкенд
   * @returns {Promise<Object>} - Карта { name: id }
   */
  async saveAll() {
    const results = {};
    const unsaved = Object.keys(this.registry).filter(name => !this.isSaved(name));

    console.log(`[SubflowRegistry] Saving ${unsaved.length} subflow(s)...`);

    for (const name of unsaved) {
      try {
        const id = await this.save(name);
        results[name] = id;
      } catch (error) {
        console.error(`[SubflowRegistry] Failed to save ${name}:`, error);
        results[name] = null;
      }
    }

    return results;
  }

  /**
   * Получить определение subflow по ID
   * @param {string} id - ID subflow
   * @returns {Object|null} - Определение или null
   */
  getDefinitionById(id) {
    const entry = Object.values(this.registry).find(subflow => subflow.id === id);
    return entry ? entry.definition : null;
  }

  /**
   * Получить все ID и их определения
   * @returns {Object} - Карта { id: definition }
   */
  getAllDefinitions() {
    const definitions = {};
    Object.values(this.registry).forEach(subflow => {
      if (subflow.id && subflow.definition) {
        definitions[subflow.id] = subflow.definition;
      }
    });
    return definitions;
  }
}

/**
 * Singleton instance
 */
let instance = null;

/**
 * Получить singleton instance SubflowRegistry
 * @param {string} baseUrl - Base URL для API
 * @returns {SubflowRegistry}
 */
export function getSubflowRegistry(baseUrl) {
  if (!instance) {
    instance = new SubflowRegistry(baseUrl);
  }
  return instance;
}

export default SubflowRegistry;
