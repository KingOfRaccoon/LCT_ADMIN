# 📦 Subflow Registry - Локальное хранилище

## Обзор

Subflow Registry теперь работает **полностью локально** без зависимости от API сервера. Все данные хранятся в `localStorage` браузера.

## 🎯 Преимущества локального хранилища

1. **Мгновенная работа** - нет задержек на HTTP-запросы
2. **Автономность** - работает без сервера
3. **Простота** - не нужна синхронизация с бэкендом
4. **Persistence** - данные сохраняются между сессиями

## 🔧 Архитектура

```
┌─────────────────────────────────────┐
│     SubflowRegistry (Singleton)     │
│                                     │
│  • Генерация уникальных ID          │
│  • Хранение определений             │
│  • Управление метаданными           │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│         localStorage API            │
│                                     │
│  Key: "subflow_registry"            │
│  Value: {                           │
│    "onboarding-flow": {             │
│      id: "subflow_...",             │
│      definition: {...},             │
│      metadata: {...}                │
│    }                                │
│  }                                  │
└─────────────────────────────────────┘
```

## 💾 Формат хранения

### localStorage структура

```json
{
  "subflow_registry": {
    "onboarding-flow": {
      "id": "subflow_onboarding-flow_1729234567890_a1b2c3",
      "name": "onboarding-flow",
      "description": "Двухэкранный онбординг",
      "input_variables": ["user_id", "store_name"],
      "output_variables": ["completed", "user_preferences"],
      "definition": {
        "states": [...],
        "predefined_context": {...}
      }
    }
  }
}
```

### Формат ID

```
subflow_{name}_{timestamp}_{random}

Пример:
subflow_onboarding-flow_1729234567890_a1b2c3
         └──────┬──────┘ └─────┬─────┘ └─┬─┘
           имя         timestamp    random
```

## 📋 API методы

### SubflowRegistry

```javascript
import { getSubflowRegistry } from './services/subflowRegistry';

const registry = getSubflowRegistry();
```

#### Сохранение

```javascript
// Сохранить один subflow
const id = registry.save('onboarding-flow');
// → "subflow_onboarding-flow_1729234567890_a1b2c3"

// Сохранить все несохранённые
const results = registry.saveAll();
// → { "onboarding-flow": "subflow_...", "insurance-offer": "subflow_..." }
```

#### Получение ID

```javascript
// Получить ID (генерирует если нужно)
const id = registry.getId('onboarding-flow');

// Проверить, сохранён ли
const isSaved = registry.isSaved('onboarding-flow');
```

#### Работа с определениями

```javascript
// Получить определение по ID
const definition = registry.getDefinitionById('subflow_...');

// Получить все определения
const all = registry.getAllDefinitions();
// → { "subflow_...": {...}, "subflow_...": {...} }
```

#### Регистрация новых

```javascript
registry.register('my-custom-flow', graphData, {
  description: 'Мой кастомный subflow',
  input_variables: ['input1', 'input2'],
  output_variables: ['result']
});
```

#### Управление

```javascript
// Список всех subflow
const list = registry.list();

// Сбросить ID (для пересохранения)
registry.reset('onboarding-flow');

// Получить метаданные
const metadata = registry.getMetadata('onboarding-flow');
```

## 🎨 React компоненты

### useSubflowRegistry Hook

```jsx
import { useSubflowRegistry } from './hooks/useSubflowRegistry';

function MyComponent() {
  const {
    subflows,    // Список всех subflow
    loading,     // Состояние загрузки
    error,       // Ошибки
    save,        // Функция сохранения
    getId,       // Функция получения ID
    reset,       // Функция сброса
    saveAll,     // Сохранить все
    refresh      // Обновить список
  } = useSubflowRegistry();

  return (
    <div>
      {subflows.map(subflow => (
        <div key={subflow.name}>
          <h3>{subflow.name}</h3>
          <button onClick={() => save(subflow.name)}>
            {subflow.id ? '✅ Saved' : '💾 Save'}
          </button>
        </div>
      ))}
    </div>
  );
}
```

### SubflowManager Component

```jsx
import { SubflowManager } from './components/SubflowManager';

function SubflowsPage() {
  return (
    <div>
      <h1>Subflow Library</h1>
      <SubflowManager />
    </div>
  );
}
```

## 🔄 Использование в workflow

### 1. Сохранить subflow

```jsx
const registry = getSubflowRegistry();
const subflowId = registry.save('onboarding-flow');
```

### 2. Использовать в переходе

```javascript
// В GraphData transitions
{
  source: "start",
  target: "onboarding_subflow",
  condition: "true"
}

// В экспортированном StateModel
{
  state_id: "start",
  state_type: "screen",
  transitions: [
    {
      condition: "true",
      expression: {
        wf_description_id: "subflow_onboarding-flow_1729234567890_a1b2c3",
        variable: "onboarding_result",
        input_context: {
          user_id: "$user.id",
          store_name: "$store.name"
        }
      }
    }
  ]
}
```

### 3. Работа с результатами

```javascript
// В следующем экране доступны output_variables
{
  state_id: "after_onboarding",
  state_type: "screen",
  screen: {
    screen_id: "welcome_screen"
  },
  // Можно использовать $onboarding_result.completed
  // и $onboarding_result.user_preferences
}
```

## 🧪 Тестирование

```bash
# Запустить тест локального хранилища
node test-subflow-local-storage.js
```

Тест проверяет:
- ✅ Генерацию уникальных ID
- ✅ Сохранение в localStorage
- ✅ Persistence между вызовами
- ✅ Получение по ID
- ✅ Batch save (saveAll)

## 📊 Мониторинг

### В консоли браузера

```javascript
// Просмотр сохранённых данных
JSON.parse(localStorage.getItem('subflow_registry'))

// Очистка реестра
localStorage.removeItem('subflow_registry')

// Размер данных
new Blob([localStorage.getItem('subflow_registry')]).size + ' bytes'
```

### В DevTools

1. Открыть **Application** → **Local Storage**
2. Найти ключ `subflow_registry`
3. Просмотреть/редактировать JSON

## ⚠️ Ограничения

1. **Размер**: localStorage имеет лимит ~5-10MB
2. **Синхронизация**: Данные не синхронизируются между устройствами
3. **Приватность**: Очистка данных браузера удалит реестр
4. **Домен**: Доступно только в пределах одного домена

## 🚀 Миграция с API версии

Если у вас была предыдущая версия с API:

```javascript
// Старая версия (с API)
const registry = getSubflowRegistry('http://api.example.com');
await registry.save('onboarding-flow');

// Новая версия (локально)
const registry = getSubflowRegistry(); // Без параметров
registry.save('onboarding-flow'); // Синхронно
```

Изменения:
- ❌ Убран параметр `baseUrl`
- ❌ Убраны `async/await`
- ✅ Мгновенная работа
- ✅ Автономность

## 📚 Связанные документы

- [SUBFLOW_REGISTRY.md](./SUBFLOW_REGISTRY.md) - Полная документация API
- [SUBFLOW_USAGE_GUIDE.md](./SUBFLOW_USAGE_GUIDE.md) - Руководство по использованию
- [SUBFLOW_EXPORT_CONTRACT.md](./SUBFLOW_EXPORT_CONTRACT.md) - Спецификация контракта

## 💡 Лучшие практики

1. **Сохраняйте рано**: Генерируйте ID при создании subflow
2. **Копируйте ID**: Используйте UI для копирования ID в буфер
3. **Не изменяйте**: ID должен быть иммутабельным после генерации
4. **Backup**: Экспортируйте localStorage периодически
5. **Валидация**: Проверяйте наличие definition перед сохранением

## 🎯 Пример: Полный workflow

```javascript
// 1. Получить реестр
const registry = getSubflowRegistry();

// 2. Зарегистрировать новый subflow
registry.register('custom-flow', {
  states: [
    {
      state_id: 'step1',
      state_type: 'screen',
      screen: { screen_id: 'custom_screen' }
    }
  ]
}, {
  description: 'Custom flow',
  input_variables: ['data'],
  output_variables: ['result']
});

// 3. Сохранить и получить ID
const flowId = registry.save('custom-flow');
console.log('ID:', flowId);

// 4. Использовать в экспорте
const stateModel = {
  states: [
    {
      state_id: 'main',
      state_type: 'screen',
      transitions: [
        {
          condition: "true",
          expression: {
            wf_description_id: flowId,
            variable: "custom_result",
            input_context: {
              data: "$main.user_input"
            }
          }
        }
      ]
    }
  ]
};

// 5. Экспортировать
console.log(JSON.stringify(stateModel, null, 2));
```

---

**Обновлено**: 18 октября 2025  
**Версия**: 2.0 (Локальное хранилище)
