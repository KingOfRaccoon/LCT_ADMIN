import { useMemo, useState, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  applyContextPatch,
  cloneContext,
  getContextValue,
  isBindingValue,
  resolveBindingValue
} from './utils/bindings';
import SandboxScreenRenderer from './SandboxScreenRenderer';
import { demoProduct } from './data/demoProduct';
import {
  ArrowRight,
  GitBranch,
  History as HistoryIcon,
  PlayCircle,
  RotateCcw
} from 'lucide-react';
import './SandboxPage.css';

const isPlainObject = (value) => (
  Object.prototype.toString.call(value) === '[object Object]'
);

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

const formatJson = (value) => {
  if (value === undefined) {
    return '—';
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

const flattenContext = (value, prefix = '') => {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      flattenContext(item, prefix ? `${prefix}.${index}` : String(index))
    );
  }

  if (isPlainObject(value)) {
    return Object.entries(value).flatMap(([key, nestedValue]) =>
      flattenContext(nestedValue, prefix ? `${prefix}.${key}` : key)
    );
  }

  return [
    {
      key: prefix,
      value: formatValue(value)
    }
  ];
};

const describePatch = (patch, context) => {
  if (!patch || typeof patch !== 'object') {
    return [];
  }

  const pairs = [];

  const traverse = (value, path) => {
    if (!path) {
      return;
    }

    if (isPlainObject(value) && !isBindingValue(value)) {
      Object.entries(value).forEach(([childKey, childValue]) => {
        traverse(childValue, `${path}.${childKey}`);
      });
      return;
    }

    let resolved = value;
    if (isBindingValue(value)) {
      resolved = resolveBindingValue(value, context, undefined);
    }
    pairs.push({ key: path, value: formatValue(resolved) });
  };

  Object.entries(patch).forEach(([path, value]) => {
    traverse(value, path);
  });

  return pairs;
};

const getInitialNodeId = (product) => (
  product.nodes.find((node) => node.start)?.id
  ?? product.nodes[0]?.id
  ?? null
);

const SandboxPage = () => {
  const location = useLocation();
  const runtimeProduct = location.state?.product;
  const runtimeSchemas = location.state?.variableSchemas;
  const product = runtimeProduct || demoProduct;
  const variableSchemas = useMemo(
    () => runtimeSchemas || product.variableSchemas || {},
    [product, runtimeSchemas]
  );
  const initialNodeId = useMemo(() => getInitialNodeId(product), [product]);

  const [currentNodeId, setCurrentNodeId] = useState(initialNodeId);
  const [contextState, setContextState] = useState(() => cloneContext(product.initialContext));
  const [history, setHistory] = useState([]);

  useEffect(() => {
    setContextState(cloneContext(product.initialContext));
    setCurrentNodeId(getInitialNodeId(product));
    setHistory([]);
  }, [product]);

  const currentNode = useMemo(
    () => product.nodes.find((node) => node.id === currentNodeId),
    [product, currentNodeId]
  );
  const currentScreen = useMemo(
    () => product.screens[currentNode?.screenId] ?? null,
    [product, currentNode]
  );
  const availableEdges = currentNode?.edges ?? [];

  const nodePreview = useMemo(() => {
    if (!currentNode) {
      return { type: 'empty' };
    }

    if (currentNode.type === 'screen') {
      return { type: 'screen', screen: currentScreen };
    }

    if (currentNode.type === 'action') {
      const actionType = currentNode.data?.actionType;

      if (actionType === 'api') {
        const config = currentNode.data?.config || {};
        const contextKey = typeof config.contextKey === 'string' ? config.contextKey.trim() : '';
        const method = typeof config.method === 'string' ? config.method.toUpperCase() : 'GET';
        const endpoint = config.endpoint || '';

        let resultValue;
        if (contextKey) {
          resultValue = getContextValue(contextState, contextKey);
          if (resultValue === undefined && contextState && Object.prototype.hasOwnProperty.call(contextState, contextKey)) {
            resultValue = contextState[contextKey];
          }
        }

        return {
          type: 'api',
          method,
          endpoint,
          contextKey,
          resultValue
        };
      }

      return {
        type: 'action',
        actionType,
        label: currentNode.label
      };
    }

    return { type: 'empty' };
  }, [contextState, currentNode, currentScreen]);

  const handleReset = useCallback(() => {
    setContextState(cloneContext(product.initialContext));
    setCurrentNodeId(getInitialNodeId(product));
    setHistory([]);
  }, [product]);

  const handleEdgeRun = useCallback((edge) => {
    if (!edge) {
      return;
    }

    const nextNode = product.nodes.find((node) => node.id === edge.target);
    if (!nextNode) {
      return;
    }

    const nextContext = applyContextPatch(contextState, edge.contextPatch ?? {}, contextState);
    setContextState(nextContext);

    const resolvedPatch = describePatch(edge.contextPatch ?? {}, nextContext);

    setHistory((prev) => [
      {
        id: `${edge.id}-${Date.now()}`,
        timestamp: new Date().toISOString(),
        from: currentNode?.id ?? null,
        to: nextNode.id,
        label: edge.label,
        summary: edge.summary,
        patch: resolvedPatch
      },
      ...prev
    ]);

    setCurrentNodeId(nextNode.id);
  }, [contextState, currentNode, product]);

  const handleSelectNode = useCallback((nodeId) => {
    setCurrentNodeId(nodeId);
  }, []);

  const flattenedContext = useMemo(() => (
    flattenContext(contextState)
      .filter((entry) => entry.key)
      .sort((a, b) => a.key.localeCompare(b.key))
  ), [contextState]);

  const schemaEntries = Object.entries(variableSchemas).map(([name, schema]) => ({ name, schema }));

  const orderStatus = getContextValue(contextState, 'data.order.status');

  return (
    <div className="sandbox-page">
      <div className="sandbox-sidebar">
        <section className="sandbox-card">
          <header className="sandbox-card-header">
            <GitBranch size={18} />
            <div>
              <h2>Граф переходов</h2>
              <p>Выберите узел, чтобы увидеть экран</p>
            </div>
          </header>

          <ul className="sandbox-node-list">
            {product.nodes.map((node) => {
              const isActive = node.id === currentNodeId;
              return (
                <li key={node.id} className={`sandbox-node-item ${isActive ? 'active' : ''}`}>
                  <button
                    type="button"
                    onClick={() => handleSelectNode(node.id)}
                    className="sandbox-node-button"
                  >
                    <span className="sandbox-node-label">{node.label}</span>
                    {isActive && <span className="sandbox-node-badge">текущий</span>}
                  </button>

                  {node.edges && node.edges.length > 0 && (
                    <div className="sandbox-node-edges">
                      {node.edges.map((edge) => (
                        <div key={edge.id} className="sandbox-node-edge">
                          <ArrowRight size={14} />
                          <span>{edge.label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        <section className="sandbox-card">
          <header className="sandbox-card-header">
            <HistoryIcon size={18} />
            <div>
              <h2>История переходов</h2>
              <p>Свежие события сверху</p>
            </div>
          </header>

          {history.length === 0 ? (
            <div className="sandbox-empty">Переходов пока не было</div>
          ) : (
            <ul className="sandbox-history-list">
              {history.map((entry) => {
                const timestamp = new Date(entry.timestamp).toLocaleTimeString('ru-RU', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                });
                return (
                  <li key={entry.id} className="sandbox-history-item">
                    <div className="sandbox-history-meta">
                      <span className="sandbox-history-time">{timestamp}</span>
                      <span className="sandbox-history-label">{entry.label}</span>
                    </div>
                    {entry.summary && (
                      <p className="sandbox-history-summary">{entry.summary}</p>
                    )}
                    {entry.patch.length > 0 && (
                      <ul className="sandbox-history-patch">
                        {entry.patch.map((patchItem) => (
                          <li key={`${entry.id}-${patchItem.key}`}>
                            <span className="sandbox-history-patch-key">{patchItem.key}</span>
                            <span className="sandbox-history-patch-value">{patchItem.value}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="sandbox-card">
          <header className="sandbox-card-header">
            <span className="sandbox-card-icon">{'}{'}</span>
            <div>
              <h2>Контекст</h2>
              <p>Текущие переменные</p>
            </div>
          </header>

          <div className="sandbox-context-grid">
            {flattenedContext.map((entry) => (
              <div key={entry.key} className="sandbox-context-row">
                <span className="sandbox-context-key">{entry.key}</span>
                <span className="sandbox-context-value">{entry.value}</span>
              </div>
            ))}
          </div>
        </section>

        {schemaEntries.length > 0 && (
          <section className="sandbox-card">
            <header className="sandbox-card-header">
              <span className="sandbox-card-icon">Σ</span>
              <div>
                <h2>Схема переменных</h2>
                <p>Структура данных из графа</p>
              </div>
            </header>

            <div className="sandbox-schema-grid">
              {schemaEntries.map(({ name, schema }) => (
                <div key={name} className="sandbox-schema-item">
                  <div className="sandbox-schema-header">
                    <span className="sandbox-schema-name">{name}</span>
                    <span className="sandbox-schema-type">{schema.type || 'unknown'}</span>
                  </div>
                  {schema.endpoint && (
                    <div className="sandbox-schema-endpoint">{schema.endpoint}</div>
                  )}
                  {schema.schema && typeof schema.schema === 'object' && (
                    <div className="sandbox-schema-keys">
                      {Object.keys(schema.schema).map((key) => (
                        <span key={key} className="sandbox-schema-chip">{key}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      <div className="sandbox-main">
        <div className="sandbox-header">
          <div className="sandbox-header-text">
            <h1>{product.name}</h1>
            <p>{product.description}</p>
          </div>
          <button type="button" className="sandbox-reset" onClick={handleReset}>
            <RotateCcw size={16} />
            Сбросить сценарий
          </button>
        </div>

        <div className="sandbox-status">
          <div>
            <span className="sandbox-status-label">Текущий узел</span>
            <span className="sandbox-status-value">{currentNode?.label ?? '—'}</span>
          </div>
          <div>
            <span className="sandbox-status-label">Статус заказа</span>
            <span className="sandbox-status-value">{formatValue(orderStatus)}</span>
          </div>
        </div>

        <div className="sandbox-preview">
          {nodePreview.type === 'screen' && (
            <SandboxScreenRenderer screen={currentScreen} context={contextState} />
          )}

          {nodePreview.type === 'api' && (
            <div className="sandbox-card">
              <header className="sandbox-card-header">
                <span className="sandbox-card-icon">API</span>
                <div>
                  <h2>{nodePreview.method} {nodePreview.endpoint || 'API запрос'}</h2>
                  <p>
                    {nodePreview.contextKey
                      ? `Результат сохранён в контексте как "${nodePreview.contextKey}"`
                      : 'Контекстная переменная не указана'}
                  </p>
                </div>
              </header>
              <div className="sandbox-api-result">
                <pre>{formatJson(nodePreview.resultValue)}</pre>
              </div>
            </div>
          )}

          {nodePreview.type === 'action' && (
            <div className="sandbox-empty">
              Узел действия "{nodePreview.label}" пока не поддерживает превью. Выберите экран или API узел.
            </div>
          )}

          {nodePreview.type === 'empty' && (
            <div className="sandbox-empty">
              Нечего отображать — выберите узел графа.
            </div>
          )}
        </div>

        <section className="sandbox-transitions">
          <header>
            <h2>Доступные переходы</h2>
            <p>Кликните, чтобы применить контекстный патч и перейти в следующий узел</p>
          </header>

          {availableEdges.length === 0 ? (
            <div className="sandbox-empty">
              Для этого узла переходы не настроены
            </div>
          ) : (
            <div className="sandbox-transition-list">
              {availableEdges.map((edge) => {
                const pendingPatch = describePatch(edge.contextPatch ?? {}, contextState);
                return (
                  <article key={edge.id} className="sandbox-transition-card">
                    <div className="sandbox-transition-body">
                      <h3>{edge.label}</h3>
                      {edge.summary && <p>{edge.summary}</p>}
                      {pendingPatch.length > 0 && (
                        <ul className="sandbox-transition-patch">
                          {pendingPatch.map((item) => (
                            <li key={`${edge.id}-${item.key}`}>
                              <span className="sandbox-transition-key">{item.key}</span>
                              <ArrowRight size={12} />
                              <span className="sandbox-transition-value">{item.value}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <button
                      type="button"
                      className="sandbox-transition-action"
                      onClick={() => handleEdgeRun(edge)}
                    >
                      <PlayCircle size={18} />
                      Перейти
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default SandboxPage;
