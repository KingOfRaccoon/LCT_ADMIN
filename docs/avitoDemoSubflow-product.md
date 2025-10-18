# Avito Demo Subflow Product 🎯

## Описание

Продукт демонстрирует использование **Subflow** — нового типа состояний (state), которые позволяют выносить несколько состояний в отдельную переиспользуемую сущность. Это особенно полезно для создания библиотеки типовых workflow-блоков.

## Структура продукта

### 📦 Основной Workflow

```
┌─────────────────────────────────────┐
│  1. onboarding-subflow (START)      │  ← Вызов subflow
│     ↓ onboarding_result             │
│  2. fetch-cart-items                │  ← Загрузка корзины
│     ↓ cart_response                 │
│  3. cart-main                       │  ← Основной экран
│     ↓ различные события             │
│  4. integration nodes               │  ← CRUD операции
│     (add, increase, decrease, etc.) │
└─────────────────────────────────────┘
```

### 🔄 Subflow: "onboarding-flow"

Независимый двухэкранный онбординг:

```
┌────────────────────────────────┐
│  Screen 1: Приветствие         │
│  - Показывает store_name       │
│  - Кнопка "Продолжить" →       │
│                                │
│  Screen 2: Настройка профиля   │
│  - Кнопка "Завершить" →        │
│    completed: true             │
│    user_preferences: "Опытный" │
│  - Кнопка "Пропустить" →       │
│    completed: false            │
│    user_preferences: "Гость"   │
└────────────────────────────────┘
```

## 🔧 Контракт Subflow

### State Configuration

```json
{
  "id": "onboarding-subflow",
  "type": "subflow",
  "state_type": "subflow",
  "name": "OnboardingFlow",
  "expressions": [{
    "variable": "onboarding_result",
    "subflow_workflow_id": "onboarding-flow",
    "input_mapping": { ... },
    "output_mapping": { ... },
    "dependent_variables": [ ... ],
    "error_variable": "onboarding_error"
  }],
  "transitions": [
    {"variable": "onboarding_result", "state_id": "fetch-cart-items"},
    {"variable": "onboarding_error", "state_id": "fetch-cart-items"}
  ]
}
```

### Input Mapping

Определяет, какие переменные из родительского контекста передаются в subflow:

```json
{
  "input_mapping": {
    "user_id": "cart_response.user_id",      // Из parent → в subflow
    "store_name": "store.name"               // Из parent → в subflow
  }
}
```

### Output Mapping

Определяет, какие результаты возвращаются из subflow обратно:

```json
{
  "output_mapping": {
    "completed": "onboarding_result.completed",        // Из subflow → в parent
    "user_preferences": "user_name"                    // Из subflow → в parent
  }
}
```

### Dependent Variables

Список переменных, которые должны существовать перед выполнением subflow:

```json
{
  "dependent_variables": ["cart_response", "store"]
}
```

### Error Handling

Переменная для обработки ошибок:

```json
{
  "error_variable": "onboarding_error"
}
```

## 📊 Схемы переменных

```javascript
variableSchemas: {
  // Входные данные для subflow
  "cart_response": { type: "object", schema: { ... } },
  "store": { type: "object", schema: { ... } },
  
  // Результаты из subflow
  "onboarding_result": {
    type: "object",
    schema: {
      "completed": "boolean",
      "skipped": "boolean"
    }
  },
  "onboarding_error": { type: "string", schema: null },
  
  // Обновленные данные после subflow
  "user_name": { type: "string" }  // Персонализация UI
}
```

## 🎨 Использование результатов

После завершения subflow, родительский workflow получает данные:

```javascript
// В screen-cart-main используется результат subflow:
{
  "id": "text-cart-title",
  "type": "text",
  "properties": {
    "content": {
      "reference": "Корзина — ${user_name}",  // ← Из subflow!
      "value": "Корзина"
    }
  }
}
```

## 🚀 Использование продукта

### В коде

```javascript
// src/pages/Sandbox/data/demoProduct.js
import avitoDemoSubflow from './avitoDemoSubflow.json';

export const demoProduct = avitoDemoSubflow;
export default avitoDemoSubflow;
```

### В SandboxPage.jsx

```javascript
import avitoDemoSubflow from './data/avitoDemoSubflow.json';

// По умолчанию загружается avitoDemoSubflow
const product = workflowData || runtimeProduct || avitoDemoSubflow;
```

## 💡 Преимущества Subflow

### 1️⃣ **Переиспользование**
Один и тот же onboarding можно использовать в разных workflow:
- Корзина
- Каталог товаров
- Профиль пользователя
- Оформление заказа

### 2️⃣ **Изоляция**
Subflow имеет собственный контекст и не загрязняет родительский namespace.

### 3️⃣ **Тестируемость**
Subflow можно разрабатывать и тестировать независимо.

### 4️⃣ **Композиция**
Сложные workflow собираются из простых, проверенных блоков.

## 📝 Примеры использования

### Пример 1: Онбординг перед любым действием

```json
{
  "nodes": [
    {
      "id": "check-user-status",
      "type": "subflow",
      "state_type": "subflow",
      "expressions": [{
        "variable": "user_status",
        "subflow_workflow_id": "onboarding-flow",
        "input_mapping": { "user_id": "current_user.id" },
        "output_mapping": { "onboarded": "user_status.completed" }
      }]
    }
  ]
}
```

### Пример 2: Страховка при покупке

```json
{
  "id": "offer-insurance",
  "type": "subflow",
  "state_type": "subflow",
  "expressions": [{
    "variable": "insurance_result",
    "subflow_workflow_id": "insurance-offer-flow",
    "input_mapping": {
      "customer_id": "user_id",
      "product_type": "phone_model",
      "product_price": "phone_price"
    },
    "output_mapping": {
      "insurance_accepted": "accepted",
      "insurance_premium": "monthly_premium"
    },
    "dependent_variables": ["user_id", "phone_model", "phone_price"],
    "error_variable": "insurance_error"
  }]
}
```

### Пример 3: Выбор способа доставки

```json
{
  "id": "choose-delivery",
  "type": "subflow",
  "state_type": "subflow",
  "expressions": [{
    "variable": "delivery_result",
    "subflow_workflow_id": "delivery-selection-flow",
    "input_mapping": {
      "cart_total": "cart_response.total_amount",
      "user_address": "user.address"
    },
    "output_mapping": {
      "delivery_method": "selected_method",
      "delivery_cost": "cost"
    }
  }]
}
```

## 🎯 Запуск и тестирование

1. Запустите Sandbox:
```bash
npm run dev
```

2. Откройте страницу Sandbox

3. Проверьте работу:
   - ✅ Экран приветствия показывает название магазина
   - ✅ Кнопка "Продолжить" переводит на второй экран
   - ✅ Кнопка "Завершить" устанавливает `user_name = "Опытный пользователь"`
   - ✅ Кнопка "Пропустить" устанавливает `user_name = "Гость"`
   - ✅ После subflow загружается корзина
   - ✅ Заголовок корзины показывает `user_name`

## 📚 Связанные файлы

- `/src/pages/Sandbox/data/avitoDemoSubflow.json` - Основной файл workflow
- `/src/pages/Sandbox/data/avitoDemoSubflowProduct.js` - Экспорт продукта
- `/src/pages/Sandbox/data/demoProduct.js` - Активный продукт
- `/src/pages/Sandbox/SandboxPage.jsx` - Рендеринг продукта

## 🔮 Будущие улучшения

- [ ] Добавить валидацию dependent_variables
- [ ] Реализовать error_variable обработку
- [ ] Добавить поддержку вложенных subflow
- [ ] Создать библиотеку типовых subflow
- [ ] Добавить визуальный редактор subflow
- [ ] Реализовать версионирование subflow

---

**Автор:** AI Assistant  
**Дата:** 18 октября 2025 г.  
**Версия:** 1.0.0
