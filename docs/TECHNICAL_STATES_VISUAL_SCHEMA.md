# Визуальная схема: Технические состояния

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         TECHNICAL STATE WORKFLOW                        │
└─────────────────────────────────────────────────────────────────────────┘

┌────────────────────┐
│  avitoDemo.json    │  ← Исходные данные
│                    │
│  {                 │
│    "nodes": [      │
│      {             │
│        "type": "technical",
│        "expressions": [...],
│        "transitions": [...]
│      }             │
│    ]               │
│  }                 │
└──────┬─────────────┘
       │
       ↓
┌──────────────────────────────────────────────────────────────────────────┐
│                      avitoDemoConverter.js                               │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1️⃣ NORMALIZATION                                                        │
│     normalizeExpression() ─→ Добавляет return_type, default_value       │
│     normalizeTransitions() ─→ Добавляет logic для множественных vars    │
│                                                                          │
│  2️⃣ CONVERSION                                                           │
│     convertNodesToReactFlow() ─→ React Flow nodes с data.expressions    │
│     convertEdgesToReactFlow() ─→ React Flow edges с data.logic          │
│                                                                          │
│  3️⃣ VALIDATION                                                           │
│     validateExpression() ─→ Проверка синтаксиса, типов, безопасности    │
│     validateNode() ─────→ Комплексная проверка узла                     │
│                                                                          │
│  4️⃣ METADATA EXTRACTION                                                  │
│     extractMetadata() ──→ Краткая информация для UI                     │
│     generateDocs() ─────→ Markdown документация                         │
│                                                                          │
│  5️⃣ EXPORT                                                               │
│     exportForBackend() ─→ Формат для отправки на сервер                 │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
       │
       ↓
┌────────────────────────────────────────────────────────────────┐
│                      React Flow graphData                      │
│                                                                │
│  nodes: [                                                      │
│    {                                                           │
│      id: "credit_check",                                       │
│      type: "technical",                                        │
│      data: {                                                   │
│        expressions: [                                          │
│          {                                                     │
│            variable: "credit_approved",                        │
│            expression: "income > 75000 and debt < 0.3",        │
│            return_type: "boolean",          ← NEW              │
│            default_value: false,            ← NEW              │
│            metadata: {                      ← NEW              │
│              description: "...",                               │
│              examples: [...]                                   │
│            }                                                   │
│          }                                                     │
│        ],                                                      │
│        transitions: [                                          │
│          {                                                     │
│            variables: ["var1", "var2"],                        │
│            logic: "all_true",               ← NEW              │
│            state_id: "NextState"                               │
│          }                                                     │
│        ]                                                       │
│      }                                                         │
│    }                                                           │
│  ]                                                             │
└────────────────────────────────────────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────────────────────────────────┐
│                    UI COMPONENTS (To be implemented)             │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ScreenEditor                                                    │
│  ├─ CustomNode (technical) ─→ Визуализация technical узлов      │
│  └─ CustomEdge ─────────────→ Лейблы с logic (ALL TRUE, etc)    │
│                                                                  │
│  ScreenBuilder                                                   │
│  ├─ TechnicalStateEditor                                         │
│  │  ├─ ExpressionEditor ──→ Редактирование выражений            │
│  │  │  ├─ return_type dropdown                                  │
│  │  │  ├─ default_value input                                   │
│  │  │  └─ Expression input с валидацией                         │
│  │  ├─ FunctionsPalette ──→ Список SAFE_FUNCTIONS_LIST          │
│  │  ├─ TransitionsEditor ─→ Редактирование переходов            │
│  │  │  └─ logic dropdown (all_true, any_true, ...)              │
│  │  └─ ExpressionTester ──→ Тест выражений                      │
│  │                                                               │
│  └─ MetadataEditor ────────→ description, tags, examples         │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────────────────────────────────┐
│                        Backend API                               │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  POST /api/workflow/save                                         │
│  ─→ Сохранение технического состояния                            │
│                                                                  │
│  POST /api/workflow/test-expression                              │
│  ─→ Тестирование выражения с контекстом                          │
│                                                                  │
│  GET /api/workflow/safe-functions                                │
│  ─→ Список доступных функций                                     │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

## 🔍 Детали: Expression Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                    TECHNICAL EXPRESSION                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  {                                                              │
│    variable: "credit_approved",         ← Имя результата        │
│    dependent_variables: [               ← Входные переменные    │
│      "annual_income",                                           │
│      "debt_ratio"                                               │
│    ],                                                           │
│    expression: "annual_income > 75000 and debt_ratio < 0.3",    │
│                  ↑                                              │
│                  └─ Может использовать SAFE_FUNCTIONS_LIST      │
│                                                                 │
│    return_type: "boolean",              ← Тип результата        │
│    default_value: false,                ← При ошибке            │
│                                                                 │
│    metadata: {                          ← Для админ-панели      │
│      description: "Проверка кредита",                           │
│      category: "credit_evaluation",                             │
│      tags: ["credit", "approval"],                              │
│      examples: [                                                │
│        {                                                        │
│          input: {annual_income: 80000, debt_ratio: 0.25},       │
│          output: true,                                          │
│          description: "Высокий доход - одобрено"                │
│        }                                                        │
│      ],                                                         │
│      author: "risk_team",                                       │
│      version: "2.1"                                             │
│    }                                                            │
│  }                                                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 🔀 Детали: Transition Logic

```
┌───────────────────────────────────────────────────────────────────┐
│                       TRANSITION TYPES                            │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  1️⃣ SINGLE VARIABLE                                               │
│     {                                                             │
│       variable: "email_valid",                                    │
│       case: "True",                                               │
│       state_id: "NextState"                                       │
│     }                                                             │
│     → Переход если email_valid == True                            │
│                                                                   │
│  2️⃣ MULTIPLE VARIABLES with LOGIC                                 │
│                                                                   │
│     ┌─ all_true ────────────────────────────────────────────┐    │
│     │  Все переменные должны быть True                      │    │
│     │  Пример: id_verified AND email_verified AND phone_...  │    │
│     └────────────────────────────────────────────────────────┘    │
│                                                                   │
│     ┌─ any_true ────────────────────────────────────────────┐    │
│     │  Хотя бы одна переменная True                         │    │
│     │  Пример: id_verified OR email_verified OR phone_...   │    │
│     └────────────────────────────────────────────────────────┘    │
│                                                                   │
│     ┌─ none_true / all_false ─────────────────────────────┐      │
│     │  Все переменные должны быть False                   │      │
│     │  Пример: NOT id_verified AND NOT email_verified     │      │
│     └──────────────────────────────────────────────────────┘      │
│                                                                   │
│     ┌─ exactly_one_true ─────────────────────────────────┐       │
│     │  Ровно одна переменная True, остальные False       │       │
│     │  Пример: XOR между переменными                     │       │
│     └─────────────────────────────────────────────────────┘       │
│                                                                   │
│     {                                                             │
│       variables: ["id_verified", "email_verified"],               │
│       logic: "all_true",                                          │
│       state_id: "FullyVerifiedState"                              │
│     }                                                             │
│     → Переход если (id_verified AND email_verified)              │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

## 🛡️ Безопасные функции (27 функций в 6 категориях)

```
┌──────────────────────────────────────────────────────────────────┐
│                     SAFE_FUNCTIONS_LIST                          │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  📐 MATH (6)                                                     │
│     abs(x)           → Абсолютное значение                       │
│     round(x, n)      → Округление до n знаков                    │
│     min(list)        → Минимальное значение                      │
│     max(list)        → Максимальное значение                     │
│     sum(list)        → Сумма элементов                           │
│     pow(x, n)        → Возведение в степень                      │
│                                                                  │
│  📝 STRING (6)                                                   │
│     upper(s)         → Преобразование в верхний регистр          │
│     lower(s)         → Преобразование в нижний регистр           │
│     strip(s)         → Удаление пробелов                         │
│     startswith(s, p) → Проверка начала строки                    │
│     endswith(s, p)   → Проверка окончания строки                 │
│     contains(s, sub) → Проверка вхождения подстроки              │
│                                                                  │
│  📚 COLLECTION (5)                                               │
│     len(x)           → Длина коллекции                           │
│     any(list)        → Хотя бы один True                         │
│     all(list)        → Все элементы True                         │
│     sorted(list)     → Сортировка списка                         │
│     reversed(list)   → Реверс списка                             │
│                                                                  │
│  ✅ CHECK (3)                                                    │
│     is_none(x)       → Проверка на None                          │
│     is_not_none(x)   → Проверка что не None                      │
│     is_empty(x)      → Проверка на пустоту                       │
│                                                                  │
│  🗂️ DICT (3)                                                     │
│     get(d, k, def)   → Получение значения из словаря             │
│     keys(d)          → Ключи словаря                             │
│     values(d)        → Значения словаря                          │
│                                                                  │
│  🔄 CAST (4)                                                     │
│     int(x, def)      → Преобразование в int                      │
│     float(x, def)    → Преобразование в float                    │
│     str(x)           → Преобразование в string                   │
│     bool(x)          → Преобразование в boolean                  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

## ✅ Validation Flow

```
┌────────────────────────────────────────────────────────────┐
│                  VALIDATION PIPELINE                       │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Expression Level                                          │
│  ─────────────────                                         │
│  ✓ Обязательные поля (variable, expression)               │
│  ✓ Корректность return_type                               │
│  ✓ Существование dependent_variables в схеме контекста    │
│  ✓ Запрещённые конструкции (__, import, eval, ...)        │
│  ✓ Длина выражения (макс. 1000 символов)                  │
│                                                            │
│  Node Level                                                │
│  ───────────                                               │
│  ✓ Наличие expressions[] и transitions[]                  │
│  ✓ Валидация каждого expression                           │
│  ✓ Все переменные в transitions определены в expressions  │
│  ✓ Корректность logic для множественных переменных        │
│  ✓ Наличие target state (state_id)                        │
│                                                            │
│  Result                                                    │
│  ──────                                                    │
│  {                                                         │
│    valid: boolean,                                         │
│    errors: [                                               │
│      "Expression[0] (var1): Invalid return_type",          │
│      "Transition[1]: Variable 'x' not defined",            │
│      ...                                                   │
│    ]                                                       │
│  }                                                         │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

**Легенда:**
- ✅ Реализовано и протестировано
- ⏳ Требует реализации (см. чеклист)
- 🔗 Интеграция с существующими компонентами
