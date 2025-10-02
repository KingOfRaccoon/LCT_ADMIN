# ✅ Чеклист развертывания на /admin/panel

## Проверка перед деплоем

### 1. Локальная проверка Production Build

```bash
# Очистка и пересборка
rm -rf dist node_modules/.vite
npm run build

# Запуск preview
npm run preview
```

**Ожидаемый результат:**
```
🔧 [Vite] Building in production mode with base path: /admin/panel
➜  Local:   http://localhost:4173/admin/panel
```

### 2. Проверка путей в index.html

```bash
cat dist/index.html
```

**Ожидаемое содержимое:**
```html
<link rel="icon" type="image/svg+xml" href="/admin/panel/vite.svg" />
<script type="module" crossorigin src="/admin/panel/assets/index-*.js"></script>
<link rel="stylesheet" crossorigin href="/admin/panel/assets/index-*.css">
```

✅ Все пути должны начинаться с `/admin/panel/`

### 3. Проверка в браузере

Откройте `http://localhost:4173/admin/panel` и проверьте:

- [ ] Главная страница загружается (редирект на `/admin/panel/products`)
- [ ] Навигация работает:
  - [ ] `/admin/panel/products` → список продуктов
  - [ ] `/admin/panel/sandbox` → песочница
  - [ ] `/admin/panel/analytics` → аналитика
  - [ ] `/admin/panel/preview` → превью
- [ ] Переходы между страницами НЕ теряют `/admin/panel`
- [ ] Обновление страницы (F5) работает корректно
- [ ] CSS и JavaScript загружаются без ошибок (проверьте DevTools → Network)

### 4. Проверка Router basename

Откройте DevTools → Console и выполните:

```javascript
console.log('BASE_URL:', import.meta.env.BASE_URL);
```

**Ожидаемый результат:** `BASE_URL: /admin/panel`

## Деплой на сервер

### 1. Подготовка билда

```bash
# На локальной машине
npm run build

# Архивируем dist
cd dist
tar -czf ../bdui-admin.tar.gz .
cd ..
```

### 2. Загрузка на сервер

```bash
# SCP на сервер
scp bdui-admin.tar.gz user@sandkittens.me:/tmp/

# SSH на сервер
ssh user@sandkittens.me

# Распаковка
sudo mkdir -p /var/www/bdui-admin
sudo tar -xzf /tmp/bdui-admin.tar.gz -C /var/www/bdui-admin/
sudo chown -R www-data:www-data /var/www/bdui-admin
```

### 3. Nginx конфигурация

Создайте/обновите `/etc/nginx/sites-available/sandkittens.me`:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name sandkittens.me;

    # React приложение на /admin/panel
    location /admin/panel {
        alias /var/www/bdui-admin;
        try_files $uri $uri/ /admin/panel/index.html;
        
        # Кэширование статики
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # API проксирование (если нужно)
    location /api/ {
        proxy_pass http://localhost:5050;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Активируйте конфигурацию:

```bash
sudo ln -s /etc/nginx/sites-available/sandkittens.me /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 4. HTTPS (опционально)

```bash
# Certbot для Let's Encrypt
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d sandkittens.me
```

## Проверка после деплоя

### Базовые проверки

- [ ] `https://sandkittens.me/admin/panel` → редирект на `/admin/panel/products`
- [ ] Все страницы загружаются
- [ ] Навигация работает без потери `/admin/panel`
- [ ] F5 (refresh) работает на любой странице
- [ ] DevTools → Console: нет ошибок 404 для assets
- [ ] DevTools → Network: все JS/CSS загружаются с кодом 200

### Проверка API (если используется)

```bash
# Проверка healthcheck
curl https://sandkittens.me/healthcheck

# Проверка Client Workflow API
curl -X POST https://sandkittens.me/client/workflow \
  -H "Content-Type: application/json" \
  -d '{"client_session_id": "test", "client_workflow_id": "avito-cart"}'
```

### Проверка аналитики

- [ ] Откройте `/admin/panel/sandbox`
- [ ] Откройте DevTools → Application → Local Storage
- [ ] Проверьте наличие ключа `bdui-analytics-events`
- [ ] Перейдите на `/admin/panel/analytics`
- [ ] Убедитесь, что события отображаются на дашборде

## Откат (Rollback)

Если что-то пошло не так:

```bash
# На сервере
sudo rm -rf /var/www/bdui-admin/*
sudo tar -xzf /var/www/bdui-admin-backup.tar.gz -C /var/www/bdui-admin/
sudo systemctl reload nginx
```

## Мониторинг

### Логи Nginx

```bash
# Логи доступа
sudo tail -f /var/log/nginx/access.log | grep "/admin/panel"

# Логи ошибок
sudo tail -f /var/log/nginx/error.log
```

### Проверка метрик

```bash
# Размер dist
du -sh /var/www/bdui-admin

# Количество файлов
find /var/www/bdui-admin -type f | wc -l
```

## Troubleshooting

### Проблема: 404 Not Found при прямом доступе

**Симптом:** `https://sandkittens.me/admin/panel/products` возвращает 404

**Решение:** Проверьте Nginx конфигурацию `try_files`:

```nginx
location /admin/panel {
    alias /var/www/bdui-admin;
    try_files $uri $uri/ /admin/panel/index.html;  # ← это обязательно!
}
```

### Проблема: CSS/JS не загружаются (404)

**Симптом:** Страница без стилей, ошибки в Console

**Решение:** Проверьте пути в `dist/index.html`:

```bash
cat /var/www/bdui-admin/index.html | grep -E "(href|src)="
```

Все пути должны начинаться с `/admin/panel/`.

### Проблема: Навигация теряет /admin/panel

**Симптом:** После клика на ссылку URL становится `/products` вместо `/admin/panel/products`

**Решение:** Проверьте `basename` в браузере:

```javascript
// DevTools Console
console.log('BASE_URL:', import.meta.env.BASE_URL);
```

Должно быть: `/admin/panel`. Если `/` — пересоберите:

```bash
rm -rf dist node_modules/.vite
npm run build
```

### Проблема: API запросы идут на неправильный URL

**Симптом:** Network показывает запросы на `https://sandkittens.me/admin/panel/api/...`

**Решение:** API URL не должен зависеть от `base`. Проверьте `src/config/api.js`:

```javascript
export const API_BASE_URL = 'https://sandkittens.me'; // без /admin/panel
```

## Контакты и поддержка

- 📧 Email: support@bdui.dev
- 📚 Docs: [docs/DEPLOY_SUBDOMAIN.md](./DEPLOY_SUBDOMAIN.md)
- 🐛 Issues: GitHub Issues

---
**Последнее обновление:** 2 октября 2025  
**Версия:** 1.0.0
