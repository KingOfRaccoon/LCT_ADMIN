# Управление количеством товаров - Документация

## 📦 Обзор

Набор функций для управления количеством товаров в корзине, валидации операций и автоматического пересчёта итоговых сумм.

## 🎯 Возможности

- ✅ Увеличение/уменьшение количества товара
- ✅ Установка конкретного количества
- ✅ Валидация min/max значений
- ✅ Автоматическое удаление товара при quantity = 0
- ✅ Пересчёт итоговых сумм (цена, скидка)
- ✅ Учёт выбранных/невыбранных товаров
- ✅ Генерация contextPatch для применения изменений
- ✅ Создание action-узлов для workflow

## 📚 API Reference

### `updateItemQuantity(cartItems, itemId, delta, options)`

Изменяет количество товара на указанное значение.

**Параметры:**
- `cartItems` (Array) - массив товаров в корзине
- `itemId` (string) - ID товара для изменения
- `delta` (number) - изменение количества (+1, -1, +5, и т.д.)
- `options` (Object) - дополнительные опции:
  - `min` (number, default: 0) - минимальное количество
  - `max` (number, default: 99) - максимальное количество
  - `removeOnZero` (boolean, default: false) - удалять ли товар при quantity = 0

**Возвращает:**
```javascript
{
  success: boolean,
  items: Array,           // Обновлённый массив товаров
  message: string,
  previousQuantity: number,
  newQuantity: number,
  removed: boolean        // true если товар был удалён
}
```

**Пример:**
```javascript
const result = updateItemQuantity(cartItems, 'item-1', +1);

if (result.success) {
  console.log(`Quantity updated from ${result.previousQuantity} to ${result.newQuantity}`);
  // Используем обновлённый массив
  setCartItems(result.items);
}
```

---

### `setItemQuantity(cartItems, itemId, quantity, options)`

Устанавливает конкретное количество товара.

**Параметры:**
- `cartItems` (Array) - массив товаров
- `itemId` (string) - ID товара
- `quantity` (number) - новое количество
- `options` (Object):
  - `min` (number, default: 0)
  - `max` (number, default: 99)

**Возвращает:** аналогично `updateItemQuantity()`

**Пример:**
```javascript
// Установить количество = 5
const result = setItemQuantity(cartItems, 'item-1', 5);

if (result.success) {
  setCartItems(result.items);
}
```

---

### `calculateCartTotals(cartItems)`

Рассчитывает итоговые суммы корзины.

**Параметры:**
- `cartItems` (Array) - массив товаров

**Возвращает:**
```javascript
{
  selectedCount: number,    // Общее количество выбранных товаров
  totalPrice: number,       // Общая стоимость
  totalDiscount: number,    // Общая скидка
  itemsCount: number        // Количество позиций в корзине
}
```

**Пример:**
```javascript
const totals = calculateCartTotals(cartItems);

console.log(`Товаров: ${totals.selectedCount}`);
console.log(`К оплате: ${totals.totalPrice} ₽`);
console.log(`Скидка: ${totals.totalDiscount} ₽`);
```

**Примечание:** Функция учитывает только товары с `isSelected: true`

---

### `applyQuantityChangeToContext(context, itemId, delta, options)`

Применяет изменение количества к полному контексту с автоматическим пересчётом сумм.

**Параметры:**
- `context` (Object) - текущий контекст приложения
- `itemId` (string) - ID товара
- `delta` (number) - изменение количества
- `options` (Object):
  - `cartPath` (string, default: 'cart.items') - путь к массиву товаров в контексте
  - `removeOnZero` (boolean, default: false)
  - `min` (number, default: 0)
  - `max` (number, default: 99)

**Возвращает:** обновлённый контекст

**Пример:**
```javascript
const currentContext = {
  cart: {
    items: [...],
    selectedCount: 3,
    totalPrice: 100000
  }
};

const updated = applyQuantityChangeToContext(
  currentContext,
  'item-1',
  +1
);

// Контекст обновлён с пересчитанными суммами
console.log(updated.cart.totalPrice);
```

---

### `createQuantityChangeContextPatch(itemId, delta, options)`

Создаёт contextPatch для применения в workflow.

**Параметры:**
- `itemId` (string) - ID товара
- `delta` (number) - изменение количества
- `options` (Object):
  - `cartPath` (string, default: 'cart.items')
  - `removeOnZero` (boolean, default: false)
  - `recalculateTotals` (boolean, default: true)

**Возвращает:**
```javascript
{
  action: 'update_item_quantity',
  itemId: string,
  delta: number,
  cartPath: string,
  removeOnZero: boolean,
  recalculateTotals: boolean
}
```

**Пример:**
```javascript
const patch = createQuantityChangeContextPatch('item-1', +1);

// Используется в edge.contextPatch
edge.contextPatch = patch;
```

---

### `createQuantityActionNode(config)`

Создаёт action-узел для управления количеством в workflow.

**Параметры:**
- `config` (Object):
  - `id` (string) - ID узла
  - `name` (string, default: 'UpdateQuantity')
  - `itemIdVariable` (string, default: 'itemId')
  - `deltaVariable` (string, default: 'quantityDelta')
  - `minQuantity` (number, default: 0)
  - `maxQuantity` (number, default: 99)
  - `removeOnZero` (boolean, default: false)

**Возвращает:** Action-узел в формате avitoDemo

**Пример:**
```javascript
const actionNode = createQuantityActionNode({
  name: 'IncrementQuantity',
  deltaVariable: 'delta',
  maxQuantity: 10
});

// Добавляем в граф
nodes.push(actionNode);
```

---

### `validateQuantityOperation(operation)`

Валидирует операцию изменения количества.

**Параметры:**
- `operation` (Object):
  - `itemId` или `itemIdVariable` (string) - ID товара
  - `delta`, `deltaVariable` или `quantity` - изменение/установка количества
  - `min` (number) - минимум
  - `max` (number) - максимум

**Возвращает:**
```javascript
{
  valid: boolean,
  errors: Array<string>
}
```

**Пример:**
```javascript
const validation = validateQuantityOperation({
  itemId: 'item-1',
  delta: +1,
  min: 0,
  max: 10
});

if (!validation.valid) {
  console.error('Errors:', validation.errors);
}
```

---

## 💡 Примеры использования

### Пример 1: Кнопки +/- в UI корзины

```javascript
import { 
  updateItemQuantity, 
  calculateCartTotals 
} from '@/utils/avitoDemoConverter';

function CartItem({ item, onUpdate }) {
  const handleIncrement = () => {
    const result = updateItemQuantity(
      cartItems,
      item.id,
      +1,
      { max: 10 }
    );
    
    if (result.success) {
      onUpdate(result.items);
      
      // Пересчитываем суммы
      const totals = calculateCartTotals(result.items);
      updateTotals(totals);
    } else {
      showError(result.message);
    }
  };

  const handleDecrement = () => {
    const result = updateItemQuantity(
      cartItems,
      item.id,
      -1,
      { removeOnZero: true }
    );
    
    if (result.success) {
      if (result.removed) {
        showNotification(`${item.title} удалён из корзины`);
      }
      onUpdate(result.items);
    }
  };

  return (
    <div className="cart-item">
      <h3>{item.title}</h3>
      <div className="quantity-controls">
        <button onClick={handleDecrement}>−</button>
        <span>{item.quantity}</span>
        <button onClick={handleIncrement}>+</button>
      </div>
    </div>
  );
}
```

### Пример 2: Action-узел в workflow для изменения количества

```javascript
// В ScreenEditor при создании нового узла
import { createQuantityActionNode } from '@/utils/avitoDemoConverter';

const handleAddQuantityAction = () => {
  const node = createQuantityActionNode({
    name: 'UpdateCartItemQuantity',
    itemIdVariable: 'selectedItemId',
    deltaVariable: 'quantityChange',
    maxQuantity: 99,
    removeOnZero: true
  });
  
  // Добавляем на граф
  addNode(node);
};
```

### Пример 3: Интеграция с сервером (Sandbox)

```javascript
// В ApiSandboxRunner.jsx
import { applyQuantityChangeToContext } from '@/utils/avitoDemoConverter';

async function handleQuantityChange(itemId, delta) {
  // Отправка на сервер
  const response = await fetch('/api/action', {
    method: 'POST',
    body: JSON.stringify({
      action: 'update_quantity',
      itemId,
      delta
    })
  });
  
  const data = await response.json();
  
  // Или применяем локально
  const updated = applyQuantityChangeToContext(
    currentContext,
    itemId,
    delta,
    { removeOnZero: true }
  );
  
  setContext(updated);
}
```

### Пример 4: Валидация перед сохранением

```javascript
import { validateQuantityOperation } from '@/utils/avitoDemoConverter';

function QuantityActionEditor({ action, onSave }) {
  const handleSave = () => {
    const validation = validateQuantityOperation(action.config);
    
    if (!validation.valid) {
      showErrors(validation.errors);
      return;
    }
    
    onSave(action);
  };

  return (
    <div>
      <input 
        placeholder="Item ID Variable"
        value={action.config.itemIdVariable}
        onChange={(e) => updateConfig('itemIdVariable', e.target.value)}
      />
      <input 
        type="number"
        placeholder="Min quantity"
        value={action.config.min}
        onChange={(e) => updateConfig('min', parseInt(e.target.value))}
      />
      <button onClick={handleSave}>Save</button>
    </div>
  );
}
```

### Пример 5: Пересчёт при выборе/снятии выбора товаров

```javascript
import { calculateCartTotals } from '@/utils/avitoDemoConverter';

function CartSummary({ cartItems }) {
  const totals = useMemo(
    () => calculateCartTotals(cartItems),
    [cartItems]
  );
  
  return (
    <div className="cart-summary">
      <div>
        <span>Товаров выбрано:</span>
        <strong>{totals.selectedCount}</strong>
      </div>
      <div>
        <span>Сумма:</span>
        <strong>{totals.totalPrice.toLocaleString('ru-RU')} ₽</strong>
      </div>
      {totals.totalDiscount > 0 && (
        <div className="discount">
          <span>Скидка:</span>
          <strong>{totals.totalDiscount.toLocaleString('ru-RU')} ₽</strong>
        </div>
      )}
    </div>
  );
}
```

### Пример 6: Обработка на сервере (Node.js)

```javascript
// server/js/handlers/quantityHandler.js
import { updateItemQuantity, calculateCartTotals } from '../utils/converter.js';

export function handleQuantityUpdate(session, action) {
  const { itemId, delta } = action;
  const cartItems = session.cart?.items || [];
  
  // Обновляем количество
  const result = updateItemQuantity(
    cartItems,
    itemId,
    delta,
    { 
      min: 0, 
      max: 99, 
      removeOnZero: true 
    }
  );
  
  if (!result.success) {
    return {
      success: false,
      error: result.message
    };
  }
  
  // Пересчитываем суммы
  const totals = calculateCartTotals(result.items);
  
  // Обновляем сессию
  session.cart = {
    ...session.cart,
    items: result.items,
    ...totals
  };
  
  return {
    success: true,
    context: session,
    message: result.message
  };
}
```

## 🔄 Интеграция с существующими компонентами

### SandboxScreenRenderer

```javascript
// Добавление обработчика событий изменения количества
import { applyQuantityChangeToContext } from '@/utils/avitoDemoConverter';

const handleQuantityEvent = (itemId, delta) => {
  const updated = applyQuantityChangeToContext(
    context,
    itemId,
    delta,
    { removeOnZero: true }
  );
  
  setContext(updated);
  
  // Добавляем в историю
  addToHistory({
    action: 'quantity_updated',
    itemId,
    delta,
    newContext: updated
  });
};
```

### VirtualContext reducer

```javascript
// Добавление в редьюсер
case 'UPDATE_ITEM_QUANTITY': {
  const { itemId, delta } = action.payload;
  
  const updated = applyQuantityChangeToContext(
    state.context,
    itemId,
    delta
  );
  
  return {
    ...state,
    context: updated
  };
}
```

## ⚙️ Конфигурация

### Настройка лимитов по умолчанию

```javascript
// В константах проекта
export const QUANTITY_LIMITS = {
  MIN: 0,
  MAX: 99,
  DEFAULT: 1,
  REMOVE_ON_ZERO: true
};

// Использование
updateItemQuantity(items, id, delta, {
  min: QUANTITY_LIMITS.MIN,
  max: QUANTITY_LIMITS.MAX,
  removeOnZero: QUANTITY_LIMITS.REMOVE_ON_ZERO
});
```

### Кастомизация путей в контексте

```javascript
// Если товары находятся не в cart.items
const updated = applyQuantityChangeToContext(
  context,
  itemId,
  delta,
  { cartPath: 'order.products' }
);
```

## ✅ Best Practices

1. **Всегда используйте валидацию:**
   ```javascript
   const validation = validateQuantityOperation(operation);
   if (!validation.valid) {
     // Обработка ошибок
   }
   ```

2. **Пересчитывайте суммы после изменений:**
   ```javascript
   const result = updateItemQuantity(...);
   if (result.success) {
     const totals = calculateCartTotals(result.items);
     updateCartTotals(totals);
   }
   ```

3. **Обрабатывайте удаление товаров:**
   ```javascript
   if (result.removed) {
     showNotification(`Товар удалён из корзины`);
   }
   ```

4. **Используйте useMemo для пересчёта:**
   ```javascript
   const totals = useMemo(
     () => calculateCartTotals(cartItems),
     [cartItems]
   );
   ```

5. **Логируйте изменения для отладки:**
   ```javascript
   console.log(`Quantity changed: ${result.previousQuantity} → ${result.newQuantity}`);
   ```

## 🧪 Тестирование

Запустите тест:
```bash
node test-quantity-management.js
```

Ожидаемый результат: ✅ Все 13 тестов пройдены

## 🔗 См. также

- [Technical States Converter](./TECHNICAL_STATES_CONVERTER.md)
- [Sandbox Navigation Guide](./sandbox-navigation-guide.md)
- [Avito Demo Integration](./AVITO_DEMO_INTEGRATION.md)
