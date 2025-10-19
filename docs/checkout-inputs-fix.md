# Исправление: Карточки не работали из-за отсутствия inputs в initialContext

## Проблема
При клике на карточки способов доставки и оплаты ничего не происходило, переменные не обновлялись в контексте.

## Причина
`handleInputChange` в `SandboxPage.jsx` сохраняет значения в контекст с префиксом `inputs.`:
```javascript
setContextState((prev) => {
  const next = applyContextPatch(prev, { [`inputs.${name}`]: value }, prev);
  return next;
});
```

Это означает:
- При вызове: `onInputChange('selected_delivery_method', 'card-delivery-post')`
- Значение сохраняется по пути: `inputs.selected_delivery_method`
- В биндингах используется: `${inputs.selected_delivery_method}`

**НО** в `initialContext` не было объекта `inputs`, поэтому:
- `applyContextPatch` пытался создать путь `inputs.selected_delivery_method`
- Но без начального объекта `inputs` это могло не работать корректно
- В панели контекста переменные не появлялись

## Решение
Добавили объект `inputs` в `initialContext` с начальными значениями:

```json
{
  "initialContext": {
    // ... другие переменные
    "selected_delivery_method": "card-delivery-avito",
    "selected_payment_method": "row-payment-wallet",
    "inputs": {
      "selected_delivery_method": "card-delivery-avito",
      "selected_payment_method": "row-payment-wallet"
    }
  }
}
```

## Почему это работает
1. ✅ Объект `inputs` уже существует при инициализации
2. ✅ `applyContextPatch` может безопасно обновлять `inputs.selected_delivery_method`
3. ✅ Биндинги `${inputs.selected_delivery_method}` находят значение
4. ✅ UI обновляется моментально при клике

## Дополнительное логирование
Для отладки добавлены console.log в:
- `CardComponent.handleClick` - показывает клик и вызов onInputChange
- `SandboxPage.handleInputChange` - показывает обновление контекста

Логи можно убрать после подтверждения работоспособности.

## Проверка
1. Открыть avitoDemo → checkout-screen
2. Кликнуть на карточку "Почта России"
3. **Ожидаемый результат**:
   - Черная рамка вокруг карточки
   - Иконка галочки появляется
   - В панели контекста: `inputs.selected_delivery_method = card-delivery-post`
   - В консоли: логи обновления контекста
