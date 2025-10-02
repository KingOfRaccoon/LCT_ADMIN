# Тест: Проверка двойного вызова /client/workflow

## 🎯 Цель

Убедиться, что `/client/workflow` вызывается **только один раз** при монтировании компонентов.

## 📋 Шаги для проверки

### 1. Запустите dev-сервер

```bash
npm run dev
```

### 2. Откройте DevTools

1. Нажмите `F12` или `Cmd+Option+I`
2. Перейдите на вкладку **Network**
3. Фильтр: `client/workflow`
4. Очистите список запросов

### 3. Тест #1: ClientWorkflowRunner (Sandbox)

1. Откройте `http://localhost:5174/sandbox`
2. В Network должен появиться **ОДИН** запрос `POST /client/workflow`
3. В Console проверьте логи:

```
🚀 [ClientWorkflowRunner] Auto-starting workflow: <workflow_id>
✅ [ClientWorkflowRunner] Workflow started successfully
```

✅ **Ожидаемый результат:** 1 запрос к API

### 4. Тест #2: PreviewPageNew

1. Очистите Network и Console
2. Откройте `http://localhost:5174/preview?workflow_id=68dd68fe8341ae5cb6c60024`
3. В Network должен появиться **ОДИН** запрос `POST /client/workflow`
4. В Console проверьте логи:

```
🚀 [PreviewPage] Starting workflow: <workflow_id>
✅ [PreviewPage] Workflow started successfully
```

✅ **Ожидаемый результат:** 1 запрос к API

### 5. Тест #3: React Strict Mode (двойное монтирование)

React Strict Mode в dev-режиме **намеренно** монтирует компоненты дважды.

1. Проверьте, что в `src/main.jsx` включён StrictMode:

```javascript
<React.StrictMode>
  <App />
</React.StrictMode>
```

2. Обновите страницу `/sandbox` или `/preview`
3. В Console можете увидеть:

```
🚀 [Component] Auto-starting workflow: xxx
⚠️ [useClientWorkflow] startWorkflow ignored: already loading
✅ [Component] Workflow started successfully
```

✅ **Ожидаемый результат:** 
- Компонент монтируется **дважды** (это нормально в dev-режиме)
- API вызывается **только один раз** (защита сработала)

### 6. Тест #4: Переключение между workflow

1. Откройте `/preview?workflow_id=111111111111111111111111`
2. Дождитесь загрузки (1 запрос)
3. Измените URL на `/preview?workflow_id=222222222222222222222222`
4. Должен произойти **второй** запрос (это нормально — новый workflow)

✅ **Ожидаемый результат:** 2 запроса (по одному на каждый workflow_id)

## 🔍 Проверка защиты

### Тест защиты через isLoading

Откройте Console и выполните:

```javascript
// Получаем ref на workflow hook
const testDoubleCall = async () => {
  const w = window.__WORKFLOW_HOOK_REF; // если экспортируется
  
  // Попробуем вызвать startWorkflow дважды подряд
  Promise.all([
    w.startWorkflow('test1', {}),
    w.startWorkflow('test2', {})
  ]);
};

testDoubleCall();
```

Ожидаемый лог:
```
⚠️ [useClientWorkflow] startWorkflow ignored: already loading
```

✅ Второй вызов проигнорирован

## 📊 Чек-лист

- [ ] Sandbox: только 1 запрос `/client/workflow`
- [ ] Preview: только 1 запрос `/client/workflow`
- [ ] React Strict Mode: монтирование 2x, но запрос 1x
- [ ] Переключение workflow_id: новый запрос для нового ID
- [ ] Console: есть логи `🚀 Auto-starting` и `✅ started successfully`
- [ ] Console: может быть `⚠️ startWorkflow ignored` (это нормально)
- [ ] Network: нет дублирующихся запросов с одинаковыми параметрами

## ❌ Признаки ошибки

Если увидите:

```
POST /client/workflow  // 1-й запрос
POST /client/workflow  // 2-й запрос с теми же параметрами ❌
```

Это означает, что защита не сработала. Проверьте:

1. `isStartingRef.current` сбрасывается в `false` после завершения
2. `startedWorkflowIdRef.current` очищается при ошибке
3. Зависимости `useEffect` правильные
4. `workflow.isLoading` корректно устанавливается

## 🐛 Отладка

### Добавьте логирование в useEffect:

```javascript
useEffect(() => {
  console.log('🔍 [useEffect] Conditions:', {
    isStarting: isStartingRef.current,
    currentState: workflow.currentState,
    isApiAvailable: workflow.isApiAvailable,
    workflowId,
    startedId: startedWorkflowIdRef.current
  });
  
  // ... rest of code
}, [workflowId, workflow.isApiAvailable, workflow.currentState]);
```

Это покажет, почему useEffect срабатывает или не срабатывает.

## 🎉 Успешный результат

```
Network Tab:
✅ POST /client/workflow (1 запрос)

Console:
✅ 🚀 [ClientWorkflowRunner] Auto-starting workflow: xxx
✅ ✅ [ClientWorkflowRunner] Workflow started successfully
✅ (опционально) ⚠️ [useClientWorkflow] startWorkflow ignored: already loading
```

---

**Дата:** 1 октября 2025  
**Связанные документы:**
- [Fix Documentation](./double-client-workflow-call-fix.md)
- [Client Workflow Integration](../CLIENT_WORKFLOW_INTEGRATION.md)
