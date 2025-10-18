# ✅ Исправление onboarding-flow

**Дата**: 18 октября 2025  
**Статус**: ✅ Исправлено

## 🐛 Проблема

```
Failed to save onboarding-flow: 
Ошибка валидации workflow: 
State "Экран приветствия" has transition to non-existent state "onboarding-screen-2"
```

## 🔍 Причина

Несоответствие в маппере `workflowMapper.js`:

1. **state.name** создаётся из `node.label` → "Экран приветствия"
2. **nodeIdToName** создаётся из `node.data.label` → "onboarding_screen_1"
3. **transitions** ссылаются на ID узлов → "onboarding-screen-2"

Результат:
- Состояние называется "Экран приветствия"
- Переход ссылается на "onboarding-screen-2"
- Валидация не находит состояние с таким именем → ❌ Ошибка

## ✅ Решение

### 1. Убрать `node.label` (русские имена)

**Было:**
```json
{
  "id": "onboarding-screen-1",
  "label": "Экран приветствия",  // ← Используется как state.name
  "type": "screen"
}
```

**Стало:**
```json
{
  "id": "onboarding_screen_1",
  "type": "screen",
  "data": {
    "label": "onboarding_screen_1"  // ← Используется как state.name
  }
}
```

### 2. Использовать ID без дефисов

**Было:**
```json
"id": "onboarding-screen-1"  // ← Дефисы
```

**Стало:**
```json
"id": "onboarding_screen_1"  // ← Подчёркивания
```

### 3. Убрать переходы к "exit"

**Было:**
```json
{
  "final": true,
  "edges": [
    {
      "target": "exit"  // ← Несуществующее состояние
    }
  ]
}
```

**Стало:**
```json
{
  "final": true,
  "edges": []  // ← Нет переходов для финального состояния
}
```

## 📋 Итоговая структура

```json
{
  "nodes": [
    {
      "id": "onboarding_screen_1",
      "type": "screen",
      "data": {
        "label": "onboarding_screen_1",
        "screenId": "screen-onboarding-1"
      },
      "start": true,
      "edges": [
        {
          "target": "onboarding_screen_2"  // ✅ Ссылка на ID узла
        }
      ]
    },
    {
      "id": "onboarding_screen_2",
      "type": "screen",
      "data": {
        "label": "onboarding_screen_2",
        "screenId": "screen-onboarding-2"
      },
      "final": true,
      "edges": []  // ✅ Нет переходов
    }
  ]
}
```

## 🔄 Как работает маппер

```javascript
// 1. Создаётся карта ID → имя состояния
const nodeIdToName = new Map();
nodes.forEach(node => {
  const stateName = node.data?.label || node.id;
  nodeIdToName.set(node.id, stateName);
  // onboarding_screen_1 → "onboarding_screen_1"
  // onboarding_screen_2 → "onboarding_screen_2"
});

// 2. Создаётся состояние
const state = {
  state_type: "screen",
  name: node.label || nodeData.label || node.id
  // name = node.data.label = "onboarding_screen_1"
};

// 3. Создаются переходы
transitions.forEach(edge => {
  const targetName = nodeIdToName.get(edge.target);
  // edge.target = "onboarding_screen_2"
  // targetName = "onboarding_screen_2"
  // ✅ Совпадает с state.name!
});
```

## ✅ Результат

```
✅ All state references are valid!
✅ onboarding-flow is ready to save to backend!

States:
1. onboarding_screen_1 (initial)
   → onboarding_screen_2
   
2. onboarding_screen_2 (final)
   (no transitions)
```

## 🧪 Тестирование

```bash
node test-onboarding-flow.js
```

Вывод:
```
✅ Conversion successful
✅ States generated: 2
✅ "onboarding_screen_1" → "onboarding_screen_2"
✅ All state references are valid!
```

## 📝 Правила для GraphData subflow

1. **Не используйте `node.label`** - он конфликтует с `node.data.label`
2. **Используйте подчёркивания** вместо дефисов в ID
3. **Добавляйте `node.data.label`** = node.id
4. **Финальные узлы** должны иметь `edges: []`
5. **Не ссылайтесь на "exit"** - используйте `final: true`

## 🎯 Шаблон узла

```json
{
  "id": "my_state_id",
  "type": "screen",
  "data": {
    "label": "my_state_id",
    "screenId": "screen-id-here"
  },
  "screenId": "screen-id-here",
  "start": false,
  "final": false,
  "edges": [
    {
      "id": "edge-1",
      "event": "myEvent",
      "target": "next_state_id"
    }
  ]
}
```

---

**Итог**: Subflow теперь валидируется и готов к сохранению на бэкенд! 🎉
