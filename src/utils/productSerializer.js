const assignValue = (target, path, value) => {
  if (!path || typeof path !== 'string') {
    return;
  }

  const segments = path.split('.');
  let cursor = target;

  segments.forEach((segment, index) => {
    const isLast = index === segments.length - 1;

    if (isLast) {
      cursor[segment] = value;
      return;
    }

    if (!cursor[segment] || typeof cursor[segment] !== 'object') {
      cursor[segment] = {};
    }
    cursor = cursor[segment];
  });
};

const buildInitialContext = (variables = {}) => {
  const context = {};

  Object.entries(variables).forEach(([name, meta]) => {
    if (!meta) {
      return;
    }

    const value = meta.value;
    if (value === undefined) {
      return;
    }

    if (name.includes('.')) {
      assignValue(context, name, value);
      return;
    }

    context[name] = value;
  });

  return context;
};

const cloneComponentTree = (rootId, componentsMap) => {
  const stack = [rootId];
  const visited = new Set();
  const collected = [];

  while (stack.length > 0) {
    const id = stack.pop();
    if (visited.has(id)) {
      continue;
    }
    visited.add(id);

    const component = componentsMap.get(id);
    if (!component) {
      continue;
    }

    const cloned = JSON.parse(JSON.stringify(component));
    collected.push(cloned);

    (component.children || []).forEach((childId) => {
      stack.push(childId);
    });
  }

  return collected;
};

const buildPlaceholderScreen = (screenId, screenName = 'Screen') => {
  const rootId = `${screenId || 'screen'}-placeholder-root`;
  const messageId = `${screenId || 'screen'}-placeholder-message`;

  return [
    {
      id: rootId,
      type: 'screen',
      parentId: null,
      children: [messageId],
      props: {},
      position: { x: 0, y: 0 },
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '640px',
        backgroundColor: '#f8fafc',
        padding: '48px'
      },
      events: {}
    },
    {
      id: messageId,
      type: 'text',
      parentId: rootId,
      children: [],
      props: {
        content: `${screenName || 'Screen'} не сконфигурирован`,
        variant: 'heading',
        color: '#475569'
      },
      position: { x: 0, y: 0 },
      style: {
        fontSize: '24px',
        textAlign: 'center'
      },
      events: {}
    }
  ];
};

const buildScreensMap = (components = [], explicitScreens = [], currentScreenMeta = null) => {
  const componentMap = new Map(components.map((component) => [component.id, component]));
  const screenRoots = components.filter((component) => component.type === 'screen');
  const screensMap = {};

  const explicitById = new Map((explicitScreens || []).map((screen) => [screen.id, screen]));

  screenRoots.forEach((screen) => {
    const componentsTree = cloneComponentTree(screen.id, componentMap);
    const explicitMeta = explicitById.get(screen.id);
    const fallbackName = explicitMeta?.name;

    screensMap[screen.id] = {
      id: screen.id,
      name: fallbackName || screen.props?.title || screen.props?.name || 'Screen',
      components: componentsTree
    };
  });

  const attachAlias = (aliasId, source) => {
    if (!aliasId || !source) {
      return;
    }

    screensMap[aliasId] = {
      ...source,
      id: aliasId,
      name: source.name
    };
  };

  if (currentScreenMeta) {
    const currentId = currentScreenMeta.id;
    if (currentId && !screensMap[currentId]) {
      const firstEntry = Object.values(screensMap)[0];
      if (firstEntry) {
        attachAlias(currentId, {
          ...firstEntry,
          name: currentScreenMeta.name || firstEntry.name
        });
      } else {
        screensMap[currentId] = {
          id: currentId,
          name: currentScreenMeta.name || 'Screen',
          components: buildPlaceholderScreen(currentId, currentScreenMeta.name)
        };
      }
    }
  }

  (explicitScreens || []).forEach((screenMeta) => {
    if (!screenMeta?.id) {
      return;
    }

    if (!screensMap[screenMeta.id]) {
      screensMap[screenMeta.id] = {
        id: screenMeta.id,
        name: screenMeta.name || 'Screen',
        components: buildPlaceholderScreen(screenMeta.id, screenMeta.name)
      };
    }
  });

  return screensMap;
};

const buildNodes = (graphData = {}) => {
  const nodes = Array.isArray(graphData.nodes) ? graphData.nodes : [];
  const edges = Array.isArray(graphData.edges) ? graphData.edges : [];

  const edgesBySource = edges.reduce((acc, edge) => {
    if (!acc[edge.source]) {
      acc[edge.source] = [];
    }
    acc[edge.source].push(edge);
    return acc;
  }, {});

  const incomingCounts = edges.reduce((acc, edge) => {
    acc[edge.target] = (acc[edge.target] || 0) + 1;
    return acc;
  }, {});

  const graphNodes = nodes.map((node) => {
    const nodeData = node.data || {};
    const outgoing = edgesBySource[node.id] || [];

    return {
      id: node.id,
      label: nodeData.label || node.id,
      type: node.type,
      screenId: node.type === 'screen' ? (nodeData.screenId || node.id) : undefined,
      start: incomingCounts[node.id] === undefined,
      data: nodeData,
      edges: outgoing.map((edge) => ({
        id: edge.id,
        label: edge.data?.label || edge.label || edge.id,
        target: edge.target,
        summary: edge.data?.summary,
        contextPatch: edge.data?.contextPatch || {},
        data: edge.data || {}
      }))
    };
  });

  return graphNodes;
};

export const buildProductFromBuilder = ({
  productId,
  productName,
  productDescription,
  components,
  screens,
  graphData,
  variables,
  variableSchemas,
  currentScreen
}) => {
  const screensMap = buildScreensMap(components, screens || [], currentScreen);

  if (currentScreen && !screensMap[currentScreen.id] && components && components.length) {
    const componentMap = new Map(components.map((component) => [component.id, component]));
    const rootScreen = components.find((component) => component.type === 'screen');
    if (rootScreen) {
      screensMap[rootScreen.id] = {
        id: rootScreen.id,
        name: currentScreen.name || rootScreen.props?.title || 'Screen',
        components: cloneComponentTree(rootScreen.id, componentMap)
      };
    }
  }

  const initialContext = buildInitialContext(variables);
  const nodes = buildNodes(graphData);

  return {
    id: productId || `product-${Date.now()}`,
    name: productName || currentScreen?.name || 'Generated Product',
    description: productDescription || '',
    initialContext,
    nodes,
    screens: screensMap,
    variableSchemas
  };
};
