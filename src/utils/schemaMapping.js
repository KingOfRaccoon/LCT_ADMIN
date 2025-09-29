export const resolveValueByPath = (source, path) => {
  if (!path || typeof path !== 'string') {
    return undefined;
  }

  const segments = path.split('.');
  return segments.reduce((acc, segment) => {
    if (acc === undefined || acc === null) {
      return undefined;
    }

    const index = Number(segment);
    const isIndex = Number.isInteger(index) && String(index) === segment;

    if (Array.isArray(acc) && isIndex) {
      return acc[index];
    }

    if (typeof acc === 'object' && acc !== null && Object.prototype.hasOwnProperty.call(acc, segment)) {
      return acc[segment];
    }

    return undefined;
  }, source);
};

const mapStructure = (value, schema) => {
  if (!schema || typeof schema !== 'object') {
    return value;
  }

  return Object.entries(schema).reduce((acc, [key, descriptor]) => {
    if (typeof descriptor === 'string') {
      acc[key] = resolveValueByPath(value, descriptor);
      return acc;
    }

    if (descriptor && typeof descriptor === 'object' && !Array.isArray(descriptor)) {
      if (typeof descriptor.path === 'string') {
        const resolved = resolveValueByPath(value, descriptor.path);
        acc[key] = resolved !== undefined ? resolved : descriptor.default;
        return acc;
      }

      acc[key] = mapStructure(value, descriptor);
      return acc;
    }

    acc[key] = descriptor;
    return acc;
  }, {});
};

export const applySchemaMapping = (payload, schema) => {
  if (!schema || typeof schema !== 'object') {
    return payload;
  }

  if (Array.isArray(payload)) {
    return payload.map((item) => mapStructure(item, schema));
  }

  if (payload && typeof payload === 'object') {
    return mapStructure(payload, schema);
  }

  return payload;
};
