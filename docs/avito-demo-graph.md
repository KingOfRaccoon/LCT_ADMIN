# Граф навигации avitoDemo

## 📊 Визуализация потока корзины Avito

```mermaid
graph TB
    %% Узлы
    loading[🔄 loading<br/>Загрузка корзины]
    cartMain[🛒 cart-main<br/>Корзина основной экран]
    cartEmpty[📭 cart-empty<br/>Корзина пуста]
    checkout[💳 checkout-screen<br/>Оформление заказа]
    
    %% Action-узлы
    actionIncr{{⬆️ action-increment<br/>Увеличить количество}}
    actionDecr{{⬇️ action-decrement<br/>Уменьшить количество}}
    actionRemove{{🗑️ action-remove<br/>Удалить товар}}
    actionAddRec{{➕ action-add-recommended<br/>Добавить рекомендацию}}
    actionSelectAll{{☑️ action-select-all<br/>Выбрать всё}}
    
    %% Переходы из loading
    loading -->|loadComplete<br/>keepInputs: false| cartMain
    
    %% Переходы из cart-main
    cartMain -->|incrementItem<br/>keepInputs: true| actionIncr
    cartMain -->|decrementItem<br/>keepInputs: true| actionDecr
    cartMain -->|removeItem<br/>keepInputs: true| actionRemove
    cartMain -->|addRecommended<br/>keepInputs: true| actionAddRec
    cartMain -->|checkout<br/>keepInputs: true| checkout
    cartMain -->|selectAll<br/>keepInputs: true| actionSelectAll
    cartMain -->|clearAll<br/>keepInputs: true| cartEmpty
    
    %% Возвраты из action-узлов
    actionIncr -.->|Обновлено| cartMain
    actionDecr -.->|Обновлено| cartMain
    actionRemove -.->|Товар удалён| cartMain
    actionAddRec -.->|Добавлен в магазин| cartMain
    actionSelectAll -.->|Все выбраны| cartMain
    
    %% Переход из cart-empty
    cartEmpty -->|help<br/>keepInputs: true| cartEmpty
    
    %% Стили
    classDef screenNode fill:#e0f2fe,stroke:#0284c7,stroke-width:2px
    classDef actionNode fill:#fef3c7,stroke:#f59e0b,stroke-width:2px
    classDef emptyNode fill:#fee2e2,stroke:#dc2626,stroke-width:2px
    classDef checkoutNode fill:#dcfce7,stroke:#16a34a,stroke-width:2px
    
    class loading,cartMain screenNode
    class actionIncr,actionDecr,actionRemove,actionAddRec,actionSelectAll actionNode
    class cartEmpty emptyNode
    class checkout checkoutNode
```

## 🎯 Декларативная архитектура

### События и маппинг

| Событие | Исходный узел | Целевой узел | keepInputs | Описание |
|---------|---------------|--------------|------------|----------|
| `loadComplete` | loading | cart-main | ❌ false | Завершение загрузки корзины |
| `incrementItem` | cart-main | action-increment | ✅ true | Увеличение количества товара |
| `decrementItem` | cart-main | action-decrement | ✅ true | Уменьшение количества товара |
| `removeItem` | cart-main | action-remove | ✅ true | Удаление товара из корзины |
| `addRecommended` | cart-main | action-add-recommended | ✅ true | Добавление рекомендованного товара |
| `checkout` | cart-main | checkout-screen | ✅ true | Переход к оформлению заказа |
| `selectAll` | cart-main | action-select-all | ✅ true | Выбор всех товаров |
| `clearAll` | cart-main | cart-empty | ✅ true | Очистка корзины |
| `help` | cart-empty | cart-empty | ✅ true | Справка (цикличный переход) |

### Action-узлы с конфигурацией

#### 1️⃣ action-increment
```json
{
  "actionType": "modify-cart-item",
  "operation": "increment",
  "config": {
    "itemIdParam": "itemId",
    "minQuantity": 1,
    "maxQuantity": 99,
    "arrays": ["cart.pearStoreItems", "cart.technoStoreItems"],
    "recalculate": ["cart.totalPrice", "cart.selectedCount"]
  }
}
```
**Логика:** Увеличивает `quantity` на 1 (макс 99), пересчитывает итоги

#### 2️⃣ action-decrement
```json
{
  "actionType": "modify-cart-item",
  "operation": "decrement",
  "config": {
    "itemIdParam": "itemId",
    "minQuantity": 1,
    "maxQuantity": 99,
    "arrays": ["cart.pearStoreItems", "cart.technoStoreItems"],
    "recalculate": ["cart.totalPrice", "cart.selectedCount"]
  }
}
```
**Логика:** Уменьшает `quantity` на 1 (мин 1), пересчитывает итоги

#### 3️⃣ action-remove
```json
{
  "actionType": "context-update",
  "description": "Удаляет товар из корзины"
}
```
**Логика:** Применяет `contextPatch` с обновлёнными счётчиками и уведомлением

#### 4️⃣ action-add-recommended
```json
{
  "actionType": "context-update",
  "description": "Добавляет товар из upsell-блока в случайный магазин"
}
```
**Логика:** Случайный выбор между двумя рёбрами (Pear Store / TECHNO ZONE)

#### 5️⃣ action-select-all
```json
{
  "actionType": "context-update",
  "description": "Помечает все товары как выбранные"
}
```
**Логика:** Обновляет `cart.selectedCount`

## 📋 Детальная диаграмма с contextPatch

```mermaid
sequenceDiagram
    participant User as 👤 Пользователь
    participant UI as 🖥️ UI (SandboxScreenRenderer)
    participant API as 🔌 API (handleEvent)
    participant Graph as 📊 Graph Engine
    participant Action as ⚙️ Action Interpreter
    participant Context as 💾 Context Store

    %% Сценарий: Увеличение количества товара
    User->>UI: Клик на кнопку "+"
    UI->>API: POST /api/action?event=incrementItem&itemId=item-1
    
    API->>Graph: Найти ребро с event="incrementItem"
    Graph-->>API: edge-increment-item → action-increment
    
    API->>Context: Добавить _queryParams={itemId: "item-1"}
    
    API->>Graph: runEdgeSequence(edge-increment-item)
    Graph->>Action: resolveConditionEdge(action-increment)
    
    Action->>Action: Читать node.data.config
    Note over Action: itemIdParam="itemId"<br/>operation="increment"<br/>arrays=["cart.pearStoreItems", ...]
    
    Action->>Context: getContextValue("cart.pearStoreItems")
    Context-->>Action: [{id:"item-1", quantity:1, ...}, ...]
    
    Action->>Action: Найти item-1 → index=0<br/>Увеличить quantity: 1→2
    Action->>Action: Пересчитать totals:<br/>totalPrice: 120970→125960<br/>selectedCount: 3→4
    
    Action-->>Graph: edge с contextPatch={<br/>"cart.pearStoreItems.0.quantity": 2,<br/>"cart.totalPrice": 125960,<br/>"cart.selectedCount": 4<br/>}
    
    Graph->>Context: applyContextPatch(contextPatch)
    Context-->>Graph: Контекст обновлён
    
    Graph-->>API: {context, finalNode: "cart-main"}
    
    API->>Context: Удалить _queryParams
    API->>UI: buildApiContext + screen payload
    
    UI-->>User: Экран обновлён:<br/>Количество: 2<br/>Итого: 125 960 ₽
```

## 🔄 Пример потока данных

### Исходное состояние
```json
{
  "cart": {
    "pearStoreItems": [
      {"id": "item-1", "quantity": 1, "price": 4990}
    ],
    "totalPrice": 120970,
    "selectedCount": 3
  }
}
```

### Событие: incrementItem (itemId=item-1)

**1. Поиск ребра:**
```javascript
// Сервер ищет в EDGE_REGISTRY
edge = найти ребро где edge.event === "incrementItem"
// Результат: edge-increment-item → action-increment
```

**2. Интерпретация action-узла:**
```javascript
// action-increment.data
{
  "actionType": "modify-cart-item",
  "operation": "increment",
  "config": {
    "itemIdParam": "itemId",
    "arrays": ["cart.pearStoreItems", "cart.technoStoreItems"],
    "recalculate": ["cart.totalPrice", "cart.selectedCount"]
  }
}

// Сервер выполняет:
itemId = context._queryParams.itemId // "item-1"
items = context.cart.pearStoreItems  // массив товаров
item = items.find(i => i.id === itemId) // item-1
item.quantity++ // 1 → 2

// Пересчёт:
totalPrice = sum(all items: price * quantity) // 125960
selectedCount = sum(all items: quantity) // 4
```

**3. Генерация contextPatch:**
```json
{
  "cart.pearStoreItems.0.quantity": 2,
  "cart.totalPrice": 125960,
  "cart.selectedCount": 4
}
```

**4. Применение патча:**
```javascript
applyContextPatch(context, patch)
```

**5. Финальное состояние:**
```json
{
  "cart": {
    "pearStoreItems": [
      {"id": "item-1", "quantity": 2, "price": 4990}
    ],
    "totalPrice": 125960,
    "selectedCount": 4
  }
}
```

## 🎨 Легенда узлов

| Тип узла | Обозначение | Описание |
|----------|-------------|----------|
| 🔄 Screen (start) | Прямоугольник голубой | Экран загрузки (стартовый) |
| 🛒 Screen | Прямоугольник голубой | Обычный экран |
| ⚙️ Action | Ромб жёлтый | Action-узел с бизнес-логикой |
| 📭 Screen (empty) | Прямоугольник красный | Экран пустого состояния |
| 💳 Screen (final) | Прямоугольник зелёный | Финальный экран (оформление) |

## 🔗 Типы рёбер

| Стиль | Описание |
|-------|----------|
| `───>` сплошная линия | Прямой переход (пользовательское событие) |
| `-.->` пунктир | Возврат из action-узла (автоматический) |

## 📊 Статистика графа

| Метрика | Значение |
|---------|----------|
| Всего узлов | 9 |
| Screen-узлы | 4 |
| Action-узлы | 5 |
| Всего рёбер | 14 |
| Событий (events) | 9 |
| Циклических переходов | 1 (help → cart-empty) |

## 🚀 Преимущества декларативного подхода

1. **Визуальная ясность**: Граф показывает все возможные пути пользователя
2. **Самодокументирование**: События описаны в рёбрах с `keepInputs`
3. **Универсальность**: Сервер интерпретирует любую конфигурацию
4. **Расширяемость**: Добавление события = добавление ребра в JSON
5. **Тестируемость**: Легко проверить все пути через API

## 📝 Примечания

- **Стартовый узел**: `loading` (единственный с `start: true`)
- **Финальные узлы**: `checkout-screen` (нет исходящих рёбер)
- **Циклические узлы**: `cart-empty` (событие `help` возвращает на себя)
- **Action-узлы**: Всегда возвращаются на экран через пунктирные рёбра
- **keepInputs**: Сохраняет параметры события (например, `itemId`) для action-узлов

---

**Создано:** 30 сентября 2025 г.  
**Граф для:** avitoDemo.json  
**Формат:** Декларативная архитектура с events в edges
