# 🔄 До и После: Сравнение изменений

## 📊 Что изменилось

### ❌ Было (до изменений)

```
Удаление товара:
removeItem → remove-item-integration → fetch-cart-items
             (сразу DELETE)

❌ Snackbar не показывался
❌ Нельзя отменить удаление
❌ Информация о товаре терялась
```

### ✅ Стало (после изменений)

```
Удаление товара:
removeItem → prepare-remove-item → remove-item-integration → fetch-cart-items
             (сохранение данных)  (DELETE)

✅ Snackbar показывается
✅ Можно отменить удаление
✅ Информация сохраняется в removed_item

Отмена удаления:
undoRemoveItem → undo-remove-item-integration → fetch-cart-items
                 (PATCH с quantity)
```

---

## 🎨 Визуальное сравнение

### ❌ Было: Snackbar внутри body

```
┌──────────────────────────────────┐
│  HEADER                          │
├──────────────────────────────────┤
│  BODY                            │
│    - Товары                      │
│    - Рекомендации                │
│    - Snackbar (fixed) ⚠️         │ ← Внутри body
│                                  │
├──────────────────────────────────┤
│  FOOTER                          │
└──────────────────────────────────┘
```

**Проблемы**:
- ⚠️ Snackbar внутри body (не отдельная секция)
- ⚠️ Может конфликтовать с overflow
- ⚠️ Не семантично

### ✅ Стало: Snackbar в отдельной секции

```
┌──────────────────────────────────┐
│  HEADER                          │
├──────────────────────────────────┤
│  BODY                            │
│    - Товары                      │
│    - Рекомендации                │
│                                  │
├──────────────────────────────────┤
│  SNACKBAR (отдельная секция) ✅  │ ← Своя секция
├──────────────────────────────────┤
│  FOOTER                          │
└──────────────────────────────────┘
```

**Преимущества**:
- ✅ Snackbar в отдельной секции
- ✅ Независим от body
- ✅ Семантичная структура

---

## 📦 Переменные

### ❌ Было

```javascript
{
  "variableSchemas": {
    "selected_item_id": { ... },
    "quantity_change": { ... },
    "suggested_products": { ... }
    // ❌ Нет removed_item
  }
}
```

### ✅ Стало

```javascript
{
  "variableSchemas": {
    "selected_item_id": { ... },
    "quantity_change": { ... },
    "suggested_products": { ... },
    "removed_item": {              // ✅ Добавлено
      "type": "object",
      "schema": {
        "id": "number",
        "quantity": "number"
      }
    }
  }
}
```

---

## 🔧 Состояния (Nodes)

### ❌ Было: 8 состояний

```
1. fetch-cart-items
2. cart-main
3. add-to-cart-integration
4. increase-quantity-integration
5. decrease-quantity-integration
6. remove-item-integration           ← Сразу удаляет
7. toggle-focus-integration
8. checkout-screen
```

### ✅ Стало: 10 состояний

```
1. fetch-cart-items
2. cart-main
3. add-to-cart-integration
4. increase-quantity-integration
5. decrease-quantity-integration
6. prepare-remove-item               ← ✅ НОВОЕ: подготовка
7. remove-item-integration
8. undo-remove-item-integration      ← ✅ НОВОЕ: отмена (PATCH)
9. clear-undo-state                  ← ✅ НОВОЕ: очистка переменных
10. toggle-focus-integration
11. checkout-screen
```

---

## 🔀 Edges (Переходы)

### ❌ Было: 5 edges

```javascript
[
  { event: "addToCart", target: "add-to-cart-integration" },
  { event: "increaseQuantity", target: "increase-quantity-integration" },
  { event: "decreaseQuantity", target: "decrease-quantity-integration" },
  { event: "removeItem", target: "remove-item-integration" },  // ← Сразу на удаление
  { event: "toggleFocus", target: "toggle-focus-integration" }
]
```

### ✅ Стало: 7 edges

```javascript
[
  { event: "addToCart", target: "add-to-cart-integration" },
  { event: "increaseQuantity", target: "increase-quantity-integration" },
  { event: "decreaseQuantity", target: "decrease-quantity-integration" },
  { event: "removeItem", target: "prepare-remove-item" },      // ← ✅ Сначала подготовка
  { event: "undoRemoveItem", target: "undo-remove-item-integration" }, // ← ✅ НОВОЕ
  { event: "toggleFocus", target: "toggle-focus-integration" }
]
```

---

## 🎨 Секции экрана

### ❌ Было: 3 секции

```javascript
{
  "sections": {
    "header": { ... },
    "body": { ... },    // ← Snackbar внутри
    "footer": { ... }
  }
}
```

### ✅ Стало: 4 секции

```javascript
{
  "sections": {
    "header": { ... },
    "body": { ... },
    "snackbar": { ... },  // ← ✅ НОВАЯ СЕКЦИЯ
    "footer": { ... }
  }
}
```

---

## 📡 API запросы

### ❌ Было: только DELETE

```http
DELETE /api/carts/3/advertisements/${id}
```

**Проблема**: Нельзя вернуть удалённый товар

### ✅ Стало: DELETE + PATCH

**Удаление**:
```http
DELETE /api/carts/3/advertisements/${id}
```

**Восстановление** (✅ НОВОЕ):
```http
PATCH /api/carts/3/items/${id}
Content-Type: application/json

{
  "quantity": 3  // Исходное количество из removed_item
}
```

---

## 🎯 User Experience

### ❌ Было

```
Пользователь:
1. Нажимает 🗑️
2. Товар исчезает
3. ❌ Случайное удаление? Не восстановить!
4. ❌ Нужно заново искать товар в каталоге
```

### ✅ Стало

```
Пользователь:
1. Нажимает 🗑️
2. Товар исчезает
3. ✅ Видит snackbar "Товар удалён | Вернуть"
4. ✅ Может отменить за 1 клик
5. ✅ Товар возвращается с тем же количеством
```

---

## 📊 Метрики изменений

| Параметр | Было | Стало | Изменение |
|----------|------|-------|-----------|
| **Nodes** | 8 | 11 | +3 (prepare, undo, clear) |
| **Edges** | 5 | 7 | +2 (removeItem, undoRemoveItem) |
| **Sections** | 3 | 4 | +1 (snackbar) |
| **Переменные** | 3 | 4 | +1 (removed_item) |
| **API endpoints** | 1 (DELETE) | 2 (DELETE + PATCH) | +1 |
| **Lines of code** | ~1650 | ~1780 | +130 |

---

## 🎬 Анимированное сравнение

### ❌ Было: Удаление без возврата

```
[Корзина: 3 товара]
       ↓ (клик 🗑️)
[Корзина: 2 товара]
       ↓
❌ Конец (нельзя вернуть)
```

### ✅ Стало: Удаление с возможностью отмены

```
[Корзина: 3 товара]
       ↓ (клик 🗑️)
[Корзина: 2 товара + Snackbar]
       ↓ (клик "Вернуть")
[Корзина: 3 товара]
       ↓
✅ Товар восстановлен!
```

---

## 🔍 Технические отличия

### Context до удаления

**Было**:
```javascript
{
  "selected_item_id": 123,
  // ❌ Нет removed_item
  "ui": {
    "notifications": {
      "message": null  // ❌ Snackbar не показывается
    }
  }
}
```

**Стало**:
```javascript
{
  "selected_item_id": 123,
  "removed_item": {        // ✅ Сохраняются данные
    "id": 123,
    "quantity": 3
  },
  "ui": {
    "notifications": {
      "message": "Товар удалён из корзины",  // ✅ Snackbar виден
      "actionLabel": "Вернуть",
      "actionEvent": "undoRemoveItem"
    }
  }
}
```

---

## ✅ Итог

### Что улучшилось:

1. ✅ **UX**: Пользователь может отменить случайное удаление
2. ✅ **Архитектура**: Snackbar в отдельной секции
3. ✅ **Функциональность**: Новое событие `undoRemoveItem`
4. ✅ **Безопасность**: Сохраняется исходное количество
5. ✅ **Семантика**: Промежуточное состояние `prepare-remove-item`

### Что сохранилось:

- ✅ API endpoint для удаления не изменился
- ✅ Существующие состояния не затронуты
- ✅ Обратная совместимость

---

**Дата**: 19 октября 2025  
**Статус**: ✅ Сравнение завершено
