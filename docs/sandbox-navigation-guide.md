# Инструкция: Переход с экрана загрузки (screen-loading)

## 🎯 Цель
Перейти с экрана `screen-loading` на экран корзины `screen-cart-main` через событие `loadComplete`.

---

## 📋 Способ 1: Через UI в Sandbox (браузер)

### Шаги:
1. Откройте Sandbox в браузере: `http://localhost:5173/sandbox`
2. Выберите preset **Avito Cart Demo** (или убедитесь что открыт avitoDemo)
3. На экране загрузки появится кнопка **"Продолжить"**
4. Нажмите на кнопку — произойдёт переход на экран корзины

### Что происходит:
```
screen-loading (Загрузка)
    ↓ [onClick: loadComplete]
screen-cart-main (Корзина с товарами)
```

### Изменения в контексте:
```json
{
  "ui.ready": true,        // было: false
  "state.loading": false   // было: true
}
```

---

## 📡 Способ 2: Через API (тестирование)

### Запуск сервера:
```bash
# Убедитесь что сервер запущен с avitoDemo preset
SANDBOX_PRESET=avitoDemo SANDBOX_FETCH_DISABLED=1 node server/js/server.js
```

### 1. Получить стартовый экран:
```bash
curl -s http://localhost:5050/api/start | jq '{
  screenId: .screen.id,
  screenName: .screen.name,
  button: .screen.sections.body.children[1].properties.label
}'
```

**Результат:**
```json
{
  "screenId": "screen-loading",
  "screenName": "Загрузка",
  "button": "Продолжить"
}
```

### 2. Вызвать событие loadComplete:
```bash
curl -s "http://localhost:5050/api/action?event=loadComplete" | jq '{
  screenId: .screen.id,
  screenName: .screen.name,
  ready: .context.ui.ready,
  loading: .context.state.loading,
  cartItems: (.context.cart.items | length),
  totalPrice: .context.cart.totalPrice
}'
```

**Результат:**
```json
{
  "screenId": "screen-cart-main",
  "screenName": "Корзина",
  "ready": true,
  "loading": false,
  "cartItems": 3,
  "totalPrice": 120970
}
```

---

## 🔧 Техническая реализация

### Структура узлов в avitoDemo.json:
```json
{
  "nodes": [
    {
      "id": "loading",
      "screenId": "screen-loading",
      "start": true,
      "edges": [
        {
          "id": "edge-load-complete",
          "event": "loadComplete",
          "target": "cart-main",
          "contextPatch": {
            "ui.ready": true,
            "state.loading": false
          }
        }
      ]
    },
    {
      "id": "cart-main",
      "screenId": "screen-cart-main",
      // ... edges для корзины
    }
  ]
}
```

### Кнопка на экране загрузки:
```json
{
  "id": "button-loading-continue",
  "type": "button",
  "properties": {
    "label": "Продолжить",
    "variant": "primary"
  },
  "events": {
    "onClick": "loadComplete"  // ← привязка к событию
  }
}
```

---

## 🎨 Альтернатива: Автоматический переход

Если нужен автоматический переход через N секунд (без кнопки), можно добавить логику в `SandboxPage.jsx`:

```javascript
// В useEffect при загрузке screen-loading
useEffect(() => {
  if (currentScreen?.id === 'screen-loading') {
    const timer = setTimeout(() => {
      handleEdgeRun('edge-load-complete', 'loadComplete');
    }, 2000); // 2 секунды
    
    return () => clearTimeout(timer);
  }
}, [currentScreen]);
```

Но **рекомендуется кнопка**, так как:
- ✅ Пользователь контролирует переход
- ✅ Удобнее для тестирования
- ✅ Соответствует UX паттернам

---

## 📊 Визуализация флоу

```
┌─────────────────────────┐
│   screen-loading        │
│  "Загрузка корзины..."  │
│                         │
│  [Кнопка "Продолжить"]  │ ← onClick: loadComplete
└─────────────────────────┘
             │
             │ event: loadComplete
             ↓
┌─────────────────────────┐
│   screen-cart-main      │
│  "Корзина"              │
│                         │
│  • 3 товара             │
│  • 120 970₽            │
│  [Оформить доставку]    │
└─────────────────────────┘
```

---

## ✅ Проверка работы

### В браузере (Sandbox UI):
1. Откройте `http://localhost:5173/sandbox`
2. Убедитесь что выбран **avitoDemo**
3. Должен отобразиться экран загрузки с кнопкой "Продолжить"
4. Нажмите кнопку
5. Должен открыться экран корзины с 3 товарами

### Через API:
```bash
# Стартовый экран
curl -s http://localhost:5050/api/start | jq '.screen.id'
# → "screen-loading"

# Переход
curl -s "http://localhost:5050/api/action?event=loadComplete" | jq '.screen.id'
# → "screen-cart-main"
```

---

## 🐛 Troubleshooting

**Проблема:** Кнопка не отображается
- **Решение:** Перезапустите сервер после изменений в `avitoDemo.json`

**Проблема:** Клик не работает в UI
- **Решение:** Проверьте что `SandboxScreenRenderer` поддерживает `onClick` события для кнопок

**Проблема:** API возвращает 404 для события
- **Решение:** Убедитесь что EVENT_RULES содержит `loadcomplete` (lowercase) для avitoDemo preset

---

## 📝 Связанные файлы

- `src/pages/Sandbox/data/avitoDemo.json` — конфигурация узлов и экранов
- `server/js/server.js` — обработка EVENT_RULES для avitoDemo
- `src/pages/Sandbox/SandboxPage.jsx` — UI логика переходов
- `src/pages/Sandbox/SandboxScreenRenderer.jsx` — рендеринг кнопок с событиями
