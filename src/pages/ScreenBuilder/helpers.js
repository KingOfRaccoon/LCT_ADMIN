const REFERENCE_MAX_DEPTH = 6;

export const isPlainObject = (value) => (
  value !== null &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null)
);

export const isDeepEqual = (a, b) => {
  if (a === b) return true;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
};

export const normalizeReference = (reference) => {
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

export const createReference = (variableName) => {
  if (!variableName) {
    return '';
  }

  const normalized = normalizeReference(variableName);
  return normalized ? `\${${normalized}}` : '';
};

const isReferenceString = (reference) => (
  typeof reference === 'string' &&
  reference.length > 3 &&
  reference.startsWith('${') &&
  reference.endsWith('}')
);

export const isBindingValue = (value) => (
  isPlainObject(value) &&
  typeof value.reference === 'string' &&
  (isReferenceString(value.reference) || value.reference.startsWith('$'))
);

export const getBindingVariableName = (value) => (
  isBindingValue(value) ? normalizeReference(value.reference) : ''
);

export const getBindingFallbackValue = (value) => {
  if (isBindingValue(value)) {
    return value.value ?? '';
  }

  return value;
};

export const createBindingValue = (fallbackValue, variableName) => ({
  value: fallbackValue ?? '',
  reference: createReference(variableName)
});

export const applyFallbackUpdate = (currentValue, nextFallback) => {
  if (isBindingValue(currentValue)) {
    return {
      ...currentValue,
      value: nextFallback,
      reference: createReference(getBindingVariableName(currentValue))
    };
  }

  return nextFallback;
};

export const sanitizePlainObject = (value) => {
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

export const formatSampleValue = (value) => {
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

export const coerceRenderableValue = (value) => {
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

const collectSuggestionsFromSampleValue = (value, prefix, accumulator, depth) => {
  if (depth > REFERENCE_MAX_DEPTH) {
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

export const collectSuggestionsFromSchema = (schema, prefix = '', accumulator = new Map(), depth = 0) => {
  if (!schema || typeof schema !== 'object' || Array.isArray(schema) || depth > REFERENCE_MAX_DEPTH) {
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

export const collectSuggestionsFromSamples = (samples, accumulator = new Map()) => {
  if (!samples) {
    return accumulator;
  }

  const sourceArray = Array.isArray(samples) ? samples : [samples];
  sourceArray.slice(0, 6).forEach((sample) => {
    collectSuggestionsFromSampleValue(sample, '', accumulator, 0);
  });

  return accumulator;
};

export const resolvePropValue = (props = {}, key, defaultValue = '') => {
  if (!props || typeof props !== 'object') {
    return defaultValue;
  }

  const candidate = props[key];
  const resolved = getBindingFallbackValue(candidate);

  if (resolved === undefined || resolved === null) {
    return defaultValue;
  }

  return resolved;
};
