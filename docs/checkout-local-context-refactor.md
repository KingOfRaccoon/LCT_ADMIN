# Рефакторинг: Локальный контекст для выбора способов доставки и оплаты

## Проблема
Изначально выбор способов доставки и оплаты реализовывался через события и переходы (edges) в state machine:
- Каждый клик на карточку триггерил событие
- Событие приводило к переходу (edge) с `contextPatch`
- Это создавало избыточные переходы между состояниями

## Решение
Рефакторинг на использование локального контекста:
- Клик на карточку обновляет контекст напрямую через `onInputChange`
- UI обновляется моментально без state transitions
- Финальные значения отправляются только при нажатии "Перейти к оплате"

## Изменения

### 1. avitoDemo.json

#### Добавлены переменные контекста:
```json
"variableSchemas": {
  "selected_delivery_method": {
    "id": "selected_delivery_method",
    "type": "string",
    "name": "Выбранный способ доставки"
  },
  "selected_payment_method": {
    "id": "selected_payment_method",
    "type": "string",
    "name": "Выбранный способ оплаты"
  }
}
```

#### Удалены edges для выбора:
```json
// УДАЛЕНО:
// "selectDeliveryMethod": { event: "selectDeliveryMethod", contextPatch: {...} }
// "selectPaymentMethod": { event: "selectPaymentMethod", contextPatch: {...} }
```

#### Оставлен только edge для финального перехода:
```json
"proceedToPayment": {
  "event": "proceedToPayment",
  "target": "order-success",
  "contextPatch": {
    "final_delivery_method": "${selected_delivery_method}",
    "final_payment_method": "${selected_payment_method}"
  }
}
```

#### Обновлены карточки:
```json
// БЫЛО:
{
  "type": "card",
  "event": "selectDeliveryMethod",
  "eventParams": { "method_id": "card-delivery-post" }
}

// СТАЛО:
{
  "type": "card",
  "inputName": "selected_delivery_method",
  "inputValue": "card-delivery-post"
}
```

### 2. ScreenComponents.jsx

Обновлен `CardComponent`:
```javascript
const CardComponent = React.memo(({
  component,
  context,
  iterationStack = [],
  onEvent,
  onInputChange,  // 🆕 Новый prop
  // ...
}) => {
  // Извлекаем новые properties
  const inputName = component?.properties?.inputName ?? null;
  const inputValue = component?.properties?.inputValue ?? null;
  
  const handleClick = useCallback(() => {
    // Приоритет для inputName/inputValue
    if (inputName && inputValue && typeof onInputChange === 'function') {
      onInputChange(inputName, inputValue);
    } else if (eventName && typeof onEvent === 'function') {
      onEvent(eventName, eventParams);
    }
  }, [inputName, inputValue, onInputChange, eventName, eventParams, onEvent]);
  
  // Карточка кликабельна если есть inputName или eventName
  const isClickable = eventName || (inputName && inputValue);
  // ...
});
```

### 3. SandboxScreenRenderer.jsx

Добавлен проброс `onInputChange`:
```javascript
case 'card': {
  return (
    <CardComponent
      // ...
      onInputChange={onInputChange}  // 🆕 Передаем callback
      // ...
    >
      {renderChildren(component, iterationStack)}
    </CardComponent>
  );
}
```

## Результат

### Флоу работы:
1. 👆 Пользователь кликает на карточку доставки "Почта России"
2. ⚡ `CardComponent` вызывает `onInputChange('selected_delivery_method', 'card-delivery-post')`
3. 💾 Контекст обновляется локально: `{ selected_delivery_method: 'card-delivery-post' }`
4. 🎨 UI моментально показывает выбор через биндинг `${selected_delivery_method === 'card-delivery-post'}`
5. 👆 Пользователь выбирает оплату, затем жмет "Перейти к оплате"
6. 🚀 Срабатывает edge `proceedToPayment` с `contextPatch`, который копирует финальные значения
7. ✅ Переход в `order-success` с `final_delivery_method` и `final_payment_method` в контексте

### Преимущества:
- ✅ Меньше состояний в state machine
- ✅ Быстрее UI отклик (нет лишних transitions)
- ✅ Проще логика (локальный стейт → финальная отправка)
- ✅ Более предсказуемое поведение

### Обратная совместимость:
`CardComponent` поддерживает оба подхода:
- Если есть `inputName`/`inputValue` → использует `onInputChange`
- Если есть только `event`/`eventParams` → использует `onEvent` (старый способ)

## Тестирование

1. Открыть checkout-screen в avitoDemo
2. Кликнуть на карточку доставки → должна подсветиться
3. Кликнуть на другую карточку → предыдущая сбросится, новая подсветится
4. Кликнуть на способ оплаты → должен подсветиться
5. Нажать "Перейти к оплате" → переход в order-success с правильными ID
