import { SCREEN_BASE_STYLE, SECTION_DEFAULTS } from './constants.js';

export const assignContextValue = (target, path, value) => {
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

export const buildContextFromVariables = (variablesMap = {}) => {
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

export const normalizeComponents = (components = []) => {
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
