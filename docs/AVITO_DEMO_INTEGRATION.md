# Интеграция avitoDemo в ProductOverview

## Обзор

Добавлена поддержка загрузки и отображения демонстрационного сценария Avito (avitoDemo) в админ-панели BDUI. Теперь пользователи могут открыть продукт "Авито — Корзина" из списка продуктов и экспортировать его workflow на Workflow Server.

## Что было сделано

### 1. Добавление avitoDemo в список продуктов

**Файл:** `src/pages/ProductList/ProductList.jsx`

Добавлен новый продукт в массив `mockProducts`:

```javascript
{
  id: 'avito-cart-demo',
  name: 'Авито — Корзина',
  description: 'Демонстрационный сценарий корзины Avito с 11 экранами и 25 действиями',
  screens: 11,
  actions: 25,
  lastModified: '2024-01-10',
  status: 'active'
}
```

### 2. Создание конвертера avitoDemo

**Файл:** `src/utils/avitoDemoConverter.js`

Создан утилитный модуль для преобразования формата avitoDemo в React Flow graphData:

#### Ключевые функции:

- **`convertAvitoDemoNodesToReactFlow(avitoDemoNodes)`** - Преобразует узлы из avitoDemo в формат React Flow nodes
  - Автоматически расставляет позиции узлов
  - Определяет start/final узлы
  - Извлекает метаданные (label, screenId, type)

- **`convertAvitoDemoEdgesToReactFlow(avitoDemoNodes)`** - Извлекает рёбра из структуры nodes
  - avitoDemo хранит edges внутри каждого node.edges
  - Преобразует в плоский массив React Flow edges
  - Сохраняет contextPatch, event, keepInputs и другие данные

- **`loadAvitoDemoAsGraphData()`** - Асинхронная загрузка и преобразование
  - Динамический импорт `avitoDemo.json`
  - Возвращает: nodes, edges, initialContext, variableSchemas, screens
  - Обработка ошибок с fallback пустыми данными

- **`convertAvitoDemoScreensToArray(screens, nodes)`** - Преобразует screens для ProductOverview
  - Конвертирует объект screens в массив
  - Подсчитывает компоненты внутри sections
  - Связывает screens с nodes для получения actions

### 3. Интеграция в ProductOverview

**Файл:** `src/pages/ProductOverview/ProductOverview.jsx`

Добавлена логика загрузки avitoDemo при открытии продукта:

```javascript
if (productId === 'avito-cart-demo') {
  loadAvitoDemoAsGraphData()
    .then((data) => {
      // Установка graphData для React Flow
      setGraphData({ nodes: data.nodes, edges: data.edges });
      
      // Установка схем переменных
      setVariableSchemas(data.variableSchemas);
      
      // Преобразование и установка screens
      const screensArray = convertAvitoDemoScreensToArray(data.screens, data.nodes);
      setProductScreens(screensArray);
      
      // Установка метаданных продукта
      const mockProduct = { ... };
      setProduct(mockProduct);
      setProductMeta(mockProduct);
      
      toast.success('avitoDemo loaded successfully!');
    })
    .catch((error) => {
      console.error('Failed to load avitoDemo:', error);
      toast.error('Failed to load avitoDemo: ' + error.message);
    });
}
```

## Структура данных avitoDemo

### Формат исходных данных

```json
{
  "id": "avito-cart-demo",
  "name": "Авито — Корзина",
  "variableSchemas": { ... },
  "initialContext": { ... },
  "nodes": [
    {
      "id": "loading",
      "label": "Загрузка корзины",
      "type": "screen",
      "screenId": "screen-loading",
      "start": true,
      "edges": [
        {
          "id": "edge-load-complete",
          "target": "cart-main",
          "event": "loadComplete",
          "contextPatch": { ... }
        }
      ]
    }
  ],
  "screens": {
    "screen-loading": {
      "id": "screen-loading",
      "type": "Screen",
      "name": "Загрузка",
      "sections": { ... }
    }
  }
}
```

### Формат преобразованных данных

После преобразования:

```javascript
{
  nodes: [
    {
      id: "loading",
      type: "screen",
      position: { x: 0, y: 0 },
      data: {
        label: "Загрузка корзины",
        screenId: "screen-loading",
        start: true,
        final: false,
        nodeType: "screen"
      }
    }
  ],
  edges: [
    {
      id: "edge-load-complete",
      source: "loading",
      target: "cart-main",
      label: "Данные загружены",
      type: "smoothstep",
      animated: false,
      data: {
        event: "loadComplete",
        keepInputs: false,
        summary: "Переход к экрану корзины после загрузки",
        contextPatch: { ... }
      }
    }
  ],
  variableSchemas: { ... },
  screens: { ... }
}
```

## Workflow экспорта

После загрузки avitoDemo пользователь может:

1. **Открыть продукт** - Перейти на страницу ProductOverview
2. **Просмотреть граф** - Увидеть 11 экранов и 25 переходов
3. **Экспортировать workflow** - Нажать кнопку "Export Workflow"
4. **Отправить на сервер** - Данные будут преобразованы в формат StateModel и отправлены на Workflow Server

### Формат экспорта

```javascript
{
  workflow_name: "Авито — Корзина",
  states: [
    {
      name: "Загрузка корзины",
      transitions: [
        {
          state_id: "Корзина — Основной экран",
          event: "loadComplete",
          condition: null
        }
      ]
    }
  ]
}
```

## Использование

### 1. Открыть список продуктов

Перейти на `/products`

### 2. Выбрать avitoDemo

Кликнуть на карточку "Авито — Корзина"

### 3. Просмотреть детали

На странице `/products/avito-cart-demo`:
- Метаданные продукта
- Список экранов (11 шт.)
- Граф переходов (25 рёбер)

### 4. Экспортировать workflow

Нажать кнопку "Export Workflow" в правом верхнем углу

### 5. Настроить Workflow Server (опционально)

```javascript
// В консоли браузера
localStorage.setItem('workflowServerUrl', 'http://127.0.0.1:8000');
```

Или использовать mock mode (по умолчанию).

## Технические детали

### Зависимости VirtualContext

ProductOverview использует следующие методы из VirtualContext:

- `setGraphData(graphData)` - Установка nodes и edges
- `setVariableSchemas(schemas)` - Установка схем переменных
- `setProduct(product)` - Установка метаданных продукта

### Асинхронная загрузка

Используется динамический импорт для ленивой загрузки avitoDemo.json:

```javascript
const avitoDemo = await import('../pages/Sandbox/data/avitoDemo.json');
const data = avitoDemo.default;
```

Это предотвращает загрузку больших JSON-файлов на старте приложения.

### Обработка ошибок

- Try-catch блок в `loadAvitoDemoAsGraphData()`
- Toast уведомления для пользователя
- Fallback на пустые данные при ошибке
- Подробное логирование в консоль

## Следующие шаги

### 1. Тестирование экспорта

- [ ] Открыть avitoDemo в браузере
- [ ] Проверить корректность отображения графа
- [ ] Экспортировать workflow
- [ ] Проверить структуру отправленных данных

### 2. Интеграция с реальным Workflow Server

- [ ] Настроить URL сервера
- [ ] Протестировать создание workflow
- [ ] Проверить валидацию на сервере

### 3. Расширение функциональности

- [ ] Добавить импорт других JSON-сценариев
- [ ] Создать UI для выбора formата импорта
- [ ] Добавить экспорт обратно в avitoDemo формат

## Связанные файлы

- `src/pages/ProductList/ProductList.jsx` - Список продуктов
- `src/pages/ProductOverview/ProductOverview.jsx` - Детали продукта
- `src/utils/avitoDemoConverter.js` - Конвертер формата
- `src/pages/Sandbox/data/avitoDemo.json` - Исходные данные
- `docs/WORKFLOW_CONTRACT_FIX.md` - Документация по контракту API
- `docs/WORKFLOW_QUICK_START.md` - Быстрый старт Workflow Server

## Заметки

- avitoDemo содержит 11 экранов и 25 переходов
- Используется декларативная архитектура (события в JSON)
- Формат совместим с песочницей и Workflow Server
- Конвертер легко расширяется для других форматов
