# 📊 Workflow State Machine — Визуальная схема

## 🎯 Формат transitions по типам состояний

```
┌─────────────────────────────────────────────────────────────────┐
│                    SCREEN STATE                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  {                                                        │  │
│  │    "state_type": "screen",                               │  │
│  │    "name": "CartReviewScreen",                           │  │
│  │    "transitions": [                                      │  │
│  │      {                                                   │  │
│  │        "case": "proceed",          ◄─── event_name      │  │
│  │        "state_id": "CheckUserAuth"                       │  │
│  │      }                                                   │  │
│  │    ],                                                    │  │
│  │    "expressions": [                                      │  │
│  │      { "event_name": "proceed" }   ◄─── соответствие    │  │
│  │    ]                                                     │  │
│  │  }                                                       │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                   TECHNICAL STATE                               │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  {                                                        │  │
│  │    "state_type": "technical",                            │  │
│  │    "name": "CheckUserAuth",                              │  │
│  │    "transitions": [                                      │  │
│  │      {                                                   │  │
│  │        "variable": "is_authenticated",  ◄─── переменная │  │
│  │        "case": "True",                  ◄─── condition  │  │
│  │        "state_id": "AuthScreen"                          │  │
│  │      },                                                  │  │
│  │      {                                                   │  │
│  │        "variable": "is_authenticated",                   │  │
│  │        "case": "False",                                  │  │
│  │        "state_id": "GuestScreen"                         │  │
│  │      }                                                   │  │
│  │    ],                                                    │  │
│  │    "expressions": [                                      │  │
│  │      {                                                   │  │
│  │        "variable": "is_authenticated",                   │  │
│  │        "dependent_variables": ["user_token"],            │  │
│  │        "expression": "user_token is not None"            │  │
│  │      }                                                   │  │
│  │    ]                                                     │  │
│  │  }                                                       │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                  INTEGRATION STATE                              │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  {                                                        │  │
│  │    "state_type": "integration",                          │  │
│  │    "name": "UpdateCart",                                 │  │
│  │    "transitions": [                                      │  │
│  │      {                                                   │  │
│  │        "variable": "cart_updated",   ◄─── результат API │  │
│  │        "case": null,                 ◄─── всегда null   │  │
│  │        "state_id": "CheckCartUpdate"                     │  │
│  │      }                                                   │  │
│  │    ],                                                    │  │
│  │    "expressions": [                                      │  │
│  │      {                                                   │  │
│  │        "variable": "cart_updated",                       │  │
│  │        "url": "http://localhost:8080",                   │  │
│  │        "params": {},                                     │  │
│  │        "method": "get"                                   │  │
│  │      }                                                   │  │
│  │    ]                                                     │  │
│  │  }                                                       │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Типичный flow: Integration → Technical → Screen

```
┌──────────────────┐
│ Integration:     │
│ UpdateCart       │
│                  │
│ transitions:     │
│ ┌──────────────┐ │
│ │ variable:    │ │
│ │  cart_updated│ │
│ │ case: null   │ │
│ │ state_id:    │ │
│ │  CheckResult │ │
│ └──────────────┘ │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Technical:       │
│ CheckResult      │
│                  │
│ transitions:     │
│ ┌──────────────┐ │
│ │ variable:    │ │
│ │  cart_updated│ │
│ │ case: "True" │ │◄─── True branch
│ │ state_id:    │ │
│ │  SuccessScr  │ │
│ └──────────────┘ │
│ ┌──────────────┐ │
│ │ variable:    │ │
│ │  cart_updated│ │
│ │ case: "False"│ │◄─── False branch
│ │ state_id:    │ │
│ │  FailureScr  │ │
│ └──────────────┘ │
└────────┬─────────┘
         │
         ├─────────────┐
         ▼             ▼
┌──────────────┐  ┌──────────────┐
│ Screen:      │  │ Screen:      │
│ SuccessScr   │  │ FailureScr   │
│              │  │              │
│ transitions: │  │ transitions: │
│ ┌──────────┐ │  │ ┌──────────┐ │
│ │ case:    │ │  │ │ case:    │ │
│ │  "done"  │ │  │ │  "retry" │ │
│ │ state_id:│ │  │ │ state_id:│ │
│ │  Exit    │ │  │ │  Cart    │ │
│ └──────────┘ │  │ └──────────┘ │
└──────────────┘  └──────────────┘
```

---

## 📋 Порядок полей в transitions

```
Screen State:
┌─────────────────┐
│ case            │ ◄─── 1. event_name (строка)
├─────────────────┤
│ state_id        │ ◄─── 2. следующее состояние
└─────────────────┘

Technical State:
┌─────────────────┐
│ variable        │ ◄─── 1. переменная (опционально)
├─────────────────┤
│ case            │ ◄─── 2. condition (строка или null)
├─────────────────┤
│ state_id        │ ◄─── 3. следующее состояние
└─────────────────┘

Integration State:
┌─────────────────┐
│ variable        │ ◄─── 1. результат API (обязательно)
├─────────────────┤
│ case            │ ◄─── 2. всегда null
├─────────────────┤
│ state_id        │ ◄─── 3. следующее состояние
└─────────────────┘
```

---

## 🎯 Извлечение variable

### Integration State
```javascript
// Приоритет:
1. nodeData.config.resultVariable
2. nodeData.config.variable
3. edge.data.variable
4. Fallback: 'api_result'
```

### Technical State
```javascript
// Приоритет:
1. edge.data.variable
2. nodeData.config.resultVariable
3. nodeData.config.variable
4. Fallback: null (не добавляется)
```

---

## 📊 Таблица соответствия

| State Type | variable | case | state_id | Пример case |
|------------|----------|------|----------|-------------|
| **screen** | ❌ нет | ✅ event_name | ✅ да | `"checkout"` |
| **technical** | ⚠️ опционально | ✅ condition | ✅ да | `"True"`, `"False"` |
| **integration** | ✅ обязательно | ✅ всегда `null` | ✅ да | `null` |

---

## ✅ Validation Rules

### Screen State
```
✅ transitions[].case должен быть строкой (event_name)
✅ transitions[].case НЕ должен быть null (если нет события - не создавать transition)
✅ expressions[] должен содержать {event_name: "..."} для каждого case
❌ transitions[] НЕ должен содержать variable
```

### Technical State
```
✅ transitions[].variable должен быть одинаковым для всех transitions
✅ transitions[].case может быть строкой (condition) или null
✅ expressions[] должен содержать expression с тем же variable
⚠️ transitions[].variable опционален (может отсутствовать)
```

### Integration State
```
✅ transitions[] должен содержать ровно 1 элемент
✅ transitions[0].variable обязателен
✅ transitions[0].case ВСЕГДА null
✅ expressions[] должен содержать url, params, method
✅ expressions[0].variable должен совпадать с transitions[0].variable
```

---

## 🧪 Быстрая проверка

```bash
# Запустить тесты
node test-workflow-case-fix.js

# Ожидаемый результат:
# ✅ PASS: case = "checkout"
# ✅ PASS: Множественные события работают корректно
# ✅ PASS: Technical state использует condition, не event
# ✅ PASS: Integration state имеет case=null и variable
# ✅ PASS: Integration → Technical flow работает корректно
# 🎉 Все тесты пройдены успешно!
```

---

**Визуальная схема готова для быстрого понимания контракта!** 📊
