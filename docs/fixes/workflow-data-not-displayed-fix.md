# 🐛 Fix: Данные загружаются, но не отображаются

**Дата:** 1 октября 2025 (hotfix)  
**Проблема:** После загрузки workflow через `loadWorkflow()` данные не отображались

---

## 🐛 Симптомы

1. URL: `/sandbox?session_id=xxx&workflow_id=yyy`
2. Network показывает успешный POST `/client/workflow`
3. Toast: "Workflow загружен успешно!"
4. **НО:** Экран остаётся пустым или показывает loader

---

## 🔍 Root Cause

### Race Condition между двумя useEffect:

```javascript
// useEffect #1: loadWorkflow
useEffect(() => {
  // ... загрузка данных
  setWorkflowData(data);
  setApiMode('disabled'); // ❌ Устанавливается ПОСЛЕ загрузки
}, [clientSessionId, clientWorkflowId]);

// useEffect #2: checkApis  
useEffect(() => {
  if (apiMode !== 'checking') return;
  
  if (clientSessionId && clientWorkflowId) {
    return; // Выходим рано, НО apiMode остаётся 'checking'
  }
}, [apiMode, ...]);
```

### Проблема:

1. `apiMode` инициализируется как `'checking'`
2. `loadWorkflow` useEffect начинает загрузку (async)
3. `checkApis` useEffect видит `apiMode === 'checking'`
4. `checkApis` выходит рано (из-за URL params)
5. **`apiMode` остаётся `'checking'`** до завершения загрузки
6. Компонент рендерит **loader** вместо данных

### Временная линия:

```
t=0ms:   Component mount
         apiMode = 'checking'

t=10ms:  loadWorkflow useEffect запускается
         async fetchWorkflow() начинается

t=20ms:  checkApis useEffect запускается
         if (clientSessionId && clientWorkflowId) return;
         ❌ apiMode всё ещё 'checking'

t=100ms: fetchWorkflow() завершается
         setWorkflowData(...)
         setApiMode('disabled') ✅ Только сейчас!

t=100ms: isLoaderVisible = (apiMode === 'checking')
         ❌ Между t=20ms и t=100ms показывается loader
```

---

## ✅ Решение

### Немедленная установка apiMode

Переместить `setApiMode('disabled')` **до** начала async операции:

```javascript
useEffect(() => {
  if (!clientSessionId || !clientWorkflowId) {
    return;
  }
  
  // ... защита от повторных вызовов
  
  // ✅ ИСПРАВЛЕНИЕ: Немедленно отключаем API mode
  setApiMode('disabled');
  
  const fetchWorkflow = async () => {
    setWorkflowLoading(true); // Используем отдельный флаг для loader
    // ... loading logic
  };
  
  fetchWorkflow();
}, [clientSessionId, clientWorkflowId]);
```

### Новая временная линия:

```
t=0ms:   Component mount
         apiMode = 'checking'

t=10ms:  loadWorkflow useEffect запускается
         ✅ setApiMode('disabled') СРАЗУ
         apiMode = 'disabled'
         async fetchWorkflow() начинается

t=20ms:  checkApis useEffect запускается
         if (apiMode !== 'checking') return; ✅ Выходит сразу

t=100ms: fetchWorkflow() завершается
         setWorkflowData(...)

t=100ms: isLoaderVisible = (apiMode === 'checking')
         ✅ false → показываются данные
         workflowLoading = true → показывается специальный loader
```

---

## 📊 Поведение до и после

| Состояние | До исправления | После исправления |
|-----------|---------------|------------------|
| `apiMode` | `'checking'` | `'disabled'` ✅ |
| Показывается | Loader "Подключаем API" ❌ | Loader "Загрузка workflow" ✅ |
| После загрузки | Данные отображаются | Данные отображаются ✅ |
| Время до UI | 100ms+ | Немедленно ✅ |

---

## 🧪 Проверка

### До исправления:

```
1. Открыть /sandbox?session_id=xxx&workflow_id=yyy
2. Видно: "Подключаем API песочницы…" ❌
3. После загрузки: данные наконец-то показываются
```

### После исправления:

```
1. Открыть /sandbox?session_id=xxx&workflow_id=yyy
2. Видно: "Загрузка workflow..." (специальный loader) ✅
3. После загрузки: данные сразу показываются ✅
```

---

## 📝 Изменённые файлы

1. **src/pages/Sandbox/SandboxPage.jsx**
   - Перемещена установка `setApiMode('disabled')` до `fetchWorkflow()`
   - Удалена дублирующая установка после загрузки

2. **docs/fixes/triple-workflow-call-fix-v2.md**
   - Обновлена секция "Решение v2"

---

## 🎯 Ключевой урок

**Синхронные setState до async операций:**

```javascript
// ❌ ПЛОХО: setState после async
const fetchData = async () => {
  const data = await loadData();
  setState('loaded'); // Слишком поздно!
};

// ✅ ХОРОШО: setState до async
setState('loading'); // Немедленно!
const fetchData = async () => {
  const data = await loadData();
};
```

---

## ✅ Результат

- ✅ Данные отображаются сразу после загрузки
- ✅ Правильный loader ("Загрузка workflow" вместо "Подключаем API")
- ✅ Нет race condition между useEffect
- ✅ UX улучшен: пользователь видит правильное состояние

---

**Статус:** ✅ ИСПРАВЛЕНО (hotfix)  
**Priority:** HIGH (блокирующая проблема UI)
