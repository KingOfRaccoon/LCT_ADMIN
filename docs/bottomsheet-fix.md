# 🔧 Исправление отображения Bottom Sheet

## Проблема
Bottom Sheet (всплывающая панель снизу экрана) отображался некорректно из-за отсутствия правильного позиционирования родительского контейнера.

## Решение

### Внесённые изменения

#### 1. **SandboxPage.css**
Добавлены стили для корректного позиционирования экрана и overlay секций:

```css
/* Стили для экрана с поддержкой overlay/bottom sheet */
.sandbox-screen {
  position: relative;
  isolation: isolate;
}

```css
/* Стили для overlay секций (bottom sheet, modal и т.д.) */
.sandbox-section[data-slot="overlay"] {
  position: absolute !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  height: 100% !important;
  /* display управляется через inline стили из JSON */
}
```

**Объяснение:**
- `position: relative` - позволяет дочерним элементам с `position: absolute` позиционироваться относительно экрана
- `isolation: isolate` - создаёт новый контекст наложения (stacking context), что предотвращает проблемы с z-index
- Правила для `[data-slot="overlay"]` гарантируют:
  - Overlay занимает всю площадь экрана
  - `height: 100%` обязательна для правильной работы `flexDirection: column` и `justifyContent: flex-end`
  - `!important` используется **только** для позиционирования, НЕ для `display`
  - `display` управляется через биндинги в JSON для реактивности
```

**Объяснение:**
- `position: relative` - позволяет дочерним элементам с `position: absolute` позиционироваться относительно экрана
- `isolation: isolate` - создаёт новый контекст наложения (stacking context), что предотвращает проблемы с z-index
- Правила для `[data-slot="overlay"]` гарантируют:
  - Overlay занимает всю площадь экрана
  - `height: 100%` обязательна для правильной работы `flexDirection: column` и `justifyContent: flex-end`
  - `!important` используется для переопределения inline стилей там, где это необходимо

#### 2. **PreviewPage.css**
Добавлены те же стили для preview режима:

```css
.preview-canvas .sandbox-screen {
  position: relative;
  isolation: isolate;
  box-shadow: 0 24px 48px rgba(15, 23, 42, 0.12);
}
```

## Как работает Bottom Sheet

### Структура в avitoDemo.json

Bottom Sheet реализован через секцию `overlay` в JSON:

```json
{
  "overlay": {
    "id": "section-edit-recipient-bottomsheet",
    "type": "Section",
    "properties": {
      "slot": "overlay"
    },
    "style": {
      "position": "absolute",
      "top": "0",
      "bottom": "0",
      "left": "0",
      "right": "0",
      "zIndex": "1000",
      "backgroundColor": "rgba(0, 0, 0, 0.5)",
      "display": {
        "reference": "${show_edit_recipient ? 'flex' : 'none'}",
        "value": "none"
      },
      "flexDirection": "column",
      "justifyContent": "flex-end"
    }
  }
}
```

### Управление видимостью

1. **По умолчанию скрыт:** `show_edit_recipient: false`
2. **Открывается при событии:** `showEditRecipient`
3. **Закрывается при событии:** `closeRecipientForm`

### Компоненты Bottom Sheet

1. **Backdrop (фон с затемнением)**
   - Занимает всю область overlay
   - При клике закрывает bottom sheet
   - Полупрозрачный чёрный фон

2. **Container (сам bottom sheet)**
   - Белый контейнер с закруглёнными углами сверху
   - Содержит форму редактирования получателя
   - Включает:
     - Handle (полоска для свайпа)
     - Заголовок "Получатель"
     - Поля: ФИО, Телефон, Почта
     - Кнопку "Сохранить получателя"

## Тестирование

### Как проверить работу:

1. Запустите dev server: `npm run dev`
2. Откройте приложение в браузере
3. Перейдите в Sandbox
4. Выберите продукт "Avito Demo"
5. Перейдите на экран "checkout-screen" (Оформление)
6. Нажмите на кнопку редактирования получателя
7. Bottom sheet должен плавно появиться снизу экрана с затемнённым фоном

### Ожидаемое поведение:

✅ Bottom sheet появляется с анимацией снизу  
✅ Фон затемняется полупрозрачным чёрным  
✅ При клике на фон bottom sheet закрывается  
✅ Bottom sheet корректно позиционирован относительно экрана  
✅ Z-index работает правильно (bottom sheet поверх всего содержимого)

## Технические детали

### Почему это работает:

1. **position: relative на .sandbox-screen**
   - Создаёт reference point для absolute позиционирования
   - Overlay с `position: absolute` теперь позиционируется относительно экрана, а не viewport

2. **Специальные правила для overlay секций**
   - `height: 100%` критически важна для flexbox: без неё `justifyContent: flex-end` не работает
   - `position: absolute` с координатами `top/left/right/bottom: 0` растягивает overlay на весь экран
   - `display: flex` включает flexbox layout для правильной работы `justifyContent`
   - `!important` гарантирует применение этих правил даже при наличии inline стилей

3. **isolation: isolate**
   - Создаёт новый stacking context
   - Предотвращает конфликты z-index с другими элементами страницы
   - Гарантирует, что overlay всегда будет поверх содержимого экрана

4. **Структура с backdrop и container**
   - Backdrop с `flex: 1` занимает верхнее пространство
   - Container с bottom sheet автоматически прижимается к низу благодаря `justifyContent: flex-end`
   - При клике на backdrop bottom sheet закрывается

5. **Inline стили из JSON**
   - Имеют приоритет над CSS классами (кроме случаев с `!important`)
   - Позволяют точно контролировать отображение через данные
   - Поддерживают динамические значения через биндинги

## Применимость

Это исправление работает для:
- ✅ Bottom sheets
- ✅ Modals (модальные окна)
- ✅ Overlays (оверлеи)
- ✅ Popups (всплывающие окна)
- ✅ Любых компонентов с `slot="overlay"` и `position: absolute`

---

**Дата исправления:** 19 октября 2025  
**Версия:** 1.0.0
