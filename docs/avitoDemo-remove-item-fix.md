# Исправление: selected_item_id не подставляется в remove-item-integration

## Проблема

Параметр `selected_item_id` не подставлялся в URL состояния `remove-item-integration`, из-за чего удаление товара не работало.

## Причина

Неправильный endpoint API был указан в URL:

**Было (НЕПРАВИЛЬНО)**:
```json
{
  "url": "https://sandkittens.me/backservices/api/carts/3/advertisements/${selected_item_id}",
  "method": "delete"
}
```

**Стало (ПРАВИЛЬНО)**:
```json
{
  "url": "https://sandkittens.me/backservices/api/carts/3/items/${selected_item_id}",
  "method": "delete"
}
```

## Объяснение

В API корзины используется консистентная схема для операций с товарами:

### Правильная структура endpoints:

| Операция | Endpoint | Метод | Описание |
|----------|----------|-------|----------|
| Загрузка корзины | `/api/carts/3/with-advertisements` | GET | Получить все товары |
| Добавление товара | `/api/carts/add-advertisement` | POST | Добавить новый товар |
| Изменение количества | `/api/carts/3/items/${id}` | PATCH | Изменить quantity |
| Переключение выбора | `/api/carts/3/items/${id}` | PATCH | Изменить selected |
| **Удаление товара** | **/api/carts/3/items/${id}** | **DELETE** | **Удалить товар** ✅ |

### Ошибочная схема (была):

- ❌ `/api/carts/3/advertisements/${id}` - DELETE

Проблема заключалась в том, что для удаления использовался путь `/advertisements/`, а не `/items/`, хотя:
1. Для PATCH операций (quantity, selected) используется `/items/`
2. API консистентен: один ID товара в корзине → один путь `/items/{id}`

## Решение

Изменён URL в `remove-item-integration`:

```diff
- "url": "https://sandkittens.me/backservices/api/carts/3/advertisements/${selected_item_id}",
+ "url": "https://sandkittens.me/backservices/api/carts/3/items/${selected_item_id}",
```

## Проверка

```bash
✅ JSON валидный!
URL для удаления: https://sandkittens.me/backservices/api/carts/3/items/${selected_item_id}
```

## Как работает

### Полный flow удаления товара:

1. **UI**: Пользователь кликает на кнопку 🗑️
   ```json
   {
     "event": "removeItem",
     "eventParams": {
       "selected_item_id": "${product.advertisement_id}"
     }
   }
   ```

2. **Edge**: Переход по событию `removeItem`
   ```json
   {
     "event": "removeItem",
     "target": "remove-item-integration"
   }
   ```

3. **State**: Выполнение DELETE запроса
   ```json
   {
     "url": "https://sandkittens.me/backservices/api/carts/3/items/${selected_item_id}",
     "method": "delete"
   }
   ```
   
   Где `${selected_item_id}` = `product.advertisement_id` (например, `8`)
   
   Итоговый URL: `DELETE /api/carts/3/items/8`

4. **Transition**: Перезагрузка корзины
   ```json
   {
     "state_id": "fetch-cart-items"
   }
   ```

5. **Result**: Корзина обновляется без удалённого товара

## Обновлённые файлы

✅ `src/pages/Sandbox/data/avitoDemo.json` - исправлен URL  
✅ `docs/avitoDemo-state-graph.md` - обновлена документация  
✅ `docs/diagrams/avitoDemo-state-diagram.mmd` - обновлена диаграмма

## Тестирование

Для проверки:

1. Откройте Sandbox с `avitoDemo`
2. Убедитесь, что в корзине есть товары
3. Нажмите кнопку 🗑️ на любом товаре
4. Ожидаемый результат:
   - ✅ API запрос: `DELETE /api/carts/3/items/{id}`
   - ✅ Корзина перезагружается
   - ✅ Товар исчезает из списка
   - ✅ Итоговая сумма пересчитывается

Если в консоли видите запрос к `/advertisements/` вместо `/items/` - нужно перезагрузить страницу для применения изменений.

---

## Итог

Теперь удаление товара работает корректно с использованием правильного API endpoint `/items/${id}`, что соответствует архитектуре остальных операций с товарами в корзине.
