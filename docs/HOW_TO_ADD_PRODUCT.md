# 📝 Памятка: Как добавить новый продукт

## Быстрый старт

Следуйте этому руководству, чтобы добавить новый продукт в BDUI Admin.

## Шаг 1: Подготовьте данные

### Формат JSON (avitoDemo-подобный)

```json
{
  "id": "your-product-id",
  "name": "Название продукта",
  "variableSchemas": { /* схемы переменных */ },
  "initialContext": { /* начальный контекст */ },
  "nodes": [
    {
      "id": "screen-1",
      "label": "Экран 1",
      "type": "screen",
      "screenId": "screen-1-id",
      "start": true,
      "edges": [
        {
          "id": "edge-1",
          "target": "screen-2",
          "event": "buttonClick",
          "contextPatch": { /* патч контекста */ }
        }
      ]
    }
  ],
  "screens": {
    "screen-1-id": {
      "id": "screen-1-id",
      "name": "Экран 1",
      "sections": { /* компоненты */ }
    }
  }
}
```

### Сохраните в:
`src/pages/Sandbox/data/yourProduct.json`

## Шаг 2: Создайте конвертер (если формат отличается)

```javascript
// src/utils/yourProductConverter.js

export function convertYourProductNodesToReactFlow(nodes) {
  return nodes.map((node, index) => ({
    id: node.id,
    type: node.type || 'screen',
    position: { x: index * 300, y: Math.floor(index / 3) * 200 },
    data: {
      label: node.label || node.id,
      screenId: node.screenId,
      start: node.start === true,
      final: !node.edges || node.edges.length === 0
    }
  }));
}

export function convertYourProductEdgesToReactFlow(nodes) {
  const edges = [];
  nodes.forEach(node => {
    if (node.edges && Array.isArray(node.edges)) {
      node.edges.forEach(edge => {
        edges.push({
          id: edge.id,
          source: node.id,
          target: edge.target,
          label: edge.label,
          type: 'smoothstep',
          data: {
            event: edge.event,
            contextPatch: edge.contextPatch
          }
        });
      });
    }
  });
  return edges;
}

export async function loadYourProductAsGraphData() {
  try {
    const data = await import('../pages/Sandbox/data/yourProduct.json');
    const nodes = convertYourProductNodesToReactFlow(data.default.nodes || []);
    const edges = convertYourProductEdgesToReactFlow(data.default.nodes || []);

    return {
      nodes,
      edges,
      initialContext: data.default.initialContext || {},
      variableSchemas: data.default.variableSchemas || {},
      screens: data.default.screens || {}
    };
  } catch (error) {
    console.error('Failed to load product:', error);
    return { nodes: [], edges: [], initialContext: {}, variableSchemas: {}, screens: {} };
  }
}

export function convertYourProductScreensToArray(screens, nodes) {
  const nodeMap = new Map();
  if (nodes && Array.isArray(nodes)) {
    nodes.forEach(node => nodeMap.set(node.screenId, node));
  }

  return Object.entries(screens).map(([screenId, screenData], index) => {
    const node = nodeMap.get(screenId);
    const sections = screenData.sections || {};
    const componentsCount = Object.values(sections).reduce((count, section) => {
      return count + (section.children?.length || 0);
    }, 0);

    return {
      id: screenId,
      name: screenData.name || screenId,
      type: node?.type || 'screen',
      description: `Screen ${screenData.name || screenId}`,
      order: index + 1,
      components: componentsCount,
      actions: node?.edges?.length || 0,
      status: 'complete'
    };
  });
}
```

## Шаг 3: Добавьте в ProductList

```javascript
// src/pages/ProductList/ProductList.jsx

const mockProducts = [
  // ... существующие продукты
  {
    id: 'your-product-id',
    name: 'Название продукта',
    description: 'Описание продукта',
    screens: 10,  // количество экранов
    actions: 20,  // количество действий
    lastModified: '2024-01-20',
    status: 'active'
  }
];
```

## Шаг 4: Интегрируйте в ProductOverview

```javascript
// src/pages/ProductOverview/ProductOverview.jsx

import { 
  loadYourProductAsGraphData, 
  convertYourProductScreensToArray 
} from '../../utils/yourProductConverter';

// В useEffect:
useEffect(() => {
  if (currentProduct && currentProduct.id === productId) {
    // ...
  } else {
    if (productId === 'your-product-id') {
      setIsLoadingData(true);
      loadYourProductAsGraphData()
        .then((data) => {
          setGraphData({ nodes: data.nodes, edges: data.edges });
          setVariableSchemas(data.variableSchemas);
          
          const screensArray = convertYourProductScreensToArray(data.screens, data.nodes);
          setProductScreens(screensArray);
          
          const mockProduct = {
            id: productId,
            name: 'Название продукта',
            version: '1.0.0',
            description: 'Описание продукта',
            theme: 'light',
            permissions: ['admin'],
            integrations: ['api']
          };
          setProduct(mockProduct);
          setProductMeta(mockProduct);
          setIsLoadingData(false);
          toast.success('Продукт загружен успешно!');
        })
        .catch((error) => {
          console.error('Failed to load product:', error);
          setIsLoadingData(false);
          toast.error('Ошибка загрузки: ' + error.message);
        });
    } else if (productId === 'avito-cart-demo') {
      // avitoDemo loading...
    } else {
      // Default E-commerce loading...
    }
  }
}, [productId, currentProduct, setProduct, setGraphData, setVariableSchemas]);
```

## Шаг 5: ScreenEditor (автоматически работает!)

ScreenEditor уже настроен для загрузки данных из VirtualContext.graphData, поэтому дополнительных изменений не требуется! 🎉

## Шаг 6: Тестирование

### Чеклист:
- [ ] ProductList отображает новый продукт
- [ ] ProductOverview загружает данные без ошибок
- [ ] Список экранов корректен
- [ ] Flow Editor показывает правильный граф
- [ ] Нет ошибок в консоли
- [ ] Export Workflow работает

### Команды для тестирования:
```bash
# 1. Запустить приложение
npm run dev

# 2. Открыть в браузере
http://localhost:5173/products

# 3. Кликнуть на ваш продукт

# 4. Проверить ProductOverview
# - Экраны загружены?
# - Метаданные корректны?

# 5. Открыть Flow Editor
# - Граф отображается?
# - Количество узлов правильное?

# 6. Экспортировать workflow
# - Workflow API работает?
# - Данные корректны?
```

## Частые проблемы

### Проблема 1: Граф не загружается
**Решение:** Проверьте формат данных в JSON. Убедитесь, что `nodes` и `edges` - массивы.

### Проблема 2: Бесконечный цикл в ScreenEditor
**Решение:** Убедитесь, что не добавили `graphData` в зависимости useEffect. Флаг `graphInitializedRef` должен предотвращать это.

### Проблема 3: Экраны не отображаются
**Решение:** Проверьте функцию `convertYourProductScreensToArray()`. Убедитесь, что структура `screens` правильная.

### Проблема 4: Ошибки при экспорте workflow
**Решение:** Проверьте, что узлы имеют поля `id`, `data.label`. Рёбра должны иметь `source`, `target`.

## Примеры

### Пример 1: Простой продукт (3 экрана)
```javascript
{
  "id": "simple-product",
  "nodes": [
    { "id": "start", "label": "Start", "type": "screen", "start": true, "edges": [...] },
    { "id": "middle", "label": "Middle", "type": "screen", "edges": [...] },
    { "id": "end", "label": "End", "type": "screen", "edges": [] }
  ],
  "screens": { /* ... */ }
}
```

### Пример 2: Продукт с action-узлами
```javascript
{
  "nodes": [
    { 
      "id": "login", 
      "type": "screen", 
      "edges": [
        { "id": "edge-1", "target": "auth-action" }
      ]
    },
    { 
      "id": "auth-action", 
      "type": "action", 
      "data": { "actionType": "api" },
      "edges": [
        { "id": "edge-2", "target": "dashboard" }
      ]
    }
  ]
}
```

## Полезные ссылки

- [AVITO_DEMO_INTEGRATION.md](./AVITO_DEMO_INTEGRATION.md) - Подробная документация
- [AVITO_DEMO_QUICKSTART.md](./AVITO_DEMO_QUICKSTART.md) - Быстрый старт
- [INFINITE_LOOP_FIX.md](./INFINITE_LOOP_FIX.md) - Решение проблем с циклами

## Поддержка

Если возникли проблемы:
1. Проверьте консоль браузера (F12)
2. Проверьте логи в терминале
3. Используйте React DevTools для отладки
4. Изучите реализацию avitoDemo как референс

---

**Время на добавление нового продукта:** ~30 минут  
**Сложность:** 🟢 Средняя  
**Требуемые навыки:** React, JSON, базовый JavaScript
