# Резюме: Исправление резолвинга eventParams

## Проблема
При нажатии на кнопки/чекбоксы в списках параметры `eventParams` НЕ резолвились, и вместо конкретных значений (например, `123`) отправлялись объекты с `reference`:

```json
{
  "selected_item_id": {
    "reference": "${product.advertisement_id}",
    "value": 0
  }
}
```

## Решение
Добавлен резолвинг всех параметров в `eventParams` с учётом `iterationStack` **ДО** вызова обработчика события.

## Изменённые файлы
1. ✅ `src/pages/Sandbox/components/ScreenComponents.jsx` - компонент Button
2. ✅ `src/pages/Sandbox/SandboxScreenRenderer.jsx` - SSR checkbox

## Результат
Теперь обработчики получают готовые значения:

```javascript
eventParams = {
  selected_item_id: 123,  // ✅ Конкретное значение!
  quantity_change: 2      // ✅ Конкретное значение!
}
```

## Тестирование
✅ Все тесты в `test-eventparams-resolution.js` прошли успешно

## Документация
📄 `docs/eventParams-resolution-fix.md` - полная документация
