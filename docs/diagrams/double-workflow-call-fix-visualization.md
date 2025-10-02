# Визуализация защиты от двойных вызовов

## 🔄 Поток выполнения (до исправления)

```mermaid
sequenceDiagram
    participant React as React Strict Mode
    participant Component as ClientWorkflowRunner
    participant Hook as useClientWorkflow
    participant API as /client/workflow

    Note over React: Development Mode<br/>Монтирует компоненты 2x
    
    React->>Component: Mount #1
    Component->>Hook: startWorkflow(id, context)
    Hook->>API: POST /client/workflow ✅
    API-->>Hook: response
    
    React->>Component: Mount #2 (Strict Mode)
    Component->>Hook: startWorkflow(id, context)
    Hook->>API: POST /client/workflow ❌ DUPLICATE
    API-->>Hook: response
    
    Note over React,API: Проблема: 2 запроса для 1 workflow
```

## ✅ Поток выполнения (после исправления)

```mermaid
sequenceDiagram
    participant React as React Strict Mode
    participant Component as ClientWorkflowRunner
    participant Ref as useRef Guards
    participant Hook as useClientWorkflow
    participant API as /client/workflow

    Note over React: Development Mode<br/>Монтирует компоненты 2x
    
    React->>Component: Mount #1
    Component->>Ref: Check isStartingRef
    Ref-->>Component: false (not started)
    Component->>Ref: Set isStartingRef = true
    Component->>Hook: startWorkflow(id, context)
    Hook->>Hook: Check isLoading
    Note over Hook: isLoading = false<br/>✅ Proceed
    Hook->>API: POST /client/workflow ✅
    API-->>Hook: response
    Hook-->>Component: success
    Component->>Ref: Set isStartingRef = false
    
    React->>Component: Mount #2 (Strict Mode)
    Component->>Ref: Check isStartingRef
    Ref-->>Component: true (already started)
    Note over Component: ⚠️ Skip API call<br/>Guard prevented duplicate
    
    Note over React,API: Решение: 1 запрос, дубликат блокирован
```

## 🛡️ Механизм защиты (детально)

```mermaid
flowchart TD
    A[useEffect triggered] --> B{isStartingRef.current?}
    B -->|true| C[⚠️ Skip - already starting]
    B -->|false| D{workflow.currentState?}
    D -->|exists| E[⚠️ Skip - already started]
    D -->|null| F{workflow.isApiAvailable?}
    F -->|false| G[⚠️ Skip - API unavailable]
    F -->|true| H{workflowId exists?}
    H -->|no| I[⚠️ Skip - no workflow ID]
    H -->|yes| J{startedWorkflowIdRef === workflowId?}
    J -->|true| K[⚠️ Skip - already started this ID]
    J -->|false| L[✅ All checks passed]
    
    L --> M[Set isStartingRef = true]
    M --> N[Set startedWorkflowIdRef = workflowId]
    N --> O{workflow.isLoading?}
    O -->|true| P[⚠️ Hook blocks - already loading]
    O -->|false| Q[Set isLoading = true]
    Q --> R[POST /client/workflow]
    R --> S{Success?}
    S -->|yes| T[Update state]
    S -->|no| U[Set error]
    T --> V[Set isStartingRef = false]
    U --> W[Reset isStartingRef & startedWorkflowIdRef]
    
    style C fill:#ff6b6b
    style E fill:#ff6b6b
    style G fill:#ff6b6b
    style I fill:#ff6b6b
    style K fill:#ff6b6b
    style P fill:#ff6b6b
    style L fill:#51cf66
    style R fill:#51cf66
    style T fill:#51cf66
```

## 🎯 Три уровня защиты

```
┌─────────────────────────────────────────────────────────────┐
│                    Level 1: Component                        │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  useRef Guards                                          │ │
│  │  • isStartingRef: флаг процесса запуска                │ │
│  │  • startedWorkflowIdRef: ID запущенного workflow       │ │
│  │                                                         │ │
│  │  ✅ Блокирует повторные вызовы в одном компоненте     │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    Level 2: Hook                            │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  isLoading State                                        │ │
│  │  • Проверка перед каждым API вызовом                   │ │
│  │  • Игнорирует вызовы, если уже загружается            │ │
│  │                                                         │ │
│  │  ✅ Защита от race conditions                          │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    Level 3: Dependencies                     │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  useEffect Dependencies                                 │ │
│  │  • [workflowId, isApiAvailable, currentState]          │ │
│  │  • Предотвращает устаревшие замыкания                 │ │
│  │                                                         │ │
│  │  ✅ Правильная реактивность                            │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## 📊 Сравнение поведения

### Scenario 1: React Strict Mode (Development)

| Момент времени | До исправления | После исправления |
|---------------|---------------|------------------|
| t=0ms | Mount #1 | Mount #1 |
| t=10ms | **POST /client/workflow** | **POST /client/workflow** |
| t=50ms | Mount #2 (Strict Mode) | Mount #2 (Strict Mode) |
| t=60ms | **POST /client/workflow** ❌ | ⚠️ Skip (isStartingRef=true) ✅ |
| t=100ms | 2 requests completed | 1 request completed |

### Scenario 2: Параллельные вызовы

| Вызов | До исправления | После исправления |
|-------|---------------|------------------|
| Call #1 | POST /client/workflow | POST /client/workflow |
| Call #2 (parallel) | POST /client/workflow ❌ | ⚠️ Ignored (isLoading) ✅ |
| Call #3 (after #1) | POST /client/workflow | POST /client/workflow |

### Scenario 3: Переключение workflow_id

| Действие | workflow_id | Поведение |
|---------|-------------|-----------|
| Открыть /preview?id=111 | 111 | POST /client/workflow (id=111) ✅ |
| Изменить на ?id=222 | 222 | POST /client/workflow (id=222) ✅ |
| Вернуться на ?id=111 | 111 | POST /client/workflow (id=111) ✅ |

*Каждый новый workflow_id — новый запрос (это правильно)*

## 🎓 Ключевые концепции

### useRef vs useState

```javascript
// ❌ useState вызывает ре-рендер
const [isStarting, setIsStarting] = useState(false);
// Каждый setIsStarting(true) → ре-рендер → новый useEffect

// ✅ useRef НЕ вызывает ре-рендер
const isStartingRef = useRef(false);
// Изменение isStartingRef.current → без ре-рендера → useEffect стабилен
```

### Почему три проверки?

```javascript
if (
  !isStartingRef.current &&        // Защита от Strict Mode
  !workflow.currentState &&          // Защита от повторного старта
  workflow.isApiAvailable &&         // Защита от вызова до готовности API
  workflowId &&                      // Защита от пустого ID
  startedWorkflowIdRef.current !== workflowId  // Защита от повторного ID
) {
  // Все проверки пройдены — безопасно стартовать
}
```

---

**Документация актуальна на:** 1 октября 2025
