# 🧪 Тестовые данные для UI корзины

## 📦 Примеры контекста для разных состояний

### 1️⃣ **Полная корзина с товарами и скидками**

```json
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
            "name": "Зарядка MagSafe Charger 15W 1мётр",
            "description": "Оригинальная зарядка от Apple",
            "image": "https://via.placeholder.com/80",
            "price": 4990,
            "original_price": 5990,
            "discount_percent": 17,
            "quantity": 2,
            "selected": true
          },
          {
            "advertisement_id": 102,
            "name": "AirPods Pro 2",
            "description": "С активным шумоподавлением",
            "image": "https://via.placeholder.com/80",
            "price": 15990,
            "original_price": 16990,
            "discount_percent": 6,
            "quantity": 1,
            "selected": true
          }
        ]
      },
      {
        "shop_id": 2,
        "shop_name": "TECHNO ZONE",
        "rating": 5.0,
        "reviews_count": 916,
        "selected": true,
        "items": [
          {
            "advertisement_id": 103,
            "name": "iPhone 16 Pro, 256 ГБ",
            "description": "Titanium Natural",
            "image": "https://via.placeholder.com/80",
            "price": 99990,
            "original_price": null,
            "discount_percent": null,
            "quantity": 1,
            "selected": true
          }
        ]
      }
    ],
    "total_amount": 125970,
    "selected_items_count": 4,
    "total_items_count": 4
  },
  "suggested_products": [
    {
      "id": 10,
      "name": "Apple Watch 10 256Gb",
      "price": 26591,
      "original_price": 27990,
      "image": "https://via.placeholder.com/60"
    },
    {
      "id": 11,
      "name": "iPhone 16 Pro 256Gb",
      "price": 99990,
      "original_price": null,
      "image": "https://via.placeholder.com/60"
    }
  ],
  "ui": {
    "notifications": {
      "message": null,
      "actionLabel": null,
      "actionEvent": null
    }
  },
  "selected_item_id": null,
  "quantity_change": 1
}
```

---

### 2️⃣ **Корзина с частично снятым фокусом**

```json
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
        "selected": false,
        "items": [
          {
            "advertisement_id": 101,
            "name": "Зарядка MagSafe Charger 15W 1мётр",
            "description": "Оригинальная зарядка от Apple",
            "image": "https://via.placeholder.com/80",
            "price": 4990,
            "original_price": null,
            "discount_percent": null,
            "quantity": 2,
            "selected": false
          },
          {
            "advertisement_id": 102,
            "name": "AirPods Pro 2",
            "description": "С активным шумоподавлением",
            "image": "https://via.placeholder.com/80",
            "price": 15990,
            "original_price": null,
            "discount_percent": null,
            "quantity": 1,
            "selected": false
          }
        ]
      },
      {
        "shop_id": 2,
        "shop_name": "TECHNO ZONE",
        "rating": 5.0,
        "reviews_count": 916,
        "selected": true,
        "items": [
          {
            "advertisement_id": 103,
            "name": "iPhone 16 Pro, 256 ГБ",
            "description": "Titanium Natural",
            "image": "https://via.placeholder.com/80",
            "price": 99990,
            "original_price": null,
            "discount_percent": null,
            "quantity": 1,
            "selected": true
          }
        ]
      }
    ],
    "total_amount": 99990,
    "selected_items_count": 1,
    "total_items_count": 4
  },
  "suggested_products": [
    {
      "id": 10,
      "name": "Apple Watch 10 256Gb",
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

**Визуальный эффект:**
- Товары Pear Store имеют `opacity: 0.5`
- Чекбоксы Pear Store показывают ⬜
- Итого: только 99 990 ₽ (iPhone)
- Выбрано: 1

---

### 3️⃣ **Пустая корзина**

```json
{
  "cart_response": {
    "id": 3,
    "user_id": 4,
    "shop_groups": [],
    "total_amount": 0,
    "selected_items_count": 0,
    "total_items_count": 0
  },
  "suggested_products": [
    {
      "id": 10,
      "name": "Apple Watch 10 256Gb",
      "price": 26591,
      "original_price": 27990,
      "image": "https://via.placeholder.com/60"
    },
    {
      "id": 11,
      "name": "iPhone 16 Pro 256Gb",
      "price": 99990,
      "original_price": null,
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

**Визуальный эффект:**
- Показывается Empty State с иллюстрацией 🛒
- "В корзине пусто"
- "Добавьте товары из каталога"
- Кнопка "Оформить доставку" disabled

---

### 4️⃣ **Уведомление об удалении**

```json
{
  "cart_response": {
    "id": 3,
    "user_id": 4,
    "shop_groups": [
      {
        "shop_id": 2,
        "shop_name": "TECHNO ZONE",
        "rating": 5.0,
        "reviews_count": 916,
        "selected": true,
        "items": [
          {
            "advertisement_id": 103,
            "name": "iPhone 16 Pro, 256 ГБ",
            "description": "Titanium Natural",
            "image": "https://via.placeholder.com/80",
            "price": 99990,
            "original_price": null,
            "discount_percent": null,
            "quantity": 1,
            "selected": true
          }
        ]
      }
    ],
    "total_amount": 99990,
    "selected_items_count": 1,
    "total_items_count": 1
  },
  "suggested_products": [],
  "ui": {
    "notifications": {
      "message": "Товар удалён из корзины",
      "actionLabel": "Вернуть",
      "actionEvent": "undoRemoveItem"
    }
  }
}
```

**Визуальный эффект:**
- Снэкбар появляется внизу экрана (над кнопкой checkout)
- Темный фон `#2F3034`
- Белый текст: "Товар удалён из корзины"
- Фиолетовая кнопка: "Вернуть"

---

### 5️⃣ **Уведомление об ошибке (без кнопки действия)**

```json
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
            "name": "Зарядка MagSafe Charger 15W 1мётр",
            "description": "Оригинальная зарядка от Apple",
            "image": "https://via.placeholder.com/80",
            "price": 4990,
            "original_price": null,
            "discount_percent": null,
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
  "suggested_products": [],
  "ui": {
    "notifications": {
      "message": "Не удалось добавить товар в корзину",
      "actionLabel": null,
      "actionEvent": null
    }
  }
}
```

**Визуальный эффект:**
- Снэкбар без кнопки действия
- Только текст ошибки

---

### 6️⃣ **Один товар (проверка склонения)**

```json
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
            "name": "AirPods Pro 2",
            "description": "С активным шумоподавлением",
            "image": "https://via.placeholder.com/80",
            "price": 15990,
            "original_price": null,
            "discount_percent": null,
            "quantity": 1,
            "selected": true
          }
        ]
      }
    ],
    "total_amount": 15990,
    "selected_items_count": 1,
    "total_items_count": 1
  },
  "suggested_products": [],
  "ui": {
    "notifications": {
      "message": null,
      "actionLabel": null,
      "actionEvent": null
    }
  }
}
```

**Визуальный эффект:**
- Footer показывает: "1 товар" (не "товаров")
- Кнопка "−" disabled (quantity = 1)

---

### 7️⃣ **Пять товаров (склонение "товаров")**

```json
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
            "name": "Товар 1",
            "description": "",
            "image": "https://via.placeholder.com/80",
            "price": 1000,
            "original_price": null,
            "discount_percent": null,
            "quantity": 1,
            "selected": true
          },
          {
            "advertisement_id": 102,
            "name": "Товар 2",
            "description": "",
            "image": "https://via.placeholder.com/80",
            "price": 1000,
            "original_price": null,
            "discount_percent": null,
            "quantity": 1,
            "selected": true
          },
          {
            "advertisement_id": 103,
            "name": "Товар 3",
            "description": "",
            "image": "https://via.placeholder.com/80",
            "price": 1000,
            "original_price": null,
            "discount_percent": null,
            "quantity": 1,
            "selected": true
          },
          {
            "advertisement_id": 104,
            "name": "Товар 4",
            "description": "",
            "image": "https://via.placeholder.com/80",
            "price": 1000,
            "original_price": null,
            "discount_percent": null,
            "quantity": 1,
            "selected": true
          },
          {
            "advertisement_id": 105,
            "name": "Товар 5",
            "description": "",
            "image": "https://via.placeholder.com/80",
            "price": 1000,
            "original_price": null,
            "discount_percent": null,
            "quantity": 1,
            "selected": true
          }
        ]
      }
    ],
    "total_amount": 5000,
    "selected_items_count": 5,
    "total_items_count": 5
  },
  "suggested_products": [],
  "ui": {
    "notifications": {
      "message": null,
      "actionLabel": null,
      "actionEvent": null
    }
  }
}
```

**Визуальный эффект:**
- Footer показывает: "5 товаров" (не "товара")

---

### 8️⃣ **Большие скидки**

```json
{
  "cart_response": {
    "id": 3,
    "user_id": 4,
    "shop_groups": [
      {
        "shop_id": 1,
        "shop_name": "Mega Sale Store",
        "rating": 4.9,
        "reviews_count": 1520,
        "selected": true,
        "items": [
          {
            "advertisement_id": 201,
            "name": "MacBook Pro 16\" M3 Max",
            "description": "512GB, Space Gray",
            "image": "https://via.placeholder.com/80",
            "price": 199990,
            "original_price": 299990,
            "discount_percent": 33,
            "quantity": 1,
            "selected": true
          },
          {
            "advertisement_id": 202,
            "name": "iPad Pro 12.9\" M2",
            "description": "256GB, Wi-Fi",
            "image": "https://via.placeholder.com/80",
            "price": 79990,
            "original_price": 99990,
            "discount_percent": 20,
            "quantity": 1,
            "selected": true
          }
        ]
      }
    ],
    "total_amount": 279980,
    "selected_items_count": 2,
    "total_items_count": 2
  },
  "suggested_products": [
    {
      "id": 301,
      "name": "Apple Pencil Pro",
      "price": 9990,
      "original_price": 12990,
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

**Визуальный эффект:**
- Бейджи скидки: `-33%`, `-20%`
- Зачеркнутые цены: 299 990 ₽, 99 990 ₽

---

## 🧪 Тестовые сценарии

### **Сценарий 1: Полный цикл добавления товара**

**Шаг 1 - Пустая корзина:**
```json
{ "cart_response": { "shop_groups": [], "total_items_count": 0 } }
```

**Шаг 2 - Клик "В корзину" на рекомендации:**
```javascript
event: "addToCart"
eventParams: { advertisement_id: 10 }
```

**Шаг 3 - Backend возвращает обновленную корзину:**
```json
{
  "cart_response": {
    "shop_groups": [
      {
        "shop_id": 3,
        "shop_name": "Apple Store",
        "rating": 5.0,
        "reviews_count": 999,
        "selected": true,
        "items": [
          {
            "advertisement_id": 10,
            "name": "Apple Watch 10 256Gb",
            "price": 26591,
            "quantity": 1,
            "selected": true
          }
        ]
      }
    ],
    "total_amount": 26591,
    "selected_items_count": 1,
    "total_items_count": 1
  }
}
```

---

### **Сценарий 2: Снятие/возврат фокуса**

**Шаг 1 - Все выбрано:**
```json
{
  "selected_items_count": 3,
  "total_amount": 120970
}
```

**Шаг 2 - Клик на чекбокс товара:**
```javascript
event: "toggleFocus"
eventParams: { selected_item_id: 101 }
```

**Шаг 3 - Backend обновляет:**
```json
{
  "selected_items_count": 2,
  "total_amount": 115980
}
```

---

### **Сценарий 3: Удаление с отменой**

**Шаг 1 - Клик 🗑️:**
```javascript
event: "removeItem"
eventParams: { selected_item_id: 101 }
```

**Шаг 2 - Backend удаляет и показывает снэкбар:**
```json
{
  "cart_response": {
    "total_items_count": 2
  },
  "ui": {
    "notifications": {
      "message": "Товар удалён из корзины",
      "actionLabel": "Вернуть",
      "actionEvent": "undoRemoveItem"
    }
  }
}
```

**Шаг 3 - Клик "Вернуть":**
```javascript
event: "undoRemoveItem"
```

**Шаг 4 - Backend восстанавливает:**
```json
{
  "cart_response": {
    "total_items_count": 3
  },
  "ui": {
    "notifications": {
      "message": null
    }
  }
}
```

---

## ✅ Контрольные точки тестирования

### **UI Тесты:**

- [ ] Пустая корзина показывает Empty State
- [ ] Склонение "товар/товара/товаров" работает правильно
- [ ] Чекбокс "Выбрать всё" меняет состояние всех товаров
- [ ] Кнопка "Удалить (N)" показывает правильное количество
- [ ] Старая цена зачеркнута когда есть original_price
- [ ] Бейдж скидки показывается когда есть discount_percent
- [ ] Снэкбар появляется/исчезает по условию
- [ ] Кнопка "−" disabled когда quantity = 1
- [ ] Кнопка checkout disabled когда корзина пуста
- [ ] Товары с selected=false имеют opacity 0.5
- [ ] Рейтинг магазина показывается правильно

### **Функциональные тесты:**

- [ ] Увеличение количества отправляет правильные параметры
- [ ] Уменьшение количества отправляет правильные параметры
- [ ] Удаление товара отправляет правильный ID
- [ ] Добавление из рекомендаций работает
- [ ] Переключение фокуса работает
- [ ] "Купить с доставкой" отправляет событие
- [ ] Checkout переходит на следующий экран

---

## 🚀 Готово к тестированию!

Используйте эти примеры для проверки всех состояний UI корзины.
