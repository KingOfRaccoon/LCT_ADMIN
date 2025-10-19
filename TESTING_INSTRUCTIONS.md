# Инструкция для тестирования исправления eventParams

## Что было исправлено
Теперь `eventParams` корректно резолвятся с учётом контекста списка, и вместо объектов с `reference` отправляются готовые значения.

## Как протестировать

### 1. Откройте Sandbox
```
http://localhost:5176
```

### 2. Выберите workflow "Авито — Корзина"

### 3. Откройте DevTools Console (F12)

### 4. Проверьте события кнопок в списке товаров

#### Тест 1: Кнопка "Удалить товар" (🗑️)
1. Нажмите на кнопку удаления товара
2. В консоли должно быть:
```javascript
[SandboxPage] handleNodeEvent: {
  eventName: "removeItem",
  eventParams: {
    selected_item_id: 123  // ✅ Число, а не объект!
  }
}
```

#### Тест 2: Кнопка "+" (увеличение количества)
1. Нажмите на кнопку "+"
2. В консоли должно быть:
```javascript
[SandboxPage] handleNodeEvent: {
  eventName: "increaseQuantity",
  eventParams: {
    selected_item_id: 123,      // ✅ Число
    quantity_change: 2           // ✅ Число
  }
}
```

#### Тест 3: Checkbox магазина
1. Нажмите на checkbox рядом с названием магазина
2. В консоли должно быть:
```javascript
[SandboxPage] handleNodeEvent: {
  eventName: "toggleShopSelection",
  eventParams: {
    shop_id: 14  // ✅ Число, а не объект!
  }
}
```

## Что проверять

### ❌ Было (неправильно):
```javascript
eventParams: {
  selected_item_id: {
    reference: "${product.advertisement_id}",
    value: 0
  }
}
```

### ✅ Стало (правильно):
```javascript
eventParams: {
  selected_item_id: 123  // Конкретное значение из product
}
```

## Дополнительная проверка

### Проверьте Network Tab
1. Откройте DevTools → Network
2. Нажмите на любую кнопку управления корзиной
3. Найдите запрос к API
4. Проверьте, что в URL или теле запроса используются **конкретные значения**, а не объекты с reference

## Примечания
- Если видите объекты с `reference` в eventParams - исправление НЕ работает
- Если видите конкретные числа/строки в eventParams - исправление работает ✅
