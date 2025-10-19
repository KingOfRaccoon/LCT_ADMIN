# Исправление: Резолвинг eventParams с учётом iteration context

## Дата: 19 октября 2025 г.

## Проблема

При нажатии на кнопки/чекбоксы внутри списков (list), `eventParams` НЕ резолвились с учётом `iterationStack`. Это приводило к тому, что вместо конкретных значений (например, `product.advertisement_id = 123`) на фронт отправлялись объекты вида:

```json
{
  "selected_item_id": {
    "reference": "${product.advertisement_id}",
    "value": 0
  }
}
```

## Решение

Добавлен резолвинг всех параметров в `eventParams` **ДО** вызова обработчика события, с учётом `iterationStack`.

## Изменённые файлы

### 1. `src/pages/Sandbox/components/ScreenComponents.jsx`

**Было:**
```jsx
const eventParams = props?.eventParams || {};

const handleClick = useCallback(() => {
  if (eventName && typeof onEvent === 'function') {
    onEvent(eventName, eventParams);
  }
}, [/* ... */]);
```

**Стало:**
```jsx
const rawEventParams = props?.eventParams || {};

// Резолвим eventParams с учётом iterationStack
const eventParams = useMemo(() => {
  const resolved = {};
  for (const [key, value] of Object.entries(rawEventParams)) {
    resolved[key] = resolveBindingValue(value, context, undefined, { iterationStack });
  }
  return resolved;
}, [rawEventParams, context, iterationStack]);

const handleClick = useCallback(() => {
  if (eventName && typeof onEvent === 'function') {
    onEvent(eventName, eventParams);
  }
}, [/* ... */]);
```

### 2. `src/pages/Sandbox/SandboxScreenRenderer.jsx`

**Checkbox - Было:**
```jsx
const handleChange = () => {
  if (!eventName || typeof onEvent !== 'function') {
    return;
  }
  onEvent(eventName);
};
```

**Checkbox - Стало:**
```jsx
// Резолвим eventParams с учётом iterationStack
const rawEventParams = props?.eventParams || {};
const eventParams = {};
for (const [key, value] of Object.entries(rawEventParams)) {
  eventParams[key] = resolveBindingValue(value, context, undefined, { iterationStack });
}

const handleChange = () => {
  if (!eventName || typeof onEvent !== 'function') {
    return;
  }
  onEvent(eventName, eventParams);
};
```

## Как это работает

### Пример: Кнопка "Удалить товар" в списке

#### 1. Определение в JSON
```json
{
  "type": "button",
  "properties": {
    "text": "🗑️",
    "event": "removeItem",
    "eventParams": {
      "selected_item_id": {
        "reference": "${product.advertisement_id}",
        "value": 0
      }
    }
  }
}
```

#### 2. Рендеринг с iterationStack
```javascript
iterationStack = [
  {
    alias: 'product',
    item: { advertisement_id: 123, name: 'iPhone', ... },
    index: 0,
    total: 3
  }
]
```

#### 3. Резолвинг eventParams
```javascript
// Вызывается resolveBindingValue для каждого параметра
resolveBindingValue(
  { reference: "${product.advertisement_id}", value: 0 },
  context,
  undefined,
  { iterationStack }
)
// Возвращает: 123
```

#### 4. Результат
```javascript
eventParams = {
  selected_item_id: 123  // ✅ Конкретное значение!
}
```

#### 5. Обработчик получает готовые данные
```javascript
onEvent('removeItem', { selected_item_id: 123 })
```

## Преимущества

✅ **Резолвинг на клиенте** - значения вычисляются до отправки события  
✅ **Простота на бэкенде** - получает готовые значения, не нужно резолвить reference  
✅ **Работает в списках** - корректно обрабатывает `iterationStack`  
✅ **Консистентность** - одинаковый подход для button и checkbox  
✅ **Отладка проще** - в логах видны конкретные значения, а не reference  

## Что дальше?

1. ✅ Резолвинг eventParams добавлен
2. ✅ Работает для button и checkbox
3. ⏭️ Проверить работу в Sandbox с реальными данными
4. ⏭️ Убедиться, что API запросы получают правильные параметры

## Связанные файлы

- `src/pages/Sandbox/components/ScreenComponents.jsx` - компонент Button
- `src/pages/Sandbox/SandboxScreenRenderer.jsx` - SSR рендеринг
- `src/pages/Sandbox/utils/bindings.js` - функция resolveBindingValue
- `docs/avitoDemo-eventparams-to-context.md` - предыдущая документация о eventParams

## Заключение

Теперь `eventParams` корректно резолвятся с учётом контекста списка (`iterationStack`), и обработчики событий получают готовые значения вместо объектов с `reference`. Это упрощает обработку на бэкенде и делает код более предсказуемым.
