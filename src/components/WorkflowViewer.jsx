import { useState } from 'react';
import './WorkflowViewer.css';

const WorkflowViewer = ({ data }) => {
  const [expandedSections, setExpandedSections] = useState({
    overview: true,
    nodes: false,
    screens: false,
    initialContext: false,
    variableSchemas: false
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const workflow = data?.workflow || {};
  const nodes = workflow?.nodes || [];
  const screens = workflow?.screens || {};
  const initialContext = workflow?.initialContext || {};
  const variableSchemas = workflow?.variableSchemas || {};

  // Группируем узлы по типу
  const nodesByType = nodes.reduce((acc, node) => {
    const type = node.type || 'unknown';
    if (!acc[type]) acc[type] = [];
    acc[type].push(node);
    return acc;
  }, {});

  const renderValue = (value, depth = 0) => {
    if (value === null) return <span className="value-null">null</span>;
    if (value === undefined) return <span className="value-undefined">undefined</span>;
    if (typeof value === 'boolean') return <span className="value-boolean">{String(value)}</span>;
    if (typeof value === 'number') return <span className="value-number">{value}</span>;
    if (typeof value === 'string') {
      // Проверяем, является ли строка ссылкой на переменную
      if (value.startsWith('${') && value.endsWith('}')) {
        return <span className="value-reference">{value}</span>;
      }
      return <span className="value-string">"{value}"</span>;
    }
    
    if (Array.isArray(value)) {
      if (value.length === 0) return <span className="value-array">[]</span>;
      if (depth > 2) return <span className="value-collapsed">[{value.length} items...]</span>;
      return (
        <div className="value-array">
          <div className="bracket">[</div>
          <div className="array-items">
            {value.map((item, idx) => (
              <div key={idx} className="array-item">
                <span className="array-index">{idx}:</span>
                {renderValue(item, depth + 1)}
              </div>
            ))}
          </div>
          <div className="bracket">]</div>
        </div>
      );
    }

    if (typeof value === 'object') {
      const keys = Object.keys(value);
      if (keys.length === 0) return <span className="value-object">{'{}'}</span>;
      if (depth > 2) return <span className="value-collapsed">{`{${keys.length} keys...}`}</span>;
      return (
        <div className="value-object">
          <div className="bracket">{'{'}</div>
          <div className="object-items">
            {keys.map(key => (
              <div key={key} className="object-item">
                <span className="object-key">{key}:</span>
                {renderValue(value[key], depth + 1)}
              </div>
            ))}
          </div>
          <div className="bracket">{'}'}</div>
        </div>
      );
    }

    return <span>{String(value)}</span>;
  };

  return (
    <div className="workflow-viewer">
      <div className="workflow-header">
        <h1>{data.name || 'Workflow'}</h1>
        <p className="workflow-description">{data.description}</p>
        <div className="workflow-meta">
          <span className="meta-item">ID: {data.id}</span>
          <span className="meta-item">Экранов: {data.total_screens || Object.keys(screens).length}</span>
          <span className="meta-item">Узлов: {nodes.length}</span>
        </div>
      </div>

      {/* Overview Section */}
      <section className="viewer-section">
        <div className="section-header" onClick={() => toggleSection('overview')}>
          <h2>
            <span className={`expand-icon ${expandedSections.overview ? 'expanded' : ''}`}>▶</span>
            Обзор воркфлоу
          </h2>
        </div>
        {expandedSections.overview && (
          <div className="section-content">
            <div className="info-grid">
              <div className="info-item">
                <strong>Workflow ID:</strong>
                <span>{workflow.id}</span>
              </div>
              <div className="info-item">
                <strong>Название:</strong>
                <span>{workflow.name}</span>
              </div>
              <div className="info-item">
                <strong>Slug:</strong>
                <span>{workflow.slug}</span>
              </div>
              <div className="info-item">
                <strong>Описание:</strong>
                <span>{workflow.description}</span>
              </div>
            </div>

            <div className="stats-grid">
              {Object.entries(nodesByType).map(([type, typeNodes]) => (
                <div key={type} className={`stat-card stat-${type}`}>
                  <div className="stat-label">{type}</div>
                  <div className="stat-value">{typeNodes.length}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Nodes Section */}
      <section className="viewer-section">
        <div className="section-header" onClick={() => toggleSection('nodes')}>
          <h2>
            <span className={`expand-icon ${expandedSections.nodes ? 'expanded' : ''}`}>▶</span>
            Узлы ({nodes.length})
          </h2>
        </div>
        {expandedSections.nodes && (
          <div className="section-content">
            <div className="nodes-list">
              {nodes.map((node, idx) => (
                <div key={node.id || idx} className={`node-card node-type-${node.type}`}>
                  <div className="node-header">
                    <span className={`node-type-badge ${node.type}`}>{node.type}</span>
                    <h3>{node.label || node.id}</h3>
                    {node.start && <span className="start-badge">START</span>}
                    {node.final && <span className="final-badge">FINAL</span>}
                  </div>
                  
                  <div className="node-details">
                    <div className="detail-row">
                      <strong>ID:</strong>
                      <code>{node.id}</code>
                    </div>
                    {node.description && (
                      <div className="detail-row">
                        <strong>Описание:</strong>
                        <span>{node.description}</span>
                      </div>
                    )}
                    {node.screenId && (
                      <div className="detail-row">
                        <strong>Screen ID:</strong>
                        <code>{node.screenId}</code>
                      </div>
                    )}
                  </div>

                  {node.edges && node.edges.length > 0 && (
                    <div className="node-edges">
                      <strong>События ({node.edges.length}):</strong>
                      <div className="edges-list">
                        {node.edges.map((edge, edgeIdx) => (
                          <div key={edge.id || edgeIdx} className="edge-item">
                            <span className="edge-event">{edge.event}</span>
                            <span className="edge-arrow">→</span>
                            <span className="edge-target">{edge.target}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {node.expressions && node.expressions.length > 0 && (
                    <div className="node-expressions">
                      <strong>Выражения ({node.expressions.length}):</strong>
                      <div className="expressions-list">
                        {node.expressions.map((expr, exprIdx) => (
                          <div key={exprIdx} className="expression-item">
                            {expr.variable && (
                              <div className="expr-variable">
                                <code>{expr.variable}</code>
                                {expr.method && <span className="expr-method">{expr.method}</span>}
                              </div>
                            )}
                            {expr.url && (
                              <div className="expr-url">
                                <span className="http-method">{expr.method?.toUpperCase()}</span>
                                <code>{expr.url}</code>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {node.transitions && node.transitions.length > 0 && (
                    <div className="node-transitions">
                      <strong>Переходы:</strong>
                      <div className="transitions-list">
                        {node.transitions.map((trans, transIdx) => (
                          <div key={transIdx} className="transition-item">
                            <code>{trans.state_id}</code>
                            {trans.variable && <span className="trans-var">({trans.variable})</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Screens Section */}
      <section className="viewer-section">
        <div className="section-header" onClick={() => toggleSection('screens')}>
          <h2>
            <span className={`expand-icon ${expandedSections.screens ? 'expanded' : ''}`}>▶</span>
            Экраны ({Object.keys(screens).length})
          </h2>
        </div>
        {expandedSections.screens && (
          <div className="section-content">
            <div className="screens-list">
              {Object.entries(screens).map(([screenId, screen]) => (
                <div key={screenId} className="screen-card">
                  <div className="screen-header">
                    <h3>{screen.name || screenId}</h3>
                    <span className="screen-type">{screen.type}</span>
                  </div>
                  
                  <div className="screen-sections">
                    {screen.sections && Object.entries(screen.sections).map(([sectionName, section]) => (
                      <div key={sectionName} className="section-item">
                        <strong>{sectionName}:</strong>
                        <span>{section.children?.length || 0} элементов</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Initial Context Section */}
      <section className="viewer-section">
        <div className="section-header" onClick={() => toggleSection('initialContext')}>
          <h2>
            <span className={`expand-icon ${expandedSections.initialContext ? 'expanded' : ''}`}>▶</span>
            Начальный контекст ({Object.keys(initialContext).length} переменных)
          </h2>
        </div>
        {expandedSections.initialContext && (
          <div className="section-content">
            <div className="context-viewer">
              {Object.entries(initialContext).map(([key, value]) => (
                <div key={key} className="context-item">
                  <div className="context-key">{key}</div>
                  <div className="context-value">
                    {renderValue(value)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Variable Schemas Section */}
      <section className="viewer-section">
        <div className="section-header" onClick={() => toggleSection('variableSchemas')}>
          <h2>
            <span className={`expand-icon ${expandedSections.variableSchemas ? 'expanded' : ''}`}>▶</span>
            Схемы переменных ({Object.keys(variableSchemas).length})
          </h2>
        </div>
        {expandedSections.variableSchemas && (
          <div className="section-content">
            <div className="schemas-grid">
              {Object.entries(variableSchemas).map(([varName, schema]) => (
                <div key={varName} className="schema-card">
                  <div className="schema-name">{varName}</div>
                  <div className="schema-type">
                    <span className={`type-badge type-${schema.type}`}>{schema.type}</span>
                  </div>
                  {schema.schema && typeof schema.schema === 'object' && (
                    <div className="schema-details">
                      {renderValue(schema.schema, 0)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default WorkflowViewer;
