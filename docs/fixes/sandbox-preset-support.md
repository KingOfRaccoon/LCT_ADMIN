# Исправление: Поддержка множественных preset в Sandbox API

## Проблема
```
GET /api/start/ exchange {
  "responseStatus": 500,
  "error": "Unknown node 'email-entry' in sandbox flow"
}
```

Сервер хардкодил узел `email-entry` из `ecommerceDashboard`, но по умолчанию пытался загрузить `avitoDemo`, где стартовый узел — `loading`.

## Корневая причина
1. **Хардкод стартового узла**: функция `buildStartResponse()` всегда использовала `email-entry`
2. **Хардкод EVENT_RULES**: события были специфичны для `ecommerceDashboard`
3. **Хардкод buildApiContext()**: структура context была зашита под `ecommerceDashboard` (только `ui`, `data`, `inputs`, `state`), что игнорировало `cart`, `stores`, `recommendations` из avitoDemo

## Решение

### 1. Динамический поиск стартового узла (JS)
```javascript
// Добавлена функция для автоматического поиска start node
const findStartNode = () => {
  for (const node of NODE_REGISTRY.values()) {
    if (node.start === true) {
      return node.id;
    }
  }
  return NODE_REGISTRY.size > 0 ? NODE_REGISTRY.keys().next().value : null;
};

const START_NODE_ID = findStartNode();

// Использование в buildStartResponse()
const buildStartResponse = async () => {
  if (!START_NODE_ID) {
    throw new HttpError(500, 'No start node found in dataset');
  }
  const core = await buildBaseContextWithPrefetch();
  const context = buildApiContext(core, DEFAULT_INPUTS, stateOverridesForNode(START_NODE_ID));
  const screenId = resolveScreenId(START_NODE_ID);
  return makeScreenResponse(screenId, context);
};
```

### 2. Условные EVENT_RULES по preset (JS)
```javascript
const EVENT_RULES = PRESET_NAME === 'ecommerceDashboard' ? {
  checkemail: { sourceNode: 'email-entry', edgeId: 'edge-email-submit', keepInputs: true },
  retryfromsuccess: { sourceNode: 'email-valid', edgeId: 'edge-valid-retry', keepInputs: false },
  retryfromerror: { sourceNode: 'email-invalid', edgeId: 'edge-invalid-retry', keepInputs: false }
} : {
  // Avito demo events (lowercase keys to match normalization)
  loadcomplete: { sourceNode: 'loading', edgeId: 'edge-load-complete', keepInputs: false },
  incrementitem: { sourceNode: 'cart-main', edgeId: 'edge-increment-item', keepInputs: true },
  decrementitem: { sourceNode: 'cart-main', edgeId: 'edge-decrement-item', keepInputs: true },
  // ... остальные события
};
```

### 3. Условный buildApiContext (JS)
```javascript
const buildApiContext = (coreContext, inputs, stateOverrides) => {
  if (PRESET_NAME === 'ecommerceDashboard') {
    // ecommerceDashboard specific structure
    const payload = {
      ui: deepClone(coreContext.ui ?? {}),
      data: deepClone(coreContext.data ?? {}),
      inputs: { ...DEFAULT_INPUTS, ...(inputs ?? {}) }
    };
    if (typeof payload.inputs.email === 'string') {
      payload.inputs.email = payload.inputs.email.trim();
    }
    payload.state = makeStateSnapshot(payload, stateOverrides ?? {}, payload.inputs);
    return payload;
  }
  
  // For other presets (avitoDemo), preserve full context
  return deepClone(coreContext);
};
```

### 4. Условный buildDynamicPatch (JS)
```javascript
const buildDynamicPatch = (event, inputs) => {
  // For ecommerceDashboard preset, inject email input
  if (PRESET_NAME === 'ecommerceDashboard' && typeof inputs.email === 'string') {
    return { 'inputs.email': inputs.email.trim() };
  }
  // For other presets (avitoDemo), no dynamic patch needed
  return {};
};
```

### 5. Аналогичные изменения в Python сервере
```python
# sandbox_flow.py
import os

PRESET_NAME = os.environ.get("SANDBOX_PRESET", "avitoDemo")
DATASET_PATH = ROOT_DIR / f"src/pages/Sandbox/data/{PRESET_NAME}.json"

def _find_start_node() -> Optional[str]:
    """Find the start node dynamically from the dataset."""
    for node_id, node in _NODE_REGISTRY.items():
        if node.get("start") is True:
            return node_id
    return next(iter(_NODE_REGISTRY.keys())) if _NODE_REGISTRY else None

START_NODE_ID = _find_start_node()

# Conditional EVENT_RULES
if PRESET_NAME == "ecommerceDashboard":
    EVENT_RULES: Dict[str, Dict[str, Any]] = {
        "checkemail": {"edge_id": "edge-email-submit", "source_node": "email-entry", ...},
        # ...
    }
else:
    EVENT_RULES: Dict[str, Dict[str, Any]] = {
        "loadcomplete": {"edge_id": "edge-load-complete", "source_node": "loading", ...},
        # ... avito events
    }
```

## Тестирование

### JS Server
```bash
# Запуск с avitoDemo preset
SANDBOX_PRESET=avitoDemo SANDBOX_FETCH_DISABLED=1 node server/js/server.js

# Проверка /api/start
curl -s http://localhost:5050/api/start | jq '{
  screenId: .screen.id, 
  cart_items: (.context.cart.items | length), 
  totalPrice: .context.cart.totalPrice
}'
# Результат:
{
  "screenId": "screen-loading",
  "cart_items": 3,
  "totalPrice": 120970
}

# Проверка события loadComplete
curl -s "http://localhost:5050/api/action?event=loadComplete" | jq '{
  screenId: .screen.id, 
  ready: .context.ui.ready, 
  cart_items: (.context.cart.items | length)
}'
# Результат:
{
  "screenId": "screen-cart-main",
  "ready": true,
  "cart_items": 3
}
```

### Python Server
```bash
# Запуск с avitoDemo preset
SANDBOX_PRESET=avitoDemo uvicorn server.main:app --reload

# Аналогичные проверки через http://localhost:8000
```

## Файлы изменены
- `server/js/server.js` — основные исправления (START_NODE_ID, EVENT_RULES, buildApiContext, buildDynamicPatch)
- `server/sandbox_flow.py` — аналогичные изменения для Python API

## Обратная совместимость
✅ `ecommerceDashboard` preset продолжает работать как раньше  
✅ `avitoDemo` теперь работает корректно  
✅ Легко добавить новые presets в будущем

## Переменные окружения
- `SANDBOX_PRESET` — выбор preset (`ecommerceDashboard` | `avitoDemo`, default: `avitoDemo`)
- `SANDBOX_FETCH_DISABLED=1` — отключение удалённых fetch запросов (опционально)
