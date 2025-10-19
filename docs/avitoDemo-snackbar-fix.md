# 🔧 Исправление: Разделение Integration и Technical States

## ❌ Проблема

В состоянии `undo-remove-item-integration` (тип: `integration`) были использованы expressions с `method: "expression"`, что привело к ошибкам валидации:

```json
{
  "type": "literal_error",
  "loc": ["body", "states", "states", 7, "expressions", 1, "method"],
  "msg": "Input should be 'get', 'post', 'put', 'delete' or 'patch'",
  "input": "expression"
}
```

**Причина**: Integration states могут использовать только HTTP методы (`get`, `post`, `put`, `delete`, `patch`), а не `expression`.

---

## ✅ Решение

Разделил логику на **два состояния**:

### 1. `undo-remove-item-integration` (Integration State)
- **Назначение**: Выполняет PATCH запрос для восстановления товара
- **API**: `PATCH /api/carts/3/items/${removed_item.id}`
- **Переход**: → `clear-undo-state`

### 2. `clear-undo-state` (Technical State) ← **НОВОЕ**
- **Назначение**: Очищает переменные snackbar и `removed_item`
- **Expressions**:
  ```json
  [
    { "variable": "ui.notifications.message", "expression": "null" },
    { "variable": "ui.notifications.actionLabel", "expression": "null" },
    { "variable": "ui.notifications.actionEvent", "expression": "null" },
    { "variable": "removed_item", "expression": "null" }
  ]
  ```
- **Переход**: → `fetch-cart-items`

---

## 🔄 Новый Flow

### Было (с ошибками):
```
undoRemoveItem 
  → undo-remove-item-integration (PATCH + очистка переменных ❌)
    → fetch-cart-items
```

### Стало (исправлено):
```
undoRemoveItem 
  → undo-remove-item-integration (PATCH ✅)
    → clear-undo-state (очистка переменных ✅)
      → fetch-cart-items
```

---

## 📊 Изменения

| Параметр | До исправления | После исправления |
|----------|---------------|-------------------|
| **Nodes** | 10 | 11 (+1 `clear-undo-state`) |
| **Expressions в undo-remove-item** | 5 (1 PATCH + 4 expression ❌) | 1 (только PATCH ✅) |
| **Новых Technical States** | 1 | 2 (+1 `clear-undo-state`) |

---

## 🎯 Преимущества решения

1. ✅ **Соответствие архитектуре**: Integration state только для API, Technical state для логики
2. ✅ **Валидация проходит**: Все expressions используют правильные типы
3. ✅ **Читаемость**: Явное разделение ответственности
4. ✅ **Расширяемость**: Легко добавить дополнительную логику в `clear-undo-state`

---

## 🧪 Тестирование

### Проверка flow:
```javascript
// 1. Удаляем товар
removeItem → prepare-remove-item → remove-item-integration

// 2. Нажимаем "Вернуть"
undoRemoveItem → undo-remove-item-integration (PATCH)

// 3. Автоматически очищается состояние
→ clear-undo-state (очистка переменных)

// 4. Корзина обновляется
→ fetch-cart-items
```

### Ожидаемое поведение:
- ✅ PATCH запрос выполняется
- ✅ Snackbar исчезает
- ✅ `removed_item` = null
- ✅ Товар появляется в корзине

---

## 📝 Изменённые файлы

### Код
- `src/pages/Sandbox/data/avitoDemo.json`
  - Разделил `undo-remove-item-integration` на 2 состояния
  - Добавил `clear-undo-state` (Technical State)

### Документация
- `docs/avitoDemo-snackbar-undo-delete.md` - обновлён flow
- `docs/avitoDemo-snackbar-before-after.md` - обновлены метрики
- `docs/avitoDemo-snackbar-quick-ref.md` - обновлена таблица состояний
- `docs/avitoDemo-snackbar-fix.md` - этот файл (описание исправления)

---

## 🔍 Technical Details

### Expression формат для Technical State

**Правильно** ✅:
```json
{
  "variable": "ui.notifications.message",
  "expression": "null",
  "dependent_variables": []
}
```

**Неправильно** ❌ (в Integration State):
```json
{
  "variable": "ui.notifications.message",
  "url": "",
  "method": "expression",  // ← Ошибка!
  "body": null
}
```

---

## ✅ Статус

- **Дата исправления**: 19 октября 2025
- **Валидация**: ✅ Проходит
- **JSON**: ✅ Корректен
- **Ошибок**: 0
- **Готовность**: ✅ 100%

---

**Исправление завершено!** Теперь архитектура полностью соответствует требованиям системы.
