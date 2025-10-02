# Integration States — Руководство разработчика

## 🎯 Обзор

Integration States — это специальные состояния workflow, которые автоматически загружают данные из внешних API и сохраняют результат в контекст сессии. Это позволяет создавать динамические workflow с подгрузкой данных без написания кода на бэкенде.

## 📂 Структура файлов

```
src/
├── utils/
│   └── avitoDemoConverter.js          # Конвертер и утилиты для Integration States
├── components/
│   ├── IntegrationStateForm.jsx       # UI форма для создания Integration States
│   └── IntegrationStateForm.css       # Стили формы
├── pages/
│   └── Sandbox/
│       ├── SandboxPage.jsx            # Главная страница песочницы (обработка Integration)
│       ├── SandboxScreenRenderer.jsx  # Рендеринг экранов
│       ├── utils/
│       │   └── integrationStates.js   # Выполнение Integration States в песочнице
│       └── data/
│           └── avitoDemo.json         # Пример с Integration State (nekos.best API)
```

## 🔧 Основные функции

### 1. `avitoDemoConverter.js`

Содержит утилиты для работы с Integration States:

#### `createIntegrationNodeTemplate(name, config)`

Создает шаблон integration узла.

```javascript
import { createIntegrationNodeTemplate } from '@/utils/avitoDemoConverter';

const node = createIntegrationNodeTemplate('FetchUserProfile', {
  variableName: 'user_profile',
  url: 'https://api.example.com/users/{{user_id}}',
  method: 'get',
  params: {},
  nextState: 'ProfileScreen'
});
```

#### `validateIntegrationExpression(expression)`

Валидирует integration expression перед выполнением.

```javascript
import { validateIntegrationExpression } from '@/utils/avitoDemoConverter';

const errors = validateIntegrationExpression({
  variable: 'api_result',
  url: 'https://api.example.com/data',
  method: 'get'
});

if (errors.length > 0) {
  console.error('Validation errors:', errors);
}
```

#### `executeIntegrationExpression(expression, context)`

Выполняет HTTP запрос из integration expression.

```javascript
import { executeIntegrationExpression } from '@/utils/avitoDemoConverter';

const result = await executeIntegrationExpression(
  {
    variable: 'products',
    url: 'https://api.shop.com/products',
    params: { category: 'electronics' },
    method: 'get'
  },
  { user_id: '123' }
);

if (result.success) {
  console.log('Data loaded:', result.data);
} else {
  console.error('Error:', result.error);
}
```

#### `generateIntegrationNodeDocumentation(node)`

Генерирует Markdown документацию для integration узла.

```javascript
import { generateIntegrationNodeDocumentation } from '@/utils/avitoDemoConverter';

const doc = generateIntegrationNodeDocumentation(integrationNode);
console.log(doc); // Markdown документация
```

### 2. `integrationStates.js`

Утилиты для выполнения Integration States в песочнице:

#### `executeIntegrationNode(node, context)`

Выполняет все expressions из integration узла и возвращает обновленный контекст.

```javascript
import { executeIntegrationNode } from '@/pages/Sandbox/utils/integrationStates';

const result = await executeIntegrationNode(integrationNode, currentContext);

if (result.success) {
  setContext(result.context); // Обновляем контекст
  
  // result.context теперь содержит загруженные данные
  // Например, result.context.cute_images = { results: [...] }
}
```

#### `getNextStateFromIntegration(node, executionResult)`

Определяет следующее состояние после выполнения integration узла.

```javascript
import { getNextStateFromIntegration } from '@/pages/Sandbox/utils/integrationStates';

const nextStateId = getNextStateFromIntegration(integrationNode, executionResult);
setCurrentNodeId(nextStateId); // Переход к следующему состоянию
```

## 📝 Формат данных

### JSON структура Integration State

```json
{
  "id": "fetch-cute-images",
  "label": "Загрузка милых картинок",
  "type": "integration",
  "state_type": "integration",
  "start": true,
  "description": "Загружает данные с Nekos Best API",
  "expressions": [
    {
      "variable": "cute_images",
      "url": "https://nekos.best/api/v2/hug?amount=4",
      "params": {},
      "method": "get",
      "metadata": {
        "description": "Получает 4 случайные картинки",
        "category": "data",
        "tags": ["integration", "api", "demo"]
      }
    }
  ],
  "transitions": [
    {
      "variable": "cute_images",
      "case": null,
      "state_id": "show-cute-images"
    }
  ],
  "edges": []
}
```

### Поля Expression

| Поле | Тип | Обязательное | Описание |
|------|-----|--------------|----------|
| `variable` | string | ✅ Да | Имя переменной для сохранения результата |
| `url` | string | ✅ Да | URL эндпоинта (с протоколом http/https) |
| `params` | object | ❌ Нет | Параметры запроса (query для GET, body для POST) |
| `method` | string | ❌ Нет | HTTP метод (`get`, `post`, `put`, `delete`, `patch`) |
| `headers` | object | ❌ Нет | HTTP заголовки |
| `timeout` | number | ❌ Нет | Таймаут в миллисекундах (по умолчанию 30000) |
| `metadata` | object | ❌ Нет | Метаданные (description, category, tags) |

### Подстановка переменных

В `url` и `params` можно использовать переменные из контекста:

```json
{
  "variable": "user_profile",
  "url": "https://api.example.com/users/{{user_id}}",
  "params": {
    "include": "profile",
    "auth_token": "{{session_token}}"
  },
  "method": "get"
}
```

Переменные в формате `{{variable_name}}` будут заменены на значения из контекста.

## 🎨 Использование UI компонента

### IntegrationStateForm

Форма для создания Integration State в админ-панели.

```jsx
import { IntegrationStateForm } from '@/components/IntegrationStateForm';

function MyAdminPage() {
  const handleSubmit = (integrationState) => {
    console.log('Created integration state:', integrationState);
    // Сохраняем в workflow
  };

  const handleCancel = () => {
    // Закрываем форму
  };

  return (
    <IntegrationStateForm
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      availableStates={[
        { id: 'screen1', name: 'Screen 1' },
        { id: 'screen2', name: 'Screen 2' }
      ]}
      availableVariables={['user_id', 'session_id', 'product_id']}
      initialData={null} // Для редактирования передайте существующий узел
    />
  );
}
```

## 🔄 Работа в песочнице

### Автоматическое выполнение

В `SandboxPage.jsx` Integration States выполняются автоматически при переходе к узлу:

```javascript
useEffect(() => {
  if (!currentNode) return;
  if (!isOfflineMode) return;
  
  const nodeType = currentNode.type || currentNode.state_type;
  if (nodeType !== 'integration') return;

  // Выполняем integration запросы
  executeIntegrationNode(currentNode, contextState)
    .then(result => {
      if (result.success) {
        // Обновляем контекст
        setContextState(result.context);
        
        // Переходим к следующему состоянию
        const nextStateId = getNextStateFromIntegration(currentNode, result);
        if (nextStateId) {
          setCurrentNodeId(nextStateId);
        }
      }
    });
}, [currentNode, contextState, isOfflineMode]);
```

### Отображение данных на экране

Загруженные данные автоматически доступны в контексте и могут быть использованы в биндингах:

```json
{
  "id": "list-cute-images",
  "type": "list",
  "properties": {
    "dataSource": "{{cute_images.results}}",
    "iterationAlias": "image"
  },
  "itemTemplate": {
    "id": "card-image-{{itemIndex}}",
    "type": "container",
    "children": [
      {
        "id": "image-{{itemIndex}}",
        "type": "image",
        "properties": {
          "src": "{{image.url}}",
          "alt": "Cute anime image"
        }
      },
      {
        "id": "text-artist-{{itemIndex}}",
        "type": "text",
        "properties": {
          "content": "Artist: {{image.artist_name}}"
        }
      }
    ]
  }
}
```

## 🧪 Пример: Nekos Best API

В `avitoDemo.json` реализован пример загрузки картинок с Nekos Best API:

### 1. Integration State узел

```json
{
  "id": "fetch-cute-images",
  "type": "integration",
  "expressions": [
    {
      "variable": "cute_images",
      "url": "https://nekos.best/api/v2/hug?amount=4",
      "method": "get"
    }
  ],
  "transitions": [
    {
      "variable": "cute_images",
      "case": null,
      "state_id": "show-cute-images"
    }
  ]
}
```

### 2. Структура ответа API

```json
{
  "results": [
    {
      "artist_href": "https://...",
      "artist_name": "Artist Name",
      "source_url": "https://...",
      "url": "https://nekos.best/api/v2/hug/001.png"
    }
  ]
}
```

### 3. Экран отображения

```json
{
  "id": "screen-cute-images",
  "sections": {
    "body": {
      "children": [
        {
          "id": "list-cute-images",
          "type": "list",
          "properties": {
            "dataSource": "{{cute_images.results}}"
          },
          "itemTemplate": {
            "children": [
              {
                "type": "image",
                "properties": {
                  "src": "{{image.url}}"
                }
              }
            ]
          }
        }
      ]
    }
  }
}
```

## 🛠️ Валидация

### Перед сохранением

```javascript
import { validateIntegrationNode } from '@/utils/avitoDemoConverter';

const validation = validateIntegrationNode(integrationNode);

if (!validation.valid) {
  console.error('Validation errors:', validation.errors);
  // Показываем ошибки пользователю
}
```

### Перед выполнением

```javascript
import { validateIntegrationNode } from '@/pages/Sandbox/utils/integrationStates';

const validation = validateIntegrationNode(integrationNode);

if (!validation.valid) {
  throw new Error(`Invalid integration node: ${validation.errors.join(', ')}`);
}
```

## 📊 Логирование и отладка

Integration States логируют свою работу в консоль:

```javascript
// При обнаружении integration узла
console.log('[Integration] Detected integration node:', currentNode.id);

// При выполнении запроса
console.log('[Integration] Executing GET https://...');

// При успехе
console.log('[Integration] Success: variable_name', data);

// При ошибке
console.error('[Integration] Error: variable_name', error);

// При переходе
console.log('[Integration] Moving to next state:', nextStateId);
```

## 🚀 Расширение функционала

### Добавление новых HTTP методов

В `integrationStates.js`:

```javascript
const allowedMethods = ['get', 'post', 'put', 'delete', 'patch', 'head'];
```

### Добавление заголовков

```javascript
const options = {
  method: method.toUpperCase(),
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${context.auth_token}`,
    ...(expression.headers || {})
  }
};
```

### Трансформация ответа

```javascript
export async function executeIntegrationExpression(expression, context = {}) {
  // ... существующий код ...
  
  const data = await response.json();
  
  // Трансформация если указан response_path
  let transformedData = data;
  if (expression.response_path) {
    transformedData = JSONPath.query(data, expression.response_path);
  }
  
  return {
    success: true,
    data: transformedData,
    // ...
  };
}
```

## 🔐 Безопасность

1. **Валидация URL**: Всегда проверяйте, что URL начинается с `http://` или `https://`
2. **Таймауты**: Устанавливайте разумные таймауты (по умолчанию 30 секунд)
3. **HTTPS**: Предупреждайте пользователей об использовании незащищенного HTTP
4. **CORS**: Внешние API должны поддерживать CORS для работы из браузера

## 📚 Полезные ссылки

- [Промпт для админ-панели](./docs/INTEGRATION_STATES_ADMIN_PROMPT.md)
- [Примеры Integration States](./src/pages/Sandbox/data/avitoDemo.json)
- [API документация](./docs/api-contracts.md)

## 💡 FAQ

**Q: Можно ли использовать несколько API запросов в одном Integration State?**  
A: Да, можно добавить несколько expressions. Они будут выполнены последовательно.

**Q: Что делать если API возвращает ошибку?**  
A: Сейчас workflow остановится с ошибкой. В будущем будет обработка через `error_variable` и `on_error_state`.

**Q: Можно ли кэшировать результаты API?**  
A: Пока нет, но это запланировано в roadmap через `cache_ttl` и `cache_key`.

**Q: Поддерживается ли GraphQL?**  
A: Нет, только REST API. Для GraphQL используйте POST запрос с query в parameters.

---

_Последнее обновление: 2 октября 2025 г._
