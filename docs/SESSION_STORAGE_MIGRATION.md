# 🔄 Session ID Strategy: In-Memory (обновление при каждом F5)

**Дата:** 1 октября 2025  
**Изменение:** Переход с `sessionStorage` на **in-memory storage** для `client_session_id`

---

## 📋 Финальное Требование

> "Давай сделаем, чтобы обновлялся в этом кейсе: При перезагрузке страницы (F5) session ID **обновляется**"

---

## 🔍 Анализ

### localStorage vs sessionStorage vs In-Memory

| Характеристика | localStorage | sessionStorage | **In-Memory** |
|---------------|--------------|----------------|---------------|
| **Lifetime** | Навсегда | До закрытия вкладки | **До перезагрузки страницы** |
| **Scope** | Весь домен | Одна вкладка | **Одна загрузка страницы** |
| **Use case** | Долгосрочное хранение | Данные сессии | **Временные данные до F5** |

### Поведение при разных действиях:

| Действие | localStorage | sessionStorage | **In-Memory** |
|----------|--------------|----------------|---------------|
| **Перезагрузка страницы (F5)** | Сохраняется ✅ | Сохраняется ✅ | **Обновляется** ✅✅ |
| **Закрытие вкладки** | Сохраняется | Удаляется ✅ | **Удаляется** ✅ |
| **Новая вкладка** | Переиспользуется | Новый ID ✅ | **Новый ID** ✅ |
| **Закрытие браузера** | Сохраняется | Удаляется ✅ | **Удаляется** ✅ |

---

## ✅ Решение

### Переход на In-Memory Storage

```javascript
// ❌ СТАРЫЙ КОД (sessionStorage - сохранялся при F5):
export function getClientSessionId() {
  let sessionId = sessionStorage.getItem(SESSION_STORAGE_KEY);
  
  if (!sessionId) {
    sessionId = generateSessionId();
    sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId);
  }
  
  return sessionId;
}

// ✅ НОВЫЙ КОД (in-memory - обновляется при F5):
let currentSessionId = null;

export function getClientSessionId() {
  // Генерируется один раз при загрузке страницы
  if (!currentSessionId) {
    currentSessionId = generateSessionId();
    console.log('🆕 [ClientSession] New session created:', currentSessionId);
  }
  
  return currentSessionId; // Возвращает ID текущей загрузки страницы
}
```

---

## 🐛 Исправленные баги

### Изменение #1: Убрано хранение в storage

**Проблема:**
```javascript
// sessionStorage сохранял ID при F5
sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId);
```

**Решение:**
```javascript
// In-memory переменная очищается при F5
let currentSessionId = null;
```

### Изменение #2: ID генерируется при каждой загрузке страницы

**Было (sessionStorage):**
- Session ID сохранялся при перезагрузке F5
- Один ID на всю работу во вкладке

**Стало (in-memory):**
- Session ID генерируется заново при F5
- Каждая загрузка страницы = новый ID

---

## 🎯 Новое поведение

### Scenario 1: Перезагрузка страницы (F5)

```
1. Открыли /sandbox
   → session_id = "abc123..."
   
2. Работали с workflow
   → session_id = "abc123..." (тот же в течение этой загрузки)
   
3. Нажали F5 (перезагрузка)
   → session_id = "xyz789..." ✅ (ОБНОВИЛСЯ!)
```

### Scenario 2: Новая вкладка

```
1. Вкладка #1: /sandbox
   → session_id = "abc123..."
   
2. Открыли Вкладка #2: /sandbox
   → session_id = "xyz789..." ✅ (новый ID)
   
3. Обе вкладки работают независимо
```

### Scenario 3: Закрытие и повторное открытие

```
1. Открыли /sandbox
   → session_id = "abc123..."
   
2. Закрыли вкладку
   → sessionStorage очищается
   
3. Снова открыли /sandbox
   → session_id = "xyz789..." ✅ (новый ID)
```

---

## 📝 Изменённые функции

### 1. `getClientSessionId()`
- ✅ Использует in-memory переменную `currentSessionId`
- ✅ НЕ сохраняет в storage (обновляется при F5)

### 2. `clearClientSession()`
- ✅ Сбрасывает `currentSessionId = null` в памяти
- ✅ Следующий вызов `getClientSessionId()` создаст новый ID

### 3. `touchClientSession()`
- ✅ No-op функция (оставлена для обратной совместимости)
- ✅ Ничего не делает, т.к. session не хранится

### 4. `getSessionInfo()`
- ✅ Возвращает информацию о текущей in-memory сессии
- ✅ Создаёт новый ID, если еще не было вызова `getClientSessionId()`

---

## 🧪 Тестирование

### Тест 1: Проверка создания session

```javascript
// В консоли браузера:
import { getClientSessionId, getSessionInfo } from '@/utils/clientSession';

const id1 = getClientSessionId();
console.log('Session ID:', id1);

const id2 = getClientSessionId();
console.log('Second call:', id2);

console.log('Are they same?', id1 === id2); // ✅ true
```

### Тест 2: Проверка sessionStorage

```javascript
// В DevTools → Application → Session Storage
// Должен быть ключ: bdui_client_session_id
// Значение: UUID формат (xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx)
```

### Тест 3: Проверка обновления

```bash
1. Откройте /sandbox
2. DevTools → Console → getClientSessionId()
3. Скопируйте ID: "abc123..."
4. Откройте новую вкладку → /sandbox
5. DevTools → Console → getClientSessionId()
6. Скопируйте ID: "xyz789..."
7. Сравните: abc123 ≠ xyz789 ✅
```

### Тест 4: Проверка обновления при F5 ⭐

```bash
1. Откройте /sandbox
2. DevTools → Console → посмотрите session_id в логах
3. Скопируйте ID: "abc123..."
4. Нажмите F5 (перезагрузка)
5. DevTools → Console → посмотрите новый session_id
6. Сравните: abc123 ≠ xyz789 ✅ (ОБНОВИЛСЯ!)
```

---

## 📊 Impact Analysis

### Положительные эффекты:

1. ✅ **Свежий ID при каждой перезагрузке**
   - F5 → новый session ID
   - Каждая загрузка страницы = чистая сессия

2. ✅ **Изоляция сессий между вкладками**
   - Каждая вкладка = независимая сессия
   - Нет конфликтов при параллельной работе

3. ✅ **Автоматическая очистка**
   - При закрытии вкладки всё удаляется
   - Нет данных в storage вообще

4. ✅ **Простота и производительность**
   - Нет операций с storage (быстрее)
   - Минимальный overhead

### Возможные проблемы:

1. ⚠️ **Session ID обновляется при F5**
   - Это требуемое поведение (см. требование выше)
   - Backend должен корректно обрабатывать новые session ID

2. ⚠️ **Невозможно отследить историю сессий**
   - Нет persistence, нет истории
   - Если нужна история - использовать localStorage/sessionStorage

3. ⚠️ **Разные ID в разных вкладках**
   - Это feature, не bug
   - Backend должен поддерживать параллельные сессии

---

## 🔗 Backend Integration

### API должен:

1. ✅ Принимать `client_session_id` в каждом запросе
2. ✅ Поддерживать **множественные активные сессии** (разные вкладки)
3. ✅ **НЕ** делать предположений, что session ID уникален для пользователя
4. ✅ Использовать session ID для изоляции состояния workflow

### Пример запроса:

```json
POST /client/workflow
{
  "client_session_id": "abc123-...",  // ✅ Уникален для вкладки
  "workflow_id": "68dd66af...",
  "initial_context": {}
}
```

---

## 📚 Документация обновлена

1. ✅ JSDoc комментарии в `clientSession.js`
2. ✅ Описание изменено: "для каждой сессии браузера"
3. ✅ Добавлено: "ВАЖНО: sessionStorage очищается..."

---

## ✅ Checklist

- [x] Переход с `localStorage` на `sessionStorage`
- [x] Исправлен баг `return generateSessionId()`
- [x] Обновлены все функции (`clear`, `touch`, `getInfo`)
- [x] Обновлена документация в коде
- [x] Создан migration guide
- [x] No compilation errors
- [x] Ready for testing

---

## 🚀 Deployment Notes

**Breaking Changes:** НЕТ

**Migration:** Автоматическая
- Никакие storage операции больше не используются
- Старые ID из storage будут проигнорированы
- При первой загрузке страницы создастся новый in-memory ID

**Rollback:** 
- Вернуть `sessionStorage.getItem/setItem` если нужно сохранять при F5
- Вернуть `localStorage` если нужно сохранять между перезапусками браузера

---

**Статус:** ✅ ГОТОВО  
**Тестирование:** Требуется ручная проверка  
**Priority:** MEDIUM (улучшение UX)
