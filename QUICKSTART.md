# 🚀 Быстрый старт BDUI Admin

## Для разработки UI (без Preview)

```bash
npm run dev
```
→ http://localhost:5173

## Для работы с Preview ⭐

**Откройте 2 терминала:**

**Терминал 1:**
```bash
npm run sandbox:server
```
✅ Sandbox JS Server на http://localhost:5050

**Терминал 2:**
```bash
npm run dev
```
✅ Vite Dev Server на http://localhost:5173

---

## Страницы

- **Products:** http://localhost:5173/ - Список продуктов
- **Preview:** http://localhost:5173/preview - Превью экранов (нужен sandbox:server!)
- **Sandbox:** http://localhost:5173/sandbox - Тестирование графов
- **Analytics:** http://localhost:5173/analytics - Дашборд аналитики

---

## Проблемы?

### ❌ Preview не работает

**Причина:** Sandbox сервер не запущен

**Решение:**
```bash
# В отдельном терминале
npm run sandbox:server
```

### ❌ Порт занят

```bash
# Проверить что занимает порт
lsof -i :5050  # или :5173

# Убить процесс
kill -9 <PID>
```

---

📖 **Подробная документация:**
- [SANDBOX_SERVER_SETUP.md](./docs/SANDBOX_SERVER_SETUP.md) - Настройка серверов
- [README.md](./README.md) - Полная документация проекта
