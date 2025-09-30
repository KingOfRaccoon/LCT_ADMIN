import widgetStyles from './widgetStyles.json';
import { getToken } from './applyDesignTokens.js';

const UNIT_LESS_PROPERTIES = new Set([
  'fontWeight',
  'flex',
  'flexGrow',
  'flexShrink',
  'order',
  'opacity',
  'zIndex'
]);

const toKebabCase = (value) =>
  String(value)
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[_\s]+/g, '-')
    .toLowerCase();

const resolveValue = (definition) => {
  if (definition && typeof definition === 'object' && !Array.isArray(definition)) {
    if (definition.token) {
      const tokenValue = getToken(definition.token, undefined);
      return tokenValue !== undefined ? tokenValue : undefined;
    }
  }

  return definition;
};

const mergeDefinitions = (definitions) => {
  return definitions.reduce((acc, definition) => {
    if (!definition || typeof definition !== 'object') {
      return acc;
    }

    Object.entries(definition).forEach(([key, rawValue]) => {
      const resolved = resolveValue(rawValue);
      if (resolved !== undefined) {
        acc[key] = resolved;
      }
    });

    return acc;
  }, {});
};

const normalizeStyleValues = (styleMap) => {
  if (!styleMap || typeof styleMap !== 'object') {
    return {};
  }

  return Object.entries(styleMap).reduce((acc, [key, value]) => {
    if (value === undefined || value === null) {
      return acc;
    }

    if (typeof value === 'number' && !UNIT_LESS_PROPERTIES.has(key)) {
      acc[key] = `${value}px`;
      return acc;
    }

    acc[key] = value;
    return acc;
  }, {});
};

const buildCssVariables = (type, styleMap, options = {}) => {
  const { prefix } = options;
  return Object.entries(styleMap).reduce((acc, [key, value]) => {
    if (value === undefined) {
      return acc;
    }

    const variableName = `--widget-${type}${prefix ? `-${prefix}` : ''}-${toKebabCase(key)}`;
    acc[variableName] = value;
    return acc;
  }, {});
};

export const resolveWidgetStyles = (type, { variant, size } = {}) => {
  const config = widgetStyles?.[type];

  if (!config) {
    return {
      style: {},
      meta: {
        base: {},
        size: {},
        variant: {},
        states: {}
      }
    };
  }

  const baseStyle = mergeDefinitions([config.base]);
  const sizeStyle = size && config.sizes ? mergeDefinitions([config.sizes[size]]) : {};
  const variantStyle = variant && config.variants ? mergeDefinitions([config.variants[variant]]) : {};

  const combinedStyle = {
    ...baseStyle,
    ...sizeStyle,
    ...variantStyle
  };

  const normalizedStyle = normalizeStyleValues(combinedStyle);

  const cssVariables = buildCssVariables(type, normalizedStyle);

  const stateVariables = {};
  if (config.states && typeof config.states === 'object') {
    Object.entries(config.states).forEach(([stateName, stateDefinition]) => {
      if (!stateDefinition) {
        return;
      }

      const stateVariantDefinition =
        variant && typeof stateDefinition === 'object' && stateDefinition[variant]
          ? stateDefinition[variant]
          : stateDefinition;

      const resolvedStateStyle = mergeDefinitions([stateVariantDefinition]);
      const normalizedStateStyle = normalizeStyleValues(resolvedStateStyle);
      Object.assign(
        stateVariables,
        buildCssVariables(type, normalizedStateStyle, { prefix: `${stateName}` })
      );
    });
  }

  const style = {
    ...normalizedStyle,
    ...cssVariables,
    ...stateVariables
  };

  return {
    style,
    computed: combinedStyle,
    meta: {
      base: baseStyle,
      size: sizeStyle,
      variant: variantStyle,
      states: config.states || {},
      combined: combinedStyle
    }
  };
};

export const resolveWidgetMeta = (type) => widgetStyles?.[type] ?? null;
