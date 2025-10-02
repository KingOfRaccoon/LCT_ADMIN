# 🧪 Инструкция по тестированию Integration States

## 🚀 Быстрый тест (2 минуты)

### 1. Откройте приложение

```
http://localhost:5174/sandbox?product=avitoDemo
```

### 2. Что вы должны увидеть

1. **Автоматическая загрузка данных**
   - При открытии происходит запрос к `https://nekos.best/api/v2/hug?amount=4`
   - В консоли появляются логи:
     ```
     [Integration] Detected integration node: fetch-cute-images
     [Integration] Executing GET https://nekos.best/api/v2/hug?amount=4
     [Integration] Success: cute_images {...}
     [Integration] Moving to next state: show-cute-images
     ```

2. **Экран с картинками**
   - Заголовок: "🌸 Милые картинки загружены с API!"
   - Описание: "Данные получены через Integration State с nekos.best API"
   - **4 карточки** в сетке 2x2:
     - Картинка (anime/manga стиль)
     - Artist: [имя художника]
     - Source: [ссылка на источник]
   - Кнопка "Продолжить к корзине →"

3. **Переход к корзине**
   - Нажмите кнопку "Продолжить к корзине →"
   - Откроется стандартный экран загрузки корзины Avito
   - Данные `cute_images` всё ещё доступны в контексте!

### 3. Проверка в DevTools

Откройте консоль браузера (F12) и найдите:

```javascript
[Integration] Detected integration node: fetch-cute-images
[Integration] Executing GET https://nekos.best/api/v2/hug?amount=4
[Integration] Success: cute_images {results: Array(4)}
[Integration] Moving to next state: show-cute-images
```

Разверните объект `cute_images` и убедитесь, что он содержит:
```javascript
{
  results: [
    {
      artist_href: "...",
      artist_name: "...",
      source_url: "...",
      url: "https://nekos.best/api/v2/hug/..."
    },
    // ... ещё 3 объекта
  ]
}
```

## 🔍 Детальное тестирование

### Тест 1: Автоматическое выполнение Integration State

**Ожидаемое поведение:**
1. При открытии `avitoDemo` первым узлом является `fetch-cute-images` (type: integration)
2. `SandboxPage` автоматически обнаруживает integration узел
3. Выполняется `executeIntegrationNode()`
4. Результат сохраняется в `context.cute_images`
5. Автоматический переход к `show-cute-images`

**Как проверить:**
- Откройте Network tab в DevTools
- Обновите страницу (F5)
- Найдите запрос к `nekos.best`
- Статус должен быть `200 OK`
- Response содержит JSON с полем `results`

### Тест 2: Отображение данных на экране

**Ожидаемое поведение:**
1. Экран `screen-cute-images` рендерится через `SandboxScreenRenderer`
2. List компонент итерирует по `{{cute_images.results}}`
3. Для каждого элемента создается карточка с:
   - Изображением (`{{image.url}}`)
   - Именем художника (`{{image.artist_name}}`)
   - Ссылкой на источник (`{{image.source_url}}`)

**Как проверить:**
- Inspect элемент любой картинки
- Проверьте `src` атрибут - должен быть URL с `nekos.best`
- Проверьте текст "Artist: ..." - должен быть не пустым
- Проверьте текст "Source: ..." - должен содержать URL

### Тест 3: Сохранение контекста

**Ожидаемое поведение:**
Данные из Integration State сохраняются в контексте и доступны на всех последующих экранах.

**Как проверить:**
1. Откройте консоль и введите:
   ```javascript
   // В React DevTools найдите SandboxPage компонент
   // Посмотрите state.contextState
   ```
2. Или добавьте временный компонент на экран корзины:
   ```json
   {
     "type": "text",
     "properties": {
       "content": "Images loaded: {{cute_images.results.length}}"
     }
   }
   ```
3. Должно отобразиться: "Images loaded: 4"

### Тест 4: История переходов

**Ожидаемое поведение:**
Integration State добавляется в историю переходов.

**Как проверить:**
- В UI песочницы откройте панель истории (иконка часов)
- Должна быть запись:
  ```
  fetch-cute-images (Загрузка милых картинок)
  Action: integration
  Variable: cute_images
  ```

## 🐛 Известные проблемы

### 1. CORS ошибки

**Симптом:**
```
Access to fetch at 'https://...' from origin 'http://localhost:5174' 
has been blocked by CORS policy
```

**Решение:**
API должен поддерживать CORS. Nekos Best API поддерживает, но если вы тестируете другой API - убедитесь что он возвращает заголовок:
```
Access-Control-Allow-Origin: *
```

### 2. Таймауты

**Симптом:**
```
[Integration] Error: The operation was aborted
```

**Решение:**
Увеличьте timeout в expression:
```json
{
  "timeout": 60000
}
```

### 3. Картинки не загружаются

**Симптом:**
Картинки показывают broken image icon.

**Решение:**
- Проверьте, что URL в `image.url` валиден
- Проверьте Network tab - успешно ли загружаются изображения
- Некоторые CDN могут блокировать hotlinking

## 📊 Чеклист тестирования

- [ ] Сервер запущен (`npm run dev`)
- [ ] Страница открывается (`http://localhost:5174/sandbox?product=avitoDemo`)
- [ ] В консоли нет критических ошибок
- [ ] В консоли есть логи `[Integration]`
- [ ] Экран с картинками отображается
- [ ] 4 картинки загружены и видны
- [ ] Имена художников отображаются
- [ ] Источники отображаются
- [ ] Кнопка "Продолжить к корзине" работает
- [ ] Переход к экрану загрузки корзины происходит
- [ ] Network tab показывает успешный запрос к API
- [ ] Response от API содержит массив `results`
- [ ] DevTools React показывает `cute_images` в state

## 🎨 Визуальное тестирование

### Ожидаемый внешний вид:

```
┌────────────────────────────────────────────────┐
│ 🌸 Милые картинки загружены с API!            │
│                                                │
│ Данные получены через Integration State       │
│ с nekos.best API                               │
│                                                │
│ ┌──────────────┐  ┌──────────────┐            │
│ │              │  │              │            │
│ │   Картинка   │  │   Картинка   │            │
│ │              │  │              │            │
│ ├──────────────┤  ├──────────────┤            │
│ │Artist: Name  │  │Artist: Name  │            │
│ │Source: URL   │  │Source: URL   │            │
│ └──────────────┘  └──────────────┘            │
│                                                │
│ ┌──────────────┐  ┌──────────────┐            │
│ │              │  │              │            │
│ │   Картинка   │  │   Картинка   │            │
│ │              │  │              │            │
│ ├──────────────┤  ├──────────────┤            │
│ │Artist: Name  │  │Artist: Name  │            │
│ │Source: URL   │  │Source: URL   │            │
│ └──────────────┘  └──────────────┘            │
│                                                │
│      [Продолжить к корзине →]                 │
└────────────────────────────────────────────────┘
```

### Детали стилей:

- Сетка: 2 колонки (repeat(2, 1fr))
- Gap: 16px
- Карточки: светло-серый фон (#f9fafb)
- Скругление: 12px
- Тень: 0 1px 3px rgba(0,0,0,0.1)
- Изображения: 100% ширина, 200px высота, cover
- Шрифт artist: 12px, серый (#6b7280)
- Шрифт source: 11px, светло-серый (#9ca3af)

## 🔧 Отладка

### Включить подробное логирование

В `integrationStates.js` раскомментируйте:

```javascript
console.log('[Integration] Request options:', options);
console.log('[Integration] Resolved URL:', url);
console.log('[Integration] Params:', params);
```

### Проверка контекста

В консоли браузера:

```javascript
// 1. Найдите window.__SANDBOX_CONTEXT__ (если мы его экспортируем)
// 2. Или через React DevTools -> Components -> SandboxPage -> hooks -> contextState

// Проверить наличие данных:
if (contextState.cute_images) {
  console.log('✅ cute_images loaded');
  console.log('Items:', contextState.cute_images.results.length);
} else {
  console.log('❌ cute_images not loaded');
}
```

## 🎯 Альтернативные API для тестирования

Если Nekos Best API недоступен, попробуйте:

### 1. JSONPlaceholder

```json
{
  "variable": "posts",
  "url": "https://jsonplaceholder.typicode.com/posts",
  "params": {
    "_limit": "4"
  },
  "method": "get"
}
```

### 2. Random User API

```json
{
  "variable": "users",
  "url": "https://randomuser.me/api/",
  "params": {
    "results": "4"
  },
  "method": "get"
}
```

### 3. Dog API

```json
{
  "variable": "dogs",
  "url": "https://dog.ceo/api/breeds/image/random/4",
  "method": "get"
}
```

## ✅ Критерии успеха

Тестирование считается успешным если:

1. ✅ API запрос выполняется автоматически
2. ✅ Данные сохраняются в контекст
3. ✅ Экран отображает загруженные данные
4. ✅ Переход к следующему экрану работает
5. ✅ Данные доступны на последующих экранах
6. ✅ Нет ошибок в консоли
7. ✅ UI выглядит корректно

## 📞 Поддержка

Если что-то не работает:

1. Проверьте консоль на ошибки
2. Проверьте Network tab
3. Проверьте версию Node.js (`node --version` >= 18)
4. Очистите кэш (`npm run dev` с флагом `--force`)
5. Создайте issue с:
   - Скриншотом проблемы
   - Логами из консоли
   - Шагами воспроизведения

---

**Готово!** 🎉 Если все тесты прошли - Integration States работают корректно!
