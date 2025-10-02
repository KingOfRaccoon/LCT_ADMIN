# Исправление проблемы "Нет элементов" в корзине

## 🐛 Описание проблемы

При отображении экрана `CartOverviewScreen` показывалось "Нет элементов", хотя API возвращал данные о товарах в корзине.

**Причина:** API возвращал `cart_snapshot: "None"` (строка), а схема экрана пыталась обратиться к `${cart_snapshot.stores}`, что приводило к `undefined` → пустой массив → "Нет элементов".

## ✅ Реализованные исправления

### 1. Защита на уровне биндингов
**Файл:** `src/pages/Sandbox/utils/bindings.js`

Добавлена проверка в функцию `getContextValue()`:
- Строковые "пустышки" (`"None"`, `"null"`, `"undefined"`) теперь обрабатываются как `undefined`
- Защита от попытки обращения к свойствам примитивных значений (строк/чисел)

```javascript
// Защита от null, undefined и строковых заглушек типа "None"
if (acc === undefined || acc === null || acc === 'None' || acc === 'null' || acc === 'undefined') {
  return undefined;
}

// Если acc — примитив (строка/число/boolean), но не объект/массив, дальше идти нельзя
if (typeof acc !== 'object') {
  return undefined;
}
```

### 2. Нормализация контекста от API
**Файл:** `src/services/clientWorkflowApi.js`

Добавлена функция `normalizeContext()`, которая:
- Преобразует `"None"`, `"null"`, `"undefined"` → `null`
- Парсит JSON-строки (с одинарными кавычками от Python) в объекты/массивы

```javascript
function normalizeContext(context) {
  const normalized = {};
  
  for (const [key, value] of Object.entries(context)) {
    // Преобразуем строковые пустышки в null
    if (value === 'None' || value === 'null' || value === 'undefined') {
      normalized[key] = null;
      continue;
    }

    // Преобразуем строковые булевы значения (Python → "True"/"False")
    if (value === 'False' || value === 'false') {
      normalized[key] = false;
      continue;
    }
    if (value === 'True' || value === 'true') {
      normalized[key] = true;
      continue;
    }

    // Парсим JSON-строки (Python использует одинарные кавычки)
    if (typeof value === 'string' && (value.startsWith('[') || value.startsWith('{'))) {
      try {
        const jsonString = value.replace(/'/g, '"');
        normalized[key] = JSON.parse(jsonString);
        continue;
      } catch {
        // Не удалось распарсить — оставляем как есть
      }
    }

    normalized[key] = value;
  }

  return normalized;
}
```

Нормализация применяется во всех методах API:
- `startClientWorkflow()`
- `sendClientAction()`
- `getCurrentWorkflowState()`
- `resetClientWorkflow()`

## 🎯 Результат

### До исправления:
```json
{
  "cart_snapshot": "None",  // или "False"
  "init_done": "True",
  "stores_catalog": "[{'id': 201, 'name': 'Pear Store'}]"
}
```
→ `cart_snapshot.stores` = `undefined` → "Нет элементов"

### После исправления:
```json
{
  "cart_snapshot": null,  // "None" → null
  "init_done": true,      // "True" → true
  "stores_catalog": [{"id": 201, "name": "Pear Store"}]  // JSON распарсен
}
```
→ Биндинг использует fallback-значение → корректное отображение

## 🧪 Тестирование

Создан тест `test-context-normalization.js`:

```bash
node test-context-normalization.js
```

**Результат:**
```
✅ cart_snapshot: false (булев)
✅ cart_snapshot_error_flag: false
✅ init_done: true
✅ recommended_products: array
✅ stores_catalog: array
✅ selected_items: array (не изменено)
✅ checkout_error: object (не изменено)
```

## 📚 Связанные файлы

- `src/pages/Sandbox/utils/bindings.js` — защита биндингов
- `src/services/clientWorkflowApi.js` — нормализация API
- `test-context-normalization.js` — тест нормализации

## 🔮 Рекомендации

1. **Для бэкенда:** Рассмотрите возможность возвращать корректные JSON-объекты вместо строковых представлений
2. **Для фронтенда:** Добавить визуальный индикатор для случаев, когда `cart_snapshot === null` (пустая корзина vs ошибка загрузки)
3. **Мониторинг:** Отслеживать случаи, когда API возвращает `"None"` для критически важных полей

---
**Дата:** 2 октября 2025
**Статус:** ✅ Исправлено и протестировано
