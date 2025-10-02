/**
 * PreviewPage - Simplified Client Workflow Preview
 * 
 * Использует useClientWorkflow для простого предпросмотра workflow
 * без полного интерфейса песочницы.
 */

import { useCallback, useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import SandboxScreenRenderer from '../Sandbox/SandboxScreenRenderer';
import { useClientWorkflow } from '../../hooks/useClientWorkflow';
import { Activity, RotateCcw, AlertCircle, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './PreviewPage.css';

const PreviewPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const workflow = useClientWorkflow();
  
  const [formValues, setFormValues] = useState({});
  const isStartingRef = useRef(false);
  const startedWorkflowIdRef = useRef(null);
  
  // Получаем workflow_id из URL параметров
  const workflowId = "68dd5eec8341ae5cb6c60018"; // searchParams.get('workflow_id') || searchParams.get('id');

  // Автостарт workflow при монтировании (защита от двойных вызовов)
  useEffect(() => {
    // Проверяем: не запускается ли уже, не запущен ли, доступен ли API
    if (
      !isStartingRef.current &&
      !workflow.currentState &&
      workflow.isApiAvailable &&
      workflowId &&
      startedWorkflowIdRef.current !== workflowId
    ) {
      isStartingRef.current = true;
      startedWorkflowIdRef.current = workflowId;
      
      console.log('🚀 [PreviewPage] Starting workflow:', workflowId);
      
      workflow.startWorkflow(workflowId, {})
        .then(() => {
          console.log('✅ [PreviewPage] Workflow started successfully');
        })
        .catch(error => {
          console.error('❌ [PreviewPage] Failed to start:', error);
          isStartingRef.current = false;
          startedWorkflowIdRef.current = null;
        })
        .finally(() => {
          isStartingRef.current = false;
        });
    }
  }, [workflowId, workflow.isApiAvailable, workflow.currentState]); // Правильные зависимости

  // Синхронизация formValues с context.inputs
  useEffect(() => {
    if (workflow.context?.inputs) {
      setFormValues({ ...workflow.context.inputs });
    }
  }, [workflow.context]);

  // Обработчик изменения инпутов
  const handleInputChange = useCallback((name, value) => {
    setFormValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  // Обработчик событий
  const handleEvent = useCallback(async (eventName, eventParams = {}) => {
    if (!eventName || workflow.isLoading) {
      return;
    }

    const inputs = {
      ...formValues,
      ...eventParams
    };

    try {
      await workflow.sendAction(eventName, inputs);
    } catch (error) {
      console.error('❌ [PreviewPage] Event failed:', error);
    }
  }, [formValues, workflow]);

  // Loading state
  if (!workflowId) {
    return (
      <div className="preview-page">
        <div className="preview-error">
          <AlertCircle size={48} />
          <h2>Не указан workflow_id</h2>
          <p>Добавьте параметр ?workflow_id=... в URL</p>
          <button onClick={() => navigate('/sandbox')} className="preview-btn">
            <ArrowLeft size={16} />
            Вернуться в Sandbox
          </button>
        </div>
      </div>
    );
  }

  if (!workflow.isApiAvailable) {
    return (
      <div className="preview-page">
        <div className="preview-error">
          <AlertCircle size={48} />
          <h2>API недоступен</h2>
          <p>Client Workflow API не отвечает. Проверьте соединение.</p>
          <button onClick={() => window.location.reload()} className="preview-btn">
            <RotateCcw size={16} />
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="preview-page">
      {/* Header */}
      <header className="preview-header">
        <div className="preview-header-left">
          <button
            onClick={() => navigate(-1)}
            className="preview-back-btn"
            title="Назад"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="preview-header-text">
            <h1>{workflow.currentState || 'Preview'}</h1>
            {workflow.stateType && (
              <span className="preview-state-badge">{workflow.stateType}</span>
            )}
          </div>
        </div>
        <div className="preview-header-right">
          <button
            onClick={workflow.refreshState}
            disabled={workflow.isLoading}
            className="preview-btn preview-btn-icon"
            title="Обновить"
          >
            <Activity size={18} />
          </button>
          <button
            onClick={workflow.reset}
            disabled={workflow.isLoading}
            className="preview-btn preview-btn-icon"
            title="Сброс"
          >
            <RotateCcw size={18} />
          </button>
        </div>
      </header>

      {/* Error Banner */}
      {workflow.error && (
        <div className="preview-error-banner">
          <AlertCircle size={20} />
          <div>
            <strong>Ошибка:</strong> {workflow.error.message || String(workflow.error)}
          </div>
          <button onClick={workflow.clearError} className="preview-btn-close">
            ✕
          </button>
        </div>
      )}

      {/* Loading Indicator */}
      {workflow.isLoading && (
        <div className="preview-loading-bar">
          <div className="preview-loading-progress"></div>
        </div>
      )}

      {/* Content */}
      <div className="preview-content">
        {/* Screen Renderer */}
        {workflow.hasScreen && workflow.screen && (
          <div className="preview-screen">
            <SandboxScreenRenderer
              screen={workflow.screen}
              context={workflow.context}
              formValues={formValues}
              onInputChange={handleInputChange}
              onEvent={handleEvent}
              isEventPending={workflow.isLoading}
            />
          </div>
        )}

        {/* Technical State */}
        {workflow.isTechnicalState && (
          <div className="preview-technical-state">
            <div className="preview-technical-icon">⚙️</div>
            <h3>Техническое состояние</h3>
            <p>{workflow.currentState}</p>
            <small>Автоматический переход...</small>
          </div>
        )}

        {/* Empty State */}
        {!workflow.currentState && !workflow.isLoading && (
          <div className="preview-empty">
            <h3>Ожидание запуска workflow</h3>
            <p>Workflow ID: {workflowId}</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="preview-footer">
        <div className="preview-footer-info">
          <span>Session: {workflow.sessionId?.slice(0, 8)}...</span>
          <span>•</span>
          <span>State: {workflow.currentState || '—'}</span>
        </div>
      </footer>
    </div>
  );
};

export default PreviewPage;
