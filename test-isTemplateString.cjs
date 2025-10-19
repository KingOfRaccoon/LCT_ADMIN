// Тест isTemplateString логики
const isTemplateString = (str) => {
  if (!str || typeof str !== 'string') return false;
  
  const matches = str.match(/\$\{[^}]+\}/g);
  if (!matches || matches.length === 0) return false;
  
  if (matches.length === 1) {
    const cleaned = str.trim();
    const match = matches[0];
    console.log(`  cleaned: "${cleaned}", match: "${match}", equal: ${cleaned === match}`);
    if (cleaned === match) {
      return false;
    }
  }
  
  return true;
};

console.log('=== Тест isTemplateString ===\n');

console.log('1. ${product.name}');
console.log('   Результат:', isTemplateString('${product.name}'));
console.log('   Ожидается: false (простой биндинг)\n');

console.log('2. Удалить (${count})');
console.log('   Результат:', isTemplateString('Удалить (${count})'));
console.log('   Ожидается: true (шаблонная строка)\n');

console.log('3. ${a} ${b}');
console.log('   Результат:', isTemplateString('${a} ${b}'));
console.log('   Ожидается: true (шаблонная строка)\n');

console.log('4. ${cart_response.total_items_count}');
console.log('   Результат:', isTemplateString('${cart_response.total_items_count}'));
console.log('   Ожидается: false (простой биндинг)\n');
