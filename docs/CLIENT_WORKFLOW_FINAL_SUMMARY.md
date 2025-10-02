# Client Workflow API Integration - Final Summary

## ✅ Выполнено

### 1. Client Session Management
**Файл:** `src/utils/clientSession.js`

- ✅ Генерация уникального UUID v4 для каждого посетителя
- ✅ Хранение в `localStorage` под ключом `bdui_client_session_id`
- ✅ Автоматическое создание при первом визите
- ✅ Функции: `getClientSessionId()`, `clearClientSession()`, `touchClientSession()`, `getSessionInfo()`
- ✅ Fallback на временный ID если localStorage недоступен

### 2. Client Workflow API Client
**Файл:** `src/services/clientWorkflowApi.js`

- ✅ Интеграция с `src/config/api.js` → использует `https://sandkittens.me`
- ✅ Автоматическое логирование через `logApiRequest/Response/Error`
- ✅ Методы:
  - `startClientWorkflow(workflowId, initialContext)` - старт workflow
  - `sendClientAction(eventName, inputs)` - отправка действий
  - `getCurrentWorkflowState()` - получение текущего состояния
  - `resetClientWorkflow()` - сброс workflow
  - `checkClientWorkflowHealth()` - health check

### 3. React Hook
**Файл:** `src/hooks/useClientWorkflow.js`

- ✅ Управление состоянием workflow
- ✅ State: `sessionId`, `currentState`, `stateType`, `context`, `screen`, `isLoading`, `error`, `isApiAvailable`
- ✅ Actions: `startWorkflow()`, `sendAction()`, `refreshState()`, `reset()`, `clearError()`
- ✅ Computed: `hasScreen`, `isScreenState`, `isTechnicalState`
- ✅ Автоматическая проверка API при монтировании

### 4. ClientWorkflowRunner Component
**Файл:** `src/pages/Sandbox/ClientWorkflowRunner.jsx`

- ✅ Полнофункциональный UI для работы с Client Workflow API
- ✅ Автоматический запуск workflow при монтировании
- ✅ Рендеринг экранов через `SandboxScreenRenderer`
- ✅ История переходов между состояниями
- ✅ Отображение контекста в виде таблицы
- ✅ Обработка ошибок с баннером
- ✅ Индикатор загрузки
- ✅ Кнопки: обновить, сброс, выход в офлайн

### 5. SandboxPage Integration
**Файл:** `src/pages/Sandbox/SandboxPage.jsx`

- ✅ Добавлен импорт `ClientWorkflowRunner` и `checkClientWorkflowHealth`
- ✅ Новые API modes: `'client-ready'`, `'legacy-ready'` (вместо просто `'ready'`)
- ✅ Автоматическая проверка доступности API при загрузке:
  1. Сначала проверяется **Client Workflow API** (приоритет)
  2. Если недоступен → fallback на **Legacy API** (`/api/start`)
  3. Если оба недоступны → `apiMode = 'error'`
- ✅ Рендеринг `ClientWorkflowRunner` если `isClientWorkflowReady === true`
- ✅ Рендеринг `ApiSandboxRunner` если `isLegacyApiReady === true` (fallback)
- ✅ Кнопка "Перейти в офлайн-режим" работает для обоих API

### 6. PreviewPage (New)
**Файл:** `src/pages/Preview/PreviewPageNew.jsx`

- ✅ Упрощённый UI для предпросмотра workflow
- ✅ Использует `useClientWorkflow` hook
- ✅ URL параметр: `?workflow_id=...`
- ✅ Автоматический запуск workflow
- ✅ Рендеринг экранов и технических состояний
- ✅ Кнопки: назад, обновить, сброс
- ✅ Error handling с баннерами
- ✅ Loading индикатор

### 7. Стили
**Файл:** `src/pages/Preview/PreviewPage.css`

- ✅ Добавлены стили для новых элементов:
  - `.preview-header-left/right`
  - `.preview-back-btn`, `.preview-state-badge`
  - `.preview-btn`, `.preview-btn-icon`, `.preview-btn-close`
  - `.preview-error-banner`
  - `.preview-loading-bar`, `.preview-loading-progress`
  - `.preview-technical-state`, `.preview-empty`
  - `.preview-footer`, `.preview-footer-info`

### 8. Документация
**Файл:** `docs/CLIENT_WORKFLOW_INTEGRATION.md`

- ✅ Полное руководство по интеграции
- ✅ Описание архитектуры и компонентов
- ✅ Примеры использования
- ✅ Формат данных (Request/Response)
- ✅ Troubleshooting

---

## 🔄 Архитектура

```
┌─────────────────────────────────────────────────────────────────┐
│                         SandboxPage                              │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  1. Health Check (при загрузке)                           │  │
│  │     - checkClientWorkflowHealth() → Client Workflow API   │  │
│  │     - fetch('/api/start') → Legacy API (fallback)         │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              ↓                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  2. Routing по apiMode                                     │  │
│  │     - 'client-ready' → ClientWorkflowRunner               │  │
│  │     - 'legacy-ready' → ApiSandboxRunner (fallback)        │  │
│  │     - 'error' → Offline Mode                              │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    ClientWorkflowRunner                          │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  useClientWorkflow()                                       │  │
│  │    ↓                                                       │  │
│  │  startWorkflow(workflowId, initialContext)                │  │
│  │    ↓                                                       │  │
│  │  clientWorkflowApi.startClientWorkflow()                  │  │
│  │    ↓                                                       │  │
│  │  POST https://sandkittens.me/client/workflow              │  │
│  │    body: { client_session_id, workflow_id, ... }          │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              ↓                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Response:                                                 │  │
│  │    { session_id, context, current_state,                  │  │
│  │      state_type, screen }                                 │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              ↓                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  SandboxScreenRenderer                                     │  │
│  │    - Рендеринг экрана из screen объекта                  │  │
│  │    - Биндинги из context                                  │  │
│  │    - События → sendAction()                               │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                         PreviewPageNew                           │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  URL: /preview?workflow_id=XXX                            │  │
│  │    ↓                                                       │  │
│  │  useClientWorkflow()                                       │  │
│  │    ↓                                                       │  │
│  │  startWorkflow(workflow_id)                               │  │
│  │    ↓                                                       │  │
│  │  POST https://sandkittens.me/client/workflow              │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              ↓                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Упрощённый UI:                                           │  │
│  │    - Заголовок с state                                    │  │
│  │    - Screen renderer                                      │  │
│  │    - Кнопки: назад, обновить, сброс                       │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 Data Flow

### Client Session Flow
```
1. User visits site
   ↓
2. getClientSessionId() checks localStorage
   ↓
3. If not exists → generateSessionId() (UUID v4)
   ↓
4. Save to localStorage['bdui_client_session_id']
   ↓
5. Return sessionId
```

### Workflow Start Flow
```
1. Component calls workflow.startWorkflow(workflowId, initialContext)
   ↓
2. getClientSessionId() retrieves session ID
   ↓
3. POST https://sandkittens.me/client/workflow
   body: { client_session_id, workflow_id, initial_context }
   ↓
4. Server responds:
   { session_id, context, current_state, state_type, screen }
   ↓
5. Hook updates state: currentState, context, screen, etc.
   ↓
6. Component re-renders with new data
```

### Action Flow
```
1. User interacts (button click, form submit)
   ↓
2. Component calls workflow.sendAction(eventName, inputs)
   ↓
3. POST https://sandkittens.me/client/workflow/action
   body: { client_session_id, event, inputs }
   ↓
4. Server processes action and transitions to next state
   ↓
5. Server responds with new state
   ↓
6. Hook updates state
   ↓
7. Component re-renders
```

---

## 🚀 Usage Examples

### Example 1: Sandbox Auto-Connect
```jsx
// SandboxPage.jsx автоматически проверяет API при загрузке

useEffect(() => {
  if (apiMode !== 'checking') return;
  
  const checkApis = async () => {
    // Проверяем Client Workflow API (приоритет)
    const isClientWorkflowAvailable = await checkClientWorkflowHealth();
    
    if (isClientWorkflowAvailable) {
      setApiMode('client-ready'); // Используем новый API
      return;
    }
    
    // Fallback на legacy API
    // ...
  };
  
  checkApis();
}, [apiMode]);

// Рендеринг
if (isClientWorkflowReady) {
  return <ClientWorkflowRunner workflowId={activeWorkflowId} />;
}
```

### Example 2: Preview Workflow
```jsx
// URL: http://localhost:5174/preview?workflow_id=68dd5f600ec286edfa0ac2ed

const PreviewPageNew = () => {
  const workflow = useClientWorkflow();
  const workflowId = searchParams.get('workflow_id');
  
  useEffect(() => {
    if (workflow.isApiAvailable && workflowId) {
      workflow.startWorkflow(workflowId, {});
    }
  }, [workflowId]);
  
  return (
    <div>
      {workflow.hasScreen && (
        <SandboxScreenRenderer
          screen={workflow.screen}
          context={workflow.context}
          onEvent={(event) => workflow.sendAction(event, {})}
        />
      )}
    </div>
  );
};
```

### Example 3: Custom Component
```jsx
function MyCustomWorkflow() {
  const workflow = useClientWorkflow();
  
  const handleLogin = async (email, password) => {
    await workflow.sendAction('login', { email, password });
  };
  
  if (!workflow.isApiAvailable) {
    return <div>API недоступен</div>;
  }
  
  return (
    <div>
      <h1>{workflow.currentState}</h1>
      <button onClick={() => handleLogin('user@example.com', 'secret')}>
        Login
      </button>
    </div>
  );
}
```

---

## 🔍 API Endpoints

### Base URL
```
https://sandkittens.me
```

### POST /client/workflow
Запуск нового workflow

**Request:**
```json
{
  "client_session_id": "550e8400-e29b-41d4-a716-446655440000",
  "workflow_id": "68dd5f600ec286edfa0ac2ed",
  "initial_context": { "user": "John" }
}
```

**Response:**
```json
{
  "session_id": "123123",
  "context": {
    "__workflow_id": "68dd5f600ec286edfa0ac2ed",
    "__created_at": "2025-10-01 17:06:01.583919",
    "user": "John"
  },
  "current_state": "Главный экран",
  "state_type": "screen",
  "screen": {
    "id": "main",
    "type": "screen",
    "name": "Главный экран",
    "style": {},
    "sections": {
      "body": { "children": [...] }
    }
  }
}
```

### POST /client/workflow/action
Отправка действия

**Request:**
```json
{
  "client_session_id": "550e8400-e29b-41d4-a716-446655440000",
  "event": "submit",
  "inputs": {
    "email": "user@example.com",
    "password": "secret"
  }
}
```

**Response:** (тот же формат что и /client/workflow)

### POST /client/workflow/state
Получение текущего состояния без изменений

### POST /client/workflow/reset
Сброс workflow (начало с начала)

### GET /health
Health check

---

## ✅ Testing Checklist

- [ ] **Client Session Manager**
  - [ ] Session ID генерируется при первом визите
  - [ ] Session ID сохраняется в localStorage
  - [ ] Session ID переиспользуется при повторных визитах
  - [ ] `clearClientSession()` удаляет сессию

- [ ] **API Client**
  - [ ] `checkClientWorkflowHealth()` возвращает true если API доступен
  - [ ] `startClientWorkflow()` успешно запускает workflow
  - [ ] `sendClientAction()` отправляет действия
  - [ ] Логирование работает (`[API]` префикс в консоли)

- [ ] **SandboxPage Integration**
  - [ ] При загрузке проверяется Client Workflow API
  - [ ] Если доступен → показывается `ClientWorkflowRunner`
  - [ ] Если недоступен → fallback на Legacy API → `ApiSandboxRunner`
  - [ ] Если оба недоступны → офлайн режим
  - [ ] Кнопка "Перейти в офлайн-режим" работает

- [ ] **ClientWorkflowRunner**
  - [ ] Автоматически запускает workflow при монтировании
  - [ ] Рендерит экраны через `SandboxScreenRenderer`
  - [ ] События корректно отправляются через `sendAction()`
  - [ ] История переходов сохраняется и отображается
  - [ ] Кнопки работают: обновить, сброс, выход

- [ ] **PreviewPageNew**
  - [ ] Работает с URL параметром `?workflow_id=...`
  - [ ] Автоматически запускает workflow
  - [ ] Рендерит экраны
  - [ ] Кнопки работают: назад, обновить, сброс
  - [ ] Показывает ошибки если API недоступен

---

## 📝 Files Changed

### Created (New Files)
1. `src/utils/clientSession.js` - Client session manager
2. `src/services/clientWorkflowApi.js` - API client
3. `src/hooks/useClientWorkflow.js` - React hook
4. `src/pages/Sandbox/ClientWorkflowRunner.jsx` - UI component
5. `src/pages/Preview/PreviewPageNew.jsx` - Preview page
6. `docs/CLIENT_WORKFLOW_INTEGRATION.md` - Documentation

### Modified (Updated Files)
1. `src/pages/Sandbox/SandboxPage.jsx` - Added Client Workflow API support
2. `src/pages/Preview/PreviewPage.css` - Added new styles

---

## 🎯 Next Steps

1. **Testing:** Запустить `npm run dev` и протестировать все сценарии
2. **Backend:** Убедиться что `https://sandkittens.me/client/workflow` отвечает корректно
3. **Routing:** Добавить route для `PreviewPageNew` в `App.jsx`
4. **Legacy Cleanup:** Постепенно мигрировать с legacy API на Client Workflow API
5. **Monitoring:** Добавить метрики использования API (успех/ошибки)

---

## 🐛 Known Issues

- ⚠️ PreviewPageNew создан как отдельный файл, нужно обновить роутинг
- ⚠️ Legacy PreviewPage.jsx остался без изменений (для обратной совместимости)
- ⚠️ Нужно протестировать с реальным бэкендом на `https://sandkittens.me`

---

## 📚 References

- [Client Workflow Integration Guide](./CLIENT_WORKFLOW_INTEGRATION.md)
- [API Configuration Guide](./API_CONFIG_GUIDE.md)
- [Workflow Export Integration](./WORKFLOW_SCREEN_INTEGRATION.md)
- [Sandbox Server Setup](./SANDBOX_SERVER_SETUP.md)
