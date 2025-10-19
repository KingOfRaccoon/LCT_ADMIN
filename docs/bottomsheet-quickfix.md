# 🎯 Bottom Sheet - Краткая шпаргалка

## Проблемы и решения

| Проблема | Причина | Решение |
|----------|---------|---------|
| 🔴 BS сверху вместо снизу | Конфликтующие правила позиционирования | `position: absolute` в CSS + убрать дубли в JSON |
| 🔴 BS виден по умолчанию | Некорректные стили | Убрать inline positioning из JSON |
| 🔴 Блокирует клики когда скрыт | `pointerEvents` управлялся вручную | Автоматическое управление через CSS |
| 🔴 Растянут на весь экран | `alignItems: stretch` + нет maxHeight | `alignItems: center` + `maxHeight: 80vh` |
| 🔴 Контент выходит за границы | Нет ограничений размера | `overflow: hidden` + правильные размеры |

## Быстрая проверка

```bash
# 1. Запустить dev-сервер
npm run dev

# 2. Открыть браузер
open http://localhost:5174

# 3. Навигация
Sandbox → Avito Demo → "Оформление заказа"

# 4. Тесты
✅ BS скрыт при загрузке
✅ BS появляется снизу при клике "Изменить получателя"  
✅ BS закрывается при клике на backdrop
```

## Ключевые изменения

### CSS (/src/pages/Sandbox/SandboxPage.css)

```css
.sandbox-screen {
  overflow: hidden;                /* ← Добавлено: контент не выходит */
}

.sandbox-section[data-slot="overlay"] {
  position: absolute !important;   /* ← Привязка к .sandbox-screen */
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  width: 100% !important;
  height: 100% !important;
  pointer-events: none;            /* ← Не блокирует по умолчанию */
  overflow: hidden;                /* ← Добавлено: контент не выходит */
}

/* Автоматически включает pointer-events когда виден */
.sandbox-section[data-slot="overlay"][style*="display: flex"] {
  pointer-events: auto;
}

/* Дочерние элементы не выходят за границы */
.sandbox-section[data-slot="overlay"] > * {
  max-width: 100%;
  max-height: 100%;
  box-sizing: border-box;
}
```

### JSON (/src/pages/Sandbox/data/avitoDemo.json)

```json
{
  "overlay": {
    "style": {
      // ❌ УДАЛЕНО:
      // "position": "absolute",
      // "top": "0", "bottom": "0", "left": "0", "right": "0",
      // "pointerEvents": { ... }
      // "alignItems": "stretch"
      
      // ✅ ОСТАВЛЕНО только логические стили:
      "zIndex": "1000",
      "backgroundColor": "rgba(0, 0, 0, 0.5)",
      "display": {
        "reference": "${show_edit_recipient ? 'flex' : 'none'}",
        "value": "none"  // ← Скрыт по умолчанию
      },
      "flexDirection": "column",
      "justifyContent": "flex-end",  // ← Прижимает к низу
      "alignItems": "center"         // ← center, не stretch
    },
    "children": [
      {
        "id": "bottomsheet-backdrop",
        "style": {
          "flex": "1",
          "width": "100%",   // ← Добавлено: на всю ширину
          "cursor": "pointer"
        }
      },
      {
        "id": "bottomsheet-container",
        "style": {
          "backgroundColor": "#FFFFFF",
          "borderRadius": "28px 28px 0 0",
          "width": "100%",       // ← Добавлено
          "maxHeight": "80vh",   // ← Добавлено: макс 80% экрана
          "flexShrink": "0",     // ← Добавлено: не сжиматься
          "overflow": "auto"     // ← Добавлено: прокрутка
        }
      }
    ]
  }
}
```

## Контекст и события

```javascript
// Начальное состояние
{ "show_edit_recipient": false }  // BS скрыт

// Открытие BS
Event: "showEditRecipient"
→ { "show_edit_recipient": true }  // BS виден

// Закрытие BS
Event: "closeRecipientForm"
→ { "show_edit_recipient": false }  // BS скрыт
```

## Структура компонента

```
overlay (absolute, внутри экрана)
├── backdrop (flex: 1, width: 100%, прозрачный, клик → закрыть)
└── bottomsheet-container (внизу, белый, width: 100%, maxHeight: 80vh)
    ├── handle (серая полоска)
    ├── title ("Получатель")
    ├── input (ФИО)
    ├── input (Телефон)
    ├── input (Почта)
    └── button ("Сохранить получателя")
```

## Ключевые свойства

### Overlay
- `position: absolute` - следует за размерами `.sandbox-screen`
- `overflow: hidden` - контент не выходит за границы
- `pointer-events: none` → `auto` - автоматическое управление

### Backdrop  
- `flex: 1` - занимает оставшееся пространство сверху
- `width: 100%` - на всю ширину
- Клик закрывает BS

### Container
- `width: 100%` - на всю ширину
- `maxHeight: 80vh` - максимум 80% экрана
- `flexShrink: 0` - не сжимается
- `overflow: auto` - прокрутка при переполнении
- `borderRadius: 28px 28px 0 0` - закругление только сверху

## Отладка

### DevTools: Проверить стили overlay

```css
/* Должны быть: */
position: absolute;
overflow: hidden;            /* Важно! */
display: none;               /* Когда скрыт */
display: flex;               /* Когда виден */
pointer-events: none;        /* Когда скрыт */
pointer-events: auto;        /* Когда виден */
justify-content: flex-end;
```

### DevTools: Проверить backdrop

```css
/* Должны быть: */
flex: 1;
width: 100%;                 /* Важно! */
```

### DevTools: Проверить container

```css
/* Должны быть: */
width: 100%;                 /* Важно! */
max-height: 80vh;            /* Важно! */
flex-shrink: 0;              /* Важно! */
overflow: auto;              /* Важно! */
border-radius: 28px 28px 0 0;
```

### Console: Проверить контекст

```javascript
// В DevTools Console:
// Проверить значение переменной
// (зависит от реализации контекста в вашем приложении)
```

### Elements: Проверить DOM

```html
<!-- Когда скрыт: -->
<div class="sandbox-section" data-slot="overlay" style="display: none;">

<!-- Когда виден: -->
<div class="sandbox-section" data-slot="overlay" style="display: flex;">
```

## Связанные документы

- 📄 **v1.0 - Видимость:** `/docs/bottomsheet-display-fix.md`
- 📄 **v2.0 - Позиционирование:** `/docs/bottomsheet-position-fix.md`
- 📄 **v2.1 - Размеры контейнера:** `/docs/bottomsheet-container-fix.md`
- 📄 **Логика работы:** `/docs/bottomsheet-logic.md`

---

✅ **Статус:** Исправлено  
📅 **Дата:** 19 октября 2025  
🔧 **Версия:** 2.2.0
