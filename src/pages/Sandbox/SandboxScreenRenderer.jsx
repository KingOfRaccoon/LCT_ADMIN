import { useMemo } from 'react';
import {
  resolveBindingValue,
  resolvePropValue,
  isBindingValue
} from './utils/bindings';
import { resolveWidgetStyles } from '../../styles/resolveWidgetStyles';
import '../ScreenBuilder/ScreenBuilder.css';

const spacingToCss = (value) => {
  if (typeof value === 'number') {
    return `${value}px`;
  }
  if (typeof value === 'string') {
    return value;
  }
  return undefined;
};

const paddingToCss = (value) => {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value === 'number') {
    return `${value}px`;
  }
  if (Array.isArray(value)) {
    return value.map(spacingToCss).join(' ');
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'object' && value !== null) {
    const { top = 0, right = top, bottom = top, left = right } = value;
    return [top, right, bottom, left].map(spacingToCss).join(' ');
  }
  return undefined;
};

const mergeStyles = (base = {}, componentStyle = {}) => ({
  ...base,
  ...componentStyle
});

const SandboxScreenRenderer = ({
  screen,
  context,
  onEvent,
  onInputChange,
  formValues = {},
  isEventPending = false
}) => {
  const components = useMemo(() => (screen?.components ?? []), [screen?.components]);

  const componentsMap = useMemo(() => {
    const map = new Map();
    components.forEach((component) => {
      if (component && component.id) map.set(component.id, component);
    });
    return map;
  }, [components]);

  // rootComponent for old format (components array)
  const rootComponent = useMemo(
    () => components.find((component) => component.type === 'screen'),
    [components]
  );

  // If the screen uses the new `sections` format, build a virtual root component
  const virtualRoot = useMemo(() => {
    if (rootComponent) return null;
    if (!screen) return null;
    if (!screen.sections) return null;

    // top-level children are the section objects
    const sectionObjects = Object.values(screen.sections).map((section) => ({
      // leave as-is: section is already an object with id/type/properties/children
      ...section
    }));

    return {
      id: screen.id ?? 'virtual-screen-root',
      type: 'screen',
      props: screen.style ?? {},
      children: sectionObjects
    };
  }, [rootComponent, screen]);

  // helper to read props from both legacy `props` and new `properties`
  const readProps = (component) => component?.props ?? component?.properties ?? {};

  if (!screen || (!rootComponent && !virtualRoot)) {
    return (
      <div className="sandbox-screen-empty">
        Нечего отображать — выберите экран в графе
      </div>
    );
  }

  const renderChildren = (component, iterationStack = []) => {
    if (!component?.children || component.children.length === 0) {
      return null;
    }

    return component.children.map((childRef, idx) => {
      let child = null;
      if (typeof childRef === 'string') {
        child = componentsMap.get(childRef);
      } else if (typeof childRef === 'object' && childRef !== null) {
        child = childRef;
      }
      if (!child) {
        return null;
      }

      return (
        <div key={child.id ?? idx} className="sandbox-component-wrapper">
          {renderComponent(child, iterationStack)}
        </div>
      );
    });
  };

  const renderComponent = (component, iterationStack = []) => {
    const getByPath = (obj, path) => {
      if (!path) return undefined;
      const parts = String(path).split('.');
      let cur = obj;
      for (const p of parts) {
        if (cur === undefined || cur === null) return undefined;
        if (isBindingValue(cur)) {
          cur = resolveBindingValue(cur, context, undefined, { iterationStack });
        }
        if (Array.isArray(cur) && /^\d+$/.test(p)) {
          cur = cur[Number(p)];
        } else if (Object.prototype.hasOwnProperty.call(cur, p)) {
          cur = cur[p];
        } else {
          return undefined;
        }
      }
      if (isBindingValue(cur)) return resolveBindingValue(cur, context, undefined, { iterationStack });
      return cur;
    };

    const resolveBinding = (value, fallback) => (
      resolveBindingValue(value, context, fallback, { iterationStack })
    );

    const resolveProp = (propsObject, key, fallback) => (
      resolvePropValue(propsObject, key, context, fallback, { iterationStack })
    );

    const formatForDisplay = (candidate, displayPath) => {
      // If a displayPath is provided and candidate is an object, pick that sub-value first
      if (displayPath && candidate && typeof candidate === 'object') {
        const byPath = getByPath(candidate, displayPath);
        if (byPath !== undefined) {
          return formatForDisplay(byPath);
        }
      }

      // Resolve binding wrapper first
      if (isBindingValue(candidate)) {
        const resolved = resolveBindingValue(candidate, context, undefined, { iterationStack });
        return formatForDisplay(resolved, displayPath);
      }

      if (candidate === null || candidate === undefined) {
        return '';
      }

      if (typeof candidate === 'string' || typeof candidate === 'number' || typeof candidate === 'boolean') {
        return String(candidate);
      }

      if (Array.isArray(candidate)) {
        // join primitives, for objects try to extract label-like field
        return candidate.map((it) => formatForDisplay(it, displayPath)).join(', ');
      }

      if (typeof candidate === 'object') {
        // Prefer common fields
        const keysToTry = ['display', 'label', 'title', 'name', 'text', 'content', 'value'];
        for (const key of keysToTry) {
          if (Object.prototype.hasOwnProperty.call(candidate, key)) {
            const fieldValue = candidate[key];
            // Ensure we always return a string, never an object
            if (fieldValue === null || fieldValue === undefined) {
              continue; // Try next key
            }
            if (typeof fieldValue === 'string' || typeof fieldValue === 'number' || typeof fieldValue === 'boolean') {
              return String(fieldValue);
            }
            if (Array.isArray(fieldValue)) {
              return fieldValue.map(item => String(item)).join(', ');
            }
            if (typeof fieldValue === 'object') {
              // If the field value is also an object, recursively format it
              const formatted = formatForDisplay(fieldValue, displayPath);
              if (typeof formatted === 'string') {
                return formatted;
              }
            }
          }
        }

        try {
          return JSON.stringify(candidate);
        } catch {
          return '[object]';
        }
      }

      return String(candidate);
    };
    const props = readProps(component);

    switch (component.type) {
      case 'screen': {
        const paddingValue = paddingToCss(props?.padding);
        const style = mergeStyles(
          {
            width: '100%',
            minHeight: '640px',
            borderRadius: '32px',
            overflow: 'hidden',
            background: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            gap: spacingToCss(props?.spacing ?? 0),
            padding: paddingValue
          },
          component.style
        );

        return (
          <div className="sandbox-screen" style={style}>
            {renderChildren(component, iterationStack)}
          </div>
        );
      }

      case 'column': {
        const paddingValue = paddingToCss(props?.padding);
        const baseStyle = {
          display: 'flex',
          flexDirection: 'column',
          gap: spacingToCss(props?.spacing ?? 16),
          width: '100%',
          padding: paddingValue
        };
        const style = mergeStyles(baseStyle, component.style);

        return (
          <div className="sandbox-column" style={style}>
            {renderChildren(component, iterationStack)}
          </div>
        );
      }

      case 'Section':
      case 'section': {
        const paddingValue = paddingToCss(props?.padding);
        const spacingValue = spacingToCss(props?.spacing ?? 0);
        const flexDirection = props?.flexDirection ?? 'column';
        const baseStyle = {
          display: 'flex',
          flexDirection,
          gap: spacingValue,
          alignItems: props?.alignItems,
          justifyContent: props?.justifyContent,
          padding: paddingValue,
          background: props?.background ?? component.style?.background ?? 'transparent',
          width: props?.width ?? component.style?.width ?? '100%'
        };
        const style = mergeStyles(baseStyle, component.style);

        return (
          <div
            className="sandbox-section"
            style={style}
            data-slot={props?.slot || undefined}
          >
            {renderChildren(component, iterationStack)}
          </div>
        );
      }

      case 'container': {
        const paddingValue = paddingToCss(props?.padding ?? 0);
        const style = mergeStyles(
          {
            display: 'flex',
            flexDirection: 'column',
            gap: spacingToCss(props?.spacing ?? 16),
            padding: paddingValue,
            background: props?.background || 'transparent',
            borderRadius: props?.borderRadius || component.style?.borderRadius || '16px',
            border: props?.border || component.style?.border || '1px solid rgba(148, 163, 184, 0.12)',
            boxShadow: component.style?.boxShadow || '0 16px 32px rgba(15, 23, 42, 0.12)'
          },
          component.style
        );

        return (
          <div className="sandbox-container" style={style}>
            {renderChildren(component, iterationStack)}
          </div>
        );
      }

      case 'row': {
        const paddingValue = paddingToCss(props?.padding);
        const baseStyle = {
          display: 'flex',
          flexDirection: 'row',
          gap: spacingToCss(props?.spacing ?? 16),
          padding: paddingValue,
          width: '100%'
        };
        const style = mergeStyles(baseStyle, component.style);

        return (
          <div className="sandbox-row" style={style}>
            {renderChildren(component, iterationStack)}
          </div>
        );
      }

      case 'button': {
        const rawText = resolveBinding(props?.text, 'Кнопка');
        const textValue = formatForDisplay(rawText);
        const variant = resolveProp(props, 'variant', 'primary');
        const size = resolveProp(props, 'size', 'medium');
        const widgetStyle = resolveWidgetStyles('button', { variant, size });
        const style = mergeStyles(widgetStyle?.style ?? {}, component.style);
        const rawEventName = resolveProp(props, 'event', component?.event ?? null);
        const eventName = typeof rawEventName === 'string' ? rawEventName.trim() : '';
        const disabledProp = Boolean(resolveProp(props, 'disabled', false));
        const isDisabled = disabledProp || (isEventPending && eventName);
        const handleClick = () => {
          if (!eventName || typeof onEvent !== 'function') {
            return;
          }
          onEvent(eventName);
        };

        return (
          <button
            type="button"
            className={`canvas-button ${variant} ${size}`}
            style={style}
            onClick={handleClick}
            disabled={isDisabled}
            data-event={eventName || undefined}
          >
            {textValue}
          </button>
        );
      }

      case 'text': {
        const rawContent = resolveBinding(props?.content, 'Текст');
        const contentValue = formatForDisplay(rawContent);
        const variant = resolveProp(props, 'variant', 'body');
        const color = resolveProp(props, 'color', undefined);
        const className = `canvas-text ${variant}`;
        const style = mergeStyles({ color }, component.style);

        return (
          <div className={className} style={style}>
            {contentValue}
          </div>
        );
      }

      case 'input': {
        const inputType = resolveProp(props, 'type', 'text');
        const rawPlaceholder = resolveBinding(props?.placeholder, '');
        const placeholder = formatForDisplay(rawPlaceholder);
        const required = Boolean(resolveProp(props, 'required', false));
        const name = resolveProp(props, 'name', component?.name ?? '');
        const helperText = resolveProp(props, 'helperText', undefined);
        const resolvedValue = resolveBinding(props?.value, undefined);
        const valueFromForm = (name && Object.prototype.hasOwnProperty.call(formValues, name))
          ? formValues[name]
          : resolvedValue;
        const value = valueFromForm ?? '';
        const editable = Boolean(name && typeof onInputChange === 'function');
        const style = mergeStyles(
          {
            width: '100%'
          },
          component.style
        );

        const handleChange = (event) => {
          if (!editable) {
            return;
          }
          onInputChange(name, event.target.value);
        };

        return (
          <div className="sandbox-input-wrapper">
            <input
              type={inputType}
              name={name || undefined}
              placeholder={placeholder}
              className="canvas-input"
              style={style}
              required={required}
              readOnly={!editable}
              value={value}
              onChange={handleChange}
            />
            {helperText ? (
              <p className="sandbox-input-helper">{formatForDisplay(helperText)}</p>
            ) : null}
          </div>
        );
      }

      case 'image': {
        const srcValue = resolveBinding(props?.src, '')
          || props?.placeholder
          || 'https://via.placeholder.com/640x360';
        const altValue = String(resolveBinding(props?.alt, ''));
        const style = mergeStyles({}, component.style);

        return (
          <img
            src={srcValue}
            alt={altValue || 'Image'}
            className="canvas-image"
            style={style}
          />
        );
      }

      case 'list': {
        const normalizeItems = (value) => {
          if (Array.isArray(value)) {
            return value;
          }
          if (value === null || value === undefined) {
            return [];
          }
          if (typeof value === 'number' && Number.isFinite(value)) {
            const count = Math.max(0, Math.floor(value));
            return Array.from({ length: count }, (_, idx) => idx + 1);
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
              // ignore parse errors
            }
            return trimmed
              .split(/\r?\n|,/)
              .map((item) => item.trim())
              .filter((item) => item.length > 0);
          }
          if (typeof value === 'object') {
            return Object.values(value);
          }
          return [];
        };

        const rawItems = resolveBinding(props?.items, []);
        const itemsArray = normalizeItems(rawItems);
        const variant = resolveProp(props, 'variant', 'unordered');
        const displayPath = resolveProp(props, 'displayPath', undefined);
        const aliasValue = resolveProp(props, 'itemAlias', 'item');
        const alias = typeof aliasValue === 'string' && aliasValue.trim().length > 0
          ? aliasValue.trim()
          : 'item';
        const templateChildren = (component.children || [])
          .map((childRef) => (typeof childRef === 'string' ? componentsMap.get(childRef) : childRef))
          .filter(Boolean);
        const listSpacing = resolveProp(props, 'spacing', undefined);
        const baseStyle = templateChildren.length > 0
          ? {
              listStyleType: 'none',
              padding: 0,
              margin: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: spacingToCss(listSpacing ?? 16)
            }
          : {
              paddingLeft: '20px'
            };
        const ListTag = variant === 'ordered' ? 'ol' : 'ul';
        const style = mergeStyles(baseStyle, component.style);

        if (templateChildren.length === 0) {
          return (
            <ListTag className="canvas-list" style={style}>
              {itemsArray.map((item, index) => (
                <li key={`${component.id}-item-${index}`}>
                  {formatForDisplay(item, displayPath)}
                </li>
              ))}
            </ListTag>
          );
        }

        const total = itemsArray.length;

        return (
          <ListTag className="canvas-list" style={style}>
            {total > 0 ? (
              itemsArray.map((item, index) => {
                const frame = { alias, item, index, total };
                const nextStack = [...iterationStack, frame];
                return (
                  <li
                    key={`${component.id}-item-${index}`}
                    style={{ listStyle: 'none' }}
                  >
                    {templateChildren.map((child) => (
                      <div
                        key={`${child.id || 'child'}-${index}`}
                        className="sandbox-component-wrapper"
                      >
                        {renderComponent(child, nextStack)}
                      </div>
                    ))}
                  </li>
                );
              })
            ) : (
              <li className="list-placeholder" style={{ listStyle: 'none' }}>
                Нет элементов
              </li>
            )}
          </ListTag>
        );
      }

      default:
        return (
          <div className="sandbox-unsupported">
            <span>Компонент {component.type} пока не поддержан</span>
          </div>
        );
    }
  };

  return (
    <div className="sandbox-renderer">
      {renderComponent(rootComponent ?? virtualRoot)}
    </div>
  );
};

export default SandboxScreenRenderer;
