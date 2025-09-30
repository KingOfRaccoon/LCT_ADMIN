# BDUI Platform - Deployment Guide

## Overview

Этот гайд описывает процесс развёртывания BDUI Platform в production окружении. Платформа состоит из трёх компонентов:

1. **Frontend (React + Vite)** — admin panel на порту 5173 (dev) или статика для nginx/Caddy
2. **JS Sandbox Server (Express)** — REST API на порту 5050
3. **Python Sandbox Server (FastAPI)** — альтернативный REST API на порту 8000

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Frontend Deployment](#frontend-deployment-vite)
- [JS Sandbox Server](#js-sandbox-server-express)
- [Python Sandbox Server](#python-sandbox-server-fastapi)
- [Production Considerations](#production-considerations)
- [Docker Deployment](#docker-deployment)
- [Monitoring & Logging](#monitoring--logging)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### System Requirements

**Минимальные:**
- CPU: 2 cores
- RAM: 2GB
- Disk: 5GB
- OS: Linux (Ubuntu 22.04, Debian 11), macOS, Windows

**Рекомендуемые для production:**
- CPU: 4+ cores
- RAM: 4GB+
- Disk: 20GB+ (для логов и аналитики)
- OS: Ubuntu 22.04 LTS

### Software Dependencies

**Frontend:**
- Node.js ≥ 20.19.0
- npm ≥ 10.9.0

**JS Server:**
- Node.js ≥ 20.19.0
- npm ≥ 10.9.0

**Python Server:**
- Python ≥ 3.10
- pip ≥ 23.0

**Optional:**
- Docker ≥ 24.0 + Docker Compose ≥ 2.20
- nginx ≥ 1.24 или Caddy ≥ 2.7 (reverse proxy)
- PM2 ≥ 5.3 (process manager для Node.js)

---

## Frontend Deployment (Vite)

### Development Mode

```bash
cd /path/to/bdui
npm install
npm run dev
# → http://localhost:5173
```

### Production Build

```bash
# Build для production
npm run build
# → Output: dist/

# Структура dist/:
dist/
├── index.html
├── assets/
│   ├── index-[hash].js
│   ├── index-[hash].css
│   └── ...
└── vite.svg
```

### Environment Variables

Create `.env.production`:

```bash
# API endpoints
VITE_API_BASE_URL=https://api.yourdomain.com

# Analytics
VITE_ANALYTICS_ENABLED=true

# Debug logging (отключить в production)
VITE_VC_TRACE=false
```

**Load env vars:**
```bash
# Vite автоматически загружает .env.production при build
npm run build
```

### Hosting Options

#### Option 1: Static Hosting (Vercel, Netlify, GitHub Pages)

**Vercel:**
```bash
npm install -g vercel
vercel --prod
```

**Netlify:**
```bash
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

**GitHub Pages:**
```bash
# Настройте vite.config.js:
export default defineConfig({
  base: '/your-repo-name/',
  build: { outDir: 'dist' }
});

npm run build
git add dist -f
git commit -m "Deploy to GitHub Pages"
git subtree push --prefix dist origin gh-pages
```

#### Option 2: nginx

**Install nginx:**
```bash
sudo apt update
sudo apt install nginx
```

**nginx config (`/etc/nginx/sites-available/bdui`):**
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    root /var/www/bdui/dist;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript;
    gzip_min_length 1000;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA fallback (все routes → index.html)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy (опционально, если Sandbox Server на том же сервере)
    location /api/ {
        proxy_pass http://localhost:5050/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Enable site:**
```bash
sudo ln -s /etc/nginx/sites-available/bdui /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

**Deploy frontend:**
```bash
# На сервере
cd /var/www/bdui
git pull origin master
npm install
npm run build
sudo systemctl reload nginx
```

#### Option 3: Caddy (с автоматическим HTTPS)

**Caddyfile:**
```
yourdomain.com {
    root * /var/www/bdui/dist
    encode gzip
    file_server
    try_files {path} /index.html

    # API proxy
    reverse_proxy /api/* localhost:5050
}
```

**Deploy:**
```bash
sudo caddy reload --config /etc/caddy/Caddyfile
```

---

## JS Sandbox Server (Express)

### Installation

```bash
cd /path/to/bdui
npm install
```

### Environment Variables

Create `.env.production`:

```bash
# Server configuration
SANDBOX_API_PORT=5050
NODE_ENV=production

# Preset selection
SANDBOX_PRESET=avitoDemo  # или ecommerceDashboard

# CORS
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Debug logging (отключить в production)
VC_TRACE=false
```

### Running in Development

```bash
npm run sandbox:server
# → http://localhost:5050
```

### Production Deployment

#### Option 1: PM2 (Process Manager)

**Install PM2:**
```bash
npm install -g pm2
```

**ecosystem.config.js:**
```javascript
module.exports = {
  apps: [{
    name: 'bdui-sandbox-api',
    script: './server/js/server.js',
    instances: 2,  // Cluster mode (2 workers)
    exec_mode: 'cluster',
    env_production: {
      NODE_ENV: 'production',
      SANDBOX_API_PORT: 5050,
      SANDBOX_PRESET: 'avitoDemo',
      ALLOWED_ORIGINS: 'https://yourdomain.com'
    },
    error_file: './logs/sandbox-error.log',
    out_file: './logs/sandbox-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_memory_restart: '500M'
  }]
};
```

**Start with PM2:**
```bash
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup  # Auto-start on reboot
```

**PM2 commands:**
```bash
pm2 list                # List processes
pm2 logs bdui-sandbox-api  # View logs
pm2 restart bdui-sandbox-api
pm2 stop bdui-sandbox-api
pm2 delete bdui-sandbox-api
pm2 monit               # Real-time monitoring
```

#### Option 2: systemd Service

**Create service file (`/etc/systemd/system/bdui-sandbox.service`):**
```ini
[Unit]
Description=BDUI Sandbox API Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/bdui
ExecStart=/usr/bin/node server/js/server.js
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=bdui-sandbox

# Environment variables
Environment="NODE_ENV=production"
Environment="SANDBOX_API_PORT=5050"
Environment="SANDBOX_PRESET=avitoDemo"
Environment="ALLOWED_ORIGINS=https://yourdomain.com"

[Install]
WantedBy=multi-user.target
```

**Enable and start:**
```bash
sudo systemctl daemon-reload
sudo systemctl enable bdui-sandbox
sudo systemctl start bdui-sandbox
sudo systemctl status bdui-sandbox
```

**View logs:**
```bash
sudo journalctl -u bdui-sandbox -f
```

---

## Python Sandbox Server (FastAPI)

### Installation

```bash
cd /path/to/bdui/server
pip install -r requirements.txt
```

**requirements.txt:**
```
fastapi==0.104.1
uvicorn[standard]==0.24.0
pydantic==2.4.2
python-multipart==0.0.6
```

### Environment Variables

Create `.env`:

```bash
# Server configuration
UVICORN_HOST=0.0.0.0
UVICORN_PORT=8000
UVICORN_LOG_LEVEL=info

# CORS
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Preset (TODO: добавить поддержку SANDBOX_PRESET в server/main.py)
# SANDBOX_PRESET=avitoDemo
```

### Running in Development

```bash
cd server
uvicorn main:app --reload
# → http://localhost:8000
# Docs: http://localhost:8000/docs
```

### Production Deployment

#### Option 1: Gunicorn + Uvicorn Workers

**Install gunicorn:**
```bash
pip install gunicorn
```

**Start with gunicorn:**
```bash
cd server
gunicorn main:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000 \
  --access-logfile logs/access.log \
  --error-logfile logs/error.log \
  --log-level info \
  --timeout 120
```

**gunicorn.conf.py:**
```python
import multiprocessing

bind = "0.0.0.0:8000"
workers = multiprocessing.cpu_count() * 2 + 1
worker_class = "uvicorn.workers.UvicornWorker"
accesslog = "logs/access.log"
errorlog = "logs/error.log"
loglevel = "info"
timeout = 120
keepalive = 5
```

**Start:**
```bash
gunicorn -c gunicorn.conf.py main:app
```

#### Option 2: systemd Service

**Create service file (`/etc/systemd/system/bdui-sandbox-py.service`):**
```ini
[Unit]
Description=BDUI Sandbox FastAPI Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/bdui/server
ExecStart=/usr/local/bin/gunicorn main:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000 \
  --access-logfile /var/log/bdui/access.log \
  --error-logfile /var/log/bdui/error.log
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=bdui-sandbox-py

# Environment variables
Environment="PYTHONPATH=/var/www/bdui"
Environment="UVICORN_LOG_LEVEL=info"
Environment="ALLOWED_ORIGINS=https://yourdomain.com"

[Install]
WantedBy=multi-user.target
```

**Enable and start:**
```bash
sudo systemctl daemon-reload
sudo systemctl enable bdui-sandbox-py
sudo systemctl start bdui-sandbox-py
sudo systemctl status bdui-sandbox-py
```

---

## Production Considerations

### HTTPS & SSL

**nginx with Let's Encrypt:**
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

**Auto-renewal:**
```bash
sudo certbot renew --dry-run
sudo systemctl status certbot.timer
```

**Caddy (automatic HTTPS):**
```
# Caddy автоматически получает SSL сертификаты
yourdomain.com {
    reverse_proxy localhost:5173
}
```

### CORS Configuration

**Express (server/js/server.js):**
```javascript
import cors from 'cors';

const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS']
}));
```

**FastAPI (server/main.py):**
```python
from fastapi.middleware.cors import CORSMiddleware
import os

allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Rate Limiting

**Express (express-rate-limit):**
```javascript
import rateLimit from 'express-rate-limit';

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 100,             // 100 requests per minute
  message: 'Too many requests, please try again later.'
});

app.use('/api/', apiLimiter);
```

**FastAPI (slowapi):**
```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.post("/api/action")
@limiter.limit("100/minute")
async def handle_action(request: Request):
    # ...
```

### Security Headers

**nginx:**
```nginx
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "no-referrer-when-downgrade" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';" always;
```

**Express (helmet):**
```javascript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"]
    }
  }
}));
```

---

## Docker Deployment

### Dockerfile (Frontend)

```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**nginx.conf:**
```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### Dockerfile (JS Sandbox Server)

```dockerfile
FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .

EXPOSE 5050
ENV NODE_ENV=production
ENV SANDBOX_API_PORT=5050

CMD ["node", "server/js/server.js"]
```

### Dockerfile (Python Sandbox Server)

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY server/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY server/ ./server/
COPY src/pages/Sandbox/data/ ./src/pages/Sandbox/data/

EXPOSE 8000
ENV PYTHONPATH=/app

CMD ["gunicorn", "server.main:app", "--workers", "4", "--worker-class", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000"]
```

### docker-compose.yml

```yaml
version: '3.9'

services:
  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    ports:
      - "80:80"
    environment:
      - VITE_API_BASE_URL=http://sandbox-api:5050
    depends_on:
      - sandbox-api

  sandbox-api:
    build:
      context: .
      dockerfile: Dockerfile.sandbox-js
    ports:
      - "5050:5050"
    environment:
      - NODE_ENV=production
      - SANDBOX_API_PORT=5050
      - SANDBOX_PRESET=avitoDemo
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped

  sandbox-api-py:
    build:
      context: .
      dockerfile: Dockerfile.sandbox-py
    ports:
      - "8000:8000"
    environment:
      - PYTHONPATH=/app
      - UVICORN_LOG_LEVEL=info
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped

volumes:
  logs:
```

**Build and run:**
```bash
docker-compose up -d
docker-compose logs -f
docker-compose ps
```

---

## Monitoring & Logging

### Logging

**Frontend (Vite):**
- Browser console errors (доступны через DevTools)
- Analytics events в localStorage (`bdui.analytics.events`)

**JS Server:**
```javascript
// server/js/server.js
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

logger.info('Server started on port 5050');
logger.error('Failed to load dataset', { error: err.message });
```

**Python Server:**
```python
# server/main.py
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/server.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)
logger.info("Server started")
```

### Monitoring with PM2

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7

pm2 monit  # Real-time monitoring
```

### Health Checks

**Express:**
```javascript
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});
```

**FastAPI:**
```python
@app.get("/health")
async def health_check():
    return {"status": "ok", "uptime": time.time() - start_time}
```

**nginx health check:**
```nginx
location /health {
    access_log off;
    return 200 "healthy\n";
    add_header Content-Type text/plain;
}
```

---

## Troubleshooting

### Common Issues

**1. Frontend не подключается к API**

**Симптомы:** CORS errors в console, failed fetch requests

**Решение:**
```bash
# Проверьте VITE_API_BASE_URL
cat .env.production

# Проверьте CORS в server/js/server.js
grep -A5 "cors" server/js/server.js

# Убедитесь, что API сервер запущен
curl http://localhost:5050/health
```

**2. PM2 процессы падают**

**Симптомы:** `pm2 list` показывает статус `errored`

**Решение:**
```bash
# Проверьте логи
pm2 logs bdui-sandbox-api --lines 100

# Проверьте memory usage
pm2 monit

# Увеличьте max_memory_restart
pm2 delete bdui-sandbox-api
# Отредактируйте ecosystem.config.js: max_memory_restart: '1G'
pm2 start ecosystem.config.js
```

**3. Python сервер не находит модули**

**Симптомы:** `ModuleNotFoundError: No module named 'server'`

**Решение:**
```bash
# Установите PYTHONPATH
export PYTHONPATH=/path/to/bdui:$PYTHONPATH

# Или в systemd service:
Environment="PYTHONPATH=/var/www/bdui"

# Проверьте структуру
ls -la /var/www/bdui/server/
```

**4. nginx 502 Bad Gateway**

**Симптомы:** nginx возвращает 502 при доступе к `/api/`

**Решение:**
```bash
# Проверьте, что backend работает
curl http://localhost:5050/health

# Проверьте nginx logs
sudo tail -f /var/log/nginx/error.log

# Проверьте proxy_pass в конфиге
sudo nginx -t
sudo systemctl reload nginx
```

---

## Backup & Restore

### Backup localStorage Events

```javascript
// В браузере
const events = localStorage.getItem('bdui.analytics.events');
const blob = new Blob([events], { type: 'application/json' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = `bdui-analytics-${Date.now()}.json`;
a.click();
```

### Backup Products

```bash
# Бэкап конфигураций
tar -czf bdui-backup-$(date +%Y%m%d).tar.gz \
  src/data/ \
  src/pages/Sandbox/data/ \
  src/styles/designTokens.json \
  src/styles/widgetStyles.json

# Restore
tar -xzf bdui-backup-20250930.tar.gz
```

---

## Support & Resources

- **Documentation:** `docs/` directory
- **API Contracts:** `docs/api-contracts.md`
- **ADR:** `docs/adr/`
- **Issues:** GitHub Issues
- **Examples:** `src/pages/Sandbox/data/`

---

**Last Updated:** 2025-09-30  
**Version:** 1.0.0
