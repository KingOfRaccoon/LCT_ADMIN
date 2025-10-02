# 📝 Summary: API Base URL Update

## Изменения

Обновлён базовый URL для всех API запросов с `http://localhost:8000` на `https://sandkittens.me`.

## Затронутые файлы

### Код:
- ✅ `src/utils/workflowApi.js`
- ✅ `src/services/workflowApi.js`
- ✅ `src/hooks/useWorkflowApi.js`
- ✅ `src/components/WorkflowSettings/WorkflowSettings.jsx`
- ✅ `src/utils/workflowIntegrationTests.js`

### Документация:
- ✅ `docs/workflow-api-integration.md`
- 📄 `docs/API_URL_UPDATE.md` (новый)
- 📄 `docs/QUICKSTART_API.md` (новый)

## Новый базовый URL

```
https://sandkittens.me
```

## Environment Variable

По умолчанию: `https://sandkittens.me`

Переопределить:
```bash
VITE_WORKFLOW_API_BASE=https://custom-url.com
```

## Тестирование

1. Откройте `/workflow-tester.html`
2. Введите `session_id` и `workflow_id`
3. Кликните "Открыть в Sandbox" или "Открыть в Preview"

## Статус

✅ Все файлы обновлены  
✅ Документация создана  
✅ Тестовая страница готова  
✅ Без ошибок компиляции  

---

**Commit message:**
```
feat: update API base URL to https://sandkittens.me

- Update workflowApi.js to use production URL
- Update all services and hooks
- Update WorkflowSettings component
- Update integration tests
- Add comprehensive documentation
- Add quick start guide
```
