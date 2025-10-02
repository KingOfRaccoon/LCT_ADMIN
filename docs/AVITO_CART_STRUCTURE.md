# Обновление screen-cart-main под макет Avito

## ✅ Что уже сделано:
1. Header переработан: кнопка назад, заголовок по центру, пустое место справа
2. Subheader добавлен: checkbox "Выбрать всё" + ссылка "Удалить (3)"

## 🔄 Что нужно добавить в body:

### Структура карточки товара (как на макете):
```json
{
  "type": "row",
  "spacing": 12,
  "alignItems": "flex-start",
  "padding": "12px 0",
  "borderBottom": "1px solid #E5E5E5",
  "children": [
    // Checkbox слева
    { "type": "checkbox", "checked": true },
    
    // Изображение 80x80
    { "type": "image", "src": "...", "width": 80, "height": 80, "borderRadius": "8px" },
    
    // Контент (flex: 1)
    {
      "type": "column",
      "flex": 1,
      "children": [
        // Цена + старая цена
        { "type": "row", "children": [
          { "type": "text", "content": "4 990 ₽", "fontSize": "17px", "fontWeight": 600 },
          { "type": "text", "content": "6 490 ₽", "fontSize": "15px", "color": "#8E8E93", "textDecoration": "line-through" }
        ]},
        
        // Название товара
        { "type": "text", "content": "Зарядка MagSafe Charger 15W 1 метр", "fontSize": "15px", "color": "#000" },
        
        // Счетчик + иконки
        { "type": "row", "justifyContent": "space-between", "children": [
          // Счетчик -1+
          { "type": "row", "children": [
            { "type": "button", "text": "−", "width": "32px", "height": "32px" },
            { "type": "text", "content": "1", "fontSize": "15px" },
            { "type": "button", "text": "+", "width": "32px", "height": "32px" }
          ]},
          // Иконки (сердце, корзина)
          { "type": "row", "children": [
            { "type": "button", "icon": "♡" },
            { "type": "button", "icon": "🗑" }
          ]}
        ]}
      ]
    }
  ]
}
```

### Кнопка "Купить с доставкой":
```json
{
  "type": "button",
  "text": "Купить с доставкой",
  "variant": "link",
  "style": {
    "color": "#A933FF",
    "fontSize": "15px",
    "background": "transparent",
    "padding": "12px 0",
    "textAlign": "left"
  }
}
```

### Блок магазина (заголовок):
```json
{
  "type": "row",
  "spacing": 8,
  "alignItems": "center",
  "padding": "12px 0",
  "children": [
    { "type": "checkbox", "checked": true },
    { "type": "text", "content": "Pear Store", "fontSize": "17px", "fontWeight": 600 },
    { "type": "text", "content": "⭐", "fontSize": "14px" },
    { "type": "text", "content": "4,8 (643)", "fontSize": "14px", "color": "#8E8E93" }
  ]
}
```

### Upsell блок:
```json
{
  "type": "column",
  "background": "#ffffff",
  "borderRadius": "12px",
  "padding": 16,
  "children": [
    {
      "type": "row",
      "justifyContent": "space-between",
      "children": [
        {
          "type": "row",
          "children": [
            { "type": "text", "content": "↻", "fontSize": "20px" },
            { "type": "text", "content": "Добавьте ещё 1 товар до скидки 5%", "fontSize": "15px" }
          ]
        },
        { "type": "text", "content": ">", "fontSize": "16px", "color": "#8E8E93" }
      ]
    },
    {
      "type": "scroll-horizontal",
      "children": [
        // Карточки товаров (120x120 изображение, цена, название, кнопка)
      ]
    }
  ]
}
```

### Footer (фиксированный внизу):
```json
{
  "type": "Section",
  "slot": "footer",
  "style": {
    "background": "#ffffff",
    "borderTop": "1px solid #E5E5E5",
    "padding": 16,
    "position": "fixed",
    "bottom": 0,
    "width": "100%"
  },
  "children": [
    {
      "type": "row",
      "justifyContent": "space-between",
      "alignItems": "center",
      "children": [
        {
          "type": "column",
          "children": [
            { "type": "text", "content": "3 товара", "fontSize": "13px", "color": "#8E8E93" },
            { "type": "text", "content": "120 979 ₽", "fontSize": "24px", "fontWeight": 700 }
          ]
        },
        {
          "type": "button",
          "text": "Оформить доставку",
          "style": {
            "background": "#A933FF",
            "color": "#ffffff",
            "fontSize": "16px",
            "fontWeight": 600,
            "padding": "14px 24px",
            "borderRadius": "8px",
            "height": "48px"
          }
        }
      ]
    }
  ]
}
```

## 📋 Следующий шаг:
Применить эти изменения к body секции avitoDemo.json, заменив старую структуру.
