# Admin API Specification - BDUI Platform

## Overview

REST API для взаимодействия админ-панели BDUI с backend сервером для управления продуктами, экранами, переменными и аналитикой.

**Base URL:** `https://api.bdui.com/v1`  
**Authentication:** Bearer Token (JWT)  
**Content-Type:** `application/json`

---

## Table of Contents

- [Authentication](#authentication)
- [Products API](#products-api)
- [Screens API](#screens-api)
- [Variables API](#variables-api)
- [Graph API](#graph-api)
- [Analytics API](#analytics-api)
- [Assets API](#assets-api)
- [Webhooks](#webhooks)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [Versioning](#versioning)

---

## Authentication

### `POST /auth/login`

Аутентификация пользователя и получение JWT токена.

**Request:**
```json
{
  "email": "admin@example.com",
  "password": "securePassword123"
}
```

**Response (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "refresh_token_here",
  "expiresIn": 3600,
  "user": {
    "id": "user-123",
    "email": "admin@example.com",
    "name": "Admin User",
    "role": "admin",
    "permissions": ["products:read", "products:write", "analytics:read"]
  }
}
```

### `POST /auth/refresh`

Обновление токена.

**Request:**
```json
{
  "refreshToken": "refresh_token_here"
}
```

**Response (200 OK):**
```json
{
  "token": "new_jwt_token",
  "expiresIn": 3600
}
```

### `POST /auth/logout`

Инвалидация токена.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (204 No Content)**

---

## Products API

### `GET /products`

Получить список всех продуктов с фильтрацией и пагинацией.

**Query Parameters:**
- `page` (number, default: 1) — номер страницы
- `limit` (number, default: 20, max: 100) — количество элементов на странице
- `status` (string, optional) — фильтр по статусу: `draft`, `active`, `archived`
- `search` (string, optional) — поиск по названию или описанию
- `sortBy` (string, default: `createdAt`) — поле для сортировки: `name`, `createdAt`, `updatedAt`
- `sortOrder` (string, default: `desc`) — порядок сортировки: `asc`, `desc`

**Example Request:**
```
GET /products?page=1&limit=10&status=active&search=avito&sortBy=name&sortOrder=asc
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "prod-123",
      "name": "Avito Cart Demo",
      "slug": "avito-cart-demo",
      "description": "Демонстрационный сценарий корзины Avito",
      "status": "active",
      "version": "1.0.0",
      "thumbnail": "https://cdn.bdui.com/products/prod-123/thumbnail.png",
      "createdAt": "2025-09-30T10:00:00Z",
      "updatedAt": "2025-09-30T12:00:00Z",
      "createdBy": {
        "id": "user-123",
        "name": "Admin User"
      },
      "stats": {
        "screens": 4,
        "nodes": 9,
        "variables": 12
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

### `GET /products/:id`

Получить полную конфигурацию продукта по ID.

**Path Parameters:**
- `id` (string, required) — ID продукта

**Response (200 OK):**
```json
{
  "id": "prod-123",
  "name": "Avito Cart Demo",
  "slug": "avito-cart-demo",
  "description": "Демонстрационный сценарий корзины Avito",
  "status": "active",
  "version": "1.0.0",
  "thumbnail": "https://cdn.bdui.com/products/prod-123/thumbnail.png",
  "createdAt": "2025-09-30T10:00:00Z",
  "updatedAt": "2025-09-30T12:00:00Z",
  "createdBy": {
    "id": "user-123",
    "name": "Admin User",
    "email": "admin@example.com"
  },
  "variableSchemas": {
    "cart": {
      "type": "object",
      "schema": {
        "items": "array",
        "selectedCount": "number",
        "totalPrice": "number"
      }
    }
  },
  "initialContext": {
    "cart": {
      "items": [],
      "selectedCount": 0,
      "totalPrice": 0
    }
  },
  "nodes": [
    {
      "id": "loading",
      "label": "Загрузка корзины",
      "type": "screen",
      "screenId": "screen-loading",
      "start": true,
      "edges": [
        {
          "id": "edge-load-complete",
          "label": "Данные загружены",
          "event": "loadComplete",
          "target": "cart-main",
          "contextPatch": {
            "ui.ready": true,
            "state.loading": false
          }
        }
      ]
    }
  ],
  "screens": {
    "screen-loading": {
      "id": "screen-loading",
      "type": "Screen",
      "name": "Загрузка",
      "sections": {
        "body": {
          "id": "section-loading-body",
          "type": "Section",
          "properties": {
            "slot": "body"
          },
          "children": []
        }
      }
    }
  },
  "metadata": {
    "tags": ["avito", "ecommerce", "cart"],
    "category": "demo",
    "visibility": "public"
  }
}
```

**Error (404 Not Found):**
```json
{
  "error": "Product not found",
  "code": "PRODUCT_NOT_FOUND",
  "productId": "prod-123"
}
```

---

### `POST /products`

Создать новый продукт.

**Request:**
```json
{
  "name": "New Product",
  "slug": "new-product",
  "description": "Description here",
  "status": "draft",
  "version": "1.0.0",
  "variableSchemas": {
    "user": {
      "type": "object",
      "schema": {
        "name": "string",
        "email": "string"
      }
    }
  },
  "initialContext": {
    "user": {
      "name": "",
      "email": ""
    }
  },
  "nodes": [],
  "screens": {},
  "metadata": {
    "tags": ["new"],
    "category": "custom",
    "visibility": "private"
  }
}
```

**Response (201 Created):**
```json
{
  "id": "prod-456",
  "name": "New Product",
  "slug": "new-product",
  "status": "draft",
  "createdAt": "2025-09-30T14:00:00Z",
  "createdBy": {
    "id": "user-123",
    "name": "Admin User"
  }
}
```

**Error (400 Bad Request):**
```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": [
    {
      "field": "slug",
      "message": "Slug must be unique",
      "value": "new-product"
    }
  ]
}
```

---

### `PUT /products/:id`

Обновить продукт (полная замена).

**Path Parameters:**
- `id` (string, required) — ID продукта

**Request:**
```json
{
  "name": "Updated Product Name",
  "description": "Updated description",
  "status": "active",
  "version": "1.1.0",
  "variableSchemas": { /* ... */ },
  "initialContext": { /* ... */ },
  "nodes": [ /* ... */ ],
  "screens": { /* ... */ },
  "metadata": { /* ... */ }
}
```

**Response (200 OK):**
```json
{
  "id": "prod-123",
  "name": "Updated Product Name",
  "updatedAt": "2025-09-30T15:00:00Z",
  "version": "1.1.0"
}
```

---

### `PATCH /products/:id`

Частичное обновление продукта.

**Request:**
```json
{
  "name": "New Name",
  "status": "active",
  "metadata": {
    "tags": ["updated", "featured"]
  }
}
```

**Response (200 OK):**
```json
{
  "id": "prod-123",
  "name": "New Name",
  "status": "active",
  "updatedAt": "2025-09-30T15:30:00Z"
}
```

---

### `DELETE /products/:id`

Удалить продукт (soft delete или permanent).

**Query Parameters:**
- `permanent` (boolean, default: false) — удалить навсегда или архивировать

**Response (204 No Content)**

**Error (409 Conflict):**
```json
{
  "error": "Cannot delete product with active sessions",
  "code": "PRODUCT_IN_USE",
  "activeSessions": 5
}
```

---

### `POST /products/:id/duplicate`

Дублировать продукт.

**Request:**
```json
{
  "name": "Copy of Avito Cart Demo",
  "slug": "avito-cart-demo-copy",
  "includeAnalytics": false
}
```

**Response (201 Created):**
```json
{
  "id": "prod-789",
  "name": "Copy of Avito Cart Demo",
  "slug": "avito-cart-demo-copy",
  "status": "draft",
  "createdAt": "2025-09-30T16:00:00Z"
}
```

---

### `POST /products/:id/publish`

Опубликовать продукт (draft → active).

**Request:**
```json
{
  "version": "1.0.0",
  "releaseNotes": "Initial release with cart flow"
}
```

**Response (200 OK):**
```json
{
  "id": "prod-123",
  "status": "active",
  "version": "1.0.0",
  "publishedAt": "2025-09-30T16:30:00Z",
  "deploymentUrl": "https://runtime.bdui.com/prod-123"
}
```

---

### `GET /products/:id/versions`

Получить историю версий продукта.

**Response (200 OK):**
```json
{
  "data": [
    {
      "version": "1.1.0",
      "createdAt": "2025-09-30T15:00:00Z",
      "createdBy": {
        "id": "user-123",
        "name": "Admin User"
      },
      "releaseNotes": "Added checkout screen",
      "changesSummary": {
        "screens": { "added": 1, "modified": 0, "deleted": 0 },
        "nodes": { "added": 2, "modified": 0, "deleted": 0 }
      }
    },
    {
      "version": "1.0.0",
      "createdAt": "2025-09-30T10:00:00Z",
      "createdBy": {
        "id": "user-123",
        "name": "Admin User"
      },
      "releaseNotes": "Initial release"
    }
  ]
}
```

---

### `POST /products/:id/restore`

Восстановить продукт из определённой версии.

**Request:**
```json
{
  "version": "1.0.0",
  "createBackup": true
}
```

**Response (200 OK):**
```json
{
  "id": "prod-123",
  "version": "1.0.0",
  "restoredAt": "2025-09-30T17:00:00Z",
  "backupVersion": "1.1.0-backup"
}
```

---

## Screens API

### `GET /products/:productId/screens`

Получить все экраны продукта.

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "screen-loading",
      "name": "Загрузка",
      "type": "Screen",
      "thumbnail": "https://cdn.bdui.com/screens/screen-loading/thumb.png",
      "createdAt": "2025-09-30T10:00:00Z",
      "updatedAt": "2025-09-30T12:00:00Z",
      "stats": {
        "components": 3,
        "sections": 1
      }
    }
  ]
}
```

---

### `GET /products/:productId/screens/:screenId`

Получить полную конфигурацию экрана.

**Response (200 OK):**
```json
{
  "id": "screen-loading",
  "type": "Screen",
  "name": "Загрузка",
  "style": {
    "display": "flex",
    "flexDirection": "column",
    "minHeight": "720px"
  },
  "sections": {
    "body": {
      "id": "section-loading-body",
      "type": "Section",
      "properties": {
        "slot": "body",
        "padding": 48
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
            "fontWeight": 600
          }
        }
      ]
    }
  }
}
```

---

### `POST /products/:productId/screens`

Создать новый экран.

**Request:**
```json
{
  "id": "screen-new",
  "name": "New Screen",
  "type": "Screen",
  "sections": {
    "body": {
      "id": "section-body",
      "type": "Section",
      "properties": {
        "slot": "body"
      },
      "children": []
    }
  }
}
```

**Response (201 Created):**
```json
{
  "id": "screen-new",
  "name": "New Screen",
  "createdAt": "2025-09-30T17:30:00Z"
}
```

---

### `PUT /products/:productId/screens/:screenId`

Обновить экран (полная замена).

**Request:**
```json
{
  "name": "Updated Screen",
  "type": "Screen",
  "sections": { /* ... */ }
}
```

**Response (200 OK):**
```json
{
  "id": "screen-new",
  "name": "Updated Screen",
  "updatedAt": "2025-09-30T18:00:00Z"
}
```

---

### `DELETE /products/:productId/screens/:screenId`

Удалить экран.

**Response (204 No Content)**

**Error (409 Conflict):**
```json
{
  "error": "Cannot delete screen referenced by nodes",
  "code": "SCREEN_IN_USE",
  "referencedBy": ["node-1", "node-2"]
}
```

---

## Variables API

### `GET /products/:productId/variables`

Получить все переменные продукта.

**Response (200 OK):**
```json
{
  "data": [
    {
      "path": "cart.items",
      "schema": {
        "type": "array",
        "items": "object"
      },
      "defaultValue": [],
      "description": "Список товаров в корзине",
      "tags": ["cart", "user-data"]
    },
    {
      "path": "cart.totalPrice",
      "schema": {
        "type": "number"
      },
      "defaultValue": 0,
      "description": "Итоговая стоимость",
      "tags": ["cart", "calculated"]
    }
  ]
}
```

---

### `POST /products/:productId/variables`

Создать новую переменную.

**Request:**
```json
{
  "path": "user.preferences",
  "schema": {
    "type": "object",
    "properties": {
      "theme": "string",
      "language": "string"
    }
  },
  "defaultValue": {
    "theme": "light",
    "language": "ru"
  },
  "description": "Пользовательские настройки",
  "tags": ["user", "settings"]
}
```

**Response (201 Created):**
```json
{
  "path": "user.preferences",
  "createdAt": "2025-09-30T18:30:00Z"
}
```

---

### `PUT /products/:productId/variables/:path`

Обновить переменную.

**Path Parameters:**
- `path` (string, required) — путь переменной (URL-encoded: `cart.items` → `cart%2Eitems`)

**Request:**
```json
{
  "schema": {
    "type": "array",
    "items": "object"
  },
  "defaultValue": [],
  "description": "Updated description"
}
```

**Response (200 OK):**
```json
{
  "path": "cart.items",
  "updatedAt": "2025-09-30T19:00:00Z"
}
```

---

### `DELETE /products/:productId/variables/:path`

Удалить переменную.

**Response (204 No Content)**

**Error (409 Conflict):**
```json
{
  "error": "Cannot delete variable with dependencies",
  "code": "VARIABLE_HAS_DEPENDENCIES",
  "dependencies": ["cart.totalPrice", "cart.selectedCount"]
}
```

---

## Graph API

### `GET /products/:productId/graph`

Получить граф узлов и рёбер для визуализации в React Flow.

**Response (200 OK):**
```json
{
  "nodes": [
    {
      "id": "loading",
      "type": "screen",
      "position": { "x": 100, "y": 100 },
      "data": {
        "label": "Загрузка корзины",
        "screenId": "screen-loading",
        "start": true
      }
    },
    {
      "id": "cart-main",
      "type": "screen",
      "position": { "x": 400, "y": 100 },
      "data": {
        "label": "Корзина (основной экран)",
        "screenId": "screen-cart-main"
      }
    }
  ],
  "edges": [
    {
      "id": "edge-load-complete",
      "source": "loading",
      "target": "cart-main",
      "type": "smoothstep",
      "label": "loadComplete",
      "data": {
        "event": "loadComplete",
        "contextPatch": {
          "ui.ready": true
        }
      }
    }
  ]
}
```

---

### `POST /products/:productId/nodes`

Создать новый узел.

**Request:**
```json
{
  "id": "new-node",
  "label": "New Node",
  "type": "screen",
  "screenId": "screen-new",
  "position": { "x": 700, "y": 100 },
  "edges": []
}
```

**Response (201 Created):**
```json
{
  "id": "new-node",
  "createdAt": "2025-09-30T19:30:00Z"
}
```

---

### `PUT /products/:productId/nodes/:nodeId`

Обновить узел.

**Request:**
```json
{
  "label": "Updated Node Label",
  "position": { "x": 800, "y": 150 },
  "edges": [
    {
      "id": "edge-new",
      "label": "New Edge",
      "event": "onClick",
      "target": "cart-main",
      "contextPatch": {}
    }
  ]
}
```

**Response (200 OK):**
```json
{
  "id": "new-node",
  "updatedAt": "2025-09-30T20:00:00Z"
}
```

---

### `DELETE /products/:productId/nodes/:nodeId`

Удалить узел.

**Response (204 No Content)**

---

### `POST /products/:productId/edges`

Создать новое ребро.

**Request:**
```json
{
  "id": "edge-123",
  "source": "node-1",
  "target": "node-2",
  "label": "onClick",
  "event": "onClick",
  "contextPatch": {
    "ui.clicked": true
  }
}
```

**Response (201 Created):**
```json
{
  "id": "edge-123",
  "createdAt": "2025-09-30T20:30:00Z"
}
```

---

### `DELETE /products/:productId/edges/:edgeId`

Удалить ребро.

**Response (204 No Content)**

---

## Analytics API

### `POST /analytics/events`

Отправить батч аналитических событий.

**Request:**
```json
{
  "productId": "prod-123",
  "sessionId": "session-abc",
  "events": [
    {
      "id": "event-1",
      "type": "SCREEN_VIEW",
      "timestamp": 1727712896789,
      "screenId": "screen-cart-main",
      "screenName": "Корзина",
      "nodeId": "cart-main"
    },
    {
      "id": "event-2",
      "type": "UI_CLICK",
      "timestamp": 1727712897123,
      "componentId": "button-checkout",
      "componentType": "button",
      "screenId": "screen-cart-main",
      "label": "Оформить доставку"
    }
  ]
}
```

**Response (202 Accepted):**
```json
{
  "accepted": 2,
  "message": "Events queued for processing"
}
```

---

### `GET /analytics/products/:productId`

Получить аналитику по продукту.

**Query Parameters:**
- `startDate` (ISO8601, required) — начало периода
- `endDate` (ISO8601, required) — конец периода
- `metrics` (string[], optional) — метрики: `screenViews`, `clicks`, `avgDuration`, `bounceRate`
- `groupBy` (string, default: `day`) — группировка: `hour`, `day`, `week`, `month`

**Example Request:**
```
GET /analytics/products/prod-123?startDate=2025-09-01T00:00:00Z&endDate=2025-09-30T23:59:59Z&metrics=screenViews,clicks&groupBy=day
```

**Response (200 OK):**
```json
{
  "productId": "prod-123",
  "period": {
    "startDate": "2025-09-01T00:00:00Z",
    "endDate": "2025-09-30T23:59:59Z"
  },
  "metrics": {
    "screenViews": {
      "total": 1250,
      "unique": 850,
      "timeseries": [
        { "date": "2025-09-01", "value": 45 },
        { "date": "2025-09-02", "value": 52 }
      ]
    },
    "clicks": {
      "total": 3200,
      "timeseries": [
        { "date": "2025-09-01", "value": 120 },
        { "date": "2025-09-02", "value": 135 }
      ]
    },
    "avgDuration": {
      "value": 45.3,
      "unit": "seconds"
    },
    "bounceRate": {
      "value": 12.5,
      "unit": "percent"
    }
  },
  "topScreens": [
    {
      "screenId": "screen-cart-main",
      "screenName": "Корзина",
      "views": 450,
      "avgDuration": 60.2
    }
  ],
  "topComponents": [
    {
      "componentId": "button-checkout",
      "componentType": "button",
      "label": "Оформить доставку",
      "clicks": 320
    }
  ]
}
```

---

### `GET /analytics/products/:productId/funnels`

Получить данные воронок (funnel analysis).

**Response (200 OK):**
```json
{
  "funnels": [
    {
      "name": "Checkout Flow",
      "steps": [
        {
          "screenId": "screen-cart-main",
          "screenName": "Корзина",
          "users": 1000,
          "dropoff": 0
        },
        {
          "screenId": "screen-checkout",
          "screenName": "Оформление",
          "users": 650,
          "dropoff": 35.0
        },
        {
          "screenId": "screen-payment",
          "screenName": "Оплата",
          "users": 520,
          "dropoff": 20.0
        },
        {
          "screenId": "screen-success",
          "screenName": "Успех",
          "users": 480,
          "dropoff": 7.7
        }
      ],
      "conversionRate": 48.0
    }
  ]
}
```

---

### `GET /analytics/products/:productId/heatmaps/:screenId`

Получить heatmap данные для экрана.

**Response (200 OK):**
```json
{
  "screenId": "screen-cart-main",
  "width": 375,
  "height": 812,
  "clicks": [
    {
      "x": 187,
      "y": 750,
      "count": 150,
      "componentId": "button-checkout"
    },
    {
      "x": 50,
      "y": 200,
      "count": 45,
      "componentId": "button-remove"
    }
  ]
}
```

---

## Assets API

### `POST /assets/upload`

Загрузить изображение или файл.

**Request (multipart/form-data):**
```
POST /assets/upload
Content-Type: multipart/form-data

file: <binary>
productId: prod-123
folder: images
```

**Response (201 Created):**
```json
{
  "id": "asset-789",
  "url": "https://cdn.bdui.com/assets/prod-123/images/image.png",
  "filename": "image.png",
  "size": 245760,
  "mimeType": "image/png",
  "uploadedAt": "2025-09-30T21:00:00Z"
}
```

---

### `GET /assets/:id`

Получить метаданные ассета.

**Response (200 OK):**
```json
{
  "id": "asset-789",
  "url": "https://cdn.bdui.com/assets/prod-123/images/image.png",
  "filename": "image.png",
  "size": 245760,
  "mimeType": "image/png",
  "dimensions": {
    "width": 1920,
    "height": 1080
  },
  "productId": "prod-123",
  "uploadedAt": "2025-09-30T21:00:00Z",
  "uploadedBy": {
    "id": "user-123",
    "name": "Admin User"
  }
}
```

---

### `DELETE /assets/:id`

Удалить ассет.

**Response (204 No Content)**

---

## Webhooks

### `POST /webhooks`

Создать webhook для получения событий.

**Request:**
```json
{
  "url": "https://yourapp.com/webhook",
  "events": ["product.created", "product.updated", "product.published"],
  "secret": "webhook_secret_key"
}
```

**Response (201 Created):**
```json
{
  "id": "webhook-123",
  "url": "https://yourapp.com/webhook",
  "events": ["product.created", "product.updated", "product.published"],
  "createdAt": "2025-09-30T21:30:00Z",
  "status": "active"
}
```

---

### Webhook Payload Example

**Event: product.published**

```json
{
  "event": "product.published",
  "timestamp": "2025-09-30T22:00:00Z",
  "data": {
    "productId": "prod-123",
    "name": "Avito Cart Demo",
    "version": "1.0.0",
    "publishedBy": {
      "id": "user-123",
      "name": "Admin User"
    },
    "deploymentUrl": "https://runtime.bdui.com/prod-123"
  },
  "signature": "sha256=abc123..."
}
```

---

## Error Handling

### Standard Error Response

```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "message": "Technical details",
  "details": [
    {
      "field": "fieldName",
      "message": "Field-specific error",
      "value": "invalid_value"
    }
  ],
  "timestamp": "2025-09-30T22:30:00Z",
  "requestId": "req-abc123"
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Invalid or missing token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `CONFLICT` | 409 | Resource conflict (duplicate, in use) |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Rate Limiting

**Limits:**
- **Free Tier:** 100 requests/minute
- **Pro Tier:** 1000 requests/minute
- **Enterprise:** Unlimited

**Headers:**
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 950
X-RateLimit-Reset: 1727713200
```

**Error (429 Too Many Requests):**
```json
{
  "error": "Rate limit exceeded",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 60
}
```

---

## Versioning

**Current Version:** v1

API версионируется через URL prefix: `/v1`

При breaking changes будет введён `/v2` с поддержкой `/v1` в течение 12 месяцев.

**Deprecation Header:**
```
Deprecation: Sun, 30 Sep 2026 00:00:00 GMT
Sunset: Sun, 30 Sep 2027 00:00:00 GMT
```

---

## SDK & Client Libraries

**JavaScript/TypeScript:**
```bash
npm install @bdui/admin-client
```

```typescript
import { BDUIClient } from '@bdui/admin-client';

const client = new BDUIClient({
  baseURL: 'https://api.bdui.com/v1',
  token: 'your_jwt_token'
});

// Get products
const products = await client.products.list({ status: 'active' });

// Create product
const newProduct = await client.products.create({
  name: 'New Product',
  slug: 'new-product'
});

// Update screen
await client.screens.update('prod-123', 'screen-1', {
  name: 'Updated Screen'
});
```

**Python:**
```bash
pip install bdui-admin-client
```

```python
from bdui_admin_client import BDUIClient

client = BDUIClient(
    base_url='https://api.bdui.com/v1',
    token='your_jwt_token'
)

# Get products
products = client.products.list(status='active')

# Create product
new_product = client.products.create(
    name='New Product',
    slug='new-product'
)
```

---

## WebSocket API (Real-time)

### Connection

```javascript
const ws = new WebSocket('wss://api.bdui.com/v1/ws?token=your_jwt_token');

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'subscribe',
    channel: 'product.prod-123'
  }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log(message);
  // { type: 'product.updated', data: { ... } }
};
```

### Events

- `product.updated` — продукт обновлён
- `screen.updated` — экран обновлён
- `node.added` — добавлен узел
- `analytics.event` — новое аналитическое событие

---

## GraphQL API (Optional)

**Endpoint:** `POST /graphql`

**Example Query:**
```graphql
query GetProduct($id: ID!) {
  product(id: $id) {
    id
    name
    status
    screens {
      id
      name
      components {
        id
        type
      }
    }
    nodes {
      id
      label
      type
      edges {
        id
        target
        event
      }
    }
  }
}
```

**Example Mutation:**
```graphql
mutation UpdateProduct($id: ID!, $input: ProductInput!) {
  updateProduct(id: $id, input: $input) {
    id
    name
    updatedAt
  }
}
```

---

## Testing & Sandbox Environment

**Sandbox Base URL:** `https://sandbox-api.bdui.com/v1`

**Test Credentials:**
```
Email: test@bdui.com
Password: test123456
```

**Test Data:**
- Все операции в sandbox не влияют на production данные
- Автоматический reset каждые 24 часа
- Rate limits увеличены в 10x

---

## Support & Resources

- **API Documentation:** https://docs.bdui.com/api
- **SDK GitHub:** https://github.com/bdui/admin-sdk
- **Status Page:** https://status.bdui.com
- **Support Email:** api-support@bdui.com
- **Discord Community:** https://discord.gg/bdui

---

**Last Updated:** 2025-09-30  
**Version:** v1.0.0  
**Contact:** api@bdui.com
