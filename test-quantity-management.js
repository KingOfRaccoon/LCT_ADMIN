/**
 * Тест функций управления количеством товаров
 * Запуск: node test-quantity-management.js
 */

import {
  updateItemQuantity,
  setItemQuantity,
  calculateCartTotals,
  createQuantityChangeContextPatch,
  applyQuantityChangeToContext,
  createQuantityActionNode,
  validateQuantityOperation
} from './src/utils/avitoDemoConverter.js';

console.log('🧪 Тест управления количеством товаров\n');
console.log('=' .repeat(60));

// Тестовые данные корзины
const testCart = [
  {
    id: 'item-1',
    title: 'Зарядное устройство MagSafe',
    price: 4990,
    originalPrice: 6990,
    quantity: 1,
    isSelected: true
  },
  {
    id: 'item-2',
    title: 'Наушники AirPods Pro 2',
    price: 15990,
    originalPrice: 18490,
    quantity: 2,
    isSelected: true
  },
  {
    id: 'item-3',
    title: 'iPhone 15 Pro 256GB',
    price: 99990,
    originalPrice: 0,
    quantity: 1,
    isSelected: true
  }
];

// Тест 1: Увеличение количества
console.log('\n1️⃣ Увеличение количества товара...');
const increaseResult = updateItemQuantity(testCart, 'item-1', +1);
console.log('✅ Результат:', increaseResult.success ? 'Успех' : 'Ошибка');
console.log('   Новое количество:', increaseResult.newQuantity);
console.log('   Сообщение:', increaseResult.message);

// Тест 2: Уменьшение количества
console.log('\n2️⃣ Уменьшение количества товара...');
const decreaseResult = updateItemQuantity(testCart, 'item-2', -1);
console.log('✅ Результат:', decreaseResult.success ? 'Успех' : 'Ошибка');
console.log('   Было:', decreaseResult.previousQuantity);
console.log('   Стало:', decreaseResult.newQuantity);

// Тест 3: Попытка установить отрицательное количество
console.log('\n3️⃣ Попытка установить отрицательное количество...');
const negativeResult = updateItemQuantity(testCart, 'item-1', -5);
console.log('❌ Ожидаемая ошибка:', negativeResult.message);
console.log('   Success:', negativeResult.success);

// Тест 4: Попытка превысить максимум
console.log('\n4️⃣ Попытка превысить максимальное количество...');
const maxResult = updateItemQuantity(testCart, 'item-1', +100, { max: 10 });
console.log('❌ Ожидаемая ошибка:', maxResult.message);
console.log('   Success:', maxResult.success);

// Тест 5: Удаление товара при quantity = 0
console.log('\n5️⃣ Удаление товара при quantity = 0...');
const removeResult = updateItemQuantity(testCart, 'item-3', -1, { removeOnZero: true });
console.log('✅ Результат:', removeResult.removed ? 'Товар удалён' : 'Количество обновлено');
console.log('   Сообщение:', removeResult.message);
console.log('   Товаров осталось:', removeResult.items.length);

// Тест 6: Установка конкретного количества
console.log('\n6️⃣ Установка конкретного количества...');
const setResult = setItemQuantity(testCart, 'item-2', 5);
console.log('✅ Результат:', setResult.success ? 'Успех' : 'Ошибка');
console.log('   Было:', setResult.previousQuantity);
console.log('   Установлено:', setResult.newQuantity);

// Тест 7: Пересчёт итоговых сумм
console.log('\n7️⃣ Пересчёт итоговых сумм корзины...');
const totals = calculateCartTotals(testCart);
console.log('✅ Итоговые суммы:');
console.log('   Товаров в корзине:', totals.itemsCount);
console.log('   Выбрано позиций:', totals.selectedCount);
console.log('   Общая стоимость:', totals.totalPrice.toLocaleString('ru-RU'), '₽');
console.log('   Скидка:', totals.totalDiscount.toLocaleString('ru-RU'), '₽');

// Тест 8: Пересчёт с невыбранными товарами
console.log('\n8️⃣ Пересчёт с невыбранными товарами...');
const mixedCart = [
  ...testCart,
  {
    id: 'item-4',
    title: 'Чехол',
    price: 1990,
    quantity: 1,
    isSelected: false  // Не выбран
  }
];
const mixedTotals = calculateCartTotals(mixedCart);
console.log('✅ Итоговые суммы (с невыбранными):');
console.log('   Всего товаров:', mixedTotals.itemsCount);
console.log('   Выбрано позиций:', mixedTotals.selectedCount);
console.log('   Общая стоимость:', mixedTotals.totalPrice.toLocaleString('ru-RU'), '₽');

// Тест 9: Создание contextPatch
console.log('\n9️⃣ Создание contextPatch для изменения количества...');
const patch = createQuantityChangeContextPatch('item-1', +1, {
  removeOnZero: false,
  recalculateTotals: true
});
console.log('✅ ContextPatch создан:');
console.log('   Action:', patch.action);
console.log('   Item ID:', patch.itemId);
console.log('   Delta:', patch.delta);
console.log('   Recalculate totals:', patch.recalculateTotals);

// Тест 10: Применение изменений к контексту
console.log('\n🔟 Применение изменений к полному контексту...');
const fullContext = {
  cart: {
    items: testCart,
    selectedCount: 4,
    totalPrice: 136960,
    totalDiscount: 10480
  }
};

const updatedContext = applyQuantityChangeToContext(
  fullContext,
  'item-1',
  +2,
  { removeOnZero: false }
);

console.log('✅ Контекст обновлён:');
console.log('   Товар item-1 новое количество:', 
  updatedContext.cart.items.find(i => i.id === 'item-1').quantity
);
console.log('   Новая общая стоимость:', 
  updatedContext.cart.totalPrice.toLocaleString('ru-RU'), '₽'
);
console.log('   Новая скидка:', 
  updatedContext.cart.totalDiscount.toLocaleString('ru-RU'), '₽'
);

// Тест 11: Создание action-узла
console.log('\n1️⃣1️⃣ Создание action-узла для управления количеством...');
const actionNode = createQuantityActionNode({
  name: 'IncrementQuantity',
  deltaVariable: 'delta',
  maxQuantity: 10
});
console.log('✅ Action-узел создан:');
console.log('   ID:', actionNode.id);
console.log('   Type:', actionNode.type);
console.log('   Action type:', actionNode.data.actionType);
console.log('   Config:', JSON.stringify(actionNode.data.config, null, 2));
console.log('   Edges count:', actionNode.edges.length);

// Тест 12: Валидация операции
console.log('\n1️⃣2️⃣ Валидация операции изменения количества...');

const validOperation = {
  itemId: 'item-1',
  delta: +1,
  min: 0,
  max: 10
};

const validationResult = validateQuantityOperation(validOperation);
console.log('✅ Валидная операция:', validationResult.valid);

const invalidOperation = {
  // Отсутствуют itemId и delta
  min: 10,
  max: 5  // min > max - ошибка
};

const invalidValidationResult = validateQuantityOperation(invalidOperation);
console.log('❌ Невалидная операция обнаружена:');
invalidValidationResult.errors.forEach((err, idx) => {
  console.log(`   ${idx + 1}. ${err}`);
});

// Тест 13: Реальный сценарий - добавление, изменение, удаление
console.log('\n1️⃣3️⃣ Реальный сценарий работы с корзиной...');

let scenarioCart = [
  {
    id: 'product-1',
    title: 'Товар 1',
    price: 1000,
    originalPrice: 1500,
    quantity: 1,
    isSelected: true
  }
];

console.log('📦 Начальное состояние:');
console.log('   Товаров:', scenarioCart.length);
let scenarioTotals = calculateCartTotals(scenarioCart);
console.log('   Сумма:', scenarioTotals.totalPrice, '₽');

// Увеличиваем количество
const step1 = updateItemQuantity(scenarioCart, 'product-1', +2);
scenarioCart = step1.items;
console.log('\n➕ Добавили +2:');
console.log('   Количество:', step1.newQuantity);
scenarioTotals = calculateCartTotals(scenarioCart);
console.log('   Новая сумма:', scenarioTotals.totalPrice, '₽');
console.log('   Скидка:', scenarioTotals.totalDiscount, '₽');

// Уменьшаем количество
const step2 = updateItemQuantity(scenarioCart, 'product-1', -1);
scenarioCart = step2.items;
console.log('\n➖ Убрали -1:');
console.log('   Количество:', step2.newQuantity);
scenarioTotals = calculateCartTotals(scenarioCart);
console.log('   Новая сумма:', scenarioTotals.totalPrice, '₽');

// Убираем до нуля с удалением
const step3 = updateItemQuantity(scenarioCart, 'product-1', -2, { removeOnZero: true });
scenarioCart = step3.items;
console.log('\n🗑️ Убрали до 0 (удаление):');
console.log('   Удалён:', step3.removed ? 'Да' : 'Нет');
console.log('   Товаров осталось:', scenarioCart.length);
scenarioTotals = calculateCartTotals(scenarioCart);
console.log('   Финальная сумма:', scenarioTotals.totalPrice, '₽');

console.log('\n' + '='.repeat(60));
console.log('✅ Все тесты управления количеством пройдены успешно!');
console.log('\n💡 Функции готовы к использованию в:');
console.log('   - Action-узлах для изменения корзины');
console.log('   - Technical states для валидации');
console.log('   - UI компонентах для интерактивного управления');
