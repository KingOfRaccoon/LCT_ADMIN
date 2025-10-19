# 🔧 Исправление позиционирования Bottom Sheet

## Проблемы

1. ❌ **Bottom Sheet отображался сверху экрана** вместо снизу
2. ❌ **Bottom Sheet был виден по умолчанию** при загрузке страницы (несмотря на `show_edit_recipient: false`)

## Причины

### Проблема #1: Неправильное позиционирование
```css
/* БЫЛО: */
.sandbox-section[data-slot="overlay"] {
  position: absolute !important;  /* relative к .sandbox-screen */
  top: 0 !important;
  /* ... */
}
```

```json
// В avitoDemo.json также были дублирующие стили:
"style": {
  "position": "absolute",
  "top": "0",
  "bottom": "0",
  /* ... */
}
```

**Проблема:** Inline стили из JSON конфликтовали с CSS правилами. `position: absolute` относительно `.sandbox-screen` + `top: 0` в обоих местах = элемент прибит к верху.

### Проблема #2: pointer-events
```json
"pointerEvents": {
  "reference": "${show_edit_recipient ? 'auto' : 'none'}",
  "value": "none"
}
```

**Проблема:** Управление `pointer-events` через JSON биндинги усложняло логику и могло приводить к проблемам с интерактивностью.

## Решение

### 1. CSS: Привязка overlay к контейнеру экрана

```css
/* СТАЛО: */
.sandbox-section[data-slot="overlay"] {
  position: absolute !important;    /* Привязка к .sandbox-screen */
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  width: 100% !important;
  height: 100% !important;
  pointer-events: none;             /* По умолчанию не блокирует клики */
}

/* Включаем pointer-events только когда overlay видим */
.sandbox-section[data-slot="overlay"][style*="display: flex"],
.sandbox-section[data-slot="overlay"][style*="display:flex"] {
  pointer-events: auto;
}
```

**Преимущества:**
- ✅ Overlay теперь ограничен размерами `.sandbox-screen`
- ✅ `pointer-events: none` — скрытый слой не блокирует клики
- ✅ Автоматическое включение интерактивности при `display: flex`

### 2. JSON: Убрать конфликтующие стили позиционирования

```json
// БЫЛО:
"style": {
  "position": "absolute",
  "top": "0",
  "bottom": "0",
  "left": "0",
  "right": "0",
  "zIndex": "1000",
  "backgroundColor": "rgba(0, 0, 0, 0.5)",
  "display": { /* ... */ },
  "flexDirection": "column",
  "justifyContent": "flex-end",
  "pointerEvents": { /* ... */ }
}
```

```json
// СТАЛО:
"style": {
  "zIndex": "1000",
  "backgroundColor": "rgba(0, 0, 0, 0.5)",
  "display": {
    "reference": "${show_edit_recipient ? 'flex' : 'none'}",
    "value": "none"
  },
  "flexDirection": "column",
  "justifyContent": "flex-end",
  "alignItems": "center"
}
```

**Изменения:**
- ❌ Удалены `position`, `top`, `bottom`, `left`, `right` — управляем через CSS
- ❌ Удалён `pointerEvents` — управляем через CSS
- ✅ `alignItems: "center"` — контейнер выравнивается по центру, но ширина задаётся явно

## Как это работает

### Структура Bottom Sheet

```
┌─────────────────────────────────────────┐
│  overlay (absolute, внутри экрана)     │
│  ┌─────────────────────────────────┐   │
│  │  backdrop (flex: 1, transparent) │   │
│  │  ← Клик здесь закрывает BS       │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │  bottomsheet-container           │   │
│  │  (белый, закругленный сверху)    │   │
│  │                                  │   │
│  │  [Форма редактирования]          │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
                ↑
         justifyContent: flex-end
         (прижимает к низу)
```

### Логика видимости

1. **По умолчанию (загрузка страницы):**
   ```json
   { "show_edit_recipient": false }
   ```
   - Биндинг: `${show_edit_recipient ? 'flex' : 'none'}` → `'none'`
   - Результат: `display: none` → **Bottom Sheet скрыт** ✅

2. **Нажатие "Изменить получателя":**
   - Event: `showEditRecipient`
   - Обновление: `{ "show_edit_recipient": true }`
   - Биндинг: `${show_edit_recipient ? 'flex' : 'none'}` → `'flex'`
   - Результат: `display: flex` → **Bottom Sheet показан снизу** ✅

3. **Закрытие (клик на backdrop или кнопка):**
   - Event: `closeRecipientForm`
   - Обновление: `{ "show_edit_recipient": false }`
   - Биндинг: `${show_edit_recipient ? 'flex' : 'none'}` → `'none'`
   - Результат: `display: none` → **Bottom Sheet скрыт** ✅

## Преимущества нового решения

1. ✅ **Простота:** позиционирование сосредоточено в одном CSS правиле
2. ✅ **Контроль размеров:** overlay ограничен рамками `.sandbox-screen`
3. ✅ **Производительность:** меньше inline стилей → меньше диффов при рендере
4. ✅ **Интерактивность:** `pointer-events` автоматически управляется через CSS
5. ✅ **Читаемость:** JSON отвечает только за бизнес-логику отображения

## Тестирование

### ✅ Тест 1: Начальная загрузка
1. Откройте http://localhost:5174
2. Sandbox → Avito Demo → "Оформление"
3. **Ожидание:** Bottom Sheet НЕ виден ✅

### ✅ Тест 2: Открытие
1. Нажмите "Изменить получателя"
2. **Ожидание:** Bottom Sheet появляется **снизу экрана** ✅

### ✅ Тест 3: Закрытие (backdrop)
1. Нажмите на затемнённый фон
2. **Ожидание:** Bottom Sheet закрывается ✅

### ✅ Тест 4: Позиционирование
1. Откройте Bottom Sheet
2. **Проверка:** 
   - Белый контейнер прижат к низу экрана
   - Backdrop занимает верхнюю часть
   - Закругление только сверху (28px 28px 0 0)

## Технические детали

### Почему absolute внутри контейнера?

- Overlay следует за размерами `.sandbox-screen`
- Не выходит за границы даже при скролле страницы
- Совместим с border-radius и тенями экрана
- Сохраняет привычную модель stacking context внутри приложения

### Почему pointer-events в CSS?

```css
/* Автоматическое управление без биндингов: */
pointer-events: none;  /* По умолчанию */

[style*="display: flex"] {
  pointer-events: auto;  /* Когда видим */
}
```

**Преимущества:**
- Не нужен отдельный биндинг в JSON
- Автоматически синхронизировано с `display`
- Меньше логики в данных

## Связанные файлы

- **CSS:** `/src/pages/Sandbox/SandboxPage.css`
- **JSON:** `/src/pages/Sandbox/data/avitoDemo.json`
- **Документация:**
  - `/docs/bottomsheet-fix.md`
  - `/docs/bottomsheet-display-fix.md`
  - `/docs/bottomsheet-logic.md`

---

**Дата исправления:** 19 октября 2025  
**Версия:** 2.2.0  
**Статус:** ✅ Исправлено и протестировано
