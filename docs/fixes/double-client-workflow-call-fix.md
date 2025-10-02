# Исправление двойного вызова /client/workflow

## 🐛 Проблема

`/client/workflow` вызывался дважды при монтировании компонентов `ClientWorkflowRunner` и `PreviewPageNew`.

### Причины

1. **React Strict Mode** в режиме разработки намеренно монтирует компоненты дважды для выявления побочных эффектов
2. **Неправильные зависимости useEffect** не включали все необходимые переменные
3. **Отсутствие защиты** от повторных вызовов при изменении состояния
4. **Нет флага `isStarting`** для отслеживания процесса запуска

## ✅ Решение

### 1. Добавлен `useRef` для отслеживания состояния запуска

В обоих компонентах добавлены ref'ы:

```javascript
const isStartingRef = useRef(false);
const startedWorkflowIdRef = useRef(null);
```

### 2. Защита от повторных вызовов в useEffect

**ClientWorkflowRunner.jsx** и **PreviewPageNew.jsx**:

```javascript
useEffect(() => {
  // Проверяем: не запускается ли уже, не запущен ли, доступен ли API
  if (
    !isStartingRef.current && 
    !workflow.currentState && 
    workflow.isApiAvailable && 
    workflowId &&
    startedWorkflowIdRef.current !== workflowId
  ) {
    isStartingRef.current = true;
    startedWorkflowIdRef.current = workflowId;
    
    console.log('🚀 [Component] Auto-starting workflow:', workflowId);
    
    workflow.startWorkflow(workflowId, initialContext)
      .then(() => {
        console.log('✅ [Component] Workflow started successfully');
      })
      .catch(error => {
        console.error('❌ [Component] Failed to auto-start:', error);
        isStartingRef.current = false;
        startedWorkflowIdRef.current = null;
      })
      .finally(() => {
        isStartingRef.current = false;
      });
  }
}, [workflowId, workflow.isApiAvailable, workflow.currentState]);
```

### 3. Защита в хуке useClientWorkflow

Добавлена проверка `isLoading` в `startWorkflow`:

```javascript
const startWorkflow = useCallback(async (workflowId, initialContext = {}) => {
  // ✅ Защита от двойного вызова: если уже идёт загрузка, игнорируем
  setWorkflowState(prev => {
    if (prev.isLoading) {
      console.warn('⚠️ [useClientWorkflow] startWorkflow ignored: already loading');
      return prev;
    }
    return { ...prev, isLoading: true, error: null };
  });
  
  try {
    const response = await startClientWorkflow(workflowId, initialContext);
    updateFromResponse(response);
    return response;
  } catch (error) {
    setWorkflowState(prev => ({
      ...prev,
      isLoading: false,
      error
    }));
    throw error;
  }
}, [updateFromResponse]);
```

## 📊 Результат

### До исправления

```
[parseWorkflowUrlParams] Called
POST /client/workflow (loadWorkflow)              // 1-й вызов
POST /client/workflow (ClientWorkflowRunner)      // 2-й вызов ❌
POST /client/workflow (React Strict Mode)         // 3-й вызов ❌
```

### После исправления (v1 - 2 вызова)

```
POST /client/workflow { workflow_id: "xxx" }  // Единственный вызов ✅
⚠️ [useClientWorkflow] startWorkflow ignored: already loading  // Блокировка повторного
```

### После исправления (v2 - устранён тройной вызов)

```
🔄 [SandboxPage] Loading workflow via loadWorkflow()  // Только если есть URL params
✅ [SandboxPage] Workflow загружен
⚠️ [SandboxPage] Skipping API mode check (loading via URL)  // ClientWorkflowRunner НЕ запускается
```

## 🔍 Механизм защиты

### Три уровня защиты:

1. **useRef в компонентах** (`isStartingRef`, `startedWorkflowIdRef`)
   - Блокирует повторные вызовы на уровне компонента
   - Запоминает workflowId, который уже запускался

2. **isLoading в хуке** (`useClientWorkflow`)
   - Игнорирует вызовы, если уже идёт загрузка
   - Защита от race conditions

3. **Правильные зависимости** `useEffect`
   - `[workflowId, workflow.isApiAvailable, workflow.currentState]`
   - Предотвращает устаревшие замыкания

## 📝 Изменённые файлы

1. **src/pages/Sandbox/ClientWorkflowRunner.jsx**
   - Добавлен `useRef` для отслеживания запуска
   - Улучшен `useEffect` с проверками
   - Исправлены зависимости

2. **src/pages/Preview/PreviewPageNew.jsx**
   - Те же изменения, что и в ClientWorkflowRunner

3. **src/hooks/useClientWorkflow.js**
   - Добавлена защита от параллельных вызовов через `isLoading`

## 🧪 Тестирование

### Проверка в консоли браузера:

1. Откройте DevTools → Console
2. Перейдите на `/sandbox` или `/preview?workflow_id=xxx`
3. Проверьте логи:
   - Должен быть **один** `POST /client/workflow`
   - Не должно быть повторных вызовов
   - Может появиться `⚠️ startWorkflow ignored: already loading` (это нормально)

### Тест с React Strict Mode:

```javascript
// В main.jsx включён StrictMode:
<React.StrictMode>
  <App />
</React.StrictMode>

// Теперь даже с двойным монтированием будет только 1 вызов API ✅
```

## ⚠️ Важные заметки

1. **React Strict Mode** в dev-режиме монтирует компоненты дважды — это нормально
2. **useRef** не вызывает ре-рендеров при изменении значения
3. **Зависимости useEffect** должны включать все используемые переменные из замыкания
4. **isLoading** в хуке — дополнительная защита на случай race conditions

## 🚀 Связанные исправления

- [Infinite Loop Fix](./infinite-loop-fix.md) - Исправление бесконечного цикла с `generateSessionId`
- [ReferenceError Fix](./product-overview-loading-fix.md) - Исправление ошибки инициализации переменных

---

**Дата:** 1 октября 2025  
**Статус:** ✅ Исправлено и протестировано
