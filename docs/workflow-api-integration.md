# 🚀 API загрузки Workflow для Sandbox и Preview

## Обзор

Теперь Sandbox и Preview могут загружать workflow динамически через API вместо использования статических JSON файлов.

## 📡 API Endpoint

### POST /client/workflow

Получить workflow по client_session_id и client_workflow_id.

**URL:** `http://localhost:8000/client/workflow` (или `VITE_WORKFLOW_API_BASE` из .env)

**Method:** `POST`

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "client_session_id": "1234567890",
  "client_workflow_id": "68dc7bc60335a481514bbb4c"
}
```

**Response (200 OK):**
```json
{
  "id": "68dc7bc60335a481514bbb4c",
  "name": "My Workflow",
  "version": "1.0.0",
  "nodes": [
    {
      "id": "screen-1",
      "label": "Start Screen",
      "type": "screen",
      "start": true,
      "screenId": "screen-1-id",
      "edges": [...]
    }
  ],
  "edges": [...],
  "screens": {
    "screen-1-id": {
      "id": "screen-1-id",
      "name": "Start Screen",
      "sections": {...}
    }
  },
  "initialContext": {
    "user": { "name": "John" }
  },
  "variableSchemas": {
    "user": { "type": "object", "schema": {...} }
  }
}
```

**Error Response (4xx/5xx):**
```json
{
  "error": "Workflow not found"
}
```

## 🎯 Использование

### 1. Sandbox через URL параметры

**URL формат:**
```
/sandbox?session_id=1234567890&workflow_id=68dc7bc60335a481514bbb4c
```

**Пример:**
```javascript
// Открыть Sandbox с workflow из API
const sessionId = "1234567890";
const workflowId = "68dc7bc60335a481514bbb4c";

window.location.href = `/sandbox?session_id=${sessionId}&workflow_id=${workflowId}`;
```

### 2. Preview через URL параметры

**URL формат:**
```
/preview?session_id=1234567890&workflow_id=68dc7bc60335a481514bbb4c
```

**Пример:**
```javascript
// Открыть Preview с workflow из API
const sessionId = "1234567890";
const workflowId = "68dc7bc60335a481514bbb4c";

window.location.href = `/preview?session_id=${sessionId}&workflow_id=${workflowId}`;
```

### 3. Программное использование API утилиты

```javascript
import { loadWorkflow, fetchWorkflowById } from '@/utils/workflowApi';

// Вариант 1: Полная загрузка и нормализация
const workflow = await loadWorkflow('1234567890', '68dc7bc60335a481514bbb4c');
console.log(workflow.nodes);
console.log(workflow.screens);
console.log(workflow.startNodeId);

// Вариант 2: Только запрос к API
const rawData = await fetchWorkflowById('1234567890', '68dc7bc60335a481514bbb4c');
console.log(rawData);
```

## ⚙️ Конфигурация

### Environment Variables

Создайте `.env` файл в корне проекта:

```bash
# API endpoint для загрузки workflow
VITE_WORKFLOW_API_BASE=http://localhost:8000

# API endpoint для sandbox (legacy)
VITE_SANDBOX_API_BASE=http://localhost:5050
```

**По умолчанию:**
- `VITE_WORKFLOW_API_BASE` = `http://localhost:8000`
- `VITE_SANDBOX_API_BASE` = пусто (не используется)

## 🔄 Приоритеты загрузки

### Sandbox:

1. **Workflow API** (если есть `?session_id=X&workflow_id=Y`)
2. **location.state.product** (переданный через navigate)
3. **Sandbox API** (если доступен `/api/start`)
4. **avitoDemo.json** (fallback)

### Preview:

1. **Workflow API** (если есть `?session_id=X&workflow_id=Y`)
2. **Sandbox API** (если доступен `/api/start`)

## 📦 API утилиты (workflowApi.js)

### fetchWorkflowById(clientSessionId, clientWorkflowId)

Выполняет POST запрос к `/client/workflow`.

**Параметры:**
- `clientSessionId` (string) - ID сессии клиента
- `clientWorkflowId` (string) - ID workflow

**Возвращает:** `Promise<Object>` - сырые данные от API

**Throws:**
- `Error` - если параметры не переданы
- `Error` - если API вернул ошибку
- `Error` - если не удалось подключиться к API

```javascript
try {
  const data = await fetchWorkflowById('session123', 'workflow456');
  console.log(data);
} catch (error) {
  console.error('Ошибка:', error.message);
}
```

### loadWorkflow(clientSessionId, clientWorkflowId)

Загружает и нормализует workflow для использования в Sandbox/Preview.

**Параметры:**
- `clientSessionId` (string) - ID сессии клиента
- `clientWorkflowId` (string) - ID workflow

**Возвращает:** `Promise<Object>` - нормализованные данные

```javascript
const workflow = await loadWorkflow('session123', 'workflow456');

// Структура ответа:
{
  nodes: [...],
  edges: [...],
  screens: {...},
  initialContext: {...},
  variableSchemas: {...},
  startNodeId: 'screen-1',
  metadata: {
    id: 'workflow456',
    name: 'My Workflow',
    version: '1.0.0'
  }
}
```

### normalizeWorkflowData(workflowData)

Нормализует сырые данные от API в универсальный формат.

**Параметры:**
- `workflowData` (Object) - сырые данные от API

**Возвращает:** `Object` - нормализованные данные

```javascript
const rawData = await fetchWorkflowById(...);
const normalized = normalizeWorkflowData(rawData);
```

### parseWorkflowUrlParams(searchParams)

Извлекает параметры workflow из URL.

**Параметры:**
- `searchParams` (URLSearchParams | string) - URL параметры

**Возвращает:** `Object` - `{ clientSessionId, clientWorkflowId }`

```javascript
import { useSearchParams } from 'react-router-dom';
import { parseWorkflowUrlParams } from '@/utils/workflowApi';

const [searchParams] = useSearchParams();
const { clientSessionId, clientWorkflowId } = parseWorkflowUrlParams(searchParams);

if (clientSessionId && clientWorkflowId) {
  // Загружаем workflow
}
```

### getWorkflowUrlParams(clientSessionId, clientWorkflowId)

Создаёт URLSearchParams для workflow.

**Параметры:**
- `clientSessionId` (string) - ID сессии
- `clientWorkflowId` (string) - ID workflow

**Возвращает:** `URLSearchParams`

```javascript
const params = getWorkflowUrlParams('session123', 'workflow456');
navigate(`/sandbox?${params.toString()}`);
// Результат: /sandbox?session_id=session123&workflow_id=workflow456
```

## 🎨 UI состояния

### Состояния загрузки:

1. **Loading** - показывается спиннер с текстом "Загрузка workflow..."
2. **Error** - показывается сообщение об ошибке с кнопкой "Попробовать снова"
3. **Success** - отображается workflow

### Sandbox:

```jsx
// Loading
<div className="sandbox-loading">
  <div className="sandbox-loading-spinner"></div>
  <h2>Загрузка workflow...</h2>
  <p>Пожалуйста, подождите</p>
</div>

// Error
<div className="sandbox-error">
  <h2>Ошибка загрузки workflow</h2>
  <p>{errorMessage}</p>
  <button onClick={retry}>Попробовать снова</button>
</div>
```

### Preview:

```jsx
// Loading
<div className="preview-loading">
  <div className="preview-spinner"></div>
  <p>Загрузка workflow...</p>
</div>

// Error
<div className="preview-error">
  <h2>Ошибка</h2>
  <p>{errorMessage}</p>
  <button onClick={retry}>Попробовать снова</button>
</div>
```

## 🧪 Примеры использования

### Пример 1: Открыть Sandbox с конкретным workflow

```javascript
import { useNavigate } from 'react-router-dom';
import { getWorkflowUrlParams } from '@/utils/workflowApi';

function OpenWorkflowButton() {
  const navigate = useNavigate();
  
  const handleClick = () => {
    const params = getWorkflowUrlParams('1234567890', '68dc7bc60335a481514bbb4c');
    navigate(`/sandbox?${params.toString()}`);
  };
  
  return <button onClick={handleClick}>Открыть Workflow</button>;
}
```

### Пример 2: Загрузить workflow программно

```javascript
import { loadWorkflow } from '@/utils/workflowApi';
import { useState, useEffect } from 'react';

function WorkflowViewer({ sessionId, workflowId }) {
  const [workflow, setWorkflow] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadWorkflow(sessionId, workflowId)
      .then(data => {
        setWorkflow(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [sessionId, workflowId]);
  
  if (loading) return <div>Загрузка...</div>;
  if (!workflow) return <div>Ошибка загрузки</div>;
  
  return (
    <div>
      <h1>{workflow.metadata.name}</h1>
      <p>Узлов: {workflow.nodes.length}</p>
      <p>Стартовый: {workflow.startNodeId}</p>
    </div>
  );
}
```

### Пример 3: Ссылка на Preview с workflow

```jsx
function WorkflowPreviewLink({ sessionId, workflowId, name }) {
  const url = `/preview?session_id=${sessionId}&workflow_id=${workflowId}`;
  
  return (
    <a href={url} target="_blank" rel="noopener noreferrer">
      Открыть "{name}" в Preview
    </a>
  );
}
```

## 🔒 Обработка ошибок

### Типы ошибок:

1. **Missing Parameters** - не переданы обязательные параметры
2. **Network Error** - не удалось подключиться к API
3. **HTTP Error** - API вернул статус ошибки (4xx, 5xx)
4. **Validation Error** - API вернул некорректные данные

### Обработка:

```javascript
try {
  const workflow = await loadWorkflow(sessionId, workflowId);
  // Успешно загружено
} catch (error) {
  if (error.message.includes('clientSessionId и clientWorkflowId обязательны')) {
    // Отсутствуют параметры
  } else if (error.message.includes('Не удалось подключиться к API')) {
    // Проблема сети
  } else if (error.message.includes('API ответил статусом')) {
    // HTTP ошибка
  } else {
    // Другая ошибка
  }
  
  toast.error(`Ошибка: ${error.message}`);
}
```

## 📊 Формат workflow

### Минимальная структура:

```json
{
  "nodes": [
    {
      "id": "unique-id",
      "label": "Screen Name",
      "type": "screen",
      "start": true,
      "screenId": "screen-id",
      "edges": []
    }
  ],
  "screens": {
    "screen-id": {
      "id": "screen-id",
      "name": "Screen Name",
      "sections": {}
    }
  },
  "initialContext": {},
  "variableSchemas": {}
}
```

### Полная структура:

См. [ecommerceDashboard.json](../src/pages/Sandbox/data/ecommerceDashboard.json) или [avitoDemo.json](../src/pages/Sandbox/data/avitoDemo.json)

## 🚨 Troubleshooting

### Проблема: "Не удалось подключиться к API"

**Решение:**
1. Проверьте, что backend запущен на `http://localhost:8000`
2. Проверьте `VITE_WORKFLOW_API_BASE` в `.env`
3. Проверьте CORS настройки на backend

### Проблема: "API ответил статусом 404"

**Решение:**
1. Убедитесь, что endpoint `/client/workflow` существует
2. Проверьте, что передаёте правильные `session_id` и `workflow_id`
3. Проверьте логи backend

### Проблема: "Workflow не содержит стартового узла"

**Решение:**
1. Убедитесь, что хотя бы один node имеет `start: true`
2. Или добавьте первый node как стартовый

### Проблема: URL параметры не работают

**Решение:**
1. Проверьте формат URL: `?session_id=X&workflow_id=Y` (не `?sessionId`)
2. Убедитесь, что используете `useSearchParams()` из `react-router-dom`

## 📝 Changelog

**v1.0.0 (1 октября 2025)**
- ✅ Добавлен API endpoint `/client/workflow`
- ✅ Создана утилита `workflowApi.js`
- ✅ Интеграция с Sandbox через URL параметры
- ✅ Интеграция с Preview через URL параметры
- ✅ UI состояния загрузки и ошибок
- ✅ Автоматические toast уведомления
- ✅ Fallback на статические JSON

## 🔗 См. также

- [Sandbox README](../src/pages/Sandbox/README.md)
- [API Contracts](./api-contracts.md)
- [Deployment Guide](./deployment.md)

---

**Автор:** BDUI Admin Team  
**Дата:** 1 октября 2025
