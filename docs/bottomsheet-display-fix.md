# 🐛 Исправление: Bottom Sheet показывался по умолчанию

## Проблема

Bottom Sheet отображался при загрузке страницы, хотя переменная `show_edit_recipient` была установлена в `false` в начальном контексте.

## Причина

CSS правило с `!important` переопределяло inline стиль из JSON:

```css
/* БЫЛО (неправильно): */
.sandbox-section[data-slot="overlay"] {
  display: flex !important;  /* ← Это переопределяло display: none из JSON! */
}
```

Из-за `!important` CSS правило имело более высокий приоритет, чем inline стиль `display: none`, который должен был применяться по умолчанию.

## Решение

Убрали `display: flex !important;` из CSS, оставив управление `display` полностью на стороне JSON через биндинги:

```css
/* СТАЛО (правильно): */
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

## Как это работает

### 1. Начальное состояние (загрузка страницы)

**Контекст:**
```json
{
  "show_edit_recipient": false
}
```

**Биндинг в JSON:**
```json
{
  "display": {
    "reference": "${show_edit_recipient ? 'flex' : 'none'}",
    "value": "none"
  }
}
```

**Результат:** `display: none` → Bottom Sheet **скрыт** ✅

### 2. После нажатия "Изменить получателя"

**Контекст (обновлён):**
```json
{
  "show_edit_recipient": true
}
```

**Биндинг пересчитывается:**
```javascript
${show_edit_recipient ? 'flex' : 'none'}  // true ? 'flex' : 'none' → 'flex'
```

**Результат:** `display: flex` → Bottom Sheet **показан** ✅

### 3. После закрытия (backdrop или кнопка)

**Контекст (обновлён):**
```json
{
  "show_edit_recipient": false
}
```

**Биндинг пересчитывается:**
```javascript
${show_edit_recipient ? 'flex' : 'none'}  // false ? 'flex' : 'none' → 'none'
```

**Результат:** `display: none` → Bottom Sheet **скрыт** ✅

## Почему `!important` был проблемой

CSS специфичность и приоритеты:

```
!important > inline styles > CSS selectors
```

Но когда у CSS правила есть `!important`, оно переопределяет даже inline стили:

```html
<!-- Inline стиль -->
<div style="display: none">...</div>

<!-- CSS с !important переопределяет inline! -->
<style>
  div { display: flex !important; }  /* ← Побеждает! */
</style>
```

## Правильное использование `!important`

В нашем случае `!important` используется только для свойств позиционирования, которые **должны быть неизменными**:

✅ **Правильно:**
```css
.sandbox-section[data-slot="overlay"] {
  position: absolute !important;  /* Всегда absolute */
  top: 0 !important;              /* Всегда прижат к краям */
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  height: 100% !important;        /* Всегда на всю высоту */
}
```

❌ **Неправильно:**
```css
.sandbox-section[data-slot="overlay"] {
  display: flex !important;  /* Блокирует динамическое управление! */
}
```

## Проверка исправления

### Тест 1: Начальная загрузка
1. Откройте http://localhost:5174
2. Перейдите в Sandbox → Avito Demo
3. Откройте экран "Оформление"
4. ✅ Bottom Sheet **НЕ должен быть виден**

### Тест 2: Открытие
1. Нажмите "Изменить получателя"
2. ✅ Bottom Sheet **должен появиться** снизу

### Тест 3: Закрытие через backdrop
1. Нажмите на затемнённый фон
2. ✅ Bottom Sheet **должен закрыться**

### Тест 4: Закрытие через кнопку
1. Откройте bottom sheet снова
2. Нажмите "Сохранить получателя"
3. ✅ Bottom Sheet **должен закрыться**

## Отладка биндингов

Если bottom sheet всё ещё показывается неправильно, проверьте:

### 1. Значение в контексте
Откройте DevTools и проверьте контекст в Sandbox:
```javascript
// Должно быть false при загрузке
context.show_edit_recipient === false
```

### 2. Применённые стили
Инспектируйте элемент overlay в DevTools:
```css
/* При загрузке должно быть: */
style="display: none; ..."

/* После открытия: */
style="display: flex; ..."
```

### 3. Резолвинг биндинга
Проверьте, что биндинг правильно резолвится:
```json
{
  "reference": "${show_edit_recipient ? 'flex' : 'none'}",
  "value": "none"  // ← fallback значение
}
```

## Дополнительные улучшения

### Добавление transition для плавного появления

Можно добавить в CSS:
```css
.sandbox-section[data-slot="overlay"] {
  transition: opacity 0.3s ease;
}
```

И в JSON изменить логику:
```json
{
  "opacity": {
    "reference": "${show_edit_recipient ? 1 : 0}",
    "value": 0
  },
  "pointerEvents": {
    "reference": "${show_edit_recipient ? 'auto' : 'none'}",
    "value": "none"
  }
}
```

### Использование visibility вместо display

Альтернативный подход - использовать `visibility`:
```json
{
  "visibility": {
    "reference": "${show_edit_recipient ? 'visible' : 'hidden'}",
    "value": "hidden"
  }
}
```

Преимущество: элемент остаётся в DOM, что может улучшить производительность анимаций.

## Связанные файлы

- **CSS:** `/src/pages/Sandbox/SandboxPage.css`
- **JSON:** `/src/pages/Sandbox/data/avitoDemo.json`
- **Документация:** 
  - `/docs/bottomsheet-fix.md`
  - `/docs/bottomsheet-logic.md`

---

**Дата исправления:** 19 октября 2025  
**Версия:** 1.1.0  
**Статус:** ✅ Исправлено
