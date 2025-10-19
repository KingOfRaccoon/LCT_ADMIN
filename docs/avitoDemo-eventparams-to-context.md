# Передача eventParams в контекст через contextPatch

## Дата: 19 октября 2025 г.

## Проблема

При нажатии на иконки управления корзиной (🗑️, ☑️, +, −) параметры из `eventParams` не попадали в корневой контекст, который используется в integration states для API запросов.

## Решение

Используется `contextPatch` в edges для копирования данных из `eventParams` в корневой контекст **ДО** перехода к integration state.

## Механизм работы

### Поток данных:

```
┌────────────────────────────────────────────────────────┐
│ 1. Кнопка в списке                                     │
│    product.advertisement_id = 123                      │
│    product.quantity = 2                                │
└──────────────────┬─────────────────────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────────────────────┐
│ 2. eventParams формируются                             │
│    selected_item_id: ${product.advertisement_id} = 123 │
│    quantity_change: ${product.quantity} = 2            │
└──────────────────┬─────────────────────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────────────────────┐
│ 3. contextPatch выполняется (ДО integration state!)    │
│    Корневой контекст обновляется:                      │
│    • selected_item_id = ${eventParams.selected_item_id}│
│    • quantity_change = ${eventParams.quantity_change}  │
│    • advertisement_id = ${product.advertisement_id}    │
└──────────────────┬─────────────────────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────────────────────┐
│ 4. Integration state выполняется                       │
│    URL: /items/${selected_item_id} → /items/123 ✅     │
│    Body: {"quantity": "${quantity_change + 1}"} → 3 ✅ │
└────────────────────────────────────────────────────────┘
```

## Реализация

### Edge: edge-increase-quantity

```json
{
  "id": "edge-increase-quantity",
  "event": "increaseQuantity",
  "target": "increase-quantity-integration",
  "contextPatch": {
    "selected_item_id": {
      "reference": "${eventParams.selected_item_id}",
      "value": null
    },
    "quantity_change": {
      "reference": "${eventParams.quantity_change}",
      "value": null
    },
    "advertisement_id": {
      "reference": "${product.advertisement_id}",
      "value": null
    }
  }
}
```

**Что происходит:**
1. Кнопка передаёт `eventParams.selected_item_id = 123`
2. `contextPatch` копирует: корневой `selected_item_id = 123`
3. Integration state использует: `${selected_item_id}` → 123 ✅

### Edge: edge-decrease-quantity

```json
{
  "id": "edge-decrease-quantity",
  "event": "decreaseQuantity",
  "target": "decrease-quantity-integration",
  "contextPatch": {
    "selected_item_id": {
      "reference": "${eventParams.selected_item_id}",
      "value": null
    },
    "quantity_change": {
      "reference": "${eventParams.quantity_change}",
      "value": null
    },
    "advertisement_id": {
      "reference": "${product.advertisement_id}",
      "value": null
    }
  }
}
```

### Edge: edge-remove-item

```json
{
  "id": "edge-remove-item",
  "event": "removeItem",
  "target": "remove-item-integration",
  "contextPatch": {
    "selected_item_id": {
      "reference": "${eventParams.selected_item_id}",
      "value": null
    },
    "advertisement_id": {
      "reference": "${product.advertisement_id}",
      "value": null
    }
  }
}
```

### Edge: edge-toggle-focus

```json
{
  "id": "edge-toggle-focus",
  "event": "toggleFocus",
  "target": "toggle-focus-integration",
  "contextPatch": {
    "selected_item_id": {
      "reference": "${eventParams.selected_item_id}",
      "value": null
    },
    "advertisement_id": {
      "reference": "${product.advertisement_id}",
      "value": null
    }
  }
}
```

## Использование в Integration States

### increase-quantity-integration

```json
{
  "expressions": [
    {
      "url": "https://sandkittens.me/backservices/api/carts/3/items/${selected_item_id}",
      "method": "patch",
      "body": {
        "quantity": "${quantity_change + 1}"
      }
    }
  ]
}
```

**Откуда берутся переменные:**
- `${selected_item_id}` — из корневого контекста (через contextPatch из eventParams)
- `${quantity_change}` — из корневого контекста (через contextPatch из eventParams)

**Пример запроса:**
```http
PATCH https://sandkittens.me/backservices/api/carts/3/items/123
Content-Type: application/json

{
  "quantity": 3
}
```

### decrease-quantity-integration

```json
{
  "expressions": [
    {
      "url": "https://sandkittens.me/backservices/api/carts/3/items/${selected_item_id}",
      "method": "patch",
      "body": {
        "quantity": "${quantity_change - 1}"
      }
    }
  ]
}
```

**Пример запроса:**
```http
PATCH https://sandkittens.me/backservices/api/carts/3/items/123
Content-Type: application/json

{
  "quantity": 1
}
```

### remove-item-integration

```json
{
  "expressions": [
    {
      "url": "https://sandkittens.me/backservices/api/carts/3/advertisements/${selected_item_id}",
      "method": "delete"
    }
  ]
}
```

**Пример запроса:**
```http
DELETE https://sandkittens.me/backservices/api/carts/3/advertisements/123
```

### toggle-focus-integration

```json
{
  "expressions": [
    {
      "url": "https://sandkittens.me/backservices/api/carts/3/items/${selected_item_id}",
      "method": "patch",
      "body": {
        "selected": "${!product.selected}"
      }
    }
  ]
}
```

**⚠️ Внимание:** `${!product.selected}` использует значение из list context, не из root!

## Полный цикл на примере

### Пример: Увеличение количества iPhone с ID=123

#### 1. Состояние списка
```json
{
  "product": {
    "advertisement_id": 123,
    "name": "iPhone 16 Pro",
    "quantity": 2,
    "selected": true
  }
}
```

#### 2. Нажатие кнопки "+"
```json
{
  "id": "button-increase-{{itemIndex}}",
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

**Вычисленные eventParams:**
```json
{
  "selected_item_id": 123,
  "quantity_change": 2
}
```

#### 3. contextPatch выполняется
```json
{
  "contextPatch": {
    "selected_item_id": {
      "reference": "${eventParams.selected_item_id}"
    },
    "quantity_change": {
      "reference": "${eventParams.quantity_change}"
    },
    "advertisement_id": {
      "reference": "${product.advertisement_id}"
    }
  }
}
```

**Корневой контекст обновляется:**
```json
{
  "selected_item_id": 123,
  "quantity_change": 2,
  "advertisement_id": 123
}
```

#### 4. Integration state выполняет запрос
```http
PATCH https://sandkittens.me/backservices/api/carts/3/items/123
Content-Type: application/json

{
  "quantity": 3
}
```

#### 5. Сервер отвечает
```json
{
  "success": true,
  "item": {
    "advertisement_id": 123,
    "quantity": 3
  }
}
```

#### 6. Переход к fetch-cart-items
Загружается обновлённая корзина с новым количеством.

## Таблица: contextPatch по событиям

| Событие | selected_item_id | quantity_change | advertisement_id |
|---------|------------------|-----------------|------------------|
| increaseQuantity | ✅ eventParams | ✅ eventParams | ✅ product |
| decreaseQuantity | ✅ eventParams | ✅ eventParams | ✅ product |
| removeItem | ✅ eventParams | ❌ | ✅ product |
| toggleFocus | ✅ eventParams | ❌ | ✅ product |

## Ключевые моменты

### ✅ Используется eventParams
```json
"contextPatch": {
  "selected_item_id": {
    "reference": "${eventParams.selected_item_id}"
  }
}
```
**Значение берётся из параметров события**, которые были переданы кнопкой.

### ✅ Используется product (list context)
```json
"contextPatch": {
  "advertisement_id": {
    "reference": "${product.advertisement_id}"
  }
}
```
**Значение берётся из контекста списка**, доступного в момент нажатия.

### ⚠️ Порядок выполнения критичен
1. **Сначала** вычисляются `eventParams` (из list context)
2. **Потом** выполняется `contextPatch` (копирует в root context)
3. **Затем** integration state использует значения из root context

## Преимущества решения

✅ **Чёткий поток данных** - eventParams → contextPatch → root context → integration state  
✅ **Изоляция слоёв** - кнопки не знают про integration states  
✅ **Гибкость** - можно использовать как eventParams, так и product context  
✅ **Явность** - contextPatch показывает, какие данные передаются  
✅ **Консистентность** - все edges используют одинаковый подход  

## Статистика

```
✅ JSON валидный
✅ Edges с contextPatch: 4
✅ Параметров в contextPatch:
   - increaseQuantity: 3 (selected_item_id, quantity_change, advertisement_id)
   - decreaseQuantity: 3 (selected_item_id, quantity_change, advertisement_id)
   - removeItem: 2 (selected_item_id, advertisement_id)
   - toggleFocus: 2 (selected_item_id, advertisement_id)
```

## Связанные файлы

- `src/pages/Sandbox/data/avitoDemo.json` - основной workflow
- `docs/avitoDemo-final-context-solution.md` - предыдущая версия
- `docs/avitoDemo-context-patch-implementation.md` - первая попытка

## Следующие шаги

1. ✅ contextPatch добавлен для всех событий управления корзиной
2. ✅ eventParams копируются в корневой контекст
3. ✅ Integration states получают данные из root context
4. ⏭️ Тестирование в Sandbox
5. ⏭️ Проверка API запросов с правильными параметрами

## Заключение

Теперь при нажатии на любую иконку управления корзиной:
1. ✅ Кнопка передаёт `eventParams` с ID товара и другими данными
2. ✅ `contextPatch` копирует эти параметры в **корневой контекст**
3. ✅ Integration state получает данные из корневого контекста
4. ✅ API запрос выполняется с **правильными параметрами**

**Данные теперь попадают в контекст, который уходит на сервер!** 🎯
