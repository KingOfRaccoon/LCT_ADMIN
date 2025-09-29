import tokens from './designTokens.json';

const NUMBER_TO_PX_ROOT_KEYS = new Set(['spacing', 'radius']);
const NUMBER_TO_PX_LEAF_KEYS = new Set(['size', 'lineHeight']);

const toKebabCase = (value) =>
  String(value)
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[_\s]+/g, '-')
    .toLowerCase();

const formatValue = (path, value) => {
  if (typeof value !== 'number') {
    return value;
  }

  if (NUMBER_TO_PX_ROOT_KEYS.has(path[0]) || NUMBER_TO_PX_LEAF_KEYS.has(path[path.length - 1])) {
    return `${value}px`;
  }

  return value;
};

const flattenTokens = (object, path = []) => {
  return Object.entries(object).reduce((acc, [key, value]) => {
    const nextPath = [...path, toKebabCase(key)];

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return {
        ...acc,
        ...flattenTokens(value, nextPath)
      };
    }

    const cssValue = formatValue(nextPath, value);
    const variableName = `--${nextPath.join('-')}`;
    acc[variableName] = cssValue;
    return acc;
  }, {});
};

export const designTokens = tokens;

export const cssVariables = flattenTokens(tokens);

export const applyDesignTokens = (root = typeof document !== 'undefined' ? document.documentElement : null) => {
  if (!root) {
    return cssVariables;
  }

  Object.entries(cssVariables).forEach(([name, value]) => {
    root.style.setProperty(name, value);
  });

  return cssVariables;
};

export const getToken = (path, fallback) => {
  const segments = Array.isArray(path) ? path : String(path).split('.');
  return segments.reduce((acc, segment) => {
    if (acc && acc[segment] !== undefined) {
      return acc[segment];
    }
    return undefined;
  }, tokens) ?? fallback;
};
