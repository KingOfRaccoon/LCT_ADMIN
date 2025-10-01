# Workflow Integration - Краткое руководство

## 🎯 Что было добавлено

В проект BDUI Admin интегрирована поддержка экспорта workflow в серверный формат согласно `integration-guide.md`.

## 📦 Новые файлы

### 1. Типы контрактов
**Путь:** `src/types/workflowContract.js`

JSDoc типы для серверного контракта:
- `StateModel` - модель состояния
- `Expression` (Technical/Integration/Event)
- `Transition` - переходы между состояниями
- `SaveWorkflowRequest/Response`

### 2. Mapper (конвертер)
**Путь:** `src/utils/workflowMapper.js`

Функции преобразования BDUI → StateModel:
- `mapGraphDataToWorkflow()` - основная функция конвертации
- `exportWorkflowAsJson()` - экспорт в JSON строку
- Автоматическое определение типов узлов
- Извлечение зависимостей из биндингов

### 3. Workflow API клиент
**Путь:** `src/services/workflowApi.js`

Класс для работы с серверным API:
- `saveWorkflow()` - отправка на сервер
- `validateWorkflow()` - валидация перед отправкой
- `normalizeState()` - нормализация состояний
- Вспомогательные методы для создания expressions

### 4. Интеграция в ScreenEditor
**Путь:** `src/pages/ScreenEditor/ScreenEditor.jsx`

Добавлена кнопка **"Export to Server"**:
- Преобразует graphData в StateModel[]
- Валидирует контракт
- Отправляет на сервер (по умолчанию `http://127.0.0.1:8000`)
- Показывает toast уведомления

## 🚀 Как использовать

### Из UI (ScreenEditor)

1. Создайте flow в ScreenEditor
2. Нажмите **"Export to Server"**
3. Workflow будет отправлен на `POST /workflow/save`

### Программно

```javascript
import { mapGraphDataToWorkflow } from './utils/workflowMapper';
import { WorkflowAPI } from './services/workflowApi';

const graphData = { nodes: [...], edges: [...] };
const initialContext = { user: { id: '123' } };

const workflow = mapGraphDataToWorkflow(graphData, initialContext);
const api = new WorkflowAPI('http://127.0.0.1:8000');

const response = await api.saveWorkflow(
  workflow.states,
  workflow.predefined_context
);

console.log('Saved:', response.wf_description_id);
```

## 🔄 Маппинг узлов BDUI → StateType

| BDUI node.type | node.data.actionType | → StateType |
|---|---|---|
| `screen` | - | `screen` |
| `action` | `api-call` | `integration` |
| `action` | `condition`, `modify-cart-item`, `calculation` | `technical` |
| `service` | - | `service` |

## ✅ Валидация

Автоматические проверки:
- Ровно 1 `initial_state: true`
- Минимум 1 `final_state: true`
- Уникальные имена состояний
- Integration state: ровно 1 transition с `case: null`
- Все `state_id` в transitions существуют
- Обязательные поля: `expressions`, `transitions` (массивы)

## 📚 Документация

- **Руководство по интеграции:** `docs/integration-guide.md`
- **Примеры использования:** `docs/workflow-integration-example.md`
- **Типы контрактов:** `src/types/workflowContract.js`

## ⚙️ Конфигурация

### Изменить URL сервера

```javascript
// В ScreenEditor.jsx или любом другом месте
const api = new WorkflowAPI('https://your-server.com');
```

### Environment variable (рекомендуется)

```bash
# .env
VITE_WORKFLOW_API_URL=http://127.0.0.1:8000
```

```javascript
// В коде
const api = new WorkflowAPI(import.meta.env.VITE_WORKFLOW_API_URL);
```

## 🧪 Тестирование

### 1. Запустить сервер (если есть)
```bash
cd /path/to/workflow-server
uvicorn app:app --host 127.0.0.1 --port 8000 --reload
```

### 2. Создать тестовый flow
- Открыть ScreenEditor
- Добавить узлы: start (screen) → end (screen)
- Нажать "Export to Server"

### 3. Проверить консоль
Должен появиться ответ с `wf_description_id` и `wf_context_id`.

## 🔍 Отладка

### Просмотр преобразованного workflow

```javascript
import { mapGraphDataToWorkflow } from './utils/workflowMapper';

const workflow = mapGraphDataToWorkflow(graphData, initialContext);
console.log('Workflow:', JSON.stringify(workflow, null, 2));
```

### Валидация без отправки

```javascript
import { WorkflowAPI } from './services/workflowApi';

const api = new WorkflowAPI();
try {
  api.validateWorkflow(states);
  console.log('✅ Valid');
} catch (error) {
  console.error('❌', error.message);
}
```

## 🎯 Что дальше?

- [ ] Добавить настройки URL сервера в UI
- [ ] Сохранять `wf_description_id` в VirtualContext
- [ ] Добавить импорт workflow с сервера
- [ ] Визуализация ошибок валидации в UI
- [ ] Поддержка batch экспорта (нескольких flows)

---

*Интеграция выполнена согласно `docs/integration-guide.md`*
