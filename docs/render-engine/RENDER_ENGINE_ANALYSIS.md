# 🔍 Анализ рендер-движка SandboxScreenRenderer

**Дата:** 18 октября 2025  
**Файл:** `src/pages/Sandbox/SandboxScreenRenderer.jsx`  
**Строк кода:** ~650

---

## 📊 Текущая архитектура

### 1. **Структура компонента**

```jsx
SandboxScreenRenderer({
  screen,        // Объект экрана с components[] или sections{}
  context,       // Контекст для биндингов
  onEvent,       // Обработчик событий
  onInputChange, // Обработчик изменения инпутов
  formValues,    // Значения форм
  isEventPending // Флаг загрузки
})
```

### 2. **Основные вычисления (useMemo)**

| Вычисление | Зависимости | Цель |
|------------|-------------|------|
| `components` | `screen?.components` | Извлечение массива компонентов |
| `componentsMap` | `components` | Map для быстрого поиска по ID |
| `rootComponent` | `components` | Поиск корневого компонента типа 'screen' |
| `virtualRoot` | `rootComponent`, `screen` | Создание виртуального root для формата sections |

### 3. **Процесс рендеринга**

```
SandboxScreenRenderer
  ↓
renderComponent(rootComponent | virtualRoot)
  ↓
switch (component.type)
  ├─ screen → renderChildren()
  ├─ column → renderChildren()
  ├─ section → renderChildren()
  ├─ container → renderChildren()
  ├─ row → renderChildren()
  ├─ button → обработчик событий
  ├─ input → обработчик изменений
  ├─ text → резолв биндингов
  ├─ image → резолв URL
  ├─ list → итерация + рекурсия
  └─ default → заглушка
```

---

## 🐌 Проблемы производительности

### **1. Полный пересчёт на каждый render**

**Проблема:**
```jsx
const renderComponent = (component, iterationStack = []) => {
  // Эта функция пересоздаётся на КАЖДОМ рендере компонента
  // Все switch-case выполняются заново
  // Нет мемоизации результатов
}
```

**Почему это плохо:**
- При изменении `context` или `formValues` весь экран перерисовывается полностью
- Все биндинги резолвятся заново, даже если не изменились
- Все стили пересчитываются, даже если props не изменились

### **2. Отсутствие инкрементального обновления**

**Текущее поведение:**
```
Старый экран → Новый экран
       ↓
Полное уничтожение DOM
       ↓
Полная пересборка DOM
```

**Что происходит:**
- React сравнивает весь tree заново
- Нет переиспользования существующих элементов
- Нет key-based reconciliation для оптимизации

### **3. Рекурсивные вызовы без оптимизации**

```jsx
const renderChildren = (component, iterationStack = []) => {
  return component.children.map((childRef, idx) => {
    // Рекурсия без мемоизации
    return (
      <div key={child.id ?? idx}> {/* ⚠️ Использование индекса как key */}
        {renderComponent(child, iterationStack)}
      </div>
    );
  });
};
```

**Проблемы:**
- Индекс как key → плохая производительность при изменении порядка
- Нет кэширования результатов для неизменённых компонентов
- Каждый вызов создаёт новые объекты стилей

### **4. Избыточные вычисления биндингов**

```jsx
const formatForDisplay = (candidate, displayPath) => {
  // Вызывается для КАЖДОГО значения на КАЖДОМ рендере
  if (isBindingValue(candidate)) {
    const resolved = resolveBindingValue(candidate, context, ...);
    return formatForDisplay(resolved, displayPath);
  }
  // Дальше логика форматирования...
}
```

**Проблемы:**
- Одни и те же биндинги резолвятся многократно
- Нет кэша для уже вычисленных значений
- Особенно критично для списков с сотнями элементов

### **5. Проблемы с list компонентом**

```jsx
case 'list': {
  return (
    <ListTag>
      {itemsArray.map((item, index) => {
        const frame = { alias, item, index, total };
        const nextStack = [...iterationStack, frame]; // ⚠️ Новый массив на каждой итерации
        return (
          <li key={`${component.id}-item-${index}`}> {/* ⚠️ Индекс в key */}
            {templateChildren.map((child) => (
              <div key={`${child.id || 'child'}-${index}`}>
                {renderComponent(child, nextStack)} {/* ⚠️ Полный рендер на каждой итерации */}
              </div>
            ))}
          </li>
        );
      })}
    </ListTag>
  );
}
```

**Проблемы:**
- Для списка из 100 элементов с 5 child-компонентами = 500 полных рендеров
- Нет мемоизации шаблонов
- Пересоздание iterationStack на каждой итерации

---

## 💡 Предложения по оптимизации

### **1. Инкрементальное обновление экранов**

#### **Идея: Diffing между старым и новым экраном**

```jsx
const usePreviousScreen = (screen) => {
  const ref = useRef();
  useEffect(() => {
    ref.current = screen;
  });
  return ref.current;
};

const SandboxScreenRenderer = ({ screen, context, ... }) => {
  const prevScreen = usePreviousScreen(screen);
  
  // Вычисляем diff между prevScreen и screen
  const screenDiff = useMemo(() => {
    if (!prevScreen || !screen) return { type: 'full-replace' };
    
    // Быстрая проверка: тот же экран?
    if (prevScreen.id === screen.id) {
      return {
        type: 'same-screen',
        componentsChanged: getChangedComponents(prevScreen, screen),
        sectionsChanged: getChangedSections(prevScreen, screen)
      };
    }
    
    return { type: 'different-screen' };
  }, [prevScreen, screen]);
  
  // Используем diff для оптимизации
};
```

**Преимущества:**
- Если экран тот же, обновляем только изменённые компоненты
- Если экран новый, делаем полную замену (как сейчас)
- Значительно быстрее для частых обновлений context

#### **Реализация getChangedComponents:**

```jsx
const getChangedComponents = (oldScreen, newScreen) => {
  const oldMap = new Map(
    (oldScreen.components || []).map(c => [c.id, c])
  );
  const newMap = new Map(
    (newScreen.components || []).map(c => [c.id, c])
  );
  
  const changes = {
    added: [],
    removed: [],
    updated: []
  };
  
  // Найти удалённые
  for (const [id, comp] of oldMap) {
    if (!newMap.has(id)) {
      changes.removed.push(id);
    }
  }
  
  // Найти добавленные и изменённые
  for (const [id, newComp] of newMap) {
    const oldComp = oldMap.get(id);
    if (!oldComp) {
      changes.added.push(id);
    } else if (!shallowEqual(oldComp, newComp)) {
      changes.updated.push(id);
    }
  }
  
  return changes;
};
```

### **2. Мемоизация компонентов**

```jsx
// Создаём мемоизированную версию каждого типа компонента
const MemoizedButton = React.memo(({ component, context, onEvent, ... }) => {
  // Рендер кнопки
}, (prevProps, nextProps) => {
  // Кастомная проверка равенства
  return (
    prevProps.component === nextProps.component &&
    shallowEqual(prevProps.context, nextProps.context) &&
    prevProps.onEvent === nextProps.onEvent
  );
});

const MemoizedText = React.memo(...);
const MemoizedList = React.memo(...);
// и т.д.
```

**Преимущества:**
- React пропускает рендер, если props не изменились
- Особенно эффективно для статических компонентов (text, image)

### **3. Кэширование резолва биндингов**

```jsx
const useBindingCache = () => {
  const cacheRef = useRef(new Map());
  
  const getCached = useCallback((binding, context) => {
    const key = JSON.stringify({ binding, context });
    
    if (cacheRef.current.has(key)) {
      return cacheRef.current.get(key);
    }
    
    const resolved = resolveBindingValue(binding, context);
    cacheRef.current.set(key, resolved);
    
    // Ограничение размера кэша
    if (cacheRef.current.size > 1000) {
      const firstKey = cacheRef.current.keys().next().value;
      cacheRef.current.delete(firstKey);
    }
    
    return resolved;
  }, []);
  
  // Очищаем кэш при изменении контекста
  useEffect(() => {
    cacheRef.current.clear();
  }, [context]);
  
  return getCached;
};
```

### **4. Оптимизация списков**

```jsx
// Мемоизация шаблона списка
const MemoizedListItem = React.memo(({ 
  item, 
  index, 
  total,
  alias,
  templateChildren,
  context,
  onEvent 
}) => {
  const iterationStack = useMemo(
    () => [{ alias, item, index, total }],
    [alias, item, index, total]
  );
  
  return templateChildren.map((child) => (
    <div key={child.id || `child-${index}`}>
      {renderComponent(child, context, iterationStack)}
    </div>
  ));
}, (prev, next) => {
  // Пропускаем рендер если item не изменился
  return prev.item === next.item && 
         prev.index === next.index;
});

case 'list': {
  return (
    <ListTag>
      {itemsArray.map((item, index) => (
        <li key={item.id || `item-${index}`}> {/* Используем item.id если есть */}
          <MemoizedListItem
            item={item}
            index={index}
            total={itemsArray.length}
            alias={alias}
            templateChildren={templateChildren}
            context={context}
            onEvent={onEvent}
          />
        </li>
      ))}
    </ListTag>
  );
}
```

### **5. Разделение на подкомпоненты**

```jsx
// Вместо одного большого switch-case создать отдельные компоненты:

const ScreenComponent = React.memo(({ component, children, style }) => (
  <div className="sandbox-screen" style={style}>
    {children}
  </div>
));

const ColumnComponent = React.memo(({ component, children, style }) => (
  <div className="sandbox-column" style={style}>
    {children}
  </div>
));

const ButtonComponent = React.memo(({ 
  component, 
  context, 
  onEvent, 
  isEventPending 
}) => {
  // Логика кнопки
});

// И т.д. для каждого типа

// Потом в renderComponent:
const ComponentMap = {
  screen: ScreenComponent,
  column: ColumnComponent,
  button: ButtonComponent,
  // ...
};

const Component = ComponentMap[component.type];
if (!Component) return <UnsupportedComponent type={component.type} />;

return (
  <Component 
    component={component}
    context={context}
    onEvent={onEvent}
    // ...
  />
);
```

### **6. Виртуализация для длинных списков**

```jsx
import { FixedSizeList } from 'react-window';

case 'list': {
  if (itemsArray.length > 50) { // Виртуализация для больших списков
    return (
      <FixedSizeList
        height={600}
        itemCount={itemsArray.length}
        itemSize={80}
        width="100%"
      >
        {({ index, style }) => (
          <div style={style}>
            <MemoizedListItem
              item={itemsArray[index]}
              index={index}
              total={itemsArray.length}
              // ...
            />
          </div>
        )}
      </FixedSizeList>
    );
  }
  
  // Для маленьких списков - обычный рендер
}
```

---

## 📈 Ожидаемые улучшения

| Оптимизация | Ожидаемый прирост | Применимость |
|-------------|-------------------|--------------|
| Инкрементальное обновление | **50-70%** быстрее для обновлений | При частых обновлениях context |
| Мемоизация компонентов | **30-50%** быстрее | Статические компоненты |
| Кэширование биндингов | **40-60%** быстрее | Сложные биндинги |
| Оптимизация списков | **70-90%** быстрее | Списки >20 элементов |
| Виртуализация | **90-95%** быстрее | Списки >100 элементов |

---

## 🎯 Приоритеты реализации

### **Фаза 1: Быстрые победы** (1-2 дня)
1. ✅ Мемоизация `componentsMap`
2. ✅ Улучшение keys в списках (использовать `item.id`)
3. ✅ Кэширование стилей

### **Фаза 2: Средние улучшения** (3-5 дней)
4. Разделение на подкомпоненты с React.memo
5. Кэширование резолва биндингов
6. Оптимизация списков с мемоизацией

### **Фаза 3: Глубокая оптимизация** (1-2 недели)
7. Инкрементальное обновление экранов (diffing)
8. Виртуализация длинных списков
9. Профилирование и fine-tuning

---

## 📋 Метрики для измерения

```jsx
// Добавить в начало SandboxScreenRenderer
const renderStartTime = performance.now();

useEffect(() => {
  const renderTime = performance.now() - renderStartTime;
  console.log(`[Performance] Screen render took ${renderTime.toFixed(2)}ms`);
  
  // Отправка метрик в аналитику
  trackPerformance({
    screenId: screen?.id,
    renderTime,
    componentsCount: components.length,
    contextSize: JSON.stringify(context).length
  });
});
```

**Что измерять:**
- Время полного рендера экрана
- Количество компонентов
- Размер контекста
- Частота обновлений
- Использование памяти

---

## ⚠️ Потенциальные риски

1. **Усложнение кода** - больше абстракций, сложнее дебажить
2. **Ложные срабатывания мемоизации** - если сравнение props некорректно
3. **Память** - кэши могут занимать много памяти
4. **Обратная совместимость** - нужно тестировать все существующие экраны

---

## 🧪 План тестирования

1. **Unit-тесты** для функций diffing
2. **Snapshot-тесты** для каждого типа компонента
3. **Performance-тесты** с большими экранами
4. **Integration-тесты** со всеми форматами экранов (components, sections)
5. **Visual regression tests** для проверки корректности отображения

---

## 📝 Следующие шаги

После анализа предлагаю начать с **Фазы 1** - быстрые победы без значительных изменений архитектуры. Это позволит:
- Получить немедленный прирост производительности
- Протестировать подход на реальных данных
- Определить, какие дальнейшие оптимизации наиболее критичны

**Готов приступить к реализации?** 🚀
