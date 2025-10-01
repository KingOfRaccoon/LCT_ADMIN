import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import SandboxScreenRenderer from '../Sandbox/SandboxScreenRenderer';
import { WorkflowExportButton } from '../../components/WorkflowExportButton/WorkflowExportButton';
import { loadWorkflow, parseWorkflowUrlParams } from '../../utils/workflowApi';
import toast from 'react-hot-toast';
import './PreviewPage.css';

const API_BASE = (import.meta.env.VITE_SANDBOX_API_BASE ?? '').replace(/\/$/, '');

const buildApiUrl = (path) => {
  if (!path) {
    return API_BASE || '';
  }
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${normalizedPath}`;
};

const PreviewPage = () => {
  const [searchParams] = useSearchParams();
  
  // URL параметры для загрузки workflow
  const { clientSessionId, clientWorkflowId } = parseWorkflowUrlParams(searchParams);
  
  // Состояние для workflow
  const [workflowData, setWorkflowData] = useState(null);
  const [workflowLoading, setWorkflowLoading] = useState(false);
  const [workflowError, setWorkflowError] = useState(null);
  
  const [screen, setScreen] = useState(null);
  const [context, setContext] = useState(null);
  const [formValues, setFormValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Загрузка workflow через API
  useEffect(() => {
    if (!clientSessionId || !clientWorkflowId) {
      return;
    }
    
    let cancelled = false;
    
    const fetchWorkflow = async () => {
      setWorkflowLoading(true);
      setWorkflowError(null);
      
      try {
        const workflow = await loadWorkflow(clientSessionId, clientWorkflowId);
        
        if (!cancelled) {
          setWorkflowData(workflow);
          
          // Устанавливаем стартовый экран
          const startNode = workflow.nodes.find(n => n.start) || workflow.nodes[0];
          if (startNode && workflow.screens[startNode.screenId]) {
            setScreen(workflow.screens[startNode.screenId]);
            setContext(workflow.initialContext);
          }
          
          toast.success(`Workflow "${workflow.metadata.name}" загружен!`);
        }
      } catch (error) {
        if (!cancelled) {
          const errorMessage = error instanceof Error ? error.message : 'Не удалось загрузить workflow';
          setWorkflowError(errorMessage);
          toast.error(`Ошибка: ${errorMessage}`);
        }
      } finally {
        if (!cancelled) {
          setWorkflowLoading(false);
          setLoading(false);
        }
      }
    };
    
    fetchWorkflow();
    
    return () => {
      cancelled = true;
    };
  }, [clientSessionId, clientWorkflowId]);

  const contextTitle = useMemo(() => context?.state?.title || 'Предпросмотр в песочнице', [context]);
  const contextStatus = useMemo(() => context?.state?.status || '—', [context]);

  const applyResponse = useCallback((payload) => {
    setScreen(payload?.screen ?? null);
    setContext(payload?.context ?? {});
    setFormValues(payload?.context?.inputs ? { ...payload.context.inputs } : {});
    setLastUpdated(new Date().toISOString());
  }, []);

  const fetchStart = useCallback(async () => {
    // Если workflow загружен через API, не делаем запрос к /api/start
    if (workflowData) {
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(buildApiUrl('/api/start/'));
      if (!response.ok) {
        throw new Error(`API ответил статусом ${response.status}`);
      }
      const data = await response.json();
      applyResponse(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось получить стартовый экран');
    } finally {
      setLoading(false);
    }
  }, [applyResponse, workflowData]);

  useEffect(() => {
    // Загружаем /api/start только если workflow не загружен через URL параметры
    if (!clientSessionId && !clientWorkflowId) {
      fetchStart();
    }
  }, [fetchStart, clientSessionId, clientWorkflowId]);

  const handleRetry = useCallback(() => {
    fetchStart();
  }, [fetchStart]);

  const handleInputChange = useCallback((name, value) => {
    if (!name) {
      return;
    }
    setFormValues((prev) => ({
      ...prev,
      [name]: value
    }));
  }, []);

  const handleEvent = useCallback(async (eventName) => {
    if (!eventName || pending) {
      return;
    }
    setPending(true);
    setError(null);

    try {
      const params = new URLSearchParams({ event: eventName });
      Object.entries(formValues).forEach(([key, value]) => {
        if (value === null || value === undefined) {
          return;
        }
        const stringValue = String(value).trim();
        if (stringValue.length === 0) {
          return;
        }
        params.append(key, stringValue);
      });

      const response = await fetch(buildApiUrl(`/api/action?${params.toString()}`));
      if (!response.ok) {
        throw new Error(`API вернул статус ${response.status}`);
      }
      const data = await response.json();
      applyResponse(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при выполнении действия');
    } finally {
      setPending(false);
    }
  }, [applyResponse, formValues, pending]);

  const formattedTimestamp = useMemo(() => {
    if (!lastUpdated) {
      return '—';
    }
    try {
      return new Date(lastUpdated).toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return lastUpdated;
    }
  }, [lastUpdated]);

  // Отображаем загрузчик
  if (loading || workflowLoading) {
    return (
      <div className="preview-page">
        <div className="preview-loading">
          <div className="preview-spinner"></div>
          <p>{workflowLoading ? 'Загрузка workflow...' : 'Загрузка...'}</p>
        </div>
      </div>
    );
  }

  // Отображаем ошибку
  if (error || workflowError) {
    return (
      <div className="preview-page">
        <div className="preview-error">
          <h2>Ошибка</h2>
          <p>{workflowError || error}</p>
          <button onClick={handleRetry} className="preview-retry-btn">
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="preview-page">
      <header className="preview-header">
        <div className="preview-header-text">
          <h1>{contextTitle}</h1>
          <p>Статус: {contextStatus}</p>
        </div>
        <div className="preview-header-meta">
          <span className="preview-meta-pill">Обновлено: {formattedTimestamp}</span>
          {pending && <span className="preview-meta-pending">Отправляем…</span>}
          
          {/* Кнопка экспорта workflow */}
          {screen && (
            <WorkflowExportButton
              graphData={{
                nodes: [
                  {
                    id: screen.id || 'preview-screen',
                    type: 'screen',
                    data: {
                      label: screen.name || 'Preview Screen',
                      screenId: screen.id,
                      start: true,
                      final: true
                    }
                  }
                ],
                edges: []
              }}
              initialContext={context || {}}
              productId="preview"
              label="Export"
              size={16}
              showValidation={false}
            />
          )}
        </div>
      </header>

      {error && (
        <div className="preview-error">
          <span>{error}</span>
          <button type="button" onClick={handleRetry} disabled={pending}>Повторить</button>
        </div>
      )}

      <div className="preview-canvas">
        {loading ? (
          <div className="preview-loader">Загружаем стартовый экран…</div>
        ) : (
          <SandboxScreenRenderer
            screen={screen}
            context={context || {}}
            formValues={formValues}
            onInputChange={handleInputChange}
            onEvent={handleEvent}
            isEventPending={pending}
          />
        )}
      </div>
    </div>
  );
};

export default PreviewPage;
