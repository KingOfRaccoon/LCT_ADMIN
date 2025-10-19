# 🔧 Исправление отрисовки Snackbar

**Дата:** 19 октября 2025  
**Статус:** ✅ Исправлено

## 🐛 Проблема

Snackbar не отображался при удалении товара из корзины.

## 🔍 Причина

В состоянии `prepare-remove-item` товар искался по неправильному полю:

```javascript
// ❌ Было (неправильно)
const item = cart_response.shop_groups
  .flatMap(shop => shop.items)
  .find(i => i.id === selected_item_id);
return item ? { id: item.id, quantity: item.quantity } : null;
```

**Проблема:** Кнопка удаления передаёт `product.advertisement_id` в параметр `selected_item_id`, но мы искали по полю `i.id` вместо `i.advertisement_id`.

## ✅ Решение

Исправлен поиск товара на правильное поле:

```javascript
// ✅ Стало (правильно)
const item = cart_response.shop_groups
  .flatMap(shop => shop.items)
  .find(i => i.advertisement_id === selected_item_id);
return item ? { id: item.advertisement_id, quantity: item.quantity } : null;
```

## 📋 Изменения

### Файл: `avitoDemo.json`

**Состояние:** `prepare-remove-item` → Expression для `removed_item`

```json
{
  "variable": "removed_item",
  "method": "expression",
  "body": "${(() => { const item = cart_response.shop_groups.flatMap(shop => shop.items).find(i => i.advertisement_id === selected_item_id); return item ? { id: item.advertisement_id, quantity: item.quantity } : null; })()}"
}
```

## 🧪 Тестирование

### Инструкция по проверке

1. **Запустите приложение:**
   ```bash
   npm run dev
   ```

2. **Откройте Sandbox → Авито — Корзина**

3. **Загрузите товары:** Нажмите кнопку загрузки или дождитесь автоматической загрузки

4. **Удалите товар:** Нажмите 🗑️ на любом товаре

5. **Проверьте snackbar:**
   - ✅ Появился внизу экрана (90px от низа)
   - ✅ Текст: "Товар удалён из корзины"
   - ✅ Кнопка: "Вернуть" (фиолетового цвета)
   - ✅ Тёмный фон (#2F3034)
   - ✅ Закруглённые углы (12px)

6. **Восстановите товар:** Нажмите "Вернуть"

7. **Проверьте результат:**
   - ✅ Товар вернулся в корзину
   - ✅ Количество восстановилось
   - ✅ Snackbar исчез

### Ожидаемый результат

```
🛒 Корзина
├─ Товар A (кол-во: 2)
├─ Товар B (кол-во: 1)  ← Нажимаем 🗑️
└─ Товар C (кол-во: 3)

           ↓

🛒 Корзина
├─ Товар A (кол-во: 2)
└─ Товар C (кол-во: 3)

┌─────────────────────────────────────┐
│ Товар удалён из корзины  [Вернуть] │ ← Snackbar появился
└─────────────────────────────────────┘

           ↓ (нажали Вернуть)

🛒 Корзина
├─ Товар A (кол-во: 2)
├─ Товар B (кол-во: 1)  ← Восстановлен
└─ Товар C (кол-во: 3)

Snackbar исчез ✓
```

## 🔄 Затронутые компоненты

### Состояния:
- ✅ `prepare-remove-item` - исправлено выражение поиска товара

### Переменные:
- `removed_item` - теперь корректно сохраняет `advertisement_id`
- `ui.notifications.message` - корректно устанавливается
- `ui.notifications.actionLabel` - корректно устанавливается
- `ui.notifications.actionEvent` - корректно устанавливается

### UI компоненты:
- `section-cart-snackbar` - теперь корректно отображается при `message !== null`
- `conditional-snackbar` - условие срабатывает правильно

## 📊 Валидация

```bash
# Проверка JSON
cat src/pages/Sandbox/data/avitoDemo.json | jq empty
# ✅ JSON корректен

# Проверка ESLint
npx eslint src/pages/Sandbox/data/avitoDemo.json
# ✅ No errors found

# Статистика
wc -l src/pages/Sandbox/data/avitoDemo.json
# 1743 lines
```

## 🎯 Критерии приёмки

- [x] JSON валидируется без ошибок
- [x] Snackbar появляется при удалении товара
- [x] Текст snackbar корректный
- [x] Кнопка "Вернуть" отображается
- [x] Восстановление товара работает
- [x] Snackbar исчезает после восстановления
- [x] Количество товара восстанавливается правильно
- [x] Поле поиска использует `advertisement_id`

## 🔗 Связанная документация

- [avitoDemo-snackbar-undo-delete.md](./avitoDemo-snackbar-undo-delete.md) - полная спецификация
- [avitoDemo-snackbar-testing.md](./avitoDemo-snackbar-testing.md) - детальное тестирование
- [avitoDemo-snackbar-visual-guide.md](./avitoDemo-snackbar-visual-guide.md) - визуальный гайд
- [avitoDemo-snackbar-fix.md](./avitoDemo-snackbar-fix.md) - предыдущее исправление валидации

## 📝 Примечания

### Важно для разработки:
1. **Всегда используйте `advertisement_id`** для идентификации товаров в корзине
2. **Не используйте `id`** - это может быть internal ID из другой системы
3. **Проверяйте поля** в eventParams кнопок перед написанием выражений

### API эндпоинты:
- `DELETE /api/carts/3/advertisements/${id}` - использует `advertisement_id`
- `PATCH /api/carts/3/items/${id}` - использует `advertisement_id`

---

**Автор:** GitHub Copilot  
**Версия:** 1.0  
**Последнее обновление:** 19 октября 2025
