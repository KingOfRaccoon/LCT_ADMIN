# 🔧 Fix: Transitions.case должен содержать event_name для screen состояний

**Дата:** 1 октября 2025  
**Файл:** `src/utils/workflowMapper.js`  
**Приоритет:** HIGH (Contract Compliance)

---

## 🐛 Проблема

В функции `createTransitions()` для **screen состояний** поле `case` заполнялось некорректно:

```javascript
// ❌ БЫЛО:
const condition = edge.data?.case || edge.data?.condition;
if (condition) {
  transition.case = condition;
} else {
  transition.case = null;
}
```

Это не соответствовало серверному контракту, где для screen состояний `case` должно содержать `event_name`.

---

## ✅ Решение

Разделили логику создания transitions по типу состояния:

### 1. Integration State

```javascript
if (stateType === 'integration') {
  // Integration всегда имеет ровно 1 transition с case=null
  transitions.push({
    state_id: targetStateName,
    case: null // ✅ Всегда null для integration
  });
}
```

### 2. Screen State ⭐

```javascript
else if (stateType === 'screen') {
  // Screen: case = event_name из ребра
  outgoingEdges.forEach(edge => {
    const eventName = edge.data?.event || edge.label || null;
    
    transitions.push({
      state_id: targetStateName,
      case: eventName // ✅ event_name для screen состояний
    });
  });
}
```

### 3. Technical/Service States

```javascript
else {
  // Technical и service: case = condition/variable
  outgoingEdges.forEach(edge => {
    const condition = edge.data?.case || edge.data?.condition;
    
    transition.case = condition || null; // ✅ condition для technical
    
    if (edge.data?.variable) {
      transition.variable = edge.data.variable;
    }
  });
}
```

---

## 📊 Примеры изменений

### Пример 1: Screen State с событием "checkout"

**Было:**
```json
{
  "state_type": "screen",
  "name": "Корзина",
  "transitions": [
    {
      "state_id": "Оформление заказа",
      "case": null // ❌ Неправильно!
    }
  ]
}
```

**Стало:**
```json
{
  "state_type": "screen",
  "name": "Корзина",
  "transitions": [
    {
      "state_id": "Оформление заказа",
      "case": "checkout" // ✅ event_name из ребра
    }
  ],
  "expressions": [
    {
      "event_name": "checkout"
    }
  ]
}
```

### Пример 2: Technical State с условием

**Было и осталось:**
```json
{
  "state_type": "technical",
  "name": "Проверка корзины",
  "transitions": [
    {
      "state_id": "Корзина не пуста",
      "case": "cart.items.length > 0", // ✅ condition
      "variable": "isCartEmpty"
    },
    {
      "state_id": "Корзина пуста",
      "case": null // ✅ default case
    }
  ]
}
```

### Пример 3: Integration State

**Было и осталось:**
```json
{
  "state_type": "integration",
  "name": "API: Получить данные",
  "transitions": [
    {
      "state_id": "Обработка результата",
      "case": null // ✅ Всегда null для integration
    }
  ]
}
```

---

## 🧪 Тестирование

### Тест 1: Screen State

```javascript
const graphData = {
  nodes: [
    {
      id: 'screen-1',
      type: 'screen',
      data: { label: 'Корзина', screenId: 'cart' }
    },
    {
      id: 'screen-2',
      type: 'screen',
      data: { label: 'Оформление', screenId: 'checkout' }
    }
  ],
  edges: [
    {
      source: 'screen-1',
      target: 'screen-2',
      data: { event: 'checkout' } // ⭐ event_name
    }
  ],
  screens: { /* ... */ }
};

const result = mapGraphDataToWorkflow(graphData);
const screen1 = result.states.find(s => s.name === 'Корзина');

console.assert(
  screen1.transitions[0].case === 'checkout',
  '❌ case должен быть "checkout"'
);
// ✅ PASS
```

### Тест 2: Multiple Events на Screen

```javascript
const graphData = {
  nodes: [
    {
      id: 'screen-1',
      type: 'screen',
      data: { label: 'Товар', screenId: 'product' }
    },
    { id: 'screen-2', data: { label: 'Корзина' } },
    { id: 'screen-3', data: { label: 'Избранное' } }
  ],
  edges: [
    {
      source: 'screen-1',
      target: 'screen-2',
      data: { event: 'add_to_cart' }
    },
    {
      source: 'screen-1',
      target: 'screen-3',
      data: { event: 'add_to_favorites' }
    }
  ],
  screens: { /* ... */ }
};

const result = mapGraphDataToWorkflow(graphData);
const productScreen = result.states.find(s => s.name === 'Товар');

console.assert(
  productScreen.transitions.length === 2,
  '❌ Должно быть 2 перехода'
);

console.assert(
  productScreen.transitions[0].case === 'add_to_cart',
  '❌ Первый case должен быть "add_to_cart"'
);

console.assert(
  productScreen.transitions[1].case === 'add_to_favorites',
  '❌ Второй case должен быть "add_to_favorites"'
);
// ✅ PASS
```

---

## 📝 Серверный контракт

Согласно `docs/integration-guide.md` и `docs/workflow-integration-example.md`:

### Screen State Transitions

```typescript
interface Transition {
  state_id: string;
  case: string | null; // event_name для screen, condition для technical
  variable?: string;   // Только для technical
}
```

**Screen state:**
- `case` = `event_name` (название события из `expressions`)
- Несколько transitions = несколько событий
- Каждый transition = один обработчик события

**Technical state:**
- `case` = condition (логическое выражение)
- `variable` = переменная для проверки
- Несколько transitions = разные ветки условия

**Integration state:**
- Всегда 1 transition
- `case` = `null` (безусловный переход после API вызова)

---

## ✅ Результат

1. ✅ **Screen states** теперь имеют `case = event_name`
2. ✅ **Technical states** используют `case = condition`
3. ✅ **Integration states** имеют `case = null`
4. ✅ Соответствие серверному контракту
5. ✅ Правильная обработка событий на бэкенде

---

## 🔗 Связанные файлы

- `src/utils/workflowMapper.js` - основной файл с исправлением
- `docs/integration-guide.md` - описание контракта
- `docs/workflow-integration-example.md` - примеры использования
- `src/services/clientWorkflowApi.js` - клиент API

---

**Статус:** ✅ ИСПРАВЛЕНО  
**Testing:** Требуется интеграционное тестирование с сервером  
**Breaking Changes:** НЕТ (улучшение контракта)
