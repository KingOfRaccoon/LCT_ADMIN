/**
 * Тест простых биндингов (без текста вокруг ${})
 * Цель: убедиться, что ${variable} обрабатывается правильно как простой биндинг
 */

const { resolveBindingValue } = require('./src/pages/Sandbox/utils/bindings.js');

console.log('=== Тест простых биндингов ===\n');

const testCases = [
  {
    binding: { reference: '${product.name}' },
    context: { product: { name: 'iPhone 15 Pro' } },
    expected: 'iPhone 15 Pro',
    description: 'Вложенное свойство объекта'
  },
  {
    binding: { reference: '${count}' },
    context: { count: 42 },
    expected: 42,
    description: 'Простая переменная (число)'
  },
  {
    binding: { reference: '${title}' },
    context: { title: 'Заголовок' },
    expected: 'Заголовок',
    description: 'Простая переменная (строка)'
  },
  {
    binding: { reference: '${cart_response.total_items_count}' },
    context: { cart_response: { total_items_count: 5 } },
    expected: 5,
    description: 'Глубоко вложенное свойство'
  }
];

let passed = 0;
let failed = 0;

testCases.forEach(({ binding, context, expected, description }) => {
  console.log(`\nПроверяем: ${binding.reference}`);
  console.log(`  Контекст:`, JSON.stringify(context, null, 2));
  
  const result = resolveBindingValue(binding, context, '');
  console.log(`  Результат:`, JSON.stringify(result));
  console.log(`  Ожидается:`, JSON.stringify(expected));
  
  const success = result === expected;
  
  if (success) {
    console.log(`✅ УСПЕХ (${description})`);
    passed++;
  } else {
    console.log(`❌ ПРОВАЛ (${description})`);
    failed++;
  }
});

console.log('=== Результаты ===');
console.log(`✅ Пройдено: ${passed}/${testCases.length}`);
console.log(`❌ Провалено: ${failed}/${testCases.length}`);

if (failed === 0) {
  console.log('\n🎉 Все тесты пройдены! Простые биндинги работают корректно.');
} else {
  console.log('\n⚠️ Некоторые тесты провалились. Простые биндинги обрабатываются неправильно.');
}
