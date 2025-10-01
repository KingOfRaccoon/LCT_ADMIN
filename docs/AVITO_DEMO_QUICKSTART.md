# 🚀 Быстрый старт: avitoDemo экспорт

## За 3 минуты от запуска до экспорта

### Шаг 1: Запуск приложения (30 сек)

```bash
npm run dev
```

Приложение откроется на `http://localhost:5174`

### Шаг 2: Открыть avitoDemo (30 сек)

1. Перейти на http://localhost:5174/products
2. Кликнуть на карточку **"Авито — Корзина"**
3. Дождаться сообщения "avitoDemo loaded successfully!" ✅

### Шаг 3: Проверить данные (1 мин)

На странице продукта должно быть:

✅ **Метаданные:**
- Название: "Авито — Корзина"
- Версия: v1.0.0
- Описание: "Демонстрационный сценарий корзины Avito..."

✅ **Список экранов:** 11 экранов
- Загрузка
- Корзина — Основной экран
- Карточка товара
- И т.д.

✅ **Кнопка:** "Export Workflow" (справа вверху)

### Шаг 4: Экспортировать workflow (1 мин)

#### Вариант A: Mock Mode (по умолчанию)

```bash
# Просто кликнуть "Export Workflow"
# Проверить консоль браузера (F12)
# Увидите структуру данных:
{
  workflow_name: "Авито — Корзина",
  states: [...]
}
```

#### Вариант B: Реальный Workflow Server

```bash
# 1. Запустить Workflow Server (в отдельном терминале)
cd workflow-server
uvicorn main:app --reload

# 2. В консоли браузера (F12):
localStorage.setItem('workflowServerUrl', 'http://127.0.0.1:8000');

# 3. Перезагрузить страницу

# 4. Кликнуть "Export Workflow"

# 5. Проверить Network вкладку:
#    POST http://127.0.0.1:8000/api/workflows
#    Status: 200 OK ✅
```

## 🎯 Готово!

Теперь avitoDemo экспортирован на Workflow Server.

---

## 📋 Что дальше?

### Посмотреть граф переходов
```
http://localhost:5174/products/avito-cart-demo/screens/start/editor
```

### Посмотреть детали экрана
```
http://localhost:5174/products/avito-cart-demo/screens/screen-loading/builder
```

### Запустить в песочнице
```
http://localhost:5174/sandbox
```
(Выбрать "Avito Demo" из списка пресетов)

---

## 🐛 Если что-то не работает

### Проблема: avitoDemo не загружается

**Решение:**
1. Проверить консоль (F12) → есть ли ошибки?
2. Проверить файл существует: `src/pages/Sandbox/data/avitoDemo.json`
3. Проверить React DevTools → VirtualContext → graphData

### Проблема: Export Workflow выдаёт ошибку

**Решение:**
1. Проверить что graphData.nodes не пустой
2. Проверить консоль → логи от useWorkflowApi
3. Если используется реальный сервер:
   - Проверить сервер запущен: `curl http://127.0.0.1:8000/health`
   - Проверить CORS настроен правильно
   - Проверить контракт API: `name` (не `state_name`), `state_id` (не `target_state_name`)

### Проблема: 422 Unprocessable Entity

**Причина:** Неверная структура данных

**Решение:**
1. Открыть `docs/WORKFLOW_FINAL_CONTRACT_FIX.md`
2. Убедиться что используется:
   - `state.name` (не `state.state_name`)
   - `transition.state_id` (не `transition.target_state_name`)
3. Проверить файлы:
   - `src/types/workflowContract.js`
   - `src/services/workflowApi.js`
   - `src/utils/workflowMapper.js`

---

## 📚 Полная документация

- **AVITO_DEMO_INTEGRATION.md** - Детальное описание интеграции
- **AVITO_DEMO_TEST_CHECKLIST.md** - Чеклист тестирования (50 пунктов)
- **AVITO_DEMO_SUMMARY.md** - Итоговый отчёт

---

## 💡 Советы

### Отладка через DevTools

```javascript
// В консоли браузера:

// 1. Проверить загруженные данные
console.log(window.__REACT_DEVTOOLS_GLOBAL_HOOK__);

// 2. Проверить VirtualContext
// React DevTools → Components → VirtualContextProvider → hooks → state

// 3. Проверить graphData
// Должно быть:
// - nodes: Array(11)
// - edges: Array(~25)
```

### Режим подробного логирования

```javascript
// В src/hooks/useWorkflowApi.js
// Временно включить детальные логи (уже добавлены)

// Вывод в консоль:
// ✅ [WorkflowAPI] Exporting workflow: Авито — Корзина
// ✅ [WorkflowAPI] Mapped 11 states from 11 nodes
// ✅ [WorkflowAPI] States: ["Загрузка корзины", "Корзина — Основной экран", ...]
// ✅ [WorkflowAPI] Total transitions: 25
// ✅ [WorkflowAPI] Export successful!
```

---

**Время выполнения:** ~3 минуты  
**Сложность:** 🟢 Легко  
**Статус:** ✅ Готово к продакшну
