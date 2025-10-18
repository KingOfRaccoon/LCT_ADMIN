# 🎨 Улучшения UI экрана корзины Avito

## 📋 Обзор изменений

Все визуальные улучшения настроены для работы с **динамическими данными из контекста**. Данные приходят из API, UI автоматически адаптируется под содержимое корзины.

---

## 🎯 1. HEADER (Шапка) - Улучшения

### ✅ Добавлено:

#### **Чекбокс "Выбрать всё"**
```json
{
  "id": "checkbox-select-all",
  "type": "checkbox",
  "checked": "${cart_response.selected_items_count === cart_response.total_items_count && cart_response.total_items_count > 0}",
  "event": "toggleSelectAll"
}
```

**Логика:**
- Активен, когда все товары выбраны
- Отправляет событие `toggleSelectAll` для массового выбора/снятия выбора

#### **Ссылка "Удалить (N)"**
```json
{
  "id": "button-delete-selected",
  "text": "Удалить (${cart_response.selected_items_count})",
  "event": "deleteSelected",
  "disabled": "${cart_response.selected_items_count === 0}",
  "style": {
    "color": "#0A74F0"
  }
}
```

**Особенности:**
- Динамически показывает количество выбранных товаров
- Disabled когда ничего не выбрано
- Синий цвет Avito (`#0A74F0`)

---

## 🏪 2. СПИСОК МАГАЗИНОВ - Улучшения

### ✅ Добавлено:

#### **Чекбокс магазина**
```json
{
  "id": "checkbox-shop-{{itemIndex}}",
  "checked": "${shop.selected}",
  "event": "toggleShopSelection",
  "eventParams": {
    "shop_id": "${shop.shop_id}"
  }
}
```

#### **Рейтинг магазина со звездой**
```json
{
  "id": "text-shop-rating-{{itemIndex}}",
  "content": "⭐ ${shop.rating} (${shop.reviews_count})",
  "style": {
    "fontSize": "13px",
    "color": "#8E8E93"
  }
}
```

**Пример вывода:** `⭐ 4.8 (643)`

**Переменные из контекста:**
- `shop.shop_name` - название магазина
- `shop.rating` - рейтинг (float)
- `shop.reviews_count` - количество отзывов
- `shop.selected` - выбран ли магазин
- `shop.shop_id` - ID магазина

---

## 🛍️ 3. КАРТОЧКА ТОВАРА - Улучшения

### ✅ Добавлено:

#### **Блок цены со скидкой**

**Основная структура:**
```json
{
  "id": "row-price-info-{{itemIndex}}",
  "type": "row",
  "spacing": 8,
  "children": [
    "текущая цена",
    "старая цена (зачеркнутая)",
    "бейдж скидки"
  ]
}
```

##### **A. Текущая цена**
```json
{
  "content": "${product.price} ₽",
  "style": {
    "fontSize": "17px",
    "fontWeight": 700,
    "color": "#000000"
  }
}
```

##### **B. Старая цена (зачеркнутая)**
```json
{
  "type": "conditional",
  "condition": "${product.original_price && product.original_price > product.price}",
  "children": [
    {
      "content": "${product.original_price} ₽",
      "style": {
        "fontSize": "13px",
        "color": "#8E8E93",
        "textDecoration": "line-through"
      }
    }
  ]
}
```

**Условие отображения:** Только если `original_price > price`

##### **C. Бейдж процента скидки**
```json
{
  "type": "conditional",
  "condition": "${product.discount_percent && product.discount_percent > 0}",
  "children": [
    {
      "content": "-${product.discount_percent}%",
      "style": {
        "fontSize": "11px",
        "fontWeight": 600,
        "color": "#FF3B30",
        "backgroundColor": "#FFEBE9",
        "padding": "2px 6px",
        "borderRadius": "4px"
      }
    }
  ]
}
```

**Пример:** `-5%` (красный текст на розовом фоне)

---

#### **Ссылка "Купить с доставкой"**
```json
{
  "id": "button-buy-with-delivery-{{itemIndex}}",
  "text": "Купить с доставкой",
  "event": "buyWithDelivery",
  "eventParams": {
    "product_id": "${product.advertisement_id}"
  },
  "style": {
    "fontSize": "14px",
    "color": "#8B5CF6"
  }
}
```

**Особенности:**
- Фиолетовый цвет (`#8B5CF6`)
- Размещается слева в нижней части карточки
- Отправляет событие `buyWithDelivery`

---

#### **Улучшенные контролы количества**

**Кнопка уменьшения с disabled:**
```json
{
  "id": "button-decrease-{{itemIndex}}",
  "text": "−",
  "event": "decreaseQuantity",
  "eventParams": {
    "selected_item_id": "${product.advertisement_id}",
    "quantity_change": "${product.quantity}"
  },
  "disabled": "${product.quantity <= 1}"
}
```

**Логика:** Кнопка "−" отключается когда `quantity === 1`

---

### 📦 Переменные товара из контекста:

```javascript
product = {
  advertisement_id: number,      // ID товара
  name: string,                  // Название
  description: string,           // Описание
  image: string,                 // URL изображения
  price: number,                 // Текущая цена
  original_price: number,        // Старая цена (для скидки)
  discount_percent: number,      // Процент скидки
  quantity: number,              // Количество в корзине
  selected: boolean              // Выбран ли товар
}
```

---

## 🎁 4. БЛОК РЕКОМЕНДАЦИЙ - Улучшения

### ✅ Добавлено:

#### **Цена со скидкой для рекомендаций**

```json
{
  "id": "row-suggested-price-{{itemIndex}}",
  "type": "row",
  "spacing": 6,
  "children": [
    {
      "content": "${suggested.price} ₽",
      "style": {
        "fontSize": "15px",
        "fontWeight": 700
      }
    },
    {
      "type": "conditional",
      "condition": "${suggested.original_price && suggested.original_price > suggested.price}",
      "children": [
        {
          "content": "${suggested.original_price} ₽",
          "style": {
            "fontSize": "12px",
            "color": "#8E8E93",
            "textDecoration": "line-through"
          }
        }
      ]
    }
  ]
}
```

**Пример:** `26 591 ₽` ~~27 990 ₽~~

---

### 📦 Переменные рекомендаций из контекста:

```javascript
suggested_products = [
  {
    id: number,               // ID товара
    name: string,             // Название
    price: number,            // Текущая цена
    original_price: number,   // Старая цена (опционально)
    image: string             // URL изображения
  }
]
```

---

## 💰 5. FOOTER (Итоговая панель) - Улучшения

### ✅ Изменено:

#### **Текст "Итого" → "N товаров"**

**Старый вариант:**
```json
{
  "content": "Итого"
}
```

**Новый вариант:**
```json
{
  "content": "${cart_response.total_items_count} ${cart_response.total_items_count === 1 ? 'товар' : (cart_response.total_items_count >= 2 && cart_response.total_items_count <= 4 ? 'товара' : 'товаров')}"
}
```

**Примеры вывода:**
- `1 товар`
- `3 товара`
- `5 товаров`

**Логика склонения:**
- `1` → товар
- `2-4` → товара
- `5+` → товаров

---

#### **Цвет кнопки: Синий → Фиолетовый**

**Старый:**
```json
{
  "backgroundColor": "#0A74F0"  // Синий Avito
}
```

**Новый:**
```json
{
  "backgroundColor": "#8B5CF6",  // Фиолетовый
  "transition": "background-color 0.2s"
}
```

**Hover эффект** (если поддерживается): `#7C3AED`

---

## 🔔 6. СНЭКБАР УВЕДОМЛЕНИЙ - Новый компонент

### ✅ Добавлено:

```json
{
  "id": "conditional-snackbar",
  "type": "conditional",
  "condition": "${ui.notifications.message !== null}",
  "children": [
    {
      "id": "snackbar-notification",
      "type": "row",
      "style": {
        "position": "fixed",
        "bottom": "90px",
        "left": "16px",
        "right": "16px",
        "backgroundColor": "#2F3034",
        "borderRadius": "12px",
        "boxShadow": "0 4px 12px rgba(0, 0, 0, 0.15)",
        "zIndex": 1000
      },
      "children": [
        {
          "content": "${ui.notifications.message}",
          "style": {
            "color": "#ffffff",
            "flex": 1
          }
        },
        {
          "text": "${ui.notifications.actionLabel}",
          "event": "${ui.notifications.actionEvent}",
          "style": {
            "color": "#8B5CF6"
          }
        }
      ]
    }
  ]
}
```

### 📦 Переменные уведомлений:

```javascript
ui.notifications = {
  message: string | null,         // Текст уведомления
  actionLabel: string | null,     // Текст кнопки действия
  actionEvent: string | null      // Событие при клике на кнопку
}
```

**Примеры использования:**

#### **Уведомление об удалении:**
```javascript
ui.notifications = {
  message: "Товар удалён из корзины",
  actionLabel: "Вернуть",
  actionEvent: "undoRemoveItem"
}
```

#### **Уведомление об ошибке:**
```javascript
ui.notifications = {
  message: "Не удалось добавить товар",
  actionLabel: null,
  actionEvent: null
}
```

---

## 🎨 ЦВЕТОВАЯ ПАЛИТРА

### **Основные цвета:**

| Назначение | HEX | Где используется |
|------------|-----|------------------|
| **Акцент синий** | `#0A74F0` | Ссылки, чекбоксы |
| **Акцент фиолетовый** | `#8B5CF6` | Кнопка checkout, ссылки в товарах |
| **Текст основной** | `#000000` | Заголовки, цены |
| **Текст вторичный** | `#8E8E93` | Описания, метки |
| **Текст тёмный** | `#2F3034` | Заголовок экрана |
| **Скидка (текст)** | `#FF3B30` | Бейдж процента скидки |
| **Скидка (фон)** | `#FFEBE9` | Фон бейджа скидки |
| **Разделители** | `#E5E5E5` | Borders, dividers |
| **Фон карточек** | `#ffffff` | Товары в корзине |
| **Фон рекомендаций** | `#F9F9F9` | Карточки рекомендаций |
| **Фон кнопок +/-** | `#F0F0F0` | Контролы количества |
| **Снэкбар фон** | `#2F3034` | Уведомления |

---

## 📐 РАЗМЕРЫ И ОТСТУПЫ

### **Изображения:**
- Товар в корзине: `80px × 80px`
- Рекомендуемый товар: `60px × 60px`
- Пустая корзина: `200px × 200px`

### **Border Radius:**
- Карточки товаров: `12px`
- Кнопки маленькие (+/-): `8px`
- Кнопка checkout: `12px`
- Бейдж скидки: `4px`

### **Padding:**
- Header/Body/Footer: `16px`
- Карточка товара: `16px`
- Кнопка checkout: `16px`
- Снэкбар: `16px`

### **Spacing:**
- Между карточками: `12px`
- Между магазинами: `24px`
- Внутри карточки: `12px`

---

## 🔄 НОВЫЕ СОБЫТИЯ

### **События управления корзиной:**

1. **`toggleSelectAll`** - Выбрать/снять всё
2. **`deleteSelected`** - Удалить выбранные товары
3. **`toggleShopSelection`** - Выбрать/снять магазин
   - Параметры: `{ shop_id: number }`
4. **`buyWithDelivery`** - Купить товар с доставкой
   - Параметры: `{ product_id: number }`
5. **`undoRemoveItem`** - Отменить удаление (из снэкбара)

---

## ✅ КОНТРОЛЬНЫЙ СПИСОК ПЕРЕМЕННЫХ КОНТЕКСТА

### **Обязательные переменные:**

#### **cart_response:**
```javascript
{
  id: number,
  user_id: number,
  shop_groups: [
    {
      shop_id: number,
      shop_name: string,
      rating: number,
      reviews_count: number,
      selected: boolean,
      items: [
        {
          advertisement_id: number,
          name: string,
          description: string,
          image: string,
          price: number,
          original_price: number,      // Опционально
          discount_percent: number,    // Опционально
          quantity: number,
          selected: boolean
        }
      ]
    }
  ],
  total_amount: number,
  selected_items_count: number,
  total_items_count: number
}
```

#### **suggested_products:**
```javascript
[
  {
    id: number,
    name: string,
    price: number,
    original_price: number,  // Опционально
    image: string
  }
]
```

#### **ui.notifications:**
```javascript
{
  message: string | null,
  actionLabel: string | null,
  actionEvent: string | null
}
```

---

## 🎯 АДАПТИВНОСТЬ ПОД ДАННЫЕ

### **Автоматические условия:**

1. **Пустая корзина:**
   - Условие: `${(cart_response.shop_groups || []).length === 0}`
   - Показывает: Empty State с иллюстрацией

2. **Список товаров:**
   - Условие: `${(cart_response.shop_groups || []).length > 0}`
   - Показывает: Магазины → Товары → Рекомендации

3. **Скидка на товар:**
   - Условие: `${product.original_price && product.original_price > product.price}`
   - Показывает: Зачеркнутую старую цену

4. **Бейдж скидки:**
   - Условие: `${product.discount_percent && product.discount_percent > 0}`
   - Показывает: Процент скидки

5. **Уведомление:**
   - Условие: `${ui.notifications.message !== null}`
   - Показывает: Снэкбар

6. **Кнопка действия в снэкбаре:**
   - Условие: `${ui.notifications.actionLabel !== null}`
   - Показывает: Кнопку действия

7. **Disabled кнопки уменьшения:**
   - Условие: `${product.quantity <= 1}`
   - Блокирует: Кнопку "−"

8. **Disabled кнопки checkout:**
   - Условие: `${cart_response.total_items_count === 0}`
   - Блокирует: Кнопку оформления

---

## 🚀 ИНТЕГРАЦИЯ С BACKEND

### **Примеры API-ответов:**

#### **Корзина с товарами:**
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
            "description": "",
            "image": "https://example.com/image.jpg",
            "price": 4990,
            "original_price": null,
            "discount_percent": null,
            "quantity": 2,
            "selected": true
          }
        ]
      }
    ],
    "total_amount": 120979,
    "selected_items_count": 3,
    "total_items_count": 3
  }
}
```

#### **Показ уведомления после удаления:**
```json
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

#### **Скрытие уведомления:**
```json
{
  "ui": {
    "notifications": {
      "message": null,
      "actionLabel": null,
      "actionEvent": null
    }
  }
}
```

---

## 📊 ИТОГОВАЯ СВОДКА

### **Что улучшено:**

✅ **Header:**
- Чекбокс "Выбрать всё"
- Ссылка "Удалить (N)"

✅ **Магазины:**
- Чекбокс магазина
- Рейтинг со звездой

✅ **Товары:**
- Старая цена (зачеркнутая)
- Бейдж процента скидки
- Ссылка "Купить с доставкой"
- Disabled для кнопки "−"

✅ **Рекомендации:**
- Старая цена со скидкой

✅ **Footer:**
- Правильное склонение "N товаров"
- Фиолетовая кнопка checkout

✅ **Новое:**
- Компонент снэкбара для уведомлений

---

## 🎨 Результат

Все визуальные элементы настроены на **100% динамическую работу** с данными из контекста. UI автоматически:
- Показывает/скрывает элементы по условиям
- Склоняет слова правильно
- Адаптируется под количество товаров
- Отображает скидки когда они есть
- Показывает уведомления когда нужно

**Готово к интеграции с любым backend!** 🚀
