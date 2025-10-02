import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, History as HistoryIcon, PlugZap, RotateCcw } from 'lucide-react';
import SandboxScreenRenderer from './SandboxScreenRenderer';
import { useAnalytics } from '../../services/analytics';
import './SandboxPage.css';

const API_BASE = (import.meta.env.VITE_SANDBOX_API_BASE ?? '').replace(/\/$/, '');

const buildApiUrl = (path) => {
  if (!path) {
    return API_BASE || '';
  }
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${normalizedPath}`;
};

const formatValue = (value) => {
  if (value === null) {
    return 'null';
  }
  if (value === undefined) {
    return '—';
  }
  if (Array.isArray(value)) {
    return value.map((item) => formatValue(item)).join(', ');
  }
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return '[object]';
    }
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
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
  return prefix
    ? [{ key: prefix, value: formatValue(value) }]
    : [];
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

const ApiSandboxRunner = ({ initialData, onExit }) => {
  const { trackScreenView, finalizeScreenTiming } = useAnalytics();
  const [screen, setScreen] = useState(initialData?.screen ?? null);
  const [context, setContext] = useState(initialData?.context ?? {});
  const [formValues, setFormValues] = useState(() => ({ ...(initialData?.context?.inputs || {}) }));
  const [history, setHistory] = useState([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(() => new Date().toISOString());

  const updateFromResponse = useCallback((payload, historyEntry = null) => {
    setScreen(payload?.screen ?? null);
    setContext(payload?.context ?? {});
    setFormValues(payload?.context?.inputs ? { ...payload.context.inputs } : {});
    setLastUpdated(new Date().toISOString());
    if (historyEntry) {
      setHistory((prev) => [historyEntry, ...prev]);
    }
  }, []);

  const refreshStart = useCallback(async () => {
    setPending(true);
    setError(null);
    try {
      const resp = await fetch(buildApiUrl('/api/start/'));
      if (!resp.ok) {
        throw new Error(`API ответил статусом ${resp.status}`);
      }
      const data = await resp.json();
      updateFromResponse(data);
      setHistory([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось получить стартовый экран');
    } finally {
      setPending(false);
    }
  }, [updateFromResponse]);

  useEffect(() => {
    if (initialData) {
      updateFromResponse(initialData);
      setHistory([]);
      return;
    }
    refreshStart();
  }, [initialData, refreshStart, updateFromResponse]);

  const handleInputChange = useCallback((name, value) => {
    setFormValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleEvent = useCallback(async (eventName, eventParams = {}) => {
    if (!eventName || pending) {
      return;
    }
    setPending(true);
    setError(null);
    try {
      const params = new URLSearchParams({ event: eventName });
      
      // Add event-specific parameters first
      Object.entries(eventParams).forEach(([key, value]) => {
        if (value === null || value === undefined) {
          return;
        }
        const stringValue = String(value).trim();
        if (stringValue.length === 0) {
          return;
        }
        params.append(key, stringValue);
      });
      
      // Then add form values
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

      const resp = await fetch(buildApiUrl(`/api/action?${params.toString()}`));
      if (!resp.ok) {
        throw new Error(`API вернул статус ${resp.status}`);
      }
      const data = await resp.json();
      updateFromResponse(data, {
        id: `${Date.now()}-${eventName}`,
        event: eventName,
        timestamp: new Date().toISOString(),
        context: { ...formValues, ...eventParams },
        screenId: data?.screen?.id ?? null
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при выполнении действия');
    } finally {
      setPending(false);
    }
  }, [formValues, pending, updateFromResponse]);

  const flattenedContext = useMemo(() => (
    flattenContext(context)
      .filter((entry) => entry.key)
      .sort((a, b) => a.key.localeCompare(b.key))
  ), [context]);

  useEffect(() => {
    if (!screen?.id) {
      return () => {};
    }

    const screenName = screen?.name ?? screen?.title ?? String(screen.id);
    const productId = context?.product?.id ?? context?.metadata?.productId ?? 'api-sandbox';

    trackScreenView({
      screenId: screen.id,
      screenName,
      nodeId: screen.id,
      productId
    });

    return () => {
      finalizeScreenTiming('api_screen_cleanup');
    };
  }, [
    screen?.id,
    screen?.name,
    screen?.title,
    context?.product?.id,
    context?.metadata?.productId,
    trackScreenView,
    finalizeScreenTiming
  ]);

  return (
    <div className="sandbox-page sandbox-api-mode">
      <div className="sandbox-sidebar">
        <section className="sandbox-card">
          <header className="sandbox-card-header">
            <Activity size={18} />
            <div>
              <h2>API режим</h2>
              <p>Экран обновляется по ответу сервера</p>
            </div>
          </header>
          <div className="sandbox-api-status">
            <span className="sandbox-api-pill">
              <PlugZap size={14} />
              <span>Подключено</span>
            </span>
            <span className="sandbox-api-timestamp">Обновлено: {formatTime(lastUpdated)}</span>
            {pending && <span className="sandbox-api-pending">Запрашиваем…</span>}
          </div>
          <div className="sandbox-api-controls">
            <button
              type="button"
              className="sandbox-reset"
              onClick={refreshStart}
              disabled={pending}
            >
              <RotateCcw size={16} />
              Начать заново
            </button>
            <button
              type="button"
              className="sandbox-reset secondary"
              onClick={onExit}
            >
              Отключить API
            </button>
          </div>
          {error && <div className="sandbox-api-error">{error}</div>}
        </section>

        <section className="sandbox-card">
          <header className="sandbox-card-header">
            <HistoryIcon size={18} />
            <div>
              <h2>История событий</h2>
              <p>Последние ответы от API</p>
            </div>
          </header>
          {history.length === 0 ? (
            <div className="sandbox-empty">Действия ещё не выполнялись</div>
          ) : (
            <ul className="sandbox-history-list">
              {history.map((entry) => (
                <li key={entry.id} className="sandbox-history-item">
                  <div className="sandbox-history-meta">
                    <span className="sandbox-history-time">{formatTime(entry.timestamp)}</span>
                    <span className="sandbox-history-label">{entry.event}</span>
                  </div>
                  {entry.screenId && (
                    <p className="sandbox-history-summary">Следующий экран: {entry.screenId}</p>
                  )}
                  {entry.inputs && Object.keys(entry.inputs).length > 0 && (
                    <ul className="sandbox-history-patch">
                      {Object.entries(entry.inputs).map(([key, value]) => (
                        <li key={`${entry.id}-${key}`}>
                          <span className="sandbox-history-patch-key">{key}</span>
                          <span className="sandbox-history-patch-value">{formatValue(value)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="sandbox-card">
          <header className="sandbox-card-header">
            <span className="sandbox-card-icon">{'}{'}</span>
            <div>
              <h2>Контекст от API</h2>
              <p>Данные для биндингов</p>
            </div>
          </header>
          <div className="sandbox-context-grid">
            {flattenedContext.length === 0 ? (
              <div className="sandbox-empty">Контекст пуст</div>
            ) : (
              flattenedContext.map((entry) => (
                <div key={entry.key} className="sandbox-context-row">
                  <span className="sandbox-context-key">{entry.key}</span>
                  <span className="sandbox-context-value">{entry.value}</span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <div className="sandbox-main">
        <div className="sandbox-header">
          <div className="sandbox-header-text">
            <h1>{context?.state?.title || 'API Sandbox'}</h1>
            <p>Статус: {context?.state?.status || '—'} · Экран ID: {screen?.id || '—'}</p>
          </div>
        </div>

        <SandboxScreenRenderer
          screen={screen}
          context={context}
          formValues={formValues}
          onInputChange={handleInputChange}
          onEvent={handleEvent}
          isEventPending={pending}
        />
      </div>
    </div>
  );
};

export default ApiSandboxRunner;
