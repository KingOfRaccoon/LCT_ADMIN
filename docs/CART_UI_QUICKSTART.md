# 🚀 Быстрый старт: UI корзины Avito

## ⚡ За 5 минут

### 1️⃣ **Минимальный контекст для работы**

Скопируйте и вставьте в ваш контекст:

```javascript
{
  "cart_response": {
    "id": 3,
    "user_id": 4,
    "shop_groups": [
      {
        "shop_id": 1,
        "shop_name": "Pear Store",
        "rating": 4.8,
        "reviews_count": 643,
        "selected": true,
        "items": [
          {
            "advertisement_id": 101,
            "name": "Зарядка MagSafe Charger",
            "description": "15W 1 метр",
            "image": "https://via.placeholder.com/80",
            "price": 4990,
            "original_price": 5990,
            "discount_percent": 17,
            "quantity": 2,
            "selected": true
          }
        ]
      }
    ],
    "total_amount": 9980,
    "selected_items_count": 2,
    "total_items_count": 2
  },
  "suggested_products": [
    {
      "id": 10,
      "name": "Apple Watch 10",
      "price": 26591,
      "original_price": 27990,
      "image": "https://via.placeholder.com/60"
    }
  ],
  "ui": {
    "notifications": {
      "message": null,
      "actionLabel": null,
      "actionEvent": null
    }
  }
}
```

**Результат:** Полностью работающая корзина с товарами и скидкой! ✅

---

### 2️⃣ **Показать уведомление**

Измените `ui.notifications`:

```javascript
{
  "ui": {
    "notifications": {
      "message": "Товар удалён из корзины",
      "actionLabel": "Вернуть",
      "actionEvent": "undoRemoveItem"
    }
  }
}
```

**Результат:** Снэкбар появится внизу! 🔔

---

### 3️⃣ **Показать пустую корзину**

Очистите `shop_groups`:

```javascript
{
  "cart_response": {
    "shop_groups": [],
    "total_amount": 0,
    "selected_items_count": 0,
    "total_items_count": 0
  }
}
```

**Результат:** Empty State с иллюстрацией! 🛒

---

## 📋 Чек-лист готовности

### **Backend готов если:**
- [ ] API возвращает `cart_response.shop_groups[]`
- [ ] Каждый магазин имеет `rating` и `reviews_count`
- [ ] Каждый товар имеет `price`, `quantity`, `selected`
- [ ] (Опционально) Есть `original_price` для скидок

### **Frontend готов если:**
- [ ] `SandboxScreenRenderer` поддерживает `checkbox`
- [ ] `SandboxScreenRenderer` поддерживает `conditional`
- [ ] Обработчики событий подключены
- [ ] Контекст обновляется после API-запросов

---

## 🎯 Топ-5 фич для демо

### 1. **Скидки**
Добавьте `original_price` и `discount_percent`:
```javascript
{
  "price": 4990,
  "original_price": 5990,
  "discount_percent": 17
}
```
→ Красный бейдж `-17%` появится! 🏷️

### 2. **Снятие фокуса**
Установите `selected: false`:
```javascript
{
  "selected": false
}
```
→ Товар станет полупрозрачным! 👻

### 3. **Уведомление**
Покажите снэкбар:
```javascript
{
  "ui": {
    "notifications": {
      "message": "Успешно!",
      "actionLabel": "OK",
      "actionEvent": "closeNotification"
    }
  }
}
```
→ Красивый снэкбар внизу! 💬

### 4. **Рейтинг магазина**
Добавьте звездочку:
```javascript
{
  "shop_name": "Pear Store",
  "rating": 4.8,
  "reviews_count": 643
}
```
→ `⭐ 4.8 (643)` появится! ⭐

### 5. **Пустая корзина**
Очистите товары:
```javascript
{
  "shop_groups": []
}
```
→ Красивая заглушка! 🎨

---

## 🔧 Быстрые исправления

### **Проблема: Старая цена не показывается**
**Решение:** Проверьте условие:
```javascript
original_price > price  // Должно быть true
```

### **Проблема: Снэкбар не появляется**
**Решение:** Проверьте:
```javascript
ui.notifications.message !== null  // Должно быть true
```

### **Проблема: Неправильное склонение**
**Решение:** Используйте формулу:
```javascript
count === 1 ? 'товар' : (count >= 2 && count <= 4 ? 'товара' : 'товаров')
```

---

## 📊 Структура минимального API

### **GET /api/carts/{id}**

```json
{
  "id": 3,
  "shop_groups": [
    {
      "shop_id": 1,
      "shop_name": "Store Name",
      "rating": 4.8,
      "reviews_count": 643,
      "selected": true,
      "items": [
        {
          "advertisement_id": 101,
          "name": "Product Name",
          "image": "url",
          "price": 1000,
          "quantity": 1,
          "selected": true
        }
      ]
    }
  ],
  "total_amount": 1000,
  "selected_items_count": 1,
  "total_items_count": 1
}
```

---

## 🎨 Визуальная шпаргалка

### **Что показывается когда:**

| Условие | Что видно |
|---------|-----------|
| `shop_groups = []` | 🛒 Empty State |
| `shop_groups.length > 0` | 📦 Список товаров |
| `original_price > price` | ~~Старая цена~~ |
| `discount_percent > 0` | `-17%` бейдж |
| `notifications.message != null` | 💬 Снэкбар |
| `quantity = 1` | 🚫 Кнопка "−" disabled |
| `total_items_count = 0` | 🚫 Checkout disabled |
| `selected = false` | 👻 Opacity 0.5 |

---

## 🚀 3 команды для запуска

```bash
# 1. Откройте файл
open src/pages/Sandbox/data/avitoDemo.json

# 2. Запустите dev сервер
npm run dev

# 3. Откройте в браузере
open http://localhost:5173
```

---

## 📚 Документация

- **Полное описание:** `docs/CART_UI_IMPROVEMENTS.md`
- **Шпаргалка:** `docs/CART_UI_CHEATSHEET.md`
- **Тестовые данные:** `docs/CART_UI_TEST_DATA.md`
- **Сводка:** `docs/CART_UI_SUMMARY.md`

---

## ✅ Готово!

Теперь у вас есть:
- ✅ Pixel-perfect UI корзины
- ✅ Полная динамика из контекста
- ✅ Все состояния и события
- ✅ Документация и примеры

**Просто добавьте данные в контекст и всё заработает!** 🎉
