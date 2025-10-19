import { useState, useCallback, useRef, useEffect, useMemo, memo } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ReactFlow,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  Controls,
  MiniMap,
  Panel,
  MarkerType,
  getBezierPath,
  EdgeLabelRenderer,
  BaseEdge,
  Handle,
  Position
} from '@xyflow/react';
import { 
  Plus, 
  Save, 
  Undo, 
  Redo, 
  ZoomIn, 
  ZoomOut,
  Download,
  Upload,
  Play,
  Settings,
  ArrowRight,
  Monitor,
  Activity,
  Database,
  GitBranch,
  Send,
  CheckCircle,
  AlertCircle,
  Trash2,
  Edit3
} from 'lucide-react';
import toast from 'react-hot-toast';
import '@xyflow/react/dist/style.css';
import './ScreenEditor.css';
import ConfirmDialog from '../../components/Common/ConfirmDialog';
import { useVirtualContext } from '../../context/VirtualContext';
import { useWorkflowApi } from '../../hooks/useWorkflowApi';
import { getProductById as getProductByIdApi } from '../../services/productApi.js';
import dagre from 'dagre';
import defaultGraphTemplate from '../../data/defaultGraphTemplate.json';
import WorkflowViewer from '../../components/WorkflowViewer';

const normalizeBindings = (bindings) => (Array.isArray(bindings) ? bindings : []);

const formatBindingLabel = (binding) => {
  if (!binding) {
    return '—';
  }

  const name = typeof binding.name === 'string' ? binding.name.trim() : '';
  const variable = typeof binding.variable === 'string' ? binding.variable.trim() : '';

  if (name && variable) {
    if (name === variable) {
      return name;
    }
    return `${name} → ${variable}`;
  }

  if (variable) {
    return variable;
  }

  if (name) {
    return name;
  }

  return '—';
};

const BindingsSection = ({ title, bindings, emptyMessage }) => (
  <div className="node-bindings">
    <div className="node-bindings-title">{title}</div>
    {bindings.length > 0 ? (
      <ul className="node-bindings-list">
        {bindings.map((binding) => (
          <li key={binding.id || `${binding.name || 'binding'}-${binding.variable || 'value'}`}>
            {formatBindingLabel(binding)}
          </li>
        ))}
      </ul>
    ) : (
      <div className="node-bindings-empty">{emptyMessage}</div>
    )}
  </div>
);

const truncateText = (value, maxLength = 120) => {
  if (typeof value !== 'string') {
    return '';
  }

  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1)}…`;
};

const describeSchema = (schema) => {
  if (!schema || typeof schema !== 'object') {
    return null;
  }

  if (Array.isArray(schema)) {
    return `Массив (${schema.length})`;
  }

  const keys = Object.keys(schema);
  if (keys.length === 0) {
    return 'Объект (пустой)';
  }

  const keysPreview = keys.slice(0, 5).join(', ');
  return keys.length > 5 ? `${keysPreview} и др.` : keysPreview;
};

const ConfigSummary = ({ actionType, config = {} }) => {
  if (!actionType) {
    return null;
  }

  if (actionType === 'api') {
    const method = (config.method || 'GET').toUpperCase();
    const endpoint = config.endpoint ? truncateText(config.endpoint.trim(), 140) : '—';
    const contextKey = typeof config.contextKey === 'string' ? config.contextKey.trim() : '';
    const schemaMeta = describeSchema(config.schema);

    return (
      <div className="node-config-summary">
        <div className="node-config-title">Конфигурация API</div>
        <div className="node-config-line">
          <span className="node-config-method">{method}</span>
          <span className="node-config-endpoint">{endpoint}</span>
        </div>
        {contextKey && (
          <div className="node-config-meta">Контекст: {contextKey}</div>
        )}
        {schemaMeta && (
          <div className="node-config-meta">Схема: {schemaMeta}</div>
        )}
      </div>
    );
  }

  if (actionType === 'condition') {
    const condition = config.condition ? truncateText(config.condition, 140) : '—';
    return (
      <div className="node-config-summary">
        <div className="node-config-title">Условие</div>
        <div className="node-config-expression">{condition}</div>
      </div>
    );
  }

  if (actionType === 'validation') {
    const field = config.field ? config.field.trim() : '—';
    const validationType = config.validationType ? config.validationType : 'required';
    return (
      <div className="node-config-summary">
        <div className="node-config-title">Проверка</div>
        <div className="node-config-meta">Поле: {field}</div>
        <div className="node-config-meta">Тип: {validationType}</div>
      </div>
    );
  }

  const configKeys = Object.keys(config || {});
  if (configKeys.length === 0) {
    return null;
  }

  return (
    <div className="node-config-summary">
      <div className="node-config-title">Параметры</div>
      <div className="node-config-expression">{truncateText(JSON.stringify(config), 140)}</div>
    </div>
  );
};

const sanitizeGraphState = (nodes = [], edges = []) => {
  const schemas = {};

  const sanitizedNodes = nodes.map((node) => {
    const { data, ...rest } = node;
    if (!data) {
      return { ...rest };
    }

    const restData = { ...data };
    delete restData.onLabelChange;
    delete restData.onConfigChange;
    delete restData.onExecute;

    if (data.actionType === 'api') {
      const config = restData?.config || {};
      const contextKey = typeof config.contextKey === 'string' ? config.contextKey.trim() : '';
      if (contextKey) {
        const schemaDefinition = config.schema;

        // Heuristic: if schemaDefinition is an array -> it's a list schema.
        // If it's a plain object whose values are strings (field -> path),
        // treat it as an item schema for a list (common pattern in templates),
        // otherwise treat it as an object schema.
        let inferredType = 'object';
        if (Array.isArray(schemaDefinition)) {
          inferredType = 'list';
        } else if (schemaDefinition && typeof schemaDefinition === 'object') {
          const vals = Object.values(schemaDefinition);
          const looksLikeFieldMap = vals.length > 0 && vals.every((v) => typeof v === 'string');
          if (looksLikeFieldMap) {
            inferredType = 'list';
          } else {
            inferredType = 'object';
          }
        }

        schemas[contextKey] = {
          type: inferredType,
          schema: schemaDefinition,
          source: 'api',
          nodeId: node.id,
          endpoint: config.endpoint,
          description: restData.description || restData.label
        };
      }
    }

    let sanitizedData = restData;
    try {
      sanitizedData = JSON.parse(JSON.stringify(restData));
    } catch {
      sanitizedData = restData;
    }

    return {
      ...rest,
      data: sanitizedData
    };
  });

  let sanitizedEdges = edges;
  try {
    sanitizedEdges = JSON.parse(JSON.stringify(edges));
  } catch {
    sanitizedEdges = edges;
  }

  return {
    nodes: sanitizedNodes,
    edges: sanitizedEdges,
    variableSchemas: schemas
  };
};

const hydrateGraphNodes = (nodes = [], handlers = {}, fullGraphData = null) => {
  const { onLabelChange, onConfigChange, onExecute } = handlers;
  return nodes.map((node) => {
    const data = node.data ? { ...node.data } : {};

    if (data) {
      // Нормализация label: используем name если label не задан
      if (!data.label && data.name) {
        data.label = data.name;
      }
      
      if (typeof onLabelChange === 'function') {
        data.onLabelChange = onLabelChange;
      }
      if (data.actionType && typeof onConfigChange === 'function') {
        data.onConfigChange = onConfigChange;
      }
      if (data.actionType === 'api' && typeof onExecute === 'function') {
        data.onExecute = onExecute;
      }
      data.inputBindings = Array.isArray(data.inputBindings) ? data.inputBindings : [];
      data.outputBindings = Array.isArray(data.outputBindings) ? data.outputBindings : [];
      
      // Добавляем полные данные узла для отображения
      if (fullGraphData) {
        data.nodeData = {
          id: node.id,
          type: node.type,
          position: node.position,
          data: { ...data },
          // Удаляем функции из отображаемых данных
          ...(fullGraphData.initialContext && { initialContext: fullGraphData.initialContext }),
          ...(fullGraphData.variableSchemas && { variableSchemas: fullGraphData.variableSchemas })
        };
        
        // Очищаем функции из nodeData
        if (data.nodeData.data) {
          delete data.nodeData.data.onLabelChange;
          delete data.nodeData.data.onConfigChange;
          delete data.nodeData.data.onExecute;
        }
      }
    }

    return {
      ...node,
      data
    };
  });
};

const hydrateGraphEdges = (edges = []) => {
  return edges.map((edge) => {
    const data = edge.data ? { ...edge.data } : {};
    
    // Нормализация: используем name если label не задан
    const label = edge.label || data.name || data.trigger || 'Переход';
    
    // Устанавливаем тип edge
    const type = edge.type || 'custom';
    
    // Нормализация markerEnd
    let markerEnd = edge.markerEnd;
    if (markerEnd && typeof markerEnd.type === 'string') {
      const markerKey = markerEnd.type;
      markerEnd = {
        ...markerEnd,
        type: MarkerType[markerKey] || MarkerType.ArrowClosed
      };
    } else if (!markerEnd) {
      markerEnd = { type: MarkerType.ArrowClosed };
    }

    return {
      ...edge,
      type,
      label,
      markerEnd,
      data: {
        ...data,
        name: data.name || label,
        trigger: data.trigger || data.event || 'auto',
        type: data.type || 'default'
      }
    };
  });
};

const buildDefaultGraph = (handleNodeLabelChange, handleNodeConfigChange, handleNodeExecute) => {
  const templateNodes = Array.isArray(defaultGraphTemplate?.nodes)
    ? defaultGraphTemplate.nodes
    : [];
  const templateEdges = Array.isArray(defaultGraphTemplate?.edges)
    ? defaultGraphTemplate.edges
    : [];

  const generatedNodes = templateNodes.map((node) => {
    const clone = JSON.parse(JSON.stringify(node));
    clone.data = clone.data || {};
    clone.data.onLabelChange = handleNodeLabelChange;
    clone.data.onConfigChange = handleNodeConfigChange;
    if (clone.data.actionType === 'api') {
      clone.data.onExecute = handleNodeExecute;
    }
    return clone;
  });
  const generatedEdges = templateEdges.map((edge) => {
    const clone = JSON.parse(JSON.stringify(edge));
    if (clone.markerEnd && clone.markerEnd.type) {
      const markerKey = clone.markerEnd.type;
      clone.markerEnd = {
        ...clone.markerEnd,
        type: MarkerType[markerKey] || clone.markerEnd.type
      };
    }
    return clone;
  });

  return { nodes: generatedNodes, edges: generatedEdges };
};

// Custom Edge with Label
const CustomEdge = ({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, markerEnd, label, style, data, source, target }) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // Извлекаем информацию о переходе
  const transitionName = data?.name || label;
  const trigger = data?.trigger || data?.event || 'auto';
  const condition = data?.condition;
  const description = data?.description;
  const transitionType = data?.type || 'default';
  
  // Определяем стиль в зависимости от типа перехода
  const getEdgeStyle = () => {
    switch (transitionType) {
      case 'success':
        return { borderColor: '#10b981', backgroundColor: '#d1fae5', textColor: '#065f46' };
      case 'error':
        return { borderColor: '#ef4444', backgroundColor: '#fee2e2', textColor: '#991b1b' };
      case 'conditional':
        return { borderColor: '#f59e0b', backgroundColor: '#fef3c7', textColor: '#92400e' };
      case 'default':
      default:
        return { borderColor: '#3b82f6', backgroundColor: '#dbeafe', textColor: '#1e40af' };
    }
  };

  const edgeStyle = getEdgeStyle();
  const hasCondition = condition && typeof condition === 'string' && condition.trim();
  const hasDescription = description && typeof description === 'string' && description.trim();
  const displayLabel = transitionName || trigger;

  return (
    <>
      <BaseEdge 
        id={id} 
        path={edgePath} 
        markerEnd={markerEnd} 
        style={{ 
          ...style, 
          stroke: edgeStyle.borderColor, 
          strokeWidth: 2 
        }} 
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            background: 'white',
            padding: '8px 12px',
            borderRadius: '8px',
            fontSize: 12,
            fontWeight: 500,
            border: `2px solid ${edgeStyle.borderColor}`,
            color: '#1e293b',
            pointerEvents: 'all',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            maxWidth: '280px',
            minWidth: '120px',
          }}
          className="nodrag nopan edge-label-card"
        >
          {/* Название перехода */}
          <div style={{ 
            fontWeight: 700, 
            color: edgeStyle.textColor, 
            marginBottom: (hasCondition || hasDescription || trigger !== 'auto') ? '6px' : 0,
            fontSize: 13,
            letterSpacing: '0.3px'
          }}>
            {displayLabel}
          </div>

          {/* Триггер/событие */}
          {trigger && trigger !== 'auto' && trigger !== displayLabel && (
            <div style={{ 
              fontSize: 10, 
              color: '#64748b',
              marginBottom: (hasCondition || hasDescription) ? '4px' : 0,
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <span style={{ 
                background: edgeStyle.backgroundColor, 
                padding: '2px 6px', 
                borderRadius: '4px',
                fontWeight: 600,
                color: edgeStyle.textColor
              }}>
                {trigger}
              </span>
            </div>
          )}

          {/* Описание */}
          {hasDescription && (
            <div style={{ 
              fontSize: 11, 
              color: '#475569',
              marginBottom: hasCondition ? '4px' : 0,
              lineHeight: 1.4
            }}>
              {description.length > 60 ? `${description.slice(0, 60)}...` : description}
            </div>
          )}

          {/* Условие */}
          {hasCondition && (
            <div style={{ 
              fontSize: 10, 
              color: '#64748b',
              fontFamily: 'Menlo, Monaco, monospace',
              background: '#f1f5f9',
              padding: '4px 6px',
              borderRadius: '4px',
              marginTop: '4px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              border: '1px solid #e2e8f0'
            }}>
              <span style={{ color: '#94a3b8', fontWeight: 600 }}>if:</span> {condition.length > 50 ? `${condition.slice(0, 50)}...` : condition}
            </div>
          )}

          {/* Индикатор типа */}
          {transitionType !== 'default' && (
            <div style={{
              position: 'absolute',
              top: '-8px',
              right: '-8px',
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              background: edgeStyle.borderColor,
              border: '2px solid white',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
            }} />
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

// Custom Node Types
const ScreenNode = ({ data, id }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState(data.label);
  const [showData, setShowData] = useState(false);
  const statusLabel = data.status ? data.status.replace(/-/g, ' ') : null;
  const inputBindings = normalizeBindings(data.inputBindings);
  const outputBindings = normalizeBindings(data.outputBindings);
  const screenId = typeof data.screenId === 'string' && data.screenId.trim() ? data.screenId.trim() : id;

  console.log('[ScreenNode] Rendering:', { id, label: data.label, data, inputBindings, outputBindings });

  const handleSave = () => {
    data.onLabelChange(id, label);
    setIsEditing(false);
  };

  const renderDataPreview = () => {
    if (!data.nodeData) return null;
    
    return (
      <div className="node-data-preview">
        <div className="node-data-header" onClick={() => setShowData(!showData)}>
          <Database size={12} />
          <span>Данные</span>
          <span className="node-data-toggle">{showData ? '▼' : '▶'}</span>
        </div>
        {showData && (
          <div className="node-data-content">
            <pre>{JSON.stringify(data.nodeData, null, 2)}</pre>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="screen-node" style={{ minWidth: 300, minHeight: 200 }}>
      <div className="node-header">
        <Monitor size={16} />
        <span className="node-type">Screen</span>
        {statusLabel && (
          <span className={`node-status node-status--${data.status}`}>
            {statusLabel}
          </span>
        )}
      </div>
      <div className="node-content" style={{ minHeight: 150 }}>
        {isEditing ? (
          <div className="node-edit">
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onBlur={handleSave}
              onKeyPress={(e) => e.key === 'Enter' && handleSave()}
              autoFocus
            />
          </div>
        ) : (
          <div className="node-label" onDoubleClick={() => setIsEditing(true)}>
            {data.label || 'Unnamed Screen'}
          </div>
        )}
        <div className="node-meta">
          <div className="node-meta-row">
            <span className="node-meta-label">ID:</span>
            <span className="node-meta-value">{screenId}</span>
          </div>
          {data.description && (
            <div className="node-meta-row">
              <span className="node-meta-label">Описание:</span>
              <span className="node-meta-value">{data.description}</span>
            </div>
          )}
        </div>
        <BindingsSection title="Входные параметры" bindings={inputBindings} emptyMessage="Нет входных параметров" />
        <BindingsSection title="Выходные параметры" bindings={outputBindings} emptyMessage="Нет выходных параметров" />
        {(typeof data.components === 'number' || typeof data.actions === 'number') && (
          <div className="node-metrics">
            {typeof data.components === 'number' && (
              <span>{data.components} components</span>
            )}
            {typeof data.actions === 'number' && (
              <span>{data.actions} actions</span>
            )}
          </div>
        )}
        {renderDataPreview()}
      </div>
      <div className="node-handles">
        <Handle type="target" position={Position.Left} className="handle handle-input" />
        <Handle type="source" position={Position.Right} className="handle handle-output" />
      </div>
    </div>
  );
};

const ActionNode = ({ data, id }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showData, setShowData] = useState(false);
  const [schemaText, setSchemaText] = useState(
    data.config?.schema ? JSON.stringify(data.config.schema, null, 2) : ''
  );
  const [schemaError, setSchemaError] = useState(null);
  const inputBindings = normalizeBindings(data.inputBindings);
  const outputBindings = normalizeBindings(data.outputBindings);
  const stateId = typeof data.stateId === 'string' && data.stateId.trim() ? data.stateId.trim() : id;

  useEffect(() => {
    setSchemaText(data.config?.schema ? JSON.stringify(data.config.schema, null, 2) : '');
    setSchemaError(null);
  }, [data.config?.schema]);

  const onConfigChange = data.onConfigChange;
  const emitConfigChange = useCallback(
    (nextConfig) => {
      if (typeof onConfigChange === 'function') {
        onConfigChange(id, nextConfig);
      }
    },
    [onConfigChange, id]
  );

  const config = data.config || {};

  const getActionIcon = (actionType) => {
    switch (actionType) {
      case 'api': return Database;
      case 'condition': return GitBranch;
      case 'validation': return CheckCircle;
      default: return Activity;
    }
  };

  const ActionIcon = getActionIcon(data.actionType);

  const renderDataPreview = () => {
    if (!data.nodeData) return null;
    
    return (
      <div className="node-data-preview">
        <div className="node-data-header" onClick={() => setShowData(!showData)}>
          <Database size={12} />
          <span>Данные узла</span>
          <span className="node-data-toggle">{showData ? '▼' : '▶'}</span>
        </div>
        {showData && (
          <div className="node-data-content">
            <pre>{JSON.stringify(data.nodeData, null, 2)}</pre>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`action-node ${data.actionType}`} style={{ minWidth: 320, minHeight: 220 }}>
      <div className="node-header">
        <ActionIcon size={16} />
        <span className="node-type">{data.actionType}</span>
        <button 
          className="expand-btn"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? '−' : '+'}
        </button>
      </div>
      <div className="node-content" style={{ minHeight: 170 }}>
        <div className="node-label">{data.label || 'Unnamed Action'}</div>
        <div className="node-meta">
          <div className="node-meta-row">
            <span className="node-meta-label">ID:</span>
            <span className="node-meta-value">{stateId}</span>
          </div>
          {data.description && (
            <div className="node-meta-row">
              <span className="node-meta-label">Описание:</span>
              <span className="node-meta-value">{data.description}</span>
            </div>
          )}
        </div>
        <ConfigSummary actionType={data.actionType} config={config} />
        {renderDataPreview()}
        <BindingsSection title="Входные параметры" bindings={inputBindings} emptyMessage="Нет входных параметров" />
        <BindingsSection title="Выходные параметры" bindings={outputBindings} emptyMessage="Нет выходных параметров" />
        {isExpanded && (
          <div className="node-config">
            {data.actionType === 'api' && (
              <>
                <input
                  type="text"
                  placeholder="API Endpoint"
                  value={config.endpoint || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    const nextConfig = { ...config, endpoint: value };
                    emitConfigChange(nextConfig);
                  }}
                />
                <select
                  value={config.method || 'GET'}
                  onChange={(e) => {
                    const value = e.target.value;
                    const nextConfig = { ...config, method: value };
                    emitConfigChange(nextConfig);
                  }}
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                </select>
                <input
                  type="text"
                  placeholder="Context variable (e.g. gamesList)"
                  value={config.contextKey || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    const nextConfig = { ...config };
                    if (value.trim()) {
                      nextConfig.contextKey = value.trim();
                    } else {
                      delete nextConfig.contextKey;
                    }
                    emitConfigChange(nextConfig);
                  }}
                />
                <button
                  type="button"
                  className="api-node-refresh"
                  onClick={() => {
                    if (typeof data.onExecute === 'function') {
                      data.onExecute(id);
                    }
                  }}
                >
                  Обновить данные
                </button>
                <textarea
                  placeholder='Schema JSON (e.g. {"title":"title"})'
                  value={schemaText}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSchemaText(value);
                    try {
                      const trimmed = value.trim();
                      const parsed = trimmed ? JSON.parse(trimmed) : undefined;
                      const nextConfig = { ...config };
                      if (parsed === undefined) {
                        delete nextConfig.schema;
                      } else {
                        nextConfig.schema = parsed;
                      }
                      emitConfigChange(nextConfig);
                      setSchemaError(null);
                    } catch {
                      setSchemaError('Некорректный JSON для схемы');
                    }
                  }}
                  rows={4}
                />
                {schemaError && <p className="node-config-error">{schemaError}</p>}
              </>
            )}
            {data.actionType === 'condition' && (
              <textarea
                placeholder="Condition logic (e.g., {userId} !== null)"
                value={config.condition || ''}
                onChange={(e) => {
                  const nextConfig = { ...config, condition: e.target.value };
                  emitConfigChange(nextConfig);
                }}
                rows={2}
              />
            )}
            {data.actionType === 'validation' && (
              <>
                <input
                  type="text"
                  placeholder="Field to validate"
                  value={config.field || ''}
                  onChange={(e) => {
                    const nextConfig = { ...config, field: e.target.value };
                    emitConfigChange(nextConfig);
                  }}
                />
                <select
                  value={config.validationType || 'required'}
                  onChange={(e) => {
                    const nextConfig = { ...config, validationType: e.target.value };
                    emitConfigChange(nextConfig);
                  }}
                >
                  <option value="required">Required</option>
                  <option value="email">Email</option>
                  <option value="number">Number</option>
                  <option value="regex">Regex</option>
                </select>
              </>
            )}
          </div>
        )}
      </div>
      <div className="node-handles">
        <Handle type="target" position={Position.Left} className="handle handle-input" />
        <Handle type="source" position={Position.Right} className="handle handle-output" />
        {data.actionType === 'condition' && (
          <Handle type="source" id="false" position={Position.Bottom} className="handle handle-output handle-false" />
        )}
      </div>
    </div>
  );
};

// Integration Node (для API вызовов, внешних интеграций)
const IntegrationNode = ({ data, id }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const inputBindings = normalizeBindings(data.inputBindings);
  const outputBindings = normalizeBindings(data.outputBindings);
  const stateId = typeof data.stateId === 'string' && data.stateId.trim() ? data.stateId.trim() : id;

  return (
    <div className="action-node api" style={{ minWidth: 320, minHeight: 220 }}>
      <div className="node-header">
        <Activity size={16} />
        <span className="node-type">Integration</span>
        <button 
          className="expand-btn"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? '−' : '+'}
        </button>
      </div>
      <div className="node-content" style={{ minHeight: 170 }}>
        <div className="node-label">{data.label || data.name || 'Unnamed Integration'}</div>
        <div className="node-meta">
          <div className="node-meta-row">
            <span className="node-meta-label">ID:</span>
            <span className="node-meta-value">{stateId}</span>
          </div>
          {data.description && (
            <div className="node-meta-row">
              <span className="node-meta-label">Описание:</span>
              <span className="node-meta-value">{data.description}</span>
            </div>
          )}
        </div>
        <ConfigSummary actionType="api" config={data.config || {}} />
        <BindingsSection title="Входные параметры" bindings={inputBindings} emptyMessage="Нет входных параметров" />
        <BindingsSection title="Выходные параметры" bindings={outputBindings} emptyMessage="Нет выходных параметров" />
      </div>
      <div className="node-handles">
        <Handle type="target" position={Position.Left} className="handle handle-input" />
        <Handle type="source" position={Position.Right} className="handle handle-output" />
      </div>
    </div>
  );
};

// Technical Node (для технических операций, трансформаций данных)
const TechnicalNode = ({ data, id }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const inputBindings = normalizeBindings(data.inputBindings);
  const outputBindings = normalizeBindings(data.outputBindings);
  const stateId = typeof data.stateId === 'string' && data.stateId.trim() ? data.stateId.trim() : id;

  return (
    <div className="action-node condition" style={{ minWidth: 320, minHeight: 220 }}>
      <div className="node-header">
        <Activity size={16} />
        <span className="node-type">Technical</span>
        <button 
          className="expand-btn"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? '−' : '+'}
        </button>
      </div>
      <div className="node-content" style={{ minHeight: 170 }}>
        <div className="node-label">{data.label || data.name || 'Unnamed Technical'}</div>
        <div className="node-meta">
          <div className="node-meta-row">
            <span className="node-meta-label">ID:</span>
            <span className="node-meta-value">{stateId}</span>
          </div>
          {data.description && (
            <div className="node-meta-row">
              <span className="node-meta-label">Описание:</span>
              <span className="node-meta-value">{data.description}</span>
            </div>
          )}
        </div>
        <BindingsSection title="Входные параметры" bindings={inputBindings} emptyMessage="Нет входных параметров" />
        <BindingsSection title="Выходные параметры" bindings={outputBindings} emptyMessage="Нет выходных параметров" />
      </div>
      <div className="node-handles">
        <Handle type="target" position={Position.Left} className="handle handle-input" />
        <Handle type="source" position={Position.Right} className="handle handle-output" />
      </div>
    </div>
  );
};

// Final Node (для конечных состояний)
const FinalNode = ({ data, id }) => {
  const inputBindings = normalizeBindings(data.inputBindings);
  const stateId = typeof data.stateId === 'string' && data.stateId.trim() ? data.stateId.trim() : id;

  return (
    <div className="action-node validation" style={{ minWidth: 280, minHeight: 180 }}>
      <div className="node-header">
        <CheckCircle size={16} />
        <span className="node-type">Final</span>
      </div>
      <div className="node-content" style={{ minHeight: 130 }}>
        <div className="node-label">{data.label || data.name || 'Final State'}</div>
        <div className="node-meta">
          <div className="node-meta-row">
            <span className="node-meta-label">ID:</span>
            <span className="node-meta-value">{stateId}</span>
          </div>
          {data.description && (
            <div className="node-meta-row">
              <span className="node-meta-label">Описание:</span>
              <span className="node-meta-value">{data.description}</span>
            </div>
          )}
        </div>
        <BindingsSection title="Входные параметры" bindings={inputBindings} emptyMessage="Нет входных параметров" />
      </div>
      <div className="node-handles">
        <Handle type="target" position={Position.Left} className="handle handle-input" />
      </div>
    </div>
  );
};

const VariableCard = ({ name, variable }) => (
  <>
    <span className="variable-name">{name}</span>
    <span className="variable-type">{variable?.type || 'string'}</span>
    <span className="variable-source">{variable?.source || 'manual'}</span>
  </>
);

const SortableVariableItem = ({ name, variable }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: name,
    data: {
      type: 'variable',
      variableName: name
    }
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`variable-item${isDragging ? ' variable-item--dragging' : ''}`}
      {...attributes}
      {...listeners}
    >
      <VariableCard name={name} variable={variable} />
    </div>
  );
};

const VariableDragOverlay = ({ name, variable }) => (
  <div className="variable-item variable-item--overlay">
    <VariableCard name={name} variable={variable} />
  </div>
);

const BindingVariableDropZone = ({ nodeId, bindingType, bindingId, children, domRefCallback }) => {
  const { isOver, setNodeRef } = useDroppable({
    id: `binding-${nodeId}-${bindingType}-${bindingId}`,
    data: {
      type: 'binding',
      nodeId,
      bindingType,
      bindingId
    }
  });

  const handleRef = useCallback((node) => {
    setNodeRef(node);
    if (domRefCallback) {
      domRefCallback(node);
    }
  }, [domRefCallback, setNodeRef]);

  return (
    <div
      ref={handleRef}
      className={`binding-variable${isOver ? ' binding-variable--over' : ''}`}
    >
      {children}
    </div>
  );
};

const NODE_DIMENSIONS = {
  screen: { width: 320, height: 400 },
  action: { width: 340, height: 450 },
  integration: { width: 340, height: 400 },
  technical: { width: 320, height: 380 },
  final: { width: 300, height: 300 },
  default: { width: 320, height: 400 }
};

const getNodeDimensions = (node) => NODE_DIMENSIONS[node.type] || NODE_DIMENSIONS.default;

const deriveSchemaType = (schemaMeta) => {
  if (!schemaMeta) {
    return 'string';
  }

  if (typeof schemaMeta.type === 'string' && schemaMeta.type.trim()) {
    return schemaMeta.type.trim();
  }

  if (Array.isArray(schemaMeta.schema)) {
    return 'list';
  }

  if (schemaMeta.schema && typeof schemaMeta.schema === 'object') {
    return 'object';
  }

  return 'string';
};

const defaultValueForSchemaType = (type) => {
  switch (type) {
    case 'list':
      return [];
    case 'object':
      return {};
    case 'number':
      return 0;
    case 'boolean':
      return false;
    default:
      return '';
  }
};

const valuesEqual = (a, b) => {
  if (a === b) {
    return true;
  }

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return false;
    }
    return a.every((item, index) => valuesEqual(item, b[index]));
  }

  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) {
      return false;
    }
    return keysA.every((key) => valuesEqual(a[key], b[key]));
  }

  return false;
};

const isPlainObject = (value) => (
  value !== null
  && typeof value === 'object'
  && !Array.isArray(value)
);

const getLayoutedElements = (nodes = [], edges = []) => {
  const graph = new dagre.graphlib.Graph();
  graph.setGraph({ rankdir: 'LR', nodesep: 120, ranksep: 160, marginx: 24, marginy: 24 });
  graph.setDefaultEdgeLabel(() => ({}));

  nodes.forEach((node) => {
    const { width, height } = getNodeDimensions(node);
    graph.setNode(node.id, { width, height });
  });

  edges.forEach((edge) => {
    graph.setEdge(edge.source, edge.target);
  });

  dagre.layout(graph);

  const layoutedNodes = nodes.map((node) => {
    const layoutNode = graph.node(node.id);
    if (!layoutNode) {
      return node;
    }

    const dimensions = getNodeDimensions(node);
    return {
      ...node,
      position: {
        x: layoutNode.x - dimensions.width / 2,
        y: layoutNode.y - dimensions.height / 2
      },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      dragging: false
    };
  });

  return {
    nodes: layoutedNodes,
    edges
  };
};

// Node Types Configuration
const nodeTypes = {
  screen: memo(ScreenNode),
  action: memo(ActionNode),
  integration: memo(IntegrationNode),
  technical: memo(TechnicalNode),
  final: memo(FinalNode),
};

console.log('[NodeTypes] Registered:', Object.keys(nodeTypes));

// Edge Types Configuration  
const edgeTypes = {
  custom: CustomEdge,
};

const ScreenEditor = () => {
  const { productId, screenId } = useParams();
  const navigate = useNavigate();
  
  // Workflow API hook
  const workflowApi = useWorkflowApi();

  console.log('[DEBUG] ScreenEditor render start, screenId=', screenId);

  const {
    variables,
    variablesOrder,
    setVariable,
    deleteVariable,
    reorderVariables,
    variableSchemas,
    setVariableSchemas,
    setGraphData,
    graphData,
    screens,
    setScreens,
    addScreen,
    updateScreen,
    deleteScreen,
    currentScreen,
    setCurrentScreen,
    updateApiEndpointForNode,
    setProduct
  } = useVirtualContext();

  const variablesRef = useRef(variables);
  useEffect(() => {
    variablesRef.current = variables;
  }, [variables]);

  // Флаг для отслеживания состояния загрузки продукта
  const [isProductLoading, setIsProductLoading] = useState(false);
  const productLoadAttemptedRef = useRef(false);

  // Auto-load product on mount/reload if context is empty
  useEffect(() => {
    // Skip demo products
    if (!productId || productId === 'avito-cart-demo' || productId === 'avito-cart-demo-subflow') {
      productLoadAttemptedRef.current = true;
      return;
    }

    // Skip if data already loaded
    if (graphData?.nodes?.length > 0) {
      productLoadAttemptedRef.current = true;
      return;
    }

    // Skip if already attempted to load
    if (productLoadAttemptedRef.current) {
      return;
    }

    const controller = new AbortController();
    let isMounted = true;

    const loadProduct = async () => {
      try {
        setIsProductLoading(true);
        console.log(`[ScreenEditor] Auto-loading product ${productId} due to empty context`);
        const product = await getProductByIdApi(productId, {
          signal: controller.signal,
          parseWorkflow: true
        });

        if (!isMounted) return;

        // Set product in context
        setProduct(product);

        if (product?.workflow) {
          const workflow = product.workflow;

          // Normalize nodes to ensure valid position field (fixes React Flow crash)
          const normalizedNodes = (workflow.nodes || []).map((node, index) => ({
            ...node,
            position: node.position && typeof node.position.x === 'number' && typeof node.position.y === 'number'
              ? node.position
              : {
                  x: 100 + (index % 5) * 200,
                  y: 100 + Math.floor(index / 5) * 150
                }
          }));

          // Preserve all workflow metadata
          const normalizedWorkflow = {
            ...workflow,
            nodes: normalizedNodes,
            // Ensure essential fields exist
            id: workflow.id || workflow.workflow_id || product.workflowId,
            workflow_id: workflow.workflow_id || workflow.id || product.workflowId,
            name: workflow.name || product.name || 'Workflow',
            version: workflow.version || '1.0.0',
            edges: workflow.edges || [],
            screens: workflow.screens || {},
            initialContext: workflow.initialContext || {}
          };

          console.log('[ScreenEditor] Setting graphData with metadata:', {
            id: normalizedWorkflow.id,
            workflow_id: normalizedWorkflow.workflow_id,
            name: normalizedWorkflow.name,
            version: normalizedWorkflow.version,
            nodesCount: normalizedWorkflow.nodes.length,
            edgesCount: normalizedWorkflow.edges.length,
            screensCount: Object.keys(normalizedWorkflow.screens).length
          });

          setGraphData(normalizedWorkflow);

          if (workflow.variableSchemas) {
            setVariableSchemas(workflow.variableSchemas);
          }
        }
        
        productLoadAttemptedRef.current = true;
      } catch (error) {
        if (error.name === 'AbortError') return;
        console.error('[ScreenEditor] Failed to auto-load product:', error);
        productLoadAttemptedRef.current = true;
      } finally {
        if (isMounted) {
          setIsProductLoading(false);
        }
      }
    };

    loadProduct();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [productId, graphData?.nodes?.length, setGraphData, setVariableSchemas, setProduct]);

  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [, setIsValidationMode] = useState(false);
  const [, setValidationErrors] = useState([]);
  const [isSavingFlow, setIsSavingFlow] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(null);
  const [activeVariableId, setActiveVariableId] = useState(null);
  const [nodePendingDeletion, setNodePendingDeletion] = useState(null);
  const [activeTab, setActiveTab] = useState('editor'); // 'editor' или 'data'

  const bindingDropZoneRefs = useRef(new Map());
  const suggestionHideTimeoutRef = useRef(null);
  const apiRefetchTimersRef = useRef(new Map());
  const labelChangeRef = useRef(null);
  const configChangeRef = useRef(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }
    })
  );

  const synchronizeVariablesWithSchemas = useCallback((schemasMap = {}) => {
    Object.entries(schemasMap).forEach(([name, schemaMeta]) => {
      const schemaType = deriveSchemaType(schemaMeta);
      const existing = variablesRef.current?.[name];
      const desiredValue = existing && existing.value !== undefined ? existing.value : defaultValueForSchemaType(schemaType);
      const desiredSource = existing?.source || schemaMeta?.source || 'api';
      const desiredDescription = existing?.description || schemaMeta?.description || '';

      const typeChanged = !existing || existing.type !== schemaType;
      const sourceChanged = !existing || existing.source !== desiredSource;
      const descriptionChanged = !existing || existing.description !== desiredDescription;
      const valueChanged = !existing || !valuesEqual(existing.value, desiredValue);

      if (typeChanged || sourceChanged || descriptionChanged || valueChanged) {
        setVariable(name, desiredValue, schemaType, desiredSource, desiredDescription);
      }
    });
  }, [setVariable]);

  const getBindingKey = useCallback((nodeId, bindingType, bindingId) => (
    `${nodeId}:${bindingType}:${bindingId}`
  ), []);

  const setBindingDropZoneRef = useCallback((key, node) => {
    if (!key) {
      return;
    }

    if (!node) {
      bindingDropZoneRefs.current.delete(key);
      return;
    }

    bindingDropZoneRefs.current.set(key, node);
  }, []);

  const computeSuggestionPlacement = useCallback((key) => {
    if (typeof window === 'undefined') {
      return 'down';
    }

    const node = bindingDropZoneRefs.current.get(key);
    if (!node) {
      return 'down';
    }

    const rect = node.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;

    if (spaceBelow < 200 && spaceAbove > spaceBelow) {
      return 'up';
    }

    return 'down';
  }, []);

  const openSuggestions = useCallback((key) => {
    if (suggestionHideTimeoutRef.current) {
      clearTimeout(suggestionHideTimeoutRef.current);
      suggestionHideTimeoutRef.current = null;
    }
    if (!key) {
      setActiveSuggestion(null);
      return;
    }
    const placement = computeSuggestionPlacement(key);
    setActiveSuggestion({ key, placement });
  }, [computeSuggestionPlacement]);

  const scheduleCloseSuggestions = useCallback(() => {
    if (suggestionHideTimeoutRef.current) {
      clearTimeout(suggestionHideTimeoutRef.current);
    }
    suggestionHideTimeoutRef.current = setTimeout(() => {
      setActiveSuggestion(null);
      suggestionHideTimeoutRef.current = null;
    }, 120);
  }, []);

  const closeSuggestionsImmediately = useCallback(() => {
    if (suggestionHideTimeoutRef.current) {
      clearTimeout(suggestionHideTimeoutRef.current);
      suggestionHideTimeoutRef.current = null;
    }
    setActiveSuggestion(null);
  }, []);

  useEffect(() => () => {
    apiRefetchTimersRef.current.forEach((timer) => {
      if (timer) {
        clearTimeout(timer);
      }
    });
    apiRefetchTimersRef.current.clear();
  }, []);

  const refreshApiNodeData = useCallback(async (nodeId, nextConfig = {}) => {
    if (!nextConfig || typeof nextConfig !== 'object') {
      return;
    }

    const endpoint = typeof nextConfig.endpoint === 'string'
      ? nextConfig.endpoint.trim()
      : '';
    const contextKey = typeof nextConfig.contextKey === 'string'
      ? nextConfig.contextKey.trim()
      : '';
    const method = (nextConfig.method || 'GET').toUpperCase();

    if (!endpoint) {
      toast.error('Укажите endpoint для API узла');
      return;
    }

    if (!contextKey) {
      toast.error('Укажите ключ контекста для API узла');
      return;
    }

    const headers = nextConfig && typeof nextConfig.headers === 'object' && !Array.isArray(nextConfig.headers)
      ? { ...nextConfig.headers }
      : undefined;

    let body = nextConfig?.body;
    const requestInit = { method };
    if (headers) {
      requestInit.headers = headers;
    }

    if (method !== 'GET' && body !== undefined) {
      if (body instanceof FormData) {
        requestInit.body = body;
      } else if (typeof body === 'object') {
        requestInit.body = JSON.stringify(body);
        if (!requestInit.headers || (!requestInit.headers['Content-Type'] && !requestInit.headers['content-type'])) {
          requestInit.headers = {
            ...(requestInit.headers || {}),
            'Content-Type': 'application/json'
          };
        }
      } else if (typeof body === 'string') {
        const trimmedBody = body.trim();
        if (trimmedBody.length > 0) {
          requestInit.body = trimmedBody;
        }
      }
    }

    const resolvedEndpoint = endpoint.startsWith('https://cors-anywhere.herokuapp.com/')
      || endpoint.startsWith('http://cors-anywhere.herokuapp.com/')
      ? endpoint
      : `https://cors-anywhere.herokuapp.com/${endpoint}`;

    const toastId = toast.loading('Загружаем данные из API…');
    try {
      const response = await fetch(resolvedEndpoint, requestInit);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      const payload = await response.json();
      const dataType = Array.isArray(payload)
        ? 'list'
        : payload !== null && typeof payload === 'object'
          ? 'object'
          : 'string';

      setVariable(contextKey, payload, dataType, 'action', `Loaded by API node ${nodeId}`);
      toast.success(`Данные обновлены (${contextKey})`, { id: toastId });
    } catch (error) {
      console.error('Failed to fetch API data for node', nodeId, error);
      toast.error('Не удалось загрузить данные API', { id: toastId });
    }
  }, [setVariable]);

  const scheduleApiRefresh = useCallback((nodeId, nextConfig) => {
    if (!nodeId) {
      return;
    }

    const endpoint = typeof nextConfig?.endpoint === 'string' ? nextConfig.endpoint.trim() : '';
    const contextKey = typeof nextConfig?.contextKey === 'string' ? nextConfig.contextKey.trim() : '';

    if (!endpoint || !contextKey) {
      return;
    }

    const existingTimer = apiRefetchTimersRef.current.get(nodeId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timerId = setTimeout(() => {
      apiRefetchTimersRef.current.delete(nodeId);
      refreshApiNodeData(nodeId, nextConfig);
    }, 600);

    apiRefetchTimersRef.current.set(nodeId, timerId);
  }, [refreshApiNodeData]);

  const handleNodeExecute = useCallback((nodeId) => {
    if (!nodeId) {
      return;
    }

    const existingTimer = apiRefetchTimersRef.current.get(nodeId);
    if (existingTimer) {
      clearTimeout(existingTimer);
      apiRefetchTimersRef.current.delete(nodeId);
    }

    const targetNode = nodes.find((node) => node.id === nodeId);
    if (!targetNode || targetNode.data?.actionType !== 'api') {
      toast.error('Выберите API-узел для обновления данных');
      return;
    }

    const currentConfig = targetNode.data?.config || {};
    refreshApiNodeData(nodeId, currentConfig);
  }, [nodes, refreshApiNodeData]);

  // History for undo/redo (must be defined before callbacks using saveToHistory)
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const reactFlowWrapper = useRef(null);
  const bodySelectionLockRef = useRef({
    applied: false,
    userSelect: '',
    webkitUserSelect: '',
    msUserSelect: ''
  });
  const selectPreventHandlerRef = useRef(null);
  // Removed hasSeededScreensRef as it's no longer needed

  const disableBodySelection = useCallback(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const { body } = document;
    if (!body || bodySelectionLockRef.current.applied) {
      return;
    }

    bodySelectionLockRef.current = {
      applied: true,
      userSelect: body.style.userSelect,
      webkitUserSelect: body.style.webkitUserSelect,
      msUserSelect: body.style.msUserSelect
    };

    body.style.userSelect = 'none';
    body.style.webkitUserSelect = 'none';
    body.style.msUserSelect = 'none';

    if (!selectPreventHandlerRef.current) {
      const handler = (event) => {
        event.preventDefault();
      };
      selectPreventHandlerRef.current = handler;
      document.addEventListener('selectstart', handler, { passive: false });
    }

    const selection = window.getSelection?.();
    if (selection?.rangeCount) {
      selection.removeAllRanges();
    }
  }, []);

  const restoreBodySelection = useCallback(() => {
    if (typeof document === 'undefined') {
      return;
    }

    const { body } = document;
    if (!body || !bodySelectionLockRef.current.applied) {
      return;
    }

    body.style.userSelect = bodySelectionLockRef.current.userSelect;
    body.style.webkitUserSelect = bodySelectionLockRef.current.webkitUserSelect;
    body.style.msUserSelect = bodySelectionLockRef.current.msUserSelect;

    if (selectPreventHandlerRef.current) {
      document.removeEventListener('selectstart', selectPreventHandlerRef.current);
      selectPreventHandlerRef.current = null;
    }

    bodySelectionLockRef.current = {
      applied: false,
      userSelect: '',
      webkitUserSelect: '',
      msUserSelect: ''
    };
  }, []);

  const saveToHistory = useCallback((currentNodes, currentEdges) => {
    const newState = { nodes: currentNodes, edges: currentEdges };
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newState);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  const onNodesChange = useCallback((changes) => {
    setNodes((nds) => {
      const updatedNodes = applyNodeChanges(changes, nds);
      saveToHistory(updatedNodes, edges);
      return updatedNodes;
    });
  }, [edges, saveToHistory]);

  const onEdgesChange = useCallback((changes) => {
    setEdges((eds) => {
      const updatedEdges = applyEdgeChanges(changes, eds);
      saveToHistory(nodes, updatedEdges);
      return updatedEdges;
    });
  }, [nodes, saveToHistory]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      setNodes(prevState.nodes);
      setEdges(prevState.edges);
      setHistoryIndex(historyIndex - 1);
    }
  }, [history, historyIndex, setNodes, setEdges]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setNodes(nextState.nodes);
      setEdges(nextState.edges);
      setHistoryIndex(historyIndex + 1);
    }
  }, [history, historyIndex, setNodes, setEdges]);

  const applyAutoLayout = useCallback((nodesToLayout, edgesToLayout, { saveToHistory: shouldSaveHistory = true } = {}) => {
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(nodesToLayout, edgesToLayout);
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
    if (shouldSaveHistory) {
      saveToHistory(layoutedNodes, layoutedEdges);
    }
    return { layoutedNodes, layoutedEdges };
  }, [saveToHistory, setEdges, setNodes]);

  const variablesList = useMemo(() => {
    const variableNames = Object.keys(variables || {});
    if (!variablesOrder || variablesOrder.length === 0) {
      return variableNames;
    }

    const ordered = variablesOrder.filter((name) => variableNames.includes(name));
    const missing = variableNames.filter((name) => !ordered.includes(name));
    return [...ordered, ...missing];
  }, [variables, variablesOrder]);

  const screenMetadataLookup = useMemo(() => {
    const byId = new Map();
    const byName = new Map();

    if (Array.isArray(screens)) {
      screens.forEach((screen) => {
        if (!screen || !screen.id) {
          return;
        }

        byId.set(screen.id, screen);

        const normalisedName = typeof screen.name === 'string'
          ? screen.name.trim().toLowerCase()
          : '';

        if (normalisedName) {
          byName.set(normalisedName, screen);
        }
      });
    }

    return { byId, byName };
  }, [screens]);

  const createEmptyBinding = useCallback(() => ({
    id: `binding-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: '',
    variable: ''
  }), []);

  const updateNodeBindings = useCallback((nodeId, bindingType, updater) => {
    const key = bindingType === 'input' ? 'inputBindings' : 'outputBindings';

    setNodes((nds) => {
      let hasChanged = false;
      let updatedSelectedNode = null;

      const updatedNodes = nds.map((node) => {
        if (node.id !== nodeId) {
          return node;
        }

        const currentBindings = node.data?.[key] || [];
        const nextBindings = updater(currentBindings);

        if (nextBindings === currentBindings) {
          return node;
        }

        hasChanged = true;
        const updatedNode = {
          ...node,
          data: {
            ...node.data,
            [key]: nextBindings
          }
        };

        if (selectedNode?.id === nodeId) {
          updatedSelectedNode = updatedNode;
        }

        return updatedNode;
      });

      if (hasChanged) {
        if (updatedSelectedNode) {
          setSelectedNode(updatedSelectedNode);
        }
        saveToHistory(updatedNodes, edges);
        return updatedNodes;
      }

      return nds;
    });
  }, [edges, saveToHistory, selectedNode, setNodes, setSelectedNode]);

  const addBinding = useCallback((nodeId, bindingType) => {
    updateNodeBindings(nodeId, bindingType, (bindings) => [
      ...bindings,
      createEmptyBinding()
    ]);
  }, [createEmptyBinding, updateNodeBindings]);

  const removeBinding = useCallback((nodeId, bindingType, bindingId) => {
    updateNodeBindings(nodeId, bindingType, (bindings) =>
      bindings.filter((binding) => binding.id !== bindingId)
    );
  }, [updateNodeBindings]);

  const updateBindingField = useCallback((nodeId, bindingType, bindingId, field, value) => {
    updateNodeBindings(nodeId, bindingType, (bindings) =>
      bindings.map((binding) =>
        binding.id === bindingId ? { ...binding, [field]: value } : binding
      )
    );
  }, [updateNodeBindings]);

  const handleCreateVariable = useCallback((variableName) => {
    const trimmed = variableName.trim();
    if (!trimmed) {
      toast.error('Введите имя переменной');
      return;
    }

    // Use variablesRef to avoid capturing the variables object in the callback deps
    if (variablesRef.current && variablesRef.current[trimmed]) {
      toast.success(`Переменная "${trimmed}" уже существует`);
      return;
    }

    setVariable(trimmed, '', 'string', 'binding');
    closeSuggestionsImmediately();
    toast.success(`Переменная "${trimmed}" создана`);
  }, [closeSuggestionsImmediately, setVariable]);

  useEffect(() => () => restoreBodySelection(), [restoreBodySelection]);

  useEffect(() => () => {
    if (suggestionHideTimeoutRef.current) {
      clearTimeout(suggestionHideTimeoutRef.current);
    }
    closeSuggestionsImmediately();
  }, [closeSuggestionsImmediately]);

  const handleDragStart = useCallback((event) => {
    disableBodySelection();

    const variableName = event.active?.data?.current?.variableName;
    if (event.active?.data?.current?.type === 'variable' && variableName) {
      setActiveVariableId(variableName);
    }
  }, [disableBodySelection]);

  const handleDragCancel = useCallback(() => {
    restoreBodySelection();
    closeSuggestionsImmediately();
    setActiveVariableId(null);
  }, [closeSuggestionsImmediately, restoreBodySelection]);

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;
    restoreBodySelection();
    closeSuggestionsImmediately();
    setActiveVariableId(null);

    if (!over || active?.data?.current?.type !== 'variable') {
      return;
    }

    const variableName = active.data.current.variableName;
    const overData = over.data?.current;

    if (overData?.type === 'binding') {
      updateBindingField(
        overData.nodeId,
        overData.bindingType,
        overData.bindingId,
        'variable',
        variableName
      );
      toast.success(`Переменная "${variableName}" назначена`);
      return;
    }

    if (overData?.type === 'variable') {
      const oldIndex = variablesList.indexOf(active.id);
      const newIndex = variablesList.indexOf(over.id);

      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const newOrder = arrayMove(variablesList, oldIndex, newIndex);
        reorderVariables(newOrder);
      }
    }
  }, [closeSuggestionsImmediately, reorderVariables, restoreBodySelection, updateBindingField, variablesList]);

  const handleBindingInputFocus = useCallback((key) => {
    openSuggestions(key);
  }, [openSuggestions]);

  const handleBindingInputBlur = useCallback(() => {
    scheduleCloseSuggestions();
  }, [scheduleCloseSuggestions]);

  const handleSuggestionSelect = useCallback((nodeId, bindingType, bindingId, variableName) => {
    updateBindingField(nodeId, bindingType, bindingId, 'variable', variableName);
    closeSuggestionsImmediately();
  }, [closeSuggestionsImmediately, updateBindingField]);

  const handleRequestDeleteNode = useCallback(() => {
    if (!selectedNode) {
      return;
    }
    setNodePendingDeletion(selectedNode);
  }, [selectedNode]);

  const handleCancelDeleteNode = useCallback(() => {
    setNodePendingDeletion(null);
  }, []);

  const handleConfirmDeleteNode = useCallback(() => {
    if (!nodePendingDeletion) {
      return;
    }

    const nodeId = nodePendingDeletion.id;
    const nodeType = nodePendingDeletion.type;
    const filteredNodes = nodes.filter((node) => node.id !== nodeId);
    const filteredEdges = edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId);

    const { layoutedNodes, layoutedEdges } = applyAutoLayout(filteredNodes, filteredEdges);

    // FIXED: Remove screen from context if it's a screen node
    if (nodeType === 'screen') {
      const screenId = nodePendingDeletion.data?.screenId || nodeId;
      // Set flag to prevent circular updates
      isUpdatingScreensRef.current = true;
      console.log('[DEBUG] handleConfirmDeleteNode -> deleteScreen', screenId);
      deleteScreen(screenId);
    }

    if (selectedNode?.id === nodeId) {
      setSelectedNode(null);
    } else if (selectedNode) {
      const updatedSelectedNode = layoutedNodes.find((node) => node.id === selectedNode.id) || null;
      setSelectedNode(updatedSelectedNode);
    }

    if (selectedEdge && (selectedEdge.source === nodeId || selectedEdge.target === nodeId)) {
      setSelectedEdge(null);
    } else if (selectedEdge) {
      const updatedSelectedEdge = layoutedEdges.find((edge) => edge.id === selectedEdge.id) || null;
      setSelectedEdge(updatedSelectedEdge);
    }

    bindingDropZoneRefs.current.clear();
    closeSuggestionsImmediately();
    setNodePendingDeletion(null);
    toast.success('Состояние удалено');
  }, [applyAutoLayout, closeSuggestionsImmediately, deleteScreen, edges, nodePendingDeletion, nodes, selectedEdge, selectedNode, setSelectedEdge, setSelectedNode]);

  // Синхронизация nodes и screens теперь только вручную через обработчики событий

  // Previously automatic seeding of `screens` from `nodes` was removed to avoid
  // cyclic updates. Screens should be managed explicitly via handlers like
  // addScreen/updateScreen/deleteScreen.

  const resolvedScreenContext = useMemo(() => {
    if (!selectedNode || selectedNode.type !== 'screen') {
      return null;
    }

    const screenId = selectedNode.data?.screenId || selectedNode.id;
    const label = typeof selectedNode.data?.label === 'string'
      ? selectedNode.data.label.trim()
      : '';

    const byId = screenMetadataLookup.byId.get(screenId);
    if (byId) {
      return byId;
    }

    if (label) {
      const byName = screenMetadataLookup.byName.get(label.toLowerCase());
      if (byName) {
        return byName;
      }
    }

    return null;
  }, [screenMetadataLookup, selectedNode]);

  const handleOpenScreenBuilder = useCallback(() => {
    if (!selectedNode || selectedNode.type !== 'screen') {
      return;
    }

    const screenData = resolvedScreenContext || {
      id: selectedNode.id,
      name: (selectedNode.data?.label || '').trim() || 'Новый экран',
      type: 'screen',
    };

    setCurrentScreen(screenData);

    navigate(`/products/${productId}/screens/${encodeURIComponent(screenData.id)}/builder`);
  }, [navigate, productId, resolvedScreenContext, selectedNode, setCurrentScreen]);

  const selectedNodeInputBindings = selectedNode?.data?.inputBindings ?? [];
  const selectedNodeOutputBindings = selectedNode?.data?.outputBindings ?? [];

  // Node Management
  const handleNodeLabelChange = useCallback((nodeId, newLabel) => {
    if (!nodeId) {
      return;
    }

    const trimmedLabel = typeof newLabel === 'string' ? newLabel.trim() : '';
    let screenUpdatePayload = null;
    let updatedSelectedNode = null;

    setNodes((nds) => {
      let hasChanges = false;

      const updatedNodes = nds.map((node) => {
        if (node.id !== nodeId) {
          return node;
        }

        const nextData = {
          ...node.data,
          label: trimmedLabel || node.data?.label || ''
        };

        if (node.type === 'screen') {
          const resolvedScreenId = node.data?.screenId || nodeId;
          nextData.screenId = resolvedScreenId;
          nextData.screenType = node.data?.screenType || 'screen';
          nextData.status = node.data?.status || 'draft';
          nextData.description = node.data?.description || '';
          nextData.components = node.data?.components ?? 0;
          nextData.actions = node.data?.actions ?? 0;
          nextData.order = node.data?.order;

          screenUpdatePayload = {
            id: resolvedScreenId,
            name: trimmedLabel || node.data?.label || 'Screen',
            type: nextData.screenType,
            description: nextData.description,
            status: nextData.status,
            components: nextData.components,
            actions: nextData.actions,
            order: nextData.order
          };
        }

        if (JSON.stringify(node.data) === JSON.stringify(nextData)) {
          return node;
        }

        hasChanges = true;
        const updatedNode = {
          ...node,
          data: nextData
        };

        if (selectedNode?.id === nodeId) {
          updatedSelectedNode = updatedNode;
        }

        return updatedNode;
      });

      if (!hasChanges) {
        screenUpdatePayload = null;
        return nds;
      }

      if (updatedSelectedNode) {
        setSelectedNode(updatedSelectedNode);
      }

      console.log('[DEBUG] handleNodeLabelChange -> nodes updated for', nodeId, 'label:', trimmedLabel);

      saveToHistory(updatedNodes, edges);
      return updatedNodes;
    });

    if (screenUpdatePayload) {
      // Set flag to prevent circular updates
      isUpdatingScreensRef.current = true;
      console.log('[DEBUG] handleNodeLabelChange -> updating screens for', screenUpdatePayload.id);
      const existing = screenMetadataLookup.byId.get(screenUpdatePayload.id)
        || screenMetadataLookup.byName.get(screenUpdatePayload.name.toLowerCase());

      if (existing) {
        updateScreen(screenUpdatePayload.id, {
          name: screenUpdatePayload.name,
          description: screenUpdatePayload.description,
          status: screenUpdatePayload.status,
          components: screenUpdatePayload.components,
          actions: screenUpdatePayload.actions,
          type: screenUpdatePayload.type,
          order: screenUpdatePayload.order
        });
      } else {
        addScreen(screenUpdatePayload);
      }
    }
  }, [addScreen, edges, saveToHistory, screenMetadataLookup, selectedNode, setSelectedNode, setNodes, updateScreen]);

  const handleNodeConfigChange = useCallback((nodeId, nextConfig) => {
    let pendingApiUpdate = null;

    setNodes((nds) => {
      let updatedNodeRef = null;
      const updatedNodes = nds.map((node) => {
        if (node.id !== nodeId) {
          return node;
        }

        const previousKey = typeof node.data?.config?.contextKey === 'string'
          ? node.data.config.contextKey.trim()
          : '';
        const nextKey = typeof nextConfig?.contextKey === 'string'
          ? nextConfig.contextKey.trim()
          : '';

        if (previousKey && previousKey !== nextKey && typeof deleteVariable === 'function') {
          deleteVariable(previousKey);
        }
        const updatedNode = {
          ...node,
          data: {
            ...node.data,
            config: nextConfig,
            onConfigChange: handleNodeConfigChange,
            onExecute: handleNodeExecute
          }
        };
        updatedNodeRef = updatedNode;

        // Если изменился endpoint, синхронизируем с VirtualContext
        if (node.data?.actionType === 'api' && node.data?.config?.endpoint !== nextConfig?.endpoint) {
          updateApiEndpointForNode(nodeId, nextConfig?.endpoint);
        }

        if (node.data?.actionType === 'api') {
          pendingApiUpdate = {
            nodeId,
            nextConfig
          };
        }

        return updatedNode;
      });

      if (updatedNodeRef && selectedNode?.id === nodeId) {
        setSelectedNode(updatedNodeRef);
      }

      saveToHistory(updatedNodes, edges);
      return updatedNodes;
    });

    if (pendingApiUpdate) {
      scheduleApiRefresh(pendingApiUpdate.nodeId, pendingApiUpdate.nextConfig);
    }
  }, [deleteVariable, edges, handleNodeExecute, saveToHistory, scheduleApiRefresh, selectedNode, setNodes, setSelectedNode]);

  useEffect(() => {
    labelChangeRef.current = handleNodeLabelChange;
  }, [handleNodeLabelChange]);

  useEffect(() => {
    configChangeRef.current = handleNodeConfigChange;
  }, [handleNodeConfigChange]);

  // Используем ref для хранения флага инициализации
  const graphInitializedRef = useRef(false);

  useEffect(() => {
    // Загружаем граф только один раз при монтировании или смене screenId
    if (graphInitializedRef.current) {
      return;
    }

    // Ждём завершения загрузки продукта
    if (isProductLoading) {
      console.log('[ScreenEditor] Waiting for product loading to complete...');
      return;
    }

    // Если есть productId (не демо), дожидаемся попытки загрузки продукта
    if (productId && productId !== 'avito-cart-demo' && productId !== 'avito-cart-demo-subflow') {
      if (!productLoadAttemptedRef.current) {
        console.log('[ScreenEditor] Waiting for product load attempt...');
        return;
      }
    }

    let cancelled = false;

    const loadGraphFromJson = async () => {
      try {
        // Сначала проверяем, есть ли данные в VirtualContext (например, из avitoDemo)
        if (graphData && graphData.nodes && graphData.nodes.length > 0) {
          console.log('[ScreenEditor] Loading graph from VirtualContext.graphData', graphData);
          
          const storedNodes = Array.isArray(graphData.nodes) ? graphData.nodes : [];
          const storedEdges = Array.isArray(graphData.edges) ? graphData.edges : [];

          const hydratedNodes = hydrateGraphNodes(storedNodes, {
            onLabelChange: labelChangeRef.current ?? handleNodeLabelChange,
            onConfigChange: configChangeRef.current ?? handleNodeConfigChange,
            onExecute: handleNodeExecute
          }, graphData);
          
          const hydratedEdges = hydrateGraphEdges(storedEdges);

          if (!cancelled) {
            setNodes(hydratedNodes);
            setEdges(hydratedEdges);
            setHistory([{ nodes: hydratedNodes, edges: hydratedEdges }]);
            setHistoryIndex(0);
            graphInitializedRef.current = true;
            toast.success('Граф загружен из продукта');
          }
          return;
        }

        // Если нет данных в VirtualContext, загружаем дефолтный граф из JSON-файла
        console.log('[ScreenEditor] Loading default graph from JSON file');
        const graphJson = await import('../../data/defaultGraphTemplate.json');
        const storedNodes = Array.isArray(graphJson.nodes) ? graphJson.nodes : [];
        const storedEdges = Array.isArray(graphJson.edges) ? graphJson.edges : [];

        const hydratedNodes = hydrateGraphNodes(storedNodes, {
          onLabelChange: labelChangeRef.current ?? handleNodeLabelChange,
          onConfigChange: configChangeRef.current ?? handleNodeConfigChange,
          onExecute: handleNodeExecute
        }, graphJson);
        
        const hydratedEdges = hydrateGraphEdges(storedEdges);

        if (!cancelled) {
          setNodes(hydratedNodes);
          setEdges(hydratedEdges);
          setHistory([{ nodes: hydratedNodes, edges: hydratedEdges }]);
          setHistoryIndex(0);
          graphInitializedRef.current = true;
          if (graphJson.variableSchemas && typeof graphJson.variableSchemas === 'object') {
            setVariableSchemas(graphJson.variableSchemas);
          }
        }
      } catch (e) {
        console.error('Failed to load graph from JSON', e);
        if (!cancelled) {
          const defaults = buildDefaultGraph(handleNodeLabelChange, handleNodeConfigChange, handleNodeExecute);
          const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(defaults.nodes, defaults.edges);
          setNodes(layoutedNodes);
          setEdges(layoutedEdges);
          setHistory([{ nodes: layoutedNodes, edges: layoutedEdges }]);
          setHistoryIndex(0);
          graphInitializedRef.current = true;
        }
      }
    };

    loadGraphFromJson();

    return () => {
      cancelled = true;
    };
  }, [screenId, graphData, isProductLoading, productId]);

  // Сбрасываем флаг при смене screenId
  useEffect(() => {
    graphInitializedRef.current = false;
    productLoadAttemptedRef.current = false;
  }, [screenId]);

  const addNewNode = useCallback((nodeType) => {
    const nodeId = `${nodeType}-${Date.now()}`;

    const baseNode = {
      id: nodeId,
      type: nodeType,
      position: { x: 0, y: 0 },
      data: {
        label: nodeType === 'screen' ? 'Новый экран' : 'Новое действие',
        inputBindings: [],
        outputBindings: [],
        onLabelChange: handleNodeLabelChange,
        ...(nodeType === 'action'
          ? {
              actionType: 'api',
              config: {},
              onConfigChange: handleNodeConfigChange,
              onExecute: handleNodeExecute
            }
          : {
              screenId: nodeId,
              screenType: 'screen',
              status: 'draft',
              description: '',
              components: 0,
              actions: 0
            })
      }
    };

    const { layoutedNodes } = applyAutoLayout([...nodes, baseNode], edges);
    const createdNode = layoutedNodes.find((node) => node.id === baseNode.id);

    if (nodeType === 'screen') {
      const exists = screens?.some?.((screen) => screen.id === nodeId);
      if (!exists) {
        // Set flag to prevent circular updates
        isUpdatingScreensRef.current = true;
        console.log('[DEBUG] addNewNode -> addScreen for', nodeId);
        addScreen({
          id: nodeId,
          name: baseNode.data.label,
          type: baseNode.data.screenType,
          description: baseNode.data.description,
          status: baseNode.data.status,
          components: baseNode.data.components,
          actions: baseNode.data.actions
        });
      }
    }

    if (createdNode) {
      setSelectedNode(createdNode);
      setSelectedEdge(null);
    }

    toast.success(nodeType === 'screen' ? 'Экран добавлен' : 'Действие добавлено');
  }, [addScreen, applyAutoLayout, edges, handleNodeConfigChange, handleNodeExecute, handleNodeLabelChange, nodes, screens, setSelectedEdge, setSelectedNode]);

  // Edge Management
  const onConnect = useCallback(
    (params) => {
      const newEdge = {
        ...params,
        type: 'custom',
        markerEnd: { type: MarkerType.ArrowClosed },
        data: { trigger: 'onClick' },
        label: 'New Transition'
      };
      
      setEdges((eds) => addEdge(newEdge, eds));
      toast.success('Connection created!');
    },
    [setEdges]
  );

  // Validation System
  const validateFlow = useCallback(() => {
    const errors = [];
    
    // Check for disconnected nodes
    const connectedNodes = new Set();
    edges.forEach(edge => {
      connectedNodes.add(edge.source);
      connectedNodes.add(edge.target);
    });
    
    nodes.forEach(node => {
      if (!connectedNodes.has(node.id) && nodes.length > 1) {
        errors.push({
          type: 'disconnected',
          nodeId: node.id,
          message: `Node "${node.data.label}" is not connected`
        });
      }
      
      // Check for missing configuration
      if (node.type === 'action') {
        const config = node.data.config || {};
        if (node.data.actionType === 'api' && !config.endpoint) {
          errors.push({
            type: 'missing-config',
            nodeId: node.id,
            message: `API node "${node.data.label}" missing endpoint`
          });
        }
      }

      const inputBindings = node.data?.inputBindings || [];
      const outputBindings = node.data?.outputBindings || [];

      inputBindings.forEach((binding) => {
        const name = (binding.name || '').trim();
        const variableName = (binding.variable || '').trim();
        if (name && !variableName) {
          errors.push({
            type: 'binding-missing-variable',
            bindingType: 'input',
            nodeId: node.id,
            message: `Input parameter "${name}" on node "${node.data.label}" has no bound variable`
          });
        } else if (variableName && !variables[variableName]) {
          errors.push({
            type: 'binding-missing-variable-context',
            bindingType: 'input',
            nodeId: node.id,
            message: `Input parameter "${name || 'unnamed'}" on node "${node.data.label}" references missing variable "${variableName}"`
          });
        }
      });

      outputBindings.forEach((binding) => {
        const name = (binding.name || '').trim();
        const variableName = (binding.variable || '').trim();
        if (name && !variableName) {
          errors.push({
            type: 'binding-missing-variable',
            bindingType: 'output',
            nodeId: node.id,
            message: `Output parameter "${name}" on node "${node.data.label}" has no bound variable`
          });
        } else if (variableName && !variables[variableName]) {
          errors.push({
            type: 'binding-missing-variable-context',
            bindingType: 'output',
            nodeId: node.id,
            message: `Output parameter "${name || 'unnamed'}" on node "${node.data.label}" references missing variable "${variableName}"`
          });
        }
      });
    });

    setValidationErrors(errors);
    setIsValidationMode(true);
    
    if (errors.length === 0) {
      toast.success('Flow validation passed!');
    } else {
      toast.error(`Found ${errors.length} validation error(s)`);
    }
  }, [nodes, edges, variables]);

  // Node Selection
  const onNodeClick = useCallback((event, node) => {
    setSelectedNode(node);
    setSelectedEdge(null);
  }, []);

  const onEdgeClick = useCallback((event, edge) => {
    setSelectedEdge(edge);
    setSelectedNode(null);
  }, []);

  const handlePaneClick = useCallback(() => {
    setSelectedNode(null);
    setSelectedEdge(null);
  }, [setSelectedEdge, setSelectedNode]);

  // Export/Import
  const exportFlow = useCallback(() => {
    const flowData = {
      nodes,
      edges,
      variables: variablesList
    };
    
    const dataStr = JSON.stringify(flowData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `${currentScreen?.name || 'screen'}-flow.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    toast.success('Flow exported successfully!');
  }, [nodes, edges, variablesList, currentScreen]);

  // Export to Workflow Server
  const exportToWorkflowServer = useCallback(async () => {
    try {
      const graphData = { nodes, edges };
      const initialContext = Object.entries(variables).reduce((acc, [key, val]) => {
        acc[key] = val.value;
        return acc;
      }, {});

      const response = await workflowApi.exportWorkflow(graphData, initialContext, {
        productId,
        onSuccess: (res) => {
          toast.success(
            `Workflow сохранен!\nID: ${res.wf_description_id}`,
            { duration: 5000 }
          );
          console.log('Workflow saved:', res);
        },
        onError: (error) => {
          toast.error(
            `Ошибка экспорта: ${error.message}`,
            { duration: 5000 }
          );
        }
      });

      return response;
    } catch (error) {
      console.error('Failed to export workflow:', error);
    }
  }, [nodes, edges, variables, workflowApi, productId]);

  const saveFlow = useCallback(async () => {
    
    if (!screenId) {
      toast.error('Не выбран экран для сохранения');
      return;
    }

    // 1. Очистить все переменные и схемы
    console.log('[saveFlow] Очистка variableSchemas и переменных:', variablesList);
    if (typeof resetVariableSchemas === 'function') resetVariableSchemas();
    if (typeof variablesList === 'object' && Array.isArray(variablesList)) {
      variablesList.forEach((name) => {
        if (typeof deleteVariable === 'function') {
          console.log(`[saveFlow] Удаляю переменную: ${name}`);
          deleteVariable(name);
        }
      });
    }

    try {
      setIsSavingFlow(true);

      const { nodes: sanitizedNodes, edges: sanitizedEdges, variableSchemas: schemas } = sanitizeGraphState(nodes, edges);

      const schemaKeys = schemas ? Object.keys(schemas) : [];
      const combinedVariableNames = Array.from(new Set([...variablesList, ...schemaKeys]));

      const variableDefinitions = combinedVariableNames
        .map((variableName) => {
          const variable = variablesRef.current?.[variableName];
          const schemaMeta = schemas?.[variableName];
          const inferredType = deriveSchemaType(schemaMeta);
          if (!variable && !schemaMeta) {
            return null;
          }

          const value = variable?.value !== undefined
            ? variable.value
            : defaultValueForSchemaType(inferredType);

          const type = schemaMeta ? inferredType : (variable?.type || 'string');
          const source = variable?.source || schemaMeta?.source || 'manual';
          const description = variable?.description || schemaMeta?.description || '';

          return {
            name: variableName,
            value,
            type,
            source,
            description
          };
        })
        .filter(Boolean);

      const payload = {
        nodes: sanitizedNodes,
        edges: sanitizedEdges,
        variableSchemas: schemas,
        variables: variablesList,
        variableDefinitions,
        screenName: currentScreen?.name || 'New Screen',
        // Preserve workflow metadata
        id: graphData?.id || graphData?.workflow_id,
        workflow_id: graphData?.workflow_id || graphData?.id,
        name: graphData?.name || 'Workflow',
        version: graphData?.version || '1.0.0',
        screens: graphData?.screens || {},
        initialContext: graphData?.initialContext || {}
      };

      localStorage.setItem(`flow-${screenId}`, JSON.stringify(payload));

      // Preserve all metadata when updating graphData
      setGraphData({
        ...graphData,
        nodes: sanitizedNodes,
        edges: sanitizedEdges,
        variableSchemas: schemas
      });
      setVariableSchemas(schemas);

      // 2. Заново заполнить переменные на основе API-узлов и их outputBindings
      sanitizedNodes.forEach((node) => {
        if (node.data?.actionType === 'api') {
          const config = node.data.config || {};
          const contextKey = typeof config.contextKey === 'string' ? config.contextKey.trim() : '';
          if (contextKey) {
            // Если есть схема — используем тип из неё, иначе 'string'
            const schemaMeta = schemas[contextKey];
            let type = schemaMeta?.type || 'string';
            let value = '';
            if (type === 'list') value = [];
            if (type === 'object') value = {};
            console.log(`[saveFlow] Добавляю переменную из API-узла: ${contextKey}, type=${type}`);
            setVariable(contextKey, value, type, 'api', node.data.label || '');
          }
          // Также outputBindings (если есть)
          if (Array.isArray(node.data.outputBindings)) {
            node.data.outputBindings.forEach((binding) => {
              const varName = binding.variable?.trim();
              if (varName) {
                console.log(`[saveFlow] Добавляю outputBinding переменную: ${varName}`);
                setVariable(varName, '', 'string', 'api', `Output binding of ${node.id}`);
              }
            });
          }
        }
      });
      // Лог финального состояния переменных
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          // eslint-disable-next-line no-console
          console.log('[saveFlow] Итоговые переменные:', window.__VC_TRACE__ ? window.__VC_TRACE__ : variablesRef.current);
        }
      }, 500);

      synchronizeVariablesWithSchemas(schemas);
      toast.success('Flow saved successfully!');
    } catch {
      console.error('Failed to save flow');
      toast.error('Не удалось сохранить граф');
    } finally {
      setIsSavingFlow(false);
    }
  }, [currentScreen?.name, edges, nodes, screenId, setGraphData, setVariableSchemas, synchronizeVariablesWithSchemas, variablesList]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="screen-editor">
      {/* Header */}
      <div className="editor-header">
        <div className="header-left">
          <div className="breadcrumb">
            <Link to="/products">Products</Link>
            <ArrowRight size={16} />
            <Link to={`/products/${productId}`}>Product</Link>
            <ArrowRight size={16} />
            <span>Flow Editor</span>
          </div>
          <h1>{currentScreen?.name || 'Screen'} - Flow Editor</h1>
        </div>

        <div className="header-center">
          <div className="editor-tabs">
            <button 
              className={`tab ${activeTab === 'editor' ? 'active' : ''}`}
              onClick={() => setActiveTab('editor')}
            >
              <GitBranch size={16} />
              Редактор
            </button>
            <button 
              className={`tab ${activeTab === 'data' ? 'active' : ''}`}
              onClick={() => setActiveTab('data')}
            >
              <Database size={16} />
              Данные
            </button>
          </div>
        </div>

        <div className="header-actions">
          <button className="btn btn-ghost" onClick={undo} disabled={historyIndex <= 0}>
            <Undo size={18} />
          </button>
          <button className="btn btn-ghost" onClick={redo} disabled={historyIndex >= history.length - 1}>
            <Redo size={18} />
          </button>
          <button className="btn btn-ghost" onClick={validateFlow}>
            <CheckCircle size={18} />
            Validate
          </button>
          <button className="btn btn-ghost" onClick={exportFlow}>
            <Download size={18} />
            Export
          </button>
          <button className="btn btn-ghost" onClick={exportToWorkflowServer}>
            <Send size={18} />
            Export to Server
          </button>
          <button
            className="btn btn-primary"
            onClick={() => { void saveFlow(); }}
            disabled={isSavingFlow}
          >
            <Save size={18} />
            {isSavingFlow ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {/* Main Editor */}
      <div className="editor-content">
        {activeTab === 'editor' ? (
        <>
        <div className="flow-container" ref={reactFlowWrapper}>
          {console.log('[ReactFlow Debug] Rendering with nodes:', nodes.map(n => ({ id: n.id, type: n.type, label: n.data?.label })))}
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            onPaneClick={handlePaneClick}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            className="screen-editor-reactflow"
          >
            <Background color="#e2e8f0" gap={24} />
            <MiniMap
              nodeColor={(node) => (node.type === 'screen' ? '#2563eb' : '#0ea5e9')}
              nodeStrokeWidth={3}
              zoomable
              pannable
            />
            <Controls />
            <Panel position="top-right" className="flow-panel">
              <div className="flow-panel-actions">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => addNewNode('screen')}
                >
                  <Monitor size={16} />
                  Экран
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => addNewNode('action')}
                >
                  <Activity size={16} />
                  Действие
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => applyAutoLayout(nodes, edges)}
                >
                  <GitBranch size={16} />
                  Автовыравнивание
                </button>
              </div>
            </Panel>
          </ReactFlow>
        </div>

        {/* Properties Panel */}
        <div className="properties-panel">
          <div className="panel-header">
            <h3>Properties</h3>
          </div>

          {selectedNode ? (
            <div className="node-properties">
              <h4>Node: {selectedNode.data.label}</h4>
              <div className="node-actions">
                {selectedNode.type === 'screen' && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleOpenScreenBuilder}
                  >
                    <Edit3 size={16} />
                    Открыть экран
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleRequestDeleteNode}
                >
                  <Trash2 size={16} />
                  Удалить состояние
                </button>
              </div>
              
              <div className="property-group">
                <label>Type</label>
                <input type="text" value={selectedNode.type} disabled />
              </div>

              {selectedNode.type === 'action' && (
                <>
                  <div className="property-group">
                    <label>Action Type</label>
                    <select 
                      value={selectedNode.data.actionType}
                      onChange={(e) => {
                        const updatedNode = {
                          ...selectedNode,
                          data: {
                            ...selectedNode.data,
                            actionType: e.target.value
                          }
                        };
                        setSelectedNode(updatedNode);
                        setNodes(nds => nds.map(n => n.id === selectedNode.id ? updatedNode : n));
                      }}
                    >
                      <option value="api">API Call</option>
                      <option value="condition">Condition</option>
                      <option value="validation">Validation</option>
                    </select>
                  </div>

                  <div className="property-group">
                    <label>Configuration</label>
                    <textarea 
                      value={JSON.stringify(selectedNode.data.config || {}, null, 2)}
                      onChange={(e) => {
                        try {
                          const config = JSON.parse(e.target.value);
                          const updatedNode = {
                            ...selectedNode,
                            data: {
                              ...selectedNode.data,
                              config
                            }
                          };
                          setSelectedNode(updatedNode);
                          setNodes(nds => nds.map(n => n.id === selectedNode.id ? updatedNode : n));
                        } catch {
                          // Invalid JSON, ignore
                        }
                      }}
                      rows={6}
                    />
                  </div>
                </>
              )}

              {['screen', 'action'].includes(selectedNode.type) && (
                <>
                  <div className="bindings-section">
                    <div className="bindings-header">
                      <label>Входные параметры</label>
                      <button
                        type="button"
                        className="btn-inline"
                        onClick={() => addBinding(selectedNode.id, 'input')}
                      >
                        <Plus size={14} />
                        Добавить
                      </button>
                    </div>

                    {selectedNodeInputBindings.length === 0 ? (
                      <p className="bindings-empty">Нет входных параметров</p>
                    ) : (
                      selectedNodeInputBindings.map((binding) => {
                        const bindingKey = getBindingKey(selectedNode.id, 'input', binding.id);
                        const rawInput = (binding.variable || '').trim();
                        const lowerRaw = rawInput.toLowerCase();
                        const dotIndex = rawInput.indexOf('.');
                        let suggestionList = [];
                        if (dotIndex > 0) {
                          // User is typing varName.field -> suggest fields
                          const varName = rawInput.slice(0, dotIndex);
                          const fieldQuery = rawInput.slice(dotIndex + 1).toLowerCase();
                          const schemaMeta = variableSchemas?.[varName];
                          let fields = [];
                          if (schemaMeta && schemaMeta.schema && typeof schemaMeta.schema === 'object') {
                            fields = Object.keys(schemaMeta.schema);
                          } else {
                            // try to infer from sample value
                            const sample = variables?.[varName]?.value;
                            if (Array.isArray(sample) && sample.length > 0 && isPlainObject(sample[0])) {
                              fields = Object.keys(sample[0]);
                            } else if (isPlainObject(sample)) {
                              fields = Object.keys(sample);
                            }
                          }
                          suggestionList = fields
                            .filter((f) => !fieldQuery || f.toLowerCase().includes(fieldQuery))
                            .slice(0, 12)
                            .map((f) => ({ value: `${varName}.${f}`, label: f, meta: (schemaMeta?.schema?.[f]?.type) || '' }));
                        } else {
                          // suggest variable names
                          const searchTerm = lowerRaw;
                          const matchingVariables = searchTerm
                            ? variablesList.filter((variableName) => variableName.toLowerCase().includes(searchTerm))
                            : variablesList;
                          suggestionList = matchingVariables.slice(0, 12).map((n) => ({ value: n, label: n, meta: variables?.[n]?.type || '' }));
                        }
                        const showSuggestions = activeSuggestion?.key === bindingKey && suggestionList.length > 0;
                        const suggestionPlacement = activeSuggestion?.placement || 'down';

                        return (
                          <div className="binding-row" key={binding.id}>
                            <input
                              type="text"
                              value={binding.name}
                              onChange={(e) => updateBindingField(selectedNode.id, 'input', binding.id, 'name', e.target.value)}
                              placeholder="Имя параметра"
                            />
                            <BindingVariableDropZone
                              nodeId={selectedNode.id}
                              bindingType="input"
                              bindingId={binding.id}
                              domRefCallback={(el) => setBindingDropZoneRef(bindingKey, el)}
                            >
                              <input
                                type="text"
                                list={`binding-fields-${bindingKey}`}
                                value={binding.variable || ''}
                                onFocus={() => handleBindingInputFocus(bindingKey)}
                                onBlur={handleBindingInputBlur}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  updateBindingField(selectedNode.id, 'input', binding.id, 'variable', val);
                                  openSuggestions(bindingKey);
                                }}
                                placeholder="Переменная контекста или alias.field"
                              />
                              {/* Field suggestions datalist when variable.field typing */}
                              <datalist id={`binding-fields-${bindingKey}`}>
                                {(() => {
                                  const raw = (binding.variable || '').trim();
                                  const dotIndex = raw.indexOf('.');
                                  if (dotIndex > 0) {
                                    const varName = raw.slice(0, dotIndex);
                                    const schemaMeta = variableSchemas?.[varName];
                                    const fields = schemaMeta && schemaMeta.schema && typeof schemaMeta.schema === 'object'
                                      ? Object.keys(schemaMeta.schema)
                                      : [];
                                    return fields.map((f) => (
                                      <option key={f} value={`${varName}.${f}`} />
                                    ));
                                  }
                                  return null;
                                })()}
                              </datalist>
                              <button
                                type="button"
                                className="btn-icon"
                                title="Создать переменную"
                                onClick={() => handleCreateVariable(binding.variable || binding.name || '')}
                              >
                                <Plus size={14} />
                              </button>
                              {showSuggestions && (
                                <div className={`binding-variable-suggestions${suggestionPlacement === 'up' ? ' binding-variable-suggestions--up' : ''}`}>
                                  {suggestionList.length > 0 ? (
                                    suggestionList.map((s) => (
                                      <button
                                        type="button"
                                        key={s.value}
                                        className="binding-variable-suggestion"
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => handleSuggestionSelect(selectedNode.id, 'input', binding.id, s.value)}
                                      >
                                        <span className="binding-variable-suggestion-name">{s.label}</span>
                                        <span className="binding-variable-suggestion-meta">{s.meta || ''}</span>
                                      </button>
                                    ))
                                  ) : (
                                    <div className="binding-variable-suggestion binding-variable-suggestion--empty">
                                      Нет совпадений
                                    </div>
                                  )}
                                </div>
                              )}
                            </BindingVariableDropZone>
                            <button
                              type="button"
                              className="btn-icon danger"
                              title="Удалить параметр"
                              onClick={() => removeBinding(selectedNode.id, 'input', binding.id)}
                            >
                              ×
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="bindings-section">
                    <div className="bindings-header">
                      <label>Выходные параметры</label>
                      <button
                        type="button"
                        className="btn-inline"
                        onClick={() => addBinding(selectedNode.id, 'output')}
                      >
                        <Plus size={14} />
                        Добавить
                      </button>
                    </div>

                    {selectedNodeOutputBindings.length === 0 ? (
                      <p className="bindings-empty">Нет выходных параметров</p>
                    ) : (
                      selectedNodeOutputBindings.map((binding) => {
                        const bindingKey = getBindingKey(selectedNode.id, 'output', binding.id);
                        const rawInputOut = (binding.variable || '').trim();
                        const lowerRawOut = rawInputOut.toLowerCase();
                        const dotIndexOut = rawInputOut.indexOf('.');
                        let suggestionListOut = [];
                        if (dotIndexOut > 0) {
                          const varName = rawInputOut.slice(0, dotIndexOut);
                          const fieldQuery = rawInputOut.slice(dotIndexOut + 1).toLowerCase();
                          const schemaMeta = variableSchemas?.[varName];
                          let fields = [];
                          if (schemaMeta && schemaMeta.schema && typeof schemaMeta.schema === 'object') {
                            fields = Object.keys(schemaMeta.schema);
                          } else {
                            const sample = variables?.[varName]?.value;
                            if (Array.isArray(sample) && sample.length > 0 && isPlainObject(sample[0])) {
                              fields = Object.keys(sample[0]);
                            } else if (isPlainObject(sample)) {
                              fields = Object.keys(sample);
                            }
                          }
                          suggestionListOut = fields
                            .filter((f) => !fieldQuery || f.toLowerCase().includes(fieldQuery))
                            .slice(0, 12)
                            .map((f) => ({ value: `${varName}.${f}`, label: f, meta: (schemaMeta?.schema?.[f]?.type) || '' }));
                        } else {
                          const searchTerm = lowerRawOut;
                          const matchingVariables = searchTerm
                            ? variablesList.filter((variableName) => variableName.toLowerCase().includes(searchTerm))
                            : variablesList;
                          suggestionListOut = matchingVariables.slice(0, 12).map((n) => ({ value: n, label: n, meta: variables?.[n]?.type || '' }));
                        }
                        const showSuggestionsOut = activeSuggestion?.key === bindingKey && suggestionListOut.length > 0;
                        const suggestionPlacementOut = activeSuggestion?.placement || 'down';

                        return (
                          <div className="binding-row" key={binding.id}>
                            <input
                              type="text"
                              value={binding.name}
                              onChange={(e) => updateBindingField(selectedNode.id, 'output', binding.id, 'name', e.target.value)}
                              placeholder="Имя параметра"
                            />
                            <BindingVariableDropZone
                              nodeId={selectedNode.id}
                              bindingType="output"
                              bindingId={binding.id}
                              domRefCallback={(el) => setBindingDropZoneRef(bindingKey, el)}
                            >
                              <input
                                type="text"
                                list={`binding-fields-${bindingKey}`}
                                value={binding.variable || ''}
                                onFocus={() => handleBindingInputFocus(bindingKey)}
                                onBlur={handleBindingInputBlur}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  updateBindingField(selectedNode.id, 'output', binding.id, 'variable', val);
                                  openSuggestions(bindingKey);
                                }}
                                placeholder="Переменная контекста или alias.field"
                              />
                              <datalist id={`binding-fields-${bindingKey}`}>
                                {(() => {
                                  const raw = (binding.variable || '').trim();
                                  const dotIndex = raw.indexOf('.');
                                  if (dotIndex > 0) {
                                    const varName = raw.slice(0, dotIndex);
                                    const schemaMeta = variableSchemas?.[varName];
                                    const fields = schemaMeta && schemaMeta.schema && typeof schemaMeta.schema === 'object'
                                      ? Object.keys(schemaMeta.schema)
                                      : [];
                                    return fields.map((f) => (
                                      <option key={f} value={`${varName}.${f}`} />
                                    ));
                                  }
                                  return null;
                                })()}
                              </datalist>
                              <button
                                type="button"
                                className="btn-icon"
                                title="Создать переменную"
                                onClick={() => handleCreateVariable(binding.variable || binding.name || '')}
                              >
                                <Plus size={14} />
                              </button>
                              {showSuggestionsOut && (
                                <div className={`binding-variable-suggestions${suggestionPlacementOut === 'up' ? ' binding-variable-suggestions--up' : ''}`}>
                                  {suggestionListOut.length > 0 ? (
                                    suggestionListOut.map((s) => (
                                      <button
                                        type="button"
                                        key={s.value}
                                        className="binding-variable-suggestion"
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => handleSuggestionSelect(selectedNode.id, 'output', binding.id, s.value)}
                                      >
                                        <span className="binding-variable-suggestion-name">{s.label}</span>
                                        <span className="binding-variable-suggestion-meta">{s.meta || ''}</span>
                                      </button>
                                    ))
                                  ) : (
                                    <div className="binding-variable-suggestion binding-variable-suggestion--empty">
                                      Нет совпадений
                                    </div>
                                  )}
                                </div>
                              )}
                            </BindingVariableDropZone>
                            <button
                              type="button"
                              className="btn-icon danger"
                              title="Удалить параметр"
                              onClick={() => removeBinding(selectedNode.id, 'output', binding.id)}
                            >
                              ×
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              )}
            </div>
          ) : selectedEdge ? (
            <div className="edge-properties">
              <h4>Connection</h4>
              
              <div className="property-group">
                <label>Label</label>
                <input 
                  type="text"
                  value={selectedEdge.label || ''}
                  onChange={(e) => {
                    const updatedEdge = {
                      ...selectedEdge,
                      label: e.target.value
                    };
                    setSelectedEdge(updatedEdge);
                    setEdges(eds => eds.map(e => e.id === selectedEdge.id ? updatedEdge : e));
                  }}
                  placeholder="Transition label"
                />
              </div>

              <div className="property-group">
                <label>Trigger</label>
                <select 
                  value={selectedEdge.data?.trigger || 'onClick'}
                  onChange={(e) => {
                    const updatedEdge = {
                      ...selectedEdge,
                      data: {
                        ...selectedEdge.data,
                        trigger: e.target.value
                      }
                    };
                    setSelectedEdge(updatedEdge);
                    setEdges(eds => eds.map(e => e.id === selectedEdge.id ? updatedEdge : e));
                  }}
                >
                  <option value="onClick">On Click</option>
                  <option value="onSubmit">On Submit</option>
                  <option value="onSuccess">On Success</option>
                  <option value="onError">On Error</option>
                  <option value="onLoad">On Load</option>
                </select>
              </div>

              <div className="property-group">
                <label>Condition</label>
                <textarea 
                  placeholder="Optional condition logic"
                  value={selectedEdge.data?.condition || ''}
                  onChange={(e) => {
                    const updatedEdge = {
                      ...selectedEdge,
                      data: {
                        ...selectedEdge.data,
                        condition: e.target.value
                      }
                    };
                    setSelectedEdge(updatedEdge);
                    setEdges(eds => eds.map(e => e.id === selectedEdge.id ? updatedEdge : e));
                  }}
                  rows={3}
                />
              </div>
            </div>
          ) : (
            <div className="no-selection">
              <p>Select a node or connection to edit properties</p>
            </div>
          )}

          {/* Virtual Context Variables */}
          <div className="context-variables">
            <h4>Context Variables</h4>
            <div className="variables-list">
              <SortableContext
                items={variablesList}
                strategy={verticalListSortingStrategy}
              >
                {variablesList.map((variableName) => {
                  const variable = variables[variableName];
                  if (!variable) {
                    return null;
                  }
                  return (
                    <SortableVariableItem
                      key={variableName}
                      name={variableName}
                      variable={variable}
                    />
                  );
                })}
              </SortableContext>

              {variablesList.length === 0 && (
                <p className="no-variables">No variables defined</p>
              )}
            </div>
          </div>
        </div>
        </>
        ) : (
          <div className="workflow-data-container">
            <WorkflowViewer data={{
              id: graphData?.id || graphData?.workflow_id,
              name: graphData?.name || 'Workflow',
              description: graphData?.description || '',
              total_screens: Object.keys(graphData?.screens || {}).length,
              total_components: nodes.length,
              workflow: {
                ...graphData,
                nodes,
                edges
              }
            }} />
          </div>
        )}
      </div>
      </div>
      <DragOverlay>
        {activeVariableId ? (
          <VariableDragOverlay
            name={activeVariableId}
            variable={variables[activeVariableId]}
          />
        ) : null}
      </DragOverlay>
      <ConfirmDialog
        open={Boolean(nodePendingDeletion)}
        title="Удалить состояние?"
        message={`Действие нельзя отменить. Состояние "${nodePendingDeletion?.data?.label || 'без имени'}" и связанные переходы будут удалены.`}
        confirmLabel="Удалить"
        cancelLabel="Отмена"
        destructive
        onConfirm={handleConfirmDeleteNode}
        onCancel={handleCancelDeleteNode}
      />
    </DndContext>
  );
};

export default ScreenEditor;