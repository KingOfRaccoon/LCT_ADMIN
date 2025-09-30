# ADR-001: VirtualContext State Management Pattern

**Status:** Accepted  
**Date:** 2025-09-30  
**Authors:** BDUI Team  
**Deciders:** Technical Lead, Product Owner

---

## Context

BDUI платформа требует централизованного управления состоянием для:
- Хранения переменных из пользовательских вводов, API-вызовов и действий
- Привязки данных между компонентами и переменными (data binding)
- Поддержки переходов между экранами с сохранением состояния
- Отслеживания зависимостей между переменными для валидации
- Вывода типов переменных (string, number, boolean, array, object)

### Требования

**Функциональные:**
1. Управление переменными с типизацией (variableSchemas)
2. Операции над графом узлов и рёбер (CRUD для nodes/edges)
3. Управление экранами и их конфигурациями
4. Граф зависимостей между переменными
5. Сериализация/десериализация состояния (экспорт/импорт продуктов)

**Нефункциональные:**
1. Производительность: обновления состояния < 16ms для 60 FPS
2. Масштабируемость: поддержка продуктов с 100+ узлами и 50+ переменных
3. Отказоустойчивость: защита от некорректных обновлений (type downgrade prevention)
4. Тестируемость: изолированная логика редьюсера без side effects

---

## Decision

Выбран паттерн **React Context + useReducer** для управления VirtualContext.

### Архитектура

```javascript
// src/context/VirtualContext.jsx

const ACTIONS = {
  // Product management
  SET_PRODUCTS: 'SET_PRODUCTS',
  ADD_PRODUCT: 'ADD_PRODUCT',
  UPDATE_PRODUCT: 'UPDATE_PRODUCT',
  DELETE_PRODUCT: 'DELETE_PRODUCT',
  
  // Node management
  ADD_NODE: 'ADD_NODE',
  UPDATE_NODE: 'UPDATE_NODE',
  DELETE_NODE: 'DELETE_NODE',
  ADD_ACTION_NODE: 'ADD_ACTION_NODE',
  
  // Edge management
  ADD_EDGE: 'ADD_EDGE',
  UPDATE_EDGE: 'UPDATE_EDGE',
  DELETE_EDGE: 'DELETE_EDGE',
  
  // Variable management
  SET_VARIABLE: 'SET_VARIABLE',
  DELETE_VARIABLE: 'DELETE_VARIABLE',
  UPDATE_VARIABLE_ORDER: 'UPDATE_VARIABLE_ORDER',
  
  // Screen management
  SET_SCREENS: 'SET_SCREENS',
  UPDATE_SCREEN: 'UPDATE_SCREEN',
  
  // Graph data (React Flow)
  UPDATE_GRAPH_DATA: 'UPDATE_GRAPH_DATA'
};

const VirtualContextReducer = (state, action) => {
  switch (action.type) {
    case ACTIONS.SET_VARIABLE:
      return {
        ...state,
        variables: {
          ...state.variables,
          [action.path]: action.value
        },
        variableSchemas: {
          ...state.variableSchemas,
          [action.path]: inferType(action.value)  // Type inference
        }
      };
    // ... другие cases
  }
};
```

### Ключевые решения

**1. Reducer Pattern**
- Централизованная логика обновлений через reducer
- Иммутабельные обновления (spread operators)
- Action types через константы (ACTIONS) для type safety

**2. Type Inference**
- Автоматический вывод типов при SET_VARIABLE: `inferType(value)`
- Защита от type downgrade: list/object не могут стать string
- Валидация через variableSchemas перед применением изменений

**3. Dependency Tracking**
- dependencyMap: `{ [variablePath]: Set<dependentVariablePath> }`
- Обновляется при добавлении/изменении переменных с reference биндингами
- Используется для каскадных пересчётов и валидации циклов

**4. Order Preservation**
- variablesOrder: `string[]` — массив путей переменных в порядке создания
- Позволяет отображать переменные в UI в детерминированном порядке
- Обновляется при SET_VARIABLE и DELETE_VARIABLE

**5. React Flow Integration**
- graphData: `{ nodes: [], edges: [] }` — синхронизируется с VirtualContext
- UPDATE_GRAPH_DATA применяет изменения из React Flow (позиции узлов, соединения)
- Двусторонняя синхронизация: VirtualContext ↔ React Flow

---

## Consequences

### Преимущества

✅ **Централизация:** Единый источник правды для всего состояния продукта  
✅ **Предсказуемость:** Reducer pattern обеспечивает детерминированные обновления  
✅ **Отладка:** React DevTools поддерживает Context для инспекции состояния  
✅ **Тестируемость:** Reducer — чистая функция без side effects  
✅ **Type Safety:** inferType() предотвращает type downgrade  
✅ **Undo/Redo:** Reducer pattern упрощает реализацию истории изменений

### Недостатки

⚠️ **Performance:** Обновления Context триггерят ре-рендер всех consumers (решается React.memo и useMemo)  
⚠️ **Complexity:** Reducer с 20+ action types усложняет onboarding новых разработчиков  
⚠️ **Boilerplate:** Каждая операция требует action type, payload и reducer case  
⚠️ **Global State:** Переиспользование компонентов вне VirtualContextProvider невозможно без моков

### Mitigations

**Performance:**
- Используем селекторы для извлечения минимально необходимых данных
- React.memo для Screen Builder компонентов
- useMemo для дорогостоящих вычислений (граф зависимостей)

**Complexity:**
- Константы ACTIONS экспортируются для переиспользования
- JSDoc комментарии для каждого action type
- Примеры использования в README

**Boilerplate:**
- Helper-функции для типичных операций (addNode, updateVariable)
- Batch updates через промежуточные actions (UPDATE_GRAPH_DATA)

**Global State:**
- EMPTY_CONTEXT fallback для компонентов вне provider (Storybook, Playground)
- useVirtualContextOptional() hook с no-op операциями

---

## Alternatives Considered

### 1. Redux Toolkit

**Pros:**
- Официальный паттерн для complex state
- Redux DevTools с time-travel debugging
- Middleware для side effects (redux-thunk, redux-saga)

**Cons:**
- Дополнительная зависимость (redux, react-redux, @reduxjs/toolkit)
- Boilerplate (slices, actions, thunks)
- Overkill для single-product admin panel

**Вердикт:** Отклонено из-за complexity/benefit trade-off

### 2. Zustand

**Pros:**
- Минимальный boilerplate
- Отличная производительность (избирательная подписка)
- TypeScript-first API

**Cons:**
- Новая зависимость вместо встроенного Context API
- Меньше community adoption vs Redux
- Отсутствие официальной поддержки React DevTools

**Вердикт:** Рассмотреть для v2.0 при проблемах с производительностью

### 3. MobX

**Pros:**
- Автоматическая реактивность через observables
- Минимальный boilerplate
- Хорошая производительность

**Cons:**
- Mutable state API (конфликт с React best practices)
- Требует decorators (усложняет setup)
- Сложная отладка implicit dependencies

**Вердикт:** Отклонено из-за learning curve и non-standard API

### 4. Local State (useState + Props Drilling)

**Pros:**
- Нет зависимостей
- Простота для small apps

**Cons:**
- Props drilling через 5+ уровней компонентов
- Дублирование логики в ProductOverview, ScreenEditor, ScreenBuilder
- Невозможность shared state между routes

**Вердикт:** Отклонено из-за unmaintainability для complex apps

---

## Decision Drivers

| Критерий | Вес | Context+Reducer | Redux | Zustand | MobX |
|----------|-----|-----------------|-------|---------|------|
| Простота внедрения | 🔥 | ✅ 5/5 | ❌ 2/5 | ✅ 4/5 | ⚠️ 3/5 |
| Производительность | 🔥 | ⚠️ 3/5 | ✅ 4/5 | ✅ 5/5 | ✅ 4/5 |
| Отладка | 🔥 | ✅ 4/5 | ✅ 5/5 | ⚠️ 3/5 | ⚠️ 2/5 |
| Type Safety | 🔥 | ⚠️ 3/5 | ✅ 4/5 | ✅ 5/5 | ⚠️ 3/5 |
| Community Support | 🟡 | ✅ 5/5 | ✅ 5/5 | ⚠️ 3/5 | ⚠️ 3/5 |
| Тестируемость | 🟡 | ✅ 5/5 | ✅ 5/5 | ✅ 4/5 | ⚠️ 3/5 |
| Bundle Size | 🟡 | ✅ 5/5 | ❌ 2/5 | ✅ 4/5 | ⚠️ 3/5 |

**Итого:** Context+Reducer выигрывает по критическим параметрам (простота внедрения, отладка, community support, zero dependencies).

---

## Implementation Notes

### Type Inference Logic

```javascript
function inferType(value) {
  if (value === null || value === undefined) return 'string';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'object') return 'object';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  return 'string';
}
```

### Type Downgrade Prevention

```javascript
case ACTIONS.SET_VARIABLE: {
  const currentType = state.variableSchemas[action.path]?.type;
  const newType = inferType(action.value);
  
  // Prevent list/object → string downgrade
  if ((currentType === 'array' || currentType === 'object') && newType === 'string') {
    console.warn(`Type downgrade prevented: ${action.path} (${currentType} → ${newType})`);
    return state;  // Ignore update
  }
  
  // Apply update
  return { ...state, variables: { ...state.variables, [action.path]: action.value } };
}
```

### Dependency Tracking

```javascript
function updateDependencyMap(variables, variableSchemas) {
  const dependencyMap = new Map();
  
  Object.entries(variables).forEach(([path, value]) => {
    if (typeof value === 'object' && value.reference) {
      const targetPath = value.reference.replace(/\$\{([^}]+)\}/, '$1');
      if (!dependencyMap.has(targetPath)) {
        dependencyMap.set(targetPath, new Set());
      }
      dependencyMap.get(targetPath).add(path);
    }
  });
  
  return dependencyMap;
}
```

---

## References

- [React Context API](https://react.dev/reference/react/createContext)
- [useReducer Hook](https://react.dev/reference/react/useReducer)
- [Redux Style Guide](https://redux.js.org/style-guide/)
- [Zustand Documentation](https://github.com/pmndrs/zustand)
- BDUI Repository: `src/context/VirtualContext.jsx`

---

## Appendix: Migration Path (if needed)

При проблемах с производительностью в будущем:

**Phase 1: Memoization**
1. Wrap consumers в React.memo
2. Добавить useMemo для селекторов
3. Профилировать с React DevTools Profiler

**Phase 2: Context Splitting**
1. Разделить VirtualContext на ProductContext, ScreenContext, VariableContext
2. Consumers подписываются только на нужные части

**Phase 3: Zustand Migration**
1. Создать Zustand store параллельно с Context
2. Постепенно мигрировать consumers на useStore()
3. Удалить VirtualContext после полной миграции

**Estimated effort:** 2-4 weeks для Phase 3
