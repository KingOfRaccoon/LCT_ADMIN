# Client Workflow API Integration Guide

## 📝 Обзор

Интеграция нового формата `/client/workflow` API для работы с workflow на стороне клиента. 

**Основные изменения:**
- ✅ Client Session Management через `localStorage`
- ✅ Новый API клиент для работы с `https://sandkittens.me/client/workflow`
- ✅ React hook `useClientWorkflow` для удобного использования
- ✅ Компонент `ClientWorkflowRunner` для Sandbox/Preview
- ✅ Интеграция с глобальной конфигурацией API (`src/config/api.js`)
- ✅ **Защита от двойных вызовов API** через `useRef` и `isLoading`kflow API Integration Guide

## 📝 Обзор

Интеграция нового формата `/client/workflow` API для работы с workflow на стороне клиента. 

**Основные изменения:**
- ✅ Client Session Management через `localStorage`
- ✅ Новый API клиент для работы с `https://sandkittens.me/client/workflow`
- ✅ React hook `useClientWorkflow` для удобного использования
- ✅ Компонент `ClientWorkflowRunner` для Sandbox/Preview
- ✅ Интеграция с глобальной конфигурацией API (`src/config/api.js`)

## 🏗️ Архитектура

### 1. Client Session Manager (`src/utils/clientSession.js`)

Управляет уникальным `client_session_id` для каждого посетителя:

```javascript
import { getClientSessionId, clearClientSession } from '@/utils/clientSession';

// Получить или создать session ID (автоматически при первом визите)
const sessionId = getClientSessionId(); // => "550e8400-e29b-41d4-a716-446655440000"

// Очистить сессию (для тестирования или logout)
clearClientSession();
```

**Особенности:**
- Session ID генерируется при первом заходе на сайт
- Хранится в `localStorage` под ключом `bdui_client_session_id`
- Автоматически используется во всех API вызовах
- Fallback на временный ID, если `localStorage` недоступен

---

### 2. Client Workflow API (`src/services/clientWorkflowApi.js`)

API клиент для работы с `/client/workflow` endpoints:

**Endpoint:** `https://sandkittens.me/client/workflow`  
**Конфигурация:** `src/config/api.js` → `BASE_URL`

#### API Methods

##### `startClientWorkflow(workflowId, initialContext)`
Запускает новый workflow (первый запрос при входе):

```javascript
import { startClientWorkflow } from '@/services/clientWorkflowApi';

const response = await startClientWorkflow('68dd5f600ec286edfa0ac2ed', {
  user: { name: 'John' }
});

console.log(response);
// {
//   session_id: "123123",
//   context: { __workflow_id: "68dd5f600ec286edfa0ac2ed", user: { name: 'John' } },
//   current_state: "Главный экран",
//   state_type: "screen",
//   screen: { id: "main", type: "screen", sections: {...} }
// }
```

##### `sendClientAction(eventName, inputs)`
Отправляет action и получает следующее состояние:

```javascript
import { sendClientAction } from '@/services/clientWorkflowApi';

const response = await sendClientAction('submit', {
  email: 'user@example.com',
  password: 'secret'
});
```

##### `getCurrentWorkflowState()`
Получает текущее состояние без изменений:

```javascript
import { getCurrentWorkflowState } from '@/services/clientWorkflowApi';

const response = await getCurrentWorkflowState();
```

##### `resetClientWorkflow()`
Сбрасывает workflow (начинает с начала):

```javascript
import { resetClientWorkflow } from '@/services/clientWorkflowApi';

const response = await resetClientWorkflow();
```

##### `checkClientWorkflowHealth()`
Health check для API:

```javascript
import { checkClientWorkflowHealth } from '@/services/clientWorkflowApi';

const isAvailable = await checkClientWorkflowHealth(); // => true/false
```

---

### 3. React Hook (`src/hooks/useClientWorkflow.js`)

Удобный hook для использования в компонентах:

```jsx
import { useClientWorkflow } from '@/hooks/useClientWorkflow';

function MyComponent() {
  const workflow = useClientWorkflow();
  
  // Запуск workflow
  useEffect(() => {
    if (workflow.isApiAvailable) {
      workflow.startWorkflow('workflow-id', { user: 'John' });
    }
  }, []);
  
  // Отправка action
  const handleSubmit = async () => {
    await workflow.sendAction('submit', { email: '...' });
  };
  
  // Рендеринг
  return (
    <div>
      {workflow.isLoading && <Spinner />}
      {workflow.error && <Error message={workflow.error.message} />}
      
      {workflow.hasScreen && (
        <ScreenRenderer screen={workflow.screen} context={workflow.context} />
      )}
      
      <button onClick={handleSubmit} disabled={workflow.isLoading}>
        Submit
      </button>
    </div>
  );
}
```

**State Properties:**
- `sessionId` - Client session ID
- `currentState` - Имя текущего состояния
- `stateType` - Тип состояния (`screen`, `technical`, etc.)
- `context` - Текущий контекст
- `screen` - Объект экрана (если `stateType === 'screen'`)
- `isLoading` - Индикатор загрузки
- `error` - Ошибка (если есть)
- `isApiAvailable` - Доступен ли API
- `hasScreen` - Computed: есть ли экран для рендеринга
- `isScreenState` - Computed: `stateType === 'screen'`
- `isTechnicalState` - Computed: `stateType === 'technical'`

**Actions:**
- `startWorkflow(workflowId, initialContext)` - Запустить workflow
- `sendAction(eventName, inputs)` - Отправить action
- `refreshState()` - Обновить текущее состояние
- `reset()` - Сбросить workflow
- `clearError()` - Очистить ошибку

---

### 4. ClientWorkflowRunner Component (`src/pages/Sandbox/ClientWorkflowRunner.jsx`)

Готовый компонент для Sandbox/Preview страниц:

```jsx
import ClientWorkflowRunner from '@/pages/Sandbox/ClientWorkflowRunner';

function SandboxPage() {
  return (
    <ClientWorkflowRunner
      workflowId="68dd5f600ec286edfa0ac2ed"
      initialContext={{ user: 'John' }}
      onExit={() => console.log('Exit to offline mode')}
    />
  );
}
```

**Props:**
- `workflowId` (string) - ID workflow для запуска
- `initialContext` (object) - Начальный контекст (опционально)
- `onExit` (function) - Callback для выхода из режима API

**Особенности:**
- Автоматический запуск workflow при монтировании
- Рендеринг экранов через `SandboxScreenRenderer`
- История переходов между состояниями
- Отображение контекста в виде таблицы
- Кнопки: обновить, сброс, выход в офлайн режим
- Обработка ошибок с баннером
- Индикатор загрузки

---

## 🔧 Конфигурация API

Все настройки API централизованы в `src/config/api.js`:

```javascript
// src/config/api.js
export const BASE_URL = 'https://sandkittens.me/';

export const API_ENDPOINTS = {
  WORKFLOW: '/client/workflow', // Используется для Client Workflow API
  // ...
};

// Получить полный URL
import { getApiUrl, API_ENDPOINTS } from '@/config/api';
const url = getApiUrl(API_ENDPOINTS.WORKFLOW);
// => 'https://sandkittens.me/client/workflow'
```

**Environment Variable Override:**
```bash
# .env или .env.local
VITE_WORKFLOW_API_BASE=https://custom-server.com
```

---

## 📦 Формат данных

### Response Format

Все endpoints возвращают одинаковую структуру:

```typescript
interface ClientWorkflowResponse {
  session_id: string;              // ID сессии
  context: {                       // Текущий контекст
    __workflow_id: string;
    __created_at: string;
    [key: string]: any;            // Пользовательские данные
  };
  current_state: string;           // Имя текущего состояния
  state_type: 'screen' | 'technical' | 'integration' | 'service';
  screen?: {                       // Объект экрана (если state_type === 'screen')
    id: string;
    type: 'screen';
    name: string;
    style: object;
    sections: {
      body?: { children: Component[] };
      header?: { children: Component[] };
      footer?: { children: Component[] };
    };
  };
}
```

### Request Formats

#### Start Workflow
```json
POST /client/workflow
{
  "client_session_id": "550e8400-e29b-41d4-a716-446655440000",
  "workflow_id": "68dd5f600ec286edfa0ac2ed",
  "initial_context": { "user": "John" }
}
```

#### Send Action
```json
POST /client/workflow/action
{
  "client_session_id": "550e8400-e29b-41d4-a716-446655440000",
  "event": "submit",
  "inputs": { "email": "user@example.com" }
}
```

---

## 🚀 Примеры использования

### Пример 1: Простой workflow runner

```jsx
import { useClientWorkflow } from '@/hooks/useClientWorkflow';

function SimpleWorkflowDemo() {
  const workflow = useClientWorkflow();
  
  useEffect(() => {
    workflow.startWorkflow('my-workflow-id');
  }, []);
  
  if (workflow.isLoading) return <div>Loading...</div>;
  if (workflow.error) return <div>Error: {workflow.error.message}</div>;
  
  return (
    <div>
      <h1>Current State: {workflow.currentState}</h1>
      <p>Type: {workflow.stateType}</p>
      
      {workflow.hasScreen && (
        <div>Screen ID: {workflow.screen.id}</div>
      )}
      
      <button onClick={() => workflow.sendAction('next')}>
        Next
      </button>
    </div>
  );
}
```

### Пример 2: Форма с workflow

```jsx
function LoginForm() {
  const workflow = useClientWorkflow();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    await workflow.sendAction('login', { email, password });
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <input value={email} onChange={(e) => setEmail(e.target.value)} />
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <button disabled={workflow.isLoading}>Login</button>
    </form>
  );
}
```

---

## 🔍 Логирование

Все API запросы автоматически логируются (если `ENABLE_API_LOGGING = true` в `config/api.js`):

```
[API] POST https://sandkittens.me/client/workflow { client_session_id: "...", workflow_id: "..." }
[API] POST https://sandkittens.me/client/workflow → 200 (234ms)

🚀 [ClientWorkflow] Starting workflow: { workflowId: "...", clientSessionId: "..." }
✅ [ClientWorkflow] Workflow started: { session_id: "...", current_state: "Main Screen" }
```

---

## ✅ Checklist для интеграции

- [x] Создан `clientSession.js` с генерацией и хранением session ID
- [x] Создан `clientWorkflowApi.js` с методами для работы с API
- [x] Создан `useClientWorkflow.js` hook для удобного использования
- [x] Создан `ClientWorkflowRunner.jsx` компонент
- [x] Интегрирован с `src/config/api.js` для централизованной конфигурации
- [x] Добавлено логирование через `logApiRequest/Response/Error`
- [ ] Обновлен `SandboxPage.jsx` для использования `ClientWorkflowRunner`
- [ ] Обновлен/создан `PreviewPage.jsx` для работы с Client Workflow API
- [ ] Протестирован с реальным бэкендом на `https://sandkittens.me`

---

## 🐛 Troubleshooting

### API недоступен
1. Проверьте `BASE_URL` в `src/config/api.js`
2. Проверьте health endpoint: `https://sandkittens.me/health`
3. Проверьте CORS настройки на сервере
4. Проверьте консоль браузера на ошибки сети

### Session ID не сохраняется
1. Проверьте доступность `localStorage` (приватный режим браузера блокирует)
2. Проверьте консоль на ошибки `SecurityError`
3. Используйте `getSessionInfo()` для диагностики

### Workflow не запускается
1. Проверьте правильность `workflow_id`
2. Проверьте формат `initial_context`
3. Проверьте логи: `[ClientWorkflow]` префикс
4. Используйте `checkClientWorkflowHealth()` перед стартом

---

## 📚 См. также

- [API Configuration Guide](./API_CONFIG_GUIDE.md)
- [Workflow Export Integration](./WORKFLOW_SCREEN_INTEGRATION.md)
- [Sandbox Server Setup](./SANDBOX_SERVER_SETUP.md)
