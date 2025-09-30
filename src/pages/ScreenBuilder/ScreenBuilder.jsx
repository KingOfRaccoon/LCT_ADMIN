import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import logger from '../../utils/logger';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import {
  Plus,
  Save,
  Eye,
  PlayCircle,
  Type,
  MousePointer,
  Square,
  Download,
  ArrowRight,
  ChevronRight,
  Copy,
  Trash2,
  BarChart,
  Database,
  Image,
  List,
  LayoutGrid,
  Columns,
  Rows,
  TextCursorInput
} from 'lucide-react';
import { useVirtualContext } from '../../context/VirtualContext';
import toast from 'react-hot-toast';
import './ScreenBuilder.css';
import { resolveWidgetStyles } from '../../styles/resolveWidgetStyles.js';
import { buildProductFromBuilder } from '../../utils/productSerializer.js';
import SandboxScreenRenderer from '../Sandbox/SandboxScreenRenderer.jsx';
import { resolveBindingValue } from '../Sandbox/utils/bindings.js';
import defaultScreenTemplate from '../../data/defaultScreenTemplate.json';
import defaultGraphTemplate from '../../data/defaultGraphTemplate.json';
import screenConfigs from '../../data/screenConfigs.json';
import graphConfigs from '../../data/graphConfigs.json';


const SCREEN_BASE_STYLE = {
  display: 'flex',
  flexDirection: 'column',
  minHeight: '720px',
  backgroundColor: '#ffffff',
  borderRadius: 'var(--screen-radius, 32px)',
  border: '1px solid var(--screen-border-color, rgba(148, 163, 184, 0.16))',
  boxShadow: 'var(--screen-shadow, 0 32px 60px rgba(15, 23, 42, 0.18))',
  padding: 'var(--screen-padding, 0px)',
  gap: '0px'
};

const SECTION_DEFAULTS = {
  topBar: {
    props: {
      spacing: 0,
      padding: 0,
      alignItems: 'stretch',
      justifyContent: 'flex-start',
      background: 'transparent'
    },
    style: {
      width: '100%',
      borderBottom: '1px solid rgba(148, 163, 184, 0.08)'
    }
  },
  body: {
    props: {
      spacing: 0,
      padding: 0,
      alignItems: 'stretch',
      justifyContent: 'flex-start',
      background: 'transparent'
    },
    style: {
      flex: '1 1 auto'
    }
  },
  bottomBar: {
    props: {
      spacing: 0,
      padding: 0,
      alignItems: 'stretch',
      justifyContent: 'flex-end',
      background: 'transparent'
    },
    style: {
      width: '100%',
      borderTop: '1px solid rgba(148, 163, 184, 0.08)'
    }
  }
};

const componentPalette = [
  {
    id: 'button',
    name: 'Button',
    category: 'Actions',
    icon: MousePointer,
    defaultProps: {
      text: 'Новая кнопка',
      variant: 'primary',
      size: 'medium'
    }
  },
  {
    id: 'text',
    name: 'Text',
    category: 'Content',
    icon: Type,
    defaultProps: {
      content: 'Новый текстовый блок',
      variant: 'body',
      color: '#0f172a'
    }
  },
  {
    id: 'input',
    name: 'Input',
    category: 'Forms',
    icon: TextCursorInput,
    defaultProps: {
      placeholder: 'Введите значение',
      type: 'text',
      required: false
    }
  },
  {
    id: 'image',
    name: 'Image',
    category: 'Content',
    icon: Image,
    defaultProps: {
      src: 'https://via.placeholder.com/640x360',
      alt: 'Placeholder image'
    }
  },
  {
    id: 'list',
    name: 'List',
    category: 'Content',
    icon: List,
    defaultProps: {
      variant: 'unordered',
      items: ['Первый элемент', 'Второй элемент', 'Третий элемент'],
      itemAlias: 'item'
    }
  },
  {
    id: 'chart',
    name: 'Chart',
    category: 'Data',
    icon: BarChart,
    defaultProps: {
      title: 'Диаграмма'
    }
  },
  {
    id: 'container',
    name: 'Floating Container',
    category: 'Layout',
    icon: LayoutGrid,
    defaultProps: {
      padding: 24,
      background: '#ffffff'
    }
  },
  {
    id: 'column',
    name: 'Column',
    category: 'Layout',
    icon: Columns,
    defaultProps: {
      spacing: 24,
      padding: 16,
      alignItems: 'stretch',
      justifyContent: 'flex-start',
      background: 'transparent'
    }
  },
  {
    id: 'row',
    name: 'Row',
    category: 'Layout',
    icon: Rows,
    defaultProps: {
      spacing: 16,
      padding: 0,
      alignItems: 'center',
      justifyContent: 'flex-start',
      flexWrap: 'nowrap',
      background: 'transparent'
    }
  }
];

const DraggableComponent = ({ component, onDragStart }) => {
  const IconComponent = component.icon;

  return (
    <div
      className="draggable-component"
      draggable
      onDragStart={(event) => onDragStart(event, component)}
    >
      <IconComponent size={20} />
      <span>{component.name}</span>
    </div>
  );
};

const assignContextValue = (target, path, value) => {
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

const buildContextFromVariables = (variablesMap = {}) => {
  const context = {};
  Object.entries(variablesMap).forEach(([name, meta]) => {
    if (!meta || meta.value === undefined) {
      return;
    }

    if (name.includes('.')) {
      assignContextValue(context, name, meta.value);
    } else {
      context[name] = meta.value;
    }
  });
  return context;
};

const normalizeComponents = (components = []) => {
  const generateId = (prefix) => `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now()}`;
  const byId = new Map();

  const sanitizeScreenStyle = (style = {}) => {
    const sanitized = { ...style };
    const legacyPaddings = new Set(['32px 40px 48px', '36px 44px']);
    const legacyBorders = new Set([
      '1px solid rgba(148, 163, 184, 0.2)',
      '1px solid rgba(148, 163, 184, 0.18)',
      '1px solid rgba(148, 163, 184, 0.16)',
      '1px solid rgba(148, 163, 184, 0.12)'
    ]);
    const legacyShadows = new Set([
      '0 24px 48px rgba(15, 23, 42, 0.12)',
      '0 28px 60px rgba(15, 23, 42, 0.12)',
      '0 32px 60px rgba(15, 23, 42, 0.18)'
    ]);
    const legacyRadii = new Set(['18px', '20px', '24px', '32px']);

    if (typeof sanitized.padding === 'string' && legacyPaddings.has(sanitized.padding.trim())) {
      delete sanitized.padding;
    }

    if (typeof sanitized.border === 'string' && legacyBorders.has(sanitized.border.trim())) {
      delete sanitized.border;
    }

    if (typeof sanitized.boxShadow === 'string' && legacyShadows.has(sanitized.boxShadow.trim())) {
      delete sanitized.boxShadow;
    }

    if (typeof sanitized.borderRadius === 'string' && legacyRadii.has(sanitized.borderRadius.trim())) {
      delete sanitized.borderRadius;
    }

    return sanitized;
  };

  const normalized = components.map((component) => {
    const normalizedComponent = {
      ...component,
      id: component?.id || generateId(component?.type || 'component'),
      type: component?.type || 'container',
      parentId: component?.parentId ?? null,
      children: Array.isArray(component?.children) ? [...component.children] : [],
      props: { ...(component?.props || {}) },
      style: { ...(component?.style || {}) },
      position:
        component?.position && typeof component.position === 'object'
          ? {
              x: Number.isFinite(component.position.x) ? component.position.x : 0,
              y: Number.isFinite(component.position.y) ? component.position.y : 0
            }
          : { x: 0, y: 0 },
      events: { ...(component?.events || {}) }
    };

    if (normalizedComponent.type === 'container' && normalizedComponent.props.section) {
      normalizedComponent.type = 'column';
    }

    normalizedComponent.children = [...new Set(normalizedComponent.children)];

    if (!normalizedComponent.props) {
      normalizedComponent.props = {};
    }

    if (!normalizedComponent.style) {
      normalizedComponent.style = {};
    }

    if (
      normalizedComponent.props.background &&
      !normalizedComponent.style.background &&
      !normalizedComponent.style.backgroundColor
    ) {
      normalizedComponent.style.background = normalizedComponent.props.background;
    }

    byId.set(normalizedComponent.id, normalizedComponent);
    return normalizedComponent;
  });

  normalized.forEach((component) => {
    component.children = component.children.filter((childId) => byId.has(childId));
    component.children.forEach((childId) => {
      const child = byId.get(childId);
      if (child) {
        child.parentId = component.id;
      }
    });

    if (component.type === 'screen') {
      const sanitizedStyle = sanitizeScreenStyle(component.style);
      component.style = { ...SCREEN_BASE_STYLE, ...sanitizedStyle };
    }
  });

  let screenRoot = normalized.find((component) => component.type === 'screen' && !component.parentId);

  if (!screenRoot) {
    screenRoot = {
      id: generateId('screen'),
      type: 'screen',
      parentId: null,
      children: [],
      props: {},
      position: { x: 0, y: 0 },
      style: { ...SCREEN_BASE_STYLE },
      events: {}
    };
    normalized.push(screenRoot);
    byId.set(screenRoot.id, screenRoot);
  } else {
    screenRoot.parentId = null;
    screenRoot.children = Array.isArray(screenRoot.children) ? [...screenRoot.children] : [];
    const sanitizedRootStyle = sanitizeScreenStyle(screenRoot.style);
    screenRoot.style = { ...SCREEN_BASE_STYLE, ...sanitizedRootStyle };
  }

  const ensureSection = (sectionName) => {
    const defaults = SECTION_DEFAULTS[sectionName];
    let section = normalized.find(
      (component) =>
        component.parentId === screenRoot.id && component.props?.section === sectionName
    );

    if (!section && defaults) {
      section = {
        id: generateId(sectionName),
        type: 'column',
        parentId: screenRoot.id,
        children: [],
        props: { section: sectionName, ...defaults.props },
        position: { x: 0, y: 0 },
        style: { ...defaults.style },
        events: {}
      };
      normalized.push(section);
      byId.set(section.id, section);
    } else if (section) {
      section.type = 'column';
      section.parentId = screenRoot.id;
      const defaultStyle = defaults?.style || {};
      const existingProps = { ...(section.props || {}) };
      const existingStyle = { ...(section.style || {}) };

      if (
        typeof existingProps.background === 'string' &&
        ['#ffffff', '#fff', 'white'].includes(existingProps.background.toLowerCase())
      ) {
        delete existingProps.background;
      }

      if (sectionName === 'topBar' && existingProps.justifyContent === 'center') {
        delete existingProps.justifyContent;
      }

      section.style = { ...defaultStyle, ...existingStyle };
      section.children = Array.isArray(section.children) ? [...section.children] : [];
    }

    if (section && !screenRoot.children.includes(section.id)) {
      screenRoot.children.push(section.id);
    }

    return section;
  };

  const topBarSection = ensureSection('topBar');
  const bodySection = ensureSection('body');
  const bottomBarSection = ensureSection('bottomBar');

  const desiredOrder = [topBarSection?.id, bodySection?.id, bottomBarSection?.id].filter(Boolean);
  if (desiredOrder.length) {
    const remaining = (screenRoot.children || []).filter((id) => !desiredOrder.includes(id));
    screenRoot.children = [...desiredOrder, ...remaining];
  }

  if (bodySection) {
    const bodyChildren = new Set(bodySection.children || []);
    normalized.forEach((component) => {
      if (
        component.id !== screenRoot.id &&
        component.id !== topBarSection?.id &&
        component.id !== bodySection.id &&
        component.id !== bottomBarSection?.id &&
        (!component.parentId || !byId.has(component.parentId))
      ) {
        component.parentId = bodySection.id;
        if (!bodyChildren.has(component.id)) {
          bodyChildren.add(component.id);
          bodySection.children.push(component.id);
        }
      }
    });
  }

  normalized.forEach((component) => {
    component.children = component.children.filter(
      (childId, index, array) => array.indexOf(childId) === index
    );
  });

  return normalized;
};

const isPlainObject = (value) => (
  value !== null &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null)
);

// Lightweight deep equality check for JSON-serializable data.
// Falls back to strict equality on error (e.g., circular refs).
const isDeepEqual = (a, b) => {
  if (a === b) return true;
  try {
    // JSON stringify is fine for our usage (API responses, graph objects, variables)
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
};

const normalizeReference = (reference) => {
  if (typeof reference !== 'string') {
    return '';
  }

  if (reference.startsWith('${') && reference.endsWith('}')) {
    return reference.slice(2, -1);
  }

  if (reference.startsWith('$')) {
    return reference.slice(1);
  }

  return reference;
};

const createReference = (variableName) => {
  if (!variableName) {
    return '';
  }

  const normalized = normalizeReference(variableName);
  return normalized ? `\${${normalized}}` : '';
};

const isReferenceString = (reference) =>
  typeof reference === 'string' &&
  reference.length > 3 &&
  reference.startsWith('${') &&
  reference.endsWith('}');

const isBindingValue = (value) =>
  isPlainObject(value) &&
  typeof value.reference === 'string' &&
  (isReferenceString(value.reference) || value.reference.startsWith('$'));

const getBindingVariableName = (value) =>
  isBindingValue(value) ? normalizeReference(value.reference) : '';

const getBindingFallbackValue = (value) => {
  if (isBindingValue(value)) {
    return value.value ?? '';
  }

  return value;
};

const createBindingValue = (fallbackValue, variableName) => ({
  value: fallbackValue ?? '',
  reference: createReference(variableName)
});

const applyFallbackUpdate = (currentValue, nextFallback) => {
  if (isBindingValue(currentValue)) {
    return {
      ...currentValue,
      value: nextFallback,
      reference: createReference(getBindingVariableName(currentValue))
    };
  }

  return nextFallback;
};

const sanitizePlainObject = (value) => {
  if (!isPlainObject(value)) {
    return {};
  }

  return Object.entries(value).reduce((acc, [key, entryValue]) => {
    if (entryValue === undefined || entryValue === null) {
      return acc;
    }

    if (isBindingValue(entryValue)) {
      acc[key] = {
        ...entryValue,
        reference: createReference(getBindingVariableName(entryValue))
      };
      return acc;
    }

    if (Array.isArray(entryValue)) {
      acc[key] = entryValue
        .map((item) => {
          if (isBindingValue(item)) {
            return {
              ...item,
              reference: createReference(getBindingVariableName(item))
            };
          }
          if (isPlainObject(item)) {
            return sanitizePlainObject(item);
          }
          return item;
        })
        .filter((item) => item !== undefined && item !== null);
      return acc;
    }

    if (isPlainObject(entryValue)) {
      acc[key] = sanitizePlainObject(entryValue);
      return acc;
    }

    acc[key] = entryValue;
    return acc;
  }, {});
};

const formatSampleValue = (value) => {
  if (value === null) {
    return 'null';
  }

  if (value === undefined) {
    return 'undefined';
  }

  if (typeof value === 'string') {
    return value.length > 64 ? `${value.slice(0, 61)}…` : value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (Array.isArray(value)) {
    const preview = value.slice(0, 3).map((item) => formatSampleValue(item)).join(', ');
    const suffix = value.length > 3 ? ', …' : '';
    return `[${preview}${suffix}]`;
  }

  try {
    const serialized = JSON.stringify(value);
    return serialized.length > 64 ? `${serialized.slice(0, 61)}…` : serialized;
  } catch {
    return String(value);
  }
};

const coerceRenderableValue = (value) => {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => coerceRenderableValue(item))
      .filter((item) => item !== '')
      .join(', ');
  }

  if (isPlainObject(value)) {
    const preferredKeys = ['label', 'title', 'name', 'display', 'content', 'value'];
    for (const key of preferredKeys) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        const formatted = coerceRenderableValue(value[key]);
        if (formatted !== '') {
          return formatted;
        }
      }
    }

    try {
      return JSON.stringify(value);
    } catch {
      return '[object Object]';
    }
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const addSuggestion = (accumulator, path, sampleValue, source) => {
  if (!path || typeof path !== 'string') {
    return;
  }

  const existing = accumulator.get(path);
  if (!existing) {
    accumulator.set(path, { path, sampleValue: sampleValue || '', source });
    return;
  }

  if (!existing.sampleValue && sampleValue) {
    accumulator.set(path, { ...existing, sampleValue });
  }
};

const collectSuggestionsFromSchema = (schema, prefix = '', accumulator = new Map(), depth = 0) => {
  if (!schema || typeof schema !== 'object' || Array.isArray(schema) || depth > 6) {
    return accumulator;
  }

  Object.entries(schema).forEach(([key, descriptor]) => {
    const nextPath = prefix ? `${prefix}.${key}` : key;

    if (typeof descriptor === 'string') {
      addSuggestion(accumulator, nextPath, '', 'schema');
      return;
    }

    if (descriptor && typeof descriptor === 'object' && !Array.isArray(descriptor)) {
      if (typeof descriptor.path === 'string') {
        addSuggestion(accumulator, nextPath, '', 'schema');
      }
      collectSuggestionsFromSchema(descriptor, nextPath, accumulator, depth + 1);
      return;
    }

    addSuggestion(accumulator, nextPath, '', 'schema');
  });

  return accumulator;
};

const collectSuggestionsFromSampleValue = (value, prefix, accumulator, depth) => {
  if (depth > 6) {
    return;
  }

  if (Array.isArray(value)) {
    value.slice(0, 4).forEach((item) => {
      collectSuggestionsFromSampleValue(item, prefix, accumulator, depth + 1);
    });
    return;
  }

  if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, child]) => {
      const nextPath = prefix ? `${prefix}.${key}` : key;
      if (child === null || typeof child !== 'object') {
        addSuggestion(accumulator, nextPath, formatSampleValue(child), 'sample');
      } else {
        collectSuggestionsFromSampleValue(child, nextPath, accumulator, depth + 1);
      }
    });
    return;
  }

  if (prefix) {
    addSuggestion(accumulator, prefix, formatSampleValue(value), 'sample');
  }
};

const collectSuggestionsFromSamples = (samples, accumulator = new Map()) => {
  if (!samples) {
    return accumulator;
  }

  const sourceArray = Array.isArray(samples) ? samples : [samples];
  sourceArray.slice(0, 6).forEach((sample) => {
    collectSuggestionsFromSampleValue(sample, '', accumulator, 0);
  });

  return accumulator;
};

const resolvePropValue = (props = {}, key, defaultValue = '') => {
  const raw = props?.[key];
  const resolved = getBindingFallbackValue(raw);

  if (resolved === undefined || resolved === null) {
    return defaultValue;
  }

  return resolved;
};

const serializeScreenDocument = (components = [], { screenId, screenName } = {}) => {
  const normalizedComponents = Array.isArray(components) ? components : [];
  const sourceMap = new Map(
    normalizedComponents
      .filter((component) => component && component.id)
      .map((component) => [component.id, component])
  );

  const references = {};

  const ensureReference = (referenceId, items) => {
    if (!referenceId) {
      return;
    }

    if (!references[referenceId]) {
      references[referenceId] = {
        type: 'list',
        items: []
      };
    }

    if (Array.isArray(items) && items.length) {
      references[referenceId].items = items.map((item) => (isPlainObject(item) ? { ...item } : item));
    }
  };

  const sanitizePosition = (position) => {
    if (position && typeof position === 'object') {
      const x = Number.isFinite(position.x) ? position.x : 0;
      const y = Number.isFinite(position.y) ? position.y : 0;
      return { x, y };
    }

    return { x: 0, y: 0 };
  };

  const sanitizedMap = new Map();

  normalizedComponents.forEach((component) => {
    if (!component || !component.id) {
      return;
    }

    const props = sanitizePlainObject(component.props);
    const style = sanitizePlainObject(component.style);
    const events = sanitizePlainObject(component.events);

    if (typeof props.referenceId === 'string') {
      ensureReference(props.referenceId, props.options || props.items);
    }

    if (Array.isArray(props.items)) {
      props.items.forEach((item) => {
        if (isPlainObject(item) && typeof item.referenceId === 'string') {
          ensureReference(item.referenceId, item.items);
        }
      });
    }

    const childIds = Array.isArray(component.children)
      ? component.children.filter((childId) => sourceMap.has(childId))
      : [];

    sanitizedMap.set(component.id, {
      id: component.id,
      type: component.type || 'component',
      parentId: component.parentId ?? null,
      childIds,
      props,
      style,
      position: sanitizePosition(component.position),
      events
    });
  });

  const buildTree = (componentId) => {
    const node = sanitizedMap.get(componentId);
    if (!node) {
      return null;
    }

    return {
      ...node,
      children: node.childIds.map((childId) => buildTree(childId)).filter(Boolean)
    };
  };

  const rootComponent =
    normalizedComponents.find((component) => !component?.parentId && component?.type === 'screen') ||
    normalizedComponents.find((component) => !component?.parentId);

  const tree = rootComponent ? buildTree(rootComponent.id) : null;

  const serializedComponents = Array.from(sanitizedMap.values()).map((component) => ({
    ...component
  }));

  const documentMeta = {
    documentId: screenId || rootComponent?.id || 'screen',
    name: screenName || rootComponent?.name || 'Screen',
    componentCount: serializedComponents.length
  };

  const payload = {
    document: documentMeta,
    tree,
    components: serializedComponents
  };

  if (Object.keys(references).length > 0) {
    payload.references = references;
  }

  return payload;
};

const sanitizeGraphValue = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeGraphValue(item))
      .filter((item) => item !== undefined);
  }

  if (isBindingValue(value)) {
    return {
      ...value,
      reference: createReference(getBindingVariableName(value))
    };
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .map(([key, entryValue]) => [key, sanitizeGraphValue(entryValue)])
        .filter(([, entryValue]) => entryValue !== undefined)
    );
  }

  if (value === undefined) {
    return undefined;
  }

  return value;
};

const serializeProductGraph = (
  graphData = {},
  { product, productId, screens = [], variables = {}, variablesOrder = [] } = {}
) => {
  const nodes = Array.isArray(graphData.nodes) ? graphData.nodes : [];
  const edges = Array.isArray(graphData.edges) ? graphData.edges : [];

  const sanitizedNodes = nodes
    .map((node) => sanitizeGraphValue(node))
    .filter((node) => node && node.id);

  const sanitizedEdges = edges
    .map((edge) => sanitizeGraphValue(edge))
    .filter((edge) => edge && edge.id && edge.source && edge.target);

  const productMeta = sanitizePlainObject({
    id: product?.id || productId || 'product',
    name: product?.name || 'Product',
    version: product?.version,
    description: product?.description
  });

  const screenSummaries = Array.isArray(screens)
    ? screens
        .map((screen) =>
          sanitizePlainObject({
            id: screen?.id,
            name: screen?.name,
            type: screen?.type,
            description: screen?.description,
            status: screen?.status,
            order: screen?.order
          })
        )
        .filter((screen) => Object.keys(screen).length > 0)
    : [];

  const variableNames = Object.keys(variables || {});
  const orderedVariableNames = variablesOrder && variablesOrder.length
    ? [...variablesOrder.filter((name) => variableNames.includes(name)), ...variableNames.filter((name) => !variablesOrder.includes(name))]
    : variableNames;

  const variableDefinitions = orderedVariableNames
    .map((name) => {
      const variable = variables?.[name];
      if (!variable) {
        return null;
      }

      return sanitizePlainObject({
        name,
        value: variable.value,
        type: variable.type,
        source: variable.source,
        description: variable.description
      });
    })
    .filter(Boolean);

  const graphExport = {
    product: productMeta,
    nodes: sanitizedNodes,
    edges: sanitizedEdges,
    meta: {
      nodeCount: sanitizedNodes.length,
      edgeCount: sanitizedEdges.length
    }
  };

  if (screenSummaries.length) {
    graphExport.screens = screenSummaries;
  }

  if (variableDefinitions.length) {
    graphExport.variables = variableDefinitions;
  }

  return {
    document: {
      documentId: productMeta.id || productId || 'product',
      name: productMeta.name || 'Product'
    },
    graph: graphExport
  };
};

const createDefaultTemplate = (screenName = 'Игровой каталог') => {
  const normalizedName = (screenName && screenName.trim()) || 'Игровой каталог';
  const templateComponents = Array.isArray(defaultScreenTemplate?.components)
    ? defaultScreenTemplate.components
    : [];

  const generateId = (prefix) => `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now()}`;
  const idMap = new Map();
  templateComponents.forEach((component) => {
    const key = component.id || component.type || 'component';
    if (!idMap.has(component.id)) {
      idMap.set(component.id, generateId(key));
    }
  });

  const replacePlaceholders = (value) => {
    if (typeof value === 'string') {
      return value.replace(/{{\s*screenName\s*}}/g, normalizedName);
    }
    if (Array.isArray(value)) {
      return value.map((item) => replacePlaceholders(item));
    }
    if (value && typeof value === 'object') {
      return Object.entries(value).reduce((acc, [key, entry]) => {
        acc[key] = replacePlaceholders(entry);
        return acc;
      }, {});
    }
    return value;
  };

  return templateComponents.map((component) => {
    const clone = JSON.parse(JSON.stringify(component));
    clone.id = idMap.get(component.id);
    clone.parentId = component.parentId ? idMap.get(component.parentId) : null;
    clone.children = Array.isArray(component.children)
      ? component.children.map((childId) => idMap.get(childId))
      : [];
    clone.props = replacePlaceholders(clone.props || {});
    clone.position = clone.position || { x: 0, y: 0 };
    clone.style = clone.style || {};
    clone.events = clone.events || {};
    return clone;
  });
};

const getChildWrappers = (droppableElement, excludeId = null) => {
  if (!droppableElement) {
    return [];
  }

  const wrappers = [];

  const shouldIncludeWrapper = (wrapper) => {
    if (!(wrapper instanceof HTMLElement)) {
      return false;
    }

    if (!wrapper.classList.contains('canvas-component-wrapper')) {
      return false;
    }

    if (excludeId && wrapper.dataset?.componentId === excludeId) {
      return false;
    }

    return true;
  };

  const tagName = droppableElement.tagName;

  if (tagName === 'UL' || tagName === 'OL') {
    Array.from(droppableElement.children).forEach((child) => {
      if (!(child instanceof HTMLElement)) {
        return;
      }

      const wrapper = child.querySelector('.canvas-component-wrapper');
      if (shouldIncludeWrapper(wrapper)) {
        wrappers.push(wrapper);
      }
    });

    return wrappers;
  }

  return Array.from(droppableElement.children).filter(shouldIncludeWrapper);
};

const calculateInsertionIndex = (event, droppableElement, parentType, excludeId = null) => {
  const wrappers = getChildWrappers(droppableElement, excludeId);

  if (!['row', 'column', 'list'].includes(parentType)) {
    return wrappers.length;
  }

  const pointerValue = parentType === 'row' ? event.clientX : event.clientY;

  for (let index = 0; index < wrappers.length; index += 1) {
    const wrapper = wrappers[index];
    const rect = wrapper.getBoundingClientRect();
    const midpoint = parentType === 'row'
      ? rect.left + rect.width / 2
      : rect.top + rect.height / 2;

    if (pointerValue < midpoint) {
      return index;
    }
  }

  return wrappers.length;
};

const DropIndicator = ({ orientation }) => (
  <div className={`drop-indicator ${orientation}`} aria-hidden="true" />
);

const extractNumericInputValue = (value) => {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : '';
  }

  if (typeof value === 'string' && value.endsWith('px')) {
    return value.slice(0, -2);
  }

  return value;
};

// Canvas Component Renderer
const CanvasComponent = ({
  component,
  componentsMap,
  selectedId,
  previewMode,
  onClick,
  onDelete,
  onDuplicate,
  parent,
  onComponentDragStart,
  onComponentDragEnd,
  dropIndicator,
  onDropIndicatorUpdate,
  onDropIndicatorClear,
  variables = {},
  context = null,
  iterationStack = []
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const isSelected = selectedId === component.id;
  const childComponents = useMemo(
    () =>
      (component.children || [])
        .map((childId) => componentsMap.get(childId))
        .filter(Boolean),
    [component.children, componentsMap]
  );

  const componentContext = useMemo(() => {
    if (context && typeof context === 'object') {
      return context;
    }
    return buildContextFromVariables(variables);
  }, [context, variables]);

  const resolveProp = useCallback(
    (key, defaultValue) => {
      const raw = component.props?.[key];
      const fallback = getBindingFallbackValue(raw);
      const resolved = resolveBindingValue(
        raw,
        componentContext,
        fallback !== undefined ? fallback : defaultValue,
        { iterationStack }
      );

      if (resolved === undefined || resolved === null) {
        if (fallback !== undefined) {
          return fallback;
        }
        return defaultValue;
      }

      return resolved;
    },
    [component.props, componentContext, iterationStack]
  );

  const activeDropIndicator = useMemo(() => {
    if (!dropIndicator) {
      return null;
    }
    if (dropIndicator.parentId === component.id) {
      return dropIndicator;
    }
    return null;
  }, [dropIndicator, component.id]);

  const isLayoutComponent =
    component.type === 'column' || component.type === 'row' || component.type === 'list';
  const isContainerComponent = component.type === 'container' || component.type === 'list';
  const isScreenComponent = component.type === 'screen';
  const droppable = !previewMode && (isLayoutComponent || isContainerComponent);
  const parentType = parent?.type;
  const isAbsolutelyPositioned = !isScreenComponent && (!parent || (parentType === 'container' && !isLayoutComponent));

  const paddingToCss = (value) => {
    if (typeof value === 'number') {
      return `${value}px`;
    }
    if (typeof value === 'string') {
      return value;
    }
    return '0px';
  };

  const spacingToCss = (value) => {
    if (typeof value === 'number') {
      return `${value}px`;
    }
    if (typeof value === 'string') {
      return value;
    }
    return '0px';
  };

  const handleSelect = (event) => {
    if (previewMode) {
      return;
    }

    event.stopPropagation();
    onClick(component);
  };

  const handleMouseEnter = () => {
    if (!previewMode) {
      setIsHovered(true);
    }
  };

  const handleMouseLeave = () => {
    if (!previewMode) {
      setIsHovered(false);
    }
  };

  const renderChildren = () => {
    const renderChildComponent = (child, keySuffix = '') => (
      <CanvasComponent
        key={`${child.id}${keySuffix}`}
        component={child}
        componentsMap={componentsMap}
        selectedId={selectedId}
        previewMode={previewMode}
        onClick={onClick}
        onDelete={onDelete}
        onDuplicate={onDuplicate}
        parent={component}
        onComponentDragStart={onComponentDragStart}
        onComponentDragEnd={onComponentDragEnd}
        dropIndicator={dropIndicator}
        onDropIndicatorUpdate={onDropIndicatorUpdate}
        onDropIndicatorClear={onDropIndicatorClear}
        variables={variables}
        context={componentContext}
        iterationStack={iterationStack}
      />
    );

    if (!activeDropIndicator || !['horizontal', 'vertical'].includes(activeDropIndicator.orientation)) {
      return childComponents.map(renderChildComponent);
    }

    const elements = [];
    const totalChildren = childComponents.length;
    const sanitizedIndex = Math.max(
      0,
      Math.min(activeDropIndicator.index ?? totalChildren, totalChildren)
    );
    const indicatorOrientation = activeDropIndicator.orientation;

    for (let index = 0; index < totalChildren; index += 1) {
      if (sanitizedIndex === index) {
        elements.push(
          <DropIndicator
            key={`drop-indicator-${component.id}-${index}`}
            orientation={indicatorOrientation}
          />
        );
      }

      const child = childComponents[index];
      elements.push(renderChildComponent(child));
    }

    if (sanitizedIndex === totalChildren) {
      elements.push(
        <DropIndicator
          key={`drop-indicator-${component.id}-${totalChildren}`}
          orientation={indicatorOrientation}
        />
      );
    }

    return elements;
  };

  const renderComponent = () => {
    switch (component.type) {
      case 'screen': {
        const screenStyle = {
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          minHeight: '100%',
          ...component.style
        };

        return (
          <div className={`screen-canvas ${previewMode ? 'preview' : ''}`} style={screenStyle}>
            {childComponents.length > 0 ? renderChildren() : !previewMode && (
              <div className="screen-placeholder">Add content to your screen</div>
            )}
          </div>
        );
      }

      case 'button': {
        const textRaw = resolveProp('text', 'Button');
        const textValue = coerceRenderableValue(textRaw) || 'Button';
        const variant = resolveProp('variant', 'primary');
        const size = resolveProp('size', 'medium');
        const { style: widgetStyle } = resolveWidgetStyles('button', { variant, size });
        const buttonStyle = { ...widgetStyle, ...component.style };

        return (
          <button
            className={`canvas-button ${variant} ${size}`}
            style={buttonStyle}
          >
            {textValue}
          </button>
        );
      }

      case 'text': {
        const rawContent = resolveProp('content', 'Text');
        const contentValue = coerceRenderableValue(rawContent) || 'Text';
        const variant = resolveProp('variant', 'body');
        const color = resolveProp('color', '#0f172a');
        const { style: widgetStyle } = resolveWidgetStyles('text', { variant });
        const textStyle = { ...widgetStyle, ...component.style };
        if (color) {
          textStyle.color = color;
          textStyle['--widget-text-color'] = color;
        }

        return (
          <div
            className={`canvas-text ${variant}`}
            style={textStyle}
          >
            {contentValue}
          </div>
        );
      }

      case 'input': {
        const inputType = resolveProp('type', 'text');
        const placeholderRaw = resolveProp('placeholder', '');
        const placeholder = coerceRenderableValue(placeholderRaw);
        const required = Boolean(resolveProp('required', false));
        const { style: widgetStyle } = resolveWidgetStyles('input');
        const inputStyle = { ...widgetStyle, ...component.style };

        return (
          <input
            type={inputType}
            placeholder={placeholder}
            className="canvas-input"
            style={inputStyle}
            required={required}
            readOnly
          />
        );
      }

      case 'image': {
        const srcRaw = resolveProp('src', component.props?.placeholder || '');
        const resolvedSrc = coerceRenderableValue(srcRaw);
        const fallbackSrc = component.props?.placeholder || 'https://via.placeholder.com/640x360';
        const srcValue = typeof resolvedSrc === 'string' && resolvedSrc.trim().length > 0
          ? resolvedSrc
          : fallbackSrc;
        const altRaw = resolveProp('alt', 'Image');
        const altValue = coerceRenderableValue(altRaw) || 'Image';
        const { style: widgetStyle } = resolveWidgetStyles('image');
        const imageStyle = { ...widgetStyle, ...component.style };

        return (
          <img
            src={srcValue}
            alt={altValue}
            className="canvas-image"
            style={imageStyle}
          />
        );
      }

      case 'list': {
        const hasChildren = childComponents.length > 0;
        const variant = resolveProp('variant', 'unordered');
        const ListTag = variant === 'ordered' ? 'ol' : 'ul';
        const { style: widgetStyle } = resolveWidgetStyles('list', { variant });
        const listStyle = { ...widgetStyle, ...(component.style || {}) };
        if (!listStyle.listStyleType) {
          listStyle.listStyleType = hasChildren ? 'none' : variant === 'ordered' ? 'decimal' : 'disc';
        }

        const normalizeToArray = (value) => {
          if (Array.isArray(value)) {
            return value;
          }

          if (typeof value === 'number' && Number.isFinite(value)) {
            const count = Math.max(0, Math.floor(value));
            return Array.from({ length: count }, (_, index) => index + 1);
          }

          if (typeof value === 'string') {
            const trimmed = value.trim();
            if (!trimmed) {
              return [];
            }

            try {
              const parsed = JSON.parse(trimmed);
              if (Array.isArray(parsed)) {
                return parsed;
              }
            } catch {
              // ignore parse errors, fallback to splitting below
            }

            return trimmed
              .split(/\r?\n|,/)
              .map((item) => item.trim())
              .filter((item) => item.length > 0);
          }

          if (value && typeof value === 'object') {
            return Object.values(value);
          }

          return [];
        };

        const rawItemsProp = component.props?.items;
        const fallbackItemsRaw = getBindingFallbackValue(rawItemsProp);

        let manualItems = [];
        if (Array.isArray(component.props?.items)) {
          manualItems = component.props.items;
        } else if (Array.isArray(fallbackItemsRaw)) {
          manualItems = fallbackItemsRaw;
        } else {
          manualItems = normalizeToArray(fallbackItemsRaw);
        }

        const bindingName = getBindingVariableName(rawItemsProp);
        let contextItems = null;
        if (bindingName && variables && variables[bindingName]) {
          const variableValue = variables[bindingName]?.value;
          if (Array.isArray(variableValue)) {
            contextItems = variableValue;
          } else {
            contextItems = normalizeToArray(variableValue);
          }
        }

        const mergedItemsCandidate = Array.isArray(contextItems) ? contextItems : manualItems;
        const items = Array.isArray(mergedItemsCandidate) ? mergedItemsCandidate : [];

        if (!hasChildren) {
          return (
            <ListTag className="canvas-list" style={listStyle}>
              {items.length > 0
                ? items.map((item, index) => (
                    <li key={`${component.id}-item-${index}`}>{formatListItem(item)}</li>
                  ))
                : !previewMode && <li className="list-placeholder">Add items</li>}
            </ListTag>
          );
        }

        const listProps = droppable
          ? {
              'data-droppable-id': component.id,
              'data-droppable-type': 'list'
            }
          : {};

        const aliasRaw = typeof component.props?.itemAlias === 'string' ? component.props.itemAlias.trim() : '';
        const itemAlias = aliasRaw || 'item';
        const displayPathRaw = resolveProp('displayPath', '');
        const normalizedDisplayPath = typeof displayPathRaw === 'string' ? displayPathRaw.trim() : '';
        const effectiveDisplayPath = normalizedDisplayPath.startsWith(`${itemAlias}.`)
          ? normalizedDisplayPath.slice(itemAlias.length + 1)
          : normalizedDisplayPath;

        const resolveSegments = (path) => path
          .replace(/\[(\d+)\]/g, '.$1')
          .split('.')
          .map((segment) => segment.trim())
          .filter((segment) => segment.length > 0);

        const readItemPath = (item, path) => {
          if (!path || item === undefined || item === null) {
            return undefined;
          }

          const segments = resolveSegments(path);
          if (segments.length === 0) {
            return undefined;
          }

          let cursor = item;
          for (const segment of segments) {
            if (cursor === undefined || cursor === null) {
              return undefined;
            }

            if (Array.isArray(cursor) && /^\d+$/.test(segment)) {
              cursor = cursor[Number(segment)];
              continue;
            }

            if (typeof cursor === 'object' && Object.prototype.hasOwnProperty.call(cursor, segment)) {
              cursor = cursor[segment];
              continue;
            }

            return undefined;
          }

          return cursor;
        };

        const formatDisplayValue = (value) => coerceRenderableValue(value);

        const formatListItem = (item) => {
          if (effectiveDisplayPath) {
            const resolved = readItemPath(item, effectiveDisplayPath);
            if (resolved !== undefined) {
              return formatDisplayValue(resolved);
            }
          }

          return formatDisplayValue(item);
        };

        const createIterationFrame = (itemValue, index) => {
          if (itemValue === undefined) {
            return null;
          }
          return {
            alias: itemAlias,
            item: itemValue,
            index,
            total: items.length
          };
        };

        const renderChildClone = (child, keySuffix, frame) => (
          <CanvasComponent
            key={`${child.id}-${keySuffix}`}
            component={child}
            componentsMap={componentsMap}
            selectedId={selectedId}
            previewMode={previewMode}
            onClick={onClick}
            onDelete={onDelete}
            onDuplicate={onDuplicate}
            parent={component}
            onComponentDragStart={onComponentDragStart}
            onComponentDragEnd={onComponentDragEnd}
            dropIndicator={dropIndicator}
            onDropIndicatorUpdate={onDropIndicatorUpdate}
            onDropIndicatorClear={onDropIndicatorClear}
            variables={variables}
            context={componentContext}
            iterationStack={frame ? [...iterationStack, frame] : iterationStack}
          />
        );

        if (previewMode) {
          return (
            <ListTag className="canvas-list" style={listStyle}>
              {items.length > 0 ? (
                items.map((item, index) => {
                  const frame = createIterationFrame(item, index);
                  return (
                    <li key={`${component.id}-preview-${index}`} style={{ listStyle: 'none' }}>
                      {childComponents.map((child) =>
                        renderChildClone(child, `preview-${index}`, frame)
                      )}
                    </li>
                  );
                })
              ) : (
                <li className="list-placeholder">No items</li>
              )}
            </ListTag>
          );
        }

        const templateItem = items.length > 0 ? items[0] : undefined;
        const templateFrame = createIterationFrame(templateItem, 0);
        const templateNodes = childComponents.map((child, childIndex) =>
          renderChildClone(child, `template-${childIndex}`, templateFrame)
        );
        const hasTemplate = templateNodes.length > 0;
        const displayedCount = templateFrame ? 1 : 0;
        const remainingCount = Math.max(0, items.length - displayedCount);

        return (
          <ListTag
            className="canvas-list"
            style={listStyle}
            onDragOver={(event) => {
              if (!previewMode) {
                event.preventDefault();
                onDropIndicatorUpdate?.(event);
              }
            }}
            onDragLeave={(event) => {
              if (!previewMode) {
                const nextTarget = event.relatedTarget;
                if (!event.currentTarget.contains(nextTarget)) {
                  onDropIndicatorClear?.();
                }
              }
            }}
            {...listProps}
          >
            <li style={{ listStyle: 'none' }}>
              {hasTemplate ? (
                templateNodes
              ) : (
                <div className="layout-empty-placeholder">Drop components here</div>
              )}
            </li>
            {remainingCount > 0 && (
              <li
                className="list-placeholder"
                aria-hidden="true"
                style={{ listStyle: 'none' }}
              >
                {`${remainingCount} more item${remainingCount === 1 ? '' : 's'}...`}
              </li>
            )}
            {items.length === 0 && (
              <li
                className="list-placeholder"
                aria-hidden="true"
                style={{ listStyle: 'none' }}
              >
                No items from context yet
              </li>
            )}
          </ListTag>
        );
      }

      case 'chart': {
        const titleRaw = resolveProp('title', 'Chart');
        const title = coerceRenderableValue(titleRaw) || 'Chart';
        const { style: widgetStyle } = resolveWidgetStyles('chart');
        const chartStyle = { ...widgetStyle, ...component.style };

        return (
          <div className="canvas-chart" style={chartStyle}>
            <div className="chart-placeholder">
              <BarChart size={48} />
              <span>{title}</span>
            </div>
          </div>
        );
      }

      case 'column': {
        const sectionName = component.props?.section;
        const layoutStyle = {
          display: 'flex',
          flexDirection: 'column',
          gap: spacingToCss(component.props.spacing ?? 16),
          alignItems: component.props.alignItems || 'stretch',
          justifyContent: component.props.justifyContent || 'flex-start',
          flexWrap: component.props.flexWrap || 'nowrap',
          alignContent: component.props.alignContent || 'stretch',
          padding: paddingToCss(component.props.padding ?? 0),
          background: component.props.background || 'transparent',
          ...(sectionName
            ? {
                border: 'none',
                minHeight: 'auto',
                width: '100%'
              }
            : {}),
          ...component.style
        };

        const layoutProps = droppable
          ? {
              'data-droppable-id': component.id,
              'data-droppable-type': 'column'
            }
          : {};

        const layoutClassName = [
          'layout-container',
          'column',
          previewMode ? 'preview' : '',
          activeDropIndicator ? 'drop-target-active' : '',
          sectionName ? 'screen-section' : '',
          sectionName ? `screen-section-${sectionName}` : ''
        ]
          .filter(Boolean)
          .join(' ');

        return (
          <div
            className={layoutClassName}
            style={layoutStyle}
            onDragOver={(event) => {
              if (!previewMode) {
                event.preventDefault();
                onDropIndicatorUpdate?.(event);
              }
            }}
            onDragLeave={(event) => {
              if (!previewMode) {
                const nextTarget = event.relatedTarget;
                if (!event.currentTarget.contains(nextTarget)) {
                  onDropIndicatorClear?.();
                }
              }
            }}
            {...layoutProps}
          >
            {(() => {
              const renderedChildren = renderChildren();
              if (renderedChildren.length > 0) {
                return renderedChildren;
              }
              return (
                !previewMode && (
                  <div className="layout-empty-placeholder">Drop components here</div>
                )
              );
            })()}
          </div>
        );
      }

      case 'row': {
        const layoutStyle = {
          display: 'flex',
          flexDirection: 'row',
          gap: spacingToCss(component.props.spacing ?? 16),
          alignItems: component.props.alignItems || 'center',
          justifyContent: component.props.justifyContent || 'flex-start',
          flexWrap: component.props.flexWrap || 'nowrap',
          alignContent: component.props.alignContent || 'stretch',
          padding: paddingToCss(component.props.padding ?? 0),
          background: component.props.background || 'transparent',
          ...component.style
        };

        const layoutProps = droppable
          ? {
              'data-droppable-id': component.id,
              'data-droppable-type': 'row'
            }
          : {};

        return (
          <div
            className={`layout-container row ${previewMode ? 'preview' : ''} ${activeDropIndicator ? 'drop-target-active' : ''}`}
            style={layoutStyle}
            onDragOver={(event) => {
              if (!previewMode) {
                event.preventDefault();
                onDropIndicatorUpdate?.(event);
              }
            }}
            onDragLeave={(event) => {
              if (!previewMode) {
                const nextTarget = event.relatedTarget;
                if (!event.currentTarget.contains(nextTarget)) {
                  onDropIndicatorClear?.();
                }
              }
            }}
            {...layoutProps}
          >
            {(() => {
              const renderedChildren = renderChildren();
              if (renderedChildren.length > 0) {
                return renderedChildren;
              }
              return (
                !previewMode && (
                  <div className="layout-empty-placeholder">Drop components here</div>
                )
              );
            })()}
          </div>
        );
      }

      case 'container': {
        const frameProps = droppable
          ? {
              'data-droppable-id': component.id,
              'data-droppable-type': 'container'
            }
          : {};

        const frameStyle = {
          ...component.style,
          padding: paddingToCss(component.props.padding ?? component.style?.padding ?? 0),
          background:
            component.props.background || component.style?.background || component.style?.backgroundColor || 'transparent',
          border: previewMode ? 'none' : component.style?.border || '2px dashed #e2e8f0',
          minHeight: component.style?.minHeight || '120px',
          position: 'relative'
        };

        const showOverlay = !!activeDropIndicator && activeDropIndicator.orientation === 'overlay';
        const sectionName = component.props?.section;
        const frameClassName = [
          'canvas-frame',
          previewMode ? 'preview' : '',
          showOverlay ? 'drop-target-active' : '',
          sectionName ? 'screen-section' : '',
          sectionName ? `screen-section-${sectionName}` : ''
        ]
          .filter(Boolean)
          .join(' ');

        return (
          <div
            className={frameClassName}
            style={frameStyle}
            onDragOver={(event) => {
              if (!previewMode) {
                event.preventDefault();
                onDropIndicatorUpdate?.(event);
              }
            }}
            onDragLeave={(event) => {
              if (!previewMode) {
                const nextTarget = event.relatedTarget;
                if (!event.currentTarget.contains(nextTarget)) {
                  onDropIndicatorClear?.();
                }
              }
            }}
            {...frameProps}
          >
            {showOverlay && <div className="drop-overlay" aria-hidden="true" />}
            {childComponents.length > 0
              ? renderChildren()
              : !previewMode && (
                  <div className="layout-empty-placeholder">Drop components here</div>
                )}
          </div>
        );
      }

      default:
        return <div>Unknown component</div>;
    }
  };

  return (
    <div
      className={`canvas-component-wrapper component-${component.type} ${isSelected && !previewMode ? 'selected' : ''} ${previewMode ? 'preview' : ''}`}
      data-component-id={component.id}
      {...(droppable
        ? {
            'data-droppable-id': component.id,
            'data-droppable-type': component.type
          }
        : {})}
  draggable={!previewMode && !isScreenComponent}
      style={
        isAbsolutelyPositioned
          ? {
              position: 'absolute',
              left: component.position?.x || 0,
              top: component.position?.y || 0
            }
          : {
              position: 'relative',
              width: component.style?.width || '100%',
              ...(isScreenComponent ? { height: '100%' } : {})
            }
      }
      onClick={handleSelect}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onDragStart={(event) => {
        if (previewMode) {
          return;
        }
        event.stopPropagation();
        onComponentDragStart?.(event, component, parent);
        onDropIndicatorClear?.();
      }}
      onDragEnd={(event) => {
        if (previewMode) {
          return;
        }
        event.stopPropagation();
        onComponentDragEnd?.(event, component, parent);
        onDropIndicatorClear?.();
      }}
    >
      {renderComponent()}

      {!previewMode && !isScreenComponent && (isHovered || isSelected) && (
        <div className="component-actions">
          <button
            className="action-btn"
            onClick={(event) => {
              event.stopPropagation();
              onDuplicate(component);
            }}
          >
            <Copy size={14} />
          </button>
          <button
            className="action-btn danger"
            onClick={(event) => {
              event.stopPropagation();
              onDelete(component.id);
            }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}
    </div>
  );
};

const ScreenBuilder = () => {
  const { productId, screenId } = useParams();
  const navigate = useNavigate();
  const { 
    currentProduct,
    currentScreen, 
    screens,
    variables,
    variablesOrder,
    graphData,
    variableSchemas,
    setVariable,
    reorderVariables,
    setGraphData,
    setVariableSchemas
  } = useVirtualContext();

  const [components, setComponents] = useState([]);
  const [selectedComponent, setSelectedComponent] = useState(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [dropIndicator, setDropIndicator] = useState(null);
  const canvasRef = useRef(null);
  const initializedScreenRef = useRef(null);
  // Keep a ref to latest variables to avoid capturing them in initialization effects
  const variablesRef = useRef(variables);
  useEffect(() => { variablesRef.current = variables; }, [variables]);
  // Keep a ref to latest graphData to avoid adding it to init effect deps
  const graphDataRef = useRef(graphData);
  useEffect(() => { graphDataRef.current = graphData; }, [graphData]);
  const [screenStorageReady, setScreenStorageReady] = useState(false);
  const screenStorageRef = useRef({});
  const [isSavingScreen, setIsSavingScreen] = useState(false);
  const [initialVariableSnapshots, setInitialVariableSnapshots] = useState({});

  const variablesList = useMemo(() => {
    const names = Object.keys(variables || {});
    if (!variablesOrder || variablesOrder.length === 0) {
      return names;
    }
    const ordered = variablesOrder.filter((name) => names.includes(name));
    const missing = names.filter((name) => !ordered.includes(name));
    return [...ordered, ...missing];
  }, [variables, variablesOrder]);

  const componentsMap = useMemo(
    () => new Map(components.map((component) => [component.id, component])),
    [components]
  );
  const rootComponents = useMemo(
    () => components.filter((component) => !component.parentId),
    [components]
  );

  useEffect(() => {
    // Отключено: не читаем из localStorage, просто инициализируем пустым объектом
    screenStorageRef.current = {};
    setScreenStorageReady(true);
  }, []);

  const listContextBinding = useMemo(() => {
    if (!selectedComponent) {
      return null;
    }

    const visited = new Set();
    let current = selectedComponent;

    while (current?.parentId) {
      const parent = componentsMap.get(current.parentId);

      if (!parent || visited.has(parent.id)) {
        break;
      }

      if (parent.type === 'list') {
        const aliasRaw = typeof parent.props?.itemAlias === 'string' ? parent.props.itemAlias.trim() : '';
        const alias = aliasRaw || 'item';
        const bindingName = getBindingVariableName(parent.props?.items);
        const suggestionsMap = new Map();

        if (bindingName) {
          const schema = variableSchemas?.[bindingName]?.schema;
          if (schema && typeof schema === 'object') {
            collectSuggestionsFromSchema(schema, '', suggestionsMap);
          }
        } else if (parent.props?.items && typeof parent.props.items === 'object' && !Array.isArray(parent.props.items)) {
          collectSuggestionsFromSchema(parent.props.items, '', suggestionsMap);
        }

        let samples = [];
        if (bindingName && variables?.[bindingName]?.value !== undefined) {
          const resolvedValue = variables[bindingName].value;
          if (Array.isArray(resolvedValue)) {
            samples = resolvedValue;
          } else if (resolvedValue !== null && resolvedValue !== undefined) {
            samples = [resolvedValue];
          }
        }

        if (samples.length === 0) {
          const fallback = getBindingFallbackValue(parent.props?.items);
          if (Array.isArray(fallback)) {
            samples = fallback;
          } else if (fallback && typeof fallback === 'object') {
            samples = [fallback];
          } else if (Array.isArray(parent.props?.items)) {
            samples = parent.props.items;
          }
        }

        collectSuggestionsFromSamples(samples, suggestionsMap);

        const suggestionsArray = Array.from(suggestionsMap.values())
          .filter((entry) => entry.path && entry.path.length > 0)
          .sort((a, b) => a.path.localeCompare(b.path))
          .slice(0, 60)
          .map((entry) => ({
            ...entry,
            fullPath: `${alias}.${entry.path}`
          }));

        const lookup = suggestionsArray.reduce((acc, entry) => {
          acc[entry.fullPath] = entry;
          return acc;
        }, {});

        return {
          alias,
          bindingName,
          suggestions: suggestionsArray,
          suggestionLookup: lookup
        };
      }

      visited.add(parent.id);
      current = parent;
    }

    return null;
  }, [componentsMap, selectedComponent, variableSchemas, variables]);

  const previewScreen = useMemo(() => ({
    id: screenId || 'preview-screen',
    name: currentScreen?.name || 'Screen',
    components
  }), [components, currentScreen?.name, screenId]);

  const storedVariableMap = useMemo(() => {
    if (!screenStorageReady) {
      return {};
    }

    const storedDefinitions = screenStorageRef.current?.[screenId]?.variableDefinitions;
    if (!Array.isArray(storedDefinitions) || storedDefinitions.length === 0) {
      return {};
    }
    const map = {};
    storedDefinitions.forEach((definition) => {
      if (!definition?.name) {
        return;
      }
      map[definition.name] = {
        value: definition.value,
        type: definition.type || 'string',
        source: definition.source || 'manual',
        description: definition.description || ''
      };
    });
    return map;
  }, [screenId, screenStorageReady]);

  const mergedVariableMap = useMemo(() => {
    const merged = { ...storedVariableMap, ...initialVariableSnapshots };
    Object.entries(variables || {}).forEach(([name, meta]) => {
      if (!meta) {
        return;
      }
      merged[name] = {
        value: meta.value,
        type: meta.type,
        source: meta.source,
        description: meta.description
      };
    });
    return merged;
  }, [initialVariableSnapshots, storedVariableMap, variables]);

  const previewContext = useMemo(() => buildContextFromVariables(mergedVariableMap), [mergedVariableMap]);

  const getComponentDisplayName = useCallback((component) => {
    if (!component) {
      return 'Component';
    }

    const typeName = component.type
      ? component.type.charAt(0).toUpperCase() + component.type.slice(1)
      : 'Component';

    if (!component.props) {
      return typeName;
    }

    const preferValue = (...values) => {
      for (const value of values) {
        const resolved = getBindingFallbackValue(value);
        if (resolved) {
          return resolved;
        }
      }
      return null;
    };

    if (component.type === 'button') {
      const textValue = preferValue(component.props.text, component.props.label);
      if (textValue) {
        return `${typeName}: "${textValue}"`;
      }
    }

    if (component.type === 'text') {
      const contentValue = preferValue(component.props.content, component.props.text);
      if (contentValue) {
        const truncated = contentValue.length > 20 ? `${contentValue.slice(0, 20)}…` : contentValue;
        return `${typeName}: "${truncated}"`;
      }
    }

    if (component.type === 'input') {
      const placeholderValue = preferValue(component.props.placeholder, component.props.label);
      if (placeholderValue) {
        return `${typeName}: ${placeholderValue}`;
      }
    }

    if (component.type === 'image') {
      const descriptor = preferValue(component.props.alt, component.props.caption, component.props.src);
      if (descriptor) {
        return `${typeName}: ${descriptor}`;
      }
    }

    const titleValue = preferValue(component.props.title, component.props.name, component.props.id);
    if (titleValue) {
      return `${typeName}: ${titleValue}`;
    }

    return typeName;
  }, []);

  const selectionPath = useMemo(() => {
    if (!selectedComponent) {
      return [];
    }

    const path = [];
    let current = selectedComponent;

    while (current) {
      path.unshift(current);
      if (!current.parentId) {
        break;
      }
      current = componentsMap.get(current.parentId);
    }

    return path;
  }, [componentsMap, selectedComponent]);

  const exportLayout = useCallback(() => {
    try {
      const exported = serializeScreenDocument(components, {
        screenId,
        screenName: currentScreen?.name || 'Screen'
      });

      exported.document = {
        ...exported.document,
        exportedAt: new Date().toISOString()
      };

      const variableDefinitions = variablesList
        .map((variableName) => {
          const variable = variablesRef.current?.[variableName];
          if (!variable) {
            return null;
          }

          return {
            name: variableName,
            value: variable.value,
            type: variable.type,
            source: variable.source,
            description: variable.description || ''
          };
        })
        .filter(Boolean);

      if (variableDefinitions.length) {
        exported.variables = variableDefinitions;
      }

      const jsonString = JSON.stringify(exported, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const fileName = `${(currentScreen?.name || 'screen')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')}-screen.json`;

      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Layout exported successfully!');
    } catch (error) {
      console.error('Failed to export layout', error);
      toast.error('Failed to export layout');
    }
  }, [components, currentScreen?.name, screenId, variablesList]);

  const exportProductGraph = useCallback(() => {
    try {
      const exported = serializeProductGraph(graphData, {
        product: currentProduct,
        productId,
        screens,
        variables: variablesRef.current,
        variablesOrder
      });

      exported.document = {
        ...exported.document,
        exportedAt: new Date().toISOString()
      };

      const jsonString = JSON.stringify(exported, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const baseName = `${(currentProduct?.name || productId || 'product').toString().trim() || 'product'}`;
      const fileName = `${baseName
        .toLowerCase()
        .replace(/\s+/g, '-')}-graph.json`;

      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Product graph exported successfully!');
    } catch (error) {
      console.error('Failed to export product graph', error);
      toast.error('Failed to export product graph');
    }
  }, [currentProduct, graphData, productId, screens, variablesOrder]);

  // Component Management
  const handleDragStart = useCallback((e, component) => {
    e.dataTransfer.setData('component', JSON.stringify(component));
  }, []);

  const handleDropIndicatorClear = useCallback(() => {
    setDropIndicator(null);
  }, []);

  const handleDropIndicatorUpdate = useCallback((event) => {
    if (previewMode) {
      return;
    }

    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }

    const droppableElement = event.target.closest('[data-droppable-id]') || canvasRef.current;

    if (!droppableElement) {
      setDropIndicator(null);
      return;
    }

    const rawParentId = droppableElement.dataset?.droppableId || null;
    const parentType = droppableElement.dataset?.droppableType || null;
    let parentId = rawParentId === 'root' ? null : rawParentId;

    if (!parentType) {
      setDropIndicator(null);
      return;
    }

    const screenRoot = components.find((component) => !component.parentId && component.type === 'screen');
    const bodySection = screenRoot
      ? components.find((component) => component.parentId === screenRoot.id && component.props?.section === 'body')
      : null;

    let resolvedParentType = parentType;
    let resolvedElement = droppableElement;

    if (parentType === 'root' && bodySection) {
      parentId = bodySection.id;
      resolvedParentType = 'container';
      const bodyElement = document.querySelector(`[data-droppable-id="${bodySection.id}"]`);
      if (bodyElement instanceof HTMLElement) {
        resolvedElement = bodyElement;
      }
    }

    const existingComponentId = (() => {
      try {
        return event.dataTransfer?.getData('existingComponentId') || null;
      } catch {
        return null;
      }
    })();

    if (resolvedParentType === 'column' || resolvedParentType === 'row' || resolvedParentType === 'list') {
      const insertionIndex = calculateInsertionIndex(
        event,
        resolvedElement,
        resolvedParentType,
        existingComponentId
      );

      setDropIndicator({
        parentId: parentId ?? rawParentId,
        index: insertionIndex,
        orientation: resolvedParentType === 'row' ? 'vertical' : 'horizontal'
      });
      return;
    }

    if (resolvedParentType === 'container' || resolvedParentType === 'root') {
      setDropIndicator({
        parentId: parentId ?? null,
        index: null,
        orientation: 'overlay'
      });
      return;
    }

    setDropIndicator(null);
  }, [previewMode, canvasRef, components]);

  const handleCanvasDrop = useCallback((e) => {
    e.preventDefault();
    handleDropIndicatorClear();

    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) {
      return;
    }

    const droppableElement = e.target.closest('[data-droppable-id]') || canvasRef.current;
    const rawParentId = droppableElement?.dataset?.droppableId || null;
    const parentTypeAttr = droppableElement?.dataset?.droppableType || null;
    const initialParentId = rawParentId === 'root' ? null : rawParentId;

    const existingComponentId = e.dataTransfer.getData('existingComponentId');
    const paletteRaw = e.dataTransfer.getData('component');

    const screenRoot = components.find((component) => !component.parentId && component.type === 'screen');
    const bodySection = screenRoot
      ? components.find((component) => component.parentId === screenRoot.id && component.props?.section === 'body')
      : null;

    let resolvedParentType = parentTypeAttr;
    let resolvedParentId = initialParentId;
    let resolvedElement = droppableElement;

    if ((!resolvedParentType || resolvedParentType === 'root' || resolvedParentType === 'screen') && bodySection) {
      resolvedParentType = 'container';
      resolvedParentId = bodySection.id;
      const bodyElement = document.querySelector(`[data-droppable-id="${bodySection.id}"]`);
      if (bodyElement instanceof HTMLElement) {
        resolvedElement = bodyElement;
      }
    }

    const computeRelativePosition = (element, type, parentIdRef) => {
      if (type === 'container' && element) {
        const containerRect = element.getBoundingClientRect();
        const computed = window.getComputedStyle(element);
        const paddingLeft = parseFloat(computed.paddingLeft) || 0;
        const paddingTop = parseFloat(computed.paddingTop) || 0;

        return {
          x: Math.max(0, e.clientX - containerRect.left - paddingLeft),
          y: Math.max(0, e.clientY - containerRect.top - paddingTop)
        };
      }

      if ((!parentIdRef || type === 'root') && canvasRect) {
        let x = e.clientX - canvasRect.left - 16;
        let y = e.clientY - canvasRect.top - 16;
        x = Math.max(0, Math.min(x, canvasRect.width - 132));
        y = Math.max(0, Math.min(y, canvasRect.height - 82));
        return { x, y };
      }

      return null;
    };

    const insertionIndex = calculateInsertionIndex(
      e,
      resolvedElement,
      resolvedParentType,
      existingComponentId || null
    );
    const dropPosition = computeRelativePosition(resolvedElement, resolvedParentType, resolvedParentId);

    if (existingComponentId) {
      let movedComponent = null;

      setComponents((prev) => {
        const working = prev.map((component) => ({
          ...component,
          children: component.children ? [...component.children] : []
        }));
        const lookup = new Map(working.map((component) => [component.id, component]));
        const draggedIndex = working.findIndex((component) => component.id === existingComponentId);

        if (draggedIndex === -1) {
          return prev;
        }

        const draggedComponent = { ...working[draggedIndex] };
        const oldParentId = draggedComponent.parentId;
        const targetParent = resolvedParentId ? lookup.get(resolvedParentId) : null;

        if (resolvedParentId && !targetParent) {
          return prev;
        }

        if (resolvedParentId && targetParent && !['container', 'column', 'row', 'list'].includes(targetParent.type)) {
          return prev;
        }

        const isDroppingIntoSelfOrDescendant = (() => {
          if (!resolvedParentId) {
            return false;
          }
          if (resolvedParentId === draggedComponent.id) {
            return true;
          }

          const walk = (componentId) => {
            const node = lookup.get(componentId);
            if (!node || !node.children || node.children.length === 0) {
              return false;
            }
            if (node.children.includes(resolvedParentId)) {
              return true;
            }
            return node.children.some(walk);
          };

          return walk(draggedComponent.id);
        })();

        if (isDroppingIntoSelfOrDescendant) {
          return prev;
        }

        if (oldParentId) {
          const oldParentIndex = working.findIndex((component) => component.id === oldParentId);
          if (oldParentIndex !== -1) {
            const oldParent = { ...working[oldParentIndex] };
            oldParent.children = (oldParent.children || []).filter((id) => id !== existingComponentId);
            working[oldParentIndex] = oldParent;
          }
        }

        if (resolvedParentId) {
          const parentIndex = working.findIndex((component) => component.id === resolvedParentId);
          if (parentIndex === -1) {
            return prev;
          }
          const parentComponent = { ...working[parentIndex] };
          const filteredChildren = (parentComponent.children || []).filter((id) => id !== existingComponentId);
          const insertAt = Math.min(Math.max(insertionIndex, 0), filteredChildren.length);
          parentComponent.children = [
            ...filteredChildren.slice(0, insertAt),
            existingComponentId,
            ...filteredChildren.slice(insertAt)
          ];
          working[parentIndex] = parentComponent;
        }

        draggedComponent.parentId = resolvedParentId;
        if (dropPosition) {
          draggedComponent.position = dropPosition;
        } else if (resolvedParentId) {
          draggedComponent.position = { x: 0, y: 0 };
        }

        working[draggedIndex] = draggedComponent;
        movedComponent = draggedComponent;

        return working;
      });

      if (movedComponent) {
        setSelectedComponent(movedComponent);
        toast.success('Component moved!');
      }
      return;
    }

    if (!paletteRaw) {
      return;
    }

    let componentData;
    try {
      componentData = JSON.parse(paletteRaw);
    } catch (error) {
      console.warn('Failed to parse component data from drag payload', error);
      return;
    }

    const parentComponent = resolvedParentId ? components.find((component) => component.id === resolvedParentId) : null;
    const supportsChildren = parentComponent
      ? ['container', 'column', 'row', 'list'].includes(parentComponent.type)
      : false;
    const effectiveParentId = parentComponent && supportsChildren ? resolvedParentId : null;

    const newComponentId = `${componentData.id}-${Date.now()}`;
    const basePosition = dropPosition || { x: 0, y: 0 };
    const shouldInheritPosition = effectiveParentId && resolvedParentType === 'container' && dropPosition;
    const newComponent = {
      id: newComponentId,
      type: componentData.id,
      parentId: effectiveParentId,
      children: [],
      props: { ...componentData.defaultProps },
      position: shouldInheritPosition || !effectiveParentId ? basePosition : { x: 0, y: 0 },
      style: {},
      events: {},
    };

    setComponents((prev) => {
      const updated = effectiveParentId
        ? prev.map((component) => {
            if (component.id !== effectiveParentId) {
              return component;
            }
            const existingChildren = component.children ? [...component.children] : [];
            const insertAt = Math.min(Math.max(insertionIndex, 0), existingChildren.length);
            return {
              ...component,
              children: [
                ...existingChildren.slice(0, insertAt),
                newComponentId,
                ...existingChildren.slice(insertAt)
              ]
            };
          })
        : prev;

      return [...updated, newComponent];
    });

    setSelectedComponent(newComponent);
  toast.success(`${componentData.name} added to ${effectiveParentId ? 'container' : 'screen'}!`);
  }, [components, handleDropIndicatorClear, setSelectedComponent]);

  const handleCanvasDragOver = useCallback((event) => {
    event.preventDefault();
    handleDropIndicatorUpdate(event);
  }, [handleDropIndicatorUpdate]);

  const handleComponentDragStart = useCallback((event, component) => {
    handleDropIndicatorClear();
    event.dataTransfer.effectAllowed = 'move';
    try {
      event.dataTransfer.setData('existingComponentId', component.id);
      event.dataTransfer.setData('text/plain', component.id);
    } catch (error) {
      console.warn('Unable to set drag data', error);
    }

    setSelectedComponent(component);
  }, [handleDropIndicatorClear, setSelectedComponent]);

  const handleComponentDragEnd = useCallback(() => {
    handleDropIndicatorClear();
  }, [handleDropIndicatorClear]);

  const handleComponentSelect = useCallback((component) => {
    setSelectedComponent(component);
  }, []);

  const handleComponentDelete = useCallback((componentId) => {
    let removedIds = [];

    setComponents((prev) => {
      const map = new Map(prev.map((component) => [component.id, component]));

      const collectDescendants = (id, accumulator = []) => {
        const component = map.get(id);
        if (!component) {
          return accumulator;
        }

        accumulator.push(id);
        (component.children || []).forEach((childId) => collectDescendants(childId, accumulator));
        return accumulator;
      };

      const idsToRemove = collectDescendants(componentId, []);
      removedIds = idsToRemove;
      const removalSet = new Set(idsToRemove);

      return prev
        .map((component) => {
          if (removalSet.has(component.id)) {
            return null;
          }

          if (!component.children || component.children.length === 0) {
            return component;
          }

          const filteredChildren = component.children.filter((childId) => !removalSet.has(childId));
          if (filteredChildren.length === component.children.length) {
            return component;
          }

          return {
            ...component,
            children: filteredChildren
          };
        })
        .filter(Boolean);
    });

    if (selectedComponent && removedIds.includes(selectedComponent.id)) {
      setSelectedComponent(null);
    }

    toast.success('Component deleted!');
  }, [selectedComponent]);

  const handleComponentDuplicate = useCallback((component) => {
    let duplicatedNodes = [];
    let duplicatedRootId = null;

    setComponents((prev) => {
      const map = new Map(prev.map((item) => [item.id, item]));

      const duplicateComponentTree = (sourceComponent, parentOverride = null) => {
        const newId = `${sourceComponent.type}-${Math.random().toString(36).slice(2, 8)}-${Date.now()}`;

        const duplicated = {
          ...sourceComponent,
          id: newId,
          parentId: parentOverride,
          children: [],
          position: {
            x: (sourceComponent.position?.x || 0) + 20,
            y: (sourceComponent.position?.y || 0) + 20
          }
        };

        let nodes = [duplicated];

        (sourceComponent.children || []).forEach((childId) => {
          const childComponent = map.get(childId);
          if (!childComponent) {
            return;
          }

          const childResult = duplicateComponentTree(childComponent, newId);
          duplicated.children.push(childResult.rootId);
          nodes = [...nodes, ...childResult.nodes];
        });

        return { nodes, rootId: duplicated.id };
      };

      const result = duplicateComponentTree(component, component.parentId);
      duplicatedNodes = result.nodes;
      duplicatedRootId = result.rootId;

      const updated = prev.map((item) => {
        if (item.id !== component.parentId) {
          return item;
        }
        return {
          ...item,
          children: [...(item.children || []), result.rootId]
        };
      });

      return [...updated, ...result.nodes];
    });

    if (duplicatedRootId) {
      const rootComponent = duplicatedNodes.find((node) => node.id === duplicatedRootId);
      if (rootComponent) {
        setSelectedComponent(rootComponent);
      }
    }

    toast.success('Component duplicated!');
  }, []);

  const updateComponentProperty = useCallback((componentId, property, value) => {
    setComponents((prev) =>
      prev.map((component) => {
        if (component.id !== componentId) {
          return component;
        }

        const currentValue = component.props?.[property];
        const nextValue = applyFallbackUpdate(currentValue, value);

        return {
          ...component,
          props: {
            ...component.props,
            [property]: nextValue
          }
        };
      })
    );

    if (selectedComponent?.id === componentId) {
      const currentValue = selectedComponent.props?.[property];
      const nextValue = applyFallbackUpdate(currentValue, value);

      setSelectedComponent((prev) => ({
        ...prev,
        props: {
          ...prev.props,
          [property]: nextValue
        }
      }));
    }
  }, [selectedComponent]);

  const updateComponentStyle = useCallback((componentId, styleProperty, value) => {
    setComponents(prev => prev.map(component => 
      component.id === componentId
        ? { ...component, style: { ...component.style, [styleProperty]: value } }
        : component
    ));
    
    if (selectedComponent?.id === componentId) {
      setSelectedComponent(prev => ({
        ...prev,
        style: { ...prev.style, [styleProperty]: value }
      }));
    }
  }, [selectedComponent]);

  const applyNumericStyleValue = useCallback((componentId, styleProperty, rawValue, unit = 'px') => {
    if (!componentId) {
      return;
    }

    const stringValue = typeof rawValue === 'string' ? rawValue.trim() : String(rawValue ?? '');
    if (stringValue === '') {
      updateComponentStyle(componentId, styleProperty, '');
      return;
    }

    const numericValue = Number(stringValue);
    if (Number.isFinite(numericValue)) {
      updateComponentStyle(componentId, styleProperty, `${numericValue}${unit}`);
    } else {
      updateComponentStyle(componentId, styleProperty, stringValue);
    }
  }, [updateComponentStyle]);

  const bindComponentToVariable = useCallback(
    (componentId, property, variableName, options = {}) => {
      const normalizedVariableName = typeof variableName === 'string'
        ? variableName.trim()
        : '';

      const resolveNextValue = (currentValue) => {
        const currentFallback = getBindingFallbackValue(currentValue);
        const hasFallbackOverride = Object.prototype.hasOwnProperty.call(options, 'fallback');
        const fallback = hasFallbackOverride
          ? options.fallback
          : currentFallback !== undefined && currentFallback !== null
            ? currentFallback
            : normalizedVariableName && variables?.[normalizedVariableName]?.value !== undefined
              ? variables[normalizedVariableName].value
              : '';

        if (!normalizedVariableName) {
          return fallback ?? '';
        }

        return createBindingValue(fallback, normalizedVariableName);
      };

      setComponents((prev) =>
        prev.map((component) => {
          if (component.id !== componentId) {
            return component;
          }

          const currentValue = component.props?.[property];
          const nextValue = resolveNextValue(currentValue);

          return {
            ...component,
            props: {
              ...component.props,
              [property]: nextValue
            }
          };
        })
      );

      if (selectedComponent?.id === componentId) {
        const currentValue = selectedComponent.props?.[property];
        const nextValue = resolveNextValue(currentValue);

        setSelectedComponent((prev) => ({
          ...prev,
          props: {
            ...prev.props,
            [property]: nextValue
          }
        }));
      }

      if (options?.silent) {
        return;
      }

      if (normalizedVariableName) {
        const hasContextVariable = Boolean(variables?.[normalizedVariableName]);
        const referenceLabel = hasContextVariable
          ? `{${normalizedVariableName}}`
          : '${' + normalizedVariableName + '}';
        toast.success(`Bound ${property} to ${referenceLabel}`);
      } else {
        toast.success(`Removed binding for ${property}`);
      }
    },
    [selectedComponent, variables]
  );

  const handleAliasBindingChange = useCallback((property, rawValue) => {
    if (!selectedComponent || !listContextBinding) {
      return;
    }

    const trimmed = typeof rawValue === 'string' ? rawValue.trim() : '';
    const aliasPrefix = `${listContextBinding.alias}.`;

    if (!trimmed) {
      const currentValue = selectedComponent.props?.[property];
      const fallback = getBindingFallbackValue(currentValue);
      bindComponentToVariable(selectedComponent.id, property, '', {
        fallback,
        silent: true
      });
      return;
    }

    const normalized = trimmed.startsWith(aliasPrefix)
      ? trimmed
      : `${aliasPrefix}${trimmed}`;
    const suggestion = listContextBinding.suggestionLookup?.[normalized];
    const fallback = suggestion?.sampleValue ?? undefined;

    bindComponentToVariable(selectedComponent.id, property, normalized, {
      fallback,
      silent: true
    });
  }, [bindComponentToVariable, listContextBinding, selectedComponent]);

  const applyVariableDefinitions = useCallback((definitions = []) => {
    console.log('🔄 applyVariableDefinitions called', definitions.length, 'definitions');
    if (!Array.isArray(definitions) || definitions.length === 0) {
      setInitialVariableSnapshots({});
      return;
    }

    const order = [];
    const snapshot = {};

    definitions.forEach((definition) => {
      if (!definition?.name) {
        return;
      }

      // Normalize stored value according to inferred/declared type so that
      // empty placeholders do not become empty strings for structural types.
      const inferType = (val) => {
        if (Array.isArray(val)) return 'list';
        if (val !== null && typeof val === 'object') return 'object';
        return 'string';
      };

      const inferred = inferType(definition.value);
      let resolvedType;
      if (!definition.type) {
        resolvedType = inferred;
      } else if (definition.type === 'string' && inferred !== 'string') {
        resolvedType = inferred;
      } else {
        resolvedType = definition.type;
      }

      const normalizeEmptyByType = (val, type) => {
        const isEmpty = val === '' || val === null || val === undefined;
        if (!isEmpty) return val;
        if (type === 'list') return [];
        if (type === 'object') return {};
        return val;
      };

      const normalizedValue = normalizeEmptyByType(definition.value, resolvedType);

      snapshot[definition.name] = {
        value: normalizedValue,
        type: resolvedType || 'string',
        source: definition.source || 'manual',
        description: definition.description || ''
      };

      order.push(definition.name);
      // Use previously computed resolvedType and normalizedValue to set variable
      try {
        const existing = variablesRef.current?.[definition.name];
        const existingValue = existing && Object.prototype.hasOwnProperty.call(existing, 'value') ? existing.value : existing;
        if (!isDeepEqual(existingValue, normalizedValue)) {
          setVariable(
            definition.name,
            normalizedValue,
            snapshot[definition.name].type,
            definition.source,
            definition.description
          );
        } else if (typeof window !== 'undefined' && window.__VC_TRACE__) {
          logger.debug(`Skipping setVariable('${definition.name}') from definitions because value is unchanged`);
        }
      } catch {
        // If comparison fails, fall back to setting the variable
        setVariable(
          definition.name,
          normalizedValue,
          snapshot[definition.name].type,
          definition.source,
          definition.description
        );
      }
    });

    setInitialVariableSnapshots(snapshot);

    if (order.length > 0) {
      reorderVariables(order);
    }
  }, [reorderVariables, setVariable]);

  const saveScreen = useCallback(async () => {
    if (!screenId) {
      toast.error('Не выбран экран для сохранения');
      return;
    }

    const variableDefinitions = variablesList.map((variableName) => {
      const variable = variablesRef.current?.[variableName];
      if (!variable) {
        return null;
      }

      return {
        name: variableName,
        value: variable.value,
        type: variable.type,
        source: variable.source,
        description: variable.description || ''
      };
    }).filter(Boolean);

    const screenData = {
      id: screenId,
      name: currentScreen?.name || 'New Screen',
      components,
      variables: variablesList,
      variableDefinitions,
      graphData,
      variableSchemas
    };

    try {
      setIsSavingScreen(true);

      screenStorageRef.current = {
        ...screenStorageRef.current,
        [screenId]: screenData
      };

      // Отключено: не сохраняем в localStorage
      toast.success('Изменения экрана сохранены (только в памяти)');
    } catch (error) {
      console.error('Failed to persist screen data', error);
      toast.error('Не удалось сохранить экран');
    } finally {
      setIsSavingScreen(false);
    }
  }, [components, currentScreen, graphData, screenId, variableSchemas, variablesList]);

  const handleTestFlow = useCallback(async () => {
    try {
      await saveScreen();

      const productPayload = buildProductFromBuilder({
        productId: currentProduct?.id || productId,
        productName: currentProduct?.name,
        productDescription: currentProduct?.description,
        components,
        screens,
        graphData,
        variables: variablesRef.current,
        variableSchemas,
        currentScreen
      });

      navigate('/sandbox', {
        state: {
          product: productPayload,
          variableSchemas
        }
      });
    } catch (error) {
      console.error('Failed to prepare flow preview', error);
      toast.error('Не удалось подготовить данные для песочницы');
    }
  }, [components, currentProduct, currentScreen, graphData, navigate, productId, saveScreen, screens, variableSchemas]);

  // Group components by category for palette
  const componentsByCategory = componentPalette.reduce((acc, component) => {
    if (!acc[component.category]) acc[component.category] = [];
    acc[component.category].push(component);
    return acc;
  }, {});

  useEffect(() => {
    
  console.log('🔄 Main useEffect triggered', { screenId, screenStorageReady, initializedRef: initializedScreenRef.current });
    
    if (!screenId || !screenStorageReady) {
      if (typeof window !== 'undefined' && window.__VC_TRACE__) logger.debug('⏹️ Early return: screenId or storage not ready');
      return;
    }

    if (initializedScreenRef.current === screenId) {
      if (typeof window !== 'undefined' && window.__VC_TRACE__) logger.debug('⏹️ Early return: screen already initialized');
      return;
    }

    let stored = screenStorageRef.current?.[screenId];
    // If there's no stored screen, try to fall back to the bundled JSON configs
    if (!stored) {
      try {
        // Try lookup by id first, then by screen name
        const byId = (screenConfigs && screenConfigs.screens) ? screenConfigs.screens[screenId] : null;
        const byName = (screenConfigs && Array.isArray(screenConfigs.screensList))
          ? screenConfigs.screensList.find(s => String(s.id) === String(screenId) || s.name === currentScreen?.name)
          : null;
        const fallback = byId || byName || null;
        if (fallback) {
          // map legacy keys to expected shape
          stored = {
            id: fallback.id || screenId,
            name: fallback.name || currentScreen?.name || `Screen ${screenId}`,
            components: fallback.components || fallback.template || [],
            graphData: fallback.graphData || graphConfigs?.defaultGraph || { nodes: [], edges: [] },
            variableDefinitions: fallback.variableDefinitions || [],
            variableSchemas: fallback.variableSchemas || {}
          };
          if (typeof window !== 'undefined' && window.__VC_TRACE__) logger.debug('📦 Using bundled screen config as fallback for', screenId, stored.name);
        }
      } catch (e) {
        
        console.warn('Failed to read bundled screenConfigs.json', e);
      }
    }
    
    console.log('📦 Checking stored data for screen:', { screenId, hasStored: !!stored, storedComponents: stored?.components?.length });

      if (stored && Array.isArray(stored.components) && stored.components.length > 0) {
        if (typeof window !== 'undefined' && window.__VC_TRACE__) logger.debug('📦 Loading existing screen from storage');
      const normalized = normalizeComponents(stored.components);
      setComponents(normalized);
      setSelectedComponent(null);
      setPreviewMode(false);
      if (stored.graphData && typeof stored.graphData === 'object') {
        let graphDataToUse = stored.graphData;
        
        // Check if stored graphData has API nodes with gamesList
        const hasGamesListAPI = stored.graphData.nodes?.some(node => 
          node?.data?.actionType === 'api' && 
          node?.data?.config?.contextKey === 'gamesList'
        );
        
        // If no gamesList API node exists, add it
        if (!hasGamesListAPI) {
          if (typeof window !== 'undefined' && window.__VC_TRACE__) logger.debug('🔧 Adding missing gamesList API node to existing screen');
          
          graphDataToUse = {
            ...stored.graphData,
            nodes: [
              ...(stored.graphData.nodes || [])
              // {
              //   id: 'fetch-games',
              //   type: 'action',
              //   position: { x: 100, y: 100 },
              //   data: {
              //     label: 'Fetch Games List',
              //     actionType: 'api',
              //     config: {
              //       endpoint: 'https://www.freetogame.com/api/games?platform=pc',
              //       method: 'GET',
              //       contextKey: 'gamesList',
              //       schema: {
              //         id: 'id',
              //         title: 'title',
              //         thumbnail: 'thumbnail',
              //         genre: 'genre',
              //         platform: 'platform',
              //         release_date: 'release_date',
              //         publisher: 'publisher',
              //         short_description: 'short_description'
              //       }
              //     }
              //   }
              // }
            ]
          };
        }
        
        // Avoid calling setGraphData if the graph data is identical to prevent update loops
        if (!isDeepEqual(graphDataToUse, graphDataRef.current)) {
          setGraphData(graphDataToUse);
        } else if (typeof window !== 'undefined' && window.__VC_TRACE__) {
          logger.debug('Skipping setGraphData because graphData is unchanged');
        }
        if (typeof window !== 'undefined' && window.__VC_TRACE__) logger.debug('📦 Loaded/updated graphData:', graphDataToUse);
        if (typeof window !== 'undefined' && window.__VC_TRACE__) logger.debug('📦 GraphData nodes detail:', graphDataToUse.nodes?.map(n => ({
          id: n.id,
          type: n.type, 
          actionType: n?.data?.actionType,
          contextKey: n?.data?.config?.contextKey
        })));
      } else {
        // Don't clear graphData here - it might have been set by template creation below
        if (typeof window !== 'undefined' && window.__VC_TRACE__) logger.debug('📦 No stored graphData, keeping existing or letting template creation handle it');
      }
      if (stored.variableSchemas && typeof stored.variableSchemas === 'object') {
        setVariableSchemas(stored.variableSchemas);
      } else {
        setVariableSchemas({});
      }
      applyVariableDefinitions(stored.variableDefinitions || []);
      // After restoring variables and graph data, execute API actions that
      // populate variables so lists (e.g. gamesList) have data immediately
      // when opening the screen builder.
      (async () => {
        try {
          const nodes = (stored.graphData && Array.isArray(stored.graphData.nodes)) ? stored.graphData.nodes : [];
          const apiNodes = nodes.filter((n) => n?.data?.actionType === 'api' && n?.data?.config?.endpoint);
          for (const node of apiNodes) {
            const cfg = node.data.config || {};
            const contextKey = cfg.contextKey || cfg.variableName || cfg.contextKeyName;
            if (!contextKey) continue;

            try {
              const method = (cfg.method || 'GET').toUpperCase();
              const headers = cfg.headers || {};
              const body = cfg.body ? (typeof cfg.body === 'object' ? JSON.stringify(cfg.body) : String(cfg.body)) : undefined;

              logger.info('[API CALL] node:', node.id, 'endpoint:', cfg.endpoint, 'method:', method, 'headers:', headers, 'body:', body);
              const resp = await fetch(cfg.endpoint, { method, headers, body });
              logger.debug('[API RESPONSE]', node.id, 'status:', resp.status, resp.statusText);
              if (!resp.ok) {
                logger.warn('[API ERROR]', node.id, 'Bad response', resp.status, resp.statusText);
                continue;
              }
              const json = await resp.json();
              logger.info('[API RESULT]', node.id, json);
              // store result into virtual context under contextKey
              setVariable(contextKey, json, undefined, 'action', `Loaded by node ${node.id}`);
            } catch (innerErr) {
              logger.error('[API EXCEPTION]', node.id, innerErr);
              // ignore individual action errors
              if (typeof window !== 'undefined' && window.__VC_TRACE__) logger.warn('api node failed', node.id, innerErr);
            }
          }

          // If some variables remain empty after running API nodes, try to
          // hydrate them from any endpoint metadata available in stored.variableSchemas.
          // This helps when bindings exist but the corresponding action node
          // wasn't configured with a contextKey or failed earlier.
          try {
            const schemaMap = stored.variableSchemas || {};
              for (const [varName, schemaMeta] of Object.entries(schemaMap)) {
              if (!varName || !schemaMeta) continue;
              const existing = variablesRef.current?.[varName];
              const isEmptyVar = !existing || existing.value === '' || existing.value === null || (Array.isArray(existing.value) && existing.value.length === 0);
              if (!isEmptyVar) continue;
              const endpoint = schemaMeta.endpoint || schemaMeta.url || schemaMeta.path;
              if (!endpoint) continue;
              try {
                logger.info('[API CALL][hydrate]', endpoint);
                const resp2 = await fetch(endpoint);
                logger.debug('[API RESPONSE][hydrate]', endpoint, 'status:', resp2.status, resp2.statusText);
                if (!resp2.ok) {
                  logger.warn('[API ERROR][hydrate]', endpoint, resp2.status, resp2.statusText);
                  continue;
                }
                const json2 = await resp2.json();
                logger.info('[API RESULT][hydrate]', endpoint, json2);
                try {
                  const existing2 = variablesRef.current?.[varName];
                  const existingValue2 = existing2 && Object.prototype.hasOwnProperty.call(existing2, 'value') ? existing2.value : existing2;
                  if (!isDeepEqual(existingValue2, json2)) {
                    setVariable(varName, json2, undefined, 'action', `Hydrated from schema endpoint for ${varName}`);
                  } else if (typeof window !== 'undefined' && window.__VC_TRACE__) {
                    logger.debug(`Skipping setVariable('${varName}') from schema hydration because value is unchanged`);
                  }
                } catch {
                  setVariable(varName, json2, undefined, 'action', `Hydrated from schema endpoint for ${varName}`);
                }
              } catch {
                // ignore per-variable fetch errors
                if (typeof window !== 'undefined' && window.__VC_TRACE__) logger.debug('hydrate variable from schema failed', varName);
              }
            }
          } catch {
            if (typeof window !== 'undefined' && window.__VC_TRACE__) logger.error('Failed to hydrate variables from schemas');
          }
        } catch (err) {
          if (typeof window !== 'undefined' && window.__VC_TRACE__) logger.error('Failed to hydrate API actions', err);
        }
      })();
      initializedScreenRef.current = screenId;
      return;
    }

    
    console.log('🎨 Creating new template screen');
    // Используем JSON-файлы для шаблона экрана и graphData
    const template = normalizeComponents(defaultScreenTemplate.components);
    setComponents(template);
    setSelectedComponent(null);
    setPreviewMode(false);
    applyVariableDefinitions([]);
    setGraphData(defaultGraphTemplate);
    setVariableSchemas({});
    console.log('📝 setGraphData called, next useEffect should trigger with:', defaultGraphTemplate);
    initializedScreenRef.current = screenId;
  }, [applyVariableDefinitions, currentScreen?.name, screenId, screenStorageReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // Execute API nodes from graphData whenever graph data changes
  useEffect(() => {
    console.log('🔄 API useEffect triggered');
    if (typeof window !== 'undefined' && window.__VC_TRACE__) logger.debug('🔄 useEffect for API nodes triggered. GraphData:', graphData);
    if (typeof window !== 'undefined' && window.__VC_TRACE__) logger.debug('🔄 GraphData nodes:', graphData?.nodes?.length, 'nodes');
    if (typeof window !== 'undefined' && window.__VC_TRACE__) logger.debug('🔄 GraphData nodes detail:', graphData?.nodes?.map(n => ({
      id: n?.id,
      type: n?.type,
      actionType: n?.data?.actionType,
      hasEndpoint: !!n?.data?.config?.endpoint,
      contextKey: n?.data?.config?.contextKey
    })));
    
    if (!graphData?.nodes?.length) {
      if (typeof window !== 'undefined' && window.__VC_TRACE__) logger.debug('❌ No nodes in graphData, skipping API execution. Nodes length:', graphData?.nodes?.length);
      return;
    }
    
    // Additional check to ensure we have actual API nodes
    const hasApiNodes = graphData.nodes.some(n => n?.data?.actionType === 'api' && n?.data?.config?.endpoint);
    if (!hasApiNodes) {
      if (typeof window !== 'undefined' && window.__VC_TRACE__) logger.debug('⚠️  No API nodes with endpoints found in graphData');
      return;
    }

    const executeApiNodes = async () => {
      try {
    const apiNodes = graphData.nodes.filter((n) => n?.data?.actionType === 'api' && n?.data?.config?.endpoint);
    if (typeof window !== 'undefined' && window.__VC_TRACE__) logger.debug('🎯 Found API nodes:', apiNodes.length, apiNodes);
        
        if (apiNodes.length === 0) {
          if (typeof window !== 'undefined' && window.__VC_TRACE__) console.log('⚠️  No API nodes found to execute');
          return;
        }
        
        for (const node of apiNodes) {
          const cfg = node.data.config || {};
          const contextKey = cfg.contextKey || cfg.variableName || cfg.contextKeyName;
          if (typeof window !== 'undefined' && window.__VC_TRACE__) logger.debug(`🔍 Processing API node ${node.id}:`, { cfg, contextKey });
          
          if (!contextKey) {
            if (typeof window !== 'undefined' && window.__VC_TRACE__) console.warn(`❌ No contextKey found for node ${node.id}`);
            continue;
          }

          try {
            const method = (cfg.method || 'GET').toUpperCase();
            const headers = cfg.headers || {};
            const body = cfg.body ? (typeof cfg.body === 'object' ? JSON.stringify(cfg.body) : String(cfg.body)) : undefined;

            if (typeof window !== 'undefined' && window.__VC_TRACE__) logger.debug(`📡 Fetching from: ${cfg.endpoint}`);

            const resp = await fetch(`https://cors-anywhere.herokuapp.com/${cfg.endpoint}`, { method, headers, body });
            if (!resp.ok) {
              if (typeof window !== 'undefined' && window.__VC_TRACE__) logger.warn(`❌ API node ${node.id} failed: ${resp.status} ${resp.statusText}`);
              continue;
            }
            
            const json = await resp.json();
            const dataType = Array.isArray(json) ? 'list' : (json && typeof json === 'object') ? 'object' : 'string';
            
            if (typeof window !== 'undefined' && window.__VC_TRACE__) logger.debug(`✅ API response received:`, { 
              nodeId: node.id, 
              contextKey, 
              dataType, 
              dataLength: Array.isArray(json) ? json.length : 'N/A',
              firstItem: Array.isArray(json) ? json[0] : json 
            });
            
            // Prevent redundant updates: if the variable already contains the same value, skip setVariable
            try {
              const existing = variablesRef.current?.[contextKey];
              const existingValue = existing && Object.prototype.hasOwnProperty.call(existing, 'value') ? existing.value : existing;
              if (!isDeepEqual(existingValue, json)) {
                setVariable(contextKey, json, dataType, 'action', `Loaded by API node ${node.id}`);
              } else if (typeof window !== 'undefined' && window.__VC_TRACE__) {
                logger.debug(`Skipping setVariable for '${contextKey}' because value is unchanged`);
              }
            } catch {
              // If comparison fails for any reason, fall back to setting the variable
              setVariable(contextKey, json, dataType, 'action', `Loaded by API node ${node.id}`);
            }
            
            // Enable detailed tracing for gamesList debugging
            if (contextKey === 'gamesList') {
              window.__VC_TRACE__ = true;
            }
            
            if (typeof window !== 'undefined' && window.__VC_TRACE__) logger.debug(`🎉 Successfully called setVariable('${contextKey}', data, '${dataType}', 'action')`);
            
            // Verify the variable was actually set in the context
            setTimeout(() => {
              if (typeof window !== 'undefined' && window.__VC_TRACE__) logger.debug(`🔍 Checking if ${contextKey} was set in variables:`, variablesRef.current?.[contextKey]);
              
              // Disable tracing after check
              if (contextKey === 'gamesList') {
                window.__VC_TRACE__ = false;
              }
            }, 100);
            } catch (innerErr) {
              if (typeof window !== 'undefined' && window.__VC_TRACE__) logger.warn('API node execution failed', node.id, innerErr);
          }
        }
      } catch (err) {
  if (typeof window !== 'undefined' && window.__VC_TRACE__) logger.error('Failed to execute API nodes from graph', err);
      }
    };

    // Execute API nodes immediately (no timeout) once graphData changes
    void executeApiNodes();

    return () => {
      // no-op cleanup
    };
  }, [graphData]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    console.log('🔄 Keydown useEffect triggered');
    const handleKeyDown = (event) => {
      if (previewMode) {
        return;
      }

      const target = event.target;
      if (target instanceof HTMLElement) {
        const tagName = target.tagName;
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tagName) || target.isContentEditable) {
          return;
        }
      }

      if (event.key === 'Escape') {
        if (selectedComponent) {
          event.preventDefault();
          setSelectedComponent(null);
        }
        return;
      }

      if (!selectedComponent) {
        return;
      }

      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        handleComponentDelete(selectedComponent.id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleComponentDelete, previewMode, selectedComponent, setSelectedComponent]);

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="screen-builder">
        {/* Header */}
        <div className="builder-header">
          <div className="header-left">
            <div className="breadcrumb">
              <Link to="/products">Products</Link>
              <ArrowRight size={16} />
              <Link to={`/products/${productId}`}>Product</Link>
              <ArrowRight size={16} />
              <span>UI Builder</span>
            </div>
            <h1>{currentScreen?.name || 'Screen'} - UI Builder</h1>
          </div>

          <div className="header-actions">
            <button 
              className="btn btn-ghost"
              onClick={() => setPreviewMode(!previewMode)}
            >
              <Eye size={18} />
              {previewMode ? 'Edit' : 'Preview'}
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => { void handleTestFlow(); }}
            >
              <PlayCircle size={18} />
              Test Flow
            </button>
            <button 
              className="btn btn-secondary"
              onClick={exportLayout}
            >
              <Download size={18} />
              Export
            </button>
            <button 
              className="btn btn-secondary"
              onClick={exportProductGraph}
            >
              <Database size={18} />
              Export Graph
            </button>
            <button
              className="btn btn-primary"
              onClick={() => { void saveScreen(); }}
              disabled={isSavingScreen}
            >
              <Save size={18} />
              {isSavingScreen ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>

        <div className="builder-content">
          {/* Component Palette */}
          {!previewMode && (
            <div className="component-palette">
              <div className="palette-header">
                <h3>Components</h3>
              </div>

              <div className="palette-content">
                {Object.entries(componentsByCategory).map(([category, components]) => (
                  <div key={category} className="component-category">
                    <h4>{category}</h4>
                    <div className="component-list">
                      {components.map(component => (
                        <DraggableComponent
                          key={component.id}
                          component={component}
                          onDragStart={handleDragStart}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Canvas */}
          <div className="canvas-container">
            <div
              ref={canvasRef}
              className={`canvas ${previewMode ? 'preview-mode' : ''} ${!previewMode && dropIndicator && dropIndicator.parentId === null && dropIndicator.orientation === 'overlay' ? 'drop-target-active' : ''}`}
              {...(!previewMode
                ? {
                    'data-droppable-id': 'root',
                    'data-droppable-type': 'root',
                    onDrop: handleCanvasDrop,
                    onDragOver: handleCanvasDragOver,
                    onDragLeave: (event) => {
                      if (!event.currentTarget.contains(event.relatedTarget)) {
                        handleDropIndicatorClear();
                      }
                    }
                  }
                : {})}
              onClick={() => setSelectedComponent(null)}
            >
              {previewMode ? (
                <div className="canvas-preview">
                  <SandboxScreenRenderer screen={previewScreen} context={previewContext} />
                </div>
              ) : (
                <>
                  {rootComponents.length === 0 && (
                    <div className="canvas-empty">
                      <div className="empty-content">
                        <Square size={48} />
                        <h3>Drag components here</h3>
                        <p>Start building your screen by dragging components from the left panel</p>
                      </div>
                    </div>
                  )}

                  {rootComponents.map((component) => (
                    <CanvasComponent
                      key={component.id}
                      component={component}
                      componentsMap={componentsMap}
                      selectedId={selectedComponent?.id}
                      previewMode={previewMode}
                      onClick={handleComponentSelect}
                      onDelete={handleComponentDelete}
                      onDuplicate={handleComponentDuplicate}
                      parent={null}
                      onComponentDragStart={handleComponentDragStart}
                      onComponentDragEnd={handleComponentDragEnd}
                      dropIndicator={dropIndicator}
                      onDropIndicatorUpdate={handleDropIndicatorUpdate}
                      onDropIndicatorClear={handleDropIndicatorClear}
                      variables={mergedVariableMap}
                      context={previewContext}
                    />
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Properties Panel */}
          {!previewMode && (
            <div className="properties-panel">
              <div className="panel-header">
                <h3>Properties</h3>
              </div>

              {selectedComponent ? (
                <div className="component-properties">
                  {selectionPath.length > 0 && (
                    <div className="selection-breadcrumb">
                      <span className="breadcrumb-label">Hierarchy</span>
                      <div className="breadcrumb-trail">
                        {selectionPath.map((pathComponent, index) => {
                          const isCurrent = pathComponent.id === selectedComponent.id;
                          return (
                            <div key={pathComponent.id} className="breadcrumb-node">
                              <button
                                type="button"
                                className={`breadcrumb-chip ${isCurrent ? 'active' : ''}`}
                                onClick={() => {
                                  if (isCurrent) {
                                    return;
                                  }
                                  const target = componentsMap.get(pathComponent.id);
                                  if (target) {
                                    handleComponentSelect(target);
                                  }
                                }}
                                disabled={isCurrent}
                              >
                                {getComponentDisplayName(pathComponent)}
                              </button>
                              {index < selectionPath.length - 1 && (
                                <ChevronRight
                                  className="breadcrumb-separator"
                                  size={14}
                                  aria-hidden="true"
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="property-section">
                    <h4>{selectedComponent.type} Properties</h4>
                    
                    {/* Component-specific properties */}
                    {selectedComponent.type === 'button' && (
                      <>
                        <div className="property-group">
                          <label>Text</label>
                          <input
                            type="text"
                            value={resolvePropValue(selectedComponent.props, 'text', '')}
                            onChange={(e) => updateComponentProperty(
                              selectedComponent.id, 
                              'text', 
                              e.target.value
                            )}
                          />
                        </div>
                        <div className="property-group">
                          <label>Variant</label>
                          <select
                            value={resolvePropValue(selectedComponent.props, 'variant', 'primary')}
                            onChange={(e) => updateComponentProperty(
                              selectedComponent.id, 
                              'variant', 
                              e.target.value
                            )}
                          >
                            <option value="primary">Primary</option>
                            <option value="secondary">Secondary</option>
                            <option value="outline">Outline</option>
                          </select>
                        </div>
                        <div className="property-group">
                          <label>Size</label>
                          <select
                            value={resolvePropValue(selectedComponent.props, 'size', 'medium')}
                            onChange={(e) => updateComponentProperty(
                              selectedComponent.id,
                              'size',
                              e.target.value
                            )}
                          >
                            <option value="small">Small</option>
                            <option value="medium">Medium</option>
                            <option value="large">Large</option>
                          </select>
                        </div>
                      </>
                    )}

                    {selectedComponent.type === 'text' && (
                      <>
                        <div className="property-group">
                          <label>Content</label>
                          <textarea
                            value={resolvePropValue(selectedComponent.props, 'content', '')}
                            onChange={(e) => updateComponentProperty(
                              selectedComponent.id, 
                              'content', 
                              e.target.value
                            )}
                            rows={3}
                          />
                        </div>
                        <div className="property-group">
                          <label>Variant</label>
                          <select
                            value={resolvePropValue(selectedComponent.props, 'variant', 'body')}
                            onChange={(e) => updateComponentProperty(
                              selectedComponent.id, 
                              'variant', 
                              e.target.value
                            )}
                          >
                            <option value="heading">Heading</option>
                            <option value="subheading">Subheading</option>
                            <option value="body">Body</option>
                            <option value="caption">Caption</option>
                          </select>
                        </div>
                      </>
                    )}

                    {selectedComponent.type === 'input' && (
                      <>
                        <div className="property-group">
                          <label>Placeholder</label>
                          <input
                            type="text"
                            value={resolvePropValue(selectedComponent.props, 'placeholder', '')}
                            onChange={(e) => updateComponentProperty(
                              selectedComponent.id, 
                              'placeholder', 
                              e.target.value
                            )}
                          />
                        </div>
                        <div className="property-group">
                          <label>Type</label>
                          <select
                            value={resolvePropValue(selectedComponent.props, 'type', 'text')}
                            onChange={(e) => updateComponentProperty(
                              selectedComponent.id, 
                              'type', 
                              e.target.value
                            )}
                          >
                            <option value="text">Text</option>
                            <option value="email">Email</option>
                            <option value="password">Password</option>
                            <option value="number">Number</option>
                          </select>
                        </div>
                        <div className="property-group">
                          <label>
                            <input
                              type="checkbox"
                              checked={Boolean(resolvePropValue(selectedComponent.props, 'required', false))}
                              onChange={(e) => updateComponentProperty(
                                selectedComponent.id, 
                                'required', 
                                e.target.checked
                              )}
                            />
                            Required
                          </label>
                        </div>
                      </>
                    )}

                    {selectedComponent.type === 'image' && (
                      <>
                        <div className="property-group">
                          <label>Image URL</label>
                          <input
                            type="text"
                            value={resolvePropValue(selectedComponent.props, 'src', '')}
                            onChange={(e) => updateComponentProperty(
                              selectedComponent.id,
                              'src',
                              e.target.value
                            )}
                            placeholder="https://..."
                          />
                        </div>
                        <div className="property-group">
                          <label>Alt Text</label>
                          <input
                            type="text"
                            value={resolvePropValue(selectedComponent.props, 'alt', '')}
                            onChange={(e) => updateComponentProperty(
                              selectedComponent.id,
                              'alt',
                              e.target.value
                            )}
                            placeholder="Describe the image"
                          />
                        </div>
                      </>
                    )}

                    {selectedComponent.type === 'list' && (() => {
                      const normalizeListValue = (value) => {
                        if (Array.isArray(value)) {
                          return value;
                        }
                        if (typeof value === 'string') {
                          return value
                            .split(/\r?\n/)
                            .map((line) => line.trim())
                            .filter((line) => line.length > 0);
                        }
                        if (typeof value === 'number' && Number.isFinite(value)) {
                          const count = Math.max(0, Math.floor(value));
                          return Array.from({ length: count }, (_, index) => String(index + 1));
                        }
                        if (value && typeof value === 'object') {
                          return Object.values(value);
                        }
                        return [];
                      };

                      const itemsBindingName = getBindingVariableName(selectedComponent.props?.items);
                      const fallbackSource = getBindingFallbackValue(selectedComponent.props?.items);
                      const initialItems =
                        fallbackSource !== undefined && fallbackSource !== null
                          ? normalizeListValue(fallbackSource)
                          : normalizeListValue(selectedComponent.props?.items);
                      const textareaValue = initialItems.map((item) => String(item)).join('\n');
                      const aliasValue = selectedComponent.props?.itemAlias ?? 'item';
                      const boundVariable = itemsBindingName ? variables[itemsBindingName] : null;
                      const variableValue = boundVariable?.value;
                      const variableLooksIterable = Array.isArray(variableValue)
                        || typeof variableValue === 'string'
                        || (typeof variableValue === 'number' && Number.isFinite(variableValue));
                      const bindingExampleAlias = aliasValue && aliasValue.trim().length > 0
                        ? aliasValue.trim()
                        : 'item';
                      const bindingExample = `\${${bindingExampleAlias}.title}`;
                      const displayPathValue = typeof selectedComponent.props?.displayPath === 'string'
                        ? selectedComponent.props.displayPath
                        : '';
                      const displayPathSuggestions = (() => {
                        const map = new Map();
                        const schemaMeta = variableSchemas?.[itemsBindingName]?.schema;

                        if (Array.isArray(schemaMeta)) {
                          schemaMeta.slice(0, 4).forEach((descriptor) => {
                            if (descriptor && typeof descriptor === 'object') {
                              collectSuggestionsFromSchema(descriptor, '', map);
                            }
                          });
                        } else if (schemaMeta && typeof schemaMeta === 'object') {
                          collectSuggestionsFromSchema(schemaMeta, '', map);
                        }

                        const sampleCandidates = [];

                        if (Array.isArray(variableValue) && variableValue.length > 0) {
                          sampleCandidates.push(...variableValue.slice(0, 6));
                        } else if (variableValue && typeof variableValue === 'object') {
                          sampleCandidates.push(variableValue);
                        }

                        if (sampleCandidates.length === 0) {
                          if (Array.isArray(initialItems) && initialItems.length > 0) {
                            sampleCandidates.push(...initialItems.slice(0, 6));
                          } else if (fallbackSource && typeof fallbackSource === 'object') {
                            sampleCandidates.push(fallbackSource);
                          } else if (Array.isArray(selectedComponent.props?.items)) {
                            sampleCandidates.push(...selectedComponent.props.items.slice(0, 6));
                          }
                        }

                        if (sampleCandidates.length > 0) {
                          collectSuggestionsFromSamples(sampleCandidates, map);
                        }

                        return Array.from(map.values())
                          .filter((entry) => entry.path && entry.path.length > 0)
                          .sort((a, b) => a.path.localeCompare(b.path))
                          .slice(0, 60);
                      })();
                      const displayPathDatalistId = `list-display-field-${selectedComponent.id}`;
                      const displayPathPlaceholder = displayPathSuggestions[0]?.path || 'title';

                      return (
                        <>
                          <div className="property-group">
                            <label>Variant</label>
                            <select
                              value={resolvePropValue(selectedComponent.props, 'variant', 'unordered')}
                              onChange={(e) => updateComponentProperty(
                                selectedComponent.id,
                                'variant',
                                e.target.value
                              )}
                            >
                              <option value="unordered">Unordered</option>
                              <option value="ordered">Ordered</option>
                            </select>
                          </div>

                          <div className="property-group">
                            <label>Items source</label>
                            <select
                              value={itemsBindingName}
                              onChange={(e) => bindComponentToVariable(
                                selectedComponent.id,
                                'items',
                                e.target.value
                              )}
                            >
                              <option value="">Manual (fallback)</option>
                              {variablesList.map((variableName) => (
                                <option key={variableName} value={variableName}>
                                  {variableName}
                                </option>
                              ))}
                            </select>
                          </div>

                          {itemsBindingName && !variableLooksIterable && (
                            <p className="property-hint warning">
                              Selected variable is not a list. Fallback items will be shown.
                            </p>
                          )}

                          <div className="property-group">
                            <label>Item alias</label>
                            <input
                              type="text"
                              value={aliasValue}
                              onChange={(e) => updateComponentProperty(
                                selectedComponent.id,
                                'itemAlias',
                                e.target.value
                              )}
                              placeholder="item"
                            />
                            <p className="property-hint">
                              Use in bindings, e.g. <code>{bindingExample}</code>
                            </p>
                          </div>

                          <div className="property-group">
                            <label>Display field</label>
                            <input
                              type="text"
                              list={displayPathSuggestions.length > 0 ? displayPathDatalistId : undefined}
                              value={displayPathValue}
                              onChange={(e) => updateComponentProperty(
                                selectedComponent.id,
                                'displayPath',
                                e.target.value
                              )}
                              placeholder={displayPathPlaceholder}
                            />
                            {displayPathSuggestions.length > 0 && (
                              <datalist id={displayPathDatalistId}>
                                {displayPathSuggestions.map((suggestion) => (
                                  <option
                                    key={suggestion.path}
                                    value={suggestion.path}
                                    label={suggestion.sampleValue
                                      ? `${suggestion.path} – ${suggestion.sampleValue}`
                                      : suggestion.path}
                                  />
                                ))}
                              </datalist>
                            )}
                            <p className="property-hint">
                              Relative to each list item, e.g. <code>title</code> or <code>details.name</code>.
                            </p>
                          </div>

                          <div className="property-group">
                            <label>Items (one per line)</label>
                            <textarea
                              rows={4}
                              value={textareaValue}
                              onChange={(e) => {
                                const items = e.target.value
                                  .split('\n')
                                  .map((line) => line.trim())
                                  .filter((line) => line.length > 0);
                                updateComponentProperty(selectedComponent.id, 'items', items);
                              }}
                            />
                            <p className="property-hint">Fallback data when context list is empty.</p>
                          </div>
                        </>
                      );
                    })()}

                    {selectedComponent.type === 'container' && (
                      <>
                        <div className="property-group">
                          <label>Background</label>
                          <input
                            type="color"
                            value={selectedComponent.props.background || '#ffffff'}
                            onChange={(e) => updateComponentProperty(
                              selectedComponent.id,
                              'background',
                              e.target.value
                            )}
                          />
                        </div>
                        <div className="property-group">
                          <label>Padding (px)</label>
                          <input
                            type="number"
                            min={0}
                            value={selectedComponent.props.padding ?? 0}
                            onChange={(e) => {
                              const numericValue = Number(e.target.value);
                              updateComponentProperty(
                                selectedComponent.id,
                                'padding',
                                Number.isFinite(numericValue) ? numericValue : 0
                              );
                            }}
                          />
                        </div>
                      </>
                    )}

                    {(selectedComponent.type === 'column' || selectedComponent.type === 'row') && (
                      <>
                        <div className="property-group">
                          <label>Spacing (px)</label>
                          <input
                            type="number"
                            min={0}
                            value={selectedComponent.props.spacing ?? 0}
                            onChange={(e) => {
                              const numericValue = Number(e.target.value);
                              updateComponentProperty(
                                selectedComponent.id,
                                'spacing',
                                Number.isFinite(numericValue) ? numericValue : 0
                              );
                            }}
                          />
                        </div>
                        <div className="property-group">
                          <label>Justify Content</label>
                          <select
                            value={selectedComponent.props.justifyContent || 'flex-start'}
                            onChange={(e) => updateComponentProperty(
                              selectedComponent.id,
                              'justifyContent',
                              e.target.value
                            )}
                          >
                            <option value="flex-start">Start</option>
                            <option value="center">Center</option>
                            <option value="flex-end">End</option>
                            <option value="space-between">Space Between</option>
                            <option value="space-around">Space Around</option>
                            <option value="space-evenly">Space Evenly</option>
                          </select>
                        </div>
                        <div className="property-group">
                          <label>Align Items</label>
                          <select
                            value={selectedComponent.props.alignItems || 'stretch'}
                            onChange={(e) => updateComponentProperty(
                              selectedComponent.id,
                              'alignItems',
                              e.target.value
                            )}
                          >
                            <option value="stretch">Stretch</option>
                            <option value="flex-start">Start</option>
                            <option value="center">Center</option>
                            <option value="flex-end">End</option>
                          </select>
                        </div>
                        <div className="property-group">
                          <label>Wrap</label>
                          <select
                            value={selectedComponent.props.flexWrap || 'nowrap'}
                            onChange={(e) => updateComponentProperty(
                              selectedComponent.id,
                              'flexWrap',
                              e.target.value
                            )}
                          >
                            <option value="nowrap">No Wrap</option>
                            <option value="wrap">Wrap</option>
                            <option value="wrap-reverse">Wrap Reverse</option>
                          </select>
                        </div>
                        <div className="property-group">
                          <label>Align Content</label>
                          <select
                            value={selectedComponent.props.alignContent || 'stretch'}
                            onChange={(e) => updateComponentProperty(
                              selectedComponent.id,
                              'alignContent',
                              e.target.value
                            )}
                          >
                            <option value="stretch">Stretch</option>
                            <option value="flex-start">Start</option>
                            <option value="center">Center</option>
                            <option value="flex-end">End</option>
                            <option value="space-between">Space Between</option>
                            <option value="space-around">Space Around</option>
                          </select>
                        </div>
                        <div className="property-group">
                          <label>Padding (px)</label>
                          <input
                            type="number"
                            min={0}
                            value={selectedComponent.props.padding ?? 0}
                            onChange={(e) => {
                              const numericValue = Number(e.target.value);
                              updateComponentProperty(
                                selectedComponent.id,
                                'padding',
                                Number.isFinite(numericValue) ? numericValue : 0
                              );
                            }}
                          />
                        </div>
                        <div className="property-group">
                          <label>Background</label>
                          <input
                            type="color"
                            value={selectedComponent.props.background || '#ffffff'}
                            onChange={(e) => updateComponentProperty(
                              selectedComponent.id,
                              'background',
                              e.target.value
                            )}
                          />
                        </div>
                      </>
                    )}
                  </div>

                  {/* Style Properties */}
                  <div className="property-section">
                    <h4>Style</h4>
                    
                    <div className="property-group">
                      <label>Width</label>
                      <input
                        type="text"
                        value={selectedComponent.style.width || ''}
                        onChange={(e) => updateComponentStyle(
                          selectedComponent.id,
                          'width',
                          e.target.value
                        )}
                        placeholder="auto"
                      />
                    </div>

                    <div className="property-group">
                      <label>Height</label>
                      <input
                        type="text"
                        value={selectedComponent.style.height || ''}
                        onChange={(e) => updateComponentStyle(
                          selectedComponent.id,
                          'height',
                          e.target.value
                        )}
                        placeholder="auto"
                      />
                    </div>

                    <div className="property-group">
                      <label>Max Width</label>
                      <input
                        type="text"
                        value={selectedComponent.style.maxWidth || ''}
                        onChange={(e) => updateComponentStyle(
                          selectedComponent.id,
                          'maxWidth',
                          e.target.value
                        )}
                        placeholder="e.g. 960px"
                      />
                    </div>

                    <div className="property-group">
                      <label>Min Height</label>
                      <input
                        type="text"
                        value={selectedComponent.style.minHeight || ''}
                        onChange={(e) => updateComponentStyle(
                          selectedComponent.id,
                          'minHeight',
                          e.target.value
                        )}
                        placeholder="e.g. 320px"
                      />
                    </div>

                    <div className="property-group">
                      <label>Background Color</label>
                      <input
                        type="color"
                        value={selectedComponent.style.backgroundColor || '#ffffff'}
                        onChange={(e) => updateComponentStyle(
                          selectedComponent.id,
                          'backgroundColor',
                          e.target.value
                        )}
                      />
                    </div>

                    <div className="property-group">
                      <label>Margin (px)</label>
                      <div className="spacing-inputs">
                        <input
                          type="number"
                          placeholder="Top"
                          value={extractNumericInputValue(selectedComponent.style.marginTop)}
                          onChange={(e) => applyNumericStyleValue(selectedComponent.id, 'marginTop', e.target.value)}
                        />
                        <input
                          type="number"
                          placeholder="Right"
                          value={extractNumericInputValue(selectedComponent.style.marginRight)}
                          onChange={(e) => applyNumericStyleValue(selectedComponent.id, 'marginRight', e.target.value)}
                        />
                        <input
                          type="number"
                          placeholder="Bottom"
                          value={extractNumericInputValue(selectedComponent.style.marginBottom)}
                          onChange={(e) => applyNumericStyleValue(selectedComponent.id, 'marginBottom', e.target.value)}
                        />
                        <input
                          type="number"
                          placeholder="Left"
                          value={extractNumericInputValue(selectedComponent.style.marginLeft)}
                          onChange={(e) => applyNumericStyleValue(selectedComponent.id, 'marginLeft', e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="property-group">
                      <label>Padding (px)</label>
                      <div className="spacing-inputs">
                        <input
                          type="number"
                          placeholder="Top"
                          value={extractNumericInputValue(selectedComponent.style.paddingTop)}
                          onChange={(e) => applyNumericStyleValue(selectedComponent.id, 'paddingTop', e.target.value)}
                        />
                        <input
                          type="number"
                          placeholder="Right"
                          value={extractNumericInputValue(selectedComponent.style.paddingRight)}
                          onChange={(e) => applyNumericStyleValue(selectedComponent.id, 'paddingRight', e.target.value)}
                        />
                        <input
                          type="number"
                          placeholder="Bottom"
                          value={extractNumericInputValue(selectedComponent.style.paddingBottom)}
                          onChange={(e) => applyNumericStyleValue(selectedComponent.id, 'paddingBottom', e.target.value)}
                        />
                        <input
                          type="number"
                          placeholder="Left"
                          value={extractNumericInputValue(selectedComponent.style.paddingLeft)}
                          onChange={(e) => applyNumericStyleValue(selectedComponent.id, 'paddingLeft', e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="property-group">
                      <label>Border</label>
                      <div className="border-inputs">
                        <input
                          type="number"
                          min={0}
                          placeholder="Width"
                          value={extractNumericInputValue(selectedComponent.style.borderWidth)}
                          onChange={(e) => applyNumericStyleValue(selectedComponent.id, 'borderWidth', e.target.value)}
                        />
                        <select
                          value={selectedComponent.style.borderStyle || 'solid'}
                          onChange={(e) => updateComponentStyle(selectedComponent.id, 'borderStyle', e.target.value)}
                        >
                          <option value="none">None</option>
                          <option value="solid">Solid</option>
                          <option value="dashed">Dashed</option>
                          <option value="dotted">Dotted</option>
                        </select>
                        <input
                          type="color"
                          value={selectedComponent.style.borderColor || '#cbd5f5'}
                          onChange={(e) => updateComponentStyle(selectedComponent.id, 'borderColor', e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="property-group">
                      <label>Border Radius</label>
                      <input
                        type="number"
                        min={0}
                        placeholder="px"
                        value={extractNumericInputValue(selectedComponent.style.borderRadius)}
                        onChange={(e) => applyNumericStyleValue(selectedComponent.id, 'borderRadius', e.target.value)}
                      />
                    </div>

                    <div className="property-group">
                      <label>Box Shadow</label>
                      <input
                        type="text"
                        placeholder="0 12px 24px rgba(15,23,42,0.12)"
                        value={selectedComponent.style.boxShadow || ''}
                        onChange={(e) => updateComponentStyle(selectedComponent.id, 'boxShadow', e.target.value)}
                      />
                    </div>

                    <div className="property-group">
                      <label>Opacity</label>
                      <input
                        type="number"
                        step="0.05"
                        min={0}
                        max={1}
                        value={selectedComponent.style.opacity ?? ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '') {
                            updateComponentStyle(selectedComponent.id, 'opacity', '');
                            return;
                          }
                          const numberValue = Number(value);
                          if (Number.isFinite(numberValue)) {
                            updateComponentStyle(selectedComponent.id, 'opacity', numberValue);
                          }
                        }}
                      />
                    </div>
                  </div>

                  {selectedComponent.type === 'container' && (
                    <div className="property-section">
                      <h4>Layout</h4>

                      <div className="property-group">
                        <label>Display Mode</label>
                        <select
                          value={selectedComponent.style.display === 'flex' ? 'flex' : 'block'}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === 'flex') {
                              updateComponentStyle(selectedComponent.id, 'display', 'flex');
                              return;
                            }
                            updateComponentStyle(selectedComponent.id, 'display', 'block');
                          }}
                        >
                          <option value="block">Block</option>
                          <option value="flex">Flex</option>
                        </select>
                      </div>

                      {selectedComponent.style.display === 'flex' && (
                        <>
                          <div className="property-group">
                            <label>Flex Direction</label>
                            <select
                              value={selectedComponent.style.flexDirection || 'column'}
                              onChange={(e) => updateComponentStyle(
                                selectedComponent.id,
                                'flexDirection',
                                e.target.value
                              )}
                            >
                              <option value="column">Column</option>
                              <option value="row">Row</option>
                            </select>
                          </div>
                          <div className="property-group">
                            <label>Justify Content</label>
                            <select
                              value={selectedComponent.style.justifyContent || 'flex-start'}
                              onChange={(e) => updateComponentStyle(
                                selectedComponent.id,
                                'justifyContent',
                                e.target.value
                              )}
                            >
                              <option value="flex-start">Start</option>
                              <option value="center">Center</option>
                              <option value="flex-end">End</option>
                              <option value="space-between">Space Between</option>
                              <option value="space-around">Space Around</option>
                              <option value="space-evenly">Space Evenly</option>
                            </select>
                          </div>
                          <div className="property-group">
                            <label>Align Items</label>
                            <select
                              value={selectedComponent.style.alignItems || 'stretch'}
                              onChange={(e) => updateComponentStyle(
                                selectedComponent.id,
                                'alignItems',
                                e.target.value
                              )}
                            >
                              <option value="stretch">Stretch</option>
                              <option value="flex-start">Start</option>
                              <option value="center">Center</option>
                              <option value="flex-end">End</option>
                            </select>
                          </div>
                          <div className="property-group">
                            <label>Align Content</label>
                            <select
                              value={selectedComponent.style.alignContent || 'stretch'}
                              onChange={(e) => updateComponentStyle(
                                selectedComponent.id,
                                'alignContent',
                                e.target.value
                              )}
                            >
                              <option value="stretch">Stretch</option>
                              <option value="flex-start">Start</option>
                              <option value="center">Center</option>
                              <option value="flex-end">End</option>
                              <option value="space-between">Space Between</option>
                              <option value="space-around">Space Around</option>
                            </select>
                          </div>
                          <div className="property-group">
                            <label>Wrap</label>
                            <select
                              value={selectedComponent.style.flexWrap || 'nowrap'}
                              onChange={(e) => updateComponentStyle(
                                selectedComponent.id,
                                'flexWrap',
                                e.target.value
                              )}
                            >
                              <option value="nowrap">No Wrap</option>
                              <option value="wrap">Wrap</option>
                              <option value="wrap-reverse">Wrap Reverse</option>
                            </select>
                          </div>
                          <div className="property-group">
                            <label>Gap (px)</label>
                            <input
                              type="number"
                              min={0}
                              value={extractNumericInputValue(selectedComponent.style.gap)}
                              onChange={(e) => applyNumericStyleValue(
                                selectedComponent.id,
                                'gap',
                                e.target.value
                              )}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {selectedComponent.type === 'button' && (
                    <div className="property-section">
                      <h4>Button Styling</h4>

                      <div className="property-group">
                        <label>Font Size (px)</label>
                        <input
                          type="number"
                          min={0}
                          value={extractNumericInputValue(selectedComponent.style.fontSize)}
                          onChange={(e) => applyNumericStyleValue(
                            selectedComponent.id,
                            'fontSize',
                            e.target.value
                          )}
                        />
                      </div>

                      <div className="property-group">
                        <label>Font Weight</label>
                        <select
                          value={selectedComponent.style.fontWeight || '500'}
                          onChange={(e) => updateComponentStyle(
                            selectedComponent.id,
                            'fontWeight',
                            e.target.value
                          )}
                        >
                          <option value="400">Regular</option>
                          <option value="500">Medium</option>
                          <option value="600">Semi Bold</option>
                          <option value="700">Bold</option>
                          <option value="800">Extra Bold</option>
                        </select>
                      </div>

                      <div className="property-group">
                        <label>Text Color</label>
                        <input
                          type="color"
                          value={selectedComponent.style.color || '#ffffff'}
                          onChange={(e) => updateComponentStyle(
                            selectedComponent.id,
                            'color',
                            e.target.value
                          )}
                        />
                      </div>

                      <div className="property-group">
                        <label>Background Color</label>
                        <input
                          type="color"
                          value={selectedComponent.style.backgroundColor || '#3b82f6'}
                          onChange={(e) => updateComponentStyle(
                            selectedComponent.id,
                            'backgroundColor',
                            e.target.value
                          )}
                        />
                      </div>

                      <div className="property-group">
                        <label>Padding</label>
                        <input
                          type="text"
                          value={selectedComponent.style.padding || ''}
                          onChange={(e) => updateComponentStyle(
                            selectedComponent.id,
                            'padding',
                            e.target.value
                          )}
                          placeholder="10px 20px"
                        />
                      </div>

                      <div className="property-group">
                        <label>Text Transform</label>
                        <select
                          value={selectedComponent.style.textTransform || 'none'}
                          onChange={(e) => updateComponentStyle(
                            selectedComponent.id,
                            'textTransform',
                            e.target.value
                          )}
                        >
                          <option value="none">None</option>
                          <option value="uppercase">Uppercase</option>
                          <option value="lowercase">Lowercase</option>
                          <option value="capitalize">Capitalize</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {selectedComponent.type === 'input' && (
                    <div className="property-section">
                      <h4>Input Styling</h4>

                      <div className="property-group">
                        <label>Text Color</label>
                        <input
                          type="color"
                          value={selectedComponent.style.color || '#0f172a'}
                          onChange={(e) => updateComponentStyle(
                            selectedComponent.id,
                            'color',
                            e.target.value
                          )}
                        />
                      </div>

                      <div className="property-group">
                        <label>Background Color</label>
                        <input
                          type="color"
                          value={selectedComponent.style.backgroundColor || '#ffffff'}
                          onChange={(e) => updateComponentStyle(
                            selectedComponent.id,
                            'backgroundColor',
                            e.target.value
                          )}
                        />
                      </div>

                      <div className="property-group">
                        <label>Border Color</label>
                        <input
                          type="color"
                          value={selectedComponent.style.borderColor || '#cbd5f5'}
                          onChange={(e) => updateComponentStyle(
                            selectedComponent.id,
                            'borderColor',
                            e.target.value
                          )}
                        />
                      </div>

                      <div className="property-group">
                        <label>Border Width (px)</label>
                        <input
                          type="number"
                          min={0}
                          value={extractNumericInputValue(selectedComponent.style.borderWidth)}
                          onChange={(e) => applyNumericStyleValue(
                            selectedComponent.id,
                            'borderWidth',
                            e.target.value
                          )}
                        />
                      </div>

                      <div className="property-group">
                        <label>Border Radius (px)</label>
                        <input
                          type="number"
                          min={0}
                          value={extractNumericInputValue(selectedComponent.style.borderRadius)}
                          onChange={(e) => applyNumericStyleValue(
                            selectedComponent.id,
                            'borderRadius',
                            e.target.value
                          )}
                        />
                      </div>

                      <div className="property-group">
                        <label>Padding</label>
                        <input
                          type="text"
                          value={selectedComponent.style.padding || ''}
                          onChange={(e) => updateComponentStyle(
                            selectedComponent.id,
                            'padding',
                            e.target.value
                          )}
                          placeholder="8px 12px"
                        />
                      </div>
                    </div>
                  )}

                  {selectedComponent.type === 'image' && (
                    <div className="property-section">
                      <h4>Image Styling</h4>

                      <div className="property-group">
                        <label>Object Fit</label>
                        <select
                          value={selectedComponent.style.objectFit || 'cover'}
                          onChange={(e) => updateComponentStyle(
                            selectedComponent.id,
                            'objectFit',
                            e.target.value
                          )}
                        >
                          <option value="cover">Cover</option>
                          <option value="contain">Contain</option>
                          <option value="fill">Fill</option>
                          <option value="none">None</option>
                          <option value="scale-down">Scale Down</option>
                        </select>
                      </div>

                      <div className="property-group">
                        <label>Object Position</label>
                        <input
                          type="text"
                          value={selectedComponent.style.objectPosition || ''}
                          onChange={(e) => updateComponentStyle(
                            selectedComponent.id,
                            'objectPosition',
                            e.target.value
                          )}
                          placeholder="center center"
                        />
                      </div>

                      <div className="property-group">
                        <label>Aspect Ratio</label>
                        <input
                          type="text"
                          value={selectedComponent.style.aspectRatio || ''}
                          onChange={(e) => updateComponentStyle(
                            selectedComponent.id,
                            'aspectRatio',
                            e.target.value
                          )}
                          placeholder="e.g. 16 / 9"
                        />
                      </div>

                      <div className="property-group">
                        <label>Border Radius (px)</label>
                        <input
                          type="number"
                          min={0}
                          value={extractNumericInputValue(selectedComponent.style.borderRadius)}
                          onChange={(e) => applyNumericStyleValue(
                            selectedComponent.id,
                            'borderRadius',
                            e.target.value
                          )}
                        />
                      </div>
                    </div>
                  )}

                  {selectedComponent.type === 'list' && (
                    <div className="property-section">
                      <h4>List Styling</h4>

                      <div className="property-group">
                        <label>List Style</label>
                        <select
                          value={selectedComponent.style.listStyleType || (selectedComponent.props.variant === 'ordered' ? 'decimal' : 'disc')}
                          onChange={(e) => updateComponentStyle(
                            selectedComponent.id,
                            'listStyleType',
                            e.target.value
                          )}
                        >
                          <option value="disc">Disc</option>
                          <option value="circle">Circle</option>
                          <option value="square">Square</option>
                          <option value="decimal">Numbered</option>
                          <option value="none">None</option>
                        </select>
                      </div>

                      <div className="property-group">
                        <label>Marker Position</label>
                        <select
                          value={selectedComponent.style.listStylePosition || 'outside'}
                          onChange={(e) => updateComponentStyle(
                            selectedComponent.id,
                            'listStylePosition',
                            e.target.value
                          )}
                        >
                          <option value="outside">Outside</option>
                          <option value="inside">Inside</option>
                        </select>
                      </div>

                      <div className="property-group">
                        <label>Text Color</label>
                        <input
                          type="color"
                          value={selectedComponent.style.color || '#1e293b'}
                          onChange={(e) => updateComponentStyle(
                            selectedComponent.id,
                            'color',
                            e.target.value
                          )}
                        />
                      </div>

                      <div className="property-group">
                        <label>Line Height</label>
                        <input
                          type="text"
                          value={selectedComponent.style.lineHeight || ''}
                          onChange={(e) => updateComponentStyle(
                            selectedComponent.id,
                            'lineHeight',
                            e.target.value
                          )}
                          placeholder="1.6 or 24px"
                        />
                      </div>
                    </div>
                  )}

                  {selectedComponent.type === 'text' && (
                    <div className="property-section">
                      <h4>Typography</h4>

                      <div className="property-group">
                        <label>Font Size (px)</label>
                        <input
                          type="number"
                          min={0}
                          value={extractNumericInputValue(selectedComponent.style.fontSize)}
                          onChange={(e) => applyNumericStyleValue(selectedComponent.id, 'fontSize', e.target.value)}
                        />
                      </div>

                      <div className="property-group">
                        <label>Font Weight</label>
                        <select
                          value={selectedComponent.style.fontWeight || 'normal'}
                          onChange={(e) => updateComponentStyle(selectedComponent.id, 'fontWeight', e.target.value)}
                        >
                          <option value="lighter">Light</option>
                          <option value="normal">Normal</option>
                          <option value="500">Medium</option>
                          <option value="600">Semi Bold</option>
                          <option value="700">Bold</option>
                          <option value="800">Extra Bold</option>
                        </select>
                      </div>

                      <div className="property-group">
                        <label>Text Color</label>
                        <input
                          type="color"
                          value={selectedComponent.props.color || '#1e293b'}
                          onChange={(e) => updateComponentProperty(selectedComponent.id, 'color', e.target.value)}
                        />
                      </div>

                      <div className="property-group">
                        <label>Text Align</label>
                        <select
                          value={selectedComponent.style.textAlign || 'left'}
                          onChange={(e) => updateComponentStyle(selectedComponent.id, 'textAlign', e.target.value)}
                        >
                          <option value="left">Left</option>
                          <option value="center">Center</option>
                          <option value="right">Right</option>
                          <option value="justify">Justify</option>
                        </select>
                      </div>

                      <div className="property-group">
                        <label>Line Height</label>
                        <input
                          type="text"
                          value={selectedComponent.style.lineHeight || ''}
                          onChange={(e) => updateComponentStyle(selectedComponent.id, 'lineHeight', e.target.value)}
                          placeholder="1.5 or 24px"
                        />
                      </div>

                      <div className="property-group">
                        <label>Letter Spacing</label>
                        <input
                          type="text"
                          value={selectedComponent.style.letterSpacing || ''}
                          onChange={(e) => updateComponentStyle(selectedComponent.id, 'letterSpacing', e.target.value)}
                          placeholder="0.5px"
                        />
                      </div>
                    </div>
                  )}

                  {/* Data Binding */}
                  <div className="property-section">
                    <h4>Data Binding</h4>
                    
                    {['text', 'content', 'value', 'src'].map((prop) => {
                      const propsBag = selectedComponent.props || {};
                      if (!Object.prototype.hasOwnProperty.call(propsBag, prop)) {
                        return null;
                      }

                      const currentBindingName = getBindingVariableName(selectedComponent.props?.[prop]);
                      const aliasPrefix = listContextBinding?.alias ? `${listContextBinding.alias}.` : '';
                      const isAliasBinding = Boolean(
                        listContextBinding &&
                        currentBindingName &&
                        currentBindingName.startsWith(aliasPrefix) &&
                        !variables?.[currentBindingName]
                      );
                      const aliasInputValue = isAliasBinding ? currentBindingName : '';
                      const aliasSelectValue = isAliasBinding ? currentBindingName : '';
                      const hasAliasSuggestions = Boolean(listContextBinding?.suggestions?.length);

                      return (
                        <div key={prop} className="property-group">
                          <label>Bind {prop} to variable</label>
                          <select
                            value={currentBindingName && !isAliasBinding ? currentBindingName : ''}
                            onChange={(e) => bindComponentToVariable(
                              selectedComponent.id,
                              prop,
                              e.target.value
                            )}
                          >
                            <option value="">None</option>
                            {variablesList.map((variableName) => (
                              <option key={variableName} value={variableName}>
                                {variableName}
                              </option>
                            ))}
                          </select>

                          {listContextBinding && hasAliasSuggestions && (
                            <div className="property-subgroup">
                              <label>
                                Bind {prop} to {listContextBinding.alias} field
                              </label>
                              <select
                                value={aliasSelectValue}
                                onChange={(e) => handleAliasBindingChange(prop, e.target.value)}
                              >
                                <option value="">None</option>
                                {listContextBinding.suggestions.map((suggestion) => (
                                  <option key={suggestion.fullPath} value={suggestion.fullPath}>
                                    {suggestion.sampleValue
                                      ? `${suggestion.fullPath} — ${suggestion.sampleValue}`
                                      : suggestion.fullPath}
                                  </option>
                                ))}
                              </select>
                              <input
                                type="text"
                                list={`list-binding-${selectedComponent.id}-${prop}`}
                                value={aliasInputValue}
                                onChange={(e) => handleAliasBindingChange(prop, e.target.value)}
                                placeholder={`${listContextBinding.alias}.field`}
                              />
                              <datalist id={`list-binding-${selectedComponent.id}-${prop}`}>
                                {listContextBinding.suggestions.map((suggestion) => (
                                  <option
                                    key={suggestion.fullPath}
                                    value={suggestion.fullPath}
                                    label={suggestion.sampleValue
                                      ? `${suggestion.path} – ${suggestion.sampleValue}`
                                      : suggestion.path}
                                  />
                                ))}
                              </datalist>
                              <p className="property-hint">
                                Uses each <code>{listContextBinding.alias}</code>
                                {listContextBinding.bindingName ? ` from {${listContextBinding.bindingName}}` : ''}.
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="ux-hint">
                    Tip: Use <strong>Delete</strong> or <strong>Backspace</strong> to remove the selected component.
                    Press <strong>Esc</strong> to clear the selection.
                  </div>
                </div>
              ) : (
                <div className="no-selection">
                  <p>Select a component to edit its properties</p>
                </div>
              )}

              <div className="context-panel embedded">
                <div className="panel-header">
                  <h3>
                    <Database size={18} />
                    Virtual Context
                  </h3>
                </div>

                <div className="context-content">
                  <div className="variables-section">
                    <h4>Variables</h4>
                    <div className="variables-list">
                      {variablesList.map((variableName) => {
                        const variable = variables[variableName];
                        const schemaMeta = variableSchemas?.[variableName];
                        if (!variable) {
                          return null;
                        }
                        const schemaKeys = schemaMeta?.schema && typeof schemaMeta.schema === 'object'
                          ? Object.keys(schemaMeta.schema).slice(0, 8)
                          : [];
                        return (
                          <div key={variableName} className="variable-item">
                            <div className="variable-header">
                              <span className="variable-name">{variableName}</span>
                              <span className="variable-type">{variable.type}</span>
                            </div>
                            <div className="variable-details">
                              <span className="variable-source">Source: {variable.source}</span>
                              <span className="variable-value">
                                Value: {JSON.stringify(variable.value)}
                              </span>
                            </div>
                            {schemaMeta && (
                              <div className="variable-schema">
                                <span className="variable-schema-type">
                                  Schema type: {schemaMeta.type || variable.type}
                                </span>
                                {schemaMeta.endpoint && (
                                  <span className="variable-schema-endpoint">Endpoint: {schemaMeta.endpoint}</span>
                                )}
                                {schemaKeys.length > 0 && (
                                  <div className="variable-schema-keys">
                                    {schemaKeys.map((key) => (
                                      <span key={key} className="variable-schema-tag">{key}</span>
                                    ))}
                                    {Object.keys(schemaMeta.schema).length > schemaKeys.length && (
                                      <span className="variable-schema-tag">…</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      
                      {variablesList.length === 0 && (
                        <p className="no-variables">No variables defined</p>
                      )}
                    </div>
                  </div>

                  <div className="add-variable-section">
                    <button 
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        const name = prompt('Variable name:');
                        const value = prompt('Variable value:');
                        if (name && value) {
                          setVariable(name, value, 'string', 'manual', 'User-defined variable');
                          toast.success(`Variable {${name}} created!`);
                        }
                      }}
                    >
                      <Plus size={16} />
                      Add Variable
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DndProvider>
  );
};

export default ScreenBuilder;