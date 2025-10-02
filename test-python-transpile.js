/**
 * Тест транспиляции Python → JavaScript в биндингах
 */

import { transpilePythonToJs, safeEvalExpression, resolveReferenceWithPython } from './src/pages/Sandbox/utils/pythonToJs.js';

console.log('🧪 Тестирование транспиляции Python → JavaScript\n');

// Тестовый контекст
const testContext = {
  selected_items_count: 3,
  store: {
    name: 'Pear Store',
    rating: 4.8
  },
  cartItem: {
    advertisement_id: 5,
    price: 4990,
    title: 'MagSafe Charger',
    quantity: 2
  },
  inactive_product_ids: [3, 5, 7],
  cart_snapshot: {
    summary: {
      total_items: 3,
      total: 120979
    }
  }
};

// Тесты
const tests = [
  {
    name: 'Python str() → JavaScript String()',
    python: "${'Удалить (' + str(selected_items_count) + ')'}",
    expected: 'Удалить (3)'
  },
  {
    name: 'Python str() с числом',
    python: "${'⭐ ' + str(store.rating)}",
    expected: '⭐ 4.8'
  },
  {
    name: 'Простая конкатенация',
    python: "${cartItem.price + ' ₽'}",
    expected: '4990 ₽'
  },
  {
    name: 'Python тернарный оператор с in',
    python: "${'0.5' if cartItem.advertisement_id in inactive_product_ids else '1.0'}",
    expected: '0.5'
  },
  {
    name: 'Python тернарный оператор (цвет)',
    python: "${'#8E8E93' if cartItem.advertisement_id in inactive_product_ids else '#000000'}",
    expected: '#8E8E93'
  },
  {
    name: 'Python тернарный оператор (пустая строка)',
    python: "${'Недоступен' if cartItem.advertisement_id in inactive_product_ids else ''}",
    expected: 'Недоступен'
  },
  {
    name: 'Python тернарный оператор (display)',
    python: "${'inline-block' if cartItem.advertisement_id in inactive_product_ids else 'none'}",
    expected: 'inline-block'
  },
  {
    name: 'Сложное выражение с вложенными объектами',
    python: "${str(cart_snapshot.summary.total_items) + ' товара'}",
    expected: '3 товара'
  },
  {
    name: 'Сложное выражение с total',
    python: "${str(cart_snapshot.summary.total) + ' ₽'}",
    expected: '120979 ₽'
  },
  {
    name: 'Тест с элементом НЕ в списке',
    python: "${'visible' if 999 in inactive_product_ids else 'hidden'}",
    expected: 'hidden'
  }
];

// Запуск тестов
let passed = 0;
let failed = 0;

tests.forEach((test, index) => {
  console.log(`\n${index + 1}. ${test.name}`);
  console.log(`   Python: ${test.python}`);
  
  try {
    const result = resolveReferenceWithPython(test.python, testContext);
    const success = result === test.expected;
    
    if (success) {
      console.log(`   ✅ PASS: "${result}"`);
      passed++;
    } else {
      console.log(`   ❌ FAIL: got "${result}", expected "${test.expected}"`);
      failed++;
    }
  } catch (error) {
    console.log(`   ❌ ERROR: ${error.message}`);
    failed++;
  }
});

// Итоги
console.log('\n' + '='.repeat(50));
console.log(`\n📊 Результаты: ${passed}/${tests.length} тестов прошло`);
if (failed > 0) {
  console.log(`❌ Провалено: ${failed}`);
  process.exit(1);
} else {
  console.log('✅ Все тесты пройдены!');
  process.exit(0);
}
