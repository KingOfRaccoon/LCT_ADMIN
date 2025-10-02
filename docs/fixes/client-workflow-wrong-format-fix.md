# 🔧 Fix: Правильная маршрутизация для Client Workflow API

**Дата:** 1 октября 2025 (final fix)  
**Проблема:** Использование неправильной функции `loadWorkflow()` для Client Workflow API

---

## 🐛 Root Cause Analysis

### Два разных API формата:

#### 1. **Legacy Workflow API** (старый):
```json
{
  "metadata": { "id": "...", "name": "...", "version": "..." },
  "nodes": [...],
  "edges": [...],
  "screens": {...},
  "initialContext": {...},
  "variableSchemas": {...}
}
```

Используется функцией: `loadWorkflow(clientSessionId, clientWorkflowId)`

#### 2. **Client Workflow API** (новый):
```json
{
  "session_id": "4122323321233",
  "context": {
    "__workflow_id": "68dd66af8341ae5cb6c6001e",
    "__created_at": "2025-10-01 22:20:17.780848"
  },
  "current_state": "Загрузка корзины",
  "state_type": "screen",
  "screen": {
    "id": "screen-loading",
    "type": "Screen",
    "sections": { "body": { ... } }
  }
}
```

Используется компонентом: `ClientWorkflowRunner`

---

## 🐛 Проблема

### Что происходило:

1. URL: `/sandbox?session_id=xxx&workflow_id=yyy`
2. **SandboxPage** вызывал `loadWorkflow(clientSessionId, clientWorkflowId)`
3. `loadWorkflow()` делал запрос к `/client/workflow` ✅
4. API возвращал **Client Workflow формат** (новый) ✅
5. `loadWorkflow()` пытался извлечь `workflow.metadata.id` ❌
6. **Error:** `Cannot read property 'id' of undefined`
7. Показывался loader "Загрузка workflow..." бесконечно 🔄

### Код проблемы:

```javascript
const workflow = await loadWorkflow(clientSessionId, clientWorkflowId);

// ❌ Ожидает старый формат с metadata
setWorkflowData({
  id: workflow.metadata.id,        // undefined!
  name: workflow.metadata.name,    // undefined!
  nodes: workflow.nodes,            // undefined!
  edges: workflow.edges,            // undefined!
  screens: workflow.screens,        // undefined!
});
```

---

## ✅ Решение

### Прямая маршрутизация в ClientWorkflowRunner:

Вместо попытки загрузить и парсить данные, просто **переключаемся в Client Workflow режим**:

```javascript
useEffect(() => {
  if (!clientSessionId || !clientWorkflowId) {
    return;
  }
  
  console.log('✅ [SandboxPage] URL params detected, using Client Workflow API mode');
  // Устанавливаем workflow_id и переключаемся в client-ready режим
  setActiveWorkflowId(clientWorkflowId);
  setApiMode('client-ready');
}, [clientSessionId, clientWorkflowId]);
```

### Что происходит теперь:

1. URL: `/sandbox?session_id=xxx&workflow_id=yyy`
2. **SandboxPage** устанавливает `apiMode = 'client-ready'`
3. Рендерится **ClientWorkflowRunner** с `workflowId`
4. `ClientWorkflowRunner` вызывает `startClientWorkflow(workflowId)`
5. API возвращает Client Workflow формат ✅
6. `ClientWorkflowRunner` корректно отображает данные ✅

---

## 📊 Архитектурная диаграмма

### До исправления (неправильно):

```
URL params → loadWorkflow() → /client/workflow → Client Workflow формат
                ↓
           Пытается парсить как Legacy формат ❌
                ↓
           workflow.metadata === undefined
                ↓
           Бесконечный loader 🔄
```

### После исправления (правильно):

```
URL params → setApiMode('client-ready') → ClientWorkflowRunner
                                              ↓
                                  startClientWorkflow(workflowId)
                                              ↓
                                      /client/workflow
                                              ↓
                                  Client Workflow формат ✅
                                              ↓
                                  Правильное отображение ✅
```

---

## 🎯 Правила маршрутизации

| URL Params | API Mode | Компонент | Формат API |
|-----------|----------|-----------|------------|
| `?session_id=xxx&workflow_id=yyy` | `client-ready` | ClientWorkflowRunner | Client Workflow (новый) |
| Нет params + API доступен | `client-ready` | ClientWorkflowRunner | Client Workflow (новый) |
| Нет params + Legacy API | `legacy-ready` | ApiSandboxRunner | Legacy API |
| location.state.product | `disabled` | Offline Mode | JSON файлы |

---

## 🗑️ Удалённый код

### Удалены переменные:
```javascript
// ❌ Больше не нужны:
const [workflowLoading, setWorkflowLoading] = useState(false);
const [workflowError, setWorkflowError] = useState(null);
const workflowLoadRef = useRef({ loading: false, loadedId: null });
```

### Удалены useEffect:
```javascript
// ❌ Удалён весь блок loadWorkflow() (60+ строк)
```

### Удалены условия рендеринга:
```javascript
// ❌ Удалены:
if (workflowLoading) { return <Loader />; }
if (workflowError) { return <Error />; }
```

---

## 📝 Изменённые файлы

1. **src/pages/Sandbox/SandboxPage.jsx**
   - Удалён useEffect с `loadWorkflow()`
   - Удалены состояния `workflowLoading`, `workflowError`
   - Добавлен простой useEffect для установки `apiMode = 'client-ready'`
   - Удалены условия рендеринга loader/error

---

## 🧪 Тестирование

### Тест 1: URL с параметрами

```bash
URL: /sandbox?session_id=4122323321233&workflow_id=68dd66af8341ae5cb6c6001e

Expected:
✅ setActiveWorkflowId('68dd66af8341ae5cb6c6001e')
✅ setApiMode('client-ready')
✅ ClientWorkflowRunner рендерится
✅ startClientWorkflow() вызывается
✅ Экран "Загрузка корзины" отображается
✅ Кнопка "Продолжить" с событием onClick="loadComplete"
```

### Тест 2: URL без параметров

```bash
URL: /sandbox

Expected:
✅ checkApis() запускается
✅ setApiMode('client-ready') или 'legacy-ready'
✅ ClientWorkflowRunner или ApiSandboxRunner
```

---

## 🎉 Результат

- ✅ Client Workflow API работает корректно
- ✅ Данные отображаются сразу
- ✅ Нет бесконечных loader'ов
- ✅ Упрощённая архитектура (меньше кода)
- ✅ Правильное разделение Legacy vs Client Workflow

---

## 📚 Связанные исправления

1. [Double Workflow Call Fix](./double-client-workflow-call-fix.md)
2. [Triple Workflow Call Fix v2](./triple-workflow-call-fix-v2.md)
3. [Workflow Data Not Displayed Fix](./workflow-data-not-displayed-fix.md)

---

**Статус:** ✅ ИСПРАВЛЕНО (final)  
**Priority:** CRITICAL (блокирующая функциональность)  
**Impact:** Полностью восстановлена работа Client Workflow API 🚀
