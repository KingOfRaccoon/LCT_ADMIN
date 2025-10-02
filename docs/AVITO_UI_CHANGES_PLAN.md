# 🔧 Подробный план изменений для avitoDemo.json

## Критические изменения цветов (Search & Replace)

### Глобальная замена цветов:

```javascript
// 1. Primary Blue (кнопки, ссылки)
"#2563eb" → "#0A74F0"
"#1d4ed8" → "#0A74F0"
"#3b82f6" → "#0A74F0"

// 2. Success Green (скидки, "Сэкономлено")
"#10b981" → "#00C853"
"#059669" → "#00C853"

// 3. Accent Red (удаление)  
"#ef4444" → "#FF3333"
"#dc2626" → "#FF3333"

// 4. Dark Text
"#0f172a" → "#2F3034"
"#1e293b" → "#2F3034"

// 5. Background
"#f8fafc" → "#F5F5F5"
"#f1f5f9" → "#F5F5F5"

// 6. Border
"rgba(148, 163, 184, 0.12)" → "#E5E5E5"
"#e2e8f0" → "#E5E5E5"
```

### Замена шрифтов:

```javascript
// Старое
"fontFamily": "Inter, system-ui, sans-serif"

// Новое  
"fontFamily": "-apple-system, Arial, sans-serif"
```

### Замена border-radius:

```javascript
// Карточки товаров
"borderRadius": "24px" → "borderRadius": "12px"
"borderRadius": "28px" → "borderRadius": "12px"

// Кнопки
"borderRadius": "12px" → "borderRadius": "8px"
"borderRadius": "999px" → "borderRadius": "8px"

// Маленькие элементы
"borderRadius": "16px" → "borderRadius": "8px"
```

### Улучшение теней:

```javascript
// Старое
"boxShadow": "0 24px 64px -32px rgba(15, 23, 42, 0.35)"

// Новое
"boxShadow": "0 2px 8px rgba(0, 0, 0, 0.08)"
```

## Специфичные изменения по экранам

### screen-loading
```json
{
  "style": {
    "backgroundColor": "#FFFFFF",  // было #ffffff
    "borderRadius": "12px",        // было 32px
    "fontFamily": "-apple-system, Arial, sans-serif"
  }
}
```

### screen-cart-main > header
```json
{
  "style": {
    "background": "#FFFFFF",
    "borderBottom": "1px solid #E5E5E5",
    "padding": "16px"
  },
  "children": [
    {
      "type": "text",
      "properties": {
        "content": "Корзина",
        "variant": "heading"
      },
      "style": {
        "fontSize": "24px",
        "fontWeight": 600,
        "color": "#2F3034",
        "fontFamily": "-apple-system, Arial, sans-serif"
      }
    }
  ]
}
```

### Карточка товара (item card)
```json
{
  "style": {
    "backgroundColor": "#FFFFFF",
    "borderRadius": "12px",
    "padding": "16px",
    "boxShadow": "0 2px 8px rgba(0, 0, 0, 0.08)",
    "border": "1px solid #E5E5E5"
  },
  "children": [
    {
      "type": "image",
      "properties": {
        "source": "${item.image}",
        "width": 80,
        "height": 80
      },
      "style": {
        "borderRadius": "8px"
      }
    },
    {
      "type": "text",
      "properties": {
        "content": "${item.title}"
      },
      "style": {
        "fontSize": "16px",
        "fontWeight": 500,
        "color": "#2F3034",
        "fontFamily": "-apple-system, Arial, sans-serif",
        "lineHeight": "1.4"
      }
    },
    {
      "type": "text",
      "properties": {
        "content": "${item.price} ₽"
      },
      "style": {
        "fontSize": "20px",
        "fontWeight": 700,
        "color": "#2F3034"
      }
    }
  ]
}
```

### Бейдж скидки
```json
{
  "type": "text",
  "properties": {
    "content": "-${discount}%"
  },
  "style": {
    "backgroundColor": "#00C853",
    "color": "#FFFFFF",
    "fontSize": "12px",
    "fontWeight": 600,
    "padding": "4px 8px",
    "borderRadius": "6px"
  }
}
```

### Primary Button (Оформить заказ)
```json
{
  "type": "button",
  "properties": {
    "label": "Оформить заказ",
    "variant": "primary"
  },
  "style": {
    "backgroundColor": "#0A74F0",
    "color": "#FFFFFF",
    "fontSize": "16px",
    "fontWeight": 600,
    "paddingVertical": 14,
    "paddingHorizontal": 24,
    "borderRadius": "8px",
    "border": "none",
    "boxShadow": "none",
    "height": "48px",
    "fontFamily": "-apple-system, Arial, sans-serif"
  },
  "events": {
    "onClick": "checkout"
  }
}
```

### Secondary Button
```json
{
  "type": "button",
  "properties": {
    "label": "Продолжить покупки",
    "variant": "secondary"
  },
  "style": {
    "backgroundColor": "#FFFFFF",
    "color": "#2F3034",
    "fontSize": "16px",
    "fontWeight": 600,
    "paddingVertical": 14,
    "paddingHorizontal": 24,
    "borderRadius": "8px",
    "border": "1px solid #E5E5E5",
    "boxShadow": "none",
    "height": "48px"
  }
}
```

### Summary Block (Итого)
```json
{
  "type": "container",
  "style": {
    "backgroundColor": "#FFFFFF",
    "borderRadius": "12px",
    "padding": "24px",
    "boxShadow": "0 2px 8px rgba(0, 0, 0, 0.08)",
    "border": "1px solid #E5E5E5"
  },
  "children": [
    {
      "type": "row",
      "style": {
        "justifyContent": "space-between",
        "marginBottom": "12px"
      },
      "children": [
        {
          "type": "text",
          "properties": {
            "content": "Товары (${cart.items.length})"
          },
          "style": {
            "fontSize": "14px",
            "color": "#8E8E93"
          }
        },
        {
          "type": "text",
          "properties": {
            "content": "${cart.subtotal} ₽"
          },
          "style": {
            "fontSize": "14px",
            "color": "#2F3034"
          }
        }
      ]
    },
    {
      "type": "row",
      "style": {
        "justifyContent": "space-between",
        "marginBottom": "16px",
        "paddingBottom": "16px",
        "borderBottom": "1px solid #E5E5E5"
      },
      "children": [
        {
          "type": "text",
          "properties": {
            "content": "Скидка"
          },
          "style": {
            "fontSize": "14px",
            "color": "#00C853",
            "fontWeight": 500
          }
        },
        {
          "type": "text",
          "properties": {
            "content": "-${cart.discount} ₽"
          },
          "style": {
            "fontSize": "14px",
            "color": "#00C853",
            "fontWeight": 500
          }
        }
      ]
    },
    {
      "type": "row",
      "style": {
        "justifyContent": "space-between"
      },
      "children": [
        {
          "type": "text",
          "properties": {
            "content": "Итого"
          },
          "style": {
            "fontSize": "16px",
            "color": "#2F3034",
            "fontWeight": 600
          }
        },
        {
          "type": "text",
          "properties": {
            "content": "${cart.total} ₽"
          },
          "style": {
            "fontSize": "28px",
            "color": "#2F3034",
            "fontWeight": 700,
            "fontFamily": "-apple-system, Arial, sans-serif"
          }
        }
      ]
    }
  ]
}
```

## Автоматизация через VS Code

### 1. Find & Replace (Cmd/Ctrl + H)

**Включить Regex:**

```regex
// Замена всех #2563eb на #0A74F0
Find: "#2563eb"
Replace: "#0A74F0"

// Замена всех больших borderRadius
Find: "borderRadius"\s*:\s*"(24|28|32)px"
Replace: "borderRadius": "12px"

// Замена Inter на -apple-system
Find: "fontFamily"\s*:\s*"Inter[^"]*"
Replace: "fontFamily": "-apple-system, Arial, sans-serif"
```

### 2. Bulk Edit через скрипт

Создать `scripts/improveAvitoUI.js`:

```javascript
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/pages/Sandbox/data/avitoDemo.json');
let content = fs.readFileSync(filePath, 'utf8');

// Color replacements
const colorMap = {
  '#2563eb': '#0A74F0',
  '#1d4ed8': '#0A74F0',
  '#3b82f6': '#0A74F0',
  '#10b981': '#00C853',
  '#059669': '#00C853',
  '#ef4444': '#FF3333',
  '#dc2626': '#FF3333',
  '#0f172a': '#2F3034',
  '#1e293b': '#2F3034',
  '#f8fafc': '#F5F5F5',
  '#f1f5f9': '#F5F5F5',
};

Object.entries(colorMap).forEach(([old, newColor]) => {
  content = content.replaceAll(old, newColor);
});

// Font family
content = content.replaceAll(
  /"fontFamily"\s*:\s*"Inter[^"]*"/g,
  '"fontFamily": "-apple-system, Arial, sans-serif"'
);

// Border radius for large containers
content = content.replace(
  /"borderRadius"\s*:\s*"(24|28|32)px"/g,
  '"borderRadius": "12px"'
);

// Write back
fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ avitoDemo.json улучшен!');
```

Запуск:
```bash
node scripts/improveAvitoUI.js
```

## ✅ Чеклист

- [ ] Заменить цвета (Find & Replace)
- [ ] Обновить шрифты
- [ ] Исправить border-radius
- [ ] Улучшить тени
- [ ] Обновить карточки товаров
- [ ] Исправить кнопки
- [ ] Улучшить summary block
- [ ] Проверить в Sandbox

После применения всех изменений UI будет максимально похож на реальный Avito! 🎯
