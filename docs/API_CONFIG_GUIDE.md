# 🔧 Глобальная конфигурация API

## Файл: `src/config/api.js`

Централизованное управление всеми API URL и настройками.

## 🎯 Быстрое изменение BASE_URL

### Откройте `src/config/api.js`:

```javascript
// ====================================
// 🔧 ГЛАВНАЯ НАСТРОЙКА - МЕНЯЙТЕ ЗДЕСЬ
// ====================================

export const BASE_URL = 'https://sandkittens.me';
```

### Поддерживаемые варианты:

```javascript
// Production
export const BASE_URL = 'https://sandkittens.me';

// Localhost для разработки
export const BASE_URL = 'http://localhost:8000';

// Staging сервер
export const BASE_URL = 'https://staging.sandkittens.me';

// Custom сервер
export const BASE_URL = 'https://your-custom-api.com';
```

## 📦 Автоматическое применение

После изменения `BASE_URL` **все компоненты и утилиты** автоматически используют новый URL:

- ✅ `src/utils/workflowApi.js` - загрузка workflow
- ✅ `src/services/workflowApi.js` - WorkflowAPI клиент
- ✅ `src/hooks/useWorkflowApi.js` - React хук
- ✅ `src/components/WorkflowSettings/WorkflowSettings.jsx` - UI компонент
- ✅ Все интеграционные тесты

## ⚙️ Дополнительные настройки

### Timeout для запросов:

```javascript
export const API_TIMEOUT = 30000; // 30 секунд (по умолчанию)
```

### Логирование API запросов:

```javascript
export const ENABLE_API_LOGGING = true; // Включить (по умолчанию)
export const ENABLE_API_LOGGING = false; // Выключить
```

Пример логов:
```
[API] POST https://sandkittens.me/client/workflow { client_session_id: '...', ... }
[API] POST https://sandkittens.me/client/workflow → 200 (245ms)
```

### Retry настройки:

```javascript
export const API_RETRY_CONFIG = {
  maxRetries: 3,          // Максимум попыток
  retryDelay: 1000,       // Задержка между попытками (мс)
  retryOn: [408, 500, 502, 503, 504], // HTTP коды для retry
};
```

## 🔌 API Endpoints

Все endpoints определены в одном месте:

```javascript
export const API_ENDPOINTS = {
  // Workflow API
  WORKFLOW: '/client/workflow',
  WORKFLOWS_LIST: '/api/workflows',
  WORKFLOW_SAVE: '/api/workflows',
  
  // Sandbox API (legacy)
  SANDBOX_START: '/api/start',
  SANDBOX_ACTION: '/api/action',
};
```

## 💻 Использование в коде

### Импорт:

```javascript
import { getBaseUrl, getApiUrl, API_ENDPOINTS } from '@/config/api';
```

### Получить BASE_URL:

```javascript
const baseUrl = getBaseUrl();
console.log(baseUrl); // 'https://sandkittens.me'
```

### Получить полный URL:

```javascript
const url = getApiUrl(API_ENDPOINTS.WORKFLOW);
console.log(url); // 'https://sandkittens.me/client/workflow'
```

### Пример запроса:

```javascript
import { getApiUrl, API_ENDPOINTS, logApiRequest } from '@/config/api';

async function loadData() {
  const url = getApiUrl(API_ENDPOINTS.WORKFLOW);
  
  logApiRequest('POST', url, { data: '...' });
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ... })
  });
  
  return response.json();
}
```

## 🌍 Environment Variables (приоритет)

Можно переопределить через `.env`:

```bash
# .env
VITE_WORKFLOW_API_BASE=https://custom-url.com
```

**Приоритет:**
1. `VITE_WORKFLOW_API_BASE` (environment variable)
2. `BASE_URL` (из `src/config/api.js`)

## 🧪 Тестирование разных окружений

### Local development:

```javascript
// src/config/api.js
export const BASE_URL = 'http://localhost:8000';
```

### Staging:

```javascript
// src/config/api.js
export const BASE_URL = 'https://staging.sandkittens.me';
```

### Production:

```javascript
// src/config/api.js
export const BASE_URL = 'https://sandkittens.me';
```

## 📝 Checklist при смене URL

- [ ] Откройте `src/config/api.js`
- [ ] Измените `export const BASE_URL = '...'`
- [ ] Сохраните файл (Ctrl/Cmd + S)
- [ ] Перезапустите dev сервер (`npm run dev`)
- [ ] Проверьте в консоли: `[API] POST https://...`
- [ ] Тестируйте Sandbox/Preview с новым URL

## 🔍 Debugging

### Проверить текущий BASE_URL:

Откройте консоль браузера:

```javascript
import { getBaseUrl } from '@/config/api';
console.log('Current BASE_URL:', getBaseUrl());
```

### Включить логирование:

```javascript
// src/config/api.js
export const ENABLE_API_LOGGING = true;
```

Теперь в консоли:
```
[API] POST https://sandkittens.me/client/workflow { ... }
[API] POST https://sandkittens.me/client/workflow → 200 (245ms)
```

## ⚠️ Важно

### Не дублируйте URL в коде!

❌ **НЕ ДЕЛАЙТЕ ТАК:**
```javascript
const url = 'https://sandkittens.me/client/workflow'; // Хардкод!
```

✅ **ДЕЛАЙТЕ ТАК:**
```javascript
import { getApiUrl, API_ENDPOINTS } from '@/config/api';
const url = getApiUrl(API_ENDPOINTS.WORKFLOW);
```

### Используйте хелперы:

- `getBaseUrl()` - получить BASE_URL
- `getApiUrl(endpoint)` - получить полный URL
- `logApiRequest()`, `logApiResponse()`, `logApiError()` - логирование

## 📊 Преимущества централизации

✅ **Одна точка изменения** - меняете в одном файле  
✅ **Консистентность** - весь код использует одинаковый URL  
✅ **Легко тестировать** - быстрое переключение между окружениями  
✅ **Type-safe endpoints** - все endpoints в одном месте  
✅ **Логирование** - включается/выключается глобально  
✅ **Environment override** - можно переопределить через `.env`  

## 🚀 Примеры

### Переключение на localhost:

```javascript
// src/config/api.js
export const BASE_URL = 'http://localhost:8000';
```

Сохранить → Перезапустить → Готово! 🎉

### Временное отключение логов:

```javascript
// src/config/api.js
export const ENABLE_API_LOGGING = false;
```

### Добавить новый endpoint:

```javascript
// src/config/api.js
export const API_ENDPOINTS = {
  WORKFLOW: '/client/workflow',
  // Добавляем новый:
  USER_PROFILE: '/api/user/profile',
};
```

Использование:
```javascript
const url = getApiUrl(API_ENDPOINTS.USER_PROFILE);
// => 'https://sandkittens.me/api/user/profile'
```

---

**Главное правило:** Меняйте URL только в `src/config/api.js`! 🎯
