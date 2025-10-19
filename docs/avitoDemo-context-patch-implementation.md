# Реализация contextPatch для автоматической подстановки advertisement_id

## Дата: 19 октября 2025 г.

## Описание изменения

Добавлен механизм автоматического копирования `advertisement_id` из контекста карточки товара (`product.advertisement_id`) в корневой контекст при нажатии на кнопки управления товарами.

## Проблема

Раньше в `eventParams` кнопок использовалось прямое указание `${advertisement_id}`, но эта переменная не заполнялась автоматически при клике на карточку товара внутри списка.

## Решение

Использован механизм `contextPatch` в определении края (edge), который автоматически выполняет патч контекста перед переходом к целевому состоянию.

## Технические детали

### Структура contextPatch

```json
{
  "contextPatch": {
    "advertisement_id": {
      "reference": "${product.advertisement_id}",
      "value": null
    }
  }
}
```

### Механизм работы

1. **Контекст списка**: Внутри `list-cart-items-{{itemIndex}}` доступен контекст `product` (алиас для элемента массива)
2. **Событие кнопки**: Пользователь нажимает кнопку (например, "Увеличить количество")
3. **contextPatch выполняется**: Система копирует `${product.advertisement_id}` → корневой `advertisement_id`
4. **eventParams использует**: `${advertisement_id}` уже доступен в корневом контексте
5. **Переход к integration state**: Состояние получает правильный ID через `${advertisement_id}`

## Изменённые края (edges)

### 1. edge-increase-quantity
```json
{
  "id": "edge-increase-quantity",
  "event": "increaseQuantity",
  "target": "increase-quantity-integration",
  "contextPatch": {
    "advertisement_id": {
      "reference": "${product.advertisement_id}",
      "value": null
    }
  }
}
```

### 2. edge-decrease-quantity
```json
{
  "id": "edge-decrease-quantity",
  "event": "decreaseQuantity",
  "target": "decrease-quantity-integration",
  "contextPatch": {
    "advertisement_id": {
      "reference": "${product.advertisement_id}",
      "value": null
    }
  }
}
```

### 3. edge-remove-item
```json
{
  "id": "edge-remove-item",
  "event": "removeItem",
  "target": "remove-item-integration",
  "contextPatch": {
    "advertisement_id": {
      "reference": "${product.advertisement_id}",
      "value": null
    }
  }
}
```

### 4. edge-toggle-focus
```json
{
  "id": "edge-toggle-focus",
  "event": "toggleFocus",
  "target": "toggle-focus-integration",
  "contextPatch": {
    "advertisement_id": {
      "reference": "${product.advertisement_id}",
      "value": null
    }
  }
}
```

## События БЕЗ contextPatch

Следующие события не требуют contextPatch, так как не работают с конкретной карточкой товара:

- **addToCart** - использует свой параметр `advertisement_id` из suggested products
- **checkout** - переход к оформлению заказа
- **toggleShopSelection** - работает с `shop_id`, не с товаром
- **toggleSelectAll** - глобальная операция
- **deleteSelected** - удаление всех выбранных товаров

## Пример использования в кнопке

```json
{
  "id": "button-increase-{{itemIndex}}",
  "type": "button",
  "properties": {
    "text": "+",
    "event": "increaseQuantity",
    "eventParams": {
      "selected_item_id": {
        "reference": "${advertisement_id}",
        "value": 0
      },
      "quantity_change": {
        "reference": "${product.quantity}",
        "value": 1
      }
    }
  }
}
```

### Поток данных:

1. **В списке**: `product.advertisement_id = 123`
2. **Нажатие кнопки**: Событие `increaseQuantity` срабатывает
3. **contextPatch**: `advertisement_id` (корневой) = `${product.advertisement_id}` = 123
4. **eventParams**: `selected_item_id` = `${advertisement_id}` = 123 ✅
5. **API запрос**: `PATCH /api/carts/3/items/123/increase`

## Преимущества подхода

✅ **Автоматизация**: Не нужно вручную передавать ID через eventParams
✅ **Консистентность**: Один источник истины - `product.advertisement_id`
✅ **Упрощение UI**: Кнопки используют универсальный `${advertisement_id}`
✅ **Гибкость**: contextPatch выполняется перед переходом, данные всегда актуальны
✅ **Читаемость**: Явное копирование данных из list context в root context

## Альтернативные подходы

### ❌ Прямое использование product.advertisement_id в eventParams
```json
"eventParams": {
  "selected_item_id": {
    "reference": "${product.advertisement_id}"
  }
}
```
**Проблема**: Требует доступа к list context в eventParams

### ❌ Дублирование в каждом eventParams
```json
"eventParams": {
  "advertisement_id": {
    "reference": "${product.advertisement_id}"
  },
  "selected_item_id": {
    "reference": "${advertisement_id}"
  }
}
```
**Проблема**: Дублирование кода, сложнее поддерживать

### ✅ contextPatch в edge (выбранный подход)
```json
"contextPatch": {
  "advertisement_id": {
    "reference": "${product.advertisement_id}"
  }
}
```
**Преимущества**: Централизованное управление, один раз определяется в edge

## Статистика изменений

- **Изменённых edges**: 4 из 9
- **Edges с contextPatch**: 4
- **Edges без contextPatch**: 5 (не требуется)
- **Затронутых кнопок**: 5 (increase, decrease, remove, toggleFocus, buyWithDelivery)

## Валидация

```bash
✅ JSON валидный!
✅ advertisement_id в variableSchemas: true
✅ advertisement_id в initialContext: true
✅ contextPatch добавлен в 4 края
```

## Связанные файлы

- `src/pages/Sandbox/data/avitoDemo.json` - основной файл workflow
- `docs/avitoDemo-advertisement-id-change.md` - предыдущее изменение (eventParams)
- `docs/avitoDemo-state-graph.md` - документация состояний

## Следующие шаги

1. ✅ Добавлен contextPatch в edges
2. ⏭️ Тестирование в Sandbox
3. ⏭️ Проверка работы всех кнопок управления товарами
4. ⏭️ Проверка правильности API запросов с advertisement_id

## Примечания

- Событие `buyWithDelivery` определено в UI, но не имеет края в edges (может быть добавлено позже)
- `product.quantity` по-прежнему берётся из list context, так как это динамическое значение
- contextPatch выполняется перед каждым переходом, поэтому данные всегда актуальны
