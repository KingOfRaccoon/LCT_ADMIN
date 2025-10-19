import logger from '../../../utils/logger.js';
import { transpilePythonToJs, safeEvalExpression } from './pythonToJs.js';

const cloneDeep = (value) => {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }

  try {
    return JSON.parse(JSON.stringify(value));
  } catch (err) {
    console.warn('Failed to clone state, falling back to shallow copy', err);
    if (Array.isArray(value)) {
      return [...value];
    }
    if (value && typeof value === 'object') {
      return { ...value };
    }
    return value;
  }
};

// Runtime helper: reliably detect development mode across Vite/browser/node
const isSandboxDev = (() => {
  return false; // disable all debug logs in production for performance
  // Browser heuristic: localhost or common dev port (5173)
  try {
    if (typeof window !== 'undefined' && typeof location !== 'undefined') {
      const host = location.hostname || '';
      const port = String(location.port || '');
      if (host === 'localhost' || host === '127.0.0.1' || port === '5173') {
        return true;
      }
    }
  } catch {
    // ignore
  }

  // Node environment fallback
  try {
    if (typeof globalThis !== 'undefined' && globalThis.process && globalThis.process.env && globalThis.process.env.NODE_ENV !== 'production') {
      return true;
    }
  } catch {
    // ignore
  }

  return false;
})();

export const isBindingValue = (value) => Boolean(
  value && typeof value === 'object' && typeof value.reference === 'string'
);

export const normalizeReference = (reference) => {
  if (!reference || typeof reference !== 'string') {
    return '';
  }
  return reference.replace(/^\$\{/, '').replace(/\}$/, '');
};

/**
 * Проверяет, является ли строка шаблонной строкой с ${} выражениями
 * Шаблонная строка - это строка, которая содержит текст ВНЕ ${} выражений
 * Например: "Удалить (${count})" - шаблонная строка
 * Не шаблонная: "${product.name}" - просто биндинг
 * @param {string} str - строка для проверки
 * @returns {boolean}
 */
const isTemplateString = (str) => {
  if (!str || typeof str !== 'string') return false;
  
  // Проверяем, что строка содержит хотя бы один ${}
  const matches = str.match(/\$\{[^}]+\}/g);
  if (!matches || matches.length === 0) return false;
  
  // Если строка полностью состоит из одного ${} выражения - это не шаблонная строка
  if (matches.length === 1) {
    const cleaned = str.trim();
    const match = matches[0];
    // Проверяем, что вся строка это одно ${} выражение
    if (cleaned === match) {
      return false;
    }
  }
  
  // Иначе это шаблонная строка (есть текст вне ${} или несколько ${})
  return true;
};

/**
 * Обрабатывает шаблонную строку с несколькими ${} выражениями
 * @param {string} template - шаблонная строка
 * @param {object} context - контекст с переменными
 * @param {array} iterationStack - стек итераций
 * @returns {string}
 */
const processTemplateString = (template, context, iterationStack = []) => {
  // Создаем расширенный контекст с итерациями
  const extendedContext = { ...context };
  iterationStack.forEach((frame) => {
    const alias = frame.alias || 'item';
    extendedContext[alias] = frame.item;
    extendedContext[`${alias}Index`] = frame.index;
    extendedContext[`${alias}Total`] = frame.total;
  });
  
  // Заменяем каждое ${...} выражение на его значение
  return template.replace(/\$\{([^}]+)\}/g, (match, expression) => {
    try {
      // Вычисляем каждое выражение отдельно
      const result = safeEvalExpression(expression.trim(), extendedContext);
      return result !== undefined && result !== null ? String(result) : '';
    } catch (error) {
      console.warn('[sandbox] Failed to evaluate template expression:', expression, error);
      return match; // Возвращаем оригинальное выражение при ошибке
    }
  });
};

export const getContextValue = (context, path) => {
  if (!path) {
    return undefined;
  }

  const segments = path.split('.');
  let acc = context;
  for (let i = 0; i < segments.length; i += 1) {
    const segment = segments[i];

    // Защита от null, undefined, строковых заглушек типа "None", "False", "True"
    if (
      acc === undefined || 
      acc === null || 
      acc === 'None' || 
      acc === 'null' || 
      acc === 'undefined' ||
      acc === 'False' ||
      acc === 'false' ||
      acc === 'True' ||
      acc === 'true'
    ) {
      if (isSandboxDev) {
        // lightweight dev trace
        logger.debug('[sandbox] getContextValue stop', { path, segment, index: i, accumulator: acc });
      }
      return undefined;
    }

    // Если acc — примитив (строка/число/boolean), но не объект/массив, дальше идти нельзя
    if (typeof acc !== 'object') {
      if (isSandboxDev) {
        logger.debug('[sandbox] getContextValue primitive stop', { path, segment, index: i, type: typeof acc, accumulator: acc });
      }
      return undefined;
    }

    const isArrayIndex = /^\d+$/.test(segment);

    if (Array.isArray(acc) && isArrayIndex) {
      const next = acc[Number(segment)];
      if (isSandboxDev) {
        logger.debug('[sandbox] getContextValue step', { path, segment, index: i, fromType: 'array', next });
      }
      acc = next;
      continue;
    }

    if (Object.prototype.hasOwnProperty.call(acc, segment)) {
      const next = acc[segment];
      if (isSandboxDev) {
        logger.debug('[sandbox] getContextValue step', { path, segment, index: i, fromType: typeof acc, next });
      }
      acc = next;
      continue;
    }

    if (isSandboxDev) {
      logger.debug('[sandbox] getContextValue missing', { path, segment, index: i, accumulator: acc });
    }
    return undefined;
  }

  if (isSandboxDev) {
    logger.debug('[sandbox] getContextValue resolved', { path, value: acc });
  }
  return acc;
};

export const getBindingFallbackValue = (binding, fallback) => {
  if (!isBindingValue(binding)) {
    return binding ?? fallback;
  }

  if (Object.prototype.hasOwnProperty.call(binding, 'value')) {
    return binding.value;
  }

  return fallback;
};

const resolveIterationReference = (path, iterationStack = []) => {
  if (!path || !Array.isArray(iterationStack) || iterationStack.length === 0) {
    return { found: false };
  }

  for (let index = iterationStack.length - 1; index >= 0; index -= 1) {
    const frame = iterationStack[index];
    if (!frame) {
      continue;
    }

    const alias = typeof frame.alias === 'string' && frame.alias.trim().length > 0
      ? frame.alias.trim()
      : 'item';

    if (path === alias || path.startsWith(`${alias}.`)) {
      const remainder = path === alias ? '' : path.slice(alias.length + 1);
      if (!remainder) {
        return { found: true, value: frame.item };
      }
      const nested = getContextValue(frame.item, remainder);
      return { found: true, value: nested };
    }

    if (
      path === `${alias}Index`
      || path === `${alias}.index`
      || path === 'index'
    ) {
      if (typeof frame.index === 'number') {
        return { found: true, value: frame.index };
      }
      continue;
    }

    if (
      path === `${alias}Total`
      || path === `${alias}.total`
      || path === `${alias}Length`
      || path === `${alias}.length`
      || path === 'total'
      || path === 'length'
    ) {
      if (typeof frame.total === 'number') {
        return { found: true, value: frame.total };
      }
      continue;
    }
  }

  return { found: false };
};

export const resolveBindingValue = (value, context, fallback, options = {}) => {
  if (!isBindingValue(value)) {
    return value ?? fallback;
  }

  const { iterationStack = [] } = options;
  
  // Проверяем, является ли это шаблонной строкой с несколькими ${} выражениями
  // ВАЖНО: проверяем ДО нормализации, так как нормализация удаляет внешние ${}
  // ДЛЯ ШАБЛОННЫХ СТРОК не применяем normalizeReference, так как он удалит внешние ${} и сломает внутренние
  if (isTemplateString(value.reference)) {
    try {
      const result = processTemplateString(value.reference, context, iterationStack);
      if (isSandboxDev) {
        logger.debug('[sandbox] resolveBindingValue template string', {
          reference: value.reference,
          result
        });
      }
      return result;
    } catch (error) {
      console.warn('[sandbox] Failed to process template string:', value.reference, error);
    }
  }
  
  const normalized = normalizeReference(value.reference);
  
  // Проверяем, содержит ли биндинг Python-синтаксис (str(), in, if/else)
  const hasPythonSyntax = /\b(str|len)\(|if\s+.+\s+else\s+|\s+in\s+/.test(normalized);
  
  // Проверяем, содержит ли биндинг JavaScript выражение (не просто путь к переменной)
  // Это НЕ простой путь, если содержит:
  // - Операторы: +, -, *, /, %, &&, ||, ===, !==, ==, !=, >, <, >=, <=
  // - Тернарный оператор: ? :
  // - Строковые литералы: 'text' или "text"
  // - Скобки: ( )
  const hasJsExpression = /[+\-*/%()]|&&|\|\||[!=]==?|[<>]=?|\?.*:|['"]/.test(normalized);
  
  // Если это выражение - не ищем в iteration, а сразу вычисляем
  const iterationLookup = (normalized && !hasPythonSyntax && !hasJsExpression)
    ? resolveIterationReference(normalized, iterationStack)
    : { found: false, value: undefined };

  if (!normalized && !iterationLookup.found && iterationStack.length > 0) {
    const lastFrame = iterationStack[iterationStack.length - 1];
    if (lastFrame && lastFrame.item !== undefined) {
      return lastFrame.item;
    }
  }

  if (iterationLookup.found) {
    if (iterationLookup.value !== undefined) {
      if (isSandboxDev) {
        logger.debug('[sandbox] resolveBindingValue iteration', {
          reference: value.reference,
          normalized,
          iteration: iterationLookup
        });
      }
      return iterationLookup.value;
    }
  }
  
  if (normalized) {
    
    if (hasPythonSyntax || hasJsExpression) {
      // Если есть Python синтаксис - транспилируем, иначе используем как JS
      const jsExpression = hasPythonSyntax ? transpilePythonToJs(normalized) : normalized;
      
      try {
        // Создаем расширенный контекст с итерациями
        const extendedContext = { ...context };
        iterationStack.forEach((frame) => {
          const alias = frame.alias || 'item';
          extendedContext[alias] = frame.item;
          extendedContext[`${alias}Index`] = frame.index;
          extendedContext[`${alias}Total`] = frame.total;
        });
        
        const resolved = safeEvalExpression(jsExpression, extendedContext);
        
        if (isSandboxDev) {
          logger.debug('[sandbox] resolveBindingValue expression', {
            reference: value.reference,
            normalized,
            hasPythonSyntax,
            hasJsExpression,
            jsExpression,
            resolved
          });
        }
        
        if (resolved !== undefined) {
          return resolved;
        }
      } catch (error) {
        console.warn('[sandbox] Failed to evaluate expression:', normalized, error);
      }
    }
    
    // Стандартная логика для простых путей
    const resolved = getContextValue(context, normalized);
    if (isSandboxDev) {
      logger.debug('[sandbox] resolveBindingValue', { reference: value.reference, normalized, resolved });
    }

    if (resolved !== undefined) {
      // If context contains an empty string but the binding provides a
      // structural fallback (array/object), prefer the fallback. This
      // happens when a variable was created as '' (string) earlier but
      // the component expects a list (e.g. createBindingValue([], 'gamesList')).
      if (resolved === '' && Object.prototype.hasOwnProperty.call(value, 'value')) {
        const fb = value.value;
        if (Array.isArray(fb) || (fb !== null && typeof fb === 'object')) {
          if (isSandboxDev) {
            logger.debug('[sandbox] resolveBindingValue preferFallback', { reference: value.reference, normalized, resolved, fallback: fb });
          }
          return fb;
        }
      }

      return resolved;
    }
  }

  if (Object.prototype.hasOwnProperty.call(value, 'value')) {
    return value.value;
  }

  return fallback;
};

export const resolvePropValue = (props = {}, key, context, fallback, options = {}) => {
  if (!props || typeof props !== 'object') {
    return fallback;
  }

  const candidate = props[key];
  return resolveBindingValue(candidate, context, fallback, options);
};

export const setContextValue = (context, path, value) => {
  if (!path) {
    return context;
  }

  const segments = path.split('.');
  const lastIndex = segments.length - 1;
  let cursor = context;

  segments.forEach((segment, index) => {
    const isLast = index === lastIndex;
    const isArrayIndex = /^\d+$/.test(segment);

    if (isLast) {
      if (Array.isArray(cursor) && isArrayIndex) {
        if (value === undefined) {
          cursor.splice(Number(segment), 1);
        } else {
          cursor[Number(segment)] = value;
        }
        return;
      }

          if (value === undefined) {
          if (cursor && typeof cursor === 'object') {
            // debug: deletion
            if (isSandboxDev) {
              logger.debug('[sandbox] setContextValue delete', { path, segment });
            }
            delete cursor[segment];
          }
        } else {
          cursor[segment] = value;
          if (isSandboxDev) {
            logger.debug('[sandbox] setContextValue write', { path, value });
          }
        }
      return;
    }

    if (isArrayIndex) {
      const parsedIndex = Number(segment);
      if (!Array.isArray(cursor)) {
        if (cursor && typeof cursor === 'object') {
          cursor[segment] = [];
          cursor = cursor[segment];
        } else {
          return;
        }
      } else {
        if (!cursor[parsedIndex] || typeof cursor[parsedIndex] !== 'object') {
          cursor[parsedIndex] = {};
        }
        cursor = cursor[parsedIndex];
      }
      return;
    }

    if (!cursor[segment] || typeof cursor[segment] !== 'object') {
      cursor[segment] = {};
    }
    cursor = cursor[segment];
  });

  return context;
};

const isPlainObject = (value) => (
  Object.prototype.toString.call(value) === '[object Object]'
);

const resolvePatchValue = (value, context) => {
  if (isBindingValue(value)) {
    return resolveBindingValue(value, context, undefined);
  }

  return value;
};

const applyPatchEntry = (target, path, value, context) => {
  if (isPlainObject(value) && !isBindingValue(value)) {
    Object.entries(value).forEach(([childKey, childValue]) => {
      const nextPath = path ? `${path}.${childKey}` : childKey;
      applyPatchEntry(target, nextPath, childValue, context);
    });
    return;
  }

  const resolved = resolvePatchValue(value, context);
  setContextValue(target, path, resolved);
};

export const applyContextPatch = (context, patch = {}, sourceContext = context) => {
  if (!patch || typeof patch !== 'object') {
    return context;
  }

  if (isSandboxDev) {
    logger.debug('[sandbox] applyContextPatch start', { patch });
  }

  const cloned = cloneDeep(context);
  const nextState = cloned === context && context && typeof context === 'object'
    ? { ...context }
    : cloned;

  Object.entries(patch).forEach(([path, value]) => {
    applyPatchEntry(nextState, path, value, sourceContext);
  });
  // Auto-recalculate order total when cart items are present
  try {
    const cartItems = getContextValue(nextState, 'data.cart.items');
      if (Array.isArray(cartItems)) {
      const total = cartItems.reduce((sum, it) => {
        if (it && typeof it === 'object' && typeof it.price === 'number') {
          return sum + it.price;
        }
        return sum;
      }, 0);
      setContextValue(nextState, 'data.order.total', total);
      // format with space thousand separator (simple)
      const totalFormatted = String(total).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')+ ' ₽';
      setContextValue(nextState, 'data.order.totalFormatted', totalFormatted);
      if (isSandboxDev) {
        logger.debug('[sandbox] recomputeOrderTotal', { total, totalFormatted });
      }
    }
  } catch {
    // ignore
  }
  if (isSandboxDev) {
    logger.debug('[sandbox] applyContextPatch end', { keys: Object.keys(nextState) });
  }
  return nextState;
};

export const cloneContext = (value) => cloneDeep(value);
