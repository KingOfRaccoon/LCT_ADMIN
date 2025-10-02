# 🎯 Исправление двойного вызова /client/workflow - Summary

**Дата:** 1 октября 2025  
**Статус:** ✅ ИСПРАВЛЕНО И ДОКУМЕНТИРОВАНО

---

## 📝 Проблема

`/client/workflow` API вызывался **дважды** при монтировании компонентов `ClientWorkflowRunner` и `PreviewPageNew`.

### Причины

1. **React Strict Mode** в dev-режиме намеренно монтирует компоненты дважды
2. Неправильные зависимости в `useEffect` (не включали все переменные)
3. Отсутствие защиты от повторных вызовов
4. Нет флага отслеживания процесса запуска

---

## ✅ Решение

### Три уровня защиты:

#### 1️⃣ useRef в компонентах
```javascript
const isStartingRef = useRef(false);
const startedWorkflowIdRef = useRef(null);

useEffect(() => {
  if (
    !isStartingRef.current && 
    !workflow.currentState && 
    workflow.isApiAvailable && 
    workflowId &&
    startedWorkflowIdRef.current !== workflowId
  ) {
    isStartingRef.current = true;
    startedWorkflowIdRef.current = workflowId;
    
    workflow.startWorkflow(workflowId, initialContext)
      .finally(() => {
        isStartingRef.current = false;
      });
  }
}, [workflowId, workflow.isApiAvailable, workflow.currentState]);
```

#### 2️⃣ isLoading check в хуке
```javascript
const startWorkflow = useCallback(async (workflowId, initialContext = {}) => {
  setWorkflowState(prev => {
    if (prev.isLoading) {
      console.warn('⚠️ startWorkflow ignored: already loading');
      return prev;
    }
    return { ...prev, isLoading: true, error: null };
  });
  
  // ... API call
}, [updateFromResponse]);
```

#### 3️⃣ Правильные зависимости useEffect
```javascript
[workflowId, workflow.isApiAvailable, workflow.currentState]
```

---

## 📊 Результат

### До:
```
POST /client/workflow  // 1-й вызов
POST /client/workflow  // 2-й вызов ❌ (дубликат)
```

### После:
```
POST /client/workflow  // Единственный вызов ✅
⚠️ startWorkflow ignored: already loading  // Блокировка
```

---

## 📁 Изменённые файлы

1. ✅ **src/pages/Sandbox/ClientWorkflowRunner.jsx**
   - Добавлен `useRef` для защиты
   - Улучшен `useEffect` с проверками
   - Исправлены зависимости

2. ✅ **src/pages/Preview/PreviewPageNew.jsx**
   - Те же изменения, что и в ClientWorkflowRunner

3. ✅ **src/hooks/useClientWorkflow.js**
   - Добавлена защита через `isLoading` check

4. ✅ **docs/fixes/double-client-workflow-call-fix.md**
   - Подробная документация исправления

5. ✅ **docs/tests/test-double-workflow-call.md**
   - Тестовый план для проверки

6. ✅ **docs/CLIENT_WORKFLOW_STATUS.md**
   - Обновлён статус с новой фичей

---

## 🧪 Тестирование

### Проверка:
1. Откройте `/sandbox` или `/preview?workflow_id=xxx`
2. DevTools → Network → Фильтр `client/workflow`
3. Должен быть **один** POST запрос

### Console логи:
```
✅ 🚀 [Component] Auto-starting workflow: xxx
✅ ✅ [Component] Workflow started successfully
✅ (опционально) ⚠️ startWorkflow ignored: already loading
```

---

## 🎓 Извлечённые уроки

1. **React Strict Mode** монтирует компоненты дважды в dev-режиме — нормально
2. **useRef** не вызывает ре-рендеров при изменении значения — идеально для флагов
3. **Зависимости useEffect** должны включать **все** используемые переменные
4. **Защита на нескольких уровнях** предотвращает race conditions

---

## 🔗 Связанные документы

- [Полная документация](../docs/fixes/double-client-workflow-call-fix.md)
- [Тестовый план](../docs/tests/test-double-workflow-call.md)
- [Client Workflow Integration](../docs/CLIENT_WORKFLOW_INTEGRATION.md)
- [Status Updates](../docs/CLIENT_WORKFLOW_STATUS.md)

---

## 📈 Метрики

- **API вызовы:** 2 → 1 (снижение на 50%)
- **Network traffic:** Уменьшен
- **UX:** Быстрее загрузка (нет повторных запросов)
- **Стабильность:** Защита от race conditions

---

**Готово к production deployment** 🚀
