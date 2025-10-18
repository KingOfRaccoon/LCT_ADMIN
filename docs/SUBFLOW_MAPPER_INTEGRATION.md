# 🔄 Subflow Mapper Integration

**Дата**: 18 октября 2025  
**Версия**: 4.0

## 🎯 Проблема

Subflow определения хранятся в **GraphData формате** (nodes/edges), но бэкенд ожидает **StateModel формат** (states/transitions).

## ✅ Решение

Используем существующий `workflowMapper` для автоматической конвертации перед отправкой на бэкенд.

## 🔧 Реализация

### SubflowRegistry.save()

```javascript
import { mapGraphDataToWorkflow } from '../utils/workflowMapper';

async save(name) {
  const subflow = this.registry[name];
  
  // Определяем формат definition
  let states, context;
  
  if (subflow.definition.nodes && Array.isArray(subflow.definition.nodes)) {
    // 📦 GraphData формат - конвертируем через маппер
    console.log(`Converting GraphData to StateModel...`);
    const mapped = mapGraphDataToWorkflow(subflow.definition, {});
    states = mapped.states;
    context = mapped.predefined_context || {};
    console.log(`Converted ${subflow.definition.nodes.length} nodes → ${states.length} states`);
    
  } else if (subflow.definition.states && Array.isArray(subflow.definition.states)) {
    // ✅ StateModel формат - используем как есть
    console.log(`Using StateModel format`);
    states = subflow.definition.states;
    context = subflow.definition.predefined_context || {};
    
  } else {
    throw new Error(`Unknown subflow definition format`);
  }

  // Сохраняем на бэкенд в правильном формате
  const response = await this.api.saveWorkflow(states, context);
  return response.wf_description_id;
}
```

## 📋 Форматы

### GraphData (хранится в JSON)

```json
{
  "name": "onboarding-flow",
  "nodes": [
    {
      "id": "screen1",
      "type": "screen",
      "screenId": "onboarding_screen_1",
      "start": true,
      "edges": [
        {
          "id": "edge1",
          "event": "continue",
          "target": "screen2"
        }
      ]
    },
    {
      "id": "screen2",
      "type": "screen",
      "screenId": "onboarding_screen_2",
      "final": true,
      "edges": []
    }
  ]
}
```

### StateModel (отправляется на бэкенд)

```json
{
  "states": [
    {
      "state_id": "screen1",
      "state_type": "screen",
      "screen": {
        "screen_id": "onboarding_screen_1"
      },
      "transitions": [
        {
          "condition": "true",
          "next_state_id": "screen2",
          "events": ["continue"]
        }
      ]
    },
    {
      "state_id": "screen2",
      "state_type": "screen",
      "screen": {
        "screen_id": "onboarding_screen_2"
      },
      "transitions": []
    }
  ],
  "predefined_context": {}
}
```

## 🔄 Процесс конвертации

```
onboardingFlow.json (GraphData)
         ↓
   SubflowRegistry.save('onboarding-flow')
         ↓
   Detect format: has .nodes → GraphData
         ↓
   mapGraphDataToWorkflow(definition, {})
         ↓
   StateModel { states: [...], predefined_context: {} }
         ↓
   api.saveWorkflow(states, context)
         ↓
   POST /api/workflow/save
         ↓
   Response: { wf_description_id: "abc123" }
```

## 💡 Преимущества

1. **Единый путь** - И workflow, и subflow используют один маппер
2. **Валидация** - Маппер проверяет корректность данных
3. **Совместимость** - Бэкенд получает правильный формат
4. **Гибкость** - Поддержка обоих форматов (GraphData и StateModel)

## 🎨 Логирование

```javascript
[SubflowRegistry] Saving onboarding-flow to backend...
[SubflowRegistry] Converting GraphData to StateModel for onboarding-flow...
[SubflowRegistry] Converted 2 nodes → 2 states
[SubflowRegistry] ✅ Saved onboarding-flow → abc123
```

## 🧪 Тестирование

### 1. Создать subflow в GraphData формате

```json
{
  "name": "test-flow",
  "nodes": [
    {
      "id": "start",
      "type": "screen",
      "screenId": "test_screen",
      "start": true,
      "edges": []
    }
  ]
}
```

### 2. Зарегистрировать в реестре

```javascript
import testFlow from './data/subflows/testFlow.json';

registry.register('test-flow', testFlow, {
  description: 'Test flow',
  input_variables: [],
  output_variables: []
});
```

### 3. Сохранить на бэкенд

```javascript
const id = await registry.save('test-flow');
console.log('Saved with ID:', id);
```

### 4. Проверить логи

```
[SubflowRegistry] Saving test-flow to backend...
[SubflowRegistry] Converting GraphData to StateModel for test-flow...
[SubflowRegistry] Converted 1 nodes → 1 states
[SubflowRegistry] ✅ Saved test-flow → abc123
```

## 📊 Поддерживаемые форматы

| Формат | Определение | Конвертация | Пример |
|--------|-------------|-------------|--------|
| **GraphData** | `definition.nodes` exists | ✅ Через маппер | `onboardingFlow.json` |
| **StateModel** | `definition.states` exists | ✅ Как есть | Экспортированный workflow |
| **Unknown** | Ни того, ни другого | ❌ Error | - |

## ⚠️ Важно

1. **Все новые subflow** создавайте в GraphData формате
2. **Маппер автоматически** конвертирует перед отправкой
3. **Не нужно** вручную конвертировать
4. **Логи** покажут процесс конвертации

## 🔍 Отладка

### Проблема: "Unknown subflow definition format"

**Причина**: definition не содержит ни `nodes`, ни `states`

**Решение**: Проверьте структуру JSON файла

```javascript
// Правильно (GraphData)
{
  "nodes": [...]
}

// Правильно (StateModel)
{
  "states": [...]
}

// Неправильно
{
  "screens": [...]  // ← Неизвестный формат
}
```

### Проблема: Маппер бросает ошибку

**Причина**: Некорректная структура GraphData

**Решение**: Проверьте обязательные поля:
- `node.id` - уникальный идентификатор
- `node.type` - тип узла (screen, subflow, etc.)
- `node.edges` - массив переходов

## 📚 Связанные документы

- **docs/SUBFLOW_BACKEND_INTEGRATION.md** - Backend интеграция
- **docs/SUBFLOW_EXPORT_CONTRACT.md** - Спецификация формата StateModel
- **src/utils/workflowMapper.js** - Реализация маппера

## 🎯 Итог

Теперь subflow автоматически конвертируются через `workflowMapper` перед отправкой на бэкенд. Это гарантирует:

- ✅ Правильный формат для API
- ✅ Единый путь с обычными workflow
- ✅ Валидацию данных
- ✅ Поддержку всех типов узлов (screen, subflow, technical, integration)

---

**Обновлено**: 18 октября 2025
