# ✅ Subflow Mapper Integration - Complete

**Дата**: 18 октября 2025  
**Статус**: ✅ Реализовано

## 🎯 Задача

Необходимо прогонять subflow через маппер перед отправкой на бэк, так как:
- Subflow хранятся в **GraphData формате** (nodes/edges)
- Бэкенд ожидает **StateModel формат** (states/transitions)

## ✅ Реализация

### Изменения в SubflowRegistry

```javascript
// Добавлен импорт маппера
import { mapGraphDataToWorkflow } from '../utils/workflowMapper';

async save(name) {
  // Автоопределение формата
  let states, context;
  
  if (subflow.definition.nodes && Array.isArray(subflow.definition.nodes)) {
    // GraphData → StateModel конвертация
    const mapped = mapGraphDataToWorkflow(subflow.definition, {});
    states = mapped.states;
    context = mapped.predefined_context || {};
    
  } else if (subflow.definition.states && Array.isArray(subflow.definition.states)) {
    // StateModel используется как есть
    states = subflow.definition.states;
    context = subflow.definition.predefined_context || {};
  }

  // Отправка на бэкенд в правильном формате
  const response = await this.api.saveWorkflow(states, context);
  return response.wf_description_id;
}
```

## 📋 Что изменилось

### До

```javascript
// Пытались отправить GraphData напрямую
const response = await this.api.saveWorkflow(
  subflow.definition.states || subflow.definition,
  subflow.definition.predefined_context || {}
);
// ❌ Бэкенд не понимал формат nodes/edges
```

### После

```javascript
// Автоматическая конвертация через маппер
if (subflow.definition.nodes) {
  const mapped = mapGraphDataToWorkflow(subflow.definition, {});
  states = mapped.states;  // ✅ Правильный формат
}

const response = await this.api.saveWorkflow(states, context);
// ✅ Бэкенд получает StateModel
```

## 🔄 Процесс

```
onboardingFlow.json (GraphData)
  └─ nodes: [...]
         ↓
  registry.save('onboarding-flow')
         ↓
  Detect format → GraphData
         ↓
  mapGraphDataToWorkflow()
         ↓
  StateModel
  └─ states: [...]
  └─ transitions: [...]
         ↓
  api.saveWorkflow(states, context)
         ↓
  Backend API
         ↓
  wf_description_id: "abc123"
```

## 💡 Преимущества

1. **Единый путь** - Workflow и Subflow используют один маппер
2. **Автоматически** - Определение формата и конвертация
3. **Совместимость** - Поддержка обоих форматов (GraphData и StateModel)
4. **Валидация** - Маппер проверяет корректность
5. **Логирование** - Видно процесс конвертации

## 📊 Логи

```
[SubflowRegistry] Saving onboarding-flow to backend...
[SubflowRegistry] Converting GraphData to StateModel for onboarding-flow...
[SubflowRegistry] Converted 2 nodes → 2 states
[SubflowRegistry] ✅ Saved onboarding-flow → abc123
```

## 🧪 Тестирование

1. Откройте http://localhost:5176/subflows
2. Нажмите "💾 Save" у `onboarding-flow`
3. Проверьте консоль:
   ```
   Converting GraphData to StateModel...
   Converted 2 nodes → 2 states
   ✅ Saved onboarding-flow → abc123
   ```

## 📚 Файлы

- **src/services/subflowRegistry.js** - Добавлена конвертация через маппер
- **docs/SUBFLOW_MAPPER_INTEGRATION.md** - Полная документация
- **test-subflow-mapper.js** - Тесты (опционально)

## 🎯 Итог

✅ Subflow теперь автоматически конвертируются через `workflowMapper` перед отправкой на бэкенд  
✅ Поддерживаются оба формата: GraphData и StateModel  
✅ Единый путь сохранения для workflow и subflow  
✅ Бэкенд получает правильный формат StateModel  

---

**Готово к использованию!** 🚀
