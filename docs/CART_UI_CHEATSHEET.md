# 🎨 Визуальная шпаргалка UI корзины

## 📦 Быстрый старт - Переменные контекста

### Минимальный набор для отображения корзины:

```javascript
// Основной контекст корзины
const context = {
  // 1. Данные корзины (приходят из API)
  cart_response: {
    id: 3,
    user_id: 4,
    shop_groups: [
      {
        shop_id: 1,
        shop_name: "Pear Store",
        rating: 4.8,
        reviews_count: 643,
        selected: true,
        items: [
          {
            advertisement_id: 101,
            name: "Зарядка MagSafe Charger 15W 1мётр",
            description: "Оригинал от Apple",
            image: "https://example.com/magsafe.jpg",
            price: 4990,
            original_price: 5990,        // Для показа скидки
            discount_percent: 17,         // Процент скидки
            quantity: 2,
            selected: true
          },
          {
            advertisement_id: 102,
            name: "AirPods Pro 2",
            description: "С активным шумоподавлением",
            image: "https://example.com/airpods.jpg",
            price: 15990,
            original_price: null,         // Нет скидки
            discount_percent: null,
            quantity: 1,
            selected: true
          }
        ]
      },
      {
        shop_id: 2,
        shop_name: "TECHNO ZONE",
        rating: 5.0,
        reviews_count: 916,
        selected: true,
        items: [
          {
            advertisement_id: 103,
            name: "iPhone 16 Pro, 256 ГБ",
            description: "Titanium Natural",
            image: "https://example.com/iphone.jpg",
            price: 99990,
            original_price: null,
            discount_percent: null,
            quantity: 1,
            selected: true
          }
        ]
      }
    ],
    total_amount: 120970,
    selected_items_count: 3,
    total_items_count: 3
  },

  // 2. Рекомендуемые товары
  suggested_products: [
    {
      id: 10,
      name: "Apple Watch 10 256Gb",
      price: 26591,
      original_price: 27990,
      image: "https://example.com/watch.jpg"
    },
    {
      id: 11,
      name: "iPhone 16 Pro 256Gb",
      price: 99990,
      original_price: null,
      image: "https://example.com/iphone.jpg"
    }
  ],

  // 3. UI состояние (для уведомлений)
  ui: {
    notifications: {
      message: null,              // "Товар удалён из корзины"
      actionLabel: null,          // "Вернуть"
      actionEvent: null           // "undoRemoveItem"
    }
  },

  // 4. Вспомогательные переменные (опционально)
  selected_item_id: null,
  quantity_change: 1
};
```

---

## 🎯 Визуальные состояния

### 1️⃣ **Корзина с товарами**

```
┌────────────────────────────────────────┐
│ ← Корзина                              │
├────────────────────────────────────────┤
│ ☑ Выбрать всё  Удалить (3)            │
├────────────────────────────────────────┤
│                                        │
│ ☑ Pear Store ⭐ 4.8 (643)            │
│ ┌──────────────────────────────────┐ │
│ │ [IMG] Зарядка MagSafe...    🗑 ☑│ │
│ │       4 990 ₽ 5 990 ₽ -17%      │ │
│ │       Купить с доставкой  [- 2 +]│ │
│ └──────────────────────────────────┘ │
│                                        │
│ ☑ TECHNO ZONE ⭐ 5.0 (916)           │
│ ┌──────────────────────────────────┐ │
│ │ [IMG] iPhone 16 Pro...      🗑 ☑│ │
│ │       99 990 ₽                   │ │
│ │       Купить с доставкой  [- 1 +]│ │
│ └──────────────────────────────────┘ │
│                                        │
│ ──────────────────────────────────── │
│ Добавьте ещё 1 товар до скидки 5%    │
│ ┌──────────────────────────────────┐ │
│ │ [IMG] Apple Watch...  [В корзину]│ │
│ │       26 591 ₽ 27 990 ₽          │ │
│ └──────────────────────────────────┘ │
│                                        │
├────────────────────────────────────────┤
│ 3 товара            Выбрано: 3        │
│ 120 970 ₽                             │
│ ┌──────────────────────────────────┐ │
│ │   Оформить доставку               │ │
│ └──────────────────────────────────┘ │
└────────────────────────────────────────┘
```

---

### 2️⃣ **Пустая корзина**

```
┌────────────────────────────────────────┐
│ ← Корзина                              │
├────────────────────────────────────────┤
│                                        │
│                                        │
│              🛒                        │
│                                        │
│        В корзине пусто                 │
│   Добавьте товары из каталога          │
│                                        │
│                                        │
├────────────────────────────────────────┤
│ 0 товаров             Выбрано: 0      │
│ 0 ₽                                    │
│ ┌──────────────────────────────────┐ │
│ │   Оформить доставку (disabled)    │ │
│ └──────────────────────────────────┘ │
└────────────────────────────────────────┘
```

---

### 3️⃣ **Уведомление (Снэкбар)**

```
┌────────────────────────────────────────┐
│                ... корзина ...         │
│                                        │
│  ┌─────────────────────────────────┐  │
│  │ Товар удалён из корзины  Вернуть│  │
│  └─────────────────────────────────┘  │
│                                        │
│ ┌──────────────────────────────────┐ │
│ │   Оформить доставку               │ │
│ └──────────────────────────────────┘ │
└────────────────────────────────────────┘
```

---

## 🎨 Примеры визуальных элементов

### **Цена со скидкой:**

```
┌─────────────────────────────┐
│ 4 990 ₽  5 990 ₽  -17%     │
│   (жирн)  (зачерк) (красн)  │
└─────────────────────────────┘
```

**Переменные:**
- `product.price` = 4990
- `product.original_price` = 5990
- `product.discount_percent` = 17

---

### **Рейтинг магазина:**

```
⭐ 4.8 (643)
```

**Переменные:**
- `shop.rating` = 4.8
- `shop.reviews_count` = 643

---

### **Склонение товаров:**

| Количество | Текст |
|------------|-------|
| 1 | `1 товар` |
| 2 | `2 товара` |
| 3 | `3 товара` |
| 4 | `4 товара` |
| 5 | `5 товаров` |
| 21 | `21 товар` |

**Логика:**
```javascript
`${count} ${count === 1 ? 'товар' : (count >= 2 && count <= 4 ? 'товара' : 'товаров')}`
```

---

## 🔄 События и их параметры

### **Управление выбором:**

```javascript
// Выбрать всё / Снять всё
{
  event: "toggleSelectAll"
}

// Выбрать магазин
{
  event: "toggleShopSelection",
  eventParams: {
    shop_id: 1
  }
}

// Выбрать товар (чекбокс)
{
  event: "toggleFocus",
  eventParams: {
    selected_item_id: 101
  }
}
```

---

### **Управление количеством:**

```javascript
// Увеличить
{
  event: "increaseQuantity",
  eventParams: {
    selected_item_id: 101,
    quantity_change: 2  // Текущее количество
  }
}

// Уменьшить
{
  event: "decreaseQuantity",
  eventParams: {
    selected_item_id: 101,
    quantity_change: 2
  }
}
```

---

### **Удаление:**

```javascript
// Удалить один товар
{
  event: "removeItem",
  eventParams: {
    selected_item_id: 101
  }
}

// Удалить выбранные
{
  event: "deleteSelected"
}
```

---

### **Добавление:**

```javascript
// Добавить из рекомендаций
{
  event: "addToCart",
  eventParams: {
    advertisement_id: 10
  }
}

// Купить с доставкой
{
  event: "buyWithDelivery",
  eventParams: {
    product_id: 101
  }
}
```

---

### **Оформление:**

```javascript
// Перейти к оформлению
{
  event: "checkout"
}
```

---

## 📱 Пример полного flow

### **Сценарий: Удаление товара**

**1. Пользователь кликает 🗑️**
```javascript
event: "removeItem"
eventParams: { selected_item_id: 101 }
```

**2. Backend удаляет товар и обновляет контекст:**
```javascript
cart_response.total_items_count = 2  // Было 3
cart_response.total_amount = 115980  // Пересчитано

ui.notifications = {
  message: "Товар удалён из корзины",
  actionLabel: "Вернуть",
  actionEvent: "undoRemoveItem"
}
```

**3. UI автоматически:**
- Скрывает карточку товара
- Обновляет "3 товара" → "2 товара"
- Обновляет сумму 120970₽ → 115980₽
- Показывает снэкбар с кнопкой "Вернуть"

**4. Если пользователь кликает "Вернуть":**
```javascript
event: "undoRemoveItem"
```

**5. Backend восстанавливает товар:**
```javascript
ui.notifications = {
  message: null,
  actionLabel: null,
  actionEvent: null
}
```

**6. UI автоматически:**
- Скрывает снэкбар
- Показывает товар обратно
- Обновляет счетчики

---

## 🎯 Чек-лист для backend разработчика

### ✅ **Обязательные поля API:**

**GET /api/carts/{id}/with-advertisements**
```json
{
  "id": number,
  "user_id": number,
  "shop_groups": [
    {
      "shop_id": number,             // ✅ Обязательно
      "shop_name": string,            // ✅ Обязательно
      "rating": float,                // ✅ Обязательно
      "reviews_count": number,        // ✅ Обязательно
      "selected": boolean,            // ✅ Обязательно
      "items": [
        {
          "advertisement_id": number, // ✅ Обязательно
          "name": string,             // ✅ Обязательно
          "description": string,      // ⚠️ Может быть пустым
          "image": string,            // ✅ Обязательно
          "price": number,            // ✅ Обязательно
          "original_price": number,   // ⚪ Опционально (для скидок)
          "discount_percent": number, // ⚪ Опционально (для скидок)
          "quantity": number,         // ✅ Обязательно
          "selected": boolean         // ✅ Обязательно
        }
      ]
    }
  ],
  "total_amount": number,             // ✅ Обязательно
  "selected_items_count": number,     // ✅ Обязательно
  "total_items_count": number         // ✅ Обязательно
}
```

---

## 🚀 Готово к использованию!

Все UI элементы настроены и готовы работать с реальными данными из backend.

**Что делает UI автоматически:**
✅ Показывает/скрывает элементы
✅ Правильно склоняет слова
✅ Отображает скидки
✅ Показывает уведомления
✅ Блокирует кнопки когда нужно
✅ Пересчитывает итоги

**Просто передайте данные в контекст и UI отобразит всё правильно!** 🎨
