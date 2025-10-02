/**
 * Тест нормализации контекста API
 * Проверяет преобразование "None" в null и парсинг JSON-строк
 */

// Копия функции normalizeContext из clientWorkflowApi.js
function normalizeContext(context) {
  if (!context || typeof context !== 'object') {
    return context;
  }

  const normalized = {};
  
  for (const [key, value] of Object.entries(context)) {
    // Преобразуем строковые пустышки в null
    if (value === 'None' || value === 'null' || value === 'undefined') {
      normalized[key] = null;
      continue;
    }

    // Преобразуем строковые булевы значения (Python возвращает "True"/"False")
    if (value === 'False' || value === 'false') {
      normalized[key] = false;
      continue;
    }
    if (value === 'True' || value === 'true') {
      normalized[key] = true;
      continue;
    }

    // Пытаемся распарсить JSON-строки (Python возвращает строки с одинарными кавычками)
    if (typeof value === 'string' && (value.startsWith('[') || value.startsWith('{'))) {
      try {
        // Заменяем одинарные кавычки на двойные для корректного JSON.parse
        const jsonString = value.replace(/'/g, '"');
        normalized[key] = JSON.parse(jsonString);
        continue;
      } catch {
        // Не удалось распарсить — оставляем как есть
      }
    }

    normalized[key] = value;
  }

  return normalized;
}

// Имитация ответа от API (как в вашем примере)
const mockApiResponse = {
  cart_snapshot: "False",  // ❌ Новая проблема: булевы значения как строки
  cart_snapshot_error_flag: "False",
  recipient_email: "catherinee@gmail.com",
  recommended_products: "[{'id': 801, 'advertisement_id': 8, 'title': 'Smart Home Hub', 'price': 12990}]",
  stores_catalog: "[{'id': 201, 'name': 'Pear Store', 'rating': 4.8}]",
  selected_items: [4, 5, 6],
  user_id: "14",
  init_done: "True",  // ❌ Ещё один пример
  checkout_error: {
    error: false
  }
};

console.log('🔍 Исходный контекст от API:');
console.log(JSON.stringify(mockApiResponse, null, 2));
console.log('\n---\n');

const normalized = normalizeContext(mockApiResponse);

console.log('✅ Нормализованный контекст:');
console.log(JSON.stringify(normalized, null, 2));
console.log('\n---\n');

// Проверки
console.log('Проверка cart_snapshot:', normalized.cart_snapshot === false ? '✅ false (булев)' : `❌ ${normalized.cart_snapshot}`);
console.log('Проверка cart_snapshot_error_flag:', normalized.cart_snapshot_error_flag === false ? '✅ false' : '❌');
console.log('Проверка init_done:', normalized.init_done === true ? '✅ true' : '❌');
console.log('Проверка recommended_products:', Array.isArray(normalized.recommended_products) ? '✅ array' : '❌ не array');
console.log('Проверка stores_catalog:', Array.isArray(normalized.stores_catalog) ? '✅ array' : '❌ не array');
console.log('Проверка selected_items:', Array.isArray(normalized.selected_items) ? '✅ array (не изменено)' : '❌');
console.log('Проверка checkout_error:', typeof normalized.checkout_error === 'object' ? '✅ object (не изменено)' : '❌');
