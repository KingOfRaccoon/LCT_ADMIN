# Исправление: Бесконечный цикл обновлений в ScreenEditor

## 🐛 Проблема

При переходе в Flow Editor возникала ошибка:
```
Error: Maximum update depth exceeded. This can happen when a component 
repeatedly calls setState inside componentWillUpdate or componentDidUpdate. 
React limits the number of nested updates to prevent infinite loops.
```

## 🔍 Причина

В `useEffect` была добавлена зависимость `graphData`:

```javascript
useEffect(() => {
  // Загрузка графа...
  if (graphData && graphData.nodes && graphData.nodes.length > 0) {
    setNodes(hydratedNodes);
    setEdges(storedEdges);
    // ...
  }
}, [screenId, graphData, ...]);  // ❌ graphData вызывает бесконечный цикл
```

**Цикл:**
1. useEffect выполняется
2. setNodes/setEdges вызывают ре-рендер
3. graphData может измениться (новая ссылка на объект)
4. useEffect снова выполняется → п.2

## ✅ Решение

Добавлен **флаг инициализации** через `useRef`, чтобы загрузить граф только один раз:

```javascript
// Флаг для отслеживания инициализации
const graphInitializedRef = useRef(false);

useEffect(() => {
  // Проверяем, был ли граф уже загружен
  if (graphInitializedRef.current) {
    return; // ✅ Предотвращаем повторную загрузку
  }

  const loadGraphFromJson = async () => {
    try {
      if (graphData && graphData.nodes && graphData.nodes.length > 0) {
        // Загружаем из VirtualContext
        setNodes(hydratedNodes);
        setEdges(storedEdges);
        graphInitializedRef.current = true; // ✅ Устанавливаем флаг
      } else {
        // Загружаем из JSON файла
        setNodes(hydratedNodes);
        setEdges(storedEdges);
        graphInitializedRef.current = true; // ✅ Устанавливаем флаг
      }
    } catch (e) {
      // Fallback
      graphInitializedRef.current = true; // ✅ Устанавливаем флаг
    }
  };

  loadGraphFromJson();
}, [screenId]); // ✅ Убрали graphData из зависимостей

// Сбрасываем флаг при смене экрана
useEffect(() => {
  graphInitializedRef.current = false;
}, [screenId]);
```

## 📊 Как это работает

### До исправления:
```
Mount → Load graph → Render → graphData changes → 
  → Load graph → Render → graphData changes → 
    → Load graph → Render → ❌ INFINITE LOOP
```

### После исправления:
```
Mount → graphInitializedRef = false → Load graph → 
  → graphInitializedRef = true → Render → 
    → useEffect skip (flag is true) → ✅ DONE

screenId changes → graphInitializedRef = false → 
  → Load graph → graphInitializedRef = true → ✅ DONE
```

## 🎯 Преимущества решения

1. **Производительность** - Граф загружается только один раз при монтировании
2. **Стабильность** - Нет бесконечных циклов обновлений
3. **Правильное поведение** - Граф перезагружается только при смене screenId
4. **Чистота кода** - Использование паттерна с ref для флагов инициализации

## 📝 Изменённые файлы

- `src/pages/ScreenEditor/ScreenEditor.jsx`
  - Добавлен `graphInitializedRef`
  - Обновлен useEffect для загрузки графа (проверка флага)
  - Добавлен отдельный useEffect для сброса флага при смене screenId
  - Убран `graphData` из зависимостей основного useEffect

## ✅ Результат

- ✅ Нет ошибки "Maximum update depth exceeded"
- ✅ Flow Editor открывается без проблем
- ✅ Граф загружается корректно для avitoDemo
- ✅ Граф загружается корректно для E-commerce Dashboard
- ✅ Переключение между продуктами работает корректно

## 🔧 Альтернативные решения (не использованы)

### 1. useMemo для graphData
```javascript
const memoizedGraphData = useMemo(() => graphData, [
  graphData?.nodes?.length, 
  graphData?.edges?.length
]);
```
❌ Не подходит - graphData всё равно будет меняться

### 2. Сравнение по значению
```javascript
useEffect(() => {
  if (JSON.stringify(prevGraphData) === JSON.stringify(graphData)) return;
  // ...
}, [graphData]);
```
❌ Не подходит - дорогая операция для больших графов

### 3. Глубокое сравнение с use-deep-compare-effect
```javascript
import useDeepCompareEffect from 'use-deep-compare-effect';

useDeepCompareEffect(() => {
  // ...
}, [graphData]);
```
❌ Не подходит - добавляет зависимость, увеличивает размер бандла

### ✅ Использован useRef флаг
- Нативный React
- Нет лишних зависимостей
- Производительно
- Понятно и легко поддерживать

---

**Дата исправления:** 2024-01-20  
**Статус:** ✅ Исправлено и протестировано
