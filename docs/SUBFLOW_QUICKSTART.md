# 🚀 Subflow Quick Start

## Минимальный пример subflow состояния

```json
{
  "state_type": "subflow",
  "name": "MySubflow",
  "screen": {},
  "transitions": [
    {
      "variable": "result",
      "case": null,
      "state_id": "NextState"
    },
    {
      "variable": "error",
      "case": null,
      "state_id": "ErrorState"
    }
  ],
  "expressions": [
    {
      "variable": "result",
      "subflow_workflow_id": "YOUR_SUBFLOW_ID_HERE",
      "input_mapping": {
        "param1": "context.value1"
      },
      "output_mapping": {
        "context.result": "subflow.output"
      },
      "dependent_variables": ["context.value1"],
      "error_variable": "error"
    }
  ],
  "events": [],
  "initial_state": false,
  "final_state": false
}
```

## ✅ Checklist

- [ ] `state_type: "subflow"`
- [ ] `screen: {}` (пустой объект)
- [ ] `events: []` (пустой массив)
- [ ] `variable` в expression совпадает с `variable` в transitions
- [ ] `subflow_workflow_id` указывает на существующий workflow
- [ ] `input_mapping` определён
- [ ] `output_mapping` определён
- [ ] `dependent_variables` перечислены
- [ ] `error_variable` указан для обработки ошибок

## 🎯 Используйте этот template

Замените:
- `"MySubflow"` → имя вашего состояния
- `"YOUR_SUBFLOW_ID_HERE"` → ID вашего subflow из MongoDB
- `"result"` → имя переменной результата
- `"error"` → имя переменной ошибки
- `input_mapping` → ваш маппинг входных параметров
- `output_mapping` → ваш маппинг выходных параметров
- `dependent_variables` → список зависимых переменных
- `"NextState"` → следующее состояние при успехе
- `"ErrorState"` → состояние при ошибке

## 💡 Совет

Сначала создайте и сохраните дочерний workflow через `POST /workflow/save`, затем используйте полученный `wf_description_id` в поле `subflow_workflow_id`.
