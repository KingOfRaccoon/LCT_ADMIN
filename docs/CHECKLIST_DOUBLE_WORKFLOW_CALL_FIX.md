# ✅ Чеклист проверки исправления двойного вызова

**Дата:** 1 октября 2025  
**Dev Server:** http://localhost:5174  
**Проверяющий:** _____________  

---

## 📋 Pre-Check

- [ ] Dev-сервер запущен (`npm run dev`)
- [ ] Порт 5174 открыт в браузере
- [ ] DevTools открыты (F12 или Cmd+Option+I)
- [ ] Network tab отфильтрован по `client/workflow`
- [ ] Console tab открыт для логов

---

## 🧪 Test 1: Sandbox - ClientWorkflowRunner

### Шаги:
1. [ ] Очистите Network и Console
2. [ ] Перейдите на `http://localhost:5174/sandbox`
3. [ ] Дождитесь загрузки страницы

### Ожидаемый результат:

**Network:**
- [ ] **Ровно 1** запрос `POST /client/workflow`
- [ ] Нет дублирующихся запросов

**Console:**
- [ ] `🚀 [ClientWorkflowRunner] Auto-starting workflow: <id>`
- [ ] `✅ [ClientWorkflowRunner] Workflow started successfully`
- [ ] (Опционально) `⚠️ [useClientWorkflow] startWorkflow ignored: already loading`

**UI:**
- [ ] Экран отрисовался корректно
- [ ] Нет ошибок в интерфейсе
- [ ] History пуст или содержит стартовый экран

### Метрики:
- Количество запросов: _______
- Время загрузки: _______ ms
- Errors: _______ (должно быть 0)

---

## 🧪 Test 2: Preview - PreviewPageNew

### Шаги:
1. [ ] Очистите Network и Console
2. [ ] Перейдите на `http://localhost:5174/preview?workflow_id=68dd68fe8341ae5cb6c60024`
3. [ ] Дождитесь загрузки страницы

### Ожидаемый результат:

**Network:**
- [ ] **Ровно 1** запрос `POST /client/workflow`
- [ ] Нет дублирующихся запросов

**Console:**
- [ ] `🚀 [PreviewPage] Starting workflow: <id>`
- [ ] `✅ [PreviewPage] Workflow started successfully`
- [ ] (Опционально) `⚠️ [useClientWorkflow] startWorkflow ignored: already loading`

**UI:**
- [ ] Экран отрисовался корректно
- [ ] Кнопки Back/Refresh/Reset присутствуют
- [ ] Нет ошибок в интерфейсе

### Метрики:
- Количество запросов: _______
- Время загрузки: _______ ms
- Errors: _______ (должно быть 0)

---

## 🧪 Test 3: React Strict Mode (двойное монтирование)

### Проверка StrictMode:

1. [ ] Откройте `src/main.jsx`
2. [ ] Убедитесь, что есть `<React.StrictMode>`

```javascript
<React.StrictMode>
  <App />
</React.StrictMode>
```

### Шаги:
1. [ ] Hard refresh (Cmd+Shift+R или Ctrl+Shift+R)
2. [ ] Наблюдайте за Network и Console

### Ожидаемый результат:

**Поведение:**
- [ ] Компонент может монтироваться **дважды** в Console (это нормально)
- [ ] API вызывается **только один раз** (защита сработала)

**Console (возможные варианты):**
```
Вариант 1 (идеальный):
🚀 [Component] Auto-starting workflow: xxx
✅ [Component] Workflow started successfully

Вариант 2 (с блокировкой):
🚀 [Component] Auto-starting workflow: xxx
⚠️ [useClientWorkflow] startWorkflow ignored: already loading
✅ [Component] Workflow started successfully
```

- [ ] Любой из вариантов приемлем
- [ ] Главное: **1 POST запрос** в Network

---

## 🧪 Test 4: Переключение workflow_id

### Шаги:
1. [ ] Откройте Preview с `workflow_id=111111111111111111111111`
2. [ ] Дождитесь загрузки (должен быть 1 запрос)
3. [ ] Измените URL на `workflow_id=222222222222222222222222`
4. [ ] Дождитесь загрузки нового workflow

### Ожидаемый результат:

**Network:**
- [ ] **2 запроса** (по одному на каждый workflow_id)
- [ ] Первый: `workflow_id=111...`
- [ ] Второй: `workflow_id=222...`

**Console:**
- [ ] Два лога `🚀 Auto-starting workflow`
- [ ] Два лога `✅ Workflow started successfully`

### Метрики:
- Запрос #1 workflow_id: _______
- Запрос #2 workflow_id: _______
- Оба запроса уникальны: [ ] Да

---

## 🧪 Test 5: Параллельные вызовы (Manual)

### Открываем Console и выполняем:

```javascript
// Попытка двойного вызова
const testDoubleCall = async () => {
  const workflow = window.__useClientWorkflow; // если экспортируется
  
  Promise.all([
    workflow.startWorkflow('test1', {}),
    workflow.startWorkflow('test2', {})
  ]);
};

testDoubleCall();
```

### Ожидаемый результат:

**Console:**
- [ ] `⚠️ [useClientWorkflow] startWorkflow ignored: already loading`

**Network:**
- [ ] Только 1 запрос выполнился

---

## 🐛 Test 6: Error Handling

### Шаги:
1. [ ] Остановите backend (если локальный) или отключите интернет
2. [ ] Обновите страницу `/sandbox`
3. [ ] Наблюдайте за поведением

### Ожидаемый результат:

**UI:**
- [ ] Показывается error banner
- [ ] Сообщение: "Client Workflow API не отвечает"
- [ ] Кнопка "Попробовать снова" присутствует

**Console:**
- [ ] `❌ [ClientWorkflowRunner] Failed to auto-start: <error>`
- [ ] `isStartingRef` сброшен в `false` (проверка: повторный запрос возможен)
- [ ] `startedWorkflowIdRef` сброшен в `null`

---

## 🔍 Test 7: localStorage Session

### Шаги:
1. [ ] Откройте DevTools → Application → Local Storage
2. [ ] Найдите ключ `bdui_client_session_id`
3. [ ] Скопируйте значение: _______________________

### Проверка:
1. [ ] Обновите страницу (F5)
2. [ ] Проверьте, что `bdui_client_session_id` **не изменился**
3. [ ] Откройте новую вкладку → тот же домен
4. [ ] `bdui_client_session_id` **тот же самый**

### Ожидаемый результат:
- [ ] Session ID сохраняется между перезагрузками
- [ ] Session ID один для всех вкладок
- [ ] Формат: UUID v4 (например, `550e8400-e29b-41d4-a716-446655440000`)

---

## 📊 Сводная таблица результатов

| Test | Ожидается | Результат | Статус |
|------|-----------|-----------|--------|
| Test 1: Sandbox | 1 POST запрос | _______ | [ ] ✅ / [ ] ❌ |
| Test 2: Preview | 1 POST запрос | _______ | [ ] ✅ / [ ] ❌ |
| Test 3: Strict Mode | 1 POST запрос | _______ | [ ] ✅ / [ ] ❌ |
| Test 4: Переключение ID | 2 POST запроса | _______ | [ ] ✅ / [ ] ❌ |
| Test 5: Параллельные вызовы | 1 POST запрос | _______ | [ ] ✅ / [ ] ❌ |
| Test 6: Error Handling | Error banner | _______ | [ ] ✅ / [ ] ❌ |
| Test 7: localStorage | Persistent ID | _______ | [ ] ✅ / [ ] ❌ |

---

## ✅ Финальная оценка

### Все тесты пройдены?
- [ ] **Да** — Готово к production
- [ ] **Нет** — Требуется доработка

### Найденные проблемы:
```
1. _________________________________________
2. _________________________________________
3. _________________________________________
```

### Комментарии:
```
_________________________________________
_________________________________________
_________________________________________
```

---

## 🚀 Sign-off

**Проверено:**
- Имя: _____________
- Дата: _____________
- Подпись: _____________

**Статус:** [ ] ✅ APPROVED  [ ] ❌ REJECTED  [ ] 🔄 NEEDS REVISION

---

## 📚 Справочные документы

- [Fix Documentation](./fixes/double-client-workflow-call-fix.md)
- [Test Plan](./tests/test-double-workflow-call.md)
- [Visualization](./diagrams/double-workflow-call-fix-visualization.md)
- [Summary](./DOUBLE_WORKFLOW_CALL_FIX_SUMMARY.md)
