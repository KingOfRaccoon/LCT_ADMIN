/**
 * Workflow Mapper - конвертация BDUI graphData в серверный StateModel формат
 * 
 * Преобразует внутреннюю структуру nodes/edges в формат,
 * совместимый с серверным Workflow API согласно integration-guide.md
 */

import '../types/workflowContract.js';

/**
 * Определяет тип состояния на основе данных узла BDUI
 * @param {Object} node - Узел из graphData
 * @returns {StateType} Тип состояния
 */
function detectStateType(node) {
  const nodeType = node.type?.toLowerCase();
  const nodeData = node.data || {};
  const stateType = node.state_type?.toLowerCase();

  // Прямая проверка state_type или type
  if (stateType === 'integration' || nodeType === 'integration') {
    return 'integration';
  }
  if (stateType === 'technical' || nodeType === 'technical') {
    return 'technical';
  }
  if (stateType === 'subflow' || nodeType === 'subflow') {
    return 'subflow';
  }
  if (stateType === 'screen' || nodeType === 'screen') {
    return 'screen';
  }
  if (stateType === 'service' || nodeType === 'service') {
    return 'service';
  }

  // Если есть actionType в data - это action узел
  if (nodeData.actionType) {
    // API вызовы
    if (nodeData.actionType === 'api-call') {
      return 'integration';
    }
    // Условия, вычисления, модификация корзины
    if (nodeData.actionType === 'condition' || 
        nodeData.actionType === 'modify-cart-item' ||
        nodeData.actionType === 'calculation') {
      return 'technical';
    }
    // Другие действия (context-update и т.д.) - тоже technical
    return 'technical';
  }

  // Action узлы с API вызовами (по типу узла)
  if (nodeType === 'action' && nodeData.actionType === 'api-call') {
    return 'integration';
  }

  // Action узлы с вычислениями/условиями (по типу узла)
  if (nodeType === 'action' && 
      (nodeData.actionType === 'condition' || 
       nodeData.actionType === 'modify-cart-item' ||
       nodeData.actionType === 'calculation')) {
    return 'technical';
  }

  // Screen узлы (явно указан тип или есть screenId)
  if (nodeData.screenId) {
    return 'screen';
  }

  // Service узлы (init, cleanup и т.д.)
  if (nodeData.isServiceNode) {
    return 'service';
  }

  // По умолчанию - screen
  return 'screen';
}

/**
 * Создает expressions для технического состояния
 * @param {Object} nodeData - Данные узла
 * @returns {TechnicalExpression[]}
 */
function createTechnicalExpressions(nodeData) {
  const expressions = [];
  
  if (nodeData.actionType === 'condition') {
    // Условное выражение
    const variable = nodeData.config?.resultVariable || 'result';
    const condition = nodeData.config?.condition || 'true';
    const deps = nodeData.config?.dependencies || [];

    expressions.push({
      variable,
      dependent_variables: deps,
      expression: condition
    });
  } else if (nodeData.actionType === 'modify-cart-item') {
    // Модификация корзины
    const variable = 'cart.items';
    const deps = ['cart.items', 'inputs.itemId', 'inputs.delta'];
    const expr = 'modifyCartItem(cart.items, inputs.itemId, inputs.delta)';

    expressions.push({
      variable,
      dependent_variables: deps,
      expression: expr
    });
  } else if (nodeData.contextPatch) {
    // Общий случай - из contextPatch
    Object.entries(nodeData.contextPatch).forEach(([key, value]) => {
      if (typeof value === 'string' && value.includes('${')) {
        // Это биндинг - извлекаем зависимости
        const deps = extractDependencies(value);
        expressions.push({
          variable: key,
          dependent_variables: deps,
          expression: value
        });
      }
    });
  }

  return expressions;
}

/**
 * Создает expressions для integration состояния
 * @param {Object} node - Узел (может быть BDUI node или готовый state)
 * @param {Object} nodeData - Данные узла
 * @returns {IntegrationExpression[]}
 */
function createIntegrationExpressions(node, nodeData) {
  // Если expressions уже есть на верхнем уровне узла - нормализуем и возвращаем
  if (Array.isArray(node.expressions) && node.expressions.length > 0) {
    return node.expressions.map(expr => normalizeIntegrationExpression(expr));
  }

  // Если expressions в nodeData - нормализуем и возвращаем
  if (Array.isArray(nodeData.expressions) && nodeData.expressions.length > 0) {
    return nodeData.expressions.map(expr => normalizeIntegrationExpression(expr));
  }

  // Иначе создаём из config
  const expressions = [];
  const config = nodeData.config || {};

  // Определяем имя переменной для результата API
  const resultVariable = config.resultVariable || config.variable || 'api_result';

  if (config.url) {
    const expr = {
      variable: resultVariable,
      url: config.url,
      params: config.params || {},
      method: config.method?.toLowerCase() || 'get'
    };
    
    expressions.push(normalizeIntegrationExpression(expr));
  }

  return expressions;
}

/**
 * Нормализует IntegrationExpression - перемещает body в params для DELETE/GET
 * @param {Object} expr - Expression для нормализации
 * @returns {Object} Нормализованный expression
 */
function normalizeIntegrationExpression(expr) {
  const method = expr.method?.toLowerCase();
  
  // Если метод DELETE или GET и есть body - перемещаем в params
  if ((method === 'delete' || method === 'get') && expr.body) {
    return {
      ...expr,
      params: { ...(expr.params || {}), ...expr.body },
      body: undefined
    };
  }
  
  return expr;
}

/**
 * Создает expressions для subflow состояния
 * @param {Object} node - Узел целиком
 * @param {Object} nodeData - Данные узла
 * @returns {SubflowExpression[]}
 */
function createSubflowExpressions(node, nodeData) {
  // Если expressions уже есть на верхнем уровне узла - нормализуем и используем их
  if (Array.isArray(node.expressions) && node.expressions.length > 0) {
    return node.expressions.map(expr => normalizeSubflowExpression(expr, node));
  }

  // Если expressions в nodeData - нормализуем и используем их
  if (Array.isArray(nodeData.expressions) && nodeData.expressions.length > 0) {
    return nodeData.expressions.map(expr => normalizeSubflowExpression(expr, node));
  }

  // Создаём из config или data
  const config = nodeData.config || nodeData;
  const expressions = [];

  if (config.subflow_workflow_id) {
    const expr = {
      subflow_workflow_id: config.subflow_workflow_id,
      input_mapping: config.input_mapping || {},
      output_mapping: config.output_mapping || {},
      dependent_variables: config.dependent_variables || [],
      error_variable: config.error_variable || null
    };
    
    expressions.push(normalizeSubflowExpression(expr, node));
  }

  return expressions;
}

/**
 * Нормализует SubflowExpression - добавляет поле variable если его нет
 * @param {Object} expr - Expression для нормализации
 * @param {Object} node - Узел целиком (для получения имени переменной из transitions)
 * @returns {Object} Нормализованный expression
 */
function normalizeSubflowExpression(expr, node) {
  // Если variable уже есть - используем как есть
  if (expr.variable) {
    return expr;
  }

  // Пытаемся найти имя переменной из transitions
  let variableName = 'subflow_result'; // по умолчанию
  
  if (Array.isArray(node.transitions) && node.transitions.length > 0) {
    // Берём первый не-error transition
    const firstTransition = node.transitions.find(t => 
      t.variable && t.variable !== expr.error_variable
    );
    
    if (firstTransition && firstTransition.variable) {
      variableName = firstTransition.variable;
    }
  }

  return {
    variable: variableName,
    ...expr
  };
}

/**
 * Создает expressions для screen состояния
 * @param {Object} nodeData - Данные узла
 * @param {Array} outgoingEdges - Исходящие рёбра
 * @returns {EventExpression[]}
 */
function createScreenExpressions(nodeData, outgoingEdges) {
  const expressions = [];

  // Добавляем события из рёбер
  outgoingEdges.forEach(edge => {
    const eventName = edge.data?.event || edge.label || edge.id;
    if (eventName && !expressions.find(e => e.event_name === eventName)) {
      expressions.push({
        event_name: eventName
      });
    }
  });

  return expressions;
}

/**
 * Извлекает зависимости из строки с биндингами
 * @param {string} value - Значение с биндингами ${...}
 * @returns {string[]} Список зависимостей
 */
function extractDependencies(value) {
  const deps = new Set();
  const regex = /\$\{([^}]+)\}/g;
  let match;

  while ((match = regex.exec(value)) !== null) {
    const varName = match[1].trim();
    // Извлекаем базовую переменную (до первой точки или скобки)
    const baseName = varName.split(/[.[\s]/)[0];
    if (baseName) {
      deps.add(baseName);
    }
  }

  return Array.from(deps);
}

/**
 * Создает transitions для состояния
 * @param {Array} outgoingEdges - Исходящие рёбра
 * @param {StateType} stateType - Тип состояния
 * @param {Map} nodeIdToName - Карта nodeId -> state_name
 * @param {Object} nodeData - Данные узла (для извлечения variable из config)
 * @returns {Transition[]}
 */
function createTransitions(outgoingEdges, stateType, nodeIdToName, nodeData = {}) {
  const transitions = [];

  if (stateType === 'integration') {
    // Integration state должен иметь ровно 1 transition с case=null и variable
    if (outgoingEdges.length > 0) {
      const firstEdge = outgoingEdges[0];
      const targetStateName = nodeIdToName.get(firstEdge.target) || firstEdge.target;
      
      // Извлекаем variable из config или edge
      const variable = nodeData.config?.resultVariable || 
                      nodeData.config?.variable || 
                      firstEdge.data?.variable ||
                      'api_result';
      
      transitions.push({
        variable: variable,
        case: null, // Integration всегда имеет case=null
        state_id: targetStateName
      });
    }
  } else if (stateType === 'screen') {
    // Screen state: case = event_name из ребра
    outgoingEdges.forEach(edge => {
      const targetStateName = nodeIdToName.get(edge.target) || edge.target;
      const eventName = edge.data?.event || edge.label || null;
      
      const transition = {
        case: eventName, // event_name для screen состояний
        state_id: targetStateName
      };

      transitions.push(transition);
    });
  } else {
    // Technical и service states: variable + case (condition)
    outgoingEdges.forEach(edge => {
      const targetStateName = nodeIdToName.get(edge.target) || edge.target;
      
      // Для technical state порядок: variable, case, state_id
      const variable = edge.data?.variable || 
                      nodeData.config?.resultVariable ||
                      nodeData.config?.variable ||
                      null;
      
      const condition = edge.data?.case || edge.data?.condition;
      
      const transition = {
        state_id: targetStateName
      };

      // Добавляем variable первым (если есть)
      if (variable) {
        transition.variable = variable;
      }

      // Добавляем case
      transition.case = condition || null;

      // Переупорядочиваем ключи: variable, case, state_id
      const orderedTransition = {};
      if (transition.variable) {
        orderedTransition.variable = transition.variable;
      }
      orderedTransition.case = transition.case;
      orderedTransition.state_id = transition.state_id;

      transitions.push(orderedTransition);
    });
  }

  return transitions;
}

/**
 * Преобразует один узел BDUI в StateModel
 * @param {Object} node - Узел из graphData
 * @param {Array} allEdges - Все рёбра графа
 * @param {Set} initialNodes - Множество начальных узлов
 * @param {Set} finalNodes - Множество конечных узлов
 * @param {Map} nodeIdToName - Карта nodeId -> state_name
 * @param {Object} screens - Объект с данными экранов (screens[screenId])
 * @returns {StateModel}
 */
function mapNodeToState(node, allEdges, initialNodes, finalNodes, nodeIdToName, screens = {}) {
  const stateType = detectStateType(node);
  const nodeData = node.data || {};
  
  // Используем edges из node.edges (если есть) или ищем в allEdges
  const outgoingEdges = Array.isArray(node.edges) && node.edges.length > 0
    ? node.edges
    : allEdges.filter(e => e.source === node.id);

  // Создаем expressions в зависимости от типа
  let expressions = [];
  if (stateType === 'technical') {
    expressions = createTechnicalExpressions(nodeData);
  } else if (stateType === 'integration') {
    expressions = createIntegrationExpressions(node, nodeData);
  } else if (stateType === 'subflow') {
    expressions = createSubflowExpressions(node, nodeData);
  } else if (stateType === 'screen') {
    expressions = createScreenExpressions(nodeData, outgoingEdges);
  }

  // Создаем transitions
  // Если transitions уже есть на верхнем уровне узла - используем их
  let transitions = [];
  
  if (Array.isArray(node.transitions) && node.transitions.length > 0) {
    // Маппим state_id через nodeIdToName и сохраняем порядок полей
    transitions = node.transitions.map(t => {
      const mappedStateId = nodeIdToName.get(t.state_id) || t.state_id;
      
      // Сохраняем порядок полей: variable (если есть), case, state_id
      const transition = {};
      if (t.variable != null) {  // Проверяем на null и undefined
        transition.variable = t.variable;
      }
      if (t.case !== undefined) {  // case может быть null, это нормально
        transition.case = t.case;
      }
      transition.state_id = mappedStateId;
      
      return transition;
    });
  } else {
    // Иначе создаём из рёбер
    transitions = createTransitions(outgoingEdges, stateType, nodeIdToName, nodeData);
  }

  // Базовый объект состояния с правильным порядком полей
  const state = {
    state_type: stateType,
    name: node.label || nodeData.label || node.id
  };

  // Добавляем screen - для screen состояний с данными, для subflow/technical/integration пустой объект
  if (stateType === 'screen') {
    if (nodeData.screenId && screens[nodeData.screenId]) {
      state.screen = screens[nodeData.screenId];
    } else {
      state.screen = {};
      if (process.env.NODE_ENV === 'development') {
        console.warn(`⚠️ [workflowMapper] Screen state without screen data: "${nodeData.label || node.id}"`, {
          stateType,
          hasScreenId: !!nodeData.screenId,
          screenId: nodeData.screenId,
          screenExists: nodeData.screenId ? !!screens[nodeData.screenId] : false,
          availableScreens: Object.keys(screens)
        });
      }
    }
  } else if (stateType === 'subflow') {
    // Для subflow screen всегда пустой объект (по контракту)
    state.screen = {};
  }

  // Добавляем transitions
  state.transitions = transitions;

  // Добавляем expressions
  state.expressions = expressions;

  // Добавляем events - для subflow всегда пустой массив
  if (stateType === 'subflow') {
    state.events = [];
  }

  // Добавляем initial_state и final_state в конце
  state.initial_state = node.start === true || initialNodes.has(node.id);
  state.final_state = node.final === true || finalNodes.has(node.id);

  return state;
}

/**
 * Находит начальные и конечные узлы
 * @param {Array} nodes - Все узлы
 * @param {Array} edges - Все рёбра
 * @returns {{initialNodes: Set, finalNodes: Set}}
 */
function findInitialAndFinalNodes(nodes, edges) {
  const hasIncoming = new Set();
  const hasOutgoing = new Set();

  // Анализируем edges (React Flow формат)
  edges.forEach(edge => {
    hasIncoming.add(edge.target);
    hasOutgoing.add(edge.source);
  });

  // Также анализируем transitions на верхнем уровне узлов
  nodes.forEach(node => {
    if (Array.isArray(node.transitions) && node.transitions.length > 0) {
      // У узла есть transitions - значит есть исходящие связи
      hasOutgoing.add(node.id);
      // Добавляем целевые состояния как имеющие входящие
      node.transitions.forEach(t => {
        if (t.state_id) {
          hasIncoming.add(t.state_id);
        }
      });
    }
    
    // Также проверяем node.edges (могут быть на уровне узла)
    if (Array.isArray(node.edges) && node.edges.length > 0) {
      hasOutgoing.add(node.id);
      node.edges.forEach(edge => {
        if (edge.target) {
          hasIncoming.add(edge.target);
        }
      });
    }
  });

  // Начальные узлы - те, у которых нет входящих рёбер
  const initialNodes = new Set(
    nodes
      .filter(node => !hasIncoming.has(node.id) || node.data?.start === true)
      .map(node => node.id)
  );

  // Конечные узлы - те, у которых нет исходящих рёбер
  const finalNodes = new Set(
    nodes
      .filter(node => !hasOutgoing.has(node.id) || node.data?.final === true)
      .map(node => node.id)
  );

  // Если нет явно помеченных начальных - берем первый без входящих
  if (initialNodes.size === 0 && nodes.length > 0) {
    const firstNode = nodes.find(n => !hasIncoming.has(n.id)) || nodes[0];
    initialNodes.add(firstNode.id);
  }

  // Если нет конечных - добавляем узлы без исходящих
  if (finalNodes.size === 0 && nodes.length > 0) {
    nodes.forEach(node => {
      if (!hasOutgoing.has(node.id)) {
        finalNodes.add(node.id);
      }
    });
  }

  return { initialNodes, finalNodes };
}

/**
 * Основная функция преобразования BDUI graphData в StateModel[]
 * @param {Object} graphData - graphData из VirtualContext (nodes + edges + screens)
 * @param {Object} [initialContext] - Начальный контекст (необязательно)
 * @returns {{states: StateModel[], predefined_context: Object}}
 */
export function mapGraphDataToWorkflow(graphData, initialContext = {}) {
  const { nodes = [], edges = [], screens = {} } = graphData;

  if (nodes.length === 0) {
    throw new Error('Graph must contain at least one node');
  }

  // Создаём карту nodeId -> name для резолва переходов
  const nodeIdToName = new Map();
  nodes.forEach(node => {
    const stateName = node.data?.label || node.id;
    nodeIdToName.set(node.id, stateName);
  });

  // Находим начальные и конечные узлы
  const { initialNodes, finalNodes } = findInitialAndFinalNodes(nodes, edges);

  // Преобразуем каждый узел в StateModel
  const states = nodes.map(node => 
    mapNodeToState(node, edges, initialNodes, finalNodes, nodeIdToName, screens)
  );

  // Валидация маппинга
  const mappedStateNames = new Set(states.map(s => s.name));
  states.forEach(state => {
    state.transitions.forEach(t => {
      if (!mappedStateNames.has(t.state_id)) {
        console.error(`[workflowMapper] Invalid transition: "${state.name}" -> "${t.state_id}" (target state does not exist)`);
      }
    });
  });

  return {
    states,
    predefined_context: initialContext
  };
}

/**
 * Вспомогательная функция для экспорта в JSON файл
 * @param {Object} graphData - graphData из VirtualContext
 * @param {Object} initialContext - Начальный контекст
 * @returns {string} JSON строка для сохранения
 */
export function exportWorkflowAsJson(graphData, initialContext = {}) {
  const workflow = mapGraphDataToWorkflow(graphData, initialContext);
  
  const exportData = {
    states: {
      states: workflow.states
    },
    predefined_context: workflow.predefined_context
  };

  return JSON.stringify(exportData, null, 2);
}
