# ✅ Готово: Глобальная конфигурация API

## 🎯 Что сделано

Создана **централизованная система управления API URL** через файл `src/config/api.js`.

## 📁 Новые файлы

### Конфигурация:
- ✅ `src/config/api.js` - глобальные настройки API
  - `BASE_URL` - базовый URL (https://sandkittens.me)
  - `API_ENDPOINTS` - все endpoints
  - `API_TIMEOUT` - timeout запросов
  - `ENABLE_API_LOGGING` - логирование
  - Хелперы: `getBaseUrl()`, `getApiUrl()`, `logApi*()`

### Документация:
- ✅ `docs/API_CONFIG_GUIDE.md` - подробное руководство
- ✅ `CHANGE_API_URL.md` - быстрая памятка

## 🔄 Обновлённые файлы

Все файлы теперь импортируют URL из `src/config/api.js`:

- ✅ `src/utils/workflowApi.js`
  - Импортирует `getBaseUrl()`, `getApiUrl()`, `API_ENDPOINTS`
  - Добавлено логирование запросов/ответов/ошибок
  - Замеряет время выполнения запросов

- ✅ `src/services/workflowApi.js`
  - `constructor(baseUrl = getBaseUrl())`

- ✅ `src/hooks/useWorkflowApi.js`
  - `DEFAULT_SERVER_URL = getBaseUrl()`

- ✅ `src/components/WorkflowSettings/WorkflowSettings.jsx`
  - Импортирует `getBaseUrl()`
  - `placeholder={getBaseUrl()}`
  - Использует в `handleSaveSettings()` и `handleReset()`

## 🚀 Как использовать

### Вариант 1: Через конфигурационный файл

Откройте `src/config/api.js` и измените:

```javascript
export const BASE_URL = 'https://sandkittens.me';
```

На любой другой URL:

```javascript
export const BASE_URL = 'http://localhost:8000';
```

**Сохраните** → **Перезапустите** `npm run dev` → Готово! 🎉

### Вариант 2: Через .env

Создайте `.env`:

```bash
VITE_WORKFLOW_API_BASE=https://custom-url.com
```

## 📊 Преимущества

### До:
- ❌ URL захардкожен в 5+ файлах
- ❌ Нужно менять в каждом файле вручную
- ❌ Легко пропустить файл
- ❌ Нет единого места для настроек

### После:
- ✅ **Одна точка изменения** (`src/config/api.js`)
- ✅ **Автоматическое применение** во всех файлах
- ✅ **Логирование запросов** (включается/выключается глобально)
- ✅ **Type-safe endpoints** (все в одном месте)
- ✅ **Environment override** (через `.env`)
- ✅ **Retry конфигурация** (глобальная)

## 🧪 Логирование

При `ENABLE_API_LOGGING = true` в консоли:

```
[API] POST https://sandkittens.me/client/workflow { client_session_id: '...', ... }
[API] POST https://sandkittens.me/client/workflow → 200 (245ms)
```

При ошибках:

```
[API] POST https://sandkittens.me/client/workflow → ERROR (312ms) Error: ...
```

## 📝 Checklist

При изменении API URL:

- [x] Создан `src/config/api.js`
- [x] Обновлены все импорты в утилитах
- [x] Обновлены все импорты в сервисах
- [x] Обновлены все импорты в хуках
- [x] Обновлены все импорты в компонентах
- [x] Добавлено логирование API
- [x] Создана документация
- [x] Проверены ошибки (0 errors)
- [x] Готово к использованию!

## 🎓 Документация

- **Подробное руководство:** [docs/API_CONFIG_GUIDE.md](docs/API_CONFIG_GUIDE.md)
- **Быстрая памятка:** [CHANGE_API_URL.md](CHANGE_API_URL.md)
- **API интеграция:** [docs/workflow-api-integration.md](docs/workflow-api-integration.md)

## 🔗 Примеры

### Переключение на localhost:

```javascript
// src/config/api.js
export const BASE_URL = 'http://localhost:8000';
```

### Отключение логов:

```javascript
// src/config/api.js
export const ENABLE_API_LOGGING = false;
```

### Добавление нового endpoint:

```javascript
// src/config/api.js
export const API_ENDPOINTS = {
  WORKFLOW: '/client/workflow',
  NEW_ENDPOINT: '/api/new', // Добавили
};
```

```javascript
// В коде:
import { getApiUrl, API_ENDPOINTS } from '@/config/api';
const url = getApiUrl(API_ENDPOINTS.NEW_ENDPOINT);
```

## 🎯 Главное

**Теперь для смены API URL достаточно изменить 1 строку в 1 файле!**

```javascript
// src/config/api.js (строка 18)
export const BASE_URL = 'https://your-new-url.com';
```

Сохранить → Перезапустить → Работает! ✨

---

**Commit message:**
```
feat: add centralized API configuration

- Create src/config/api.js with BASE_URL and endpoints
- Add API logging helpers (logApiRequest, logApiResponse, logApiError)
- Update all files to import from centralized config
- Add comprehensive documentation
- Now changing API URL requires editing only 1 file
```
