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

  // Action узлы с API вызовами
  if (nodeType === 'action' && nodeData.actionType === 'api-call') {
    return 'integration';
  }

  // Action узлы с вычислениями/условиями
  if (nodeType === 'action' && 
      (nodeData.actionType === 'condition' || 
       nodeData.actionType === 'modify-cart-item' ||
       nodeData.actionType === 'calculation')) {
    return 'technical';
  }

  // Screen узлы
  if (nodeType === 'screen') {
    return 'screen';
  }

  // Service узлы (init, cleanup и т.д.)
  if (nodeType === 'service' || nodeData.isServiceNode) {
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
 * @param {Object} nodeData - Данные узла
 * @returns {IntegrationExpression[]}
 */
function createIntegrationExpressions(nodeData) {
  const expressions = [];
  const config = nodeData.config || {};

  if (config.url) {
    expressions.push({
      variable: config.resultVariable || 'apiResult',
      url: config.url,
      params: config.params || {},
      method: config.method?.toLowerCase() || 'get'
    });
  }

  return expressions;
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
 * @returns {Transition[]}
 */
function createTransitions(outgoingEdges, stateType, nodeIdToName) {
  const transitions = [];

  if (stateType === 'integration') {
    // Integration state должен иметь ровно 1 transition с case=null
    if (outgoingEdges.length > 0) {
      const firstEdge = outgoingEdges[0];
      const targetStateName = nodeIdToName.get(firstEdge.target) || firstEdge.target;
      transitions.push({
        state_id: targetStateName,
        case: null
      });
    }
  } else {
    // Для остальных типов - все transitions
    outgoingEdges.forEach(edge => {
      const targetStateName = nodeIdToName.get(edge.target) || edge.target;
      const transition = {
        state_id: targetStateName
      };

      // Добавляем case если есть условие
      const condition = edge.data?.case || edge.data?.condition;
      if (condition) {
        transition.case = condition;
      } else {
        transition.case = null;
      }

      // Добавляем variable если есть
      const variable = edge.data?.variable;
      if (variable) {
        transition.variable = variable;
      }

      transitions.push(transition);
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
 * @returns {StateModel}
 */
function mapNodeToState(node, allEdges, initialNodes, finalNodes, nodeIdToName) {
  const stateType = detectStateType(node);
  const nodeData = node.data || {};
  const outgoingEdges = allEdges.filter(e => e.source === node.id);

  // Создаем expressions в зависимости от типа
  let expressions = [];
  if (stateType === 'technical') {
    expressions = createTechnicalExpressions(nodeData);
  } else if (stateType === 'integration') {
    expressions = createIntegrationExpressions(nodeData);
  } else if (stateType === 'screen') {
    expressions = createScreenExpressions(nodeData, outgoingEdges);
  }

  // Создаем transitions
  const transitions = createTransitions(outgoingEdges, stateType, nodeIdToName);

  return {
    state_type: stateType,
    name: nodeData.label || node.id,
    initial_state: initialNodes.has(node.id),
    final_state: finalNodes.has(node.id),
    expressions: expressions,
    transitions: transitions
  };
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

  edges.forEach(edge => {
    hasIncoming.add(edge.target);
    hasOutgoing.add(edge.source);
  });

  console.log('🔍 [findInitialAndFinalNodes] Analyzing graph structure:', {
    totalNodes: nodes.length,
    totalEdges: edges.length,
    nodesWithIncoming: hasIncoming.size,
    nodesWithOutgoing: hasOutgoing.size,
    nodesWithoutIncoming: nodes.filter(n => !hasIncoming.has(n.id)).map(n => n.id),
    nodesWithoutOutgoing: nodes.filter(n => !hasOutgoing.has(n.id)).map(n => n.id)
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

  console.log('🔍 [findInitialAndFinalNodes] Before fallback logic:', {
    initialNodes: Array.from(initialNodes),
    finalNodes: Array.from(finalNodes)
  });

  // Если нет явно помеченных начальных - берем первый без входящих
  if (initialNodes.size === 0 && nodes.length > 0) {
    const firstNode = nodes.find(n => !hasIncoming.has(n.id)) || nodes[0];
    initialNodes.add(firstNode.id);
    console.log('⚠️ [findInitialAndFinalNodes] No initial nodes found, using fallback:', firstNode.id);
  }

  // Если нет конечных - добавляем узлы без исходящих
  if (finalNodes.size === 0 && nodes.length > 0) {
    nodes.forEach(node => {
      if (!hasOutgoing.has(node.id)) {
        finalNodes.add(node.id);
      }
    });
    console.log('⚠️ [findInitialAndFinalNodes] No final nodes found, using fallback:', Array.from(finalNodes));
  }

  console.log('✅ [findInitialAndFinalNodes] Final result:', {
    initialNodes: Array.from(initialNodes),
    finalNodes: Array.from(finalNodes)
  });

  return { initialNodes, finalNodes };
}

/**
 * Основная функция преобразования BDUI graphData в StateModel[]
 * @param {Object} graphData - graphData из VirtualContext (nodes + edges)
 * @param {Object} [initialContext] - Начальный контекст (необязательно)
 * @returns {{states: StateModel[], predefined_context: Object}}
 */
export function mapGraphDataToWorkflow(graphData, initialContext = {}) {
  const { nodes = [], edges = [] } = graphData;

  console.log('🗺️ [workflowMapper] Starting graph to workflow conversion:', {
    nodesCount: nodes.length,
    edgesCount: edges.length,
    nodeIds: nodes.map(n => n.id),
    nodeLabels: nodes.map(n => n.data?.label || n.id)
  });

  if (nodes.length === 0) {
    throw new Error('Graph must contain at least one node');
  }

  // Создаём карту nodeId -> name для резолва переходов
  const nodeIdToName = new Map();
  nodes.forEach(node => {
    const stateName = node.data?.label || node.id;
    nodeIdToName.set(node.id, stateName);
  });

  console.log('🗺️ [workflowMapper] NodeId -> StateName mapping:', 
    Array.from(nodeIdToName.entries()).map(([id, name]) => `${id} -> "${name}"`)
  );

  // Находим начальные и конечные узлы
  const { initialNodes, finalNodes } = findInitialAndFinalNodes(nodes, edges);

  console.log('🗺️ [workflowMapper] Initial and final nodes:', {
    initialCount: initialNodes.size,
    finalCount: finalNodes.size,
    initial: Array.from(initialNodes).map(id => {
      const name = nodeIdToName.get(id);
      return `${id} ("${name}")`;
    }),
    final: Array.from(finalNodes).map(id => {
      const name = nodeIdToName.get(id);
      return `${id} ("${name}")`;
    })
  });

  // Преобразуем каждый узел в StateModel
  const states = nodes.map(node => 
    mapNodeToState(node, edges, initialNodes, finalNodes, nodeIdToName)
  );

  console.log('🗺️ [workflowMapper] Mapped states:', {
    count: states.length,
    stateNames: states.map(s => s.name),
    stateTypes: states.map(s => `${s.name}: ${s.state_type}`),
    initialStates: states.filter(s => s.initial_state).map(s => s.name),
    finalStates: states.filter(s => s.final_state).map(s => s.name),
    transitions: states.map(s => ({
      from: s.name,
      to: s.transitions.map(t => t.state_id)
    }))
  });

  // Валидация маппинга
  const mappedStateNames = new Set(states.map(s => s.name));
  states.forEach(state => {
    state.transitions.forEach(t => {
      if (!mappedStateNames.has(t.state_id)) {
        console.error(`❌ [workflowMapper] Invalid transition: "${state.name}" -> "${t.state_id}" (target не существует)`);
      }
    });
  });

  console.log('✅ [workflowMapper] Mapping completed successfully');

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
