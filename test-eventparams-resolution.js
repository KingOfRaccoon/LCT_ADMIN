/**
 * Тест резолвинга eventParams с учётом iterationStack
 * 
 * Проверяет, что eventParams корректно резолвятся из контекста списка
 */

import { resolveBindingValue } from './src/pages/Sandbox/utils/bindings.js';

// Тестовые данные
const context = {
  cart_response: {
    shop_groups: [
      {
        shop_id: 14,
        shop_name: 'Магазин 1',
        items: [
          { advertisement_id: 101, name: 'iPhone 15', quantity: 2 },
          { advertisement_id: 102, name: 'MacBook Pro', quantity: 1 }
        ]
      }
    ]
  }
};

// Имитируем iterationStack для первого товара
const iterationStack = [
  {
    alias: 'shop',
    item: context.cart_response.shop_groups[0],
    index: 0,
    total: 1
  },
  {
    alias: 'product',
    item: context.cart_response.shop_groups[0].items[0],
    index: 0,
    total: 2
  }
];

// Тест 1: Резолвинг advertisement_id из product
console.log('=== Тест 1: Резолвинг advertisement_id ===');
const eventParam1 = {
  reference: '${product.advertisement_id}',
  value: 0
};
const resolved1 = resolveBindingValue(eventParam1, context, undefined, { iterationStack });
console.log('Input:', eventParam1);
console.log('Output:', resolved1);
console.log('Expected: 101');
console.log('Status:', resolved1 === 101 ? '✅ PASS' : '❌ FAIL');

// Тест 2: Резолвинг quantity из product
console.log('\n=== Тест 2: Резолвинг quantity ===');
const eventParam2 = {
  reference: '${product.quantity}',
  value: 1
};
const resolved2 = resolveBindingValue(eventParam2, context, undefined, { iterationStack });
console.log('Input:', eventParam2);
console.log('Output:', resolved2);
console.log('Expected: 2');
console.log('Status:', resolved2 === 2 ? '✅ PASS' : '❌ FAIL');

// Тест 3: Резолвинг shop_id из shop
console.log('\n=== Тест 3: Резолвинг shop_id ===');
const eventParam3 = {
  reference: '${shop.shop_id}',
  value: 0
};
const resolved3 = resolveBindingValue(eventParam3, context, undefined, { iterationStack });
console.log('Input:', eventParam3);
console.log('Output:', resolved3);
console.log('Expected: 14');
console.log('Status:', resolved3 === 14 ? '✅ PASS' : '❌ FAIL');

// Тест 4: Полный резолвинг eventParams (как в реальном коде)
console.log('\n=== Тест 4: Полный резолвинг eventParams ===');
const rawEventParams = {
  selected_item_id: {
    reference: '${product.advertisement_id}',
    value: 0
  },
  quantity_change: {
    reference: '${product.quantity}',
    value: 1
  }
};

const resolvedEventParams = {};
for (const [key, value] of Object.entries(rawEventParams)) {
  resolvedEventParams[key] = resolveBindingValue(value, context, undefined, { iterationStack });
}

console.log('Input:', JSON.stringify(rawEventParams, null, 2));
console.log('Output:', JSON.stringify(resolvedEventParams, null, 2));
console.log('Expected:', JSON.stringify({
  selected_item_id: 101,
  quantity_change: 2
}, null, 2));
console.log('Status:', 
  resolvedEventParams.selected_item_id === 101 && 
  resolvedEventParams.quantity_change === 2 
    ? '✅ PASS' 
    : '❌ FAIL'
);

// Тест 5: Резолвинг для второго товара
console.log('\n=== Тест 5: Резолвинг для второго товара ===');
const iterationStack2 = [
  {
    alias: 'shop',
    item: context.cart_response.shop_groups[0],
    index: 0,
    total: 1
  },
  {
    alias: 'product',
    item: context.cart_response.shop_groups[0].items[1], // Второй товар
    index: 1,
    total: 2
  }
];

const resolved5 = resolveBindingValue(eventParam1, context, undefined, { iterationStack: iterationStack2 });
console.log('Product:', context.cart_response.shop_groups[0].items[1].name);
console.log('Output:', resolved5);
console.log('Expected: 102');
console.log('Status:', resolved5 === 102 ? '✅ PASS' : '❌ FAIL');

console.log('\n=== Все тесты завершены ===');
