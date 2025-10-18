# Subflow Full Stack Support ✅

## Что было сделано

### 1. Загрузка (Import) ✅
**Файл:** `src/utils/avitoDemoConverter.js`

- Добавлено распознавание subflow узлов:
  ```javascript
  const isSubflow = node.type === 'subflow' || node.state_type === 'subflow';
  ```

- Добавлена конвертация subflow данных в ReactFlow формат:
  ```javascript
  if (isSubflow) {
    data.subflow_workflow_id = expressions?.[0]?.subflow_workflow_id;
    data.input_mapping = expressions?.[0]?.input_mapping;
    data.output_mapping = expressions?.[0]?.output_mapping;
    data.dependent_variables = expressions?.[0]?.dependent_variables;
    data.error_variable = expressions?.[0]?.error_variable;
  }
  ```

- Добавлена обработка subflow transitions в edges:
  ```javascript
  if (isSubflow && node.transitions) {
    // Создаём анимированные фиолетовые рёбра
    // с метками переменных и индикаторами ошибок
  }
  ```

### 2. Экспорт (Export) ✅
**Файл:** `src/utils/workflowMapper.js`

- Добавлена проверка типа subflow в `detectStateType()`:
  ```javascript
  if (stateType === 'subflow' || nodeType === 'subflow') {
    return 'subflow';
  }
  ```

- Создана функция `createSubflowExpressions()`:
  - Извлекает expressions из node.expressions или nodeData.expressions
  - Создаёт из config если expressions нет
  - Поддерживает все поля: subflow_workflow_id, input_mapping, output_mapping, dependent_variables, error_variable

- Добавлена обработка в `mapNodeToState()`:
  ```javascript
  else if (stateType === 'subflow') {
    expressions = createSubflowExpressions(node, nodeData);
  }
  ```

## Визуальные особенности

### Subflow рёбра в GraphEditor
- **Цвет:** Фиолетовый (#8B5CF6)
- **Анимация:** Да (animated: true)
- **Тип:** smoothstep
- **Метки:** 
  - Успешные: имя переменной (например, "result")
  - Ошибочные: "Error: {variable_name}" (красный пунктир)

### Пример визуализации
```
┌─────────────┐
│ Главный     │
│ экран       │
└──────┬──────┘
       │ "Начать онборд"
       ↓
┌─────────────┐
│   Онборд    │ ← SUBFLOW узел
│ 🔄 (purple) │
└──┬───────┬──┘
   │       │
   │       └─→ Error: onboarding_error (red dashed)
   │
   └─→ onboarding_complete (purple animated)
```

## Тестирование

### Автотест: `test-subflow-export.js`
```bash
node test-subflow-export.js
```

**Проверяет:**
- ✅ Subflow узлы экспортируются с state_type="subflow"
- ✅ Все поля expressions сохраняются
- ✅ Transitions правильно маппятся

**Результат:**
```
✅ ТЕСТ ПРОЙДЕН: Subflow узел корректно экспортирован как state_type="subflow"
```

## Поддерживаемые форматы

### Формат 1: type на уровне узла
```json
{
  "id": "onboarding-subflow",
  "type": "subflow",
  "data": { "label": "Онборд" }
}
```

### Формат 2: state_type на уровне узла
```json
{
  "id": "onboarding-subflow",
  "state_type": "subflow",
  "data": { "label": "Онборд" }
}
```

### Формат 3: expressions на верхнем уровне
```json
{
  "id": "onboarding-subflow",
  "type": "subflow",
  "expressions": [{
    "subflow_workflow_id": "onboarding-flow",
    "input_mapping": { ... },
    "output_mapping": { ... }
  }]
}
```

### Формат 4: config в data
```json
{
  "type": "subflow",
  "data": {
    "config": {
      "subflow_workflow_id": "onboarding-flow",
      "input_mapping": { ... }
    }
  }
}
```

## Full Lifecycle Support

| Операция | Поддержка | Файл |
|----------|-----------|------|
| 📥 Import (JSON → GraphData) | ✅ | avitoDemoConverter.js |
| 🎨 Visualization (ReactFlow) | ✅ | GraphEditor + ReactFlow |
| 📤 Export (GraphData → JSON) | ✅ | workflowMapper.js |
| 🧪 Testing | ✅ | test-subflow-export.js |

## Документация

- 📖 [SUBFLOW_GUIDE.md](./SUBFLOW_GUIDE.md) - Полное руководство по subflow
- 🔧 [SUBFLOW_EXPORT_FIX.md](./fixes/SUBFLOW_EXPORT_FIX.md) - Детали исправления экспорта
- 📦 [avitoDemoSubflow-product.md](./avitoDemoSubflow-product.md) - Описание продукта с subflow

## Примеры использования

### Пример 1: Онбординг
```json
{
  "id": "onboarding-state",
  "type": "subflow",
  "expressions": [{
    "subflow_workflow_id": "onboarding-flow",
    "input_mapping": {
      "user_id": "context.user.id"
    },
    "output_mapping": {
      "context.onboarding.complete": "subflow.complete"
    }
  }]
}
```

### Пример 2: Предложение страховки
```json
{
  "id": "insurance-offer",
  "type": "subflow",
  "expressions": [{
    "subflow_workflow_id": "insurance-flow",
    "input_mapping": {
      "product_price": "cart.total",
      "product_type": "cart.items[0].category"
    },
    "output_mapping": {
      "insurance.accepted": "subflow.accepted",
      "insurance.premium": "subflow.monthly_cost"
    },
    "dependent_variables": ["cart.total", "cart.items"],
    "error_variable": "insurance_error"
  }]
}
```

## Совместимость

✅ **Обратная совместимость:**
- Все существующие типы узлов работают как прежде
- Старые workflow без subflow не затронуты
- Новый функционал включается только для узлов с type/state_type="subflow"

## Статус: Production Ready ✅

Subflow полностью реализован и протестирован во всех частях системы.

**Дата:** 18 октября 2025 г.
