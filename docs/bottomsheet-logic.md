# 🔄 Логика работы Bottom Sheet в Avito Demo

## Обзор

Bottom Sheet для редактирования получателя работает через систему событий и состояний BDUI. Все переходы управляются через граф состояний.

## Структура данных

### Переменная контроля видимости

```json
{
  "show_edit_recipient": {
    "type": "boolean",
    "schema": null
  }
}
```

**Начальное значение:** `false` (bottom sheet скрыт)

## Граф состояний

### 1. Экран "checkout-screen"

Основной экран оформления заказа с тремя ключевыми событиями для bottom sheet:

#### События:

**a) showEditRecipient** - Открытие формы
```json
{
  "id": "edge-show-edit-recipient",
  "label": "Показать форму редактирования получателя",
  "event": "showEditRecipient",
  "target": "show-edit-recipient-form",
  "contextPatch": {}
}
```

**b) saveRecipient** - Сохранение и закрытие
```json
{
  "id": "edge-save-recipient",
  "label": "Сохранить получателя",
  "event": "saveRecipient",
  "target": "hide-edit-recipient-form",
  "contextPatch": {}
}
```

**c) closeRecipientForm** - Закрытие без сохранения
```json
{
  "id": "edge-close-recipient-form",
  "label": "Закрыть форму получателя",
  "event": "closeRecipientForm",
  "target": "hide-edit-recipient-form",
  "contextPatch": {}
}
```

### 2. Состояние "show-edit-recipient-form"

Техническое состояние, которое устанавливает флаг видимости:

```json
{
  "id": "show-edit-recipient-form",
  "label": "Показать форму получателя",
  "type": "technical",
  "expressions": [
    {
      "variable": "show_edit_recipient",
      "expression": "true",
      "metadata": {
        "description": "Показывает BottomSheet с формой редактирования"
      }
    }
  ],
  "transitions": [
    {
      "variable": "show_edit_recipient",
      "case": null,
      "state_id": "checkout-screen",
      "event": "_ready"
    }
  ]
}
```

**Действие:** Устанавливает `show_edit_recipient = true` и возвращается на `checkout-screen`

### 3. Состояние "hide-edit-recipient-form"

Техническое состояние для скрытия bottom sheet:

```json
{
  "id": "hide-edit-recipient-form",
  "label": "Скрыть форму получателя",
  "type": "technical",
  "expressions": [
    {
      "variable": "show_edit_recipient",
      "expression": "false",
      "metadata": {
        "description": "Скрывает BottomSheet"
      }
    }
  ],
  "transitions": [
    {
      "variable": "show_edit_recipient",
      "case": null,
      "state_id": "checkout-screen",
      "event": "_ready"
    }
  ]
}
```

**Действие:** Устанавливает `show_edit_recipient = false` и возвращается на `checkout-screen`

## UI компоненты

### 1. Кнопка "Изменить получателя"

```json
{
  "id": "button-change-recipient",
  "type": "button",
  "properties": {
    "text": "Изменить получателя",
    "variant": "secondary",
    "event": "showEditRecipient"
  }
}
```

**Действие:** При клике вызывает событие `showEditRecipient`

### 2. Overlay секция (Bottom Sheet)

```json
{
  "overlay": {
    "id": "section-edit-recipient-bottomsheet",
    "style": {
      "display": {
        "reference": "${show_edit_recipient ? 'flex' : 'none'}",
        "value": "none"
      }
    }
  }
}
```

**Логика отображения:** 
- `show_edit_recipient === true` → `display: flex` (показан)
- `show_edit_recipient === false` → `display: none` (скрыт)

### 3. Backdrop (затемнённый фон)

```json
{
  "id": "bottomsheet-backdrop",
  "type": "column",
  "properties": {
    "event": "closeRecipientForm"
  },
  "style": {
    "flex": "1",
    "cursor": "pointer"
  }
}
```

**Действие:** При клике вызывает событие `closeRecipientForm` (закрытие без сохранения)

### 4. Кнопка "Сохранить получателя"

```json
{
  "id": "button-save-recipient",
  "type": "button",
  "properties": {
    "text": "Сохранить получателя",
    "event": "saveRecipient"
  }
}
```

**Действие:** При клике вызывает событие `saveRecipient` (сохранение и закрытие)

## Диаграмма потока данных

```
┌─────────────────────────────────────────────────────────────┐
│                     НАЧАЛЬНОЕ СОСТОЯНИЕ                     │
│                  show_edit_recipient = false                │
│                    Bottom Sheet скрыт                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ Пользователь нажимает
                              │ "Изменить получателя"
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     СОБЫТИЕ: showEditRecipient              │
│                   Переход на состояние:                     │
│                  show-edit-recipient-form                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ Устанавливает
                              │ show_edit_recipient = true
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   ТЕХНИЧЕСКОЕ СОСТОЯНИЕ                     │
│                  show_edit_recipient = true                 │
│                 Автоматический возврат на                   │
│                      checkout-screen                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Bottom Sheet показан                    │
│              display: flex (через биндинг)                  │
│                                                             │
│  Пользователь может:                                        │
│  1. Нажать на backdrop → closeRecipientForm                 │
│  2. Нажать "Сохранить" → saveRecipient                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ Любое из событий
                              │ закрытия
                              ▼
┌─────────────────────────────────────────────────────────────┐
│           СОБЫТИЕ: saveRecipient / closeRecipientForm       │
│                   Переход на состояние:                     │
│                  hide-edit-recipient-form                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ Устанавливает
                              │ show_edit_recipient = false
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   ТЕХНИЧЕСКОЕ СОСТОЯНИЕ                     │
│                 show_edit_recipient = false                 │
│                 Автоматический возврат на                   │
│                      checkout-screen                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Bottom Sheet скрыт                      │
│               display: none (через биндинг)                 │
└─────────────────────────────────────────────────────────────┘
```

## Ключевые особенности

### 1. **Реактивность через биндинги**
Bottom sheet автоматически показывается/скрывается при изменении `show_edit_recipient` благодаря биндингу:
```javascript
display: ${show_edit_recipient ? 'flex' : 'none'}
```

### 2. **Технические состояния**
Используются только для изменения контекста:
- Не имеют собственного UI
- Выполняют expressions
- Автоматически возвращаются на экран через transition

### 3. **Автоматический возврат**
После установки флага система автоматически возвращается на `checkout-screen` через:
```json
{
  "variable": "show_edit_recipient",
  "case": null,
  "state_id": "checkout-screen",
  "event": "_ready"
}
```

### 4. **Множественные способы закрытия**
- **Backdrop click** → `closeRecipientForm` (без сохранения)
- **Кнопка "Сохранить"** → `saveRecipient` (с сохранением)
- Оба ведут на `hide-edit-recipient-form` для скрытия

## Тестирование

### Сценарий 1: Открытие bottom sheet
1. Откройте экран "Оформление"
2. Нажмите "Изменить получателя"
3. ✅ Bottom sheet должен появиться снизу

### Сценарий 2: Закрытие через backdrop
1. Откройте bottom sheet
2. Нажмите на затемнённый фон (вне белого контейнера)
3. ✅ Bottom sheet должен закрыться
4. ✅ Данные не сохранены

### Сценарий 3: Сохранение данных
1. Откройте bottom sheet
2. Нажмите "Сохранить получателя"
3. ✅ Bottom sheet должен закрыться
4. ✅ Данные сохранены в контексте

## Расширение функциональности

### Добавление валидации перед сохранением

Можно добавить проверку данных в `edge-save-recipient`:

```json
{
  "id": "edge-save-recipient",
  "event": "saveRecipient",
  "target": "validate-recipient-data",
  "contextPatch": {
    "recipient_name": {
      "reference": "${eventParams.name}",
      "value": "Князева Екатерина"
    },
    "recipient_phone": {
      "reference": "${eventParams.phone}",
      "value": "+7 800 555-35-35"
    },
    "recipient_email": {
      "reference": "${eventParams.email}",
      "value": "catherineu@gmail.com"
    }
  }
}
```

### Добавление анимации

Анимация появления/скрытия может быть добавлена через CSS:

```css
.sandbox-section[data-slot="overlay"] {
  transition: opacity 0.3s ease;
}

.sandbox-section[data-slot="overlay"][style*="display: none"] {
  opacity: 0;
  pointer-events: none;
}

.sandbox-section[data-slot="overlay"][style*="display: flex"] {
  opacity: 1;
}
```

---

**Дата создания:** 19 октября 2025  
**Версия:** 1.0.0
**Связанные документы:** `bottomsheet-fix.md`
