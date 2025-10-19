# 🚀 Quick Reference: Snackbar с отменой удаления

## 📋 Кратко

При удалении товара показывается **snackbar** с кнопкой **"Вернуть"** для отмены действия.

**⚠️ Последнее обновление:** Исправлен поиск товара по `advertisement_id` вместо `id` (19.10.2025)

---

## 🎯 Быстрый тест

```bash
1. Откройте Sandbox → Авито — Корзина
2. Нажмите 🗑️ на товаре
3. Появится: "Товар удалён из корзины | Вернуть"
4. Нажмите "Вернуть" → товар восстанавливается
```

---

## 🔧 Новые состояния

| ID | Тип | Назначение |
|----|-----|------------|
| `prepare-remove-item` | Technical | Сохраняет `removed_item`, показывает snackbar ⚡ |
| `undo-remove-item-integration` | Integration | PATCH запрос для восстановления товара |
| `clear-undo-state` | Technical | Очищает snackbar и `removed_item` |

⚡ **Исправление:** Теперь ищет товар по `i.advertisement_id === selected_item_id`

---

## 🎨 Новая секция

**`snackbar`** - между `body` и `footer`
```javascript
{
  "position": "fixed",
  "bottom": "90px",     // Выше футера
  "zIndex": 1000
}
```

---

## 📡 API

**Удаление**:
```http
DELETE /api/carts/3/advertisements/${id}
```

**Восстановление**:
```http
PATCH /api/carts/3/items/${id}
Body: { "quantity": ${removed_item.quantity} }
```

---

## 🔄 Flow

```
removeItem 
  → prepare-remove-item (сохраняет removed_item)
    → remove-item-integration (DELETE)
      → fetch-cart-items (перезагрузка)
        
undoRemoveItem
  → undo-remove-item-integration (PATCH)
    → clear-undo-state (очистка переменных)
      → fetch-cart-items (перезагрузка)
```

---

## 📦 Переменная `removed_item`

```javascript
{
  "id": 123,         // ID удалённого товара
  "quantity": 3      // Количество до удаления
}
```

---

## 🎨 Стили Snackbar

```javascript
{
  "backgroundColor": "#2F3034",  // Тёмный
  "color": "#FFFFFF",            // Белый текст
  "borderRadius": "12px",
  "padding": "16px",
  "boxShadow": "0 4px 12px rgba(0, 0, 0, 0.15)"
}

// Кнопка "Вернуть"
{
  "color": "#8B5CF6",            // Фиолетовый
  "fontWeight": 600
}
```

---

## 📊 Структура

```
Nodes: 11
Edges: 7
Sections: 4 (header, body, snackbar, footer)
Lines: ~1780
```

---

## 📚 Документация

- **Полное описание**: `docs/avitoDemo-snackbar-undo-delete.md`
- **Тестирование**: `docs/avitoDemo-snackbar-testing.md`
- **Визуальный гайд**: `docs/avitoDemo-snackbar-visual-guide.md`
- **Резюме**: `docs/avitoDemo-snackbar-summary.md`

---

## ✅ Чек-лист

- [x] Snackbar показывается при удалении
- [x] Располагается выше footer (90px от низа)
- [x] Кнопка "Вернуть" восстанавливает товар
- [x] Количество восстанавливается корректно
- [x] Snackbar исчезает после отмены
- [x] API запросы работают
- [x] JSON без ошибок

---

**Дата**: 19 октября 2025  
**Статус**: ✅ Готово
