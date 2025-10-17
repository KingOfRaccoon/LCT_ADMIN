# 🚀 План оптимизации рендер-движка

**Цель:** Улучшить производительность рендеринга экранов на 50-90%  
**Подход:** Пошаговая оптимизация с измерением результатов

---

## 📊 Фаза 1: Быстрые победы (1-2 дня)

### 1.1 Улучшение keys в списках

**Текущая проблема:**
```jsx
// ❌ Плохо: использование индекса
component.children.map((childRef, idx) => (
  <div key={child.id ?? idx}>
    {renderComponent(child, iterationStack)}
  </div>
))
```

**Решение:**
```jsx
// ✅ Хорошо: стабильный уникальный key
component.children.map((childRef, idx) => {
  const child = resolveChild(childRef);
  const stableKey = child?.id || `${component.id}-child-${idx}`;
  
  return (
    <div key={stableKey}>
      {renderComponent(child, iterationStack)}
    </div>
  );
})
```

**Файл:** `src/pages/Sandbox/SandboxScreenRenderer.jsx`  
**Строки:** 104-122

---

### 1.2 Кэширование стилей

**Текущая проблема:**
```jsx
// ❌ Новый объект стиля на каждом рендере
const style = mergeStyles(
  {
    width: '100%',
    minHeight: '640px',
    borderRadius: '32px',
    // ...
  },
  component.style
);
```

**Решение:**
```jsx
// ✅ Мемоизация базовых стилей
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
  // ... остальные типы
}), []);

// В renderComponent:
const baseStyle = baseStyles[component.type] || {};
const style = useMemo(
  () => mergeStyles(baseStyle, component.style, props),
  [baseStyle, component.style, props]
);
```

**Ожидаемый эффект:** 10-15% улучшение

---

### 1.3 Оптимизация componentsMap

**Текущий код:**
```jsx
const componentsMap = useMemo(() => {
  const map = new Map();
  components.forEach((component) => {
    if (component && component.id) map.set(component.id, component);
  });
  return map;
}, [components]);
```

**Оптимизация:**
```jsx
// ✅ Более эффективная реализация
const componentsMap = useMemo(() => {
  if (!components || components.length === 0) {
    return new Map();
  }
  
  return new Map(
    components
      .filter(c => c?.id) // Фильтруем до создания пар
      .map(c => [c.id, c])
  );
}, [components]);
```

**Ожидаемый эффект:** 5-10% улучшение для больших экранов

---

## 📊 Фаза 2: Средние улучшения (3-5 дней)

### 2.1 Разделение на подкомпоненты с мемоизацией

**Создать файл:** `src/pages/Sandbox/components/ScreenComponents.jsx`

```jsx
import React, { useCallback } from 'react';
import { resolveBindingValue } from '../utils/bindings';

// Мемоизированный компонент кнопки
export const ButtonComponent = React.memo(({
  component,
  context,
  onEvent,
  isEventPending,
  trackClick,
  activeScreenId,
  activeScreenName
}) => {
  const props = component?.props ?? component?.properties ?? {};
  
  // Резолвим пропсы один раз
  const text = resolveBindingValue(props?.text, context, 'Кнопка');
  const label = resolveBindingValue(props?.label, context);
  const variant = resolveBindingValue(props?.variant, context, 'primary');
  const size = resolveBindingValue(props?.size, context, 'medium');
  const disabled = Boolean(resolveBindingValue(props?.disabled, context, false));
  
  const eventName = typeof props?.event === 'string' ? props.event.trim() : '';
  const eventParams = props?.eventParams || {};
  
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
  }, [component.id, eventName, eventParams, onEvent, trackClick]);
  
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
  return (
    prevProps.component === nextProps.component &&
    prevProps.context === nextProps.context &&
    prevProps.isEventPending === nextProps.isEventPending &&
    prevProps.onEvent === nextProps.onEvent
  );
});

ButtonComponent.displayName = 'ButtonComponent';

// Аналогично для других компонентов
export const TextComponent = React.memo(({ component, context }) => {
  const props = component?.props ?? component?.properties ?? {};
  const content = resolveBindingValue(props?.content, context, 'Текст');
  const variant = resolveBindingValue(props?.variant, context, 'body');
  const color = resolveBindingValue(props?.color, context);
  
  return (
    <div 
      className={`canvas-text ${variant}`} 
      style={{ color, ...component.style }}
    >
      {content}
    </div>
  );
});

TextComponent.displayName = 'TextComponent';

export const ImageComponent = React.memo(({ component, context }) => {
  const props = component?.props ?? component?.properties ?? {};
  const src = resolveBindingValue(props?.src, context, '') 
    || props?.placeholder 
    || 'https://via.placeholder.com/640x360';
  const alt = String(resolveBindingValue(props?.alt, context, 'Image'));
  
  return (
    <img
      src={src}
      alt={alt}
      className="canvas-image"
      style={component.style}
    />
  );
});

ImageComponent.displayName = 'ImageComponent';

// ... остальные компоненты
```

**Использование в SandboxScreenRenderer:**

```jsx
import {
  ButtonComponent,
  TextComponent,
  ImageComponent,
  // ...
} from './components/ScreenComponents';

const renderComponent = (component, iterationStack = []) => {
  // Общие данные
  const commonProps = {
    component,
    context,
    iterationStack
  };
  
  switch (component.type) {
    case 'button':
      return (
        <ButtonComponent
          {...commonProps}
          onEvent={onEvent}
          isEventPending={isEventPending}
          trackClick={trackClick}
          activeScreenId={activeScreenId}
          activeScreenName={activeScreenName}
        />
      );
      
    case 'text':
      return <TextComponent {...commonProps} />;
      
    case 'image':
      return <ImageComponent {...commonProps} />;
      
    // ... остальные типы
  }
};
```

**Ожидаемый эффект:** 30-50% улучшение для статических компонентов

---

### 2.2 Кэширование резолва биндингов

**Создать файл:** `src/pages/Sandbox/hooks/useBindingCache.js`

```jsx
import { useRef, useCallback, useEffect } from 'react';
import { resolveBindingValue, isBindingValue } from '../utils/bindings';

/**
 * Hook для кэширования результатов резолва биндингов
 * 
 * Значительно ускоряет рендеринг при частых обновлениях context
 */
export const useBindingCache = (context) => {
  const cacheRef = useRef(new Map());
  const statsRef = useRef({ hits: 0, misses: 0 });
  
  // Очищаем кэш при изменении контекста
  useEffect(() => {
    cacheRef.current.clear();
    statsRef.current = { hits: 0, misses: 0 };
  }, [context]);
  
  const getCachedBinding = useCallback((binding, fallback, options = {}) => {
    // Если не биндинг, вернуть как есть
    if (!isBindingValue(binding)) {
      return binding ?? fallback;
    }
    
    // Создаём ключ для кэша
    const key = JSON.stringify({
      ref: binding.reference,
      iter: options.iterationStack || []
    });
    
    // Проверяем кэш
    if (cacheRef.current.has(key)) {
      statsRef.current.hits++;
      return cacheRef.current.get(key);
    }
    
    // Резолвим и кэшируем
    const resolved = resolveBindingValue(binding, context, fallback, options);
    cacheRef.current.set(key, resolved);
    statsRef.current.misses++;
    
    // Ограничиваем размер кэша
    if (cacheRef.current.size > 1000) {
      const firstKey = cacheRef.current.keys().next().value;
      cacheRef.current.delete(firstKey);
    }
    
    return resolved;
  }, [context]);
  
  const getStats = useCallback(() => {
    const { hits, misses } = statsRef.current;
    const total = hits + misses;
    const hitRate = total > 0 ? ((hits / total) * 100).toFixed(1) : 0;
    
    return { hits, misses, total, hitRate: `${hitRate}%` };
  }, []);
  
  return { getCachedBinding, getStats };
};
```

**Использование:**

```jsx
const SandboxScreenRenderer = ({ screen, context, ... }) => {
  const { getCachedBinding, getStats } = useBindingCache(context);
  
  // Логируем статистику в dev mode
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[BindingCache] Stats:', getStats());
    }
  }, [getStats]);
  
  const renderComponent = (component, iterationStack = []) => {
    // Используем кэшированный резолв
    const resolveCached = (binding, fallback) => 
      getCachedBinding(binding, fallback, { iterationStack });
    
    // ...
    case 'text': {
      const content = resolveCached(props?.content, 'Текст');
      // ...
    }
  };
};
```

**Ожидаемый эффект:** 40-60% улучшение при множественном использовании одинаковых биндингов

---

### 2.3 Оптимизация списков

**Создать файл:** `src/pages/Sandbox/components/ListComponent.jsx`

```jsx
import React, { useMemo } from 'react';

/**
 * Мемоизированный элемент списка
 */
const MemoizedListItem = React.memo(({
  item,
  index,
  total,
  alias,
  templateChildren,
  componentsMap,
  renderComponent,
  context
}) => {
  // Создаём iteration frame один раз
  const iterationStack = useMemo(
    () => [{ alias, item, index, total }],
    [alias, item, index, total]
  );
  
  return templateChildren.map((childRef) => {
    const child = typeof childRef === 'string' 
      ? componentsMap.get(childRef) 
      : childRef;
    
    if (!child) return null;
    
    return (
      <div key={child.id || `child-${index}`} className="sandbox-component-wrapper">
        {renderComponent(child, iterationStack)}
      </div>
    );
  });
}, (prevProps, nextProps) => {
  // Оптимизация: пропускаем рендер если item не изменился
  // и другие пропсы тоже не изменились
  return (
    prevProps.item === nextProps.item &&
    prevProps.index === nextProps.index &&
    prevProps.total === nextProps.total &&
    prevProps.alias === nextProps.alias &&
    prevProps.context === nextProps.context
  );
});

MemoizedListItem.displayName = 'MemoizedListItem';

/**
 * Оптимизированный компонент списка
 */
export const ListComponent = React.memo(({
  component,
  context,
  componentsMap,
  renderComponent,
  iterationStack = []
}) => {
  const props = component?.props ?? component?.properties ?? {};
  
  // Нормализация items
  const itemsArray = useMemo(() => {
    const rawItems = resolveBindingValue(
      props?.dataSource ?? props?.items, 
      context, 
      [],
      { iterationStack }
    );
    return normalizeItems(rawItems);
  }, [props?.dataSource, props?.items, context, iterationStack]);
  
  const variant = props?.variant || 'unordered';
  const displayPath = props?.displayPath;
  const alias = props?.itemAlias?.trim() || 'item';
  const spacing = props?.spacing;
  
  // Template children (мемоизируем)
  const templateChildren = useMemo(() => {
    return (component.children || [])
      .map(childRef => 
        typeof childRef === 'string' 
          ? componentsMap.get(childRef) 
          : childRef
      )
      .filter(Boolean);
  }, [component.children, componentsMap]);
  
  const ListTag = variant === 'ordered' ? 'ol' : 'ul';
  
  // Стили (мемоизируем)
  const listStyle = useMemo(() => {
    const baseStyle = templateChildren.length > 0
      ? {
          listStyleType: 'none',
          padding: 0,
          margin: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: spacing ? `${spacing}px` : '16px'
        }
      : {
          paddingLeft: '20px'
        };
    
    return { ...baseStyle, ...component.style };
  }, [templateChildren.length, spacing, component.style]);
  
  // Простой список без шаблонов
  if (templateChildren.length === 0) {
    return (
      <ListTag className="canvas-list" style={listStyle}>
        {itemsArray.map((item, index) => (
          <li key={item.id || `item-${index}`}>
            {formatForDisplay(item, displayPath)}
          </li>
        ))}
      </ListTag>
    );
  }
  
  // Список с шаблонами (мемоизированные элементы)
  return (
    <ListTag className="canvas-list" style={listStyle}>
      {itemsArray.length > 0 ? (
        itemsArray.map((item, index) => {
          // Используем item.id если доступно для стабильного key
          const itemKey = item?.id || `${component.id}-item-${index}`;
          
          return (
            <li key={itemKey} style={{ listStyle: 'none' }}>
              <MemoizedListItem
                item={item}
                index={index}
                total={itemsArray.length}
                alias={alias}
                templateChildren={templateChildren}
                componentsMap={componentsMap}
                renderComponent={renderComponent}
                context={context}
              />
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
});

ListComponent.displayName = 'ListComponent';
```

**Ожидаемый эффект:** 70-90% улучшение для списков с >20 элементами

---

## 📊 Фаза 3: Глубокая оптимизация (1-2 недели)

### 3.1 Инкрементальное обновление экранов

**Создать файл:** `src/pages/Sandbox/hooks/useScreenDiff.js`

```jsx
import { useMemo, useRef, useEffect } from 'react';

/**
 * Сравнивает два компонента на равенство (shallow)
 */
const areComponentsEqual = (comp1, comp2) => {
  if (comp1 === comp2) return true;
  if (!comp1 || !comp2) return false;
  
  return (
    comp1.id === comp2.id &&
    comp1.type === comp2.type &&
    JSON.stringify(comp1.props) === JSON.stringify(comp2.props) &&
    JSON.stringify(comp1.properties) === JSON.stringify(comp2.properties) &&
    JSON.stringify(comp1.style) === JSON.stringify(comp2.style) &&
    JSON.stringify(comp1.children) === JSON.stringify(comp2.children)
  );
};

/**
 * Hook для определения diff между старым и новым экраном
 */
export const useScreenDiff = (screen) => {
  const prevScreenRef = useRef(null);
  
  const diff = useMemo(() => {
    const prevScreen = prevScreenRef.current;
    
    // Первый рендер
    if (!prevScreen) {
      return {
        type: 'initial',
        isFullReplace: true,
        changedComponents: new Set()
      };
    }
    
    // Совсем другой экран
    if (prevScreen.id !== screen?.id) {
      return {
        type: 'different-screen',
        isFullReplace: true,
        changedComponents: new Set()
      };
    }
    
    // Тот же экран - проверяем компоненты
    const prevComponents = prevScreen.components || [];
    const newComponents = screen.components || [];
    
    const prevMap = new Map(prevComponents.map(c => [c.id, c]));
    const newMap = new Map(newComponents.map(c => [c.id, c]));
    
    const changedComponents = new Set();
    const addedComponents = new Set();
    const removedComponents = new Set();
    
    // Находим изменённые и удалённые
    for (const [id, prevComp] of prevMap) {
      const newComp = newMap.get(id);
      
      if (!newComp) {
        removedComponents.add(id);
      } else if (!areComponentsEqual(prevComp, newComp)) {
        changedComponents.add(id);
      }
    }
    
    // Находим добавленные
    for (const [id] of newMap) {
      if (!prevMap.has(id)) {
        addedComponents.add(id);
      }
    }
    
    const hasChanges = 
      changedComponents.size > 0 ||
      addedComponents.size > 0 ||
      removedComponents.size > 0;
    
    return {
      type: 'same-screen',
      isFullReplace: false,
      hasChanges,
      changedComponents,
      addedComponents,
      removedComponents,
      // Процент изменённых компонентов
      changeRate: newComponents.length > 0
        ? ((changedComponents.size + addedComponents.size) / newComponents.length) * 100
        : 0
    };
  }, [screen]);
  
  // Сохраняем текущий экран для следующего сравнения
  useEffect(() => {
    prevScreenRef.current = screen;
  }, [screen]);
  
  return diff;
};
```

**Использование в SandboxScreenRenderer:**

```jsx
const SandboxScreenRenderer = ({ screen, context, ... }) => {
  const screenDiff = useScreenDiff(screen);
  
  // Логируем diff в dev mode
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[ScreenDiff]', {
        type: screenDiff.type,
        isFullReplace: screenDiff.isFullReplace,
        hasChanges: screenDiff.hasChanges,
        changeRate: `${screenDiff.changeRate?.toFixed(1)}%`,
        changed: screenDiff.changedComponents?.size || 0,
        added: screenDiff.addedComponents?.size || 0,
        removed: screenDiff.removedComponents?.size || 0
      });
    }
  }, [screenDiff]);
  
  // Можем использовать diff для оптимизации
  // Например, пропускать рендер неизменённых компонентов
  const shouldRenderComponent = useCallback((componentId) => {
    if (screenDiff.isFullReplace) return true;
    if (!screenDiff.hasChanges) return false; // Ничего не изменилось!
    
    return (
      screenDiff.changedComponents.has(componentId) ||
      screenDiff.addedComponents.has(componentId)
    );
  }, [screenDiff]);
  
  // ...
};
```

**Ожидаемый эффект:** 50-70% улучшение при обновлениях того же экрана

---

### 3.2 Виртуализация для длинных списков

**Установить зависимость:**
```bash
npm install react-window
```

**Обновить ListComponent:**

```jsx
import { FixedSizeList } from 'react-window';

export const ListComponent = ({ ... }) => {
  // ... существующий код
  
  // Порог для включения виртуализации
  const VIRTUALIZATION_THRESHOLD = 50;
  const shouldVirtualize = itemsArray.length > VIRTUALIZATION_THRESHOLD;
  
  // Виртуализированный рендер
  if (shouldVirtualize && templateChildren.length > 0) {
    const itemHeight = 80; // Можно сделать динамическим
    const listHeight = Math.min(600, itemsArray.length * itemHeight);
    
    return (
      <FixedSizeList
        height={listHeight}
        itemCount={itemsArray.length}
        itemSize={itemHeight}
        width="100%"
        className="canvas-list-virtualized"
      >
        {({ index, style }) => (
          <div style={style}>
            <MemoizedListItem
              item={itemsArray[index]}
              index={index}
              total={itemsArray.length}
              alias={alias}
              templateChildren={templateChildren}
              componentsMap={componentsMap}
              renderComponent={renderComponent}
              context={context}
            />
          </div>
        )}
      </FixedSizeList>
    );
  }
  
  // Обычный рендер для маленьких списков
  return (
    <ListTag className="canvas-list" style={listStyle}>
      {/* ... существующий код */}
    </ListTag>
  );
};
```

**Ожидаемый эффект:** 90-95% улучшение для списков с >100 элементами

---

## 📈 Измерение производительности

**Создать файл:** `src/pages/Sandbox/hooks/useRenderPerformance.js`

```jsx
import { useEffect, useRef } from 'react';

export const useRenderPerformance = (screenId, componentsCount, enabled = true) => {
  const renderStartRef = useRef(0);
  const renderCountRef = useRef(0);
  
  // Засекаем начало рендера
  renderStartRef.current = performance.now();
  renderCountRef.current++;
  
  useEffect(() => {
    if (!enabled) return;
    
    const renderTime = performance.now() - renderStartRef.current;
    
    console.log(`[Performance] Render #${renderCountRef.current}`, {
      screenId,
      renderTime: `${renderTime.toFixed(2)}ms`,
      componentsCount,
      avgTimePerComponent: `${(renderTime / componentsCount).toFixed(2)}ms`
    });
    
    // Можно отправить в аналитику
    if (window.trackPerformance) {
      window.trackPerformance({
        type: 'screen-render',
        screenId,
        renderTime,
        componentsCount,
        renderCount: renderCountRef.current
      });
    }
  });
};
```

**Использование:**

```jsx
const SandboxScreenRenderer = ({ screen, context, ... }) => {
  const components = useMemo(() => screen?.components ?? [], [screen?.components]);
  
  useRenderPerformance(
    screen?.id,
    components.length,
    process.env.NODE_ENV === 'development'
  );
  
  // ...
};
```

---

## ✅ Чек-лист перед релизом

- [ ] Все unit-тесты проходят
- [ ] Snapshot-тесты обновлены
- [ ] Performance тесты показывают улучшение
- [ ] Проверены все форматы экранов (components, sections)
- [ ] Проверена работа со списками (empty, small, large)
- [ ] Проверены все типы биндингов
- [ ] Проверена обратная совместимость
- [ ] Код-ревью пройдено
- [ ] Документация обновлена
- [ ] Changelog обновлён

---

## 🎯 Следующие шаги

1. **Начать с Фазы 1** - быстрые победы
2. **Измерить baseline** производительность
3. **Применить оптимизации по одной**
4. **Замерить улучшения после каждой**
5. **Перейти к Фазе 2** когда Фаза 1 завершена и протестирована
6. **Фаза 3** - только если нужно дальнейшее улучшение

**Готов начать реализацию?** 🚀
