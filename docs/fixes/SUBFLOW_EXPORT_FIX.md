# Subflow Export Fix 🔧

## Проблема
При экспорте workflow с subflow узлами, они конвертировались как обычные `screen` состояния вместо `subflow`.

## Причина
В функции `detectStateType` в `workflowMapper.js` отсутствовала проверка типа `subflow`.

## Решение

### 1. Добавлена проверка типа subflow в `detectStateType()`

```javascript
function detectStateType(node) {
  const nodeType = node.type?.toLowerCase();
  const nodeData = node.data || {};
  const stateType = node.state_type?.toLowerCase();

  // Прямая проверка state_type или type
  if (stateType === 'integration' || nodeType === 'integration') {
    return 'integration';
  }
  if (stateType === 'technical' || nodeType === 'technical') {
    return 'technical';
  }
  if (stateType === 'subflow' || nodeType === 'subflow') {  // ✅ ДОБАВЛЕНО
    return 'subflow';
  }
  // ...
}
```

### 2. Создана функция `createSubflowExpressions()`

```javascript
/**
 * Создает expressions для subflow состояния
 * @param {Object} node - Узел целиком
 * @param {Object} nodeData - Данные узла
 * @returns {SubflowExpression[]}
 */
function createSubflowExpressions(node, nodeData) {
  // Если expressions уже есть на верхнем уровне узла - используем их
  if (Array.isArray(node.expressions) && node.expressions.length > 0) {
    return node.expressions;
  }

  // Если expressions в nodeData - используем их
  if (Array.isArray(nodeData.expressions) && nodeData.expressions.length > 0) {
    return nodeData.expressions;
  }

  // Создаём из config или data
  const config = nodeData.config || nodeData;
  const expressions = [];

  if (config.subflow_workflow_id) {
    const expr = {
      subflow_workflow_id: config.subflow_workflow_id,
      input_mapping: config.input_mapping || {},
      output_mapping: config.output_mapping || {},
      dependent_variables: config.dependent_variables || [],
      error_variable: config.error_variable || null
    };
    
    expressions.push(expr);
  }

  return expressions;
}
```

### 3. Добавлен вызов в `mapNodeToState()`

```javascript
// Создаем expressions в зависимости от типа
let expressions = [];
if (stateType === 'technical') {
  expressions = createTechnicalExpressions(nodeData);
} else if (stateType === 'integration') {
  expressions = createIntegrationExpressions(node, nodeData);
} else if (stateType === 'subflow') {  // ✅ ДОБАВЛЕНО
  expressions = createSubflowExpressions(node, nodeData);
} else if (stateType === 'screen') {
  expressions = createScreenExpressions(nodeData, outgoingEdges);
}
```

## Проверка

### Тестовый скрипт: `test-subflow-export.js`

Создан автотест, который проверяет:
- ✅ Subflow узлы экспортируются с `state_type: "subflow"`
- ✅ Сохраняются все поля expression (subflow_workflow_id, input_mapping, output_mapping, dependent_variables, error_variable)
- ✅ Transitions корректно маппятся на целевые состояния

### Результат теста

```
✅ ТЕСТ ПРОЙДЕН: Subflow узел корректно экспортирован как state_type="subflow"

📊 Статистика:
   - Всего состояний: 4
   - State types: screen, subflow, screen, screen

📝 Expression детали:
{
  "subflow_workflow_id": "onboarding-flow",
  "input_mapping": {
    "user_id": "context.user.id",
    "session_token": "context.session.token"
  },
  "output_mapping": {
    "subflow.onboarding_complete": "context.onboarding.status",
    "subflow.user_preferences": "context.user.preferences"
  },
  "dependent_variables": ["user_id", "session_token"],
  "error_variable": "onboarding_error"
}
```

## Поддерживаемые форматы

Subflow узлы теперь корректно обрабатываются в следующих форматах:

### 1. С type на уровне узла
```json
{
  "id": "onboarding-subflow",
  "type": "subflow",
  "data": { ... }
}
```

### 2. С state_type на уровне узла
```json
{
  "id": "onboarding-subflow",
  "state_type": "subflow",
  "data": { ... }
}
```

### 3. С expressions на верхнем уровне
```json
{
  "id": "onboarding-subflow",
  "type": "subflow",
  "expressions": [{
    "subflow_workflow_id": "...",
    "input_mapping": { ... }
  }],
  "transitions": [ ... ]
}
```

### 4. С expressions в data
```json
{
  "id": "onboarding-subflow",
  "type": "subflow",
  "data": {
    "expressions": [ ... ]
  }
}
```

### 5. С config в data
```json
{
  "id": "onboarding-subflow",
  "type": "subflow",
  "data": {
    "config": {
      "subflow_workflow_id": "...",
      "input_mapping": { ... }
    }
  }
}
```

## Файлы изменены

1. ✅ `src/utils/workflowMapper.js`
   - Добавлена проверка `subflow` в `detectStateType()`
   - Создана функция `createSubflowExpressions()`
   - Добавлена обработка в `mapNodeToState()`

2. ✅ `test-subflow-export.js`
   - Создан автотест для проверки экспорта

## Совместимость

Изменения **обратно совместимы**:
- Все существующие типы узлов (screen, technical, integration, service) работают как прежде
- Добавлена поддержка нового типа `subflow`
- Transitions и expressions корректно обрабатываются

## Дата
18 октября 2025 г.
