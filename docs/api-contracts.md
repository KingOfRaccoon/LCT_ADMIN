# API Contracts - BDUI Platform

## Overview

BDUI Platform предоставляет REST API для взаимодействия с Sandbox серверами (JavaScript Express и Python FastAPI). API поддерживает инициализацию продуктов, обработку событий и управление виртуальным контекстом.

## Base URL

**JavaScript Server (Express):**
```
http://localhost:5050
```

**Python Server (FastAPI):**
```
http://localhost:8000
```

## Authentication

В текущей версии аутентификация не требуется. Для production окружения рекомендуется добавить JWT или API Key authentication.

---

## Endpoints

### `POST /api/start`

Инициализирует продукт и возвращает начальный экран с контекстом.

#### Request

```http
POST /api/start
Content-Type: application/json

{
  "productId": "avito-cart-demo"  // опционально, если не указан - используется дефолтный
}
```

#### Response

**Success (200 OK):**
```json
{
  "screen": {
    "id": "screen-loading",
    "type": "Screen",
    "name": "Загрузка",
    "style": {
      "display": "flex",
      "flexDirection": "column",
      "minHeight": "720px",
      "backgroundColor": "#ffffff",
      "borderRadius": "32px"
    },
    "sections": {
      "body": {
        "id": "section-loading-body",
        "type": "Section",
        "properties": {
          "slot": "body",
          "padding": 48,
          "spacing": 24,
          "alignItems": "center",
          "justifyContent": "center"
        },
        "children": [
          {
            "id": "text-loading-title",
            "type": "text",
            "properties": {
              "content": "Загружаем вашу корзину…",
              "variant": "heading"
            },
            "style": {
              "fontSize": "24px",
              "fontWeight": 600,
              "color": "#0f172a"
            }
          }
        ]
      }
    }
  },
  "context": {
    "cart": {
      "items": [],
      "selectedCount": 0,
      "totalPrice": 0,
      "totalDiscount": 0
    },
    "ui": {
      "ready": false,
      "notifications": {
        "type": null,
        "message": null
      }
    },
    "state": {
      "empty": false,
      "loading": true
    }
  },
  "nextNode": {
    "id": "loading",
    "label": "Загрузка корзины",
    "type": "screen",
    "screenId": "screen-loading"
  },
  "availableEdges": [
    {
      "id": "edge-load-complete",
      "label": "Данные загружены",
      "event": "loadComplete",
      "target": "cart-main"
    }
  ]
}
```

**Error (400 Bad Request):**
```json
{
  "error": "Product not found",
  "productId": "invalid-product-id"
}
```

**Error (500 Internal Server Error):**
```json
{
  "error": "Failed to load dataset",
  "message": "ENOENT: no such file or directory"
}
```

---

### `POST /api/action`

Обрабатывает событие (edge), применяет contextPatch и возвращает следующий экран.

#### Request

```http
POST /api/action
Content-Type: application/json

{
  "edgeId": "edge-increment-item",
  "context": {
    "cart": {
      "items": [
        {
          "id": "item-1",
          "title": "MagSafe Charger",
          "price": 4990,
          "quantity": 1
        }
      ],
      "selectedCount": 1,
      "totalPrice": 4990
    }
  },
  "payload": {
    "itemId": "item-1"
  }
}
```

**Request Fields:**
- `edgeId` (string, required) — ID перехода из `availableEdges` предыдущего response
- `context` (object, required) — текущее состояние виртуального контекста
- `payload` (object, optional) — дополнительные данные для обработки события (например, itemId для incrementItem)

#### Response

**Success (200 OK):**
```json
{
  "screen": {
    "id": "screen-cart-main",
    "type": "Screen",
    "name": "Корзина",
    "sections": {
      "header": { /* ... */ },
      "body": { /* ... */ },
      "footer": {
        "id": "section-cart-footer",
        "type": "Section",
        "children": [
          {
            "id": "text-total-price",
            "type": "text",
            "properties": {
              "content": {
                "reference": "${cart.totalPrice}",
                "value": "9980 ₽"
              }
            }
          }
        ]
      }
    }
  },
  "context": {
    "cart": {
      "items": [
        {
          "id": "item-1",
          "title": "MagSafe Charger",
          "price": 4990,
          "quantity": 2  // обновлено
        }
      ],
      "selectedCount": 1,
      "totalPrice": 9980  // пересчитано
    }
  },
  "nextNode": {
    "id": "cart-main",
    "label": "Корзина (основной экран)",
    "type": "screen",
    "screenId": "screen-cart-main"
  },
  "availableEdges": [
    {
      "id": "edge-increment-item",
      "label": "Увеличить количество",
      "event": "incrementItem",
      "target": "action-increment"
    },
    {
      "id": "edge-decrement-item",
      "label": "Уменьшить количество",
      "event": "decrementItem",
      "target": "action-decrement"
    },
    {
      "id": "edge-checkout",
      "label": "Оформить доставку",
      "event": "checkout",
      "target": "checkout-screen"
    }
  ],
  "history": {
    "edgeId": "edge-increment-item",
    "fromNodeId": "cart-main",
    "toNodeId": "action-increment",
    "timestamp": "2025-09-30T12:34:56.789Z",
    "patch": {
      "cart.totalPrice": 9980
    }
  }
}
```

**Error (400 Bad Request):**
```json
{
  "error": "Edge not found",
  "edgeId": "invalid-edge-id"
}
```

**Error (422 Unprocessable Entity):**
```json
{
  "error": "Invalid context structure",
  "message": "Missing required field: cart.items"
}
```

---

## Data Models

### Product

```typescript
interface Product {
  id: string;
  name: string;
  description: string;
  slug: string;
  variableSchemas: Record<string, VariableSchema>;
  initialContext: Record<string, any>;
  nodes: Node[];
  screens: Record<string, Screen>;
}
```

### Variable Schema

```typescript
interface VariableSchema {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  schema?: Record<string, string>;  // для type: 'object' | 'array'
}
```

**Example:**
```json
{
  "cart": {
    "type": "object",
    "schema": {
      "items": "array",
      "selectedCount": "number",
      "totalPrice": "number"
    }
  }
}
```

### Node

```typescript
interface Node {
  id: string;
  label: string;
  type: 'screen' | 'action' | 'condition';
  screenId?: string;    // required для type: 'screen'
  start?: boolean;      // true для стартового узла
  edges: Edge[];
  data?: {
    actionType?: 'context-update' | 'api-call' | 'validation';
    description?: string;
    [key: string]: any;
  };
}
```

### Edge

```typescript
interface Edge {
  id: string;
  label: string;
  event?: string;       // событие для триггера (onClick, checkout, loadComplete)
  target: string;       // id целевого узла
  summary?: string;
  contextPatch: Record<string, any>;  // изменения контекста
}
```

**Context Patch Format:**

Поддерживает два формата:

1. **Плоские пути:**
```json
{
  "cart.totalPrice": 125960,
  "ui.notifications.type": "success",
  "ui.notifications.message": "Товар добавлен"
}
```

2. **Вложенные объекты:**
```json
{
  "cart": {
    "totalPrice": 125960
  },
  "ui": {
    "notifications": {
      "type": "success",
      "message": "Товар добавлен"
    }
  }
}
```

Обработчик `applyContextPatch` в `src/pages/Sandbox/utils/bindings.js` автоматически разворачивает вложенные объекты в плоские пути.

### Screen

```typescript
interface Screen {
  id: string;
  type: 'Screen';
  name: string;
  style: CSSProperties;
  
  // Новый формат (sections)
  sections?: {
    header?: Section;
    body?: Section;
    footer?: Section;
  };
  
  // Legacy формат (components)
  components?: Component[];
}
```

### Section

```typescript
interface Section {
  id: string;
  type: 'Section';
  properties: {
    slot: 'header' | 'body' | 'footer';
    padding?: number;
    spacing?: number;
    alignItems?: string;
    justifyContent?: string;
    flexDirection?: 'row' | 'column';
    background?: string;
  };
  style: CSSProperties;
  children: Component[];
}
```

### Component

```typescript
type ComponentType = 
  | 'button' 
  | 'text' 
  | 'input' 
  | 'image' 
  | 'container' 
  | 'row' 
  | 'column' 
  | 'list' 
  | 'section';

interface Component {
  id: string;
  type: ComponentType;
  properties: {
    // Общие свойства
    variant?: string;
    size?: string;
    
    // Специфичные для типа
    content?: string | BindingValue;  // text
    text?: string | BindingValue;     // button
    value?: string | BindingValue;    // input
    src?: string | BindingValue;      // image
    event?: string;                   // button (onClick trigger)
    
    // List properties
    items?: any[] | BindingValue;
    itemAlias?: string;               // для итераций (${item.name})
    spacing?: number;
    
    // Layout properties
    padding?: number;
    alignItems?: string;
    justifyContent?: string;
    flexDirection?: 'row' | 'column';
  };
  style: CSSProperties;
  children?: Component[];  // для container, row, column, list
}
```

### Binding Value

```typescript
interface BindingValue {
  reference: string;  // путь к переменной (${cart.totalPrice})
  value: any;         // fallback значение
}
```

**Resolver:** `resolveBindingValue(binding, context, iterationStack)` в `src/pages/Sandbox/utils/bindings.js`

**Iteration Stack:**
```typescript
interface IterationStackFrame {
  alias: string;      // 'store', 'item', etc.
  item: any;          // текущий элемент массива
  itemIndex: number;  // индекс (0-based)
  itemTotal: number;  // общее количество элементов
}
```

---

## Context Patching

### applyContextPatch()

**Signature:**
```typescript
function applyContextPatch(
  context: Record<string, any>,
  patch: Record<string, any>
): Record<string, any>
```

**Behavior:**
1. Клонирует контекст через `structuredClone` или `JSON.parse(JSON.stringify())`
2. Обрабатывает плоские пути (`foo.bar.baz`) и вложенные объекты
3. Применяет побочные эффекты:
   - Форматирование `data.order.totalFormatted` из `data.order.total`
   - Fallback значения для отсутствующих полей
   - Type coercion (строки в числа для numbers)
4. Возвращает обновлённый контекст

**Example:**
```javascript
const context = { cart: { totalPrice: 10000 } };
const patch = { 'cart.totalPrice': 15000 };
const updated = applyContextPatch(context, patch);
// → { cart: { totalPrice: 15000 } }
```

### resolveBindingValue()

**Signature:**
```typescript
function resolveBindingValue(
  binding: any,
  context: Record<string, any>,
  iterationStack?: IterationStackFrame[]
): any
```

**Behavior:**
1. Если binding не объект или нет `reference` — возвращает binding as-is
2. Извлекает путь из `${...}` (regex: `/\$\{([^}]+)\}/`)
3. Проверяет iteration aliases (`${item}`, `${item.field}`, `${itemIndex}`, `${itemTotal}`)
4. Резолвит путь из контекста через `getContextValue(context, path)`
5. Возвращает resolved значение или `binding.value` (fallback)

**Example:**
```javascript
const binding = { reference: '${cart.totalPrice}', value: 0 };
const context = { cart: { totalPrice: 10000 } };
const resolved = resolveBindingValue(binding, context);
// → 10000
```

**Iteration Example:**
```javascript
const binding = { reference: '${item.name}', value: '' };
const iterationStack = [{ alias: 'item', item: { name: 'Apple' }, itemIndex: 0, itemTotal: 3 }];
const resolved = resolveBindingValue(binding, {}, iterationStack);
// → 'Apple'
```

---

## Error Handling

### Client-side Errors (4xx)

**400 Bad Request:**
- Невалидный JSON в request body
- Отсутствие обязательных полей (`edgeId`, `context`)
- Несуществующий `productId` или `edgeId`

**422 Unprocessable Entity:**
- Невалидная структура контекста (отсутствуют required поля из variableSchemas)
- Несоответствие типов (строка вместо числа)

### Server-side Errors (5xx)

**500 Internal Server Error:**
- Ошибка чтения JSON файла конфигурации
- Исключение в обработчике contextPatch
- Недоступность зависимых сервисов

**Response Format:**
```json
{
  "error": "Human-readable error message",
  "message": "Technical details (stack trace for dev)",
  "code": "ERROR_CODE"  // опционально
}
```

---

## Versioning

**Current Version:** v1

API версионируется через URL prefix:
```
/api/v1/start
/api/v1/action
```

В текущей версии prefix опущен (`/api/start`). При добавлении breaking changes будет введён `/api/v2/...`.

---

## Rate Limiting

**Development:** не применяется

**Production (рекомендации):**
- 100 requests/minute per IP для `/api/start`
- 1000 requests/minute per IP для `/api/action`
- Используйте middleware (express-rate-limit, slowapi)

---

## CORS Policy

**Development:**
```javascript
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
```

**Production:**
```javascript
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || [],
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS']
}));
```

---

## Testing

### cURL Examples

**Start product:**
```bash
curl -X POST http://localhost:5050/api/start \
  -H "Content-Type: application/json" \
  -d '{"productId": "avito-cart-demo"}'
```

**Trigger action:**
```bash
curl -X POST http://localhost:5050/api/action \
  -H "Content-Type: application/json" \
  -d '{
    "edgeId": "edge-increment-item",
    "context": {"cart": {"items": [], "totalPrice": 0}},
    "payload": {"itemId": "item-1"}
  }'
```

### Node.js Test Suite

```bash
npm test server/js/server.test.js
```

**Test cases:**
- ✅ POST /api/start возвращает начальный экран
- ✅ POST /api/action применяет contextPatch
- ✅ Недоступный edgeId возвращает 400
- ⏳ TODO: Валидация типов переменных (variableSchemas)

---

## Migration Guide

### Legacy `components` → New `sections` Format

**Legacy:**
```json
{
  "components": [
    {"id": "btn-1", "type": "button", "properties": {...}},
    {"id": "txt-1", "type": "text", "properties": {...}}
  ]
}
```

**New:**
```json
{
  "sections": {
    "body": {
      "id": "section-body",
      "type": "Section",
      "properties": {"slot": "body"},
      "children": [
        {"id": "btn-1", "type": "button", "properties": {...}},
        {"id": "txt-1", "type": "text", "properties": {...}}
      ]
    }
  }
}
```

**Renderer Support:**
`SandboxScreenRenderer.jsx` поддерживает оба формата:
```javascript
const componentTree = screenConfig.sections 
  ? Object.values(screenConfig.sections).flatMap(s => s.children || [])
  : screenConfig.components || [];
```

---

## Changelog

### v1.0.0 (2025-09-30)
- ✅ Initial API release
- ✅ POST /api/start endpoint
- ✅ POST /api/action endpoint
- ✅ Context patching с applyContextPatch()
- ✅ Binding resolution с resolveBindingValue()
- ✅ Support для sections и legacy components format
- ✅ avitoDemo.json и ecommerceDashboard.json presets

### Future (v1.1.0)
- ⏳ GET /api/products — список доступных продуктов
- ⏳ GET /api/products/:id — метаданные продукта
- ⏳ POST /api/reset — сброс сеанса
- ⏳ WebSocket support для real-time updates
- ⏳ Authentication (JWT tokens)

---

## Support

**Issues:** GitHub Issues
**Docs:** `docs/` directory
**Examples:** `src/pages/Sandbox/data/`
