# Изменение: Передача advertisement_id из корневого контекста

## Что изменилось

Вместо передачи `product.advertisement_id` (из контекста списка) теперь используется `advertisement_id` из корневого контекста воркфлоу.

## Изменённые компоненты

### До изменения ❌
```json
"eventParams": {
  "selected_item_id": {
    "reference": "${product.advertisement_id}",
    "value": 0
  }
}
```

### После изменения ✅
```json
"eventParams": {
  "selected_item_id": {
    "reference": "${advertisement_id}",
    "value": 0
  }
}
```

## Затронутые кнопки (5 шт)

1. **🗑️ Удалить товар** (`removeItem`)
   - Параметр: `selected_item_id` → `${advertisement_id}`

2. **☑️/⬜ Переключить выбор** (`toggleFocus`)
   - Параметр: `selected_item_id` → `${advertisement_id}`

3. **− Уменьшить количество** (`decreaseQuantity`)
   - Параметр: `selected_item_id` → `${advertisement_id}`

4. **+ Увеличить количество** (`increaseQuantity`)
   - Параметр: `selected_item_id` → `${advertisement_id}`

5. **Купить с доставкой** (`buyWithDelivery`)
   - Параметр: `product_id` → `${advertisement_id}`

## Добавлена новая переменная

### variableSchemas
```json
"advertisement_id": {
  "type": "number",
  "schema": null
}
```

### initialContext
```json
"advertisement_id": null
```

## Как это работает

### Старая схема (из списка)
```
cart_response.shop_groups[] → shop
  → shop.items[] → product
    → product.advertisement_id ❌
```

### Новая схема (из корня)
```
Корневой контекст
  → advertisement_id ✅
```

## Преимущества нового подхода

1. **Упрощение**: Не нужно держать reference на item в списке
2. **Гибкость**: `advertisement_id` можно установить из любого места
3. **Консистентность**: Единый источник для ID товара

## Как использовать

Перед вызовом события (например, `removeItem`) нужно установить `advertisement_id` в контекст:

```javascript
// Пример установки перед действием
context.advertisement_id = product.advertisement_id;
```

Или использовать `contextPatch` в edge:

```json
{
  "event": "removeItem",
  "contextPatch": {
    "advertisement_id": "${product.advertisement_id}"
  }
}
```

## Проверка

```bash
✅ JSON валидный!
✅ advertisement_id в схеме: true
✅ advertisement_id в контексте: true
✅ Всего замен: 5
```

## Файлы

✅ `src/pages/Sandbox/data/avitoDemo.json` - обновлён
