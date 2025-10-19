/**
 * Тест конкатенации строк в биндингах
 */

import { resolveBindingValue } from './src/pages/Sandbox/utils/bindings.js';

console.log('🧪 Тестирование конкатенации строк через оператор +\n');

// Тестовый контекст
const context = {
  cart_response: {
    total_amount: 15990,
    total_items_count: 3
  }
};

const iterationStack = [
  {
    alias: 'product',
    item: {
      price: 4990,
      item_total: 9980,
      quantity: 2,
      discount_percent: 15
    },
    index: 0,
    total: 3
  }
];

// Тесты
const tests = [
  {
    name: 'Простая конкатенация: цена + валюта',
    binding: { reference: "${product.price + ' ₽'}" },
    expected: '4990 ₽'
  },
  {
    name: 'Множественная конкатенация: стрелка + сумма + валюта',
    binding: { reference: "${'→ ' + product.item_total + ' ₽'}" },
    expected: '→ 9980 ₽'
  },
  {
    name: 'Конкатенация с минусом: скидка',
    binding: { reference: "${'-' + product.discount_percent + '%'}" },
    expected: '-15%'
  },
  {
    name: 'Сложная конкатенация: рейтинг магазина',
    binding: { reference: "${'⭐ ' + 4.8 + ' (' + 120 + ')'}" },
    expected: '⭐ 4.8 (120)'
  },
  {
    name: 'Конкатенация с тернарным оператором',
    binding: { reference: "${(cart_response.total_amount ? cart_response.total_amount : 0) + ' ₽'}" },
    expected: '15990 ₽'
  },
  {
    name: 'Арифметика + конкатенация',
    binding: { reference: "${product.quantity * product.price + ' ₽'}" },
    expected: '9980 ₽'
  }
];

console.log('Запуск тестов...\n');

let passed = 0;
let failed = 0;

tests.forEach((test, index) => {
  console.log(`Тест ${index + 1}: ${test.name}`);
  console.log(`  Input:    ${test.binding.reference}`);
  console.log(`  Context:  product =`, iterationStack[0].item);
  
  try {
    const result = resolveBindingValue(test.binding, context, undefined, { iterationStack });
    console.log(`  Output:   ${result}`);
    console.log(`  Expected: ${test.expected}`);
    console.log(`  Type:     ${typeof result}`);
    
    if (result === test.expected) {
      console.log(`  ✅ PASS\n`);
      passed++;
    } else {
      console.log(`  ❌ FAIL (${result} !== ${test.expected})\n`);
      failed++;
    }
  } catch (error) {
    console.log(`  ❌ ERROR: ${error.message}`);
    console.log(`  Stack: ${error.stack}\n`);
    failed++;
  }
});

console.log('═══════════════════════════════════════');
console.log(`Результаты: ${passed} пройдено, ${failed} провалено`);
console.log(failed === 0 ? '✅ Все тесты пройдены!' : '❌ Есть проваленные тесты');
