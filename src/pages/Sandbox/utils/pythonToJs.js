/**
 * Транспиляция Python-выражений в JavaScript для биндингов
 * Поддерживает: str(), in, тернарный оператор, len()
 */

/**
 * Транспилирует Python-выражение в JavaScript
 * @param {string} pythonExpr - Python-выражение из биндинга
 * @returns {string} - JavaScript-выражение
 */
export function transpilePythonToJs(pythonExpr) {
  if (!pythonExpr || typeof pythonExpr !== 'string') {
    return pythonExpr;
  }

  let jsExpr = pythonExpr;

  // 1. Замена str() на String()
  jsExpr = jsExpr.replace(/str\(/g, 'String(');

  // 2. Замена len() на .length
  jsExpr = jsExpr.replace(/len\(([^)]+)\)/g, '($1).length');

  // 3. Замена Python тернарного оператора на JS
  // Паттерн: 'value1' if condition else 'value2'
  const ternaryRegex = /([^']*)'([^']*)'\s+if\s+(.+?)\s+else\s+'([^']*)'/g;
  jsExpr = jsExpr.replace(ternaryRegex, (match, prefix, ifValue, condition, elseValue) => {
    // Транспилируем условие
    const jsCondition = transpileCondition(condition);
    return `${prefix}(${jsCondition} ? '${ifValue}' : '${elseValue}')`;
  });

  // 4. Замена оператора 'in' на .includes()
  // Паттерн: item in array
  jsExpr = jsExpr.replace(/(\w+(?:\.\w+)*)\s+in\s+(\w+(?:\.\w+)*)/g, '($2).includes($1)');

  return jsExpr;
}

/**
 * Транспилирует условие из Python в JavaScript
 * @param {string} condition - Python условие
 * @returns {string} - JavaScript условие
 */
function transpileCondition(condition) {
  let jsCondition = condition.trim();

  // Замена 'in' на .includes()
  jsCondition = jsCondition.replace(/(\w+(?:\.\w+)*)\s+in\s+(\w+(?:\.\w+)*)/g, '($2).includes($1)');

  // Замена 'not in' на !.includes()
  jsCondition = jsCondition.replace(/(\w+(?:\.\w+)*)\s+not\s+in\s+(\w+(?:\.\w+)*)/g, '!($2).includes($1)');

  // Замена 'and' на &&
  jsCondition = jsCondition.replace(/\s+and\s+/g, ' && ');

  // Замена 'or' на ||
  jsCondition = jsCondition.replace(/\s+or\s+/g, ' || ');

  // Замена 'not' на !
  jsCondition = jsCondition.replace(/\bnot\s+/g, '!');

  return jsCondition;
}

/**
 * Безопасно вычисляет JS-выражение с доступом к контексту
 * @param {string} expression - JavaScript выражение
 * @param {Object} context - Контекст с переменными
 * @returns {*} - Результат вычисления
 */
export function safeEvalExpression(expression, context = {}) {
  try {
    // Создаем функцию с контекстом в качестве параметров
    const contextKeys = Object.keys(context);
    const contextValues = Object.values(context);
    
    // Добавляем вспомогательные функции
    const helpers = {
      String: String,
      Number: Number,
      Boolean: Boolean,
      Array: Array,
      Object: Object,
    };

    const func = new Function(
      ...contextKeys,
      ...Object.keys(helpers),
      `"use strict"; return (${expression});`
    );

    return func(...contextValues, ...Object.values(helpers));
  } catch (error) {
    console.warn('[pythonToJs] Failed to evaluate expression:', expression, error);
    return undefined;
  }
}

/**
 * Обрабатывает биндинг с транспиляцией Python → JS
 * @param {string} reference - Reference строка с Python-кодом
 * @param {Object} context - Контекст для вычисления
 * @returns {*} - Результат вычисления
 */
export function resolveReferenceWithPython(reference, context = {}) {
  if (!reference || typeof reference !== 'string') {
    return reference;
  }

  // Убираем ${...}
  const expression = reference.replace(/^\$\{/, '').replace(/\}$/, '').trim();

  // Транспилируем Python → JS
  const jsExpression = transpilePythonToJs(expression);

  // Вычисляем
  return safeEvalExpression(jsExpression, context);
}

export default {
  transpilePythonToJs,
  safeEvalExpression,
  resolveReferenceWithPython,
};
