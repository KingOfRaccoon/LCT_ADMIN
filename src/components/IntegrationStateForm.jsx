import React, { useState, useEffect } from 'react';
import './IntegrationStateForm.css';

/**
 * Форма создания Integration State для админ-панели
 * @param {Object} props
 * @param {Function} props.onSubmit - Callback при сохранении
 * @param {Function} props.onCancel - Callback при отмене
 * @param {Array} props.availableStates - Список доступных состояний для перехода
 * @param {Array} props.availableVariables - Список доступных переменных контекста
 * @param {Object} props.initialData - Начальные данные для редактирования
 */
export function IntegrationStateForm({
  onSubmit,
  onCancel,
  availableStates = [],
  availableVariables = [],
  initialData = null
}) {
  const [stateName, setStateName] = useState('');
  const [variableName, setVariableName] = useState('');
  const [url, setUrl] = useState('');
  const [method, setMethod] = useState('get');
  const [params, setParams] = useState([{ key: '', value: '' }]);
  const [nextState, setNextState] = useState('');
  const [description, setDescription] = useState('');
  
  // Состояние валидации
  const [errors, setErrors] = useState({});
  const [warnings, setWarnings] = useState({});
  
  // Состояние для предпросмотра
  const [showPreview, setShowPreview] = useState(false);

  // Загрузка начальных данных при редактировании
  useEffect(() => {
    if (initialData) {
      setStateName(initialData.name || '');
      setDescription(initialData.description || '');
      
      if (initialData.expressions && initialData.expressions.length > 0) {
        const expr = initialData.expressions[0];
        setVariableName(expr.variable || '');
        setUrl(expr.url || '');
        setMethod(expr.method || 'get');
        
        // Преобразуем params объект в массив
        const paramsArray = Object.entries(expr.params || {}).map(([key, value]) => ({
          key,
          value
        }));
        setParams(paramsArray.length > 0 ? paramsArray : [{ key: '', value: '' }]);
      }
      
      if (initialData.transitions && initialData.transitions.length > 0) {
        setNextState(initialData.transitions[0].state_id || '');
      }
    }
  }, [initialData]);

  // Валидация полей
  const validateField = (field, value) => {
    const newErrors = { ...errors };
    const newWarnings = { ...warnings };

    switch (field) {
      case 'stateName':
        if (!value) {
          newErrors.stateName = 'Название состояния обязательно';
        } else if (!/^[A-Z][a-zA-Z0-9]*$/.test(value)) {
          newErrors.stateName = 'Используйте CamelCase (начинайте с заглавной буквы)';
        } else {
          delete newErrors.stateName;
        }
        break;

      case 'variableName':
        if (!value) {
          newErrors.variableName = 'Название переменной обязательно';
        } else if (!/^[a-z_][a-z0-9_]*$/.test(value)) {
          newErrors.variableName = 'Используйте snake_case (строчные буквы и подчеркивания)';
        } else if (['__workflow_id', '__created_at', 'context', 'session'].includes(value)) {
          newErrors.variableName = `"${value}" - зарезервированное имя`;
        } else {
          delete newErrors.variableName;
        }
        break;

      case 'url':
        if (!value) {
          newErrors.url = 'URL обязателен';
        } else if (!/^https?:\/\/.+/.test(value)) {
          newErrors.url = 'URL должен начинаться с http:// или https://';
        } else {
          delete newErrors.url;
          if (value.startsWith('http://')) {
            newWarnings.url = '⚠️ Используется незащищенный HTTP. Рекомендуется HTTPS';
          } else {
            delete newWarnings.url;
          }
        }
        break;

      case 'nextState':
        if (!value) {
          newErrors.nextState = 'Следующее состояние обязательно';
        } else {
          delete newErrors.nextState;
        }
        break;

      default:
        break;
    }

    setErrors(newErrors);
    setWarnings(newWarnings);
  };

  // Добавление параметра
  const addParam = () => {
    setParams([...params, { key: '', value: '' }]);
  };

  // Удаление параметра
  const removeParam = (index) => {
    setParams(params.filter((_, i) => i !== index));
  };

  // Изменение параметра
  const updateParam = (index, field, value) => {
    const newParams = [...params];
    newParams[index][field] = value;
    setParams(newParams);
  };

  // Подстановка переменной в поле
  const insertVariable = (field, varName) => {
    const variable = `{{${varName}}}`;
    
    if (field === 'url') {
      setUrl(url + variable);
    }
  };

  // Проверка формы
  const isFormValid = () => {
    return (
      stateName &&
      variableName &&
      url &&
      nextState &&
      Object.keys(errors).length === 0
    );
  };

  // Отправка формы
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!isFormValid()) {
      alert('Пожалуйста, исправьте ошибки в форме');
      return;
    }

    // Преобразуем params массив в объект
    const paramsObject = {};
    params.forEach(param => {
      if (param.key) {
        paramsObject[param.key] = param.value;
      }
    });

    const integrationState = {
      id: initialData?.id || `integration_${Date.now()}`,
      type: 'integration',
      state_type: 'integration',
      name: stateName,
      description: description,
      start: false,
      expressions: [
        {
          variable: variableName,
          url: url,
          params: paramsObject,
          method: method,
          metadata: {
            description: description,
            category: 'data',
            tags: ['integration', 'api']
          }
        }
      ],
      transitions: [
        {
          variable: variableName,
          case: null,
          state_id: nextState
        }
      ],
      edges: []
    };

    onSubmit(integrationState);
  };

  // Предпросмотр JSON
  const getPreviewJSON = () => {
    const paramsObject = {};
    params.forEach(param => {
      if (param.key) {
        paramsObject[param.key] = param.value;
      }
    });

    return {
      state_type: 'integration',
      name: stateName || 'NewIntegrationState',
      transitions: [
        {
          variable: variableName || 'api_result',
          case: null,
          state_id: nextState || 'NextState'
        }
      ],
      expressions: [
        {
          variable: variableName || 'api_result',
          url: url || 'https://api.example.com/endpoint',
          params: paramsObject,
          method: method
        }
      ],
      initial_state: false,
      final_state: false
    };
  };

  return (
    <div className="integration-state-form">
      <div className="form-header">
        <h2>🌐 {initialData ? 'Редактировать' : 'Создать'} Integration State</h2>
        <p className="form-description">
          Integration State загружает данные из внешнего API и сохраняет результат в контекст сессии
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Название состояния */}
        <div className="form-group">
          <label htmlFor="stateName">
            Название состояния *
            <span className="tooltip" title="Используйте CamelCase, например: FetchData, GetOrders">ℹ️</span>
          </label>
          <input
            id="stateName"
            type="text"
            value={stateName}
            onChange={(e) => {
              setStateName(e.target.value);
              validateField('stateName', e.target.value);
            }}
            placeholder="FetchUserProfile"
            className={errors.stateName ? 'error' : ''}
          />
          {errors.stateName && <span className="error-message">{errors.stateName}</span>}
          <span className="hint">💡 Используйте CamelCase, например: FetchData, GetOrders</span>
        </div>

        {/* Название переменной результата */}
        <div className="form-group">
          <label htmlFor="variableName">
            Название переменной результата *
            <span className="tooltip" title="Результат API будет сохранен в context[variable_name]">ℹ️</span>
          </label>
          <input
            id="variableName"
            type="text"
            value={variableName}
            onChange={(e) => {
              setVariableName(e.target.value);
              validateField('variableName', e.target.value);
            }}
            placeholder="user_profile"
            className={errors.variableName ? 'error' : ''}
          />
          {errors.variableName && <span className="error-message">{errors.variableName}</span>}
          <span className="hint">💡 Результат API будет сохранен в context[{variableName || 'variable_name'}]</span>
        </div>

        {/* URL эндпоинта */}
        <div className="form-group">
          <label htmlFor="url">
            URL эндпоинта *
            <span className="tooltip" title="Используйте {{variable}} для подстановки из контекста">ℹ️</span>
          </label>
          <div className="url-input-group">
            <input
              id="url"
              type="text"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                validateField('url', e.target.value);
              }}
              placeholder="https://api.example.com/users/{{user_id}}"
              className={errors.url ? 'error' : ''}
            />
            {availableVariables.length > 0 && (
              <select
                className="variable-selector"
                onChange={(e) => {
                  if (e.target.value) {
                    insertVariable('url', e.target.value);
                    e.target.value = '';
                  }
                }}
              >
                <option value="">+ Вставить переменную</option>
                {availableVariables.map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            )}
          </div>
          {errors.url && <span className="error-message">{errors.url}</span>}
          {warnings.url && <span className="warning-message">{warnings.url}</span>}
          <span className="hint">💡 Используйте {'{{variable}}'} для подстановки из контекста</span>
        </div>

        {/* HTTP метод */}
        <div className="form-group">
          <label>HTTP метод</label>
          <div className="radio-group">
            {['get', 'post', 'put', 'delete', 'patch'].map(m => (
              <label key={m} className="radio-label">
                <input
                  type="radio"
                  value={m}
                  checked={method === m}
                  onChange={(e) => setMethod(e.target.value)}
                />
                {m.toUpperCase()}
              </label>
            ))}
          </div>
        </div>

        {/* Параметры запроса */}
        <div className="form-group">
          <label>
            Параметры запроса
            <span className="tooltip" title="Для GET - query параметры, для POST/PUT/PATCH - тело запроса">ℹ️</span>
          </label>
          <div className="params-table">
            <table>
              <thead>
                <tr>
                  <th>Key</th>
                  <th>Value</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {params.map((param, index) => (
                  <tr key={index}>
                    <td>
                      <input
                        type="text"
                        value={param.key}
                        onChange={(e) => updateParam(index, 'key', e.target.value)}
                        placeholder="key"
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        value={param.value}
                        onChange={(e) => updateParam(index, 'key', e.target.value)}
                        placeholder="value or {{variable}}"
                        list={`variables-${index}`}
                      />
                      <datalist id={`variables-${index}`}>
                        {availableVariables.map(v => (
                          <option key={v} value={`{{${v}}}`}>{v}</option>
                        ))}
                      </datalist>
                    </td>
                    <td>
                      {params.length > 1 && (
                        <button
                          type="button"
                          className="btn-remove"
                          onClick={() => removeParam(index)}
                          title="Удалить параметр"
                        >
                          ✕
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button type="button" className="btn-add" onClick={addParam}>
              + Добавить параметр
            </button>
          </div>
          <span className="hint">💡 Для GET - query параметры (?key=value), для POST/PUT/PATCH - тело запроса (JSON)</span>
        </div>

        {/* Описание */}
        <div className="form-group">
          <label htmlFor="description">Описание (опционально)</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Краткое описание назначения этого API запроса"
            rows="3"
          />
        </div>

        {/* Следующее состояние */}
        <div className="form-group">
          <label htmlFor="nextState">
            Следующее состояние *
            <span className="tooltip" title="Состояние, к которому перейти после успешной загрузки">ℹ️</span>
          </label>
          <select
            id="nextState"
            value={nextState}
            onChange={(e) => {
              setNextState(e.target.value);
              validateField('nextState', e.target.value);
            }}
            className={errors.nextState ? 'error' : ''}
          >
            <option value="">Выберите состояние</option>
            {availableStates.map(state => (
              <option key={state.id} value={state.id}>
                {state.name || state.id}
              </option>
            ))}
          </select>
          {errors.nextState && <span className="error-message">{errors.nextState}</span>}
        </div>

        {/* Предпросмотр JSON */}
        <div className="form-group">
          <button
            type="button"
            className="btn-preview"
            onClick={() => setShowPreview(!showPreview)}
          >
            {showPreview ? '▼' : '▶'} Предпросмотр JSON
          </button>
          {showPreview && (
            <pre className="json-preview">
              {JSON.stringify(getPreviewJSON(), null, 2)}
            </pre>
          )}
        </div>

        {/* Кнопки действий */}
        <div className="form-actions">
          <button type="button" className="btn-cancel" onClick={onCancel}>
            Отмена
          </button>
          <button
            type="submit"
            className="btn-submit"
            disabled={!isFormValid()}
          >
            {initialData ? 'Сохранить' : 'Создать'} Integration State
          </button>
        </div>
      </form>
    </div>
  );
}

export default IntegrationStateForm;
