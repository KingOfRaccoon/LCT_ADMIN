# 🔄 Subflow Registry - Сохранение на бэкенд

**Обновлено**: 18 октября 2025  
**Версия**: 3.0 (Backend Integration)

## 📋 Изменения

Система вернулась к сохранению subflow на бэкенд, но с кэшированием в localStorage.

## 🎯 Как это работает

```
┌─────────────────────────────────────┐
│       SubflowRegistry               │
│                                     │
│  1. Проверяет localStorage кэш      │
│  2. Если нет ID → сохраняет на бэк  │
│  3. Получает wf_description_id      │
│  4. Кэширует ID в localStorage      │
└──────────────┬──────────────────────┘
               │
        ┌──────┴──────┐
        ▼             ▼
   ┌─────────┐   ┌─────────┐
   │ Backend │   │localStorage│
   │  API    │   │   Cache  │
   └─────────┘   └─────────┘
```

## 💾 API Endpoint

Subflow сохраняется как обычный workflow через существующий endpoint:

```javascript
POST /api/workflow/save
{
  "states": [...],           // Экспортированные состояния subflow
  "predefined_context": {}   // Контекст (если есть)
}

Response:
{
  "wf_description_id": "abc123"  // ID от бэкенда
}
```

## 🔧 Использование

### 1. Сохранить subflow на бэкенд

```javascript
import { getSubflowRegistry } from './services/subflowRegistry';

const registry = getSubflowRegistry('http://localhost:3000');

// Асинхронное сохранение
const id = await registry.save('onboarding-flow');
console.log('Saved with ID:', id);
// → "abc123" (ID с бэкенда)
```

### 2. Получить ID (с автосохранением)

```javascript
// Если уже сохранён - вернёт из кэша
// Если нет - сохранит на бэкенд
const id = await registry.getId('onboarding-flow');
```

### 3. Проверить, сохранён ли

```javascript
const isSaved = registry.isSaved('onboarding-flow');
// → true/false (проверяет наличие ID в кэше)
```

### 4. Сбросить и пересохранить

```javascript
// Удалить ID из кэша
registry.reset('onboarding-flow');

// Сохранить заново (получит новый ID)
const newId = await registry.save('onboarding-flow');
```

### 5. Batch save

```javascript
// Сохранить все несохранённые subflow
const results = await registry.saveAll();
// → { 
//     "onboarding-flow": "abc123", 
//     "insurance-offer": "def456" 
//   }
```

## 🎨 React компоненты

### useSubflowRegistry Hook

```jsx
import { useSubflowRegistry } from './hooks/useSubflowRegistry';

function MyComponent() {
  const baseUrl = 'http://localhost:3000';
  const {
    subflows,    // Список всех subflow
    loading,     // Состояние загрузки
    error,       // Ошибки
    save,        // async (name) => id
    getId,       // async (name) => id
    reset,       // (name) => void
    saveAll,     // async () => results
    refresh      // () => void
  } = useSubflowRegistry(baseUrl);

  const handleSave = async () => {
    try {
      const id = await save('onboarding-flow');
      console.log('Saved:', id);
    } catch (error) {
      console.error('Failed:', error);
    }
  };

  return (
    <div>
      {subflows.map(subflow => (
        <div key={subflow.name}>
          <h3>{subflow.name}</h3>
          <p>Status: {subflow.id ? '✅ Saved' : '⏳ Not saved'}</p>
          <button onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
      ))}
      {error && <div className="error">{error}</div>}
    </div>
  );
}
```

### SubflowManager Component

```jsx
import { SubflowManager } from './components/SubflowManager';

function SubflowsPage() {
  const baseUrl = 'http://localhost:3000';
  
  return (
    <div>
      <h1>Subflow Library</h1>
      <SubflowManager baseUrl={baseUrl} />
    </div>
  );
}
```

## 📊 localStorage Cache

ID кэшируются локально для быстрого доступа:

```json
{
  "subflow_registry": {
    "onboarding-flow": {
      "id": "abc123",           // ID с бэкенда
      "name": "onboarding-flow",
      "description": "...",
      "input_variables": [...],
      "output_variables": [...],
      "definition": {...}       // Полное определение
    }
  }
}
```

## 🔄 Workflow интеграции

### 1. Сохранить subflow

```javascript
const registry = getSubflowRegistry('http://localhost:3000');
const subflowId = await registry.save('onboarding-flow');
// → "abc123"
```

### 2. Использовать в экспорте

```javascript
const stateModel = {
  states: [
    {
      state_id: "main_screen",
      state_type: "screen",
      transitions: [
        {
          condition: "user.new_user == true",
          expression: {
            wf_description_id: subflowId,  // ← ID с бэкенда
            variable: "onboarding_result",
            input_context: {
              user_id: "$user.id",
              store_name: "$store.name"
            }
          }
        }
      ]
    }
  ]
};
```

### 3. Обработать результат

```javascript
// В следующем состоянии доступны output_variables
{
  state_id: "after_onboarding",
  state_type: "screen",
  screen: {
    screen_id: "welcome_screen"
  },
  // Используем: $onboarding_result.completed
  //             $onboarding_result.user_preferences
}
```

## ⚡ Преимущества

1. **Официальный ID**: ID генерируется бэкендом и соответствует формату системы
2. **Кэширование**: Повторные вызовы используют кэш (мгновенно)
3. **Persistence**: ID сохраняется между сессиями
4. **Интеграция**: Работает с существующим API workflow

## 🔍 Логирование

Система логирует все операции:

```javascript
// Сохранение
[SubflowRegistry] Saving onboarding-flow to backend...
[SubflowRegistry] ✅ Saved onboarding-flow → abc123

// Использование кэша
[SubflowRegistry] Using cached ID for onboarding-flow: abc123

// Ошибка
[SubflowRegistry] ❌ Failed to save onboarding-flow: Network error
```

## 🧪 Тестирование

### В браузере

1. Откройте http://localhost:5175/subflows
2. Нажмите "💾 Save" у любого subflow
3. Проверьте консоль: должен появиться ID с бэкенда
4. Откройте DevTools → Application → Local Storage
5. Проверьте `subflow_registry` → должен быть ID

### В коде

```javascript
// Mock API для тестирования
const mockApi = {
  saveWorkflow: async (states, context) => {
    return { wf_description_id: 'test-id-123' };
  }
};

const registry = new SubflowRegistry('http://test');
registry.api = mockApi;

const id = await registry.save('test-flow');
console.log(id); // → "test-id-123"
```

## ⚠️ Обработка ошибок

```javascript
try {
  const id = await registry.save('onboarding-flow');
} catch (error) {
  if (error.message.includes('Network')) {
    console.error('Backend unavailable');
    // Fallback logic
  } else if (error.message.includes('not found')) {
    console.error('Subflow not registered');
  } else {
    console.error('Unknown error:', error);
  }
}
```

## 🔄 Миграция с локальной версии

Если у вас была версия с локальными ID:

```javascript
// Старая версия (локальные ID)
const id = registry.save('flow');
// → "subflow_flow_1729234567890_a1b2c3"

// Новая версия (ID с бэкенда)
const id = await registry.save('flow');
// → "abc123"
```

**Изменения в коде:**

1. Добавить `await` к вызовам `save()` и `getId()`
2. Передавать `baseUrl` в `getSubflowRegistry(baseUrl)`
3. Передавать `baseUrl` в `useSubflowRegistry(baseUrl)`
4. Передавать `baseUrl` в `<SubflowManager baseUrl={...} />`

## 📚 Связанные документы

- **SUBFLOW_REGISTRY.md** - Полная документация API
- **SUBFLOW_USAGE_GUIDE.md** - Руководство по использованию
- **SUBFLOW_EXPORT_CONTRACT.md** - Спецификация контракта

---

**Итог**: Система сохраняет subflow на бэкенд и получает официальные ID, но кэширует их локально для быстрого доступа.
