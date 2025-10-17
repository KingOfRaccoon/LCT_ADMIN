# Унификация API корзины

## Дата: 17 октября 2025

## Цель изменений

Объединение двух идентичных интеграционных узлов (`fetch-products` и `refresh-cart-items`) в один и переход на единый API для получения корзины с товарами.

## Изменения

### 1. Объединение интеграционных узлов

**Было:**
- `fetch-products` - начальная загрузка товаров из `/api/advertisements/owner/14`
- `refresh-cart-items` - обновление после добавления в корзину (тот же API)

**Стало:**
- `fetch-cart-items` - единый узел для загрузки/обновления корзины

### 2. Новый API endpoint

**Старый API:**
```
GET https://sandkittens.me/backservices/api/advertisements/owner/14
Ответ: Array<Advertisement>
```

**Новый API:**
```
GET https://sandkittens.me/backservices/api/carts/3/with-advertisements
Ответ: Cart (с вложенными advertisements)
```

### 3. Схема данных

**Новая структура ответа:**
```json
{
  "id": 3,
  "user_id": 14,
  "advertisements": [
    {
      "id": 3,
      "name": "Зарядка MagSafe Charger 15W 1 метр",
      "description": "Оригинальная магнитная зарядка для iPhone с поддержкой быстрой зарядки 15W",
      "owner_id": 14,
      "owner_name": "Екатерина Батюшкова"
    },
    ...
  ]
}
```

### 4. Обновление variableSchemas

**Было:**
```json
"products_response": {
  "type": "array",
  "schema": { ... }
}
```

**Стало:**
```json
"cart_response": {
  "type": "object",
  "schema": {
    "id": "number",
    "user_id": "number",
    "advertisements": "array"
  }
}
```

### 5. Обновление initialContext

**Было:**
```json
"cart": {
  "id": 3,
  "items": [],
  "selectedCount": 0,
  "totalPrice": 0
},
"products_response": []
```

**Стало:**
```json
"cart_response": {
  "id": 3,
  "user_id": 14,
  "advertisements": []
}
```

### 6. Обновление dataSource в UI

**Было:**
```json
"dataSource": {
  "reference": "${products_response}",
  "value": []
}
```

**Стало:**
```json
"dataSource": {
  "reference": "${cart_response.advertisements}",
  "value": []
}
```

## Архитектура узлов

### До изменений
```
[fetch-products]
   ↓
[cart-main]
   ↓ (addToCart)
[add-to-cart-integration]
   ↓
[refresh-cart-items]  ← Дубликат!
   ↓
[cart-main]
```

### После изменений
```
[fetch-cart-items]
   ↓
[cart-main]
   ↓ (addToCart)
[add-to-cart-integration]
   ↓
[fetch-cart-items]  ← Переиспользование!
   ↓
[cart-main]
```

## Преимущества

### 1. DRY принцип
- ✅ Один узел вместо двух идентичных
- ✅ Меньше кода для поддержки

### 2. Корректная семантика
- ✅ Получаем данные корзины, а не просто список товаров владельца
- ✅ API точно отражает бизнес-логику (корзина конкретного пользователя)

### 3. Расширяемость
- ✅ Теперь доступны `cart.id` и `cart.user_id` из ответа
- ✅ Можно добавить дополнительные поля корзины (totalPrice, selectedCount)

### 4. Консистентность данных
- ✅ Одна точка получения данных
- ✅ Гарантированная актуальность после операций

## Техническая документация

### Узел: fetch-cart-items

```json
{
  "id": "fetch-cart-items",
  "label": "Загрузка товаров корзины",
  "type": "integration",
  "state_type": "integration",
  "start": true,
  "description": "Загружает корзину с товарами пользователя",
  "expressions": [
    {
      "variable": "cart_response",
      "url": "https://sandkittens.me/backservices/api/carts/3/with-advertisements",
      "params": {},
      "method": "get",
      "metadata": {
        "description": "Получает корзину с ID 3 и все товары в ней",
        "category": "data",
        "tags": ["integration", "api", "cart", "advertisements"]
      }
    }
  ],
  "transitions": [
    {
      "variable": "cart_response",
      "case": null,
      "state_id": "cart-main"
    }
  ]
}
```

### Обновленный переход после добавления в корзину

```json
{
  "id": "add-to-cart-integration",
  ...
  "transitions": [
    {
      "variable": "add_to_cart_response",
      "case": null,
      "state_id": "fetch-cart-items"  // Было: "refresh-cart-items"
    }
  ]
}
```

## Миграция

### Что изменилось в коде

1. **Удалена переменная:** `products_response`
2. **Добавлена переменная:** `cart_response`
3. **Удален узел:** `refresh-cart-items`
4. **Переименован узел:** `fetch-products` → `fetch-cart-items`
5. **Обновлены ссылки:** `${products_response}` → `${cart_response.advertisements}`

### Обратная совместимость

⚠️ **Breaking changes:**
- Все компоненты, использующие `products_response`, должны быть обновлены
- URL изменен с `/advertisements/owner/:id` на `/carts/:id/with-advertisements`

## Тестирование

### Сценарий 1: Начальная загрузка
1. Открыть `/sandbox`
2. ✅ Должна загрузиться корзина с товарами
3. ✅ Отображаются все товары из `cart_response.advertisements`

### Сценарий 2: Добавление товара
1. Нажать "Добавить товар в корзину"
2. ✅ POST запрос выполняется успешно
3. ✅ Автоматически вызывается `fetch-cart-items`
4. ✅ Список обновляется с новым товаром

### Сценарий 3: Консистентность данных
1. Проверить, что `cart_response.id === 3`
2. Проверить, что `cart_response.user_id === 14`
3. Проверить, что массив `advertisements` содержит правильные данные

## API Reference

### GET /carts/{cart_id}/with-advertisements

**Параметры:**
- `cart_id` (path): ID корзины (3)

**Ответ:** `200 OK`
```json
{
  "id": 3,
  "user_id": 14,
  "advertisements": [
    {
      "id": 3,
      "name": "string",
      "description": "string",
      "owner_id": 14,
      "owner_name": "string"
    }
  ]
}
```

**Примеры товаров в ответе:**
- ID 3-6: товары владельца "Екатерина Батюшкова" (owner_id: 14)
- ID 7-8: товары владельца "TECHNO ZONE" (owner_id: 16)

## Следующие шаги

### Краткосрочные
- [ ] Протестировать в браузере полный флоу
- [ ] Убедиться, что товары отображаются корректно
- [ ] Проверить переход после добавления в корзину

### Среднесрочные
- [ ] Использовать `cart_response.id` для динамических запросов
- [ ] Добавить отображение `totalPrice` и `selectedCount` из API
- [ ] Реализовать удаление товаров из корзины

### Долгосрочные
- [ ] Множественные корзины для разных пользователей
- [ ] Кэширование данных корзины
- [ ] Optimistic UI updates

## Бонусы

### Чистота архитектуры
```
Before: 5 nodes (2 duplicates)
After:  4 nodes (0 duplicates)
Reduction: 20%
```

### Семантическая ясность
- API endpoint явно указывает на бизнес-сущность (корзина)
- Структура данных соответствует предметной области
- Код легче понимать новым разработчикам
