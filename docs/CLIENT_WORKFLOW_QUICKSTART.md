# Client Workflow API - Quick Start Guide

## 🚀 Быстрый старт

### 1. Использование в компонентах

```jsx
import { useClientWorkflow } from '@/hooks/useClientWorkflow';

function MyComponent() {
  const workflow = useClientWorkflow();
  
  useEffect(() => {
    if (workflow.isApiAvailable) {
      workflow.startWorkflow('my-workflow-id', {});
    }
  }, []);
  
  return (
    <div>
      {workflow.isLoading && <Spinner />}
      {workflow.hasScreen && <Screen data={workflow.screen} />}
      <button onClick={() => workflow.sendAction('next')}>
        Next
      </button>
    </div>
  );
}
```

### 2. API URL Configuration

Изменить base URL в **`src/config/api.js`**:

```javascript
export const BASE_URL = 'https://sandkittens.me/';  // Production
// export const BASE_URL = 'http://127.0.0.1:8080/'; // Local
```

### 3. Sandbox Auto-Connect

**SandboxPage** автоматически:
1. Проверяет Client Workflow API (`https://sandkittens.me`)
2. Fallback на Legacy API (`/api/start`)
3. Если оба недоступны → Offline mode

### 4. Preview Workflow

```
http://localhost:5174/preview?workflow_id=YOUR_WORKFLOW_ID
```

Используйте **PreviewPageNew.jsx** (упрощённый UI)

### 5. Session Management

```javascript
import { getClientSessionId, clearClientSession } from '@/utils/clientSession';

// Получить текущий session ID
const sessionId = getClientSessionId(); 

// Очистить сессию (для тестирования)
clearClientSession();
```

---

## 📦 Созданные файлы

```
src/
├── utils/
│   └── clientSession.js           # Session manager
├── services/
│   └── clientWorkflowApi.js       # API client
├── hooks/
│   └── useClientWorkflow.js       # React hook
└── pages/
    ├── Sandbox/
    │   ├── ClientWorkflowRunner.jsx  # UI component
    │   └── SandboxPage.jsx           # Updated (added Client Workflow support)
    └── Preview/
        ├── PreviewPageNew.jsx        # New Preview page
        └── PreviewPage.css           # Updated styles

docs/
├── CLIENT_WORKFLOW_INTEGRATION.md    # Full guide
└── CLIENT_WORKFLOW_FINAL_SUMMARY.md  # Summary
```

---

## 🔍 API Endpoints (https://sandkittens.me)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/client/workflow` | Запуск workflow |
| POST | `/client/workflow/action` | Отправка действия |
| POST | `/client/workflow/state` | Получить текущее состояние |
| POST | `/client/workflow/reset` | Сброс workflow |
| GET | `/health` | Health check |

---

## 🐛 Troubleshooting

### API недоступен?
```javascript
import { checkClientWorkflowHealth } from '@/services/clientWorkflowApi';

const isAvailable = await checkClientWorkflowHealth();
console.log('API available:', isAvailable);
```

### Session не сохраняется?
1. Проверьте `localStorage` в DevTools
2. Проверьте приватный режим браузера (блокирует localStorage)
3. Используйте `getSessionInfo()` для диагностики

### Workflow не запускается?
1. Проверьте правильность `workflow_id`
2. Проверьте консоль: `[ClientWorkflow]` логи
3. Проверьте сеть: `[API]` логи
4. Проверьте BASE_URL в `src/config/api.js`

---

## ✅ Testing Checklist

- [ ] Открыть http://localhost:5174/sandbox
- [ ] Проверить консоль на автоподключение к API
- [ ] Проверить что используется `ClientWorkflowRunner` (не `ApiSandboxRunner`)
- [ ] Нажать "Перейти в офлайн-режим" → должен переключиться
- [ ] Проверить `localStorage['bdui_client_session_id']` в DevTools
- [ ] Открыть http://localhost:5174/preview?workflow_id=test (нужно добавить route)

---

## 📚 Документация

- 📖 [CLIENT_WORKFLOW_INTEGRATION.md](./CLIENT_WORKFLOW_INTEGRATION.md) - Полное руководство
- 📊 [CLIENT_WORKFLOW_FINAL_SUMMARY.md](./CLIENT_WORKFLOW_FINAL_SUMMARY.md) - Итоговый summary
- 🔧 [API_CONFIG_GUIDE.md](./API_CONFIG_GUIDE.md) - Конфигурация API

---

## 🎯 Next Steps

1. **Протестировать** с реальным бэкендом `https://sandkittens.me`
2. **Добавить route** для `PreviewPageNew` в `App.jsx`
3. **Мигрировать** с Legacy API на Client Workflow API
4. **Добавить метрики** использования (успех/ошибки)

---

Made with ❤️ by BDUI Team
