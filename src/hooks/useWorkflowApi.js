/**
 * React Hook для работы с Workflow API
 * 
 * Предоставляет переиспользуемый интерфейс для экспорта workflow
 * с поддержкой настроек из localStorage и состояния загрузки
 */

import { useState, useCallback, useMemo } from 'react';
import { WorkflowAPI } from '../services/workflowApi';
import { mapGraphDataToWorkflow } from '../utils/workflowMapper';
import { getBaseUrl } from '../config/api';

// Ключи для localStorage
const STORAGE_KEYS = {
  SERVER_URL: 'workflow_server_url',
  WF_DESCRIPTION_ID: 'workflow_description_id',
  LAST_EXPORT: 'workflow_last_export',
  AUTO_SAVE: 'workflow_auto_save'
};

// Дефолтный URL сервера
const DEFAULT_SERVER_URL = getBaseUrl();

/**
 * Хук для работы с Workflow API
 */

/**
 * Хук для работы с Workflow API
 * @returns {Object} API методы и состояние
 */
export function useWorkflowApi() {
  const [isExporting, setIsExporting] = useState(false);
  const [lastError, setLastError] = useState(null);
  const [lastResponse, setLastResponse] = useState(null);

  // Получить URL сервера из настроек
  const getServerUrl = useCallback(() => {
    return localStorage.getItem(STORAGE_KEYS.SERVER_URL) || DEFAULT_SERVER_URL;
  }, []);

  // Установить URL сервера
  const setServerUrl = useCallback((url) => {
    localStorage.setItem(STORAGE_KEYS.SERVER_URL, url);
  }, []);

  // Получить сохраненный wf_description_id
  const getWorkflowId = useCallback((productId) => {
    const key = `${STORAGE_KEYS.WF_DESCRIPTION_ID}_${productId}`;
    return localStorage.getItem(key);
  }, []);

  // Сохранить wf_description_id
  const saveWorkflowId = useCallback((productId, wfDescriptionId) => {
    const key = `${STORAGE_KEYS.WF_DESCRIPTION_ID}_${productId}`;
    localStorage.setItem(key, wfDescriptionId);
    
    // Сохранить время последнего экспорта
    const exportKey = `${STORAGE_KEYS.LAST_EXPORT}_${productId}`;
    localStorage.setItem(exportKey, new Date().toISOString());
  }, []);

  // Получить настройку автосохранения
  const getAutoSave = useCallback(() => {
    return localStorage.getItem(STORAGE_KEYS.AUTO_SAVE) === 'true';
  }, []);

  // Установить автосохранение
  const setAutoSave = useCallback((enabled) => {
    localStorage.setItem(STORAGE_KEYS.AUTO_SAVE, enabled ? 'true' : 'false');
  }, []);

  // Создать экземпляр API
  const api = useMemo(() => {
    return new WorkflowAPI(getServerUrl());
  }, [getServerUrl]);

  /**
   * Экспортировать graphData на сервер
   */
  const exportWorkflow = useCallback(async (graphData, initialContext = {}, options = {}) => {
    const { 
      productId, 
      onSuccess, 
      onError,
      showToast = true 
    } = options;

    setIsExporting(true);
    setLastError(null);

    try {
      console.log('[useWorkflowApi] Starting workflow export...', {
        serverUrl: getServerUrl(),
        productId,
        nodesCount: graphData?.nodes?.length,
        edgesCount: graphData?.edges?.length
      });

      // Преобразовать в StateModel
      const workflow = mapGraphDataToWorkflow(graphData, initialContext);
      
      console.log('[useWorkflowApi] Workflow mapped:', {
        statesCount: workflow.states.length,
        states: workflow.states.map(s => ({ 
          name: s.name, 
          type: s.state_type,
          transitions: s.transitions.length
        }))
      });

      // Валидация и отправка
      const response = await api.saveWorkflow(
        workflow.states,
        workflow.predefined_context
      );

      console.log('[useWorkflowApi] Workflow saved successfully:', response);

      setLastResponse(response);

      // Сохранить wf_description_id если есть productId
      if (productId && response.wf_description_id) {
        saveWorkflowId(productId, response.wf_description_id);
      }

      // Callback успеха
      if (onSuccess) {
        onSuccess(response);
      }

      return response;
    } catch (error) {
      console.error('[useWorkflowApi] Export failed:', {
        error: error.message,
        stack: error.stack,
        serverUrl: getServerUrl()
      });

      setLastError(error);

      // Callback ошибки
      if (onError) {
        onError(error);
      }

      throw error;
    } finally {
      setIsExporting(false);
    }
  }, [api, saveWorkflowId, getServerUrl]);

  /**
   * Валидировать workflow без отправки
   */
  const validateWorkflow = useCallback((graphData, initialContext = {}) => {
    try {
      const workflow = mapGraphDataToWorkflow(graphData, initialContext);
      api.validateWorkflow(workflow.states);
      return { valid: true, workflow };
    } catch (error) {
      return { valid: false, error: error.message, workflow: null };
    }
  }, [api]);

  /**
   * Проверить доступность сервера
   */
  const checkServerHealth = useCallback(async () => {
    try {
      const isHealthy = await api.healthCheck();
      return { healthy: isHealthy, url: getServerUrl() };
    } catch (error) {
      return { healthy: false, url: getServerUrl(), error: error.message };
    }
  }, [api, getServerUrl]);

  /**
   * Получить workflow с сервера
   */
  const fetchWorkflow = useCallback(async (wfDescriptionId) => {
    setIsExporting(true);
    setLastError(null);

    try {
      const workflow = await api.getWorkflow(wfDescriptionId);
      setLastResponse(workflow);
      return workflow;
    } catch (error) {
      setLastError(error);
      throw error;
    } finally {
      setIsExporting(false);
    }
  }, [api]);

  /**
   * Получить последнее время экспорта
   */
  const getLastExportTime = useCallback((productId) => {
    const key = `${STORAGE_KEYS.LAST_EXPORT}_${productId}`;
    const timestamp = localStorage.getItem(key);
    return timestamp ? new Date(timestamp) : null;
  }, []);

  /**
   * Очистить сохраненные данные workflow
   */
  const clearWorkflowData = useCallback((productId) => {
    const idKey = `${STORAGE_KEYS.WF_DESCRIPTION_ID}_${productId}`;
    const exportKey = `${STORAGE_KEYS.LAST_EXPORT}_${productId}`;
    
    localStorage.removeItem(idKey);
    localStorage.removeItem(exportKey);
  }, []);

  return {
    // Основные методы
    exportWorkflow,
    validateWorkflow,
    checkServerHealth,
    fetchWorkflow,

    // Управление настройками
    getServerUrl,
    setServerUrl,
    getWorkflowId,
    saveWorkflowId,
    getAutoSave,
    setAutoSave,
    getLastExportTime,
    clearWorkflowData,

    // Состояние
    isExporting,
    lastError,
    lastResponse,

    // API instance (для прямого доступа)
    api
  };
}

/**
 * Хук для работы с конкретным продуктом
 */
export function useProductWorkflow(productId) {
  const workflow = useWorkflowApi();

  const exportProductWorkflow = useCallback(async (graphData, initialContext, options = {}) => {
    return workflow.exportWorkflow(graphData, initialContext, {
      ...options,
      productId
    });
  }, [workflow, productId]);

  const workflowId = useMemo(() => {
    return workflow.getWorkflowId(productId);
  }, [workflow, productId]);

  const lastExport = useMemo(() => {
    return workflow.getLastExportTime(productId);
  }, [workflow, productId]);

  return {
    ...workflow,
    exportProductWorkflow,
    workflowId,
    lastExport,
    productId
  };
}

export default useWorkflowApi;
