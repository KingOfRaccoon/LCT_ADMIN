/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useReducer, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';

// Virtual Context for managing global state and variables
const VirtualContext = createContext();

// Actions for context management
const ACTIONS = {
  SET_VARIABLE: 'SET_VARIABLE',
  DELETE_VARIABLE: 'DELETE_VARIABLE',
  REORDER_VARIABLES: 'REORDER_VARIABLES',
  SET_PRODUCT: 'SET_PRODUCT',
  SET_CURRENT_SCREEN: 'SET_CURRENT_SCREEN',
  ADD_SCREEN: 'ADD_SCREEN',
  UPDATE_SCREEN: 'UPDATE_SCREEN',
  DELETE_SCREEN: 'DELETE_SCREEN',
  SET_SCREENS: 'SET_SCREENS',
  SET_GRAPH_DATA: 'SET_GRAPH_DATA',
  SET_VARIABLE_SCHEMAS: 'SET_VARIABLE_SCHEMAS',
  RESET_VARIABLE_SCHEMAS: 'RESET_VARIABLE_SCHEMAS',
  ADD_ACTION_NODE: 'ADD_ACTION_NODE',
  UPDATE_NODE: 'UPDATE_NODE',
  DELETE_NODE: 'DELETE_NODE',
  ADD_EDGE: 'ADD_EDGE',
  DELETE_EDGE: 'DELETE_EDGE'
};

// Initial state
const initialState = {
  // Global variables accessible across all screens and actions
  variables: {
    // Example: { userId: { value: '123', type: 'string', source: 'action' } }
  },
  variablesOrder: [],
  
  // Current product being edited
  currentProduct: null,
  
  // All products
  products: [],
  
  // Current screen being edited
  currentScreen: null,
  
  // All screens in current product
  screens: [],
  
  // Graph data for current screen (nodes and edges)
  graphData: {
    nodes: [],
    edges: []
  },
  variableSchemas: {}
};

// Reducer function
function virtualContextReducer(state, action) {
  switch (action.type) {
    case ACTIONS.SET_VARIABLE: {
      const isExistingVariable = Boolean(state.variables[action.payload.name]);
      const existingSchema = state.variableSchemas[action.payload.name];

      // Defensive type inference at reducer level: if the caller didn't
      // provide a type (or provided an overly-generic 'string'), infer
      // from the value. This ensures dev-mode HMR or stale callers can't
      // accidentally persist wrong types.
      const inferType = (val) => {
        if (Array.isArray(val)) return 'list';
        if (val !== null && typeof val === 'object') return 'object';
        return 'string';
      };

      const inferred = inferType(action.payload.value);
      let resolvedType = action.payload.type && action.payload.type !== 'string'
        ? action.payload.type
        : inferred;

      // If variable already exists and has a structural type (list/object),
      // avoid downgrading it to 'string' when the incoming payload is an
      // empty placeholder (common when binding UI initializes). Keep the
      // existing type in that case.
      const existingVar = state.variables[action.payload.name];
      const isStructural = existingVar && (existingVar.type === 'list' || existingVar.type === 'object');
      const isEmptyPayload = action.payload.value === '' || action.payload.value === null || action.payload.value === undefined;
      if (isStructural && isEmptyPayload) {
        resolvedType = existingVar.type;
      }

      // Avoid noisy per-variable tracing in production/development unless
      // explicitly enabled via window.__VC_TRACE__ (helps local debugging).
      if (typeof window !== 'undefined' && (typeof window.__VC_TRACE__ !== 'undefined' ? window.__VC_TRACE__ : false) && action.payload.name === 'gamesList') {
        try {
          logger.debug('[VirtualContext] SET_VARIABLE trace for gamesList', {
            prev: state.variables['gamesList'],
            payload: action.payload,
            resolvedType
          });
        } catch {
          /* ignore logging errors */
        }
      }

      // Priority logic for source types: 'action' should override 'binding'
      const newSource = action.payload.source || 'manual';
      const existingSource = existingVar?.source;
      const shouldAllowActionOverride = (existingSource === 'binding' && newSource === 'action');
      
      // If incoming payload is an empty placeholder (empty string/null/undefined)
      // and we already have a structural value (list/object), preserve it.
      // BUT: if the new source is 'action' and existing is 'binding', allow override
      const valueToStore = (isStructural && isEmptyPayload && !shouldAllowActionOverride)
        ? existingVar.value
        : // additionally, protect against callers that explicitly send type 'list' but
          // an empty value (common during binding initialization): don't overwrite
          // an existing list with an empty string, UNLESS action is overriding binding
          ((existingVar && existingVar.type === 'list' && action.payload.type === 'list' && isEmptyPayload && !shouldAllowActionOverride)
            ? existingVar.value
            : action.payload.value);

      return {
        ...state,
        variables: {
          ...state.variables,
          [action.payload.name]: {
            value: valueToStore,
            type: resolvedType,
            source: newSource,
            description: action.payload.description || ''
          }
        },
        variableSchemas: existingSchema
          ? {
              ...state.variableSchemas,
              [action.payload.name]: existingSchema
            }
          : state.variableSchemas,
        variablesOrder: isExistingVariable
          ? state.variablesOrder
          : [...state.variablesOrder, action.payload.name]
      };

      }

      case ACTIONS.DELETE_VARIABLE: {
      const newVariables = { ...state.variables };
      delete newVariables[action.payload.name];
      return {
        ...state,
        variables: newVariables,
        variablesOrder: state.variablesOrder.filter((variableName) => variableName !== action.payload.name)
      };
    }

    case ACTIONS.REORDER_VARIABLES:
      return {
        ...state,
        variablesOrder: action.payload.order
      };

    case ACTIONS.SET_PRODUCT:
      return {
        ...state,
        currentProduct: action.payload
      };

    case ACTIONS.SET_CURRENT_SCREEN:
      return {
        ...state,
        currentScreen: action.payload
      };

    case ACTIONS.SET_SCREENS:
      return {
        ...state,
        screens: action.payload || [],
        currentScreen: action.payload?.find?.((screen) => screen.id === state.currentScreen?.id) || state.currentScreen
      };

    case ACTIONS.SET_VARIABLE_SCHEMAS:
      return {
        ...state,
        variableSchemas: { ...action.payload }
      };

    case ACTIONS.RESET_VARIABLE_SCHEMAS:
      return {
        ...state,
        variableSchemas: {}
      };

    case ACTIONS.ADD_SCREEN: {
      const screenId = action.payload.id || uuidv4();
      const incomingScreen = {
        ...action.payload,
        id: screenId,
        name: action.payload.name ?? 'New Screen',
        type: action.payload.type ?? 'screen',
        description: action.payload.description ?? '',
        status: action.payload.status ?? 'draft',
        order: action.payload.order ?? state.screens.length + 1,
        components: action.payload.components ?? 0,
        actions: action.payload.actions ?? 0,
        metadata: action.payload.metadata || {}
      };

      const existingIndex = state.screens.findIndex((screen) => screen.id === screenId);

      if (existingIndex !== -1) {
        const updatedScreens = [...state.screens];
        updatedScreens[existingIndex] = {
          ...updatedScreens[existingIndex],
          ...incomingScreen
        };

        return {
          ...state,
          screens: updatedScreens,
          currentScreen: state.currentScreen?.id === screenId
            ? { ...state.currentScreen, ...incomingScreen }
            : state.currentScreen
        };
      }

      return {
        ...state,
        screens: [...state.screens, incomingScreen],
        currentScreen: incomingScreen
      };
    }

    case ACTIONS.UPDATE_SCREEN:
      return {
        ...state,
        screens: state.screens.map(screen =>
          screen.id === action.payload.id
            ? { ...screen, ...action.payload.updates }
            : screen
        ),
        currentScreen: state.currentScreen?.id === action.payload.id
          ? { ...state.currentScreen, ...action.payload.updates }
          : state.currentScreen
      };

    case ACTIONS.DELETE_SCREEN:
      return {
        ...state,
        screens: state.screens.filter(screen => screen.id !== action.payload.id),
        currentScreen: state.currentScreen?.id === action.payload.id ? null : state.currentScreen
      };

    case ACTIONS.SET_GRAPH_DATA:
      return {
        ...state,
        graphData: action.payload
      };

    case ACTIONS.ADD_ACTION_NODE: {
      const actionNode = {
        id: uuidv4(),
        type: action.payload.nodeType || 'action',
        data: {
          label: action.payload.label || 'New Action',
          actionType: action.payload.actionType || 'api',
          config: action.payload.config || {}
        },
        position: action.payload.position || { x: 100, y: 100 }
      };
      return {
        ...state,
        graphData: {
          ...state.graphData,
          nodes: [...state.graphData.nodes, actionNode]
        }
      };
    }

    case ACTIONS.UPDATE_NODE:
      return {
        ...state,
        graphData: {
          ...state.graphData,
          nodes: state.graphData.nodes.map(node =>
            node.id === action.payload.id
              ? { ...node, ...action.payload.updates }
              : node
          )
        }
      };

    case ACTIONS.DELETE_NODE:
      return {
        ...state,
        graphData: {
          nodes: state.graphData.nodes.filter(node => node.id !== action.payload.id),
          edges: state.graphData.edges.filter(edge => 
            edge.source !== action.payload.id && edge.target !== action.payload.id
          )
        }
      };

    case ACTIONS.ADD_EDGE: {
      const newEdge = {
        id: uuidv4(),
        source: action.payload.source,
        target: action.payload.target,
        type: action.payload.edgeType || 'default',
        data: action.payload.data || {}
      };
      return {
        ...state,
        graphData: {
          ...state.graphData,
          edges: [...state.graphData.edges, newEdge]
        }
      };
    }

    case ACTIONS.DELETE_EDGE:
      return {
        ...state,
        graphData: {
          ...state.graphData,
          edges: state.graphData.edges.filter(edge => edge.id !== action.payload.id)
        }
      };

    default:
      return state;
  }
}

// Context Provider Component
export function VirtualContextProvider({ children }) {
  const [state, dispatch] = useReducer(virtualContextReducer, initialState);

  // Helper functions
  const setVariable = useCallback((name, value, type, source, description) => {
    // If caller didn't provide a type, infer it from the value to keep
    // list/object variables (like gamesList from API) typed correctly.
    const inferType = (val) => {
      if (Array.isArray(val)) return 'list';
      if (val !== null && typeof val === 'object') return 'object';
      return 'string';
    };

    const resolvedType = type || inferType(value);

    // Temporary debug logging removed — inference logic should be stable now.

    dispatch({
      type: ACTIONS.SET_VARIABLE,
      payload: { name, value, type: resolvedType, source, description }
    });
  }, []);

  const deleteVariable = useCallback((name) => {
    dispatch({
      type: ACTIONS.DELETE_VARIABLE,
      payload: { name }
    });
  }, []);

  const reorderVariables = useCallback((order) => {
    dispatch({
      type: ACTIONS.REORDER_VARIABLES,
      payload: { order }
    });
  }, []);

  const setProduct = useCallback((product) => {
    dispatch({
      type: ACTIONS.SET_PRODUCT,
      payload: product
    });
  }, []);

  const setCurrentScreen = useCallback((screen) => {
    dispatch({
      type: ACTIONS.SET_CURRENT_SCREEN,
      payload: screen
    });
  }, []);

  const setScreens = useCallback((screensList) => {
    dispatch({
      type: ACTIONS.SET_SCREENS,
      payload: screensList
    });
  }, []);

  const addScreen = useCallback((screenData) => {
    dispatch({
      type: ACTIONS.ADD_SCREEN,
      payload: screenData
    });
  }, []);

  const updateScreen = useCallback((id, updates) => {
    dispatch({
      type: ACTIONS.UPDATE_SCREEN,
      payload: { id, updates }
    });
  }, []);

  const deleteScreen = useCallback((id) => {
    dispatch({
      type: ACTIONS.DELETE_SCREEN,
      payload: { id }
    });
  }, []);

  const setGraphData = useCallback((graphData) => {
    dispatch({
      type: ACTIONS.SET_GRAPH_DATA,
      payload: graphData
    });
  }, []);

  const setVariableSchemas = useCallback((schemas) => {
    dispatch({
      type: ACTIONS.SET_VARIABLE_SCHEMAS,
      payload: schemas || {}
    });
  }, []);

  const resetVariableSchemas = useCallback(() => {
    dispatch({
      type: ACTIONS.RESET_VARIABLE_SCHEMAS
    });
  }, []);

  const addActionNode = useCallback((nodeData) => {
    dispatch({
      type: ACTIONS.ADD_ACTION_NODE,
      payload: nodeData
    });
  }, []);

  const updateNode = useCallback((id, updates) => {
    dispatch({
      type: ACTIONS.UPDATE_NODE,
      payload: { id, updates }
    });
  }, []);

  const deleteNode = useCallback((id) => {
    dispatch({
      type: ACTIONS.DELETE_NODE,
      payload: { id }
    });
  }, []);

  const addEdge = useCallback((edgeData) => {
    dispatch({
      type: ACTIONS.ADD_EDGE,
      payload: edgeData
    });
  }, []);

  const deleteEdge = useCallback((id) => {
    dispatch({
      type: ACTIONS.DELETE_EDGE,
      payload: { id }
    });
  }, []);

  const value = {
    // State
    variables: state.variables,
    variablesOrder: state.variablesOrder,
    currentProduct: state.currentProduct,
    products: state.products,
    currentScreen: state.currentScreen,
    screens: state.screens,
    graphData: state.graphData,
    variableSchemas: state.variableSchemas,
    
    // Actions
    setVariable,
    deleteVariable,
    reorderVariables,
    setProduct,
    setCurrentScreen,
    setScreens,
    addScreen,
    updateScreen,
    deleteScreen,
    setGraphData,
    setVariableSchemas,
    resetVariableSchemas,
    addActionNode,
    updateNode,
    deleteNode,
    addEdge,
    deleteEdge
  };

  return (
    <VirtualContext.Provider value={value}>
      {children}
    </VirtualContext.Provider>
  );
}

// Custom hook to use virtual context
export function useVirtualContext() {
  const context = useContext(VirtualContext);
  if (!context) {
    throw new Error('useVirtualContext must be used within a VirtualContextProvider');
  }
  return context;
}