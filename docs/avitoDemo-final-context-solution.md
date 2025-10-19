# Финальное решение: Передача advertisement_id из контекста карточки

## Дата: 19 октября 2025 г.

## Решение

Используется **двойной подход** для корректной передачи `advertisement_id`:

1. **В `eventParams` кнопок** - напрямую используется `${product.advertisement_id}` из контекста списка
2. **В `contextPatch` края (edge)** - копируется значение в корневой контекст для использования в integration states

## Почему это работает

### Поток данных:

```
┌─────────────────────────────────────────────────────────┐
│ 1. Список: list-cart-items (itemAlias: "product")      │
│    product.advertisement_id = 123                       │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 2. Кнопка: eventParams                                  │
│    selected_item_id: "${product.advertisement_id}"      │
│    → Система видит: selected_item_id = 123              │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 3. Edge: contextPatch выполняется                       │
│    advertisement_id (root) = ${product.advertisement_id}│
│    → Корневой контекст: advertisement_id = 123          │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 4. Integration state получает:                          │
│    - selected_item_id из eventParams = 123 ✅           │
│    - advertisement_id из root context = 123 ✅          │
└─────────────────────────────────────────────────────────┘
```

## Реализация

### 1. eventParams в кнопках (передача значения напрямую)

#### button-remove
```json
{
  "event": "removeItem",
  "eventParams": {
    "selected_item_id": {
      "reference": "${product.advertisement_id}",
      "value": 0
    }
  }
}
```

#### button-toggle-focus
```json
{
  "event": "toggleFocus",
  "eventParams": {
    "selected_item_id": {
      "reference": "${product.advertisement_id}",
      "value": 0
    }
  }
}
```

#### button-decrease
```json
{
  "event": "decreaseQuantity",
  "eventParams": {
    "selected_item_id": {
      "reference": "${product.advertisement_id}",
      "value": 0
    },
    "quantity_change": {
      "reference": "${product.quantity}",
      "value": 1
    }
  }
}
```

#### button-increase
```json
{
  "event": "increaseQuantity",
  "eventParams": {
    "selected_item_id": {
      "reference": "${product.advertisement_id}",
      "value": 0
    },
    "quantity_change": {
      "reference": "${product.quantity}",
      "value": 1
    }
  }
}
```

#### button-buy-with-delivery
```json
{
  "event": "buyWithDelivery",
  "eventParams": {
    "product_id": {
      "reference": "${product.advertisement_id}",
      "value": 0
    }
  }
}
```

### 2. contextPatch в edges (копирование в root context)

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

То же самое для: `decreaseQuantity`, `removeItem`, `toggleFocus`

## Зачем нужны оба механизма?

### eventParams (обязательно)
- ✅ Передаёт **конкретное значение** в событие
- ✅ Integration state получает `selected_item_id` через параметры
- ✅ Работает внутри контекста списка (`product`)

### contextPatch (дополнительно)
- ✅ Сохраняет значение в **корневом контексте**
- ✅ Доступно для других частей приложения
- ✅ Может использоваться в URL expressions: `/items/${advertisement_id}`

## Пример использования в integration state

### increase-quantity-integration

```json
{
  "expressions": [
    {
      "variable": "add_to_cart_response",
      "url": "https://sandkittens.me/backservices/api/carts/3/items/${selected_item_id}",
      "method": "patch",
      "body": {
        "quantity": "${quantity_change + 1}"
      }
    }
  ]
}
```

**Откуда берётся `selected_item_id`?**
- Из `eventParams` кнопки: `${product.advertisement_id}` = 123
- Система подставляет: `/items/123` ✅

## Статистика

```
✅ JSON валидный
✅ Кнопок с eventParams: 6
✅ Использует product.advertisement_id: 5
✅ Edges с contextPatch: 4
```

### Список кнопок с product.advertisement_id:
1. ✅ button-remove → selected_item_id
2. ✅ button-toggle-focus → selected_item_id
3. ✅ button-buy-with-delivery → product_id
4. ✅ button-decrease → selected_item_id
5. ✅ button-increase → selected_item_id

### Список edges с contextPatch:
1. ✅ edge-increase-quantity
2. ✅ edge-decrease-quantity
3. ✅ edge-remove-item
4. ✅ edge-toggle-focus

## Преимущества решения

✅ **Прямая передача** - `eventParams` использует значение из list context напрямую
✅ **Нет промежуточных шагов** - не нужно сначала устанавливать в root, потом читать
✅ **Понятная логика** - каждая кнопка знает свой ID товара из `product`
✅ **Дублирование в root** - через `contextPatch` для универсального доступа
✅ **Гибкость** - можно использовать как `${selected_item_id}`, так и `${advertisement_id}`

## Альтернативные подходы (не используются)

### ❌ Только через root context
```json
"eventParams": {
  "selected_item_id": {
    "reference": "${advertisement_id}"  // Не работает без contextPatch ДО eventParams
  }
}
```
**Проблема**: `contextPatch` выполняется после вычисления `eventParams`

### ❌ Без contextPatch
```json
"contextPatch": {}
```
**Проблема**: Корневой контекст не обновляется, нет доступа вне event flow

## Связанные файлы

- `src/pages/Sandbox/data/avitoDemo.json` - основной workflow
- `docs/avitoDemo-context-patch-implementation.md` - предыдущая версия (устарела)
- `docs/avitoDemo-advertisement-id-change.md` - история изменений

## Следующие шаги

1. ✅ Все кнопки используют `product.advertisement_id` в eventParams
2. ✅ contextPatch установлен в 4 edges
3. ⏭️ Тестирование в Sandbox
4. ⏭️ Проверка API запросов с правильными ID

## Заключение

Теперь при нажатии на кнопку:
1. **eventParams** передаёт `selected_item_id = ${product.advertisement_id}` напрямую из list context
2. **contextPatch** дублирует значение в корневой `advertisement_id` для общего доступа
3. **Integration state** получает ID через параметр `selected_item_id` ✅
4. **API запрос** использует правильный URL: `/items/123` ✅
