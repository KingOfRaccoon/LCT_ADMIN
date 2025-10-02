# Деплой на поддомен /admin/panel

## 🚀 Проблема

При деплое на `https://sandkittens.me/admin/panel` React Router терял базовый путь при переходах между страницами.

**Пример:**
- ✅ Работает: `https://sandkittens.me/admin/panel/products`
- ❌ Не работает после перехода: `https://sandkittens.me/products` (теряется `/admin/panel`)

## ✅ Решение

Добавлена поддержка базового пути через переменные окружения:

### 1. **Vite конфигурация** (`vite.config.js`)

```javascript
export default defineConfig(({ mode }) => ({
  // ...
  base: process.env.VITE_BASE_PATH || '/',
  // ...
}));
```

### 2. **React Router** (`src/App.jsx`)

```javascript
const basename = import.meta.env.BASE_URL;

function App() {
  return (
    <Router basename={basename}>
      {/* routes */}
    </Router>
  );
}
```

### 3. **Environment файлы**

#### `.env.development` (локальная разработка)
```bash
VITE_BASE_PATH=/
```

#### `.env.production` (продакшен)
```bash
VITE_BASE_PATH=/admin/panel
```

## 📋 Инструкция по деплою

### Development (локально)
```bash
npm run dev
# Приложение доступно на http://localhost:5173
```

### Production Build
```bash
npm run build
# Сгенерируется dist/ с базовым путем /admin/panel
```

### Preview Production Build
```bash
npm run build
npm run preview
# Проверка работы на http://localhost:4173/admin/panel
```

## 🔧 Настройка для других поддоменов

Если нужно изменить базовый путь:

1. **Отредактируйте `.env.production`:**
   ```bash
   VITE_BASE_PATH=/your/custom/path
   ```

2. **Пересоберите проект:**
   ```bash
   npm run build
   ```

## 🌐 Nginx конфигурация (пример)

```nginx
server {
    listen 80;
    server_name sandkittens.me;

    # React приложение на /admin/panel
    location /admin/panel {
        alias /var/www/bdui-admin/dist;
        try_files $uri $uri/ /admin/panel/index.html;
        
        # CORS заголовки (если нужно)
        add_header Access-Control-Allow-Origin *;
    }
}
```

## 📁 Структура после билда

```
dist/
├── admin/           # Базовый путь включён в структуру
│   └── panel/
│       ├── assets/  # JS, CSS с правильными путями
│       └── index.html
```

## ✅ Проверка корректности

После деплоя проверьте:

1. **Главная страница:**
   - https://sandkittens.me/admin/panel → редирект на `/admin/panel/products`

2. **Навигация:**
   - https://sandkittens.me/admin/panel/products ✅
   - https://sandkittens.me/admin/panel/sandbox ✅
   - https://sandkittens.me/admin/panel/analytics ✅

3. **Прямые ссылки:**
   - https://sandkittens.me/admin/panel/products/avito-cart/screens/start/editor ✅

4. **Refresh (F5):**
   - Любой URL должен работать после обновления страницы (требует настройки на сервере)

## 🔍 Отладка

### Проблема: 404 при обновлении страницы

**Решение:** Настройте сервер для возврата `index.html` на все запросы внутри `/admin/panel`.

### Проблема: CSS/JS не загружаются

**Причина:** Неправильный базовый путь в билде.

**Решение:** Проверьте `.env.production` и пересоберите:
```bash
rm -rf dist node_modules/.vite
npm run build
```

### Проблема: API запросы идут на неправильный URL

Если API на другом домене, обновите `src/config/api.js`:

```javascript
export const API_BASE_URL = process.env.VITE_API_URL || 'https://sandkittens.me';
```

И добавьте в `.env.production`:
```bash
VITE_API_URL=https://sandkittens.me
```

## 📝 Связанные файлы

- `vite.config.js` — настройка base
- `src/App.jsx` — настройка basename для Router
- `.env.development` — локальная разработка
- `.env.production` — продакшен билд

---
**Дата:** 2 октября 2025  
**Статус:** ✅ Готово к деплою
