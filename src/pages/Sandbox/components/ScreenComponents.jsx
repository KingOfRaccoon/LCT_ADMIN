import React, { useCallback, useMemo } from 'react';
import { resolveBindingValue } from '../utils/bindings';

/**
 * ФАЗА 2: Мемоизированные компоненты для оптимизации рендеринга
 * 
 * Каждый компонент обернут в React.memo с кастомной функцией сравнения
 * для предотвращения лишних перерисовок при изменении родительского контекста
 */

// ============================================================================
// Button Component
// ============================================================================

export const ButtonComponent = React.memo(({
  component,
  context,
  iterationStack = [],
  onEvent,
  isEventPending,
  trackClick,
  activeScreenId,
  activeScreenName
}) => {
  const props = component?.props ?? component?.properties ?? {};
  
  // Резолвим пропсы один раз с iterationStack
  const text = resolveBindingValue(props?.text, context, 'Кнопка', { iterationStack });
  const label = resolveBindingValue(props?.label, context, undefined, { iterationStack });
  const variant = resolveBindingValue(props?.variant, context, 'primary', { iterationStack });
  const size = resolveBindingValue(props?.size, context, 'medium', { iterationStack });
  const disabled = Boolean(resolveBindingValue(props?.disabled, context, false, { iterationStack }));
  
  const eventName = typeof props?.event === 'string' ? props.event.trim() : '';
  const rawEventParams = props?.eventParams || {};
  
  // Резолвим eventParams с учётом iterationStack
  const eventParams = useMemo(() => {
    const resolved = {};
    for (const [key, value] of Object.entries(rawEventParams)) {
      resolved[key] = resolveBindingValue(value, context, undefined, { iterationStack });
    }
    return resolved;
  }, [rawEventParams, context, iterationStack]);
  
  const handleClick = useCallback(() => {
    trackClick({
      componentId: component.id,
      componentType: component.type,
      screenId: activeScreenId,
      screenName: activeScreenName,
      label: label || text,
      eventName: eventName || null
    });
    
    if (eventName && typeof onEvent === 'function') {
      onEvent(eventName, eventParams);
    }
  }, [component.id, component.type, eventName, JSON.stringify(eventParams), onEvent, trackClick, activeScreenId, activeScreenName, label, text]);
  
  const isDisabled = disabled || (isEventPending && eventName);
  
  return (
    <button
      type="button"
      className={`canvas-button ${variant} ${size}`}
      style={component.style}
      onClick={handleClick}
      disabled={isDisabled}
      data-event={eventName || undefined}
    >
      {label || text}
    </button>
  );
}, (prevProps, nextProps) => {
  // Кастомное сравнение для оптимизации
  // Перерисовываем только если действительно изменились нужные данные
  return (
    prevProps.component.id === nextProps.component.id &&
    prevProps.component.style === nextProps.component.style &&
    JSON.stringify(prevProps.component.props) === JSON.stringify(nextProps.component.props) &&
    prevProps.context === nextProps.context &&
    prevProps.iterationStack === nextProps.iterationStack &&
    prevProps.isEventPending === nextProps.isEventPending
  );
});

ButtonComponent.displayName = 'ButtonComponent';

// ============================================================================
// Text Component
// ============================================================================

export const TextComponent = React.memo(({ component, context, iterationStack = [] }) => {
  const props = component?.props ?? component?.properties ?? {};
  const content = resolveBindingValue(props?.content, context, 'Текст', { iterationStack });
  const variant = resolveBindingValue(props?.variant, context, 'body', { iterationStack });
  const color = resolveBindingValue(props?.color, context, undefined, { iterationStack });
  
  return (
    <div 
      className={`canvas-text ${variant}`} 
      style={{ color, ...component.style }}
    >
      {content}
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.component.id === nextProps.component.id &&
    prevProps.component.style === nextProps.component.style &&
    JSON.stringify(prevProps.component.props) === JSON.stringify(nextProps.component.props) &&
    prevProps.context === nextProps.context &&
    prevProps.iterationStack === nextProps.iterationStack
  );
});

TextComponent.displayName = 'TextComponent';

// ============================================================================
// Image Component
// ============================================================================

export const ImageComponent = React.memo(({ component, context, iterationStack = [] }) => {
  const props = component?.props ?? component?.properties ?? {};
  const src = resolveBindingValue(props?.src, context, '', { iterationStack }) 
    || props?.placeholder 
    || 'https://via.placeholder.com/640x360';
  const alt = String(resolveBindingValue(props?.alt, context, 'Image', { iterationStack }));
  
  return (
    <img
      src={src}
      alt={alt}
      className="canvas-image"
      style={component.style}
    />
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.component.id === nextProps.component.id &&
    prevProps.component.style === nextProps.component.style &&
    JSON.stringify(prevProps.component.props) === JSON.stringify(nextProps.component.props) &&
    prevProps.context === nextProps.context &&
    prevProps.iterationStack === nextProps.iterationStack
  );
});

ImageComponent.displayName = 'ImageComponent';

// ============================================================================
// Input Component
// ============================================================================

export const InputComponent = React.memo(({ component, context, iterationStack = [], onInputChange }) => {
  const props = component?.props ?? component?.properties ?? {};
  const placeholder = resolveBindingValue(props?.placeholder, context, 'Введите текст...', { iterationStack });
  const inputType = resolveBindingValue(props?.type, context, 'text', { iterationStack });
  const disabled = Boolean(resolveBindingValue(props?.disabled, context, false, { iterationStack }));
  const contextKey = props?.contextKey;
  
  // Получаем текущее значение из контекста
  const value = contextKey ? (context[contextKey] ?? '') : '';
  
  const handleChange = useCallback((e) => {
    if (contextKey && typeof onInputChange === 'function') {
      onInputChange(contextKey, e.target.value);
    }
  }, [contextKey, onInputChange]);
  
  return (
    <input
      type={inputType}
      className="canvas-input"
      style={component.style}
      placeholder={placeholder}
      value={value}
      onChange={handleChange}
      disabled={disabled}
    />
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.component.id === nextProps.component.id &&
    prevProps.component.style === nextProps.component.style &&
    JSON.stringify(prevProps.component.props) === JSON.stringify(nextProps.component.props) &&
    prevProps.context === nextProps.context &&
    prevProps.iterationStack === nextProps.iterationStack
  );
});

InputComponent.displayName = 'InputComponent';

// ============================================================================
// List Item Component (для оптимизации рендеринга списков)
// ============================================================================

export const ListItemComponent = React.memo(({ 
  item, 
  index, 
  component,
  context,
  renderTemplate,
  itemKey
}) => {
  if (renderTemplate && typeof renderTemplate === 'function') {
    return renderTemplate(item, index);
  }
  
  // Fallback: простое отображение
  const formatForDisplay = (val) => {
    if (val == null) return '';
    if (typeof val === 'object') return JSON.stringify(val, null, 2);
    return String(val);
  };
  
  return (
    <li 
      key={itemKey}
      className="canvas-list-item" 
      style={component.style}
    >
      {formatForDisplay(item)}
    </li>
  );
}, (prevProps, nextProps) => {
  // Сравниваем только то, что влияет на рендеринг
  return (
    prevProps.itemKey === nextProps.itemKey &&
    prevProps.item === nextProps.item &&
    prevProps.index === nextProps.index &&
    prevProps.component.style === nextProps.component.style
  );
});

ListItemComponent.displayName = 'ListItemComponent';

// ============================================================================
// Column Component (контейнер с flex-direction: column)
// ============================================================================

export const ColumnComponent = React.memo(({ 
  component, 
  context,
  iterationStack = [],
  children,
  baseStyles 
}) => {
  const props = component?.props ?? component?.properties ?? {};
  const spacingValue = props?.spacing ?? 0;
  
  const spacingToCss = (spacing) => {
    if (typeof spacing === 'number') return `${spacing}px`;
    if (typeof spacing === 'string') {
      if (/^\d+$/.test(spacing)) return `${spacing}px`;
      return spacing;
    }
    return '0px';
  };
  
  const style = {
    ...baseStyles?.column,
    gap: spacingToCss(spacingValue),
    ...component.style
  };
  
  return (
    <div className="canvas-column" style={style}>
      {children}
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.component.id === nextProps.component.id &&
    prevProps.component.style === nextProps.component.style &&
    JSON.stringify(prevProps.component.props) === JSON.stringify(nextProps.component.props) &&
    prevProps.children === nextProps.children &&
    prevProps.iterationStack === nextProps.iterationStack
  );
});

ColumnComponent.displayName = 'ColumnComponent';

// ============================================================================
// Row Component (контейнер с flex-direction: row)
// ============================================================================

export const RowComponent = React.memo(({ 
  component, 
  context,
  iterationStack = [],
  children,
  baseStyles 
}) => {
  const props = component?.props ?? component?.properties ?? {};
  const spacingValue = props?.spacing ?? 0;
  
  const spacingToCss = (spacing) => {
    if (typeof spacing === 'number') return `${spacing}px`;
    if (typeof spacing === 'string') {
      if (/^\d+$/.test(spacing)) return `${spacing}px`;
      return spacing;
    }
    return '0px';
  };
  
  const style = {
    ...baseStyles?.row,
    gap: spacingToCss(spacingValue),
    ...component.style
  };
  
  return (
    <div className="canvas-row" style={style}>
      {children}
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.component.id === nextProps.component.id &&
    prevProps.component.style === nextProps.component.style &&
    JSON.stringify(prevProps.component.props) === JSON.stringify(nextProps.component.props) &&
    prevProps.children === nextProps.children &&
    prevProps.iterationStack === nextProps.iterationStack
  );
});

RowComponent.displayName = 'RowComponent';

// ============================================================================
// Container Component
// ============================================================================

export const ContainerComponent = React.memo(({ 
  component, 
  context,
  iterationStack = [],
  children,
  baseStyles 
}) => {
  const props = component?.props ?? component?.properties ?? {};
  const spacingValue = props?.spacing ?? 0;
  
  const spacingToCss = (spacing) => {
    if (typeof spacing === 'number') return `${spacing}px`;
    if (typeof spacing === 'string') {
      if (/^\d+$/.test(spacing)) return `${spacing}px`;
      return spacing;
    }
    return '0px';
  };
  
  const style = {
    ...baseStyles?.container,
    gap: spacingToCss(spacingValue),
    ...component.style
  };
  
  return (
    <div className="canvas-container" style={style}>
      {children}
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.component.id === nextProps.component.id &&
    prevProps.component.style === nextProps.component.style &&
    JSON.stringify(prevProps.component.props) === JSON.stringify(nextProps.component.props) &&
    prevProps.children === nextProps.children &&
    prevProps.iterationStack === nextProps.iterationStack
  );
});

ContainerComponent.displayName = 'ContainerComponent';

// ============================================================================
// Card Component
// ============================================================================

export const CardComponent = React.memo(({
  component,
  context,
  iterationStack = [],
  onEvent,
  isEventPending,
  trackClick,
  activeScreenId,
  activeScreenName,
  children
}) => {
  const props = component?.props ?? component?.properties ?? {};
  
  const eventName = typeof props?.event === 'string' ? props.event.trim() : '';
  const rawEventParams = props?.eventParams || {};
  
  // Резолвим eventParams с учётом iterationStack
  const eventParams = useMemo(() => {
    const resolved = {};
    for (const [key, value] of Object.entries(rawEventParams)) {
      resolved[key] = resolveBindingValue(value, context, undefined, { iterationStack });
    }
    return resolved;
  }, [rawEventParams, context, iterationStack]);
  
  const handleClick = useCallback(() => {
    trackClick({
      componentId: component.id,
      componentType: component.type,
      screenId: activeScreenId,
      screenName: activeScreenName,
      label: component.id || 'card',
      eventName: eventName || null
    });
    
    if (eventName && typeof onEvent === 'function') {
      onEvent(eventName, eventParams);
    }
  }, [component.id, component.type, eventName, JSON.stringify(eventParams), onEvent, trackClick, activeScreenId, activeScreenName]);
  
  const isDisabled = isEventPending && eventName;
  
  return (
    <div
      className="canvas-card"
      style={{
        ...component.style,
        cursor: eventName ? 'pointer' : component.style?.cursor,
        pointerEvents: isDisabled ? 'none' : 'auto',
        opacity: isDisabled ? 0.6 : component.style?.opacity
      }}
      onClick={eventName ? handleClick : undefined}
      data-event={eventName || undefined}
    >
      {children}
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.component.id === nextProps.component.id &&
    prevProps.component.style === nextProps.component.style &&
    JSON.stringify(prevProps.component.props) === JSON.stringify(nextProps.component.props) &&
    prevProps.context === nextProps.context &&
    prevProps.iterationStack === nextProps.iterationStack &&
    prevProps.isEventPending === nextProps.isEventPending &&
    prevProps.children === nextProps.children
  );
});

CardComponent.displayName = 'CardComponent';
