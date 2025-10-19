/**
 * Тест сложного вложенного тернарного оператора
 * для склонения слова "товар"
 */

import { resolveBindingValue } from './src/pages/Sandbox/utils/bindings.js';

console.log('=== Тест склонения слова "товар" ===\n');

const testCases = [
  { count: 0, expected: '0 товаров' },
  { count: 1, expected: '1 товар' },
  { count: 2, expected: '2 товара' },
  { count: 3, expected: '3 товара' },
  { count: 4, expected: '4 товара' },
  { count: 5, expected: '5 товаров' },
  { count: 11, expected: '11 товаров' },
  { count: 21, expected: '21 товар' },
  { count: 22, expected: '22 товара' },
  { count: 25, expected: '25 товаров' },
  { count: 100, expected: '100 товаров' },
  { count: 101, expected: '101 товар' },
  { count: 102, expected: '102 товара' },
];

let passed = 0;
let failed = 0;

testCases.forEach(({ count, expected }) => {
  const context = {
    cart_response: {
      total_items_count: count
    }
  };

  const template = "${cart_response.total_items_count} ${cart_response.total_items_count === 1 ? 'товар' : (cart_response.total_items_count >= 2 && cart_response.total_items_count <= 4 ? 'товара' : 'товаров')}";
  
  const bindingValue = {
    reference: template,
    value: ""
  };
  
  try {
    const result = resolveBindingValue(bindingValue, context);
    
    if (result === expected) {
      console.log(`✅ ${count} → "${result}"`);
      passed++;
    } else {
      console.log(`❌ ${count} → Ожидалось: "${expected}", Получено: "${result}"`);
      failed++;
    }
  } catch (error) {
    console.log(`❌ ${count} → Ошибка: ${error.message}`);
    failed++;
  }
});

console.log(`\n=== Результаты ===`);
console.log(`✅ Пройдено: ${passed}/${testCases.length}`);
console.log(`❌ Провалено: ${failed}/${testCases.length}`);

if (failed === 0) {
  console.log(`\n🎉 Все тесты пройдены! Движок корректно обрабатывает сложные вложенные тернарные операторы.`);
  process.exit(0);
} else {
  console.log(`\n⚠️ Обнаружены проблемы при обработке выражения.`);
  process.exit(1);
}
