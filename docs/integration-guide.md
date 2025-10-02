# 🔗 Быстрое руководство по интеграции веб-части с сервером

## 📋 Ситуация
У вас уже есть готовая веб-часть админки, но контракты могут отличаться от серверных. Это руководство поможет быстро синхронизировать контракты и интегрировать веб с сервером.

---

## 🚀 Быстрый старт (5 минут)

### Шаг 1: Проверьте текущий контракт веб-части

Экспортируйте из веб-части пример workflow в файл `web_contract.json`:

```json
{
  "states": {
    "states": [
      {
        "state_type": "service",
        "name": "__init__",
        "initial_state": true,
        "final_state": false,
        "expressions": [],
        "transitions": [{"state_id": "end", "case": null}]
      },
      {
        "state_type": "screen",
        "name": "end",
        "initial_state": false,
        "final_state": true,
        "expressions": [{"event_name": "close"}],
        "transitions": []
      }
    ]
  },
  "predefined_context": {}
}
```

### Шаг 2: Запустите инструмент сравнения

```bash
cd /Users/aleksandrzvezdakov/PycharmProjects/lct_efs
python compare_contracts.py
```

**Результат:**
- ✅ Список всех различий
- ✅ Рекомендации по исправлению
- ✅ Примеры правильного формата

### Шаг 3: Исправьте различия

Следуйте рекомендациям из отчета. Типичные проблемы:

---

## 🔍 Типичные различия и их исправление

### Проблема 1: Неверная структура запроса

**❌ Что может быть в веб-части:**
```typescript
{
  states: StateModel[],  // Массив напрямую
  predefined_context: {}
}
```

**✅ Как должно быть:**
```typescript
{
  states: {
    states: StateModel[]  // Объект с полем states
  },
  predefined_context: {}
}
```

**🔧 Исправление в коде:**
```typescript
// Было:
const requestBody = {
  states: statesArray,
  predefined_context: context
};

// Стало:
const requestBody = {
  states: {
    states: statesArray
  },
  predefined_context: context
};
```

---

### Проблема 2: Типы данных boolean

**❌ Что может быть:**
```json
{
  "initial_state": "true",   // Строка
  "final_state": "false"     // Строка
}
```

**✅ Как должно быть:**
```json
{
  "initial_state": true,     // Boolean
  "final_state": false       // Boolean
}
```

**🔧 Исправление в коде:**
```typescript
// Было:
initial_state: state.isInitial ? "true" : "false"

// Стало:
initial_state: state.isInitial  // Boolean напрямую
```

---

### Проблема 3: Пустые массивы

**❌ Что может быть:**
```typescript
{
  name: "state1",
  // expressions и transitions могут отсутствовать
}
```

**✅ Как должно быть:**
```typescript
{
  name: "state1",
  expressions: [],    // Обязательно, даже если пустой
  transitions: []     // Обязательно, даже если пустой
}
```

**🔧 Исправление в коде:**
```typescript
// Добавить дефолтные значения
const stateModel = {
  ...state,
  expressions: state.expressions || [],
  transitions: state.transitions || []
};
```

---

### Проблема 4: Integration State правила

**❌ Что может быть:**
```json
{
  "state_type": "integration",
  "transitions": [
    {"state_id": "success", "case": "result.status == 200"},
    {"state_id": "error", "case": "result.status != 200"}
  ]
}
```

**✅ Как должно быть:**
```json
{
  "state_type": "integration",
  "transitions": [
    {"state_id": "success", "case": null}  // Только 1 transition без case
  ]
}
```

**🔧 Исправление в коде:**
```typescript
// Добавить проверку при создании transition
if (state.state_type === "integration") {
  state.transitions = [
    {
      state_id: state.transitions[0]?.state_id || "next",
      case: null  // Принудительно null
    }
  ];
}
```

---

### Проблема 5: Expression модели

**❌ Что может быть смешано:**
```json
{
  "state_type": "technical",
  "expressions": [
    {
      "variable": "result",
      "url": "https://...",        // Поле из Integration!
      "expression": "x > 0"
    }
  ]
}
```

**✅ Как должно быть разделено:**

**Technical:**
```json
{
  "variable": "result",
  "dependent_variables": ["x"],
  "expression": "x > 0"
}
```

**Integration:**
```json
{
  "variable": "result",
  "url": "https://api.example.com/data",
  "params": {"token": "abc"},
  "method": "get"
}
```

**Screen:**
```json
{
  "event_name": "button_click"
}
```

**🔧 Исправление в коде:**
```typescript
// Создать отдельные функции для каждого типа
function createTechnicalExpression(variable: string, deps: string[], expr: string) {
  return { variable, dependent_variables: deps, expression: expr };
}

function createIntegrationExpression(variable: string, url: string, params: any, method: string) {
  return { variable, url, params, method };
}

function createEventExpression(eventName: string) {
  return { event_name: eventName };
}
```

---

## 📋 Чек-лист миграции

### 1. Структура данных
- [ ] Request body: `{states: {states: [...]}, predefined_context: {}}`
- [ ] Все обязательные поля присутствуют в StateModel
- [ ] `expressions` и `transitions` всегда массивы (даже пустые)

### 2. Типы данных
- [ ] `initial_state` и `final_state` имеют тип `boolean`
- [ ] `state_type` - строка из enum: `"technical" | "integration" | "screen" | "service"`
- [ ] `method` в Integration - строка из enum: `"get" | "post" | "put" | "delete" | "patch"`

### 3. Валидация
- [ ] Ровно 1 состояние с `initial_state: true`
- [ ] Минимум 1 состояние с `final_state: true`
- [ ] Уникальные имена состояний
- [ ] Все `state_id` в transitions существуют

### 4. Integration State
- [ ] Только 1 transition
- [ ] `case` в transition равен `null`

### 5. Expressions
- [ ] Technical: `variable`, `dependent_variables`, `expression`
- [ ] Integration: `variable`, `url`, `params`, `method`
- [ ] Screen: `event_name`
- [ ] Нет лишних полей

---

## 🔧 Примеры исправленного кода

### TypeScript типы (актуальные)

```typescript
// 1. Основные типы
type StateType = "technical" | "integration" | "screen" | "service";
type HttpMethod = "get" | "post" | "put" | "delete" | "patch";

// 2. Expression типы
interface TechnicalExpression {
  variable: string;
  dependent_variables: string[];
  expression: string;
}

interface IntegrationExpression {
  variable: string;
  url: string;
  params: Record<string, any>;
  method: HttpMethod;
}

interface EventExpression {
  event_name: string;
}

type Expression = TechnicalExpression | IntegrationExpression | EventExpression;

// 3. Transition
interface Transition {
  state_id: string;
  case?: string | null;
  variable?: string | null;
}

// 4. State
interface StateModel {
  state_type: StateType;
  name: string;
  initial_state: boolean;
  final_state: boolean;
  expressions: Expression[];
  transitions: Transition[];
}

// 5. Request
interface SaveWorkflowRequest {
  states: {
    states: StateModel[];
  };
  predefined_context: Record<string, any>;
}

// 6. Response
interface SaveWorkflowResponse {
  status: "success" | "error";
  wf_description_id: string;
  wf_context_id: string;
}
```

---

### API функция (исправленная)

```typescript
class WorkflowAPI {
  private baseUrl: string;

  constructor(baseUrl = "http://127.0.0.1:8000") {
    this.baseUrl = baseUrl;
  }

  async saveWorkflow(states: StateModel[], context: Record<string, any> = {}): Promise<SaveWorkflowResponse> {
    // Валидация перед отправкой
    this.validateWorkflow(states);

    // Правильная структура запроса
    const requestBody: SaveWorkflowRequest = {
      states: {
        states: states  // Обертка в объект
      },
      predefined_context: context
    };

    const response = await fetch(`${this.baseUrl}/workflow/save`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to save workflow");
    }

    return response.json();
  }

  validateWorkflow(states: StateModel[]): void {
    // 1. Ровно 1 initial_state
    const initialCount = states.filter(s => s.initial_state).length;
    if (initialCount !== 1) {
      throw new Error(`Expected exactly 1 initial state, got ${initialCount}`);
    }

    // 2. Минимум 1 final_state
    const finalCount = states.filter(s => s.final_state).length;
    if (finalCount < 1) {
      throw new Error(`Expected at least 1 final state, got ${finalCount}`);
    }

    // 3. Уникальные имена
    const names = states.map(s => s.name);
    if (new Set(names).size !== names.length) {
      throw new Error("State names must be unique");
    }

    // 4. Integration State правила
    states.forEach(state => {
      if (state.state_type === "integration") {
        if (state.transitions.length !== 1) {
          throw new Error(`Integration state "${state.name}" must have exactly 1 transition`);
        }
        if (state.transitions[0]?.case !== null) {
          throw new Error(`Integration state "${state.name}" transition must have case=null`);
        }
      }
    });

    // 5. Существование state_id
    const stateNames = new Set(names);
    states.forEach(state => {
      state.transitions.forEach(t => {
        if (!stateNames.has(t.state_id)) {
          throw new Error(`State "${state.name}" has transition to non-existent state "${t.state_id}"`);
        }
      });
    });
  }

  // Нормализация состояния (добавление дефолтных значений)
  normalizeState(state: Partial<StateModel>): StateModel {
    return {
      state_type: state.state_type || "screen",
      name: state.name || "",
      initial_state: Boolean(state.initial_state),  // Принудительно boolean
      final_state: Boolean(state.final_state),      // Принудительно boolean
      expressions: state.expressions || [],         // Дефолт пустой массив
      transitions: state.transitions || [],         // Дефолт пустой массив
    };
  }

  // Фикс для Integration State
  fixIntegrationState(state: StateModel): StateModel {
    if (state.state_type === "integration" && state.transitions.length > 0) {
      return {
        ...state,
        transitions: [
          {
            state_id: state.transitions[0].state_id,
            case: null  // Принудительно null
          }
        ]
      };
    }
    return state;
  }
}
```

---

## 🧪 Тестирование интеграции

### 1. Запустите сервер
```bash
cd /Users/aleksandrzvezdakov/PycharmProjects/lct_efs/api
uvicorn app:app --host 127.0.0.1 --port 8000 --reload
```

### 2. Проверьте API через CURL
```bash
curl -X POST http://127.0.0.1:8000/workflow/save \
  -H "Content-Type: application/json" \
  -d '{
    "states": {
      "states": [
        {
          "state_type": "service",
          "name": "__init__",
          "initial_state": true,
          "final_state": false,
          "expressions": [],
          "transitions": [{"state_id": "end", "case": null}]
        },
        {
          "state_type": "screen",
          "name": "end",
          "initial_state": false,
          "final_state": true,
          "expressions": [{"event_name": "close"}],
          "transitions": []
        }
      ]
    },
    "predefined_context": {"test": true}
  }'
```

**Ожидаемый результат:**
```json
{
  "status": "success",
  "wf_description_id": "...",
  "wf_context_id": "..."
}
```

### 3. Проверьте из веб-части

Добавьте в консоль браузера:
```javascript
const api = new WorkflowAPI("http://127.0.0.1:8000");

const testStates = [
  {
    state_type: "service",
    name: "__init__",
    initial_state: true,
    final_state: false,
    expressions: [],
    transitions: [{state_id: "end", "case": null}]
  },
  {
    state_type: "screen",
    name: "end",
    initial_state: false,
    final_state: true,
    expressions: [{event_name: "close"}],
    transitions: []
  }
];

api.saveWorkflow(testStates, {test: true})
   .then(res => console.log("✅ Success:", res))
   .catch(err => console.error("❌ Error:", err));
```

---

## 📚 Дополнительные ресурсы

### Документация
- **Полный серверный контракт:** `SERVER_CONTRACT.md`
- **Интеграционный промпт:** `ADMIN_INTEGRATION_PROMPT.md`
- **Быстрый старт:** `ADMIN_QUICK_START.md`
- **JSON Schema:** `workflow-schema.json`

### Инструменты
- **Сравнение контрактов:** `python compare_contracts.py`
- **Примеры TypeScript:** `frontend-example/WorkflowAPI.tsx`
- **Pydantic модели:** `workflow_builder/state_parser/contract.py`

### API Endpoints
- **Swagger UI:** http://127.0.0.1:8000/docs
- **Save Workflow:** `POST /workflow/save`
- **Execute Workflow:** `POST /client/workflow`

---

## 🆘 Часто задаваемые вопросы

### Q: Как проверить, что контракт совместим?
**A:** Запустите `python compare_contracts.py` с примером из веб-части

### Q: Почему сервер возвращает ошибку валидации?
**A:** Проверьте структуру запроса (должна быть `{states: {states: [...]}}`) и наличие всех обязательных полей

### Q: Как обрабатывать Integration State в UI?
**A:** Показывайте только 1 поле для transition без возможности добавить `case`

### Q: Что делать, если в веб-части другие поля?
**A:** Маппинг при отправке: преобразуйте свои поля в серверный формат перед отправкой

### Q: Можно ли использовать старый контракт?
**A:** Нет, сервер использует новый контракт с валидацией. Нужно обновить веб-часть

---

## ✅ Итого

1. **Экспортируйте** пример из веб-части → `web_contract.json`
2. **Запустите** `python compare_contracts.py`
3. **Исправьте** различия по рекомендациям
4. **Обновите** TypeScript типы из `SERVER_CONTRACT.md`
5. **Добавьте** валидацию из примера выше
6. **Протестируйте** через CURL и веб-интерфейс

**Готово! Веб-часть интегрирована с сервером 🎉**

---

*Обновлено: 1 октября 2025 г.*
