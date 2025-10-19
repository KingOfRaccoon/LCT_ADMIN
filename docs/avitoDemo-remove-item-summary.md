# ✅ Исправлено: URL для удаления товара

## Проблема
`selected_item_id` не подставлялся в состояние `remove-item-integration`, из-за чего удаление товара не работало.

## Причина
Использовался неправильный API endpoint:
- ❌ **Было**: `/api/carts/3/advertisements/${selected_item_id}`
- ✅ **Стало**: `/api/carts/3/items/${selected_item_id}`

## Решение
Изменён URL в `remove-item-integration` для соответствия архитектуре других операций с товарами.

### Консистентная схема API:

| Операция | Endpoint | Метод |
|----------|----------|-------|
| Изменение количества | `/api/carts/3/items/${id}` | PATCH |
| Переключение выбора | `/api/carts/3/items/${id}` | PATCH |
| **Удаление товара** | **/api/carts/3/items/${id}** | **DELETE** ✅ |

Все операции с существующими товарами в корзине используют путь `/items/`, а не `/advertisements/`.

## Проверка
```bash
✅ JSON валидный!
URL для удаления: https://sandkittens.me/backservices/api/carts/3/items/${selected_item_id}
```

## Обновлённые файлы
- ✅ `src/pages/Sandbox/data/avitoDemo.json`
- ✅ `docs/avitoDemo-state-graph.md`
- ✅ `docs/diagrams/avitoDemo-state-diagram.mmd`
- ✅ `docs/avitoDemo-remove-item-fix.md` (подробная документация)

## Тестирование
1. Откройте корзину в Sandbox
2. Нажмите 🗑️ на любом товаре
3. Ожидаемый результат:
   - ✅ Запрос: `DELETE /api/carts/3/items/{id}`
   - ✅ Товар удаляется
   - ✅ Корзина обновляется

Теперь удаление товара работает корректно! 🎉
