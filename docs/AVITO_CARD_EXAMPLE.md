# 🎯 Пример правильной карточки товара для Avito

## Структура карточки (как на макете)

```json
{
  "id": "row-cart-item",
  "type": "row",
  "properties": {
    "spacing": 12,
    "alignItems": "flex-start",
    "padding": "12px 0"
  },
  "style": {
    "borderBottom": "1px solid #E5E5E5",
    "width": "100%"
  },
  "children": [
    {
      "id": "checkbox-item",
      "type": "checkbox",
      "properties": {
        "checked": true,
        "event": "toggleItem"
      },
      "style": {
        "width": "20px",
        "height": "20px",
        "marginTop": "4px",
        "flexShrink": 0
      }
    },
    {
      "id": "image-item",
      "type": "image",
      "properties": {
        "src": "https://store.storeimages.cdn-apple.com/...",
        "alt": "Товар",
        "width": 80,
        "height": 80
      },
      "style": {
        "borderRadius": "8px",
        "objectFit": "cover",
        "flexShrink": 0
      }
    },
    {
      "id": "column-item-content",
      "type": "column",
      "properties": {
        "spacing": 4,
        "flex": 1
      },
      "style": {
        "minWidth": 0
      },
      "children": [
        {
          "id": "row-price",
          "type": "row",
          "properties": {
            "spacing": 8,
            "alignItems": "baseline"
          },
          "children": [
            {
              "id": "text-price",
              "type": "text",
              "properties": {
                "content": "4 990 ₽",
                "variant": "heading"
              },
              "style": {
                "fontSize": "17px",
                "fontWeight": 600,
                "color": "#000000"
              }
            },
            {
              "id": "text-old-price",
              "type": "text",
              "properties": {
                "content": "6 490 ₽",
                "variant": "caption"
              },
              "style": {
                "fontSize": "15px",
                "color": "#8E8E93",
                "textDecoration": "line-through"
              }
            }
          ]
        },
        {
          "id": "text-title",
          "type": "text",
          "properties": {
            "content": "Зарядка MagSafe Charger 15W 1 метр",
            "variant": "body"
          },
          "style": {
            "fontSize": "15px",
            "color": "#000000",
            "lineHeight": "1.4",
            "maxLines": 2,
            "overflow": "hidden"
          }
        },
        {
          "id": "row-controls",
          "type": "row",
          "properties": {
            "spacing": 8,
            "alignItems": "center",
            "justifyContent": "space-between"
          },
          "style": {
            "marginTop": "8px"
          },
          "children": [
            {
              "id": "row-counter",
              "type": "row",
              "properties": {
                "spacing": 8,
                "alignItems": "center"
              },
              "style": {
                "border": "1px solid #E5E5E5",
                "borderRadius": "8px",
                "padding": "4px"
              },
              "children": [
                {
                  "id": "button-decrement",
                  "type": "button",
                  "properties": {
                    "text": "−",
                    "variant": "icon",
                    "event": "decrement"
                  },
                  "style": {
                    "width": "32px",
                    "height": "32px",
                    "border": "none",
                    "background": "transparent",
                    "fontSize": "20px",
                    "color": "#000000",
                    "padding": "0"
                  }
                },
                {
                  "id": "text-quantity",
                  "type": "text",
                  "properties": {
                    "content": "1",
                    "variant": "body"
                  },
                  "style": {
                    "fontSize": "15px",
                    "fontWeight": 500,
                    "color": "#000000",
                    "minWidth": "20px",
                    "textAlign": "center"
                  }
                },
                {
                  "id": "button-increment",
                  "type": "button",
                  "properties": {
                    "text": "+",
                    "variant": "icon",
                    "event": "increment"
                  },
                  "style": {
                    "width": "32px",
                    "height": "32px",
                    "border": "none",
                    "background": "transparent",
                    "fontSize": "20px",
                    "color": "#000000",
                    "padding": "0"
                  }
                }
              ]
            },
            {
              "id": "row-actions",
              "type": "row",
              "properties": {
                "spacing": 4,
                "alignItems": "center"
              },
              "children": [
                {
                  "id": "button-favorite",
                  "type": "button",
                  "properties": {
                    "text": "♡",
                    "variant": "icon",
                    "event": "toggleFavorite"
                  },
                  "style": {
                    "width": "36px",
                    "height": "36px",
                    "border": "none",
                    "background": "transparent",
                    "fontSize": "20px",
                    "color": "#000000",
                    "padding": "0"
                  }
                },
                {
                  "id": "button-delete",
                  "type": "button",
                  "properties": {
                    "text": "🗑",
                    "variant": "icon",
                    "event": "removeItem"
                  },
                  "style": {
                    "width": "36px",
                    "height": "36px",
                    "border": "none",
                    "background": "transparent",
                    "fontSize": "18px",
                    "color": "#000000",
                    "padding": "0"
                  }
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

## Кнопка "Купить с доставкой" (после товаров)

```json
{
  "id": "button-delivery",
  "type": "button",
  "properties": {
    "text": "Купить с доставкой",
    "variant": "link",
    "event": "buyWithDelivery"
  },
  "style": {
    "color": "#A933FF",
    "fontSize": "15px",
    "fontWeight": 400,
    "background": "transparent",
    "border": "none",
    "padding": "12px 0",
    "textAlign": "left",
    "width": "100%"
  }
}
```

## Применить к avitoDemo.json

Эта структура должна заменить текущие карточки в `"children"` внутри `"list-cart-items-pear"` и аналогичных списков.

### Ключевые отличия от текущей версии:
1. ✅ Checkbox выровнен по верху (`marginTop: "4px"`)
2. ✅ Изображение 80x80 с `borderRadius: "8px"`
3. ✅ Цена 17px bold, старая цена зачёркнута
4. ✅ Счетчик в рамке с `border: "1px solid #E5E5E5"`
5. ✅ Иконки сердце и корзина справа
6. ✅ Кнопка "Купить с доставкой" фиолетовая (#A933FF)
