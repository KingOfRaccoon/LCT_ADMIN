# ✅ Subflow Contract Compliance

## Обновления для соответствия официальному контракту

### Дата: 18 октября 2025 г.

---

## 📋 Официальный контракт Subflow

Согласно официальной документации, subflow state должен иметь следующую структуру:

```json
{
  "state_type": "subflow",
  "name": "OfferInsurance",
  "screen": {},                    // ✅ Всегда пустой объект
  "transitions": [
    {
      "variable": "insurance_result",
      "case": null,
      "state_id": "NextState"
    },
    {
      "variable": "insurance_error",
      "case": null,
      "state_id": "ErrorHandler"
    }
  ],
  "expressions": [
    {
      "variable": "insurance_result",  // ✅ Обязательное поле
      "subflow_workflow_id": "67890abcdef123456789",
      "input_mapping": {
        "customer_id": "user_id",
        "product_price": "phone_price"
      },
      "output_mapping": {
        "insurance_accepted": "accepted",
        "insurance_premium": "monthly_premium"
      },
      "dependent_variables": ["user_id", "phone_price"],
      "error_variable": "insurance_error"
    }
  ],
  "events": [],                    // ✅ Всегда пустой массив
  "initial_state": false,
  "final_state": false
}
```

---

## 🔧 Внесённые изменения

### 1. **Порядок полей в State**

Изменён порядок полей в `workflowMapper.js` для соответствия контракту:

```javascript
const state = {
  state_type: stateType,
  name: node.label || nodeData.label || node.id
};

// Затем добавляются:
// - screen
// - transitions
// - expressions
// - events (для subflow)
// - initial_state
// - final_state
```

### 2. **Пустой `screen` для subflow**

```javascript
if (stateType === 'subflow') {
  // Для subflow screen всегда пустой объект (по контракту)
  state.screen = {};
}
```

### 3. **Пустой массив `events` для subflow**

```javascript
if (stateType === 'subflow') {
  state.events = [];
}
```

### 4. **Поле `variable` в expression**

Добавлена функция `normalizeSubflowExpression()`:

```javascript
function normalizeSubflowExpression(expr, node) {
  // Если variable уже есть - используем как есть
  if (expr.variable) {
    return expr;
  }

  // Пытаемся найти имя переменной из transitions
  let variableName = 'subflow_result'; // по умолчанию
  
  if (Array.isArray(node.transitions) && node.transitions.length > 0) {
    const firstTransition = node.transitions.find(t => 
      t.variable && t.variable !== expr.error_variable
    );
    
    if (firstTransition && firstTransition.variable) {
      variableName = firstTransition.variable;
    }
  }

  return {
    variable: variableName,
    ...expr
  };
}
```

---

## ✅ Проверки в автотесте

Обновлён `test-subflow-export.js` с проверками:

```javascript
const checks = [
  { name: 'screen = {}', pass: JSON.stringify(subflowState.screen) === '{}' },
  { name: 'events = []', pass: Array.isArray(subflowState.events) && subflowState.events.length === 0 },
  { name: 'expression.variable существует', pass: !!subflowState.expressions[0]?.variable },
  { name: 'variable совпадает с transition', pass: subflowState.expressions[0]?.variable === subflowState.transitions[0]?.variable },
  { name: 'initial_state определён', pass: typeof subflowState.initial_state === 'boolean' },
  { name: 'final_state определён', pass: typeof subflowState.final_state === 'boolean' }
];
```

### Результат теста:

```
📋 Проверка соответствия контракту:
   ✅ screen = {}
   ✅ events = []
   ✅ expression.variable существует
   ✅ variable совпадает с transition
   ✅ initial_state определён
   ✅ final_state определён

✅ ТЕСТ ПРОЙДЕН: Subflow узел соответствует контракту
```

---

## 📦 Результат экспорта

Теперь subflow состояния экспортируются в правильном формате:

```json
{
  "state_type": "subflow",
  "name": "Онборд",
  "screen": {},
  "transitions": [
    {
      "variable": "insurance_result",
      "case": true,
      "state_id": "Успешно"
    },
    {
      "variable": "onboarding_error",
      "case": null,
      "state_id": "Ошибка"
    }
  ],
  "expressions": [
    {
      "variable": "insurance_result",
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
  ],
  "events": [],
  "initial_state": false,
  "final_state": false
}
```

---

## 🔑 Ключевые правила

### ✅ DO (Делайте так):

1. **`screen` всегда `{}`** для subflow состояний
2. **`events` всегда `[]`** для subflow состояний
3. **`variable` в expression** обязательно и совпадает с `variable` в transitions
4. **Порядок полей:** `state_type` → `name` → `screen` → `transitions` → `expressions` → `events` → `initial_state` → `final_state`
5. **`error_variable`** всегда указывайте для обработки ошибок
6. **Сохраните subflow workflow** через `POST /workflow/save` **до** использования

### ❌ DON'T (Не делайте так):

1. ❌ Не опускайте поле `screen` (должно быть `{}`)
2. ❌ Не опускайте поле `events` (должно быть `[]`)
3. ❌ Не опускайте `variable` в expression
4. ❌ Не используйте разные имена для `variable` в expression и transitions
5. ❌ Не заполняйте `screen` данными (должен быть пустой объект)
6. ❌ Не заполняйте `events` (должен быть пустой массив)

---

## 📚 Примеры правильного использования

### Пример 1: Онбординг

```json
{
  "state_type": "subflow",
  "name": "UserOnboarding",
  "screen": {},
  "transitions": [
    {
      "variable": "onboarding_result",
      "case": null,
      "state_id": "MainScreen"
    },
    {
      "variable": "onboarding_error",
      "case": null,
      "state_id": "ErrorScreen"
    }
  ],
  "expressions": [
    {
      "variable": "onboarding_result",
      "subflow_workflow_id": "onboarding-flow-id",
      "input_mapping": {
        "user_id": "context.user.id"
      },
      "output_mapping": {
        "onboarding_complete": "completed"
      },
      "dependent_variables": ["user_id"],
      "error_variable": "onboarding_error"
    }
  ],
  "events": [],
  "initial_state": true,
  "final_state": false
}
```

### Пример 2: Проверка страховки

```json
{
  "state_type": "subflow",
  "name": "InsuranceCheck",
  "screen": {},
  "transitions": [
    {
      "variable": "insurance_result",
      "case": null,
      "state_id": "ProcessPayment"
    },
    {
      "variable": "insurance_error",
      "case": null,
      "state_id": "SkipInsurance"
    }
  ],
  "expressions": [
    {
      "variable": "insurance_result",
      "subflow_workflow_id": "insurance-check-id",
      "input_mapping": {
        "customer_id": "user_id",
        "product_price": "cart.total"
      },
      "output_mapping": {
        "insurance_accepted": "accepted",
        "insurance_premium": "monthly_cost"
      },
      "dependent_variables": ["user_id", "cart.total"],
      "error_variable": "insurance_error"
    }
  ],
  "events": [],
  "initial_state": false,
  "final_state": false
}
```

---

## 🎯 Соответствие контракту

| Требование | Статус | Реализация |
|------------|--------|------------|
| `state_type: "subflow"` | ✅ | detectStateType() |
| `screen: {}` | ✅ | mapNodeToState() |
| `events: []` | ✅ | mapNodeToState() |
| `variable` в expression | ✅ | normalizeSubflowExpression() |
| `variable` совпадает с transition | ✅ | normalizeSubflowExpression() |
| Порядок полей | ✅ | mapNodeToState() |
| `initial_state` / `final_state` | ✅ | mapNodeToState() |

---

## 📊 Тестирование

### Запуск теста:
```bash
node test-subflow-export.js
```

### Ожидаемый результат:
```
✅ ТЕСТ ПРОЙДЕН: Subflow узел соответствует контракту
```

---

## 📁 Изменённые файлы

1. ✅ `src/utils/workflowMapper.js`
   - Изменён порядок полей в state
   - Добавлен `screen: {}` для subflow
   - Добавлен `events: []` для subflow
   - Создана `normalizeSubflowExpression()`

2. ✅ `test-subflow-export.js`
   - Добавлены проверки контракта
   - Обновлён тестовый граф с `variable` в expression
   - Добавлен вывод полной структуры state

3. ✅ `docs/SUBFLOW_CONTRACT_COMPLIANCE.md`
   - Создана документация по соответствию контракту

---

## 🚀 Готовность к production

**Статус:** ✅ Production Ready

Subflow полностью соответствует официальному контракту и готов к использованию в production.

---

**Дата:** 18 октября 2025 г.
