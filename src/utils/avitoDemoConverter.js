/**
 * Конвертер avitoDemo формата в React Flow graphData
 * Поддерживает технические состояния (technical) с типизацией, метаданными и улучшенными выражениями
 */

/**
 * Преобразует expression из avitoDemo в формат с поддержкой типизации и метаданных
 * @param {Object} expression - Выражение из avitoDemo
 * @returns {Object} Нормализованное выражение
 */
function normalizeExpression(expression) {
  if (!expression) return null;

  return {
    variable: expression.variable,
    dependent_variables: expression.dependent_variables || expression.dependentVariables || [],
    expression: expression.expression,
    // Новые поля для типизации
    return_type: expression.return_type || expression.returnType || 'boolean',
    default_value: expression.default_value ?? expression.defaultValue ?? null,
    // Метаданные для админ-панели
    metadata: expression.metadata ? {
      description: expression.metadata.description,
      category: expression.metadata.category,
      tags: expression.metadata.tags || [],
      examples: expression.metadata.examples || [],
      author: expression.metadata.author,
      created_at: expression.metadata.created_at || expression.metadata.createdAt,
      version: expression.metadata.version || '1.0'
    } : null
  };
}

/**
 * Преобразует transitions с поддержкой новой логики множественных переменных
 * @param {Array} transitions - Массив переходов
 * @returns {Array} Нормализованные переходы
 */
function normalizeTransitions(transitions) {
  if (!transitions || !Array.isArray(transitions)) return [];

  return transitions.map(transition => {
    const isMultipleVariables = Array.isArray(transition.variable) && transition.variable.length > 1;
    
    return {
      ...transition,
      // Для обратной совместимости: если variable - массив, но logic не указан
      logic: transition.logic || (isMultipleVariables ? 'any_true' : undefined),
      // Преобразуем variables в единый формат
      variables: Array.isArray(transition.variable) ? transition.variable : 
                 transition.variables ? transition.variables :
                 transition.variable ? [transition.variable] : []
    };
  });
}

/**
 * Преобразует avitoDemo nodes в React Flow nodes
 * @param {Array} avitoDemoNodes - Узлы из avitoDemo.json
 * @returns {Array} React Flow nodes
 */
export function convertAvitoDemoNodesToReactFlow(avitoDemoNodes) {
  if (!avitoDemoNodes || !Array.isArray(avitoDemoNodes)) {
    return [];
  }

  return avitoDemoNodes.map((node, index) => {
    const isStart = node.start === true;
    const isFinal = !node.edges || node.edges.length === 0;
    const isTechnical = node.type === 'technical' || node.state_type === 'technical';

    // Базовая структура узла
    const reactFlowNode = {
      id: node.id,
      type: node.type || 'screen',
      position: {
        x: index * 300,
        y: Math.floor(index / 3) * 200
      },
      data: {
        label: node.label || node.name || node.id,
        screenId: node.screenId,
        start: isStart,
        final: isFinal,
        nodeType: node.type || node.state_type || 'screen',
        // Копируем actionType и config из node.data для action-узлов
        actionType: node.data?.actionType,
        config: node.data?.config,
        description: node.data?.description || node.description
      }
    };

    // Для технических узлов добавляем expressions и transitions
    if (isTechnical) {
      reactFlowNode.data.expressions = (node.expressions || []).map(normalizeExpression);
      reactFlowNode.data.transitions = normalizeTransitions(node.transitions);
      
      // Метаданные технического состояния
      if (node.metadata) {
        reactFlowNode.data.stateMetadata = {
          description: node.metadata.description,
          category: node.metadata.category,
          tags: node.metadata.tags || [],
          author: node.metadata.author,
          version: node.metadata.version
        };
      }
    }

    // Для интеграционных узлов добавляем expressions и transitions
    const isIntegration = node.type === 'integration' || node.state_type === 'integration';
    if (isIntegration) {
      reactFlowNode.data.expressions = node.expressions?.map(normalizeIntegrationExpression) || [];
      reactFlowNode.data.transitions = node.transitions || [];
      reactFlowNode.data.stateMetadata = node.metadata;
    }

    return reactFlowNode;
  });
}

/**
 * Преобразует avitoDemo edges в React Flow edges
 * Поддерживает transitions из технических состояний с явной логикой
 * @param {Array} avitoDemoNodes - Узлы из avitoDemo.json (содержат edges)
 * @returns {Array} React Flow edges
 */
export function convertAvitoDemoEdgesToReactFlow(avitoDemoNodes) {
  if (!avitoDemoNodes || !Array.isArray(avitoDemoNodes)) {
    return [];
  }

  const edges = [];

  avitoDemoNodes.forEach(node => {
    const isTechnical = node.type === 'technical' || node.state_type === 'technical';

    // Обработка стандартных edges (для screen и action узлов)
    if (node.edges && Array.isArray(node.edges)) {
      node.edges.forEach(edge => {
        edges.push({
          id: edge.id || `${node.id}-${edge.target}`,
          source: node.id,
          target: edge.target || edge.state_id,
          label: edge.label,
          type: 'smoothstep',
          animated: false,
          data: {
            event: edge.event,
            keepInputs: edge.keepInputs,
            summary: edge.summary,
            contextPatch: edge.contextPatch,
            condition: edge.condition
          }
        });
      });
    }

        // Обработка transitions для технических узлов (новая логика)
    if (isTechnical && node.transitions && Array.isArray(node.transitions)) {
      node.transitions.forEach((transition, transIdx) => {
        const variables = Array.isArray(transition.variable) ? transition.variable :
                         transition.variables ? transition.variables :
                         transition.variable ? [transition.variable] : [];

        if (variables.length === 0) {
          console.warn(`Node ${node.id}: transition ${transIdx} has no variables`);
          return;
        }

        const edgeId = `${node.id}-transition-${transIdx}`;
        const targetStateId = transition.state_id;

        if (!targetStateId) {
          console.warn(`Node ${node.id}: transition ${transIdx} missing state_id`);
          return;
        }

        edges.push({
          id: edgeId,
          source: node.id,
          target: targetStateId,
          type: 'technical-transition',
          data: {
            variables: variables,
            case: transition.case,
            logic: transition.logic,
            label: variables.length === 1 
              ? `${variables[0]} = ${transition.case}`
              : `${transition.logic || 'any_true'}: ${variables.join(', ')}`,
            edgeType: 'technical-transition'
          },
          label: variables.length === 1 
            ? `${variables[0]} = ${transition.case}`
            : `${transition.logic || 'any_true'}: ${variables.join(', ')}`,
          animated: false,
          style: { stroke: '#9333ea' }
        });
      });
    }

    // Обработка transitions для интеграционных узлов
    const isIntegration = node.type === 'integration' || node.state_type === 'integration';
    if (isIntegration && node.transitions && Array.isArray(node.transitions)) {
      node.transitions.forEach((transition, transIdx) => {
        const edgeId = `${node.id}-integration-${transIdx}`;
        const targetStateId = transition.state_id;

        if (!targetStateId) {
          console.warn(`Node ${node.id}: integration transition ${transIdx} missing state_id`);
          return;
        }

        edges.push({
          id: edgeId,
          source: node.id,
          target: targetStateId,
          type: 'integration-transition',
          data: {
            variable: transition.variable,
            label: `✓ ${transition.variable} loaded`,
            edgeType: 'integration-transition'
          },
          label: `✓ ${transition.variable}`,
          animated: true,
          style: { stroke: '#10b981', strokeDasharray: '5,5' }
        });
      });
    }
  });

  return edges;
}

/**
 * Загружает и преобразует avitoDemo.json с валидацией технических узлов
 * @param {Object} options - Опции загрузки
 * @param {boolean} options.validate - Выполнять ли валидацию технических узлов
 * @param {boolean} options.verbose - Логировать ли предупреждения
 * @returns {Promise<{nodes: Array, edges: Array, initialContext: Object, screens: Object, variableSchemas: Object, validation: Object}>}
 */
export async function loadAvitoDemoAsGraphData(options = {}) {
  const { validate = false, verbose = false } = options;

  try {
    // Динамический импорт JSON
    const avitoDemo = await import('../pages/Sandbox/data/avitoDemo.json');
    const data = avitoDemo.default;

    const nodes = convertAvitoDemoNodesToReactFlow(data.nodes || []);
    const edges = convertAvitoDemoEdgesToReactFlow(data.nodes || []);

    // Валидация технических узлов
    const validationResults = {
      performed: validate,
      technicalNodesCount: 0,
      errors: [],
      warnings: []
    };

    if (validate) {
      const contextSchema = data.variableSchemas || {};
      
      (data.nodes || []).forEach(node => {
        const isTechnical = node.type === 'technical' || node.state_type === 'technical';
        
        if (isTechnical) {
          validationResults.technicalNodesCount++;
          const validation = validateTechnicalNode(node, contextSchema);
          
          if (!validation.valid) {
            validationResults.errors.push({
              nodeId: node.id,
              nodeName: node.name || node.id,
              errors: validation.errors
            });
          }

          if (verbose) {
            const metadata = extractTechnicalNodeMetadata(node);
            console.log(`[Technical Node] ${metadata.name}:`, metadata);
          }
        }
      });

      if (validationResults.errors.length > 0) {
        console.warn('[avitoDemo] Validation errors found:', validationResults.errors);
      }

      if (verbose && validationResults.technicalNodesCount > 0) {
        console.log(`[avitoDemo] Validated ${validationResults.technicalNodesCount} technical node(s)`);
      }
    }

    return {
      nodes,
      edges,
      initialContext: data.initialContext || {},
      variableSchemas: data.variableSchemas || {},
      screens: data.screens || {},
      validation: validationResults
    };
  } catch (error) {
    console.error('Failed to load avitoDemo:', error);
    return {
      nodes: [],
      edges: [],
      initialContext: {},
      variableSchemas: {},
      screens: {},
      validation: {
        performed: false,
        technicalNodesCount: 0,
        errors: [{ error: error.message }],
        warnings: []
      }
    };
  }
}

/**
 * Преобразует полный avitoDemo в формат для VirtualContext с валидацией
 * @param {Object} avitoDemoData - Данные из avitoDemo.json
 * @param {Object} options - Опции преобразования
 * @param {boolean} options.validate - Выполнять ли валидацию
 * @returns {Object} Данные для VirtualContext
 */
export function convertAvitoDemoToVirtualContext(avitoDemoData, options = {}) {
  const { validate = false } = options;

  if (!avitoDemoData) {
    return {
      graphData: { nodes: [], edges: [] },
      initialContext: {},
      variableSchemas: {},
      validation: null
    };
  }

  const nodes = convertAvitoDemoNodesToReactFlow(avitoDemoData.nodes || []);
  const edges = convertAvitoDemoEdgesToReactFlow(avitoDemoData.nodes || []);

  const result = {
    graphData: { nodes, edges },
    initialContext: avitoDemoData.initialContext || {},
    variableSchemas: avitoDemoData.variableSchemas || {}
  };

  // Валидация при необходимости
  if (validate) {
    const contextSchema = avitoDemoData.variableSchemas || {};
    const validationErrors = [];

    (avitoDemoData.nodes || []).forEach(node => {
      const isTechnical = node.type === 'technical' || node.state_type === 'technical';
      
      if (isTechnical) {
        const validation = validateTechnicalNode(node, contextSchema);
        if (!validation.valid) {
          validationErrors.push({
            nodeId: node.id,
            nodeName: node.name || node.id,
            errors: validation.errors
          });
        }
      }
    });

    result.validation = {
      valid: validationErrors.length === 0,
      errors: validationErrors
    };
  }

  return result;
}

/**
 * Валидирует техническое выражение
 * @param {Object} expression - Выражение для валидации
 * @param {Object} contextSchema - Схема контекста (variableSchemas)
 * @returns {Array<string>} Массив ошибок (пустой если валидация успешна)
 */
export function validateTechnicalExpression(expression, contextSchema = {}) {
  const errors = [];

  if (!expression) {
    errors.push('Expression is required');
    return errors;
  }

  // 1. Проверка обязательных полей
  if (!expression.variable) {
    errors.push('Expression variable is required');
  }
  
  if (!expression.expression) {
    errors.push('Expression string is required');
  }

  // 2. Проверка return_type
  const allowedTypes = ['boolean', 'integer', 'float', 'string', 'list', 'dict', 'any'];
  if (expression.return_type && !allowedTypes.includes(expression.return_type)) {
    errors.push(`Invalid return_type: ${expression.return_type}. Allowed: ${allowedTypes.join(', ')}`);
  }

  // 3. Проверка dependent_variables в контексте
  if (expression.dependent_variables && Array.isArray(expression.dependent_variables)) {
    expression.dependent_variables.forEach(varName => {
      if (contextSchema && !contextSchema[varName]) {
        errors.push(`Variable '${varName}' not found in context schema`);
      }
    });
  }

  // 4. Проверка на запрещенные конструкции
  const forbidden = ['__', 'import', 'eval', 'exec', 'compile', 'open', 'file'];
  if (expression.expression) {
    forbidden.forEach(word => {
      if (expression.expression.includes(word)) {
        errors.push(`Forbidden keyword '${word}' in expression`);
      }
    });
  }

  // 5. Проверка длины выражения
  const MAX_EXPRESSION_LENGTH = 1000;
  if (expression.expression && expression.expression.length > MAX_EXPRESSION_LENGTH) {
    errors.push(`Expression too long: ${expression.expression.length} characters (max: ${MAX_EXPRESSION_LENGTH})`);
  }

  return errors;
}

/**
 * Валидирует технический узел целиком
 * @param {Object} technicalNode - Узел типа technical
 * @param {Object} contextSchema - Схема контекста
 * @returns {Object} Результат валидации {valid: boolean, errors: Array}
 */
export function validateTechnicalNode(technicalNode, contextSchema = {}) {
  const errors = [];

  if (!technicalNode.expressions || !Array.isArray(technicalNode.expressions)) {
    errors.push('Technical node must have expressions array');
    return { valid: false, errors };
  }

  if (!technicalNode.transitions || !Array.isArray(technicalNode.transitions)) {
    errors.push('Technical node must have transitions array');
    return { valid: false, errors };
  }

  // Валидация каждого выражения
  technicalNode.expressions.forEach((expr, idx) => {
    const exprErrors = validateTechnicalExpression(expr, contextSchema);
    exprErrors.forEach(err => {
      errors.push(`Expression[${idx}] (${expr.variable}): ${err}`);
    });
  });

  // Валидация transitions
  const expressionVariables = new Set(
    technicalNode.expressions.map(expr => expr.variable)
  );

  technicalNode.transitions.forEach((transition, idx) => {
    const variables = Array.isArray(transition.variable) ? transition.variable :
                     transition.variables ? transition.variables :
                     transition.variable ? [transition.variable] : [];

    // Проверяем, что все переменные в transitions определены в expressions
    variables.forEach(varName => {
      if (!expressionVariables.has(varName)) {
        errors.push(`Transition[${idx}]: Variable '${varName}' not defined in expressions`);
      }
    });

    // Проверяем логику для множественных переменных
    if (variables.length > 1) {
      const allowedLogics = ['all_true', 'any_true', 'none_true', 'all_false', 'exactly_one_true'];
      if (!transition.logic || !allowedLogics.includes(transition.logic)) {
        errors.push(
          `Transition[${idx}]: Multiple variables require valid logic. ` +
          `Got: ${transition.logic}, allowed: ${allowedLogics.join(', ')}`
        );
      }
    }

    // Проверяем наличие target state
    if (!transition.state_id) {
      errors.push(`Transition[${idx}]: state_id is required`);
    }
  });

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Извлекает метаинформацию из технического узла для отображения в UI
 * @param {Object} technicalNode - Узел типа technical
 * @returns {Object} Метаинформация для UI
 */
export function extractTechnicalNodeMetadata(technicalNode) {
  if (!technicalNode || technicalNode.type !== 'technical') {
    return null;
  }

  const metadata = {
    name: technicalNode.name || technicalNode.id,
    description: technicalNode.description || technicalNode.metadata?.description,
    category: technicalNode.metadata?.category,
    tags: technicalNode.metadata?.tags || [],
    expressionsCount: technicalNode.expressions?.length || 0,
    transitionsCount: technicalNode.transitions?.length || 0,
    expressions: []
  };

  // Собираем информацию о выражениях
  if (technicalNode.expressions && Array.isArray(technicalNode.expressions)) {
    metadata.expressions = technicalNode.expressions.map(expr => ({
      variable: expr.variable,
      returnType: expr.return_type || 'boolean',
      hasMetadata: !!expr.metadata,
      description: expr.metadata?.description,
      category: expr.metadata?.category,
      examplesCount: expr.metadata?.examples?.length || 0
    }));
  }

  return metadata;
}

/**
 * Генерирует документацию для технического выражения
 * @param {Object} expression - Выражение с метаданными
 * @returns {string} Markdown документация
 */
export function generateExpressionDocumentation(expression) {
  if (!expression) return '';

  let doc = `### ${expression.variable}\n\n`;
  
  if (expression.metadata?.description) {
    doc += `**Описание:** ${expression.metadata.description}\n\n`;
  }

  doc += `**Тип результата:** \`${expression.return_type || 'boolean'}\`\n\n`;
  
  if (expression.default_value !== null && expression.default_value !== undefined) {
    doc += `**Значение по умолчанию:** \`${JSON.stringify(expression.default_value)}\`\n\n`;
  }

  doc += `**Выражение:**\n\`\`\`javascript\n${expression.expression}\n\`\`\`\n\n`;

  if (expression.dependent_variables && expression.dependent_variables.length > 0) {
    doc += `**Зависимые переменные:**\n`;
    expression.dependent_variables.forEach(varName => {
      doc += `- \`${varName}\`\n`;
    });
    doc += '\n';
  }

  if (expression.metadata?.tags && expression.metadata.tags.length > 0) {
    doc += `**Теги:** ${expression.metadata.tags.map(tag => `\`${tag}\``).join(', ')}\n\n`;
  }

  if (expression.metadata?.examples && expression.metadata.examples.length > 0) {
    doc += `**Примеры:**\n\n`;
    expression.metadata.examples.forEach((example, idx) => {
      doc += `${idx + 1}. ${example.description || 'Пример'}\n`;
      doc += `   - Входные данные: \`${JSON.stringify(example.input)}\`\n`;
      doc += `   - Результат: \`${JSON.stringify(example.output)}\`\n\n`;
    });
  }

  if (expression.metadata?.author || expression.metadata?.version) {
    doc += `---\n`;
    if (expression.metadata.author) {
      doc += `*Автор: ${expression.metadata.author}*  \n`;
    }
    if (expression.metadata.version) {
      doc += `*Версия: ${expression.metadata.version}*  \n`;
    }
    if (expression.metadata.created_at) {
      doc += `*Создано: ${expression.metadata.created_at}*\n`;
    }
  }

  return doc;
}

/**
 * Генерирует полную документацию для технического узла
 * @param {Object} technicalNode - Узел типа technical
 * @returns {string} Markdown документация
 */
export function generateTechnicalNodeDocumentation(technicalNode) {
  if (!technicalNode || technicalNode.type !== 'technical') {
    return '';
  }

  let doc = `# ${technicalNode.name || technicalNode.id}\n\n`;

  if (technicalNode.description || technicalNode.metadata?.description) {
    doc += `${technicalNode.description || technicalNode.metadata.description}\n\n`;
  }

  if (technicalNode.metadata?.category) {
    doc += `**Категория:** \`${technicalNode.metadata.category}\`\n\n`;
  }

  if (technicalNode.metadata?.tags && technicalNode.metadata.tags.length > 0) {
    doc += `**Теги:** ${technicalNode.metadata.tags.map(tag => `\`${tag}\``).join(', ')}\n\n`;
  }

  doc += `---\n\n`;

  // Документация выражений
  if (technicalNode.expressions && technicalNode.expressions.length > 0) {
    doc += `## Выражения\n\n`;
    technicalNode.expressions.forEach(expr => {
      doc += generateExpressionDocumentation(expr);
      doc += `\n---\n\n`;
    });
  }

  // Документация переходов
  if (technicalNode.transitions && technicalNode.transitions.length > 0) {
    doc += `## Переходы\n\n`;
    technicalNode.transitions.forEach((transition, idx) => {
      const variables = Array.isArray(transition.variable) ? transition.variable :
                       transition.variables ? transition.variables :
                       transition.variable ? [transition.variable] : [];

      doc += `### Переход ${idx + 1}\n\n`;
      doc += `**Переменные:** ${variables.map(v => `\`${v}\``).join(', ')}\n\n`;
      
      if (variables.length > 1 && transition.logic) {
        doc += `**Логика:** \`${transition.logic}\`\n\n`;
      }
      
      if (transition.case) {
        doc += `**Условие:** \`${transition.case}\`\n\n`;
      }
      
      doc += `**Целевое состояние:** \`${transition.state_id}\`\n\n`;
    });
  }

  return doc;
}

/**
 * Экспортирует техническое состояние в формат для бэкенда
 * @param {Object} reactFlowNode - React Flow узел (преобразованный)
 * @returns {Object} Объект для отправки на бэкенд
 */
export function exportTechnicalNodeForBackend(reactFlowNode) {
  if (!reactFlowNode || reactFlowNode.type !== 'technical') {
    return null;
  }

  return {
    state_type: 'technical',
    name: reactFlowNode.data.label || reactFlowNode.id,
    initial_state: reactFlowNode.data.start || false,
    final_state: reactFlowNode.data.final || false,
    description: reactFlowNode.data.description,
    metadata: reactFlowNode.data.stateMetadata,
    expressions: (reactFlowNode.data.expressions || []).map(expr => ({
      variable: expr.variable,
      dependent_variables: expr.dependent_variables,
      expression: expr.expression,
      return_type: expr.return_type,
      default_value: expr.default_value,
      metadata: expr.metadata
    })),
    transitions: (reactFlowNode.data.transitions || []).map(transition => ({
      variable: transition.variables?.length === 1 ? transition.variables[0] : transition.variables,
      case: transition.case,
      logic: transition.logic,
      state_id: transition.state_id
    }))
  };
}

/**
 * Создает шаблон технического узла с примерами
 * @param {string} name - Имя состояния
 * @returns {Object} Шаблон технического узла
 */
export function createTechnicalNodeTemplate(name = 'NewTechnicalState') {
  return {
    id: `technical_${Date.now()}`,
    type: 'technical',
    state_type: 'technical',
    name: name,
    start: false,
    expressions: [
      {
        variable: 'example_check',
        dependent_variables: ['example_var'],
        expression: 'example_var > 0',
        return_type: 'boolean',
        default_value: false,
        metadata: {
          description: 'Пример проверки',
          category: 'example',
          tags: ['example'],
          examples: [
            {
              input: { example_var: 10 },
              output: true,
              description: 'Положительное значение'
            },
            {
              input: { example_var: -5 },
              output: false,
              description: 'Отрицательное значение'
            }
          ],
          version: '1.0'
        }
      }
    ],
    transitions: [
      {
        variable: 'example_check',
        case: 'True',
        state_id: 'SuccessState'
      },
      {
        variable: 'example_check',
        case: 'False',
        state_id: 'FailureState'
      }
    ],
    edges: []
  };
}

/**
 * Список доступных безопасных функций для expression (соответствует бэкенду)
 */
export const SAFE_FUNCTIONS_LIST = [
  // Математические
  { name: 'abs', category: 'math', description: 'Абсолютное значение', example: 'abs(-5) => 5' },
  { name: 'round', category: 'math', description: 'Округление числа', example: 'round(3.14159, 2) => 3.14' },
  { name: 'min', category: 'math', description: 'Минимальное значение', example: 'min([1, 2, 3]) => 1' },
  { name: 'max', category: 'math', description: 'Максимальное значение', example: 'max([1, 2, 3]) => 3' },
  { name: 'sum', category: 'math', description: 'Сумма элементов', example: 'sum([1, 2, 3]) => 6' },
  { name: 'pow', category: 'math', description: 'Возведение в степень', example: 'pow(2, 3) => 8' },
  
  // Строковые
  { name: 'upper', category: 'string', description: 'Преобразование в верхний регистр', example: 'upper("hello") => "HELLO"' },
  { name: 'lower', category: 'string', description: 'Преобразование в нижний регистр', example: 'lower("HELLO") => "hello"' },
  { name: 'strip', category: 'string', description: 'Удаление пробелов', example: 'strip(" hello ") => "hello"' },
  { name: 'startswith', category: 'string', description: 'Проверка начала строки', example: 'startswith(email, "admin@")' },
  { name: 'endswith', category: 'string', description: 'Проверка окончания строки', example: 'endswith(filename, ".pdf")' },
  { name: 'contains', category: 'string', description: 'Проверка вхождения подстроки', example: 'contains(text, "error")' },
  
  // Коллекции
  { name: 'len', category: 'collection', description: 'Длина коллекции', example: 'len([1, 2, 3]) => 3' },
  { name: 'any', category: 'collection', description: 'Хотя бы один True', example: 'any([False, True, False]) => True' },
  { name: 'all', category: 'collection', description: 'Все элементы True', example: 'all([True, True, True]) => True' },
  { name: 'sorted', category: 'collection', description: 'Сортировка списка', example: 'sorted([3, 1, 2]) => [1, 2, 3]' },
  { name: 'reversed', category: 'collection', description: 'Реверс списка', example: 'reversed([1, 2, 3]) => [3, 2, 1]' },
  
  // Проверки
  { name: 'is_none', category: 'check', description: 'Проверка на None', example: 'is_none(value)' },
  { name: 'is_not_none', category: 'check', description: 'Проверка что не None', example: 'is_not_none(value)' },
  { name: 'is_empty', category: 'check', description: 'Проверка на пустоту', example: 'is_empty([])' },
  
  // Словари
  { name: 'get', category: 'dict', description: 'Получение значения из словаря', example: 'get(user, "email", "no-email")' },
  { name: 'keys', category: 'dict', description: 'Ключи словаря', example: 'keys({"a": 1, "b": 2})' },
  { name: 'values', category: 'dict', description: 'Значения словаря', example: 'values({"a": 1, "b": 2})' },
  
  // Преобразования типов
  { name: 'int', category: 'cast', description: 'Преобразование в int', example: 'int("123", 0) => 123' },
  { name: 'float', category: 'cast', description: 'Преобразование в float', example: 'float("3.14", 0.0) => 3.14' },
  { name: 'str', category: 'cast', description: 'Преобразование в string', example: 'str(123) => "123"' },
  { name: 'bool', category: 'cast', description: 'Преобразование в boolean', example: 'bool(1) => True' }
];

/**
 * Группирует функции по категориям для отображения в UI
 * @returns {Object} Функции, сгруппированные по категориям
 */
export function getSafeFunctionsByCategory() {
  const grouped = {};
  
  SAFE_FUNCTIONS_LIST.forEach(func => {
    if (!grouped[func.category]) {
      grouped[func.category] = [];
    }
    grouped[func.category].push(func);
  });
  
  return grouped;
}

// ==================== INTEGRATION STATES ====================

/**
 * Нормализует expression для integration state
 * @param {Object} expression - Выражение из avitoDemo
 * @returns {Object} Нормализованное выражение
 */
function normalizeIntegrationExpression(expression) {
  if (!expression) return null;

  return {
    variable: expression.variable,
    url: expression.url,
    params: expression.params || {},
    method: expression.method || 'get',
    headers: expression.headers || {},
    timeout: expression.timeout || 30,
    metadata: expression.metadata ? {
      description: expression.metadata.description,
      category: expression.metadata.category,
      tags: expression.metadata.tags || []
    } : null
  };
}

/**
 * Создает шаблон integration узла
 * @param {string} name - Имя состояния
 * @param {Object} config - Конфигурация
 * @returns {Object} Шаблон integration узла
 */
export function createIntegrationNodeTemplate(name = 'NewIntegrationState', config = {}) {
  const {
    variableName = 'api_result',
    url = 'https://api.example.com/endpoint',
    method = 'get',
    params = {},
    nextState = ''
  } = config;

  return {
    id: `integration_${Date.now()}`,
    type: 'integration',
    state_type: 'integration',
    name: name,
    start: false,
    expressions: [
      {
        variable: variableName,
        url: url,
        params: params,
        method: method,
        metadata: {
          description: 'API integration',
          category: 'data',
          tags: ['api']
        }
      }
    ],
    transitions: [
      {
        variable: variableName,
        case: null,
        state_id: nextState
      }
    ],
    edges: []
  };
}

/**
 * Валидирует integration expression
 * @param {Object} expression - Выражение для валидации
 * @returns {Array<string>} Массив ошибок
 */
export function validateIntegrationExpression(expression) {
  const errors = [];

  if (!expression) {
    errors.push('Expression is required');
    return errors;
  }

  // Проверка обязательных полей
  if (!expression.variable) {
    errors.push('Variable name is required');
  } else if (!/^[a-z_][a-z0-9_]*$/.test(expression.variable)) {
    errors.push('Variable name must be snake_case (lowercase, numbers, underscores)');
  }

  if (!expression.url) {
    errors.push('URL is required');
  } else if (!/^https?:\/\/.+/.test(expression.url)) {
    errors.push('URL must start with http:// or https://');
  }

  // Проверка HTTP метода
  const allowedMethods = ['get', 'post', 'put', 'delete', 'patch'];
  if (expression.method && !allowedMethods.includes(expression.method.toLowerCase())) {
    errors.push(`Invalid HTTP method: ${expression.method}. Allowed: ${allowedMethods.join(', ')}`);
  }

  // Проверка params
  if (expression.params && typeof expression.params !== 'object') {
    errors.push('Params must be an object');
  }

  return errors;
}

/**
 * Валидирует integration узел целиком
 * @param {Object} integrationNode - Узел типа integration
 * @returns {Object} Результат валидации
 */
export function validateIntegrationNode(integrationNode) {
  const errors = [];

  if (!integrationNode.expressions || !Array.isArray(integrationNode.expressions)) {
    errors.push('Integration node must have expressions array');
    return { valid: false, errors };
  }

  if (!integrationNode.transitions || !Array.isArray(integrationNode.transitions)) {
    errors.push('Integration node must have transitions array');
    return { valid: false, errors };
  }

  // Валидация каждого выражения
  integrationNode.expressions.forEach((expr, idx) => {
    const exprErrors = validateIntegrationExpression(expr);
    exprErrors.forEach(err => {
      errors.push(`Expression ${idx}: ${err}`);
    });
  });

  // Валидация transitions
  const expressionVariables = new Set(
    integrationNode.expressions.map(expr => expr.variable)
  );

  integrationNode.transitions.forEach((transition, idx) => {
    if (!transition.variable) {
      errors.push(`Transition ${idx}: variable is required`);
    } else if (!expressionVariables.has(transition.variable)) {
      errors.push(`Transition ${idx}: variable "${transition.variable}" not found in expressions`);
    }

    if (transition.case !== null) {
      errors.push(`Transition ${idx}: case must be null for integration states`);
    }

    if (!transition.state_id) {
      errors.push(`Transition ${idx}: state_id is required`);
    }
  });

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Выполняет HTTP запрос из integration expression
 * @param {Object} expression - Integration expression
 * @param {Object} context - Текущий контекст для подстановки переменных
 * @returns {Promise<Object>} Результат запроса
 */
export async function executeIntegrationExpression(expression, context = {}) {
  // Подстановка переменных в URL
  let url = expression.url;
  const matches = url.match(/\{\{([^}]+)\}\}/g);
  if (matches) {
    matches.forEach(match => {
      const varName = match.replace(/[{}]/g, '');
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
      const varName = value.replace(/[{}]/g, '');
      params[key] = context[varName] !== undefined ? context[varName] : value;
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

    const response = await fetch(url, options);
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      success: true,
      data: data,
      status: response.status,
      variable: expression.variable
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      variable: expression.variable
    };
  }
}

/**
 * Генерирует документацию для integration узла
 * @param {Object} integrationNode - Узел типа integration
 * @returns {string} Markdown документация
 */
export function generateIntegrationNodeDocumentation(integrationNode) {
  if (!integrationNode || integrationNode.type !== 'integration') {
    return '';
  }

  let doc = `# ${integrationNode.name || integrationNode.id}\n\n`;

  if (integrationNode.description || integrationNode.metadata?.description) {
    doc += `${integrationNode.description || integrationNode.metadata.description}\n\n`;
  }

  doc += `**Тип:** Integration State 🌐\n\n`;

  doc += `---\n\n`;

  // Документация API запросов
  if (integrationNode.expressions && integrationNode.expressions.length > 0) {
    doc += `## API Запросы\n\n`;
    integrationNode.expressions.forEach((expr, idx) => {
      doc += `### ${idx + 1}. ${expr.variable}\n\n`;
      doc += `**URL:** \`${expr.url}\`\n\n`;
      doc += `**Метод:** \`${(expr.method || 'GET').toUpperCase()}\`\n\n`;

      if (expr.params && Object.keys(expr.params).length > 0) {
        doc += `**Параметры:**\n`;
        Object.entries(expr.params).forEach(([key, value]) => {
          doc += `- \`${key}\`: \`${value}\`\n`;
        });
        doc += '\n';
      }

      if (expr.headers && Object.keys(expr.headers).length > 0) {
        doc += `**Заголовки:**\n`;
        Object.entries(expr.headers).forEach(([key, value]) => {
          doc += `- \`${key}\`: \`${value}\`\n`;
        });
        doc += '\n';
      }

      if (expr.metadata?.description) {
        doc += `**Описание:** ${expr.metadata.description}\n\n`;
      }

      doc += `**Результат сохраняется в:** \`context["${expr.variable}"]\`\n\n`;
    });
  }

  // Документация переходов
  if (integrationNode.transitions && integrationNode.transitions.length > 0) {
    doc += `## Переходы\n\n`;
    integrationNode.transitions.forEach((transition, idx) => {
      doc += `${idx + 1}. После успешной загрузки → \`${transition.state_id}\`\n`;
    });
    doc += '\n';
  }

  return doc;
}

/**
 * Экспортирует integration state в формат для бэкенда
 * @param {Object} reactFlowNode - React Flow узел
 * @returns {Object} Объект для отправки на бэкенд
 */
export function exportIntegrationNodeForBackend(reactFlowNode) {
  if (!reactFlowNode || reactFlowNode.type !== 'integration') {
    return null;
  }

  return {
    state_type: 'integration',
    name: reactFlowNode.data.label || reactFlowNode.id,
    initial_state: reactFlowNode.data.start || false,
    final_state: reactFlowNode.data.final || false,
    description: reactFlowNode.data.description,
    expressions: (reactFlowNode.data.expressions || []).map(expr => ({
      variable: expr.variable,
      url: expr.url,
      params: expr.params,
      method: expr.method,
      headers: expr.headers,
      timeout: expr.timeout,
      metadata: expr.metadata
    })),
    transitions: (reactFlowNode.data.transitions || []).map(transition => ({
      variable: transition.variable,
      case: null,
      state_id: transition.state_id
    }))
  };
}

// ==================== CART & QUANTITY MANAGEMENT ====================

/**
 * Изменяет количество товара в корзине
 * @param {Array} cartItems - Массив товаров в корзине
 * @param {string} itemId - ID товара
 * @param {number} delta - Изменение количества (+1, -1, или конкретное число)
 * @param {Object} options - Дополнительные опции
 * @param {number} options.min - Минимальное количество (по умолчанию 0)
 * @param {number} options.max - Максимальное количество (по умолчанию 99)
 * @param {boolean} options.removeOnZero - Удалять ли товар при quantity = 0 (по умолчанию false)
 * @returns {Object} Результат операции { success: boolean, items: Array, message: string }
 */
export function updateItemQuantity(cartItems, itemId, delta, options = {}) {
  const { min = 0, max = 99, removeOnZero = false } = options;
  
  if (!Array.isArray(cartItems)) {
    return {
      success: false,
      items: [],
      message: 'cartItems must be an array'
    };
  }

  const itemIndex = cartItems.findIndex(item => item.id === itemId);
  
  if (itemIndex === -1) {
    return {
      success: false,
      items: cartItems,
      message: `Item with id "${itemId}" not found`
    };
  }

  const updatedItems = [...cartItems];
  const item = { ...updatedItems[itemIndex] };
  const currentQuantity = item.quantity || 0;
  const newQuantity = currentQuantity + delta;

  // Валидация количества
  if (newQuantity < min) {
    if (removeOnZero && newQuantity === 0) {
      // Удаляем товар
      updatedItems.splice(itemIndex, 1);
      return {
        success: true,
        items: updatedItems,
        message: `Item "${item.title || itemId}" removed from cart`,
        removed: true
      };
    }
    return {
      success: false,
      items: cartItems,
      message: `Quantity cannot be less than ${min}`
    };
  }

  if (newQuantity > max) {
    return {
      success: false,
      items: cartItems,
      message: `Quantity cannot exceed ${max}`
    };
  }

  // Обновляем количество
  item.quantity = newQuantity;
  updatedItems[itemIndex] = item;

  return {
    success: true,
    items: updatedItems,
    message: `Quantity updated to ${newQuantity}`,
    previousQuantity: currentQuantity,
    newQuantity: newQuantity
  };
}

/**
 * Устанавливает конкретное количество товара
 * @param {Array} cartItems - Массив товаров
 * @param {string} itemId - ID товара
 * @param {number} quantity - Новое количество
 * @param {Object} options - Опции валидации
 * @returns {Object} Результат операции
 */
export function setItemQuantity(cartItems, itemId, quantity, options = {}) {
  const { min = 0, max = 99 } = options;
  
  if (!Array.isArray(cartItems)) {
    return {
      success: false,
      items: [],
      message: 'cartItems must be an array'
    };
  }

  if (typeof quantity !== 'number' || quantity < min || quantity > max) {
    return {
      success: false,
      items: cartItems,
      message: `Quantity must be between ${min} and ${max}`
    };
  }

  const itemIndex = cartItems.findIndex(item => item.id === itemId);
  
  if (itemIndex === -1) {
    return {
      success: false,
      items: cartItems,
      message: `Item with id "${itemId}" not found`
    };
  }

  const updatedItems = [...cartItems];
  const previousQuantity = updatedItems[itemIndex].quantity || 0;
  updatedItems[itemIndex] = {
    ...updatedItems[itemIndex],
    quantity: quantity
  };

  return {
    success: true,
    items: updatedItems,
    message: `Quantity set to ${quantity}`,
    previousQuantity,
    newQuantity: quantity
  };
}

/**
 * Пересчитывает итоговые суммы корзины
 * @param {Array} cartItems - Массив товаров
 * @returns {Object} Рассчитанные суммы
 */
export function calculateCartTotals(cartItems) {
  if (!Array.isArray(cartItems)) {
    return {
      selectedCount: 0,
      totalPrice: 0,
      totalDiscount: 0,
      itemsCount: 0
    };
  }

  const selectedItems = cartItems.filter(item => item.isSelected !== false);
  
  const totals = selectedItems.reduce((acc, item) => {
    const quantity = item.quantity || 0;
    const price = item.price || 0;
    const originalPrice = item.originalPrice || 0;
    
    acc.selectedCount += quantity;
    acc.totalPrice += price * quantity;
    
    if (originalPrice > price) {
      acc.totalDiscount += (originalPrice - price) * quantity;
    }
    
    return acc;
  }, {
    selectedCount: 0,
    totalPrice: 0,
    totalDiscount: 0
  });

  totals.itemsCount = cartItems.length;

  return totals;
}

/**
 * Создаёт contextPatch для изменения количества товара
 * @param {string} itemId - ID товара
 * @param {number} delta - Изменение количества
 * @param {Object} options - Опции
 * @returns {Object} contextPatch для применения
 */
export function createQuantityChangeContextPatch(itemId, delta, options = {}) {
  const { 
    cartPath = 'cart.items',
    removeOnZero = false,
    recalculateTotals = true 
  } = options;

  return {
    action: 'update_item_quantity',
    itemId: itemId,
    delta: delta,
    cartPath: cartPath,
    removeOnZero: removeOnZero,
    recalculateTotals: recalculateTotals
  };
}

/**
 * Применяет изменение количества к контексту
 * @param {Object} context - Текущий контекст
 * @param {string} itemId - ID товара
 * @param {number} delta - Изменение количества
 * @param {Object} options - Опции
 * @returns {Object} Обновлённый контекст
 */
export function applyQuantityChangeToContext(context, itemId, delta, options = {}) {
  const { 
    cartPath = 'cart.items',
    removeOnZero = false,
    min = 0,
    max = 99
  } = options;

  // Получаем текущий массив товаров
  const pathParts = cartPath.split('.');
  let cartItems = context;
  
  for (const part of pathParts) {
    if (!cartItems[part]) {
      return {
        ...context,
        error: `Path ${cartPath} not found in context`
      };
    }
    cartItems = cartItems[part];
  }

  // Обновляем количество
  const result = updateItemQuantity(cartItems, itemId, delta, { min, max, removeOnZero });

  if (!result.success) {
    return {
      ...context,
      error: result.message
    };
  }

  // Создаём обновлённый контекст
  const updatedContext = { ...context };
  let target = updatedContext;
  
  for (let i = 0; i < pathParts.length - 1; i++) {
    target[pathParts[i]] = { ...target[pathParts[i]] };
    target = target[pathParts[i]];
  }
  
  target[pathParts[pathParts.length - 1]] = result.items;

  // Пересчитываем итоговые суммы
  const totals = calculateCartTotals(result.items);
  
  if (updatedContext.cart) {
    updatedContext.cart = {
      ...updatedContext.cart,
      items: result.items,
      selectedCount: totals.selectedCount,
      totalPrice: totals.totalPrice,
      totalDiscount: totals.totalDiscount
    };
  }

  return updatedContext;
}

/**
 * Создаёт action-узел для управления количеством товара
 * @param {Object} config - Конфигурация узла
 * @returns {Object} Action-узел для avitoDemo
 */
export function createQuantityActionNode(config = {}) {
  const {
    id = `quantity_action_${Date.now()}`,
    name = 'UpdateQuantity',
    itemIdVariable = 'itemId',
    deltaVariable = 'quantityDelta',
    minQuantity = 0,
    maxQuantity = 99,
    removeOnZero = false
  } = config;

  return {
    id: id,
    type: 'action',
    label: name,
    data: {
      actionType: 'modify-cart-item',
      config: {
        operation: 'update_quantity',
        itemIdVariable: itemIdVariable,
        deltaVariable: deltaVariable,
        min: minQuantity,
        max: maxQuantity,
        removeOnZero: removeOnZero
      },
      description: `Updates quantity of cart item using ${deltaVariable} (+1 or -1)`
    },
    edges: [
      {
        id: `${id}-success`,
        target: 'NextState',
        label: 'Success',
        event: 'quantity_updated',
        contextPatch: {
          action: 'update_item_quantity',
          itemIdVariable: itemIdVariable,
          deltaVariable: deltaVariable
        }
      },
      {
        id: `${id}-error`,
        target: 'ErrorState',
        label: 'Error',
        event: 'quantity_error'
      }
    ]
  };
}

/**
 * Валидирует операцию изменения количества
 * @param {Object} operation - Операция для валидации
 * @returns {Object} Результат валидации
 */
export function validateQuantityOperation(operation) {
  const errors = [];

  if (!operation.itemId && !operation.itemIdVariable) {
    errors.push('itemId or itemIdVariable is required');
  }

  if (operation.delta === undefined && !operation.deltaVariable && operation.quantity === undefined) {
    errors.push('delta, deltaVariable, or quantity is required');
  }

  if (operation.min !== undefined && typeof operation.min !== 'number') {
    errors.push('min must be a number');
  }

  if (operation.max !== undefined && typeof operation.max !== 'number') {
    errors.push('max must be a number');
  }

  if (operation.min !== undefined && operation.max !== undefined && operation.min > operation.max) {
    errors.push('min cannot be greater than max');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Преобразует screens из avitoDemo в массив для ProductOverview
 * @param {Object} screens - Объект screens из avitoDemo.json
 * @param {Array} nodes - Массив nodes из avitoDemo.json
 * @returns {Array} Массив экранов для ProductOverview
 */
export function convertAvitoDemoScreensToArray(screens, nodes) {
  if (!screens || typeof screens !== 'object') {
    return [];
  }

  // Создаём map узлов для быстрого доступа
  const nodeMap = new Map();
  if (nodes && Array.isArray(nodes)) {
    nodes.forEach(node => {
      nodeMap.set(node.screenId || node.id, node);
    });
  }

  return Object.entries(screens).map(([screenId, screenData], index) => {
    const node = nodeMap.get(screenId);
    const sections = screenData.sections || {};
    const componentsCount = Object.values(sections).reduce((count, section) => {
      return count + (section.children?.length || 0);
    }, 0);

    // Для технических узлов показываем дополнительную информацию
    const isTechnical = node?.type === 'technical' || node?.state_type === 'technical';
    const description = isTechnical
      ? `Technical State: ${node.expressions?.length || 0} expressions, ${node.transitions?.length || 0} transitions`
      : `Screen ${screenData.name || screenId}`;

    return {
      id: screenId,
      name: screenData.name || screenId,
      type: node?.type || 'screen',
      description: description,
      order: index + 1,
      components: componentsCount,
      actions: node?.edges?.length || node?.transitions?.length || 0,
      status: 'complete',
      // Дополнительная информация для технических узлов
      ...(isTechnical && {
        expressionsCount: node.expressions?.length || 0,
        transitionsCount: node.transitions?.length || 0
      })
    };
  });
}
