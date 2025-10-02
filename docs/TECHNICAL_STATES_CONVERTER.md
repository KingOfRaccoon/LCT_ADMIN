# Конвертер технических состояний - Документация

## 📋 Обзор

Модуль `avitoDemoConverter.js` был расширен для поддержки новой архитектуры **технических состояний (technical states)** с улучшенной типизацией, валидацией и метаданными.

## 🎯 Основные возможности

### 1. Типизация результатов выражений

Каждое выражение теперь поддерживает:
- `return_type` - ожидаемый тип результата (`boolean`, `integer`, `float`, `string`, `list`, `dict`, `any`)
- `default_value` - значение по умолчанию при ошибке выполнения

```json
{
  "variable": "credit_approved",
  "expression": "annual_income > 75000 and debt_ratio < 0.3",
  "return_type": "boolean",
  "default_value": false
}
```

### 2. Метаданные для админ-панели

Выражения и состояния содержат подробные метаданные:

```json
{
  "metadata": {
    "description": "Проверяет кредитоспособность заявителя",
    "category": "credit_evaluation",
    "tags": ["credit", "approval"],
    "examples": [
      {
        "input": {"annual_income": 80000, "debt_ratio": 0.25},
        "output": true,
        "description": "Высокий доход - одобрено"
      }
    ],
    "author": "risk_team",
    "version": "2.1"
  }
}
```

### 3. Множественные переходы с явной логикой

Transitions поддерживают явную логику для множественных переменных:

```json
{
  "transitions": [
    {
      "variables": ["id_verified", "email_verified", "phone_verified"],
      "logic": "all_true",
      "state_id": "FullyVerifiedState"
    }
  ]
}
```

**Поддерживаемые типы логики:**
- `all_true` - все переменные должны быть True
- `any_true` - хотя бы одна переменная True
- `none_true` - все переменные должны быть False
- `all_false` - синоним `none_true`
- `exactly_one_true` - ровно одна переменная True

### 4. Валидация технических узлов

Встроенная валидация проверяет:
- ✅ Синтаксис выражений
- ✅ Существование dependent_variables в контексте
- ✅ Запрещенные конструкции (`__`, `import`, `eval`, и т.д.)
- ✅ Длину выражений (максимум 1000 символов)
- ✅ Корректность transitions (все переменные определены в expressions)
- ✅ Логику для множественных переменных

## 🔧 API конвертера

### Основные функции преобразования

#### `convertAvitoDemoNodesToReactFlow(nodes)`

Преобразует узлы из avitoDemo.json в формат React Flow с поддержкой технических состояний.

**Возвращает:**
- `id`, `type`, `position` - базовые поля React Flow
- `data.expressions` - массив нормализованных выражений
- `data.transitions` - массив нормализованных переходов
- `data.stateMetadata` - метаданные состояния

#### `convertAvitoDemoEdgesToReactFlow(nodes)`

Преобразует рёбра (edges/transitions) в формат React Flow.

**Для технических узлов:**
- Генерирует лейблы на основе логики (`ALL TRUE`, `ANY TRUE`, и т.д.)
- Добавляет `data.transitionType = 'technical'`
- Сохраняет `logic`, `variables`, `case`

### Функции валидации

#### `validateTechnicalExpression(expression, contextSchema)`

Валидирует одно выражение.

**Проверки:**
- Обязательные поля (`variable`, `expression`)
- Корректность `return_type`
- Существование `dependent_variables` в схеме контекста
- Запрещенные конструкции
- Длина выражения

**Возвращает:** Массив ошибок (пустой если всё ОК)

```javascript
const errors = validateTechnicalExpression(
  {
    variable: 'is_valid',
    expression: 'age >= 18',
    dependent_variables: ['age'],
    return_type: 'boolean'
  },
  { age: { type: 'integer' } }
);

if (errors.length > 0) {
  console.error('Validation failed:', errors);
}
```

#### `validateTechnicalNode(technicalNode, contextSchema)`

Валидирует весь технический узел (все выражения + transitions).

**Возвращает:** `{ valid: boolean, errors: Array }`

```javascript
const validation = validateTechnicalNode(node, contextSchema);

if (!validation.valid) {
  console.error('Node validation failed:', validation.errors);
}
```

### Функции работы с метаданными

#### `extractTechnicalNodeMetadata(technicalNode)`

Извлекает краткую метаинформацию для отображения в UI.

**Возвращает:**
```javascript
{
  name: 'CreditScoreEvaluation',
  description: 'Проверка кредитоспособности',
  category: 'credit_evaluation',
  tags: ['credit', 'approval'],
  expressionsCount: 3,
  transitionsCount: 2,
  expressions: [
    {
      variable: 'credit_approved',
      returnType: 'boolean',
      hasMetadata: true,
      description: 'Комплексная оценка',
      examplesCount: 3
    }
  ]
}
```

#### `generateExpressionDocumentation(expression)`

Генерирует Markdown документацию для выражения.

**Пример использования:**
```javascript
const doc = generateExpressionDocumentation(expression);
console.log(doc);
```

**Результат:**
```markdown
### credit_approved

**Описание:** Комплексная оценка кредитоспособности

**Тип результата:** `boolean`

**Значение по умолчанию:** `false`

**Выражение:**
```javascript
annual_income > 75000 and debt_ratio < 0.3
```

**Зависимые переменные:**
- `annual_income`
- `debt_ratio`

**Примеры:**

1. Высокий доход - одобрено
   - Входные данные: `{"annual_income": 80000, "debt_ratio": 0.25}`
   - Результат: `true`
```

#### `generateTechnicalNodeDocumentation(technicalNode)`

Генерирует полную Markdown документацию для технического узла.

### Функции экспорта

#### `exportTechnicalNodeForBackend(reactFlowNode)`

Преобразует React Flow узел в формат для отправки на бэкенд.

**Пример:**
```javascript
const backendFormat = exportTechnicalNodeForBackend(reactFlowNode);

// Отправка на сервер
await fetch('/api/workflow/save', {
  method: 'POST',
  body: JSON.stringify({ states: [backendFormat] })
});
```

#### `createTechnicalNodeTemplate(name)`

Создает шаблон технического узла с примерами для быстрого старта.

```javascript
const template = createTechnicalNodeTemplate('MyNewState');
// template готов к редактированию в UI
```

### Справочные функции

#### `SAFE_FUNCTIONS_LIST`

Массив всех доступных безопасных функций для использования в выражениях.

**Структура:**
```javascript
{
  name: 'upper',
  category: 'string',
  description: 'Преобразование в верхний регистр',
  example: 'upper("hello") => "HELLO"'
}
```

**Категории:**
- `math` - математические функции (abs, round, min, max, sum, pow)
- `string` - строковые функции (upper, lower, strip, startswith, endswith, contains)
- `collection` - функции для коллекций (len, any, all, sorted, reversed)
- `check` - проверки (is_none, is_not_none, is_empty)
- `dict` - работа со словарями (get, keys, values)
- `cast` - преобразования типов (int, float, str, bool)

#### `getSafeFunctionsByCategory()`

Возвращает функции, сгруппированные по категориям для отображения в UI.

```javascript
const grouped = getSafeFunctionsByCategory();

// Отображение в UI
Object.entries(grouped).forEach(([category, functions]) => {
  console.log(`${category}:`);
  functions.forEach(func => {
    console.log(`  ${func.name}: ${func.description}`);
  });
});
```

## 📊 Примеры использования

### Загрузка с валидацией

```javascript
import { loadAvitoDemoAsGraphData } from './utils/avitoDemoConverter.js';

// Загрузка с валидацией и подробным выводом
const data = await loadAvitoDemoAsGraphData({ 
  validate: true, 
  verbose: true 
});

if (data.validation.errors.length > 0) {
  console.error('Validation errors:', data.validation.errors);
} else {
  console.log(`Successfully loaded ${data.validation.technicalNodesCount} technical node(s)`);
}
```

### Преобразование для VirtualContext

```javascript
import { convertAvitoDemoToVirtualContext } from './utils/avitoDemoConverter.js';

const virtualContextData = convertAvitoDemoToVirtualContext(
  avitoDemoJson, 
  { validate: true }
);

if (!virtualContextData.validation.valid) {
  // Показываем ошибки в UI
  showValidationErrors(virtualContextData.validation.errors);
}

// Загружаем в VirtualContext
dispatch({ 
  type: 'LOAD_GRAPH_DATA', 
  payload: virtualContextData.graphData 
});
```

### Создание нового технического узла в UI

```javascript
import { 
  createTechnicalNodeTemplate,
  validateTechnicalNode,
  exportTechnicalNodeForBackend
} from './utils/avitoDemoConverter.js';

// 1. Создаём шаблон
const newNode = createTechnicalNodeTemplate('EmailValidation');

// 2. Пользователь редактирует в UI
newNode.expressions[0] = {
  variable: 'email_valid',
  dependent_variables: ['user_email'],
  expression: 'is_not_none(user_email) and contains(user_email, "@")',
  return_type: 'boolean',
  default_value: false,
  metadata: {
    description: 'Проверка корректности email',
    category: 'validation',
    tags: ['email', 'validation']
  }
};

newNode.transitions = [
  { variable: 'email_valid', case: 'True', state_id: 'NextState' },
  { variable: 'email_valid', case: 'False', state_id: 'ErrorState' }
];

// 3. Валидация перед сохранением
const validation = validateTechnicalNode(newNode, contextSchema);

if (!validation.valid) {
  alert('Validation failed: ' + validation.errors.join(', '));
  return;
}

// 4. Экспорт для бэкенда
const backendFormat = exportTechnicalNodeForBackend(
  convertToReactFlowNode(newNode)
);

// 5. Сохранение
await saveToBackend(backendFormat);
```

### Отображение документации в UI

```javascript
import { 
  generateTechnicalNodeDocumentation,
  generateExpressionDocumentation 
} from './utils/avitoDemoConverter.js';

// Генерация документации для всего узла
const nodeDoc = generateTechnicalNodeDocumentation(technicalNode);

// Отображение в Markdown-вьювере
<MarkdownViewer content={nodeDoc} />

// Или для отдельного выражения
const exprDoc = generateExpressionDocumentation(expression);
```

### Показ доступных функций в Expression Builder

```javascript
import { 
  SAFE_FUNCTIONS_LIST, 
  getSafeFunctionsByCategory 
} from './utils/avitoDemoConverter.js';

const FunctionsPalette = () => {
  const grouped = getSafeFunctionsByCategory();

  return (
    <div className="functions-palette">
      {Object.entries(grouped).map(([category, functions]) => (
        <div key={category} className="category">
          <h3>{category}</h3>
          {functions.map(func => (
            <div key={func.name} className="function-item">
              <code>{func.name}</code>
              <p>{func.description}</p>
              <small>{func.example}</small>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};
```

## 🔄 Обратная совместимость

Конвертер полностью обратно совместим:

- **Старый формат без `return_type`**: автоматически устанавливается `'boolean'`
- **Старый формат transitions без `logic`**: для множественных переменных используется `'any_true'`
- **Отсутствие метаданных**: функции возвращают `null` или пустые значения
- **Смешанный формат** (`variable` как строка/массив): автоматически нормализуется в `variables` массив

## ⚠️ Важные замечания

1. **Валидация не блокирует загрузку**: Даже при наличии ошибок данные загружаются, но в `validation.errors` сохраняются проблемы
2. **Синхронность с бэкендом**: Убедитесь, что `SAFE_FUNCTIONS_LIST` совпадает с функциями на сервере
3. **Длина выражений**: Максимум 1000 символов - согласовано с бэкендом
4. **Безопасность**: Запрещенные конструкции блокируются на этапе валидации

## 🔗 Связанные файлы

- `/src/utils/avitoDemoConverter.js` - основной модуль
- `/src/pages/Sandbox/data/avitoDemo.json` - исходные данные
- `/server/js/server.js` - серверная реализация (Node.js)
- `/server/main.py` - серверная реализация (Python)
- `/docs/declarative-refactoring.md` - описание архитектуры

## 📚 См. также

- [Декларативная архитектура](./declarative-refactoring.md)
- [Sandbox Navigation Guide](./sandbox-navigation-guide.md)
- [Workflow API Integration](./workflow-api-integration.md)
