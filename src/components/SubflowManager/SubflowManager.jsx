import React, { useState, useEffect } from 'react';
import { getSubflowRegistry } from '../../services/subflowRegistry';
import './SubflowManager.css';

/**
 * Компонент для управления библиотекой subflow (сохранение на бэкенд)
 */
export function SubflowManager({ baseUrl }) {
  const [registry, setRegistry] = useState(null);
  const [subflows, setSubflows] = useState([]);
  const [loading, setLoading] = useState({});
  const [error, setError] = useState(null);

  useEffect(() => {
    const reg = getSubflowRegistry(baseUrl);
    setRegistry(reg);
    setSubflows(reg.list());
  }, [baseUrl]);

  const handleSave = async (name) => {
    setLoading(prev => ({ ...prev, [name]: true }));
    setError(null);

    try {
      const id = await registry.save(name);
      setSubflows(registry.list());
      console.log(`✅ Saved ${name}: ${id}`);
    } catch (err) {
      setError(`Failed to save ${name}: ${err.message}`);
      console.error(err);
    } finally {
      setLoading(prev => ({ ...prev, [name]: false }));
    }
  };

  const handleReset = (name) => {
    registry.reset(name);
    setSubflows(registry.list());
  };

  const handleSaveAll = async () => {
    setLoading(prev => ({ ...prev, all: true }));
    setError(null);

    try {
      const results = await registry.saveAll();
      setSubflows(registry.list());
      console.log('✅ Saved all subflows:', results);
    } catch (err) {
      setError(`Failed to save all: ${err.message}`);
      console.error(err);
    } finally {
      setLoading(prev => ({ ...prev, all: false }));
    }
  };

  const handleCopyId = (id) => {
    navigator.clipboard.writeText(id);
    console.log(`📋 Copied to clipboard: ${id}`);
  };

  if (!registry) {
    return <div className="subflow-manager loading">Loading registry...</div>;
  }

  return (
    <div className="subflow-manager">
      <div className="subflow-manager-header">
        <h2>📦 Subflow Registry</h2>
        <p className="subflow-manager-description">
          Сохраните subflow один раз и используйте по ID в любых workflow
        </p>
        <button
          className="btn-save-all"
          onClick={handleSaveAll}
          disabled={loading.all || subflows.every(s => s.id)}
        >
          {loading.all ? '⏳ Сохранение...' : '💾 Сохранить все'}
        </button>
      </div>

      {error && (
        <div className="subflow-manager-error">
          ❌ {error}
        </div>
      )}

      <div className="subflow-list">
        {subflows.map(subflow => (
          <div
            key={subflow.name}
            className={`subflow-item ${subflow.id ? 'saved' : 'not-saved'}`}
          >
            <div className="subflow-info">
              <div className="subflow-header">
                <h3>{subflow.name}</h3>
                <span className={`status-badge ${subflow.id ? 'success' : 'pending'}`}>
                  {subflow.id ? '✅ Saved' : '⏳ Not saved'}
                </span>
              </div>

              <p className="subflow-description">{subflow.description}</p>

              <div className="subflow-variables">
                <div className="variables-section">
                  <strong>Input:</strong>
                  <code>{subflow.input_variables.join(', ')}</code>
                </div>
                <div className="variables-section">
                  <strong>Output:</strong>
                  <code>{subflow.output_variables.join(', ')}</code>
                </div>
              </div>

              {subflow.id && (
                <div className="subflow-id">
                  <strong>ID:</strong>
                  <code className="id-value">{subflow.id}</code>
                  <button
                    className="btn-copy"
                    onClick={() => handleCopyId(subflow.id)}
                    title="Copy ID"
                  >
                    📋
                  </button>
                </div>
              )}
            </div>

            <div className="subflow-actions">
              {!subflow.id ? (
                <button
                  className="btn-save"
                  onClick={() => handleSave(subflow.name)}
                  disabled={loading[subflow.name] || !subflow.definition}
                >
                  {loading[subflow.name] ? '⏳' : '💾 Save'}
                </button>
              ) : (
                <button
                  className="btn-reset"
                  onClick={() => handleReset(subflow.name)}
                >
                  🔄 Reset
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="subflow-manager-footer">
        <h3>💡 Как использовать?</h3>
        <ol>
          <li>Нажмите <strong>💾 Save</strong> для сохранения subflow на сервер</li>
          <li>Скопируйте <strong>ID</strong> (кнопка 📋)</li>
          <li>Используйте ID в поле <code>subflow_workflow_id</code></li>
        </ol>

        <div className="code-example">
          <strong>Пример использования:</strong>
          <pre>{`{
  "state_type": "subflow",
  "name": "MySubflow",
  "expressions": [{
    "variable": "result",
    "subflow_workflow_id": "PASTE_ID_HERE",
    "input_mapping": {...},
    "output_mapping": {...}
  }]
}`}</pre>
        </div>
      </div>
    </div>
  );
}

export default SubflowManager;
