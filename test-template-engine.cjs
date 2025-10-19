/**
 * Сводный тест всех возможностей движка шаблонов
 */

const { resolveBindingValue } = require('./src/pages/Sandbox/utils/bindings.js');

console.log('╔═══════════════════════════════════════════════════════════════════╗');
console.log('║          СВОДНЫЙ ТЕСТ ДВИЖКА ШАБЛОНОВ                            ║');
console.log('╚═══════════════════════════════════════════════════════════════════╝\n');

const tests = {
  'Простые биндинги': [
    {
      input: { reference: '${product.name}' },
      context: { product: { name: 'iPhone 15 Pro' } },
      expected: 'iPhone 15 Pro'
    },
    {
      input: { reference: '${count}' },
      context: { count: 42 },
      expected: 42
    }
  ],
  
  'Простые шаблонные строки': [
    {
      input: { reference: 'Удалить (${count})' },
      context: { count: 0 },
      expected: 'Удалить (0)'
    },
    {
      input: { reference: 'Удалить (${count})' },
      context: { count: 5 },
      expected: 'Удалить (5)'
    }
  ],
  
  'Множественные выражения': [
    {
      input: { reference: '${a} + ${b} = ${c}' },
      context: { a: 2, b: 3, c: 5 },
      expected: '2 + 3 = 5'
    },
    {
      input: { reference: '${firstName} ${lastName}' },
      context: { firstName: 'Иван', lastName: 'Иванов' },
      expected: 'Иван Иванов'
    }
  ],
  
  'Тернарные операторы': [
    {
      input: { reference: '${count === 1 ? "товар" : "товаров"}' },
      context: { count: 1 },
      expected: 'товар'
    },
    {
      input: { reference: '${count === 1 ? "товар" : "товаров"}' },
      context: { count: 5 },
      expected: 'товаров'
    }
  ],
  
  'Операторы сравнения и математика': [
    {
      input: { reference: '${price > 1000 ? "дорого" : "доступно"}' },
      context: { price: 1500 },
      expected: 'дорого'
    },
    {
      input: { reference: '${count * 2}' },
      context: { count: 21 },
      expected: 42
    }
  ]
};

let totalPassed = 0;
let totalFailed = 0;

Object.entries(tests).forEach(([category, testCases]) => {
  console.log(`\n━━━ ${category} ━━━`);
  
  testCases.forEach((test) => {
    const result = resolveBindingValue(test.input, test.context, '');
    const success = result === test.expected;
    
    if (success) {
      console.log(`✅ ${test.input.reference}`);
      console.log(`   → ${JSON.stringify(result)}`);
      totalPassed++;
    } else {
      console.log(`❌ ${test.input.reference}`);
      console.log(`   Ожидалось: ${JSON.stringify(test.expected)}`);
      console.log(`   Получено:  ${JSON.stringify(result)}`);
      totalFailed++;
    }
  });
});

console.log('\n╔═══════════════════════════════════════════════════════════════════╗');
console.log(`║  ИТОГО: ✅ ${totalPassed}/${totalPassed + totalFailed} тестов пройдено${totalFailed === 0 ? '                                         ║' : `    ❌ ${totalFailed} провалено                            ║`}`);
console.log('╚═══════════════════════════════════════════════════════════════════╝');

if (totalFailed === 0) {
  console.log('\n🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ! Движок шаблонов работает корректно.\n');
} else {
  console.log('\n⚠️ ОБНАРУЖЕНЫ ОШИБКИ! Требуется доработка.\n');
}
