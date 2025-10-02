# Примеры использования: Технические состояния

Этот файл содержит практические примеры использования конвертера технических состояний в различных сценариях.

## 📚 Содержание

1. [Базовое использование](#1-базовое-использование)
2. [Создание технического узла в UI](#2-создание-технического-узла-в-ui)
3. [Валидация перед сохранением](#3-валидация-перед-сохранением)
4. [Работа с метаданными](#4-работа-с-метаданными)
5. [Генерация документации](#5-генерация-документации)
6. [Экспорт на бэкенд](#6-экспорт-на-бэкенд)
7. [Expression Builder](#7-expression-builder)
8. [Тестирование выражений](#8-тестирование-выражений)

---

## 1. Базовое использование

### Загрузка avitoDemo с валидацией

```javascript
import { loadAvitoDemoAsGraphData } from '@/utils/avitoDemoConverter';

// Загрузка с валидацией
const data = await loadAvitoDemoAsGraphData({ 
  validate: true,   // Включить валидацию
  verbose: true     // Детальное логирование
});

// Проверка результатов
if (data.validation.errors.length > 0) {
  console.error('❌ Validation errors:', data.validation.errors);
  
  // Показать пользователю
  showNotification({
    type: 'error',
    title: 'Validation Failed',
    message: `Found ${data.validation.errors.length} error(s) in technical nodes`
  });
} else {
  console.log(`✅ Loaded ${data.validation.technicalNodesCount} technical node(s)`);
  
  // Загрузить в React Flow
  setNodes(data.nodes);
  setEdges(data.edges);
}
```

---

## 2. Создание технического узла в UI

### Шаг 1: Инициализация шаблона

```javascript
import { createTechnicalNodeTemplate } from '@/utils/avitoDemoConverter';

function TechnicalStateCreator() {
  const [newNode, setNewNode] = useState(null);

  const handleCreate = () => {
    // Создаём шаблон
    const template = createTechnicalNodeTemplate('EmailValidation');
    
    // Позиционируем на графе
    const reactFlowNode = {
      ...convertToReactFlowNode(template),
      position: { x: 100, y: 100 }
    };
    
    setNewNode(reactFlowNode);
    openEditor(reactFlowNode);
  };

  return (
    <button onClick={handleCreate}>
      + Create Technical State
    </button>
  );
}
```

### Шаг 2: Редактирование выражения

```javascript
import { validateTechnicalExpression } from '@/utils/avitoDemoConverter';

function ExpressionEditor({ expression, onUpdate, contextSchema }) {
  const [errors, setErrors] = useState([]);

  const handleChange = (field, value) => {
    const updated = { ...expression, [field]: value };
    
    // Валидация в реальном времени
    const validationErrors = validateTechnicalExpression(updated, contextSchema);
    setErrors(validationErrors);
    
    onUpdate(updated);
  };

  return (
    <div className="expression-editor">
      <input
        value={expression.variable}
        onChange={(e) => handleChange('variable', e.target.value)}
        placeholder="Variable name"
      />
      
      <select
        value={expression.return_type}
        onChange={(e) => handleChange('return_type', e.target.value)}
      >
        <option value="boolean">Boolean</option>
        <option value="integer">Integer</option>
        <option value="float">Float</option>
        <option value="string">String</option>
        <option value="list">List</option>
        <option value="dict">Dict</option>
      </select>
      
      <textarea
        value={expression.expression}
        onChange={(e) => handleChange('expression', e.target.value)}
        placeholder="Enter expression..."
      />
      
      {errors.length > 0 && (
        <div className="errors">
          {errors.map((err, idx) => (
            <div key={idx} className="error">{err}</div>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## 3. Валидация перед сохранением

```javascript
import { 
  validateTechnicalNode, 
  exportTechnicalNodeForBackend 
} from '@/utils/avitoDemoConverter';

async function saveTechnicalNode(reactFlowNode, contextSchema) {
  // 1. Валидация узла
  const validation = validateTechnicalNode(
    reactFlowNode.data, 
    contextSchema
  );
  
  if (!validation.valid) {
    // Показываем модальное окно с ошибками
    showValidationModal({
      title: 'Cannot save technical state',
      errors: validation.errors,
      node: reactFlowNode.data.label
    });
    
    return false;
  }
  
  // 2. Экспорт для бэкенда
  const backendFormat = exportTechnicalNodeForBackend(reactFlowNode);
  
  // 3. Отправка на сервер
  try {
    const response = await fetch('/api/workflow/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        states: [backendFormat]
      })
    });
    
    if (!response.ok) {
      throw new Error('Server validation failed');
    }
    
    showNotification({
      type: 'success',
      message: 'Technical state saved successfully'
    });
    
    return true;
  } catch (error) {
    showNotification({
      type: 'error',
      message: `Failed to save: ${error.message}`
    });
    
    return false;
  }
}
```

---

## 4. Работа с метаданными

### Извлечение метаданных для карточки

```javascript
import { extractTechnicalNodeMetadata } from '@/utils/avitoDemoConverter';

function TechnicalNodeCard({ node }) {
  const metadata = extractTechnicalNodeMetadata(node.data);
  
  if (!metadata) return null;
  
  return (
    <div className="node-card">
      <h3>{metadata.name}</h3>
      <p>{metadata.description}</p>
      
      {metadata.category && (
        <span className="category-badge">{metadata.category}</span>
      )}
      
      <div className="tags">
        {metadata.tags.map(tag => (
          <span key={tag} className="tag">{tag}</span>
        ))}
      </div>
      
      <div className="stats">
        <div>
          <strong>{metadata.expressionsCount}</strong>
          <span>Expressions</span>
        </div>
        <div>
          <strong>{metadata.transitionsCount}</strong>
          <span>Transitions</span>
        </div>
      </div>
      
      {metadata.expressions.map((expr, idx) => (
        <div key={idx} className="expression-info">
          <code>{expr.variable}</code>
          <span className="type-badge">{expr.returnType}</span>
          {expr.description && <p>{expr.description}</p>}
        </div>
      ))}
    </div>
  );
}
```

### Редактор метаданных

```javascript
function MetadataEditor({ metadata, onUpdate }) {
  return (
    <div className="metadata-editor">
      <input
        placeholder="Description"
        value={metadata?.description || ''}
        onChange={(e) => onUpdate({ 
          ...metadata, 
          description: e.target.value 
        })}
      />
      
      <input
        placeholder="Category"
        value={metadata?.category || ''}
        onChange={(e) => onUpdate({ 
          ...metadata, 
          category: e.target.value 
        })}
      />
      
      <TagsInput
        value={metadata?.tags || []}
        onChange={(tags) => onUpdate({ ...metadata, tags })}
      />
      
      <ExamplesEditor
        examples={metadata?.examples || []}
        onChange={(examples) => onUpdate({ ...metadata, examples })}
      />
    </div>
  );
}
```

---

## 5. Генерация документации

### Автоматическая документация при сохранении

```javascript
import { 
  generateTechnicalNodeDocumentation,
  generateExpressionDocumentation 
} from '@/utils/avitoDemoConverter';

async function saveWithDocumentation(technicalNode) {
  // Генерируем документацию
  const fullDoc = generateTechnicalNodeDocumentation(technicalNode);
  
  // Сохраняем в файл
  const docPath = `docs/technical-states/${technicalNode.id}.md`;
  await saveFile(docPath, fullDoc);
  
  // Генерируем краткую версию для каждого expression
  for (const expr of technicalNode.expressions) {
    const exprDoc = generateExpressionDocumentation(expr);
    const exprPath = `docs/expressions/${expr.variable}.md`;
    await saveFile(exprPath, exprDoc);
  }
  
  console.log('✅ Documentation generated');
}
```

### Показ документации в UI

```javascript
import ReactMarkdown from 'react-markdown';
import { generateExpressionDocumentation } from '@/utils/avitoDemoConverter';

function ExpressionDocViewer({ expression }) {
  const doc = useMemo(
    () => generateExpressionDocumentation(expression),
    [expression]
  );
  
  return (
    <div className="doc-viewer">
      <ReactMarkdown>{doc}</ReactMarkdown>
    </div>
  );
}
```

---

## 6. Экспорт на бэкенд

### Массовый экспорт всех технических узлов

```javascript
import { exportTechnicalNodeForBackend } from '@/utils/avitoDemoConverter';

async function exportAllTechnicalNodes(nodes) {
  // Фильтруем только технические узлы
  const technicalNodes = nodes.filter(
    node => node.type === 'technical'
  );
  
  // Экспортируем каждый
  const exported = technicalNodes.map(node => 
    exportTechnicalNodeForBackend(node)
  );
  
  // Отправляем на бэкенд
  const response = await fetch('/api/workflow/bulk-save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      states: exported
    })
  });
  
  if (response.ok) {
    console.log(`✅ Exported ${exported.length} technical node(s)`);
  }
  
  return response;
}
```

---

## 7. Expression Builder

### Палитра доступных функций

```javascript
import { 
  SAFE_FUNCTIONS_LIST, 
  getSafeFunctionsByCategory 
} from '@/utils/avitoDemoConverter';

function FunctionsPalette({ onInsert }) {
  const grouped = getSafeFunctionsByCategory();
  const [activeCategory, setActiveCategory] = useState('math');
  
  return (
    <div className="functions-palette">
      <div className="categories">
        {Object.keys(grouped).map(category => (
          <button
            key={category}
            className={activeCategory === category ? 'active' : ''}
            onClick={() => setActiveCategory(category)}
          >
            {category}
          </button>
        ))}
      </div>
      
      <div className="functions-list">
        {grouped[activeCategory]?.map(func => (
          <div 
            key={func.name} 
            className="function-item"
            onClick={() => onInsert(func.name)}
          >
            <code>{func.name}</code>
            <p>{func.description}</p>
            <small className="example">{func.example}</small>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Expression Builder с автодополнением

```javascript
function ExpressionBuilderWithAutocomplete({ 
  expression, 
  onChange, 
  contextVariables 
}) {
  const [suggestions, setSuggestions] = useState([]);
  
  const handleInput = (value, cursorPosition) => {
    // Получаем слово под курсором
    const wordMatch = value.slice(0, cursorPosition).match(/\w+$/);
    
    if (!wordMatch) {
      setSuggestions([]);
      return;
    }
    
    const prefix = wordMatch[0].toLowerCase();
    
    // Собираем предложения
    const varSuggestions = contextVariables
      .filter(v => v.toLowerCase().startsWith(prefix))
      .map(v => ({ type: 'variable', value: v }));
    
    const funcSuggestions = SAFE_FUNCTIONS_LIST
      .filter(f => f.name.toLowerCase().startsWith(prefix))
      .map(f => ({ type: 'function', value: f.name, info: f }));
    
    setSuggestions([...varSuggestions, ...funcSuggestions]);
  };
  
  return (
    <div className="expression-builder">
      <textarea
        value={expression}
        onChange={(e) => {
          onChange(e.target.value);
          handleInput(e.target.value, e.target.selectionStart);
        }}
      />
      
      {suggestions.length > 0 && (
        <div className="suggestions">
          {suggestions.map((s, idx) => (
            <div 
              key={idx} 
              className={`suggestion ${s.type}`}
              onClick={() => insertSuggestion(s)}
            >
              <code>{s.value}</code>
              {s.info && <span>{s.info.description}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## 8. Тестирование выражений

### Тестер выражений

```javascript
function ExpressionTester({ expression, contextSchema }) {
  const [testContext, setTestContext] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const handleTest = async () => {
    setLoading(true);
    
    try {
      const response = await fetch('/api/workflow/test-expression', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expression: expression.expression,
          context: testContext,
          return_type: expression.return_type
        })
      });
      
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ 
        success: false, 
        error: error.message 
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="expression-tester">
      <h3>Test Expression</h3>
      
      {/* Поля для ввода тестовых значений */}
      {expression.dependent_variables.map(varName => (
        <div key={varName} className="test-input">
          <label>{varName}</label>
          <input
            type={getInputType(contextSchema[varName]?.type)}
            value={testContext[varName] || ''}
            onChange={(e) => setTestContext({
              ...testContext,
              [varName]: e.target.value
            })}
          />
        </div>
      ))}
      
      <button onClick={handleTest} disabled={loading}>
        {loading ? 'Testing...' : 'Run Test'}
      </button>
      
      {result && (
        <div className={`result ${result.success ? 'success' : 'error'}`}>
          {result.success ? (
            <>
              <strong>Result:</strong> 
              <code>{JSON.stringify(result.result)}</code>
              <span>Type: {result.result_type}</span>
              {result.matches_expected_type ? (
                <span className="check">✓ Type matches</span>
              ) : (
                <span className="warning">⚠ Type mismatch</span>
              )}
            </>
          ) : (
            <>
              <strong>Error:</strong> {result.error}
            </>
          )}
        </div>
      )}
    </div>
  );
}
```

### История тестов

```javascript
function TestHistory({ expression }) {
  const [history, setHistory] = useState([]);
  
  const addTestResult = (testContext, result) => {
    setHistory([
      {
        timestamp: new Date(),
        input: testContext,
        output: result,
        success: result.success
      },
      ...history
    ]);
  };
  
  return (
    <div className="test-history">
      <h4>Test History</h4>
      {history.map((test, idx) => (
        <div key={idx} className="test-entry">
          <div className="timestamp">
            {test.timestamp.toLocaleTimeString()}
          </div>
          <div className="input">
            <strong>Input:</strong>
            <code>{JSON.stringify(test.input)}</code>
          </div>
          <div className="output">
            <strong>Output:</strong>
            <code>{JSON.stringify(test.output)}</code>
          </div>
          <div className={`status ${test.success ? 'success' : 'error'}`}>
            {test.success ? '✓' : '✗'}
          </div>
        </div>
      ))}
    </div>
  );
}
```

---

## 💡 Дополнительные примеры

### Пример 1: Email валидация

```javascript
const emailValidationNode = {
  id: 'email_validation',
  type: 'technical',
  name: 'EmailValidation',
  expressions: [
    {
      variable: 'email_valid',
      dependent_variables: ['user_email'],
      expression: 'is_not_none(user_email) and contains(user_email, "@") and contains(user_email, ".")',
      return_type: 'boolean',
      default_value: false,
      metadata: {
        description: 'Базовая валидация email адреса',
        category: 'validation',
        tags: ['email', 'validation']
      }
    }
  ],
  transitions: [
    { variable: 'email_valid', case: 'True', state_id: 'EmailVerifiedState' },
    { variable: 'email_valid', case: 'False', state_id: 'InvalidEmailState' }
  ]
};
```

### Пример 2: Расчет скидки

```javascript
const discountCalculationNode = {
  id: 'discount_calc',
  type: 'technical',
  name: 'DiscountCalculation',
  expressions: [
    {
      variable: 'final_price',
      dependent_variables: ['base_price', 'discount_percent', 'is_premium_member'],
      expression: 'round(base_price * (1 - discount_percent / 100) * (0.9 if is_premium_member else 1), 2)',
      return_type: 'float',
      default_value: 0.0,
      metadata: {
        description: 'Расчет финальной цены с учетом скидки и премиум-статуса',
        category: 'pricing',
        examples: [
          {
            input: { base_price: 100, discount_percent: 20, is_premium_member: true },
            output: 72.0,
            description: '100 - 20% скидка - 10% премиум = 72'
          }
        ]
      }
    }
  ],
  transitions: [
    { variable: 'final_price', case: 'True', state_id: 'CheckoutState' }
  ]
};
```

### Пример 3: Множественная верификация

```javascript
const multiFactorVerificationNode = {
  id: 'multi_factor_check',
  type: 'technical',
  name: 'MultiFactorVerification',
  expressions: [
    {
      variable: 'id_verified',
      dependent_variables: ['id_document'],
      expression: 'is_not_none(id_document) and len(id_document) > 0',
      return_type: 'boolean',
      default_value: false
    },
    {
      variable: 'email_verified',
      dependent_variables: ['email_confirmed_at'],
      expression: 'is_not_none(email_confirmed_at)',
      return_type: 'boolean',
      default_value: false
    },
    {
      variable: 'phone_verified',
      dependent_variables: ['phone_confirmed_at'],
      expression: 'is_not_none(phone_confirmed_at)',
      return_type: 'boolean',
      default_value: false
    }
  ],
  transitions: [
    {
      variables: ['id_verified', 'email_verified', 'phone_verified'],
      logic: 'all_true',
      state_id: 'FullyVerifiedState'
    },
    {
      variables: ['id_verified', 'email_verified', 'phone_verified'],
      logic: 'any_true',
      state_id: 'PartiallyVerifiedState'
    },
    {
      variables: ['id_verified', 'email_verified', 'phone_verified'],
      logic: 'none_true',
      state_id: 'NotVerifiedState'
    }
  ]
};
```

---

## 🔗 См. также

- [Документация конвертера](./TECHNICAL_STATES_CONVERTER.md)
- [Чеклист интеграции](./TECHNICAL_STATES_INTEGRATION_CHECKLIST.md)
- [Визуальная схема](./TECHNICAL_STATES_VISUAL_SCHEMA.md)
