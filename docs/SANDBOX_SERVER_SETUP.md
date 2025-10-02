# 🚀 Настройка Sandbox Server для Preview

## Проблема

Preview страница не работает с локальным JS сервером из-за того, что сервер не запущен.

## Решение

### 1️⃣ Запуск локального JS сервера песочницы

Откройте **новый терминал** и запустите:

```bash
npm run sandbox:server
```

Вы должны увидеть:
```
[sandbox-js] Loading preset: avitoDemo from /path/to/TeST/src/pages/Sandbox/data/avitoDemo.json
Sandbox JS API listening on http://localhost:5050
```

### 2️⃣ Запуск Vite dev сервера

В **другом терминале** запустите:

```bash
npm run dev
```

Vite запустится на `http://localhost:5173/` (или 5174, если 5173 занят).

### 3️⃣ Проверка работы

Откройте в браузере:
- **Preview:** http://localhost:5173/preview
- **Sandbox:** http://localhost:5173/sandbox

Preview теперь будет работать с локальным JS сервером через Vite proxy.

---

## 🔧 Как это работает

### Архитектура

```
Browser → Vite Dev Server (5173) → Proxy → Sandbox JS Server (5050)
          ↓
          React App (Preview/Sandbox)
```

### Конфигурация Vite Proxy

В `vite.config.js`:

```javascript
proxy: {
  '/api/start': {
    target: 'http://localhost:5050',
    changeOrigin: true
  },
  '/api/action': {
    target: 'http://localhost:5050',
    changeOrigin: true
  }
}
```

### PreviewPage

PreviewPage использует **относительные URL** (`/api/start`, `/api/action`), которые автоматически проксируются Vite на локальный сервер.

```javascript
// По умолчанию - относительные пути (проксируются через Vite)
const buildApiUrl = (path) => {
  const apiBase = import.meta.env.VITE_SANDBOX_API_BASE;
  
  // Если базовый URL не задан, используем относительные пути
  if (!apiBase || apiBase.trim() === '') {
    return path; // → /api/start (проксируется на localhost:5050)
  }
  
  // Если задан, строим полный URL
  const base = apiBase.replace(/\/$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalizedPath}`;
};
```

---

## 🎯 Переменные окружения

### `SANDBOX_API_PROXY` (Vite)

Управляет проксированием в Vite:

```bash
# По умолчанию (используется локальный сервер)
SANDBOX_API_PROXY=http://localhost:5050

# Отключить proxy (для работы с внешним API)
SANDBOX_API_PROXY=off
```

### `VITE_SANDBOX_API_BASE` (PreviewPage)

Управляет URL для Preview:

```bash
# По умолчанию (пусто = использовать относительные пути + Vite proxy)
VITE_SANDBOX_API_BASE=

# Прямые запросы к серверу (без proxy)
VITE_SANDBOX_API_BASE=http://localhost:5050

# Внешний сервер
VITE_SANDBOX_API_BASE=https://sandkittens.me
```

### `SANDBOX_PRESET` (JS Server)

Выбор пресета данных для сервера:

```bash
# По умолчанию
SANDBOX_PRESET=avitoDemo

# Другой пресет
SANDBOX_PRESET=ecommerceDashboard
```

---

## 📝 Типичные проблемы

### ❌ Ошибка: `[vite] http proxy error: /api/start/ ECONNREFUSED`

**Причина:** Sandbox JS сервер не запущен.

**Решение:**
```bash
npm run sandbox:server
```

### ❌ Preview показывает "Загрузка..." бесконечно

**Причина:** Либо сервер не запущен, либо proxy не настроен.

**Решение:**
1. Проверьте, что `npm run sandbox:server` запущен
2. Проверьте консоль браузера на ошибки
3. Проверьте `vite.config.js` - proxy должен быть включен

### ❌ Порт 5050 уже занят

**Проверка:**
```bash
lsof -i :5050
```

**Решение:**
```bash
# Убить процесс
kill -9 <PID>

# Или использовать другой порт
SANDBOX_API_PORT=5051 npm run sandbox:server
```

---

## 🧪 Тестирование

### Проверка сервера

```bash
# Проверить /api/start
curl http://localhost:5050/api/start/

# Проверить /api/action
curl "http://localhost:5050/api/action?event=next"
```

### Проверка Vite proxy

```bash
# Через Vite dev server
curl http://localhost:5173/api/start/
```

Если вернулся JSON - всё работает! ✅

---

## 📚 Дополнительно

### Запуск двух серверов одновременно

Создайте скрипт `start-all.sh`:

```bash
#!/bin/bash
# Запускаем sandbox server в фоне
npm run sandbox:server &
SANDBOX_PID=$!

# Запускаем vite
npm run dev

# При выходе убиваем sandbox server
trap "kill $SANDBOX_PID" EXIT
```

Или используйте `concurrently`:

```bash
npm install -D concurrently

# В package.json
"scripts": {
  "dev:all": "concurrently \"npm run sandbox:server\" \"npm run dev\""
}
```

---

## ✅ Чеклист готовности

- [ ] `npm run sandbox:server` запущен и показывает "listening on http://localhost:5050"
- [ ] `npm run dev` запущен на http://localhost:5173
- [ ] Открыт http://localhost:5173/preview - видно стартовый экран
- [ ] Консоль браузера не показывает CORS или proxy ошибок
- [ ] События работают (кнопки кликаются, формы отправляются)

**Теперь Preview должен работать! 🎉**
