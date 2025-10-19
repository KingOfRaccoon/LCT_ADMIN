import { useMemo } from 'react';
import {
  resolveBindingValue,
  resolvePropValue,
  isBindingValue
} from './utils/bindings';
import { resolveWidgetStyles } from '../../styles/resolveWidgetStyles';
import { useAnalyticsOptional } from '../../services/analytics';
import { useRenderPerformance } from './hooks/useRenderPerformance';
// ✅ ФАЗА 2: Импорт мемоизированных компонентов
import {
  ButtonComponent,
  TextComponent,
  ImageComponent,
  IconComponent,
  InputComponent,
  ColumnComponent,
  RowComponent,
  ContainerComponent,
  CardComponent
} from './components/ScreenComponents';
import { useBindingCache } from './hooks/useBindingCache';
// ✅ ФАЗА 3: Импорт виртуализированного списка
import { SmartList, useVirtualization } from './components/VirtualizedList';
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
  const { trackClick } = useAnalyticsOptional();
  const components = useMemo(() => (screen?.components ?? []), [screen?.components]);
  const activeScreenId = screen?.id ?? screen?.screenId ?? null;
  const activeScreenName = screen?.name ?? screen?.title ?? (activeScreenId ? String(activeScreenId) : null);
  
  // ✅ ФАЗА 2.2: Кэширование биндингов для ускорения рендеринга
  const { resolveCached, logStats } = useBindingCache(context);
  
  // 📊 Performance tracking
  useRenderPerformance(
    'SandboxScreenRenderer',
    activeScreenId,
    components.length,
    true // включено для сбора baseline метрик
  );

  // ✅ ФАЗА 1.3: Оптимизированное создание componentsMap
  const componentsMap = useMemo(() => {
    if (!components || components.length === 0) {
      return new Map();
    }
    
    // Более эффективная реализация с filter и map
    return new Map(
      components
        .filter(c => c?.id) // Фильтруем компоненты без ID
        .map(c => [c.id, c])
    );
  }, [components]);
  
  // ✅ ФАЗА 1.2: Кэширование базовых стилей компонентов
  const baseStyles = useMemo(() => ({
    screen: {
      width: '100%',
      minHeight: '640px',
      borderRadius: '32px',
      overflow: 'hidden',
      background: '#ffffff',
      display: 'flex',
      flexDirection: 'column'
    },
    column: {
      display: 'flex',
      flexDirection: 'column',
      width: '100%'
    },
    section: {
      display: 'flex',
      width: '100%'
    },
    container: {
      display: 'flex',
      flexDirection: 'column',
      borderRadius: '16px',
      border: '1px solid rgba(148, 163, 184, 0.12)',
      boxShadow: '0 16px 32px rgba(15, 23, 42, 0.12)'
    },
    row: {
      display: 'flex',
      flexDirection: 'row',
      width: '100%'
    }
  }), []);

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

      // ✅ ФАЗА 1.1: Улучшенные keys - используем стабильный ID вместо индекса
      const stableKey = child.id || `${component.id || 'parent'}-child-${idx}`;

      return (
        <div key={stableKey} className="sandbox-component-wrapper">
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
        // ✅ ФАЗА 1.2: Используем кэшированный baseStyle
        const style = mergeStyles(
          {
            ...baseStyles.screen,
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
        // ✅ ФАЗА 2.4: Используем мемоизированный ColumnComponent
        return (
          <ColumnComponent
            component={component}
            context={context}
            iterationStack={iterationStack}
            baseStyles={baseStyles}
          >
            {renderChildren(component, iterationStack)}
          </ColumnComponent>
        );
      }

      case 'Section':
      case 'section': {
        const paddingValue = paddingToCss(props?.padding);
        const spacingValue = spacingToCss(props?.spacing ?? 0);
        const flexDirection = props?.flexDirection ?? 'column';
        // ✅ ФАЗА 1.2: Используем кэшированный baseStyle
        const style = mergeStyles(
          {
            ...baseStyles.section,
            flexDirection,
            gap: spacingValue,
            alignItems: props?.alignItems,
            justifyContent: props?.justifyContent,
            padding: paddingValue,
            background: props?.background ?? component.style?.background ?? 'transparent',
            width: props?.width ?? component.style?.width ?? '100%'
          },
          component.style
        );

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
        // ✅ ФАЗА 2.4: Используем мемоизированный ContainerComponent
        return (
          <ContainerComponent
            component={component}
            context={context}
            iterationStack={iterationStack}
            baseStyles={baseStyles}
          >
            {renderChildren(component, iterationStack)}
          </ContainerComponent>
        );
      }

      case 'row': {
        // ✅ ФАЗА 2.4: Используем мемоизированный RowComponent
        return (
          <RowComponent
            component={component}
            context={context}
            iterationStack={iterationStack}
            baseStyles={baseStyles}
          >
            {renderChildren(component, iterationStack)}
          </RowComponent>
        );
      }

      case 'button': {
        // ✅ ФАЗА 2.4: Используем мемоизированный ButtonComponent
        return (
          <ButtonComponent
            component={component}
            context={context}
            iterationStack={iterationStack}
            onEvent={onEvent}
            isEventPending={isEventPending}
            trackClick={trackClick}
            activeScreenId={activeScreenId}
            activeScreenName={activeScreenName}
          />
        );
      }

      case 'card': {
        // Кликабельная карточка с поддержкой событий и локального контекста
        return (
          <CardComponent
            component={component}
            context={context}
            iterationStack={iterationStack}
            onEvent={onEvent}
            onInputChange={onInputChange}
            isEventPending={isEventPending}
            trackClick={trackClick}
            activeScreenId={activeScreenId}
            activeScreenName={activeScreenName}
          >
            {renderChildren(component, iterationStack)}
          </CardComponent>
        );
      }

      case 'checkbox': {
        const label = resolveProp(props, 'label', '');
        const checked = Boolean(resolveProp(props, 'checked', false));
        const rawEventName = resolveProp(props, 'event', component?.event ?? null);
        const eventName = typeof rawEventName === 'string' ? rawEventName.trim() : '';
        const disabledProp = Boolean(resolveProp(props, 'disabled', false));
        const isDisabled = disabledProp || (isEventPending && eventName);
        
        // Резолвим eventParams с учётом iterationStack
        const rawEventParams = props?.eventParams || {};
        const eventParams = {};
        for (const [key, value] of Object.entries(rawEventParams)) {
          eventParams[key] = resolveBindingValue(value, context, undefined, { iterationStack });
        }
        
        const handleChange = () => {
          trackClick({
            componentId: component.id ?? null,
            componentType: component.type,
            screenId: activeScreenId,
            screenName: activeScreenName,
            label: label || component.id || 'checkbox',
            eventName: eventName || null
          });
          if (!eventName || typeof onEvent !== 'function') {
            return;
          }
          onEvent(eventName, eventParams);
        };

        const style = mergeStyles({}, component.style);

        return (
          <label className="canvas-checkbox" style={style}>
            <input
              type="checkbox"
              checked={checked}
              onChange={handleChange}
              disabled={isDisabled}
              data-event={eventName || undefined}
            />
            {label && <span className="canvas-checkbox-label">{label}</span>}
          </label>
        );
      }

      case 'text': {
        // ✅ ФАЗА 2.4: Используем мемоизированный TextComponent
        return (
          <TextComponent
            component={component}
            context={context}
            iterationStack={iterationStack}
          />
        );
      }

      case 'input': {
        // ✅ ФАЗА 2.4: Используем мемоизированный InputComponent
        return (
          <InputComponent
            component={component}
            context={context}
            iterationStack={iterationStack}
            onInputChange={onInputChange}
          />
        );
      }

      case 'image': {
        // ✅ ФАЗА 2.4: Используем мемоизированный ImageComponent
        return (
          <ImageComponent
            component={component}
            context={context}
            iterationStack={iterationStack}
          />
        );
      }

      case 'icon': {
        // ✅ ФАЗА 2.4: Используем мемоизированный IconComponent
        return (
          <IconComponent
            component={component}
            context={context}
            iterationStack={iterationStack}
          />
        );
      }

      case 'list': {
        const props = readProps(component);
        
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

        // Support both 'items' (legacy) and 'dataSource' (new format)
        const dataSource = props?.dataSource ?? props?.items;
        
        const rawItems = resolveBindingValue(dataSource, context, [], { iterationStack });
        
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
              {itemsArray.map((item, index) => {
                // ✅ ФАЗА 1.1: Используем item.id если доступно для стабильного key
                const itemKey = (item && typeof item === 'object' && item.id) 
                  ? `${component.id}-${item.id}` 
                  : `${component.id}-item-${index}`;
                
                return (
                  <li key={itemKey}>
                    {formatForDisplay(item, displayPath)}
                  </li>
                );
              })}
            </ListTag>
          );
        }

        const total = itemsArray.length;

        // ✅ ФАЗА 3: Виртуализация для больших списков (50+ элементов)
        if (templateChildren.length > 0 && total >= 50) {
          // Определяем высоту элемента (можно настроить через props)
          const itemHeight = parseInt(props?.itemHeight) || 100;
          const enableVirtualization = props?.enableVirtualization !== false;
          
          // Используем hook для управления виртуализацией
          const { containerHeight, stats } = useVirtualization(itemsArray, {
            itemHeight,
            maxHeight: 600,
            enableVirtualization
          });
          
          // Логируем статистику виртуализации
          if (stats.shouldVirtualize) {
            console.log('🚀 [Virtualization] List stats:', {
              componentId: component.id,
              ...stats
            });
          }
          
          // Функция рендеринга одного элемента для виртуализации
          const renderVirtualItem = ({ index, style: itemStyle, data }) => {
            const item = data;
            const frame = { alias, item, index, total };
            const nextStack = [...iterationStack, frame];
            
            const itemKey = (item && typeof item === 'object' && item.id) 
              ? `${component.id}-${item.id}` 
              : `${component.id}-item-${index}`;
            
            return (
              <div
                key={itemKey}
                style={{ ...itemStyle, listStyle: 'none' }}
              >
                {templateChildren.map((child) => {
                  const childKey = item && typeof item === 'object' && item.id
                    ? `${child.id || 'child'}-${item.id}`
                    : `${child.id || 'child'}-${index}`;
                  
                  return (
                    <div
                      key={childKey}
                      className="sandbox-component-wrapper"
                    >
                      {renderComponent(child, nextStack)}
                    </div>
                  );
                })}
              </div>
            );
          };
          
          // Генератор ключей для элементов
          const getItemKey = (index, item) => {
            return (item && typeof item === 'object' && item.id) 
              ? `${component.id}-${item.id}` 
              : `${component.id}-item-${index}`;
          };
          
          return (
            <div className="canvas-list virtualized" style={style}>
              <SmartList
                items={itemsArray}
                renderItem={renderVirtualItem}
                itemHeight={itemHeight}
                height={containerHeight}
                width="100%"
                overscanCount={5}
                enableVirtualization={enableVirtualization}
                itemKey={getItemKey}
              />
            </div>
          );
        }

        // Обычный рендеринг для небольших списков
        return (
          <ListTag className="canvas-list" style={style}>
            {total > 0 ? (
              itemsArray.map((item, index) => {
                const frame = { alias, item, index, total };
                const nextStack = [...iterationStack, frame];
                
                // ✅ ФАЗА 1.1: Используем item.id если доступно для стабильного key
                const itemKey = (item && typeof item === 'object' && item.id) 
                  ? `${component.id}-${item.id}` 
                  : `${component.id}-item-${index}`;
                
                return (
                  <li
                    key={itemKey}
                    style={{ listStyle: 'none' }}
                  >
                    {templateChildren.map((child) => {
                      // ✅ ФАЗА 1.1: Стабильный key для template children
                      const childKey = item && typeof item === 'object' && item.id
                        ? `${child.id || 'child'}-${item.id}`
                        : `${child.id || 'child'}-${index}`;
                      
                      return (
                        <div
                          key={childKey}
                          className="sandbox-component-wrapper"
                        >
                          {renderComponent(child, nextStack)}
                        </div>
                      );
                    })}
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

      case 'divider': {
        // Render horizontal divider/separator
        const computedStyles = mergeStyles(
          {
            borderTop: '1px solid #E5E5E5',
            margin: '8px 0',
            width: '100%'
          },
          component.style
        );

        return <div style={computedStyles} />;
      }

      case 'conditional': {
        // Evaluate condition
        const condition = resolveProp(props, 'condition', false);
        const shouldRender = Boolean(condition);

        // Render children only if condition is true
        if (shouldRender) {
          return <>{renderChildren(component, iterationStack)}</>;
        }

        // Return null if condition is false
        return null;
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
