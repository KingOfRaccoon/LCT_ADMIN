# 🔧 Исправление двойного вызова /client/workflow - README

## 📌 Краткое описание

Исправлена проблема **двойного вызова `/client/workflow` API** при монтировании компонентов `ClientWorkflowRunner` и `PreviewPageNew`.

---

## 🐛 Проблема

**Симптомы:**
- Два идентичных POST запроса к `/client/workflow` при открытии страницы
- Дублирование в Network tab DevTools
- Лишняя нагрузка на backend и клиент

**Причины:**
1. React Strict Mode монтирует компоненты дважды в dev-режиме
2. Неправильные зависимости в `useEffect`
3. Отсутствие защиты от повторных вызовов

---

## ✅ Решение

Реализовано **три уровня защиты**:

### 1. useRef Guards в компонентах
- `isStartingRef` — флаг процесса запуска
- `startedWorkflowIdRef` — ID запущенного workflow

### 2. isLoading Check в хуке
- Проверка состояния загрузки перед каждым вызовом
- Игнорирование параллельных вызовов

### 3. Правильные зависимости useEffect
- `[workflowId, workflow.isApiAvailable, workflow.currentState]`

---

## 📁 Изменённые файлы

| Файл | Изменения |
|------|-----------|
| `src/pages/Sandbox/ClientWorkflowRunner.jsx` | ✅ Добавлен useRef, улучшен useEffect |
| `src/pages/Preview/PreviewPageNew.jsx` | ✅ Добавлен useRef, улучшен useEffect |
| `src/hooks/useClientWorkflow.js` | ✅ Добавлена защита через isLoading |

---

## 📊 Результат

| Метрика | До | После | Улучшение |
|---------|-----|-------|-----------|
| API вызовы | 2 | 1 | ✅ -50% |
| Network traffic | 2x | 1x | ✅ -50% |
| Время загрузки | Медленнее | Быстрее | ✅ Оптимизация |

---

## 🧪 Тестирование

### Быстрая проверка:

1. Откройте http://localhost:5174/sandbox
2. DevTools → Network → Фильтр `client/workflow`
3. Должен быть **один** POST запрос

### Полный чеклист:

См. [CHECKLIST_DOUBLE_WORKFLOW_CALL_FIX.md](./CHECKLIST_DOUBLE_WORKFLOW_CALL_FIX.md)

---

## 📚 Документация

### Основные документы:

1. **[Fix Documentation](./fixes/double-client-workflow-call-fix.md)**  
   Подробное техническое описание исправления

2. **[Test Plan](./tests/test-double-workflow-call.md)**  
   Пошаговый план тестирования

3. **[Visualization](./diagrams/double-workflow-call-fix-visualization.md)**  
   Диаграммы и визуализации работы защиты

4. **[Summary](./DOUBLE_WORKFLOW_CALL_FIX_SUMMARY.md)**  
   Краткая сводка изменений

5. **[Checklist](./CHECKLIST_DOUBLE_WORKFLOW_CALL_FIX.md)**  
   Чеклист для приёмочного тестирования

### Связанные документы:

- [Client Workflow Integration](./CLIENT_WORKFLOW_INTEGRATION.md)
- [Client Workflow Status](./CLIENT_WORKFLOW_STATUS.md)
- [Client Workflow Quickstart](./CLIENT_WORKFLOW_QUICKSTART.md)

---

## 🎓 Ключевые концепции

### Почему useRef?

```javascript
// ❌ useState вызывает ре-рендер
const [isStarting, setIsStarting] = useState(false);

// ✅ useRef НЕ вызывает ре-рендер
const isStartingRef = useRef(false);
```

### Почему три проверки?

```javascript
if (
  !isStartingRef.current &&              // Защита от Strict Mode
  !workflow.currentState &&              // Уже запущен?
  workflow.isApiAvailable &&             // API готов?
  workflowId &&                          // ID есть?
  startedWorkflowIdRef.current !== workflowId  // Не тот же ID?
) {
  // Безопасно стартовать
}
```

---

## 🚀 Готово к production

- [x] Реализовано
- [x] Протестировано
- [x] Документировано
- [x] Code review passed
- [x] No errors in console
- [x] Network requests optimized

---

## 🔗 Quick Links

- [Main README](../README.md)
- [API Configuration](../API_CONFIG_SUMMARY.md)
- [Quickstart](../QUICKSTART.md)

---

**Дата:** 1 октября 2025  
**Версия:** 1.0.0  
**Статус:** ✅ Production Ready
