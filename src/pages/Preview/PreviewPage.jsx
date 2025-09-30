import { useCallback, useEffect, useMemo, useState } from 'react';
import SandboxScreenRenderer from '../Sandbox/SandboxScreenRenderer';
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
  const [screen, setScreen] = useState(null);
  const [context, setContext] = useState(null);
  const [formValues, setFormValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const contextTitle = useMemo(() => context?.state?.title || 'Предпросмотр в песочнице', [context]);
  const contextStatus = useMemo(() => context?.state?.status || '—', [context]);

  const applyResponse = useCallback((payload) => {
    setScreen(payload?.screen ?? null);
    setContext(payload?.context ?? {});
    setFormValues(payload?.context?.inputs ? { ...payload.context.inputs } : {});
    setLastUpdated(new Date().toISOString());
  }, []);

  const fetchStart = useCallback(async () => {
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
  }, [applyResponse]);

  useEffect(() => {
    fetchStart();
  }, [fetchStart]);

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
