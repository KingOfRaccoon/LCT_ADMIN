# 🎯 Переход на локальное хранилище Subflow Registry

**Дата**: 18 октября 2025  
**Статус**: ✅ Завершено

## 📋 Что изменилось

### 1. SubflowRegistry (services/subflowRegistry.js)

**Было:**
```javascript
// Работа с API сервером
constructor(baseUrl) {
  this.api = getWorkflowAPI(baseUrl);
}

async save(name) {
  const response = await this.api.saveWorkflow(...);
  return response.wf_description_id;
}
```

**Стало:**
```javascript
// Только локальное хранилище
constructor() {
  // Нет зависимости от API
}

save(name) {
  // Генерация ID локально
  const id = generateSubflowId(name);
  this.saveToLocalStorage();
  return id;
}
```

**Изменения:**
- ❌ Убран импорт `getWorkflowAPI`
- ❌ Убран параметр `baseUrl` из конструктора
- ❌ Убраны все `async/await`
- ✅ Добавлена функция `generateSubflowId()`
- ✅ Добавлена полная сериализация в localStorage
- ✅ Добавлены методы `getDefinitionById()` и `getAllDefinitions()`

### 2. useSubflowRegistry (hooks/useSubflowRegistry.js)

**Было:**
```javascript
export function useSubflowRegistry(baseUrl) {
  const reg = getSubflowRegistry(baseUrl);
  
  const save = async (name) => {
    await registry.save(name);
  };
}
```

**Стало:**
```javascript
export function useSubflowRegistry() {
  const reg = getSubflowRegistry(); // Без параметров
  
  const save = (name) => {
    registry.save(name); // Синхронно
  };
}
```

**Изменения:**
- ❌ Убран параметр `baseUrl`
- ❌ Убраны все `async/await`
- ✅ Мгновенная работа без задержек

### 3. SubflowManager (components/SubflowManager/SubflowManager.jsx)

**Было:**
```javascript
export function SubflowManager({ baseUrl }) {
  const reg = getSubflowRegistry(baseUrl);
  
  const handleSave = async (name) => {
    await registry.save(name);
  };
}
```

**Стало:**
```javascript
export function SubflowManager() {
  const reg = getSubflowRegistry(); // Без параметров
  
  const handleSave = (name) => {
    registry.save(name); // Синхронно
  };
}
```

**Изменения:**
- ❌ Убран prop `baseUrl`
- ❌ Убраны все `async/await`
- ✅ Упрощена логика

## 🆕 Новые возможности

### Формат ID

```
subflow_{name}_{timestamp}_{random}

Пример:
subflow_onboarding-flow_1729234567890_a1b2c3
```

### Структура localStorage

```json
{
  "subflow_registry": {
    "onboarding-flow": {
      "id": "subflow_onboarding-flow_...",
      "name": "onboarding-flow",
      "description": "...",
      "input_variables": [...],
      "output_variables": [...],
      "definition": {
        "states": [...],
        "predefined_context": {...}
      }
    }
  }
}
```

### Новые методы

```javascript
// Получить определение по ID
const definition = registry.getDefinitionById(id);

// Получить все определения
const all = registry.getAllDefinitions();
// → { "subflow_...": {...}, "subflow_...": {...} }
```

## ✅ Преимущества

1. **Скорость**: Мгновенная работа без HTTP-запросов
2. **Автономность**: Работает без сервера
3. **Простота**: Нет async/await, нет обработки ошибок сети
4. **Надёжность**: Данные не теряются при перезагрузке страницы
5. **Прозрачность**: Легко посмотреть данные в DevTools

## 📊 Тесты

```bash
node test-subflow-local-storage.js
```

Результат:
```
✅ Registered test-flow
✅ Generated ID: subflow_test-flow_1760816335109_t5bx9r
✅ Same ID: true
✅ Definition found: true
✅ Stored in localStorage
✅ Saved 1 subflows

✅ All tests passed! Subflow registry works locally.
```

## 🚀 Использование

### До (с API):

```javascript
const registry = getSubflowRegistry('http://api.example.com');
const id = await registry.save('onboarding-flow');
// Ждём ответ от сервера...
```

### После (локально):

```javascript
const registry = getSubflowRegistry();
const id = registry.save('onboarding-flow');
// Мгновенно!
```

## 📚 Обновлённая документация

Создана новая документация:
- **docs/SUBFLOW_LOCAL_STORAGE.md** - Полное руководство по локальному хранилищу

Существующая документация остаётся актуальной:
- **docs/SUBFLOW_REGISTRY.md** - Архитектура реестра
- **docs/SUBFLOW_USAGE_GUIDE.md** - Руководство по использованию
- **docs/SUBFLOW_EXPORT_CONTRACT.md** - Спецификация контракта

## 🔄 Миграция

Если у вас уже был код, использующий старую версию:

1. **Убрать baseUrl из вызовов:**
   ```javascript
   // Было:
   getSubflowRegistry(baseUrl)
   useSubflowRegistry(baseUrl)
   <SubflowManager baseUrl={...} />
   
   // Стало:
   getSubflowRegistry()
   useSubflowRegistry()
   <SubflowManager />
   ```

2. **Убрать async/await:**
   ```javascript
   // Было:
   const id = await registry.save('flow');
   
   // Стало:
   const id = registry.save('flow');
   ```

3. **Данные не теряются** - все ID и определения хранятся в localStorage

## ⚠️ Ограничения

1. **Размер**: localStorage имеет лимит ~5-10MB
2. **Домен**: Данные доступны только на одном домене
3. **Синхронизация**: Нет автоматической синхронизации между устройствами
4. **Backup**: При очистке данных браузера реестр удаляется

## 🎯 Следующие шаги

1. ✅ Тесты пройдены
2. ✅ Документация обновлена
3. ✅ Dev сервер запущен
4. 🔄 Проверить в браузере: http://localhost:5175/subflows

---

**Итог**: Система полностью переведена на локальное хранилище. Все функции работают мгновенно без зависимости от API сервера.
