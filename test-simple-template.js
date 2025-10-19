/**
 * Тест простой шаблонной строки с одним выражением
 */

import { resolveBindingValue } from './src/pages/Sandbox/utils/bindings.js';

console.log('=== Тест простой шаблонной строки ===\n');

const testCases = [
  { count: 0, expected: 'Удалить (0)' },
  { count: 1, expected: 'Удалить (1)' },
  { count: 5, expected: 'Удалить (5)' },
  { count: 42, expected: 'Удалить (42)' },
];

let passed = 0;
let failed = 0;

testCases.forEach(({ count, expected }) => {
  const context = {
    cart_response: {
      total_items_count: count
    }
  };

  const template = "Удалить (${cart_response.total_items_count})";
  
  const bindingValue = {
    reference: template,
    value: "Удалить (0)"
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
  console.log(`\n🎉 Все тесты пройдены! Простая шаблонная строка работает корректно.`);
  process.exit(0);
} else {
  console.log(`\n⚠️ Обнаружены проблемы.`);
  process.exit(1);
}
