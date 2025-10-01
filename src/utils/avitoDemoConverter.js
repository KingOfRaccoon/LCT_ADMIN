/**
 * Конвертер avitoDemo формата в React Flow graphData
 */

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

    return {
      id: node.id,
      type: node.type || 'screen',
      position: {
        x: index * 300,
        y: Math.floor(index / 3) * 200
      },
      data: {
        label: node.label || node.id,
        screenId: node.screenId,
        start: isStart,
        final: isFinal,
        nodeType: node.type || 'screen'
      }
    };
  });
}

/**
 * Преобразует avitoDemo edges в React Flow edges
 * @param {Array} avitoDemoNodes - Узлы из avitoDemo.json (содержат edges)
 * @returns {Array} React Flow edges
 */
export function convertAvitoDemoEdgesToReactFlow(avitoDemoNodes) {
  if (!avitoDemoNodes || !Array.isArray(avitoDemoNodes)) {
    return [];
  }

  const edges = [];

  avitoDemoNodes.forEach(node => {
    if (node.edges && Array.isArray(node.edges)) {
      node.edges.forEach(edge => {
        edges.push({
          id: edge.id,
          source: node.id,
          target: edge.target,
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
  });

  return edges;
}

/**
 * Загружает и преобразует avitoDemo.json
 * @returns {Promise<{nodes: Array, edges: Array, initialContext: Object, screens: Object, variableSchemas: Object}>}
 */
export async function loadAvitoDemoAsGraphData() {
  try {
    // Динамический импорт JSON
    const avitoDemo = await import('../pages/Sandbox/data/avitoDemo.json');
    const data = avitoDemo.default;

    const nodes = convertAvitoDemoNodesToReactFlow(data.nodes || []);
    const edges = convertAvitoDemoEdgesToReactFlow(data.nodes || []);

    return {
      nodes,
      edges,
      initialContext: data.initialContext || {},
      variableSchemas: data.variableSchemas || {},
      screens: data.screens || {}
    };
  } catch (error) {
    console.error('Failed to load avitoDemo:', error);
    return {
      nodes: [],
      edges: [],
      initialContext: {},
      variableSchemas: {},
      screens: {}
    };
  }
}

/**
 * Преобразует полный avitoDemo в формат для VirtualContext
 * @param {Object} avitoDemoData - Данные из avitoDemo.json
 * @returns {Object} Данные для VirtualContext
 */
export function convertAvitoDemoToVirtualContext(avitoDemoData) {
  if (!avitoDemoData) {
    return {
      graphData: { nodes: [], edges: [] },
      initialContext: {},
      variableSchemas: {}
    };
  }

  const nodes = convertAvitoDemoNodesToReactFlow(avitoDemoData.nodes || []);
  const edges = convertAvitoDemoEdgesToReactFlow(avitoDemoData.nodes || []);

  return {
    graphData: { nodes, edges },
    initialContext: avitoDemoData.initialContext || {},
    variableSchemas: avitoDemoData.variableSchemas || {}
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
      nodeMap.set(node.screenId, node);
    });
  }

  return Object.entries(screens).map(([screenId, screenData], index) => {
    const node = nodeMap.get(screenId);
    const sections = screenData.sections || {};
    const componentsCount = Object.values(sections).reduce((count, section) => {
      return count + (section.children?.length || 0);
    }, 0);

    return {
      id: screenId,
      name: screenData.name || screenId,
      type: node?.type || 'screen',
      description: `Screen ${screenData.name || screenId}`,
      order: index + 1,
      components: componentsCount,
      actions: node?.edges?.length || 0,
      status: 'complete'
    };
  });
}
