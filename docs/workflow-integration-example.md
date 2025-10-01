# Примеры использования Workflow Integration

## 📘 Обзор

Этот документ содержит практические примеры использования интеграции BDUI Admin с серверным Workflow API.

---

## 🎯 Базовый пример: Экспорт простого flow

### Шаг 1: Создайте flow в ScreenEditor

```javascript
// В ScreenEditor создайте простой граф:
// 1. Узел "start" (type: screen)
// 2. Узел "end" (type: screen)
// 3. Ребро от start к end с событием "next"
```

### Шаг 2: Экспортируйте в серверный формат

Нажмите кнопку **"Export to Server"** в ScreenEditor.

**Внутренняя структура BDUI (graphData):**
```json
{
  "nodes": [
    {
      "id": "start",
      "type": "screen",
      "data": {
        "label": "Начальный экран",
        "screenId": "screen-start",
        "start": true
      }
    },
    {
      "id": "end",
      "type": "screen",
      "data": {
        "label": "Конечный экран",
        "final": true
      }
    }
  ],
  "edges": [
    {
      "id": "edge-1",
      "source": "start",
      "target": "end",
      "data": {
        "event": "next",
        "label": "Далее"
      }
    }
  ]
}
```

**Преобразованный серверный формат (StateModel[]):**
```json
{
  "states": {
    "states": [
      {
        "state_type": "screen",
        "name": "Начальный экран",
        "initial_state": true,
        "final_state": false,
        "expressions": [
          { "event_name": "next" }
        ],
        "transitions": [
          { "state_id": "Конечный экран", "case": null }
        ]
      },
      {
        "state_type": "screen",
        "name": "Конечный экран",
        "initial_state": false,
        "final_state": true,
        "expressions": [],
        "transitions": []
      }
    ]
  },
  "predefined_context": {}
}
```

---

## 🔧 Пример с Action узлом (API вызов)

### BDUI Flow:

```javascript
// Узлы:
// 1. "loading" (screen) - начальный
// 2. "api-call" (action, actionType: api-call) - интеграция
// 3. "success" (screen) - финальный
```

**BDUI graphData:**
```json
{
  "nodes": [
    {
      "id": "loading",
      "type": "screen",
      "data": { "label": "Загрузка", "start": true }
    },
    {
      "id": "api-call",
      "type": "action",
      "data": {
        "label": "Запрос данных",
        "actionType": "api-call",
        "config": {
          "url": "https://api.example.com/data",
          "method": "GET",
          "params": { "userId": "${user.id}" },
          "resultVariable": "apiData"
        }
      }
    },
    {
      "id": "success",
      "type": "screen",
      "data": { "label": "Успех", "final": true }
    }
  ],
  "edges": [
    { "source": "loading", "target": "api-call", "data": { "event": "load" } },
    { "source": "api-call", "target": "success" }
  ]
}
```

**Серверный формат:**
```json
{
  "states": {
    "states": [
      {
        "state_type": "screen",
        "name": "Загрузка",
        "initial_state": true,
        "final_state": false,
        "expressions": [{ "event_name": "load" }],
        "transitions": [{ "state_id": "Запрос данных", "case": null }]
      },
      {
        "state_type": "integration",
        "name": "Запрос данных",
        "initial_state": false,
        "final_state": false,
        "expressions": [
          {
            "variable": "apiData",
            "url": "https://api.example.com/data",
            "params": { "userId": "${user.id}" },
            "method": "get"
          }
        ],
        "transitions": [
          { "state_id": "Успех", "case": null }
        ]
      },
      {
        "state_type": "screen",
        "name": "Успех",
        "initial_state": false,
        "final_state": true,
        "expressions": [],
        "transitions": []
      }
    ]
  },
  "predefined_context": {
    "user": { "id": "123" }
  }
}
```

---

## 🧮 Пример с Technical узлом (вычисления)

### BDUI Flow с модификацией корзины:

**BDUI graphData:**
```json
{
  "nodes": [
    {
      "id": "cart",
      "type": "screen",
      "data": { "label": "Корзина", "start": true }
    },
    {
      "id": "modify-cart",
      "type": "action",
      "data": {
        "label": "Изменить количество",
        "actionType": "modify-cart-item",
        "config": {
          "itemId": "${inputs.itemId}",
          "delta": "${inputs.delta}"
        }
      }
    },
    {
      "id": "cart-updated",
      "type": "screen",
      "data": { "label": "Корзина обновлена", "final": true }
    }
  ],
  "edges": [
    { "source": "cart", "target": "modify-cart", "data": { "event": "changeQuantity" } },
    { "source": "modify-cart", "target": "cart-updated" }
  ]
}
```

**Серверный формат:**
```json
{
  "states": {
    "states": [
      {
        "state_type": "screen",
        "name": "Корзина",
        "initial_state": true,
        "final_state": false,
        "expressions": [{ "event_name": "changeQuantity" }],
        "transitions": [{ "state_id": "Изменить количество", "case": null }]
      },
      {
        "state_type": "technical",
        "name": "Изменить количество",
        "initial_state": false,
        "final_state": false,
        "expressions": [
          {
            "variable": "cart.items",
            "dependent_variables": ["cart.items", "inputs.itemId", "inputs.delta"],
            "expression": "modifyCartItem(cart.items, inputs.itemId, inputs.delta)"
          }
        ],
        "transitions": [
          { "state_id": "Корзина обновлена", "case": null }
        ]
      },
      {
        "state_type": "screen",
        "name": "Корзина обновлена",
        "initial_state": false,
        "final_state": true,
        "expressions": [],
        "transitions": []
      }
    ]
  },
  "predefined_context": {
    "cart": {
      "items": [
        { "id": "item-1", "quantity": 1 }
      ]
    },
    "inputs": {
      "itemId": "item-1",
      "delta": 1
    }
  }
}
```

---

## 🔀 Пример с условными переходами (Condition)

**BDUI graphData:**
```json
{
  "nodes": [
    {
      "id": "check",
      "type": "action",
      "data": {
        "label": "Проверка возраста",
        "actionType": "condition",
        "config": {
          "condition": "user.age >= 18",
          "dependencies": ["user.age"],
          "resultVariable": "isAdult"
        }
      }
    },
    {
      "id": "adult",
      "type": "screen",
      "data": { "label": "Доступ разрешен", "final": true }
    },
    {
      "id": "minor",
      "type": "screen",
      "data": { "label": "Доступ запрещен", "final": true }
    }
  ],
  "edges": [
    {
      "source": "check",
      "target": "adult",
      "data": { "case": "isAdult === true" }
    },
    {
      "source": "check",
      "target": "minor",
      "data": { "case": "isAdult === false" }
    }
  ]
}
```

**Серверный формат:**
```json
{
  "states": {
    "states": [
      {
        "state_type": "technical",
        "name": "Проверка возраста",
        "initial_state": true,
        "final_state": false,
        "expressions": [
          {
            "variable": "isAdult",
            "dependent_variables": ["user.age"],
            "expression": "user.age >= 18"
          }
        ],
        "transitions": [
          {
            "state_id": "Доступ разрешен",
            "case": "isAdult === true"
          },
          {
            "state_id": "Доступ запрещен",
            "case": "isAdult === false"
          }
        ]
      },
      {
        "state_type": "screen",
        "name": "Доступ разрешен",
        "initial_state": false,
        "final_state": true,
        "expressions": [],
        "transitions": []
      },
      {
        "state_type": "screen",
        "name": "Доступ запрещен",
        "initial_state": false,
        "final_state": true,
        "expressions": [],
        "transitions": []
      }
    ]
  },
  "predefined_context": {
    "user": { "age": 25 }
  }
}
```

---

## 🧪 Программный экспорт (без UI)

### Использование в коде:

```javascript
import { mapGraphDataToWorkflow } from '../utils/workflowMapper';
import { WorkflowAPI } from '../services/workflowApi';

// 1. Получить graphData из VirtualContext
const graphData = {
  nodes: [/* ... */],
  edges: [/* ... */]
};

const initialContext = {
  user: { id: '123', name: 'John' },
  cart: { items: [] }
};

// 2. Преобразовать в серверный формат
const workflow = mapGraphDataToWorkflow(graphData, initialContext);

// 3. Валидация и отправка
const api = new WorkflowAPI('http://127.0.0.1:8000');

try {
  const response = await api.saveWorkflow(
    workflow.states,
    workflow.predefined_context
  );
  
  console.log('✅ Workflow saved:', response.wf_description_id);
} catch (error) {
  console.error('❌ Error:', error.message);
}
```

---

## 🔍 Отладка и проверка

### Проверка валидности перед отправкой:

```javascript
import { WorkflowAPI } from '../services/workflowApi';

const api = new WorkflowAPI();

// Валидация без отправки
try {
  api.validateWorkflow(states);
  console.log('✅ Validation passed');
} catch (error) {
  console.error('❌ Validation failed:', error.message);
}
```

### Нормализация состояний:

```javascript
// Исправить неполные states
const normalizedState = api.normalizeState({
  state_type: 'screen',
  name: 'MyScreen',
  // initial_state и final_state могут отсутствовать
});

console.log(normalizedState);
// {
//   state_type: 'screen',
//   name: 'MyScreen',
//   initial_state: false,  // автоматически добавлено
//   final_state: false,     // автоматически добавлено
//   expressions: [],        // автоматически добавлено
//   transitions: []         // автоматически добавлено
// }
```

---

## 📚 Полезные ссылки

- **Руководство по интеграции:** `docs/integration-guide.md`
- **API контракты BDUI:** `docs/api-contracts.md`
- **Mapper функции:** `src/utils/workflowMapper.js`
- **Workflow API клиент:** `src/services/workflowApi.js`
- **Типы контрактов:** `src/types/workflowContract.js`

---

## ⚠️ Важные замечания

1. **Integration State:** Всегда имеет ровно 1 transition с `case: null`
2. **Boolean поля:** `initial_state` и `final_state` должны быть `boolean`, не строки
3. **Обязательные массивы:** `expressions` и `transitions` всегда массивы, даже пустые
4. **Уникальность имен:** Все `name` в states должны быть уникальными
5. **Начальные/конечные узлы:** Ровно 1 `initial_state: true`, минимум 1 `final_state: true`

---

*Обновлено: 1 октября 2025 г.*
