/**
 * Утилиты для выполнения Integration States в песочнице
 */

/**
 * Выполняет HTTP запрос из integration expression
 * @param {Object} expression - Integration expression
 * @param {Object} context - Текущий контекст для подстановки переменных
 * @returns {Promise<Object>} Результат запроса
 */
export async function executeIntegrationExpression(expression, context = {}) {
  if (!expression || !expression.url) {
    return {
      success: false,
      error: 'Missing URL in integration expression',
      variable: expression?.variable
    };
  }

  // Подстановка переменных в URL
  let url = expression.url;
  const urlMatches = url.match(/\{\{([^}]+)\}\}/g);
  if (urlMatches) {
    urlMatches.forEach(match => {
      const varName = match.replace(/[{}]/g, '').trim();
      const value = context[varName];
      if (value !== undefined) {
        url = url.replace(match, encodeURIComponent(value));
      }
    });
  }

  // Подстановка переменных в params
  const params = {};
  Object.entries(expression.params || {}).forEach(([key, value]) => {
    if (typeof value === 'string' && value.includes('{{')) {
      const paramMatches = value.match(/\{\{([^}]+)\}\}/g);
      if (paramMatches) {
        let resolvedValue = value;
        paramMatches.forEach(match => {
          const varName = match.replace(/[{}]/g, '').trim();
          const contextValue = context[varName];
          if (contextValue !== undefined) {
            resolvedValue = resolvedValue.replace(match, contextValue);
          }
        });
        params[key] = resolvedValue;
      } else {
        params[key] = value;
      }
    } else {
      params[key] = value;
    }
  });

  const method = (expression.method || 'get').toLowerCase();
  const timeout = expression.timeout || 30000;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const options = {
      method: method.toUpperCase(),
      headers: {
        'Content-Type': 'application/json',
        ...(expression.headers || {})
      },
      signal: controller.signal
    };

    // Для GET запросов добавляем query параметры в URL
    if (method === 'get' && Object.keys(params).length > 0) {
      const queryString = new URLSearchParams(params).toString();
      url = `${url}${url.includes('?') ? '&' : '?'}${queryString}`;
    } else if (['post', 'put', 'patch'].includes(method)) {
      // Для POST/PUT/PATCH добавляем body
      options.body = JSON.stringify(params);
    }

    console.log(`[Integration] Executing ${method.toUpperCase()} ${url}`);

    const response = await fetch(url, options);
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    console.log(`[Integration] Success: ${expression.variable}`, data);

    return {
      success: true,
      data: data,
      status: response.status,
      variable: expression.variable
    };
  } catch (error) {
    console.error(`[Integration] Error: ${expression.variable}`, error);
    
    return {
      success: false,
      error: error.message,
      variable: expression.variable
    };
  }
}

/**
 * Выполняет все expressions из integration узла
 * @param {Object} integrationNode - Узел типа integration
 * @param {Object} context - Текущий контекст
 * @returns {Promise<Object>} Обновленный контекст с результатами
 */
export async function executeIntegrationNode(integrationNode, context = {}) {
  if (!integrationNode || !integrationNode.expressions) {
    return {
      success: false,
      context: context,
      error: 'Invalid integration node'
    };
  }

  const expressions = Array.isArray(integrationNode.expressions) 
    ? integrationNode.expressions 
    : [integrationNode.expressions];

  const updatedContext = { ...context };
  const results = [];

  // Выполняем все expressions последовательно
  for (const expr of expressions) {
    const result = await executeIntegrationExpression(expr, updatedContext);
    results.push(result);

    if (result.success) {
      // Сохраняем результат в контекст
      updatedContext[result.variable] = result.data;
    } else {
      // При ошибке сохраняем информацию об ошибке
      updatedContext[`${result.variable}_error`] = result.error;
    }
  }

  // Проверяем, все ли expressions выполнились успешно
  const allSuccess = results.every(r => r.success);

  return {
    success: allSuccess,
    context: updatedContext,
    results: results,
    error: allSuccess ? null : results.find(r => !r.success)?.error
  };
}

/**
 * Определяет следующее состояние после выполнения integration узла
 * @param {Object} integrationNode - Узел типа integration
 * @param {Object} executionResult - Результат выполнения
 * @returns {string|null} ID следующего состояния
 */
export function getNextStateFromIntegration(integrationNode, executionResult) {
  if (!integrationNode || !integrationNode.transitions) {
    return null;
  }

  const transitions = Array.isArray(integrationNode.transitions)
    ? integrationNode.transitions
    : [integrationNode.transitions];

  // Для integration states transition всегда имеет case: null
  // Переходим к указанному состоянию если выполнение успешно
  if (executionResult.success && transitions.length > 0) {
    return transitions[0].state_id;
  }

  return null;
}

/**
 * Валидирует integration узел перед выполнением
 * @param {Object} integrationNode - Узел для валидации
 * @returns {Object} Результат валидации
 */
export function validateIntegrationNode(integrationNode) {
  const errors = [];

  if (!integrationNode) {
    errors.push('Integration node is required');
    return { valid: false, errors };
  }

  if (!integrationNode.expressions || !Array.isArray(integrationNode.expressions)) {
    errors.push('Integration node must have expressions array');
  } else if (integrationNode.expressions.length === 0) {
    errors.push('Integration node must have at least one expression');
  } else {
    integrationNode.expressions.forEach((expr, idx) => {
      if (!expr.variable) {
        errors.push(`Expression ${idx}: variable is required`);
      }
      if (!expr.url) {
        errors.push(`Expression ${idx}: url is required`);
      } else if (!/^https?:\/\/.+/.test(expr.url)) {
        errors.push(`Expression ${idx}: url must start with http:// or https://`);
      }
    });
  }

  if (!integrationNode.transitions || !Array.isArray(integrationNode.transitions)) {
    errors.push('Integration node must have transitions array');
  } else if (integrationNode.transitions.length === 0) {
    errors.push('Integration node must have at least one transition');
  } else {
    integrationNode.transitions.forEach((transition, idx) => {
      if (!transition.variable) {
        errors.push(`Transition ${idx}: variable is required`);
      }
      if (transition.case !== null) {
        errors.push(`Transition ${idx}: case must be null for integration states`);
      }
      if (!transition.state_id) {
        errors.push(`Transition ${idx}: state_id is required`);
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Форматирует результат integration для отображения в UI
 * @param {Object} result - Результат выполнения
 * @returns {Object} Форматированные данные для UI
 */
export function formatIntegrationResult(result) {
  if (!result) {
    return {
      status: 'unknown',
      message: 'No result',
      data: null
    };
  }

  if (result.success) {
    return {
      status: 'success',
      message: `✓ ${result.variable} loaded`,
      data: result.data,
      variable: result.variable
    };
  } else {
    return {
      status: 'error',
      message: `✗ ${result.variable} failed: ${result.error}`,
      error: result.error,
      variable: result.variable
    };
  }
}

export default {
  executeIntegrationExpression,
  executeIntegrationNode,
  getNextStateFromIntegration,
  validateIntegrationNode,
  formatIntegrationResult
};
