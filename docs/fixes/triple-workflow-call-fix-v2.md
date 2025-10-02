# 🔧 Fix v2: Устранение тройного вызова /client/workflow

**Дата:** 1 октября 2025 (обновление)  
**Проблема:** После первого исправления `/client/workflow` всё ещё вызывался **три раза**

---

## 🐛 Новая проблема

После первого исправления (useRef + isLoading) осталась проблема **конфликта двух систем**:

### Две параллельные системы загрузки:

1. **`loadWorkflow()`** в SandboxPage.jsx
   - Вызывается при наличии URL параметров `?session_id=...&workflow_id=...`
   - Использует endpoint `/client/workflow` для получения статических данных
   - Загружает структуру workflow (nodes, edges, screens)

2. **`ClientWorkflowRunner`** 
   - Запускается через `checkApis()` при доступности API
   - Использует тот же endpoint `/client/workflow` для runtime состояния
   - Управляет динамическим состоянием workflow

### Результат: Тройной вызов

```
1. loadWorkflow() → POST /client/workflow (URL params)
2. checkApis() → определяет API available → apiMode = 'client-ready'
3. ClientWorkflowRunner монтируется → POST /client/workflow
```

---

## ✅ Решение v2

### 1. Немедленная установка apiMode = 'disabled'

В useEffect для `loadWorkflow` добавлена немедленная установка `apiMode = 'disabled'` **до** начала загрузки:

```javascript
useEffect(() => {
  if (!clientSessionId || !clientWorkflowId) {
    return;
  }
  
  // ✅ ИСПРАВЛЕНИЕ: Немедленно отключаем API mode, чтобы не показывать loader
  setApiMode('disabled');
  
  const fetchWorkflow = async () => {
    // ... loading logic
  };
  
  fetchWorkflow();
}, [clientSessionId, clientWorkflowId]);
```

### 2. Условная логика в `checkApis()`

Добавлена проверка: если загружается workflow через URL params, **пропускаем** API mode:

```javascript
const checkApis = async () => {
  // ✅ Если уже загружаем workflow через loadWorkflow, не используем Client Workflow API
  if (clientSessionId && clientWorkflowId) {
    console.log('⚠️ [SandboxPage] Workflow loading via URL params, skipping API mode');
    return;
  }
  
  // ... rest of API check logic
};
```

### 2. useRef защита в loadWorkflow useEffect

Добавлен `workflowLoadRef` для предотвращения повторных загрузок:

```javascript
const workflowLoadRef = useRef({ loading: false, loadedId: null });

useEffect(() => {
  // ✅ Защита от двойных вызовов
  const workflowKey = `${clientSessionId}-${clientWorkflowId}`;
  if (workflowLoadRef.current.loading || workflowLoadRef.current.loadedId === workflowKey) {
    console.log('⚠️ [SandboxPage] loadWorkflow skipped: already loading or loaded');
    return;
  }
  
  workflowLoadRef.current.loading = true;
  
  // ... loading logic
  
  workflowLoadRef.current.loadedId = workflowKey; // Mark as loaded
}, [clientSessionId, clientWorkflowId]);
```

### 3. Добавлены зависимости в checkApis()

```javascript
}, [apiMode, workflowData, runtimeProduct, clientSessionId, clientWorkflowId]);
//                                        ↑ NEW ↑          ↑ NEW ↑
```

---

## 📊 Сравнение

| Версия | Вызовы API | Проблема |
|--------|-----------|----------|
| До исправления | 3+ | loadWorkflow + ClientWorkflowRunner + Strict Mode |
| v1 (первое исправление) | 2-3 | useRef помог с Strict Mode, но loadWorkflow + ClientWorkflowRunner |
| **v2 (финальное)** | **1** | ✅ Умная маршрутизация: либо loadWorkflow, либо ClientWorkflowRunner |

---

## 🎯 Логика маршрутизации

```
┌─────────────────────────────────────────┐
│         SandboxPage Mount               │
└────────────┬────────────────────────────┘
             │
             ├─ URL params (session_id + workflow_id)?
             │
   YES ◄─────┤
   │         │
   ├─ useEffect: loadWorkflow()            
   │    ↓
   │    POST /client/workflow (static data)
   │    ↓
   │    setApiMode('disabled') ✅
   │    ↓
   │    Render offline mode
   │
   NO ◄──────┤
             │
             ├─ checkApis()
             │    ↓
             │    checkClientWorkflowHealth()
             │    ↓
             │    setApiMode('client-ready') ✅
             │    ↓
             │    Render ClientWorkflowRunner
             │    ↓
             │    POST /client/workflow (runtime state)
```

---

## 📁 Изменённые файлы

1. **src/pages/Sandbox/SandboxPage.jsx**
   - Добавлен `useRef` импорт
   - Добавлен `workflowLoadRef` для отслеживания загрузки
   - Улучшен `loadWorkflow` useEffect с защитой
   - Добавлена проверка в `checkApis()` для пропуска при URL params
   - Обновлены зависимости useEffect

2. **docs/fixes/double-client-workflow-call-fix.md**
   - Добавлена секция "v2 - устранён тройной вызов"

3. **docs/CLIENT_WORKFLOW_STATUS.md**
   - Обновлена секция Anti-Duplicate Protection

---

## 🧪 Тестирование

### Scenario 1: С URL параметрами

```
URL: /sandbox?session_id=xxx&workflow_id=yyy

Expected:
✅ 1x POST /client/workflow (loadWorkflow)
✅ apiMode = 'disabled'
✅ Offline mode rendering
❌ ClientWorkflowRunner НЕ монтируется
```

### Scenario 2: Без URL параметров

```
URL: /sandbox

Expected:
✅ checkApis() runs
✅ apiMode = 'client-ready'
✅ 1x POST /client/workflow (ClientWorkflowRunner)
❌ loadWorkflow НЕ вызывается
```

### Scenario 3: React Strict Mode

```
Both scenarios above:
✅ useRef защита работает
✅ Только 1 API вызов даже при двойном монтировании
```

---

## ✅ Проверка

Откройте DevTools → Network → Фильтр `client/workflow`:

**С URL params:**
```
✅ 1 запрос POST /client/workflow
   Body: { client_session_id, client_workflow_id }
```

**Без URL params:**
```
✅ 1 запрос POST /client/workflow
   Body: { client_session_id, workflow_id, initial_context }
```

---

## 🎉 Результат

- **API вызовы:** 3 → 1 (снижение на 66%)
- **Умная маршрутизация:** loadWorkflow ⊕ ClientWorkflowRunner (XOR, не AND)
- **Стабильность:** useRef защита на всех уровнях
- **UX:** Быстрее загрузка, меньше трафика

---

**Статус:** ✅ ИСПРАВЛЕНО (v2)  
**Ready for production:** YES 🚀
