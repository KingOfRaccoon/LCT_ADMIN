# 🔄 Обновление: Новый базовый API URL

## Дата: 1 октября 2025

## 📝 Изменения

Все API запросы теперь используют **production** URL вместо localhost.

### Старый URL:
```
http://127.0.0.1:8000
http://localhost:8000
```

### Новый URL:
```
https://sandkittens.me
```

## 📁 Обновлённые файлы

### 1. Core API утилиты:
- ✅ `src/utils/workflowApi.js`
  - `API_BASE` → `https://sandkittens.me`

### 2. Services:
- ✅ `src/services/workflowApi.js`
  - `constructor(baseUrl = 'https://sandkittens.me')`

### 3. Hooks:
- ✅ `src/hooks/useWorkflowApi.js`
  - `DEFAULT_SERVER_URL` → `https://sandkittens.me`

### 4. Components:
- ✅ `src/components/WorkflowSettings/WorkflowSettings.jsx`
  - `defaultUrl` → `https://sandkittens.me`
  - `placeholder` → `https://sandkittens.me`

### 5. Tests:
- ✅ `src/utils/workflowIntegrationTests.js`
  - Все `new WorkflowAPI('...')` → `https://sandkittens.me`

### 6. Documentation:
- ✅ `docs/workflow-api-integration.md`
  - Обновлены примеры и конфигурация

## 🔧 Environment Variables

Теперь `.env` файл должен содержать:

```bash
# Production API
VITE_WORKFLOW_API_BASE=https://sandkittens.me

# Legacy sandbox API (опционально)
VITE_SANDBOX_API_BASE=http://localhost:5050
```

**Если переменная не задана**, по умолчанию используется `https://sandkittens.me`.

## 📡 API Endpoints

Все запросы идут на production сервер:

### POST /client/workflow
```bash
curl -X POST https://sandkittens.me/client/workflow \
  -H "Content-Type: application/json" \
  -d '{
    "client_session_id": "1234567890",
    "client_workflow_id": "68dc7bc60335a481514bbb4c"
  }'
```

### GET /api/workflows (если есть)
```bash
curl https://sandkittens.me/api/workflows
```

## 🎯 Использование

### Sandbox
```
https://your-app.com/sandbox?session_id=XXX&workflow_id=YYY
```

Автоматически загружает workflow с:
```
POST https://sandkittens.me/client/workflow
```

### Preview
```
https://your-app.com/preview?session_id=XXX&workflow_id=YYY
```

Автоматически загружает workflow с:
```
POST https://sandkittens.me/client/workflow
```

## ⚠️ Важно

### CORS
Убедитесь, что на `https://sandkittens.me` включены CORS headers:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

### HTTPS
Все запросы теперь идут через **HTTPS** (защищённое соединение).

### Fallback
Mock данные (`avitoDemo.json`, `ecommerceDashboard.json`) **остались** для локальной разработки без API.

## 🧪 Тестирование

### 1. Проверка доступности API:
```bash
curl -I https://sandkittens.me/client/workflow
```

Ожидаемый ответ: `405 Method Not Allowed` или `200 OK` (для OPTIONS)

### 2. Тест из браузера:
Откройте `/workflow-tester.html` и введите:
- `session_id`: `1234567890`
- `workflow_id`: `68dc7bc60335a481514bbb4c`

Кликните "Открыть в Sandbox" или "Открыть в Preview".

### 3. Проверка в DevTools:
Откройте Network tab:
```
POST https://sandkittens.me/client/workflow
Status: 200 OK
Response: { nodes: [...], screens: {...}, ... }
```

## 📊 Преимущества

✅ **Production-ready** - работает с реальным сервером  
✅ **HTTPS** - безопасное соединение  
✅ **Единый базовый URL** - легко менять через `.env`  
✅ **Backward compatible** - можно переопределить через `VITE_WORKFLOW_API_BASE`  
✅ **Mock fallback** - локальные JSON остались для разработки  

## 🔄 Откат изменений

Если нужно вернуться к localhost:

### Вариант 1: Через .env
```bash
# .env
VITE_WORKFLOW_API_BASE=http://localhost:8000
```

### Вариант 2: Через код
Замените в `src/utils/workflowApi.js`:
```javascript
const API_BASE = 'http://localhost:8000';
```

## 📞 Контакты

При проблемах с API на `https://sandkittens.me`:
1. Проверьте статус сервера
2. Проверьте CORS настройки
3. Проверьте логи Network в DevTools
4. Свяжитесь с backend командой

---

**Commit:** `start work with API`  
**Branch:** `master`  
**Date:** 1 октября 2025
