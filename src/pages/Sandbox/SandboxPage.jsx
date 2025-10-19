import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import {
  applyContextPatch,
  cloneContext,
  getContextValue,
  isBindingValue,
  resolveBindingValue
} from './utils/bindings';
import { safeEvalExpression } from './utils/pythonToJs';
import SandboxScreenRenderer from './SandboxScreenRenderer';
import ApiSandboxRunner from './ApiSandboxRunner';
import ClientWorkflowRunner from './ClientWorkflowRunner';
import { checkClientWorkflowHealth, startClientWorkflow } from '../../services/clientWorkflowApi';
import { parseWorkflowUrlParams } from '../../utils/workflowApi';
import {
  executeIntegrationNode,
  getNextStateFromIntegration
} from './utils/integrationStates';
import ecommerceDashboard from './data/ecommerceDashboard.json';
import avitoDemo from './data/avitoDemo.json';
import avitoDemoSubflow from './data/avitoDemoSubflow.json';
import { getDefaultProduct, getProductById } from './data/products';
import ProductSelector from './components/ProductSelector';
import {
  ArrowRight,
  GitBranch,
  History as HistoryIcon,
  PlayCircle,
  RotateCcw,
  PlugZap
} from 'lucide-react';
import { useAnalytics } from '../../services/analytics';
import { WorkflowExportButton } from '../../components/WorkflowExportButton/WorkflowExportButton';
import { loadWorkflow } from '../../utils/workflowApi';
import toast from 'react-hot-toast';
import './SandboxPage.css';

const isPlainObject = (value) => (
  Object.prototype.toString.call(value) === '[object Object]'
);

const formatValue = (value) => {
  if (value === null) {
    return 'null';
  }

  if (value === undefined) {
    return '—';
  }

  if (Array.isArray(value)) {
    return value.map((item) => formatValue(item)).join(', ');
  }

  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return '[object]';
    }
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  return String(value);
};

const formatJson = (value) => {
  if (value === undefined) {
    return '—';
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

const flattenContext = (value, prefix = '') => {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      flattenContext(item, prefix ? `${prefix}.${index}` : String(index))
    );
  }

  if (isPlainObject(value)) {
    return Object.entries(value).flatMap(([key, nestedValue]) =>
      flattenContext(nestedValue, prefix ? `${prefix}.${key}` : key)
    );
  }

  return [
    {
      key: prefix,
      value: formatValue(value)
    }
  ];
};

const describePatch = (patch, context) => {
  if (!patch || typeof patch !== 'object') {
    return [];
  }

  const pairs = [];

  const traverse = (value, path) => {
    if (!path) {
      return;
    }

    if (isPlainObject(value) && !isBindingValue(value)) {
      Object.entries(value).forEach(([childKey, childValue]) => {
        traverse(childValue, `${path}.${childKey}`);
      });
      return;
    }

    let resolved = value;
    if (isBindingValue(value)) {
      resolved = resolveBindingValue(value, context, undefined);
    }
    pairs.push({ key: path, value: formatValue(resolved) });
  };

  Object.entries(patch).forEach(([path, value]) => {
    traverse(value, path);
  });

  return pairs;
};

const resolveConditionSourceValue = (condition, context) => {
  if (!condition || typeof condition !== 'object') {
    return undefined;
  }

  const { source, path, fallback, value } = condition;

  if (source !== undefined) {
    if (isBindingValue(source)) {
      return resolveBindingValue(source, context, fallback);
    }
    if (typeof source === 'string') {
      if (source.startsWith('${') && source.endsWith('}')) {
        return resolveBindingValue({ reference: source, value: fallback }, context, fallback);
      }
      return source;
    }
    return source;
  }

  if (typeof path === 'string' && path.trim().length > 0) {
    return getContextValue(context, path.trim());
  }

  return value;
};

const isEmptyValue = (value) => {
  if (value === null || value === undefined) {
    return true;
  }
  if (typeof value === 'string') {
    return value.trim().length === 0;
  }
  if (Array.isArray(value)) {
    return value.length === 0;
  }
  if (typeof value === 'object') {
    return Object.keys(value).length === 0;
  }
  return false;
};

const getInitialNodeId = (product) => (
  product.nodes.find((node) => node.start)?.id
  ?? product.nodes[0]?.id
  ?? null
);

const SandboxPage = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { trackScreenView, finalizeScreenTiming } = useAnalytics();
  
  // Поддержка legacy способа передачи данных через location.state
  const runtimeProduct = location.state?.product;
  const runtimeSchemas = location.state?.variableSchemas;
  
  // Поддержка загрузки workflow через URL параметры
  const { clientSessionId, clientWorkflowId } = parseWorkflowUrlParams(searchParams);
  
  // Состояние для workflow загруженного через API (legacy, теперь не используется для Client Workflow)
  const [workflowData, setWorkflowData] = useState(null);
  
  // API Modes: 'disabled', 'checking', 'legacy-ready', 'client-ready', 'error'
  const [apiMode, setApiMode] = useState(runtimeProduct ? 'disabled' : 'checking');
  const [apiData, setApiData] = useState(null);
  const [apiError, setApiError] = useState(null);
  
  // Состояние выбранного продукта (если нет runtime данных)
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [activeWorkflowId, setActiveWorkflowId] = useState("68dedc98ea73d715d90e40dd"); // Для Client Workflow API
  
  // ✅ УНИФИКАЦИЯ: Если есть URL params с workflow_id, сразу используем Client Workflow API без предзагрузки
  useEffect(() => {
    if (!clientSessionId || !clientWorkflowId) {
      return;
    }
    
    console.log('✅ [SandboxPage] URL params detected, using Client Workflow API directly');
    
    // Устанавливаем workflow_id и переключаемся в client-ready режим
    // Предзагрузка НЕ нужна - startClientWorkflow с кэшем сделает всё за нас
    setActiveWorkflowId(clientWorkflowId);
    setApiMode('client-ready');
  }, [clientSessionId, clientWorkflowId]);
  
  useEffect(() => {
    if (runtimeProduct && apiMode !== 'disabled') {
      setApiMode('disabled');
    }
  }, [runtimeProduct, apiMode]);

  useEffect(() => {
    if (apiMode !== 'checking') {
      return;
    }

    let cancelled = false;

    const checkApis = async () => {
      // ✅ Если есть URL params, пропускаем проверку - уже установлен client-ready режим
      if (clientSessionId && clientWorkflowId) {
        console.log('⏭️ [SandboxPage] Workflow from URL params, skipping API check');
        return;
      }
      
      // Сначала проверяем новый Client Workflow API
      const isClientWorkflowAvailable = await checkClientWorkflowHealth();
      
      if (cancelled) return;
      
      if (isClientWorkflowAvailable) {
        // Используем новый Client Workflow API
        console.log('✅ [SandboxPage] Client Workflow API available');
        // Определяем workflow_id (из доступных данных или дефолтный)
        const currentProduct = workflowData || runtimeProduct || avitoDemo;
        const workflowId = currentProduct?.id || 'default-workflow';
        setActiveWorkflowId(workflowId);
        setApiMode('client-ready');
        setApiError(null);
        return;
      }
      
      // Fallback на legacy API
      console.log('⚠️ [SandboxPage] Client Workflow API unavailable, trying legacy API');
      try {
        const response = await fetch('/api/start/');
        if (!response.ok) {
          throw new Error(`API ответил статусом ${response.status}`);
        }
        const data = await response.json();
        if (!cancelled) {
          setApiData(data);
          setApiError(null);
          setApiMode('legacy-ready');
          console.log('✅ [SandboxPage] Legacy API available');
        }
      } catch (err) {
        if (!cancelled) {
          setApiError(err instanceof Error ? err.message : 'Не удалось подключиться к API');
          setApiMode('error');
          console.log('❌ [SandboxPage] All APIs unavailable');
        }
      }
    };

    checkApis();

    return () => {
      cancelled = true;
    };
  }, [apiMode, workflowData, runtimeProduct, clientSessionId, clientWorkflowId]);

  const handleDisableApi = useCallback(() => {
    setApiMode('disabled');
  }, []);

  const handleRetryApi = useCallback(() => {
    if (runtimeProduct) {
      return;
    }
    setApiError(null);
    setApiMode('checking');
  }, [runtimeProduct]);

  // Приоритет: workflowData > runtimeProduct > selectedProduct > defaultProduct
  const selectedProduct = selectedProductId ? getProductById(selectedProductId)?.data : null;
  const defaultProductData = getDefaultProduct()?.data || avitoDemoSubflow;
  const product = workflowData || runtimeProduct || selectedProduct || defaultProductData;
  const nodesById = useMemo(() => {
    const map = new Map();
    (product?.nodes ?? []).forEach((node) => {
      if (node && typeof node === 'object' && node.id) {
        map.set(node.id, node);
      }
    });
    return map;
  }, [product]);
  const isOfflineMode = Boolean(workflowData || runtimeProduct || apiMode === 'disabled' || apiMode === 'error');
  const variableSchemas = useMemo(
    () => workflowData?.variableSchemas || runtimeSchemas || product.variableSchemas || {},
    [product, runtimeSchemas, workflowData]
  );
  const getNodeById = useCallback((nodeId) => nodesById.get(nodeId) ?? null, [nodesById]);
  const initialNodeId = useMemo(() => getInitialNodeId(product), [product]);

  const [currentNodeId, setCurrentNodeId] = useState(initialNodeId);
  const [contextState, setContextState] = useState(() => cloneContext(product.initialContext));
  const [formValues, setFormValues] = useState(() => (
    product?.initialContext?.inputs
      ? { ...product.initialContext.inputs }
      : {}
  ));
  const [history, setHistory] = useState([]);
  useEffect(() => {
    if (!isOfflineMode) {
      return;
    }
    setContextState(cloneContext(product.initialContext));
    setCurrentNodeId(getInitialNodeId(product));
    setHistory([]);
    setFormValues(product?.initialContext?.inputs ? { ...product.initialContext.inputs } : {});
  }, [product, isOfflineMode]);

  const isLoaderVisible = apiMode === 'checking';
  const isClientWorkflowReady = apiMode === 'client-ready' && Boolean(activeWorkflowId);
  const isLegacyApiReady = apiMode === 'legacy-ready' && Boolean(apiData);

  const currentNode = useMemo(
    () => getNodeById(currentNodeId),
    [getNodeById, currentNodeId]
  );
  const currentScreen = useMemo(
    () => product.screens[currentNode?.screenId] ?? null,
    [product, currentNode]
  );
  const availableEdges = currentNode?.edges ?? [];
  const showApiBanner = !runtimeProduct && (apiMode === 'error' || apiMode === 'disabled');
  const canRetryApi = !runtimeProduct;

  const nodePreview = useMemo(() => {
    if (!currentNode) {
      return { type: 'empty' };
    }

    if (currentNode.type === 'screen') {
      return { type: 'screen', screen: currentScreen };
    }

    if (currentNode.type === 'action') {
      const actionType = currentNode.data?.actionType;

      if (actionType === 'api') {
        const config = currentNode.data?.config || {};
        const contextKey = typeof config.contextKey === 'string' ? config.contextKey.trim() : '';
        const method = typeof config.method === 'string' ? config.method.toUpperCase() : 'GET';
        const endpoint = config.endpoint || '';

        let resultValue;
        if (contextKey) {
          resultValue = getContextValue(contextState, contextKey);
          if (resultValue === undefined && contextState && Object.prototype.hasOwnProperty.call(contextState, contextKey)) {
            resultValue = contextState[contextKey];
          }
        }

        return {
          type: 'api',
          method,
          endpoint,
          contextKey,
          resultValue
        };
      }

      if (actionType === 'condition') {
        const config = currentNode.data?.config || {};
        const conditions = Array.isArray(config.conditions) ? config.conditions : [];
        return {
          type: 'condition',
          label: currentNode.label,
          conditions,
          fallbackEdgeId: typeof config.fallbackEdgeId === 'string' ? config.fallbackEdgeId : null
        };
      }

      return {
        type: 'action',
        actionType,
        label: currentNode.label
      };
    }

    return { type: 'empty' };
  }, [contextState, currentNode, currentScreen]);

  // Автоматическое выполнение Integration States
  useEffect(() => {
    if (!currentNode) return;
    if (!isOfflineMode) return; // Только для offline режима
    
    const nodeType = currentNode.type || currentNode.state_type;
    if (nodeType !== 'integration') return;

    console.log('[Integration] Detected integration node:', currentNode.id);

    // Выполняем integration запросы
    executeIntegrationNode(currentNode, contextState)
      .then(result => {
        console.log('[Integration] Execution result:', result);
        
        if (result.success) {
          // Обновляем контекст с результатами
          setContextState(result.context);
          
          // Добавляем в историю
          setHistory(prev => [
            ...prev,
            {
              nodeId: currentNode.id,
              nodeName: currentNode.label || currentNode.name || currentNode.id,
              action: 'integration',
              variable: currentNode.expressions[0]?.variable,
              timestamp: Date.now()
            }
          ]);
          
          // Переходим к следующему состоянию
          const nextStateId = getNextStateFromIntegration(currentNode, result);
          if (nextStateId) {
            console.log('[Integration] Moving to next state:', nextStateId);
            setTimeout(() => {
              setCurrentNodeId(nextStateId);
            }, 300); // Небольшая задержка для плавности
          }
        } else {
          console.error('[Integration] Execution failed:', result.error);
          toast.error(`Integration failed: ${result.error}`);
        }
      })
      .catch(error => {
        console.error('[Integration] Unexpected error:', error);
        toast.error(`Integration error: ${error.message}`);
      });
  }, [currentNode, contextState, isOfflineMode]);

  useEffect(() => {
    const screenId = currentScreen?.id ?? currentNode?.screenId ?? currentNodeId;
    if (!screenId) {
      return () => {};
    }

    const screenName = currentScreen?.name
      ?? currentNode?.label
      ?? String(screenId);
    const productId = product?.id ?? product?.slug ?? product?.name ?? 'bdui-product';

    trackScreenView({
      screenId,
      screenName,
      nodeId: currentNode?.id ?? currentNodeId,
      productId
    });

    return () => {
      finalizeScreenTiming('screen_effect_cleanup');
    };
  }, [
    currentScreen?.id,
    currentScreen?.name,
    currentNode?.id,
    currentNode?.label,
    currentNode?.screenId,
    currentNodeId,
    product?.id,
    product?.slug,
    product?.name,
    trackScreenView,
    finalizeScreenTiming
  ]);

  const handleReset = useCallback(() => {
    setContextState(cloneContext(product.initialContext));
    setCurrentNodeId(getInitialNodeId(product));
    setHistory([]);
    setFormValues(product?.initialContext?.inputs ? { ...product.initialContext.inputs } : {});
  }, [product]);

  const handleProductChange = useCallback((productId) => {
    setSelectedProductId(productId);
    // После смены продукта сбрасываем состояние
    const newProduct = getProductById(productId)?.data;
    if (newProduct) {
      setContextState(cloneContext(newProduct.initialContext));
      setCurrentNodeId(getInitialNodeId(newProduct));
      setHistory([]);
      setFormValues(newProduct?.initialContext?.inputs ? { ...newProduct.initialContext.inputs } : {});
    }
  }, []);

  const handleInputChange = useCallback((name, value) => {
    if (!name) {
      return;
    }

    console.log('[SandboxPage] handleInputChange called:', { name, value });

    setFormValues((prev) => {
      if (prev[name] === value) {
        return prev;
      }
      return { ...prev, [name]: value };
    });

    setContextState((prev) => {
      console.log('[SandboxPage] Updating context, key:', `inputs.${name}`, 'value:', value);
      console.log('[SandboxPage] Previous context:', prev);
      const next = applyContextPatch(prev, { [`inputs.${name}`]: value }, prev);
      console.log('[SandboxPage] New context:', next);
      return next;
    });
  }, []);

  const evaluateCondition = useCallback((condition, context) => {
    if (!condition || typeof condition !== 'object') {
      return false;
    }

    const type = typeof condition.type === 'string' ? condition.type : 'truthy';
    const rawValue = resolveConditionSourceValue(condition, context);
    let result = false;

    switch (type) {
      case 'regex': {
        const pattern = typeof condition.pattern === 'string' ? condition.pattern : '';
        if (!pattern) {
          result = false;
          break;
        }
        const flags = typeof condition.flags === 'string' ? condition.flags : '';
        try {
          const regex = new RegExp(pattern, flags);
          result = regex.test(String(rawValue ?? ''));
        } catch {
          result = false;
        }
        break;
      }
      case 'empty': {
        result = isEmptyValue(rawValue);
        break;
      }
      case 'nonEmpty': {
        result = !isEmptyValue(rawValue);
        break;
      }
      case 'equals': {
        result = rawValue === condition.value;
        break;
      }
      default: {
        result = Boolean(rawValue);
        break;
      }
    }

    if (condition.negate) {
      return !result;
    }
    return result;
  }, []);

  const resolveActionEdge = useCallback((node, context) => {
    if (!node || node.type !== 'action') {
      return null;
    }
    const edges = Array.isArray(node.edges) ? node.edges : [];
    const config = node.data?.config ?? {};
    const conditions = Array.isArray(config.conditions) ? config.conditions : [];

    for (let index = 0; index < conditions.length; index += 1) {
      const condition = conditions[index];
      const edge = edges.find((candidate) => candidate && candidate.id === condition?.edgeId);
      if (!edge) {
        continue;
      }
      if (evaluateCondition(condition, context)) {
        return edge;
      }
    }

    if (typeof config.fallbackEdgeId === 'string' && config.fallbackEdgeId.trim().length > 0) {
      const fallbackEdge = edges.find((candidate) => candidate && candidate.id === config.fallbackEdgeId);
      if (fallbackEdge) {
        return fallbackEdge;
      }
    }

    if (edges.length === 1) {
      return edges[0];
    }

    return null;
  }, [evaluateCondition]);

  const evaluateTechnicalExpression = useCallback((rawExpression, context) => {
    if (rawExpression === undefined || rawExpression === null) {
      return rawExpression;
    }

    if (typeof rawExpression !== 'string') {
      return rawExpression;
    }

    const trimmed = rawExpression.trim();
    if (!trimmed) {
      return trimmed;
    }

    // Шаблонные строки вида "${...}"
    if (trimmed.includes('${')) {
      return trimmed.replace(/\$\{([^}]+)\}/g, (match, innerExpression) => {
        try {
          const result = safeEvalExpression(innerExpression.trim(), context);
          return result !== undefined && result !== null ? result : '';
        } catch (error) {
          console.warn('[SandboxPage] Failed to eval technical template expression:', innerExpression, error);
          return '';
        }
      });
    }

    if (trimmed === 'true') {
      return true;
    }
    if (trimmed === 'false') {
      return false;
    }
    if (trimmed === 'null') {
      return null;
    }

    try {
      return safeEvalExpression(trimmed, context);
    } catch (error) {
      console.warn('[SandboxPage] Failed to eval technical expression:', trimmed, error);
      return trimmed;
    }
  }, []);

  const executeTechnicalState = useCallback((node, context) => {
    if (!node) {
      return {
        context,
        patch: {},
        nextStateId: null,
        transition: null
      };
    }

    const expressions = Array.isArray(node.expressions) ? node.expressions : [];
    let nextContext = context;
    const patch = {};

    expressions.forEach((expressionConfig) => {
      const variablePath = expressionConfig?.variable;
      if (!variablePath) {
        return;
      }

      const rawExpression = expressionConfig.expression ?? expressionConfig.value ?? null;
      const evaluatedValue = evaluateTechnicalExpression(rawExpression, nextContext);
      if (evaluatedValue !== undefined) {
        patch[variablePath] = evaluatedValue;
        nextContext = applyContextPatch(nextContext, { [variablePath]: evaluatedValue }, nextContext);
      }
    });

    const transitions = Array.isArray(node.transitions) ? node.transitions : [];
    let selectedTransition = null;

    for (let index = 0; index < transitions.length; index += 1) {
      const transition = transitions[index];
      if (!transition || !transition.state_id) {
        continue;
      }

      // Если case отсутствует, считаем переход безусловным
      if (!Object.prototype.hasOwnProperty.call(transition, 'case') || transition.case === null) {
        selectedTransition = transition;
        break;
      }

      const variablePath = transition.variable;
      if (!variablePath) {
        selectedTransition = transition;
        break;
      }

      const currentValue = getContextValue(nextContext, variablePath);
      if (currentValue === transition.case) {
        selectedTransition = transition;
        break;
      }

      if (currentValue !== undefined && currentValue !== null) {
        if (String(currentValue) === String(transition.case)) {
          selectedTransition = transition;
          break;
        }
      }
    }

    if (!selectedTransition && transitions.length > 0) {
      selectedTransition = transitions[0];
    }

    return {
      context: nextContext,
      patch,
      nextStateId: selectedTransition?.state_id ?? null,
      transition: selectedTransition
    };
  }, [evaluateTechnicalExpression]);

  const buildEdgeSequence = useCallback((edge, sourceNode, startingContext) => {
    if (!edge) {
      return {
        context: startingContext,
        steps: [],
        finalNodeId: sourceNode?.id ?? null
      };
    }

    let context = applyContextPatch(startingContext, edge.contextPatch ?? {}, startingContext);
    const steps = [];
    let currentNode = getNodeById(edge.target);

    steps.push({
      edge,
      from: sourceNode?.id ?? null,
      to: currentNode?.id ?? null,
      patch: describePatch(edge.contextPatch ?? {}, context)
    });

    let guard = 0;
    while (currentNode && guard < 20) {
      guard += 1;
      const nodeType = currentNode.type || currentNode.state_type;

      if (nodeType === 'action') {
        const nextEdge = resolveActionEdge(currentNode, context);
        if (!nextEdge) {
          return {
            context,
            steps,
            finalNodeId: currentNode.id
          };
        }

        const targetNode = getNodeById(nextEdge.target);
        context = applyContextPatch(context, nextEdge.contextPatch ?? {}, context);
        steps.push({
          edge: nextEdge,
          from: currentNode.id,
          to: targetNode?.id ?? null,
          patch: describePatch(nextEdge.contextPatch ?? {}, context)
        });
        currentNode = targetNode;
        continue;
      }

      if (nodeType === 'technical') {
        const technicalResult = executeTechnicalState(currentNode, context);
        context = technicalResult.context;

        const syntheticEdge = {
          id: `${currentNode.id}::technical`,
          label: currentNode.label || currentNode.name || currentNode.id,
          summary: currentNode.description || technicalResult.transition?.event || 'Technical state'
        };

        steps.push({
          edge: syntheticEdge,
          from: currentNode.id,
          to: technicalResult.nextStateId ?? null,
          patch: describePatch(technicalResult.patch, context)
        });

        if (!technicalResult.nextStateId || technicalResult.nextStateId === currentNode.id) {
          break;
        }

        currentNode = getNodeById(technicalResult.nextStateId);
        continue;
      }

      break;
    }

    return {
      context,
      steps,
      finalNodeId: currentNode?.id ?? null
    };
  }, [executeTechnicalState, getNodeById, resolveActionEdge]);

  const handleEdgeRun = useCallback((edge) => {
    if (!edge) {
      return;
    }

    const sourceNode = currentNode;
    let sequenceResult;

    setContextState((prevContext) => {
      sequenceResult = buildEdgeSequence(edge, sourceNode, prevContext);
      return sequenceResult.context;
    });

    if (!sequenceResult) {
      return;
    }

    if (sequenceResult.finalNodeId) {
      setCurrentNodeId(sequenceResult.finalNodeId);
    }

    if (sequenceResult.steps.length > 0) {
      const timestampBase = Date.now();
      const entries = sequenceResult.steps
        .map((step, index) => ({
          id: `${step.edge.id}-${timestampBase}-${index}`,
          timestamp: new Date(timestampBase + index).toISOString(),
          from: step.from,
          to: step.to,
          label: step.edge.label,
          summary: step.edge.summary,
          patch: step.patch
        }))
        .reverse();

      setHistory((prev) => [...entries, ...prev]);
    }

    const nextInputs = sequenceResult.context?.inputs;
    if (nextInputs && typeof nextInputs === 'object' && !Array.isArray(nextInputs)) {
      setFormValues({ ...nextInputs });
    }
  }, [buildEdgeSequence, currentNode]);

  const handleSelectNode = useCallback((nodeId) => {
    setCurrentNodeId(nodeId);
  }, []);

  const handleNodeEvent = useCallback((eventName, eventParams = {}) => {
    if (!eventName || !currentNode) {
      console.log('[SandboxPage] handleNodeEvent: missing eventName or currentNode', { eventName, currentNode: currentNode?.id });
      return;
    }

    const normalized = eventName.trim();
    if (!normalized) {
      console.log('[SandboxPage] handleNodeEvent: empty eventName after trim');
      return;
    }

    console.log('[SandboxPage] handleNodeEvent:', {
      eventName: normalized,
      nodeId: currentNode.id,
      eventParams,
      availableEdges: currentNode.edges?.map(e => ({ id: e.id, event: e.event, target: e.target }))
    });

    // Сохраняем eventParams в контекст перед переходом
    if (eventParams && Object.keys(eventParams).length > 0) {
      setContextState((prevContext) => {
        const updatedContext = { ...prevContext };
        Object.entries(eventParams).forEach(([key, value]) => {
          updatedContext[key] = value;
        });
        return updatedContext;
      });
    }

    const edge = (currentNode.edges ?? []).find((candidate) => candidate && candidate.event === normalized);
    if (!edge) {
      console.warn('[SandboxPage] No matching edge found for event:', normalized);
      return;
    }

    console.log('[SandboxPage] Found matching edge:', edge.id, '-> target:', edge.target);
    handleEdgeRun(edge);
  }, [currentNode, handleEdgeRun]);

  const flattenedContext = useMemo(() => (
    flattenContext(contextState)
      .filter((entry) => entry.key)
      .sort((a, b) => a.key.localeCompare(b.key))
  ), [contextState]);

  const schemaEntries = Object.entries(variableSchemas).map(([name, schema]) => ({ name, schema }));

  const validationStatus = getContextValue(contextState, 'data.validation.status');

  if (isLoaderVisible) {
    return (
      <div className="sandbox-page sandbox-api-loader">
        <div className="sandbox-loader-card">
          <PlugZap size={28} />
          <h1>Подключаем API песочницы…</h1>
          <p>Пробуем получить стартовый экран с локального сервера.</p>
          <div className="sandbox-api-controls">
            <button type="button" className="sandbox-reset secondary" onClick={handleDisableApi}>
              Перейти в офлайн-режим
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Новый Client Workflow API режим (приоритет)
  if (isClientWorkflowReady) {
    console.log('🔍 [SandboxPage] Режим Client Workflow API');
    console.log('📦 [SandboxPage] activeWorkflowId:', activeWorkflowId);
    return (
      <ClientWorkflowRunner
        workflowId={activeWorkflowId}
        initialContext={{}}
        onExit={handleDisableApi}
      />
    );
  }

  // Legacy API режим (fallback)
  if (isLegacyApiReady) {
    return (
      <ApiSandboxRunner
        initialData={apiData}
        onExit={handleDisableApi}
      />
    );
  }

  return (
    <div className="sandbox-page">
      <div className="sandbox-sidebar">
        <section className="sandbox-card">
          <header className="sandbox-card-header">
            <GitBranch size={18} />
            <div>
              <h2>Граф переходов</h2>
              <p>Выберите узел, чтобы увидеть экран</p>
            </div>
          </header>

          <ul className="sandbox-node-list">
            {product.nodes.map((node) => {
              const isActive = node.id === currentNodeId;
              return (
                <li key={node.id} className={`sandbox-node-item ${isActive ? 'active' : ''}`}>
                  <button
                    type="button"
                    onClick={() => handleSelectNode(node.id)}
                    className="sandbox-node-button"
                  >
                    <span className="sandbox-node-label">{node.label}</span>
                    {isActive && <span className="sandbox-node-badge">текущий</span>}
                  </button>

                  {node.edges && node.edges.length > 0 && (
                    <div className="sandbox-node-edges">
                      {node.edges.map((edge) => (
                        <div key={edge.id} className="sandbox-node-edge">
                          <ArrowRight size={14} />
                          <span>{edge.label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        <section className="sandbox-card">
          <header className="sandbox-card-header">
            <HistoryIcon size={18} />
            <div>
              <h2>История переходов</h2>
              <p>Свежие события сверху</p>
            </div>
          </header>

          {history.length === 0 ? (
            <div className="sandbox-empty">Переходов пока не было</div>
          ) : (
            <ul className="sandbox-history-list">
              {history.map((entry) => {
                const timestamp = new Date(entry.timestamp).toLocaleTimeString('ru-RU', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                });
                return (
                  <li key={entry.id} className="sandbox-history-item">
                    <div className="sandbox-history-meta">
                      <span className="sandbox-history-time">{timestamp}</span>
                      <span className="sandbox-history-label">{entry.label}</span>
                    </div>
                    {entry.summary && (
                      <p className="sandbox-history-summary">{entry.summary}</p>
                    )}
                    {entry.patch.length > 0 && (
                      <ul className="sandbox-history-patch">
                        {entry.patch.map((patchItem) => (
                          <li key={`${entry.id}-${patchItem.key}`}>
                            <span className="sandbox-history-patch-key">{patchItem.key}</span>
                            <span className="sandbox-history-patch-value">{patchItem.value}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="sandbox-card">
          <header className="sandbox-card-header">
            <span className="sandbox-card-icon">{'}{'}</span>
            <div>
              <h2>Контекст</h2>
              <p>Текущие переменные</p>
            </div>
          </header>

          <div className="sandbox-context-grid">
            {flattenedContext.map((entry) => (
              <div key={entry.key} className="sandbox-context-row">
                <span className="sandbox-context-key">{entry.key}</span>
                <span className="sandbox-context-value">{entry.value}</span>
              </div>
            ))}
          </div>
        </section>

        {schemaEntries.length > 0 && (
          <section className="sandbox-card">
            <header className="sandbox-card-header">
              <span className="sandbox-card-icon">Σ</span>
              <div>
                <h2>Схема переменных</h2>
                <p>Структура данных из графа</p>
              </div>
            </header>

            <div className="sandbox-schema-grid">
              {schemaEntries.map(({ name, schema }) => (
                <div key={name} className="sandbox-schema-item">
                  <div className="sandbox-schema-header">
                    <span className="sandbox-schema-name">{name}</span>
                    <span className="sandbox-schema-type">{schema.type || 'unknown'}</span>
                  </div>
                  {schema.endpoint && (
                    <div className="sandbox-schema-endpoint">{schema.endpoint}</div>
                  )}
                  {schema.schema && typeof schema.schema === 'object' && (
                    <div className="sandbox-schema-keys">
                      {Object.keys(schema.schema).map((key) => (
                        <span key={key} className="sandbox-schema-chip">{key}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      <div className="sandbox-main">
        {showApiBanner && (
          <div className="sandbox-api-banner">
            <div className="sandbox-api-banner-text">
              <PlugZap size={16} />
              <span>
                {apiMode === 'error'
                  ? `API режим недоступен${apiError ? `: ${apiError}` : ''}`
                  : 'API режим отключён'}
              </span>
            </div>
            {canRetryApi && (
              <button
                type="button"
                className="sandbox-reset secondary"
                onClick={handleRetryApi}
              >
                Подключить API
              </button>
            )}
          </div>
        )}
        <div className="sandbox-header">
          <div className="sandbox-header-text">
            <h1>{product.name}</h1>
            <p>{product.description}</p>
          </div>
          <div className="sandbox-header-actions">
            {/* Селектор продуктов (если не загружен через API или location.state) */}
            {!workflowData && !runtimeProduct && (
              <ProductSelector
                currentProductId={selectedProductId || getDefaultProduct()?.id}
                onProductChange={handleProductChange}
                disabled={false}
              />
            )}
            
            {/* Кнопка экспорта workflow */}
            <WorkflowExportButton
              graphData={{
                nodes: product.nodes || [],
                edges: product.nodes?.flatMap(node => 
                  (node.edges || []).map(edge => ({
                    id: edge.id,
                    source: node.id,
                    target: edge.target,
                    data: edge.data || {}
                  }))
                ) || [],
                screens: product.screens || {}
              }}
              initialContext={contextState || product.initialContext || {}}
              productId={product.id || product.slug || product.name || 'sandbox'}
              label="Export"
              size={16}
            />
            
            <button type="button" className="sandbox-reset" onClick={handleReset}>
              <RotateCcw size={16} />
              Сбросить сценарий
            </button>
          </div>
        </div>

        <div className="sandbox-status">
          <div>
            <span className="sandbox-status-label">Текущий узел</span>
            <span className="sandbox-status-value">{currentNode?.label ?? '—'}</span>
          </div>
          <div>
            <span className="sandbox-status-label">Статус проверки</span>
            <span className="sandbox-status-value">{formatValue(validationStatus)}</span>
          </div>
        </div>

        <div className="sandbox-preview">
          {nodePreview.type === 'screen' && (
            <SandboxScreenRenderer
              screen={currentScreen}
              context={contextState}
              formValues={formValues}
              onInputChange={handleInputChange}
              onEvent={handleNodeEvent}
            />
          )}

          {nodePreview.type === 'api' && (
            <div className="sandbox-card">
              <header className="sandbox-card-header">
                <span className="sandbox-card-icon">API</span>
                <div>
                  <h2>{nodePreview.method} {nodePreview.endpoint || 'API запрос'}</h2>
                  <p>
                    {nodePreview.contextKey
                      ? `Результат сохранён в контексте как "${nodePreview.contextKey}"`
                      : 'Контекстная переменная не указана'}
                  </p>
                </div>
              </header>
              <div className="sandbox-api-result">
                <pre>{formatJson(nodePreview.resultValue)}</pre>
              </div>
            </div>
          )}

          {nodePreview.type === 'condition' && (
            <div className="sandbox-card">
              <header className="sandbox-card-header">
                <GitBranch size={18} />
                <div>
                  <h2>{nodePreview.label || 'Условный переход'}</h2>
                  <p>Технический узел: выбор ветки по условиям</p>
                </div>
              </header>
              <div className="sandbox-transition-body">
                {nodePreview.conditions.length === 0 ? (
                  <div className="sandbox-empty">Условия не настроены</div>
                ) : (
                  <ul className="sandbox-transition-patch">
                    {nodePreview.conditions.map((condition, index) => (
                      <li key={condition?.id || condition?.edgeId || `condition-${index}`}>
                        <span className="sandbox-transition-key">
                          {condition?.description || condition?.type || `Условие ${index + 1}`}
                        </span>
                        <ArrowRight size={12} />
                        <span className="sandbox-transition-value">{condition?.edgeId || '—'}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {nodePreview.fallbackEdgeId && (
                  <p className="sandbox-history-summary">
                    Fallback переход: {nodePreview.fallbackEdgeId}
                  </p>
                )}
              </div>
            </div>
          )}

          {nodePreview.type === 'action' && (
            <div className="sandbox-empty">
              Узел действия "{nodePreview.label}" пока не поддерживает превью. Выберите экран или API узел.
            </div>
          )}

          {nodePreview.type === 'empty' && (
            <div className="sandbox-empty">
              Нечего отображать — выберите узел графа.
            </div>
          )}
        </div>

        <section className="sandbox-transitions">
          <header>
            <h2>Доступные переходы</h2>
            <p>Кликните, чтобы применить контекстный патч и перейти в следующий узел</p>
          </header>

          {availableEdges.length === 0 ? (
            <div className="sandbox-empty">
              Для этого узла переходы не настроены
            </div>
          ) : (
            <div className="sandbox-transition-list">
              {availableEdges.map((edge) => {
                const pendingPatch = describePatch(edge.contextPatch ?? {}, contextState);
                return (
                  <article key={edge.id} className="sandbox-transition-card">
                    <div className="sandbox-transition-body">
                      <h3>{edge.label}</h3>
                      {edge.summary && <p>{edge.summary}</p>}
                      {pendingPatch.length > 0 && (
                        <ul className="sandbox-transition-patch">
                          {pendingPatch.map((item) => (
                            <li key={`${edge.id}-${item.key}`}>
                              <span className="sandbox-transition-key">{item.key}</span>
                              <ArrowRight size={12} />
                              <span className="sandbox-transition-value">{item.value}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <button
                      type="button"
                      className="sandbox-transition-action"
                      onClick={() => handleEdgeRun(edge)}
                    >
                      <PlayCircle size={18} />
                      Перейти
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default SandboxPage;
