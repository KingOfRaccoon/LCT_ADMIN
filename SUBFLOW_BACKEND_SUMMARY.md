# ✅ Subflow Registry - Backend Integration Complete

**Дата**: 18 октября 2025  
**Статус**: ✅ Готово к использованию

## 🎯 Что изменилось

Система **сохраняет subflow на бэкенд** и получает официальный `wf_description_id`, но **кэширует ID локально** для быстрого доступа.

## 🔧 Ключевые изменения

### 1. SubflowRegistry.js
```javascript
// ✅ Добавлен API client
import { getWorkflowAPI } from '../config/api';

// ✅ Конструктор принимает baseUrl
constructor(baseUrl) {
  this.api = getWorkflowAPI(baseUrl);
}

// ✅ Асинхронное сохранение на бэкенд
async save(name) {
  const response = await this.api.saveWorkflow(
    subflow.definition.states,
    subflow.definition.predefined_context || {}
  );
  
  const wfDescriptionId = response.wf_description_id;
  subflow.id = wfDescriptionId; // ID с бэкенда!
  this.saveToLocalStorage();    // Кэш
  
  return wfDescriptionId;
}

// ✅ Асинхронный getId
async getId(name) {
  if (subflow.id) return subflow.id;  // Из кэша
  return await this.save(name);        // Или с бэкенда
}

// ✅ Асинхронный saveAll
async saveAll() {
  for (const name of unsaved) {
    const id = await this.save(name);
    results[name] = id;
  }
  return results;
}
```

### 2. useSubflowRegistry.js
```javascript
// ✅ Hook принимает baseUrl
export function useSubflowRegistry(baseUrl) {
  const reg = getSubflowRegistry(baseUrl);
  
  // ✅ Все методы async
  const save = async (name) => {
    const id = await registry.save(name);
    return id;
  };
}
```

### 3. SubflowManager.jsx
```javascript
// ✅ Компонент принимает baseUrl
export function SubflowManager({ baseUrl }) {
  const reg = getSubflowRegistry(baseUrl);
  
  // ✅ Асинхронные обработчики
  const handleSave = async (name) => {
    const id = await registry.save(name);
    console.log('✅ Saved:', id);
  };
}
```

### 4. SubflowsPage.jsx
```javascript
// ✅ Передаёт baseUrl из конфига
const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

return <SubflowManager baseUrl={baseUrl} />;
```

## 📋 API Flow

```
User clicks "Save"
       ↓
SubflowManager.handleSave('onboarding-flow')
       ↓
registry.save('onboarding-flow')
       ↓
api.saveWorkflow(states, context)
       ↓
POST /api/workflow/save
       ↓
Response: { wf_description_id: "abc123" }
       ↓
localStorage cache: { "onboarding-flow": { id: "abc123", ... } }
       ↓
Return "abc123"
```

## 💾 Данные

### Backend Response
```json
{
  "wf_description_id": "abc123"
}
```

### localStorage Cache
```json
{
  "subflow_registry": {
    "onboarding-flow": {
      "id": "abc123",           // ← ID с бэкенда
      "name": "onboarding-flow",
      "description": "...",
      "definition": {...}
    }
  }
}
```

## 🚀 Использование

```javascript
// 1. Получить registry
const registry = getSubflowRegistry('http://localhost:3000');

// 2. Сохранить на бэкенд
const id = await registry.save('onboarding-flow');
console.log('Backend ID:', id); // → "abc123"

// 3. Использовать в workflow
{
  expression: {
    wf_description_id: id,  // ← Официальный ID с бэкенда
    variable: "result",
    input_context: {...}
  }
}
```

## ✅ Преимущества

1. **Официальный ID** - Генерируется бэкендом, совместим с системой
2. **Кэширование** - Повторные вызовы мгновенные (из localStorage)
3. **Persistence** - ID сохраняется между сессиями
4. **Логирование** - Полный лог операций в консоли
5. **Обработка ошибок** - try/catch для всех API вызовов

## 🧪 Тестирование

### 1. Запустить dev server
```bash
npm run dev
```

### 2. Открыть страницу subflow
```
http://localhost:5175/subflows
```

### 3. Проверить сохранение
1. Нажать "💾 Save" у любого subflow
2. Проверить консоль:
   ```
   [SubflowRegistry] Saving onboarding-flow to backend...
   [SubflowRegistry] ✅ Saved onboarding-flow → abc123
   ```
3. Открыть DevTools → Application → Local Storage
4. Найти ключ `subflow_registry`
5. Проверить что ID присутствует

### 4. Проверить кэширование
1. Нажать "💾 Save" ещё раз
2. Должно быть мгновенно (без HTTP-запроса)
3. Консоль: `[SubflowRegistry] Using cached ID: abc123`

## 📊 Логи

### Успешное сохранение
```
[SubflowRegistry] Saving onboarding-flow to backend...
[SubflowRegistry] ✅ Saved onboarding-flow → abc123
```

### Использование кэша
```
[SubflowRegistry] Using cached ID for onboarding-flow: abc123
```

### Ошибка
```
[SubflowRegistry] ❌ Failed to save onboarding-flow: Network error
```

## 📚 Документация

- **docs/SUBFLOW_BACKEND_INTEGRATION.md** - Полное руководство по интеграции
- **docs/SUBFLOW_REGISTRY.md** - API документация
- **docs/SUBFLOW_USAGE_GUIDE.md** - Руководство по использованию

## 🎯 Следующие шаги

1. ✅ Backend integration добавлена
2. ✅ localStorage кэширование работает
3. ✅ Документация обновлена
4. 🔄 Протестировать в браузере

---

**Итог**: Система сохраняет subflow на бэкенд через API и получает официальный `wf_description_id`. ID кэшируется локально для быстрого доступа.
