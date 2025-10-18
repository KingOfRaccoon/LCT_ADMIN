# 📦 Subflow — переиспользуемые блоки Workflow

## Обзор

**Subflow** — это тип состояния (state_type), который позволяет вызывать один workflow из другого. Это позволяет создавать библиотеку типовых workflow-блоков и использовать их в разных сценариях.

> ✅ **Статус**: Полностью соответствует официальному контракту
> - Загрузка (avitoDemoConverter.js) ✅
> - Визуализация (GraphEditor) ✅
> - Экспорт (workflowMapper.js) ✅
> - Contract compliance ✅

> 📖 **Быстрый старт**: [SUBFLOW_QUICKSTART.md](./SUBFLOW_QUICKSTART.md)  
> 📋 **Соответствие контракту**: [SUBFLOW_CONTRACT_COMPLIANCE.md](./SUBFLOW_CONTRACT_COMPLIANCE.md)

## 🔑 Ключевые правила контракта

⚠️ **Важно для использования в production:**

1. ✅ `screen` всегда пустой объект `{}`
2. ✅ `events` всегда пустой массив `[]`
3. ✅ `variable` в expression **обязательно** и совпадает с `variable` в transitions
4. ✅ Сначала сохраните subflow workflow, затем используйте его `wf_description_id`
5. ✅ Всегда указывайте `error_variable` для обработки ошибок

## Зачем это нужно?

### Проблема
Раньше каждый workflow был монолитным — все состояния определялись внутри одного JSON. При необходимости повторить часть логики (например, онбординг, выбор доставки, предложение страховки) приходилось копировать состояния.

### Решение
Subflow позволяет:
- 🔄 **Переиспользовать** общие блоки в разных workflow
- 🧩 **Компоновать** сложные сценарии из простых блоков
- 🧪 **Тестировать** блоки независимо
- 📦 **Изолировать** контекст и не загрязнять родительский namespace
- 🏗️ **Строить** библиотеку типовых решений

## Структура Subflow

### 1. Определение Subflow

```json
{
  "subflows": {
    "insurance-offer": {
      "id": "insurance-offer",
      "name": "Предложение страховки",
      "description": "Двухэкранный флоу предложения страховки",
      "input_variables": ["product_price", "product_type"],
      "output_variables": ["accepted", "monthly_premium"],
      "nodes": [...],
      "screens": {...}
    }
  }
}
```

### 2. Вызов Subflow

```json
{
  "id": "offer-insurance-state",
  "type": "subflow",
  "state_type": "subflow",
  "name": "OfferInsurance",
  "expressions": [{
    "variable": "insurance_result",
    "subflow_workflow_id": "insurance-offer",
    "input_mapping": {
      "product_price": "phone_price",
      "product_type": "phone_model"
    },
    "output_mapping": {
      "insurance_accepted": "accepted",
      "insurance_premium": "monthly_premium"
    },
    "dependent_variables": ["phone_price", "phone_model"],
    "error_variable": "insurance_error"
  }],
  "transitions": [
    {"variable": "insurance_result", "state_id": "process-payment"},
    {"variable": "insurance_error", "state_id": "skip-insurance"}
  ]
}
```

## Параметры Subflow State

### `subflow_workflow_id` (обязательный)
ID subflow из секции `subflows`.

```json
"subflow_workflow_id": "onboarding-flow"
```

### `input_mapping` (обязательный)
Маппинг переменных из родительского контекста в subflow.

**Формат:** `"имя_в_subflow": "путь.в.родителе"`

```json
"input_mapping": {
  "customer_id": "user_id",                    // простое
  "product_type": "cart.selected_item.model",  // вложенное
  "product_price": "cart.selected_item.price"
}
```

### `output_mapping` (обязательный)
Маппинг результатов из subflow обратно в родительский контекст.

**Формат:** `"путь.в.родителе": "имя_в_subflow"`

```json
"output_mapping": {
  "insurance_accepted": "accepted",
  "insurance_premium": "monthly_premium",
  "user_preferences": "completed"
}
```

### `dependent_variables` (опциональный)
Список переменных, которые должны существовать в родительском контексте перед выполнением subflow.

```json
"dependent_variables": ["user_id", "phone_model", "phone_price"]
```

### `error_variable` (опциональный)
Имя переменной для записи ошибки, если subflow завершился неудачно.

```json
"error_variable": "insurance_error"
```

## Transitions

Определяют переходы после завершения subflow:

```json
"transitions": [
  {
    "variable": "insurance_result",  // успешное завершение
    "case": null,
    "state_id": "process-payment"
  },
  {
    "variable": "insurance_error",   // ошибка
    "case": null,
    "state_id": "skip-insurance"
  }
]
```

## Примеры использования

### 1. Онбординг пользователя

**Определение:**
```json
{
  "subflows": {
    "user-onboarding": {
      "id": "user-onboarding",
      "name": "Онбординг",
      "input_variables": ["user_id", "store_name"],
      "output_variables": ["completed", "user_preferences"],
      "nodes": [
        {
          "id": "welcome-screen",
          "type": "screen",
          "screenId": "screen-welcome"
        },
        {
          "id": "preferences-screen",
          "type": "screen",
          "screenId": "screen-preferences"
        }
      ]
    }
  }
}
```

**Вызов:**
```json
{
  "id": "start-onboarding",
  "type": "subflow",
  "state_type": "subflow",
  "expressions": [{
    "variable": "onboarding_result",
    "subflow_workflow_id": "user-onboarding",
    "input_mapping": {
      "user_id": "current_user.id",
      "store_name": "store.name"
    },
    "output_mapping": {
      "onboarding_completed": "completed",
      "user_type": "user_preferences"
    }
  }]
}
```

### 2. Выбор способа доставки

**Определение:**
```json
{
  "subflows": {
    "delivery-selection": {
      "id": "delivery-selection",
      "name": "Выбор доставки",
      "input_variables": ["cart_total", "user_address"],
      "output_variables": ["delivery_method", "delivery_cost"],
      "nodes": [...]
    }
  }
}
```

**Вызов:**
```json
{
  "id": "choose-delivery",
  "type": "subflow",
  "state_type": "subflow",
  "expressions": [{
    "variable": "delivery_result",
    "subflow_workflow_id": "delivery-selection",
    "input_mapping": {
      "cart_total": "cart_response.total_amount",
      "user_address": "user.shipping_address"
    },
    "output_mapping": {
      "selected_delivery_method": "delivery_method",
      "delivery_fee": "delivery_cost"
    },
    "dependent_variables": ["cart_response", "user"]
  }]
}
```

### 3. KYC-верификация

**Определение:**
```json
{
  "subflows": {
    "kyc-verification": {
      "id": "kyc-verification",
      "name": "KYC Проверка",
      "input_variables": ["user_id", "required_level"],
      "output_variables": ["verified", "verification_level"],
      "nodes": [...]
    }
  }
}
```

**Вызов:**
```json
{
  "id": "verify-user",
  "type": "subflow",
  "state_type": "subflow",
  "expressions": [{
    "variable": "kyc_result",
    "subflow_workflow_id": "kyc-verification",
    "input_mapping": {
      "user_id": "user.id",
      "required_level": "transaction.required_kyc_level"
    },
    "output_mapping": {
      "is_verified": "verified",
      "kyc_level": "verification_level"
    },
    "error_variable": "kyc_error"
  }],
  "transitions": [
    {"variable": "kyc_result", "state_id": "proceed-transaction"},
    {"variable": "kyc_error", "state_id": "kyc-failed-screen"}
  ]
}
```

## Жизненный цикл Subflow

```
1. Parent Workflow вызывает Subflow State
   ↓
2. Проверка dependent_variables
   ↓
3. Применение input_mapping
   ↓
4. Выполнение Subflow (nodes → screens → transitions)
   ↓
5. Применение output_mapping
   ↓
6. Переход по transitions в Parent Workflow
```

## Best Practices

### ✅ DO

1. **Называйте понятно:**
   ```json
   "subflow_workflow_id": "insurance-offer-flow"  // ✅
   ```

2. **Делайте маленькие subflow:**
   - 2-5 экранов максимум
   - Одна логическая задача

3. **Документируйте input/output:**
   ```json
   {
     "description": "Принимает product_price, возвращает accepted/premium",
     "input_variables": ["product_price"],
     "output_variables": ["accepted", "premium"]
   }
   ```

4. **Обрабатывайте ошибки:**
   ```json
   {
     "error_variable": "subflow_error",
     "transitions": [
       {"variable": "result", "state_id": "success"},
       {"variable": "subflow_error", "state_id": "error-handler"}
     ]
   }
   ```

### ❌ DON'T

1. **Не делайте глубокий nesting:**
   ```json
   // ❌ Плохо: subflow вызывает другой subflow
   ```

2. **Не перегружайте контекст:**
   ```json
   // ❌ Плохо: 20+ input_variables
   ```

3. **Не забывайте про dependent_variables:**
   ```json
   // ❌ Плохо: subflow упадет, если нет нужных данных
   ```

## Отладка

### Context Inspector

Используйте панель "Контекст" в Sandbox:

```javascript
// До subflow
user_id: 123
phone_price: 99990

// После subflow
user_id: 123
phone_price: 99990
insurance_accepted: true      // ← output_mapping
insurance_premium: 500        // ← output_mapping
```

### Error Handling

```json
{
  "error_variable": "onboarding_error",
  "transitions": [
    {
      "variable": "onboarding_result",
      "state_id": "success-path"
    },
    {
      "variable": "onboarding_error",
      "state_id": "error-recovery-screen"
    }
  ]
}
```

## Демо

Полный пример: **avitoDemoSubflow**

📁 Файлы:
- `/src/pages/Sandbox/data/avitoDemoSubflow.json`
- `/docs/avitoDemoSubflow-product.md`
- `/docs/avitoDemoSubflow-quickstart.md`

🚀 Запуск:
```bash
npm run dev
# Откройте /sandbox
```

## Roadmap

- [ ] Валидация dependent_variables
- [ ] Nested subflows (subflow → subflow)
- [ ] Библиотека типовых subflow
- [ ] Визуальный редактор
- [ ] Версионирование
- [ ] Unit-тесты для subflow
- [ ] Analytics для subflow

---

**Версия:** 1.0.0  
**Дата:** 18 октября 2025 г.
