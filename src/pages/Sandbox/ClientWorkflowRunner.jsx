/**
 * ClientWorkflowRunner
 * 
 * Компонент для работы с /client/workflow API.
 * Использует useClientWorkflow hook и client_session_id для управления состоянием.
 */

import { useCallback, useEffect, useState, useRef } from 'react';
import { Activity, History as HistoryIcon, PlugZap, RotateCcw, AlertCircle } from 'lucide-react';
import SandboxScreenRenderer from './SandboxScreenRenderer';
import { useAnalytics } from '../../services/analytics';
import { useClientWorkflow } from '../../hooks/useClientWorkflow';
import './SandboxPage.css';

const formatValue = (value) => {
  if (value === null) return 'null';
  if (value === undefined) return '—';
  if (Array.isArray(value)) return value.map((item) => formatValue(item)).join(', ');
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return '[object]';
    }
  }
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return String(value);
};

const flattenContext = (value, prefix = '') => {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      flattenContext(item, prefix ? `${prefix}.${index}` : String(index))
    );
  }
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, nestedValue]) =>
      flattenContext(nestedValue, prefix ? `${prefix}.${key}` : key)
    );
  }
  return prefix ? [{ key: prefix, value: formatValue(value) }] : [];
};

const formatTime = (iso) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch {
    return iso;
  }
};

/**
 * @param {Object} props
 * @param {string} props.workflowId - ID workflow для запуска
 * @param {Object} props.initialContext - Начальный контекст (опционально)
 * @param {Function} props.onExit - Callback для выхода из режима API
 */
const ClientWorkflowRunner = ({ workflowId, initialContext = {}, onExit }) => {
  const { trackScreenView, finalizeScreenTiming } = useAnalytics();
  const workflow = useClientWorkflow();
  
  const [formValues, setFormValues] = useState({});
  const [history, setHistory] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(() => new Date().toISOString());
  const isStartingRef = useRef(false);
  const startedWorkflowIdRef = useRef(null);
  const hasMountedRef = useRef(false); // Отслеживаем первое монтирование

  // Автостарт workflow ОДИН РАЗ при монтировании
  // Благодаря кэшу в startClientWorkflow, повторные вызовы не создают дубликатов
  useEffect(() => {
    // Если уже запускали - выходим
    if (hasMountedRef.current) {
      console.log('⏭️ [ClientWorkflowRunner] Already mounted, skipping auto-start');
      return;
    }
    
    // Проверяем базовые условия
    if (!workflow.isApiAvailable || !workflowId) {
      console.log('⏭️ [ClientWorkflowRunner] Not ready:', {
        isApiAvailable: workflow.isApiAvailable,
        workflowId
      });
      return;
    }
    
    // Если уже есть currentState - значит workflow уже запущен
    if (workflow.currentState) {
      console.log('⏭️ [ClientWorkflowRunner] Workflow already has state:', workflow.currentState);
      hasMountedRef.current = true;
      return;
    }
    
    // Защита от параллельных запусков
    if (isStartingRef.current) {
      console.log('⏭️ [ClientWorkflowRunner] Already starting, skipping');
      return;
    }
    
    // Помечаем, что мы монтировались и стартуем
    hasMountedRef.current = true;
    isStartingRef.current = true;
    startedWorkflowIdRef.current = workflowId;
    
    console.log('🚀 [ClientWorkflowRunner] Auto-starting workflow (ONCE):', workflowId);
    console.log('📦 [ClientWorkflowRunner] initialContext передаваемый:', initialContext);
    console.log('📏 [ClientWorkflowRunner] Размер initialContext:', Object.keys(initialContext).length, 'ключей');
    
    workflow.startWorkflow(workflowId, initialContext)
      .then(() => {
        console.log('✅ [ClientWorkflowRunner] Workflow started successfully');
      })
      .catch(error => {
        console.error('❌ [ClientWorkflowRunner] Failed to auto-start:', error);
        // При ошибке сбрасываем флаги, чтобы можно было повторить
        hasMountedRef.current = false;
        isStartingRef.current = false;
        startedWorkflowIdRef.current = null;
      })
      .finally(() => {
        isStartingRef.current = false;
      });
  }, [workflowId, workflow.isApiAvailable]); // Минимум зависимостей

  // Обновление formValues при изменении context
  useEffect(() => {
    if (workflow.context?.inputs) {
      setFormValues({ ...workflow.context.inputs });
    }
  }, [workflow.context]);

  // Tracking переходов между экранами
  useEffect(() => {
    if (workflow.currentState && workflow.isScreenState) {
      const screenId = workflow.screen?.id || workflow.currentState;
      trackScreenView(screenId);
      return () => finalizeScreenTiming(screenId);
    }
  }, [workflow.currentState, workflow.isScreenState, trackScreenView, finalizeScreenTiming]);

  // Обработчик изменения инпутов
  const handleInputChange = useCallback((name, value) => {
    setFormValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  // Обработчик событий (клики, переходы)
  const handleEvent = useCallback(async (eventName, eventParams = {}) => {
    if (!eventName || workflow.isLoading) {
      return;
    }

    console.log('📤 [ClientWorkflowRunner] Handling event:', eventName, eventParams);

    // Объединяем formValues и eventParams
    const inputs = {
      ...formValues,
      ...eventParams
    };

    try {
      const response = await workflow.sendAction(eventName, inputs);
      
      // Добавляем в историю
      setHistory((prev) => [
        {
          timestamp: new Date().toISOString(),
          event: eventName,
          from: workflow.currentState,
          to: response.current_state,
          inputs
        },
        ...prev
      ]);
      
      setLastUpdated(new Date().toISOString());
      
      console.log('✅ [ClientWorkflowRunner] Event handled:', response.current_state);
    } catch (error) {
      console.error('❌ [ClientWorkflowRunner] Event failed:', error);
    }
  }, [formValues, workflow]);

  // Сброс workflow
  const handleReset = useCallback(async () => {
    if (workflow.isLoading) return;
    
    try {
      await workflow.reset();
      setFormValues({});
      setHistory([]);
      setLastUpdated(new Date().toISOString());
      console.log('🔄 [ClientWorkflowRunner] Workflow reset');
    } catch (error) {
      console.error('❌ [ClientWorkflowRunner] Reset failed:', error);
    }
  }, [workflow]);

  // Обновление состояния
  const handleRefresh = useCallback(async () => {
    if (workflow.isLoading) return;
    
    try {
      await workflow.refreshState();
      setLastUpdated(new Date().toISOString());
      console.log('🔄 [ClientWorkflowRunner] State refreshed');
    } catch (error) {
      console.error('❌ [ClientWorkflowRunner] Refresh failed:', error);
    }
  }, [workflow]);

  // Flatted context для отображения
  const flatContext = flattenContext(workflow.context);

  return (
    <div className="sandbox-container">
      {/* Header */}
      <div className="sandbox-header">
        <div className="sandbox-header-left">
          <div className="sandbox-api-badge">
            <PlugZap size={16} />
            <span>Client Workflow API</span>
            {workflow.isApiAvailable && <span className="badge-status">●</span>}
          </div>
          {workflow.currentState && (
            <div className="sandbox-state-name">
              {workflow.currentState}
              <span className="state-type-badge">{workflow.stateType}</span>
            </div>
          )}
        </div>
        <div className="sandbox-header-right">
          <button
            onClick={handleRefresh}
            disabled={workflow.isLoading}
            className="sandbox-btn-icon"
            title="Обновить состояние"
          >
            <Activity size={18} />
          </button>
          <button
            onClick={handleReset}
            disabled={workflow.isLoading}
            className="sandbox-btn-icon"
            title="Сброс"
          >
            <RotateCcw size={18} />
          </button>
          <button
            onClick={onExit}
            className="sandbox-btn-secondary"
          >
            Офлайн режим
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {workflow.error && (
        <div className="sandbox-error-banner">
          <AlertCircle size={20} />
          <div>
            <strong>Ошибка:</strong> {workflow.error.message || String(workflow.error)}
          </div>
          <button onClick={workflow.clearError} className="sandbox-btn-icon">
            ✕
          </button>
        </div>
      )}

      {/* Loading Indicator */}
      {workflow.isLoading && (
        <div className="sandbox-loading">
          <div className="spinner" />
          <span>Загрузка...</span>
        </div>
      )}

      {/* Content */}
      <div className="sandbox-content">
        {/* Screen Renderer */}
        {workflow.hasScreen && workflow.screen && (
          <div className="sandbox-screen-panel">
            <h3>Экран</h3>
            <SandboxScreenRenderer
              screen={workflow.screen}
              context={workflow.context}
              formValues={formValues}
              onInputChange={handleInputChange}
              onEvent={handleEvent}
            />
          </div>
        )}

        {/* Technical State */}
        {workflow.isTechnicalState && (
          <div className="sandbox-technical-state">
            <div className="technical-state-icon">⚙️</div>
            <h3>Техническое состояние</h3>
            <p>{workflow.currentState}</p>
            <small>Автоматический переход...</small>
          </div>
        )}

        {/* Context Panel */}
        <div className="sandbox-context-panel">
          <h3>Контекст</h3>
          <div className="context-meta">
            <small>Session: {workflow.sessionId}</small>
            <small>Обновлено: {formatTime(lastUpdated)}</small>
          </div>
          <table className="context-table">
            <tbody>
              {flatContext.length === 0 ? (
                <tr>
                  <td colSpan={2} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    Контекст пуст
                  </td>
                </tr>
              ) : (
                flatContext.map((item, index) => (
                  <tr key={`${item.key}-${index}`}>
                    <td className="context-key">{item.key}</td>
                    <td className="context-value">{item.value}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* History Panel */}
        {history.length > 0 && (
          <div className="sandbox-history-panel">
            <h3>
              <HistoryIcon size={18} />
              История переходов
            </h3>
            <div className="history-list">
              {history.map((entry, index) => (
                <div key={index} className="history-entry">
                  <div className="history-time">{formatTime(entry.timestamp)}</div>
                  <div className="history-event">
                    <strong>{entry.event}</strong>
                    <span className="history-transition">
                      {entry.from} → {entry.to}
                    </span>
                  </div>
                  {Object.keys(entry.inputs || {}).length > 0 && (
                    <details className="history-inputs">
                      <summary>Inputs ({Object.keys(entry.inputs).length})</summary>
                      <pre>{JSON.stringify(entry.inputs, null, 2)}</pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientWorkflowRunner;
