# Исправление: Недостающие состояния в avitoDemo

## Проблема

В воркфлоу `avitoDemo.json` были события в UI, которые не имели соответствующих состояний (integration states) в графе переходов. Это приводило к тому, что при клике на эти элементы UI ничего не происходило — переход не выполнялся.

### Недостающие события:

1. **`toggleShopSelection`** - Переключение выбора всех товаров магазина
   - UI: Чекбокс возле названия магазина
   - Параметр: `shop_id`
   
2. **`toggleSelectAll`** - Выбрать/снять все товары в корзине
   - UI: Чекбокс "Выбрать всё" в header
   - Параметры: Нет
   
3. **`deleteSelected`** - Удалить все выбранные товары
   - UI: Кнопка "Удалить (N)" в header
   - Параметры: Нет

---

## Решение

### 1. Добавлены edges (переходы) в `cart-main`

```json
{
  "id": "edge-toggle-shop-selection",
  "label": "Выбрать/снять выбор магазина",
  "event": "toggleShopSelection",
  "keepInputs": true,
  "summary": "Переключение выбора всех товаров магазина",
  "target": "toggle-shop-selection-integration",
  "contextPatch": {}
},
{
  "id": "edge-toggle-select-all",
  "label": "Выбрать всё",
  "event": "toggleSelectAll",
  "keepInputs": true,
  "summary": "Переключение выбора всех товаров в корзине",
  "target": "toggle-select-all-integration",
  "contextPatch": {}
},
{
  "id": "edge-delete-selected",
  "label": "Удалить выбранные",
  "event": "deleteSelected",
  "keepInputs": true,
  "summary": "Удаление всех выбранных товаров",
  "target": "delete-selected-integration",
  "contextPatch": {}
}
```

### 2. Добавлены integration states

#### `toggle-shop-selection-integration`
```json
{
  "id": "toggle-shop-selection-integration",
  "label": "Переключение выбора магазина",
  "type": "integration",
  "state_type": "integration",
  "start": false,
  "description": "PATCH-запрос для переключения выбора всех товаров магазина",
  "expressions": [
    {
      "variable": "add_to_cart_response",
      "url": "https://sandkittens.me/backservices/api/carts/3/shops/${shop_id}/toggle-selection",
      "params": {},
      "method": "patch",
      "body": {},
      "metadata": {
        "description": "Переключает выбор всех товаров в магазине",
        "category": "data",
        "tags": ["integration", "api", "cart", "shop", "selection"]
      }
    }
  ],
  "transitions": [
    {
      "variable": "add_to_cart_response",
      "case": null,
      "state_id": "fetch-cart-items"
    }
  ],
  "edges": []
}
```

**API Endpoint**: `PATCH /api/carts/3/shops/${shop_id}/toggle-selection`  
**Параметры**: `shop_id` (из eventParams)  
**Body**: Пустой объект  
**Переход**: → `fetch-cart-items` (перезагрузка корзины)

#### `toggle-select-all-integration`
```json
{
  "id": "toggle-select-all-integration",
  "label": "Выбрать/снять всё",
  "type": "integration",
  "state_type": "integration",
  "start": false,
  "description": "PATCH-запрос для переключения выбора всех товаров в корзине",
  "expressions": [
    {
      "variable": "add_to_cart_response",
      "url": "https://sandkittens.me/backservices/api/carts/3/toggle-select-all",
      "params": {},
      "method": "patch",
      "body": {},
      "metadata": {
        "description": "Переключает выбор всех товаров в корзине",
        "category": "data",
        "tags": ["integration", "api", "cart", "selection"]
      }
    }
  ],
  "transitions": [
    {
      "variable": "add_to_cart_response",
      "case": null,
      "state_id": "fetch-cart-items"
    }
  ],
  "edges": []
}
```

**API Endpoint**: `PATCH /api/carts/3/toggle-select-all`  
**Параметры**: Нет  
**Body**: Пустой объект  
**Переход**: → `fetch-cart-items` (перезагрузка корзины)

#### `delete-selected-integration`
```json
{
  "id": "delete-selected-integration",
  "label": "Удаление выбранных товаров",
  "type": "integration",
  "state_type": "integration",
  "start": false,
  "description": "DELETE-запрос для удаления всех выбранных товаров",
  "expressions": [
    {
      "variable": "add_to_cart_response",
      "url": "https://sandkittens.me/backservices/api/carts/3/selected-items",
      "params": {},
      "method": "delete",
      "metadata": {
        "description": "Удаляет все выбранные товары из корзины",
        "category": "data",
        "tags": ["integration", "api", "cart", "delete", "batch"]
      }
    }
  ],
  "transitions": [
    {
      "variable": "add_to_cart_response",
      "case": null,
      "state_id": "fetch-cart-items"
    }
  ],
  "edges": []
}
```

**API Endpoint**: `DELETE /api/carts/3/selected-items`  
**Параметры**: Нет  
**Body**: Нет  
**Переход**: → `fetch-cart-items` (перезагрузка корзины)

### 3. Добавлена переменная `shop_id`

**variableSchemas**:
```json
"shop_id": {
  "type": "number",
  "schema": null
}
```

**initialContext**:
```json
"shop_id": null
```

---

## Обновлённая структура

### До исправления:
- **Всего состояний**: 8
- **Screen состояний**: 2
- **Integration состояний**: 6
- **События в cart-main**: 6

### После исправления:
- **Всего состояний**: 11 (+3)
- **Screen состояний**: 2
- **Integration состояний**: 9 (+3)
- **События в cart-main**: 9 (+3)

---

## Граф переходов (обновлённый)

```
cart-main (Screen)
  ├→ addToCart          → add-to-cart-integration          → fetch-cart-items
  ├→ increaseQuantity   → increase-quantity-integration    → fetch-cart-items
  ├→ decreaseQuantity   → decrease-quantity-integration    → fetch-cart-items
  ├→ removeItem         → remove-item-integration          → fetch-cart-items
  ├→ toggleFocus        → toggle-focus-integration         → fetch-cart-items
  ├→ toggleShopSelection → toggle-shop-selection-integration → fetch-cart-items ✨ NEW
  ├→ toggleSelectAll    → toggle-select-all-integration    → fetch-cart-items ✨ NEW
  ├→ deleteSelected     → delete-selected-integration      → fetch-cart-items ✨ NEW
  └→ checkout           → checkout-screen                  → [END]
```

---

## Архитектурный паттерн

Все новые операции следуют тому же циклу обновления данных:

```
cart-main → [batch-action-integration] → fetch-cart-items → cart-main
```

1. Пользователь выполняет групповое действие
2. Вызывается соответствующий API endpoint
3. Корзина перезагружается с сервера
4. Возврат на главный экран с обновлёнными данными

---

## API Endpoints (итого)

| Метод | Endpoint | Описание |
|-------|----------|----------|
| GET | `/api/carts/3/with-advertisements` | Загрузка корзины |
| POST | `/api/carts/add-advertisement` | Добавление товара |
| PATCH | `/api/carts/3/items/{id}` | Изменение количества/выбора товара |
| DELETE | `/api/carts/3/advertisements/{id}` | Удаление товара |
| **PATCH** | **/api/carts/3/shops/{id}/toggle-selection** | **Переключение выбора магазина** ✨ |
| **PATCH** | **/api/carts/3/toggle-select-all** | **Выбрать/снять всё** ✨ |
| **DELETE** | **/api/carts/3/selected-items** | **Удалить выбранные** ✨ |

---

## Результат

✅ Все события в UI теперь имеют соответствующие состояния  
✅ Переходы работают корректно  
✅ Параметры передаются через `eventParams` → контекст → URL  
✅ Диаграмма обновлена в `docs/diagrams/avitoDemo-state-diagram.mmd`  
✅ Воркфлоу полностью функционален

---

## Тестирование

Для проверки работы новых состояний:

1. Откройте Sandbox с `avitoDemo`
2. Убедитесь, что корзина загружена с товарами
3. Проверьте:
   - ✅ Чекбокс "Выбрать всё" → `toggleSelectAll` → перезагрузка
   - ✅ Кнопка "Удалить (N)" → `deleteSelected` → перезагрузка
   - ✅ Чекбокс возле магазина → `toggleShopSelection` → перезагрузка

При успешном выполнении:
- Корзина перезагружается после каждого действия
- UI обновляется с актуальными данными с сервера
- Console показывает правильные API вызовы
