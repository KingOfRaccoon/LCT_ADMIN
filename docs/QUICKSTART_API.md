# 🚀 Быстрый старт: API интеграция

## URL для всех запросов

```
https://sandkittens.me
```

## 📡 Основной endpoint

### POST /client/workflow

**Body:**
```json
{
  "client_session_id": "1234567890",
  "client_workflow_id": "68dc7bc60335a481514bbb4c"
}
```

**Response:**
```json
{
  "nodes": [...],
  "edges": [...],
  "screens": {...},
  "initialContext": {...},
  "variableSchemas": {...}
}
```

## 🎯 Как использовать

### 1. Sandbox
```
/sandbox?session_id=1234567890&workflow_id=68dc7bc60335a481514bbb4c
```

### 2. Preview
```
/preview?session_id=1234567890&workflow_id=68dc7bc60335a481514bbb4c
```

### 3. Программно
```javascript
import { loadWorkflow } from '@/utils/workflowApi';

const workflow = await loadWorkflow('1234567890', '68dc7bc60335a481514bbb4c');
console.log(workflow.nodes);
```

## 🔧 Переопределить URL

Создайте `.env`:
```bash
VITE_WORKFLOW_API_BASE=https://your-custom-url.com
```

## 🧪 Тест

Откройте: `/workflow-tester.html`

---

Вот и всё! 🎉
