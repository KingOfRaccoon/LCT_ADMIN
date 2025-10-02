# Workflow Export: Интеграция полных Screen данных

## 📋 Обзор

Обновлена система экспорта workflow для включения полных объектов `screen` (с `sections`, компонентами, биндингами и стилями) в контракт бэкенда по эндпоинту `/workflow/save`.

## 🎯 Что изменилось

### 1. **workflowMapper.js** - Основной маппер

#### Обновлена функция `mapNodeToState()`
```javascript
function mapNodeToState(node, allEdges, initialNodes, finalNodes, nodeIdToName, screens = {})
```

**Новое поведение:**
- Принимает дополнительный параметр `screens` (объект с данными экранов)
- Для узлов типа `screen` с указанным `screenId` добавляет полный объект экрана из `screens[screenId]`
- Для узлов других типов (`technical`, `integration`, `service`) добавляет пустой объект `screen: {}`

**Пример результата:**
```json
{
  "state_type": "screen",
  "name": "Загрузка корзины",
  "screen": {
    "id": "screen-loading",
    "type": "Screen",
    "name": "Загрузка",
    "sections": {
      "body": {
        "id": "section-loading-body",
        "type": "Section",
        "children": [...]
      }
    },
    "style": {...}
  },
  "initial_state": true,
  "final_state": false,
  "expressions": [...],
  "transitions": [...]
}
```

#### Обновлена функция `mapGraphDataToWorkflow()`
```javascript
export function mapGraphDataToWorkflow(graphData, initialContext = {}) {
  const { nodes = [], edges = [], screens = {} } = graphData;
  // ...
}
```

**Изменения:**
- Извлекает `screens` из `graphData`
- Передает `screens` в каждый вызов `mapNodeToState()`
- Логирует количество и ID экранов для отладки

#### Улучшена функция `detectStateType()`

Теперь корректно определяет тип узла на основе `data.actionType`:

```javascript
// Приоритет 1: Если есть actionType в data - это action узел
if (nodeData.actionType) {
  if (nodeData.actionType === 'api-call') return 'integration';
  if (nodeData.actionType === 'condition' || 
      nodeData.actionType === 'modify-cart-item' ||
      nodeData.actionType === 'calculation') return 'technical';
  return 'technical'; // Другие действия (context-update и т.д.)
}

// Приоритет 2: Если есть screenId или type === 'screen' - это screen
if (nodeType === 'screen' || nodeData.screenId) return 'screen';
```

### 2. **SandboxPage.jsx** - Передача screens

```jsx
<WorkflowExportButton
  graphData={{
    nodes: product.nodes || [],
    edges: product.nodes?.flatMap(...) || [],
    screens: product.screens || {}  // ✅ Добавлено
  }}
  initialContext={contextState || product.initialContext || {}}
  productId={product.id || product.slug || product.name || 'sandbox'}
/>
```

### 3. **ProductOverview.jsx** - Загрузка screens

```javascript
loadAvitoDemoAsGraphData()
  .then((data) => {
    setGraphData({ 
      nodes: data.nodes, 
      edges: data.edges, 
      screens: data.screens  // ✅ Добавлено
    });
    setVariableSchemas(data.variableSchemas);
    // ...
  })
```

### 4. **VirtualContext.jsx** - Хранение screens

`SET_GRAPH_DATA` уже поддерживал произвольную структуру payload, поэтому никаких изменений не потребовалось. `graphData.screens` автоматически сохраняется и доступен через контекст.

## 📊 Результат экспорта

После изменений контракт отправляемый на `/workflow/save` имеет следующую структуру:

```json
{
  "states": {
    "states": [
      {
        "state_type": "screen",
        "name": "Загрузка корзины",
        "screen": {
          "id": "screen-loading",
          "type": "Screen",
          "name": "Загрузка",
          "style": {
            "display": "flex",
            "flexDirection": "column",
            "minHeight": "720px",
            "backgroundColor": "#ffffff"
          },
          "sections": {
            "body": {
              "id": "section-loading-body",
              "type": "Section",
              "properties": {...},
              "children": [
                {
                  "id": "text-loading-title",
                  "type": "text",
                  "properties": {
                    "content": "Загружаем вашу корзину…",
                    "variant": "heading"
                  },
                  "style": {...}
                },
                {
                  "id": "button-loading-continue",
                  "type": "button",
                  "properties": {...},
                  "events": {
                    "onClick": "loadComplete"
                  }
                }
              ]
            }
          }
        },
        "initial_state": true,
        "final_state": false,
        "expressions": [
          {
            "event_name": "loadComplete"
          }
        ],
        "transitions": [
          {
            "state_id": "Корзина (основной экран)",
            "case": null
          }
        ]
      },
      {
        "state_type": "technical",
        "name": "Увеличение количества",
        "screen": {},  // ✅ Пустой для non-screen узлов
        "initial_state": false,
        "final_state": false,
        "expressions": [],
        "transitions": [...]
      }
    ]
  },
  "predefined_context": {
    "cart": {...},
    "stores": [...],
    "ui": {...}
  }
}
```

## ✅ Валидация

Создан тестовый скрипт `test-workflow-screen.js` который проверяет:

1. ✅ Все states имеют поле `screen`
2. ✅ Screen states содержат полные данные экрана (sections, style, etc.)
3. ✅ Non-screen states (technical, integration, service) имеют пустой `screen: {}`
4. ✅ Существует ровно 1 initial state
5. ✅ Существует минимум 1 final state

**Запуск теста:**
```bash
node test-workflow-screen.js
```

**Результат для avitoDemo:**
```
Screen states: 4
  ✅ Загрузка корзины (sections: body)
  ✅ Корзина (основной экран) (sections: header, body, footer)
  ✅ Корзина пуста (sections: body)
  ✅ Оформление заказа (sections: body)

Non-screen states: 5
  ✅ Увеличение количества (technical) - Empty screen
  ✅ Уменьшение количества (technical) - Empty screen
  ✅ Удаление товара (technical) - Empty screen
  ✅ Добавление рекомендованного товара (technical) - Empty screen
  ✅ Выбрать все товары (technical) - Empty screen

🎉 All checks passed! Ready to export to backend.
```

## 🔄 Обратная совместимость

Все изменения полностью обратно совместимы:

- Если `graphData.screens` отсутствует, используется пустой объект `{}`
- Если у screen-узла нет `screenId`, поле `screen` будет пустым
- Старые продукты без screens продолжат работать без изменений

## 📝 Использование

### В компонентах:

```jsx
import { WorkflowExportButton } from '../../components/WorkflowExportButton/WorkflowExportButton';

<WorkflowExportButton
  graphData={{
    nodes: [...],
    edges: [...],
    screens: {...}  // Передайте screens из продукта/VirtualContext
  }}
  initialContext={...}
  productId="my-product"
/>
```

### Программно:

```javascript
import { mapGraphDataToWorkflow } from './utils/workflowMapper';
import { WorkflowAPI } from './services/workflowApi';

const graphData = {
  nodes: [...],
  edges: [...],
  screens: {
    'screen-id': {
      id: 'screen-id',
      type: 'Screen',
      sections: {...}
    }
  }
};

const workflow = mapGraphDataToWorkflow(graphData, initialContext);
const api = new WorkflowAPI('https://api.example.com');
const response = await api.saveWorkflow(workflow.states, workflow.predefined_context);
```

## 🎓 Принципы

1. **Декларативность:** Screen описывается полностью в JSON, бэкенд не нуждается в дополнительной обработке
2. **Универсальность:** Один маппер работает с любыми продуктами (ecommerce, avito, custom)
3. **Типобезопасность:** Каждое состояние имеет явный `state_type` и соответствующую структуру `screen`
4. **Простота отладки:** Логирование на каждом этапе преобразования

## 📚 Связанные файлы

- `src/utils/workflowMapper.js` - Основная логика маппинга
- `src/services/workflowApi.js` - API клиент для отправки на сервер
- `src/hooks/useWorkflowApi.js` - React хук для экспорта
- `src/components/WorkflowExportButton/` - UI компонент экспорта
- `src/pages/Sandbox/SandboxPage.jsx` - Использование в Sandbox
- `src/pages/ProductOverview/ProductOverview.jsx` - Использование в Product Overview
- `test-workflow-screen.js` - Тестовый скрипт

## 🚀 Дальнейшие шаги

1. ✅ Реализовать серверную часть для обработки `screen` объектов
2. ✅ Добавить валидацию структуры screen на бэкенде
3. ✅ Реализовать рендеринг экранов на мобильных клиентах на основе полученных данных

---

**Дата:** 1 октября 2025 г.  
**Версия:** 1.0.0
