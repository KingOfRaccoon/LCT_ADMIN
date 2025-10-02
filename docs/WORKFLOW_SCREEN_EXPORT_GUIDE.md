# Workflow Screen Export - Quick Guide

## 🎯 Цель

Экспортировать полные данные экранов (sections, components, bindings, styles) в контракт бэкенда по `/workflow/save`.

## 📦 Структура контракта

```json
{
  "states": {
    "states": [
      {
        "state_type": "screen",
        "name": "Login Screen",
        "screen": {
          "id": "screen-login",
          "type": "Screen",
          "sections": {
            "body": {
              "children": [
                {
                  "id": "input-username",
                  "type": "input",
                  "properties": {
                    "label": "Username",
                    "placeholder": "Enter username"
                  }
                },
                {
                  "id": "button-submit",
                  "type": "button",
                  "events": {
                    "onClick": "login"
                  }
                }
              ]
            }
          }
        },
        "transitions": [...],
        "expressions": [...],
        "initial_state": true,
        "final_state": false
      },
      {
        "state_type": "technical",
        "name": "Validate Credentials",
        "screen": {},
        "transitions": [...],
        "expressions": [...]
      }
    ]
  },
  "predefined_context": {
    "username": "",
    "password": ""
  }
}
```

## 🔧 Как использовать

### 1. В Sandbox/ProductOverview

Кнопка экспорта автоматически включает screens:

```jsx
<WorkflowExportButton
  graphData={{
    nodes: product.nodes,
    edges: product.edges,
    screens: product.screens  // ✅ Включено
  }}
  initialContext={product.initialContext}
  productId={product.id}
/>
```

### 2. Программный экспорт

```javascript
import { mapGraphDataToWorkflow } from './utils/workflowMapper';
import { WorkflowAPI } from './services/workflowApi';

const graphData = {
  nodes: [...],
  edges: [...],
  screens: {
    'screen-id': {
      id: 'screen-id',
      sections: {...}
    }
  }
};

const workflow = mapGraphDataToWorkflow(graphData, initialContext);
const api = new WorkflowAPI('https://api.backend.com');
await api.saveWorkflow(workflow.states, workflow.predefined_context);
```

## ✅ Валидация

Запустите тест для проверки:

```bash
node test-workflow-screen.js
```

Ожидаемый результат:
- ✅ Screen states имеют полные данные
- ✅ Technical/Integration states имеют пустой `screen: {}`
- ✅ Все transitions корректны

## 📖 Документация

См. [`docs/WORKFLOW_SCREEN_INTEGRATION.md`](./WORKFLOW_SCREEN_INTEGRATION.md) для деталей.
