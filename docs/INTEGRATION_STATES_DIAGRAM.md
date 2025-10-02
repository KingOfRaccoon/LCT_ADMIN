# 🔄 Integration States — Диаграмма работы

## Поток выполнения

```
┌─────────────────────────────────────────────────────────────────┐
│                     INTEGRATION STATE FLOW                       │
└─────────────────────────────────────────────────────────────────┘

1️⃣  СОЗДАНИЕ (Admin Panel)
    │
    ├─→ IntegrationStateForm.jsx
    │   ├─ Заполнение полей (URL, метод, params)
    │   ├─ Валидация (validateIntegrationNode)
    │   └─ Сохранение в JSON
    │
    └─→ avitoDemo.json / ecommerceDashboard.json


2️⃣  ЗАГРУЗКА (Sandbox Init)
    │
    ├─→ avitoDemo.json
    │   └─ convertAvitoDemoNodesToReactFlow()
    │       └─ normalizeIntegrationExpression()
    │
    └─→ graphData { nodes: [...], edges: [...] }


3️⃣  ОБНАРУЖЕНИЕ (useEffect in SandboxPage)
    │
    ├─→ currentNode.type === 'integration' ?
    │   │
    │   ├─ YES → executeIntegrationNode()
    │   │         │
    │   │         └─→ HTTP Request to API
    │   │
    │   └─ NO → render Screen


4️⃣  ВЫПОЛНЕНИЕ (integrationStates.js)
    │
    ├─→ executeIntegrationExpression(expression, context)
    │   │
    │   ├─ Подстановка переменных {{var}} → значение
    │   │
    │   ├─ fetch(url, { method, params })
    │   │   │
    │   │   ├─ SUCCESS → return { success: true, data }
    │   │   │
    │   │   └─ ERROR → return { success: false, error }
    │   │
    │   └─ Сохранение в context[variable]


5️⃣  ПЕРЕХОД (getNextStateFromIntegration)
    │
    ├─→ transitions[0].state_id
    │   │
    │   └─→ setCurrentNodeId(nextStateId)


6️⃣  ОТОБРАЖЕНИЕ (SandboxScreenRenderer)
    │
    └─→ Screen с биндингами {{variable.field}}
        │
        ├─ resolveBindingValue({{variable}}, context)
        │
        └─ Render UI с данными из API
```

## Пример: Nekos Best API

```
┌──────────────────────────────────────────────────────────┐
│  USER OPENS SANDBOX                                      │
└──────────────────────────────────────────────────────────┘
              │
              ▼
┌──────────────────────────────────────────────────────────┐
│  SandboxPage.jsx                                         │
│  ┌────────────────────────────────────────────────────┐  │
│  │ useEffect(() => {                                  │  │
│  │   if (currentNode.type === 'integration') {        │  │
│  │     executeIntegrationNode(...)                    │  │
│  │   }                                                 │  │
│  │ })                                                  │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
              │
              ▼
┌──────────────────────────────────────────────────────────┐
│  integrationStates.js                                    │
│  ┌────────────────────────────────────────────────────┐  │
│  │ executeIntegrationNode({                           │  │
│  │   expressions: [{                                  │  │
│  │     variable: 'cute_images',                       │  │
│  │     url: 'https://nekos.best/api/v2/hug?amount=4'  │  │
│  │   }]                                               │  │
│  │ })                                                  │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
              │
              ▼
┌──────────────────────────────────────────────────────────┐
│  HTTPS Request                                           │
│  ┌────────────────────────────────────────────────────┐  │
│  │ GET https://nekos.best/api/v2/hug?amount=4         │  │
│  │                                                     │  │
│  │ Response:                                          │  │
│  │ {                                                  │  │
│  │   results: [                                       │  │
│  │     {                                              │  │
│  │       url: "https://nekos.best/.../001.png",      │  │
│  │       artist_name: "Artist Name",                 │  │
│  │       source_url: "https://..."                   │  │
│  │     },                                             │  │
│  │     ... x3 more                                    │  │
│  │   ]                                                │  │
│  │ }                                                  │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
              │
              ▼
┌──────────────────────────────────────────────────────────┐
│  Context Update                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │ context = {                                        │  │
│  │   ...context,                                      │  │
│  │   cute_images: {                                   │  │
│  │     results: [...]  ← API response saved here     │  │
│  │   }                                                │  │
│  │ }                                                  │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
              │
              ▼
┌──────────────────────────────────────────────────────────┐
│  Transition to Next State                                │
│  ┌────────────────────────────────────────────────────┐  │
│  │ transitions: [                                     │  │
│  │   {                                                │  │
│  │     variable: 'cute_images',                       │  │
│  │     case: null,                                    │  │
│  │     state_id: 'show-cute-images' ← Go here        │  │
│  │   }                                                │  │
│  │ ]                                                  │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
              │
              ▼
┌──────────────────────────────────────────────────────────┐
│  SandboxScreenRenderer.jsx                               │
│  ┌────────────────────────────────────────────────────┐  │
│  │ <Screen id="show-cute-images">                     │  │
│  │   <List dataSource="{{cute_images.results}}">      │  │
│  │     <Card>                                         │  │
│  │       <Image src="{{image.url}}" />                │  │
│  │       <Text>Artist: {{image.artist_name}}</Text>   │  │
│  │     </Card>                                        │  │
│  │   </List>                                          │  │
│  │ </Screen>                                          │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
              │
              ▼
┌──────────────────────────────────────────────────────────┐
│  RENDERED UI                                             │
│  ┌────────────┐  ┌────────────┐                         │
│  │            │  │            │                         │
│  │  Image 1   │  │  Image 2   │                         │
│  │            │  │            │                         │
│  │ Artist: A  │  │ Artist: B  │                         │
│  └────────────┘  └────────────┘                         │
│  ┌────────────┐  ┌────────────┐                         │
│  │            │  │            │                         │
│  │  Image 3   │  │  Image 4   │                         │
│  │            │  │            │                         │
│  │ Artist: C  │  │ Artist: D  │                         │
│  └────────────┘  └────────────┘                         │
│                                                          │
│  [Продолжить к корзине →]                               │
└──────────────────────────────────────────────────────────┘
```

## Временная диаграмма

```
Timeline:
─────────────────────────────────────────────────────────────

t=0ms    │ User opens /sandbox?product=avitoDemo
         │
t=10ms   │ SandboxPage loads
         │ currentNode = fetch-cute-images (integration)
         │
t=15ms   │ useEffect detects integration node
         │ [Integration] Detected integration node: fetch-cute-images
         │
t=20ms   │ executeIntegrationNode() called
         │ [Integration] Executing GET https://nekos.best/...
         │
t=25ms   │ fetch() sends HTTP request
         │
         │ ... waiting for API response ...
         │
t=250ms  │ API responds with JSON
         │ [Integration] Success: cute_images {...}
         │
t=255ms  │ Context updated with API data
         │ context.cute_images = { results: [...] }
         │
t=260ms  │ History entry added
         │
t=300ms  │ getNextStateFromIntegration()
         │ nextState = 'show-cute-images'
         │
t=305ms  │ setCurrentNodeId('show-cute-images')
         │ [Integration] Moving to next state: show-cute-images
         │
t=310ms  │ SandboxScreenRenderer renders screen
         │
t=350ms  │ Images start loading from CDN
         │
t=1000ms │ All images loaded
         │ ✓ UI fully rendered
```

## Компоненты системы

```
┌─────────────────────────────────────────────────────┐
│             INTEGRATION STATES ARCHITECTURE         │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  Admin Panel Layer                                  │
│  ┌───────────────────────────────────────────────┐  │
│  │ IntegrationStateForm.jsx                      │  │
│  │  - UI для создания                            │  │
│  │  - Валидация полей                            │  │
│  │  - Автодополнение                             │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│  Converter Layer                                    │
│  ┌───────────────────────────────────────────────┐  │
│  │ avitoDemoConverter.js                         │  │
│  │  - createIntegrationNodeTemplate()            │  │
│  │  - validateIntegrationNode()                  │  │
│  │  - normalizeIntegrationExpression()           │  │
│  │  - convertAvitoDemoNodesToReactFlow()         │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│  Data Layer                                         │
│  ┌───────────────────────────────────────────────┐  │
│  │ avitoDemo.json / ecommerceDashboard.json      │  │
│  │  - Integration State nodes                    │  │
│  │  - Screens                                    │  │
│  │  - Initial context                            │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│  Sandbox Layer                                      │
│  ┌───────────────────────────────────────────────┐  │
│  │ SandboxPage.jsx                               │  │
│  │  - Обнаружение integration узлов              │  │
│  │  - Вызов executeIntegrationNode()             │  │
│  │  - Управление контекстом                      │  │
│  │  - Переходы между состояниями                 │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│  Execution Layer                                    │
│  ┌───────────────────────────────────────────────┐  │
│  │ integrationStates.js                          │  │
│  │  - executeIntegrationExpression()             │  │
│  │  - executeIntegrationNode()                   │  │
│  │  - getNextStateFromIntegration()              │  │
│  │  - Подстановка переменных                     │  │
│  │  - HTTP requests (fetch)                      │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│  Render Layer                                       │
│  ┌───────────────────────────────────────────────┐  │
│  │ SandboxScreenRenderer.jsx                     │  │
│  │  - Рендеринг компонентов                      │  │
│  │  - Биндинги {{variable}}                      │  │
│  │  - Итерация списков                           │  │
│  │  - Events handling                            │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

## Потоки данных

```
┌─────────────────────────────────────────────────────┐
│  DATA FLOWS                                         │
└─────────────────────────────────────────────────────┘

1. СОЗДАНИЕ
   Admin → IntegrationStateForm → JSON → Git

2. ЗАГРУЗКА
   JSON → Converter → graphData → SandboxPage

3. ВЫПОЛНЕНИЕ
   SandboxPage → integrationStates → API → Context

4. ОТОБРАЖЕНИЕ
   Context → resolveBinding → Renderer → UI

5. ПЕРЕХОД
   Transition → getNextState → setCurrentNodeId
```

---

**Вся система работает декларативно через JSON конфигурацию!**
