/**
 * useClientWorkflow Hook
 * 
 * React hook для удобной работы с Client Workflow API.
 * Управляет состоянием workflow, загрузкой и ошибками.
 */

import { useState, useCallback, useEffect } from 'react';
import {
  startClientWorkflow,
  sendClientAction,
  getCurrentWorkflowState,
  resetClientWorkflow,
  checkClientWorkflowHealth
} from '../services/clientWorkflowApi.js';
import { getClientSessionId } from '../utils/clientSession.js';

/**
 * @typedef {Object} WorkflowState
 * @property {string} sessionId - Client session ID
 * @property {string} currentState - Имя текущего состояния
 * @property {string} stateType - Тип состояния (screen, technical, etc.)
 * @property {Object} context - Текущий контекст
 * @property {Object|null} screen - Экран (если state_type === 'screen')
 * @property {boolean} isLoading - Индикатор загрузки
 * @property {Error|null} error - Ошибка (если есть)
 * @property {boolean} isApiAvailable - Доступен ли API
 */

/**
 * Hook для работы с Client Workflow
 * 
 * @returns {Object} Workflow state and actions
 */
export function useClientWorkflow() {
  const [workflowState, setWorkflowState] = useState({
    sessionId: getClientSessionId(),
    currentState: null,
    stateType: null,
    context: {},
    screen: null,
    isLoading: false,
    error: null,
    isApiAvailable: false
  });

  // Проверка доступности API при монтировании
  useEffect(() => {
    checkClientWorkflowHealth().then(isAvailable => {
      setWorkflowState(prev => ({ ...prev, isApiAvailable: isAvailable }));
      if (isAvailable) {
        console.log('✅ [useClientWorkflow] API is available');
      } else {
        console.warn('⚠️ [useClientWorkflow] API is not available');
      }
    });
  }, []);

  /**
   * Обновляет состояние из ответа API
   */
  const updateFromResponse = useCallback((response) => {
    setWorkflowState(prev => ({
      ...prev,
      sessionId: response.session_id,
      currentState: response.current_state,
      stateType: response.state_type,
      context: response.context,
      screen: response.screen || null,
      isLoading: false,
      error: null
    }));
  }, []);

  /**
   * Запускает новый workflow
   * ⚠️ Защита от параллельных вызовов через isLoading
   */
  const startWorkflow = useCallback(async (workflowId, initialContext = {}) => {
    // ✅ Защита от двойного вызова: если уже идёт загрузка, игнорируем
    setWorkflowState(prev => {
      if (prev.isLoading) {
        console.warn('⚠️ [useClientWorkflow] startWorkflow ignored: already loading');
        return prev;
      }
      return { ...prev, isLoading: true, error: null };
    });
    
    try {
      const response = await startClientWorkflow(workflowId, initialContext);
      updateFromResponse(response);
      return response;
    } catch (error) {
      setWorkflowState(prev => ({
        ...prev,
        isLoading: false,
        error
      }));
      throw error;
    }
  }, [updateFromResponse]);

  /**
   * Отправляет action (переход, клик, submit)
   */
  const sendAction = useCallback(async (eventName, inputs = {}) => {
    setWorkflowState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const response = await sendClientAction(eventName, inputs);
      updateFromResponse(response);
      return response;
    } catch (error) {
      setWorkflowState(prev => ({
        ...prev,
        isLoading: false,
        error
      }));
      throw error;
    }
  }, [updateFromResponse]);

  /**
   * Получает текущее состояние
   */
  const refreshState = useCallback(async () => {
    setWorkflowState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const response = await getCurrentWorkflowState();
      updateFromResponse(response);
      return response;
    } catch (error) {
      setWorkflowState(prev => ({
        ...prev,
        isLoading: false,
        error
      }));
      throw error;
    }
  }, [updateFromResponse]);

  /**
   * Сбрасывает workflow
   */
  const reset = useCallback(async () => {
    setWorkflowState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const response = await resetClientWorkflow();
      updateFromResponse(response);
      return response;
    } catch (error) {
      setWorkflowState(prev => ({
        ...prev,
        isLoading: false,
        error
      }));
      throw error;
    }
  }, [updateFromResponse]);

  /**
   * Очищает ошибку
   */
  const clearError = useCallback(() => {
    setWorkflowState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    // State
    ...workflowState,
    
    // Actions
    startWorkflow,
    sendAction,
    refreshState,
    reset,
    clearError,
    
    // Computed
    hasScreen: workflowState.stateType === 'screen' && workflowState.screen !== null,
    isScreenState: workflowState.stateType === 'screen',
    isTechnicalState: workflowState.stateType === 'technical'
  };
}

export default useClientWorkflow;
