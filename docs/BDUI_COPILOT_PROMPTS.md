# 🤖 BDUI Workflow - Промпты для GitHub Copilot

## Дата: 17 октября 2025

## Описание

Коллекция профессиональных промптов для расширения и улучшения BDUI Workflow с помощью GitHub Copilot.

---

## 🚀 Основной промпт-шаблон

### Роль эксперта

```markdown
Ты - эксперт BDUI архитектор, специализирующийся на создании и расширении пользовательских workflow для Business-Driven UI платформы.

Твоя основная задача - анализировать существующий workflow и интеллектуально добавлять новые экраны и интеграции, следуя лучшим практикам UX и техническим требованиям платформы.
```

### Контекст для принятия решений

**Анализируй бизнес-логику:**
- Какие user story отсутствуют в текущем flow
- Где нужны дополнительные точки валидации
- Какие API endpoints требуют создания
- Где можно улучшить пользовательский опыт

**Техническая архитектура BDUI:**
- `nodes[]` - массив узлов графа
- `screens{}` - объект с определениями экранов
- `variableSchemas{}` - схемы типов данных
- `initialContext{}` - начальное состояние контекста
- `expressions[]` - интеграции с внешними API

---

## 📋 Шаблоны компонентов

### 1. Новый Screen Node

```json
{
  "id": "new-screen-id",
  "label": "Название экрана",
  "type": "screen",
  "screenId": "screen-new-screen-id",
  "start": false,
  "edges": [
    {
      "id": "edge-action-name",
      "label": "Действие пользователя",
      "event": "actionEvent",
      "keepInputs": true,
      "summary": "Описание действия",
      "target": "target-node-id",
      "contextPatch": {}
    }
  ]
}
```

### 2. Screen Definition

```json
"screen-new-screen-id": {
  "id": "screen-new-screen-id",
  "type": "Screen",
  "name": "Название экрана",
  "style": {
    "display": "flex",
    "flexDirection": "column",
    "minHeight": "720px",
    "backgroundColor": "#ffffff",
    "borderRadius": "12px",
    "padding": "0px"
  },
  "sections": {
    "header": {
      "id": "section-header",
      "type": "Section",
      "properties": {
        "slot": "header",
        "padding": 16,
        "spacing": 12,
        "background": "#ffffff"
      },
      "children": []
    },
    "body": {
      "id": "section-body",
      "type": "Section",
      "properties": {
        "slot": "body",
        "padding": 16,
        "spacing": 16,
        "alignItems": "stretch"
      },
      "children": []
    },
    "footer": {
      "id": "section-footer",
      "type": "Section",
      "properties": {
        "slot": "footer",
        "padding": 16,
        "spacing": 0,
        "background": "#ffffff"
      },
      "children": []
    }
  }
}
```

### 3. Integration Node

```json
{
  "id": "integration-id",
  "label": "Название интеграции",
  "type": "integration",
  "state_type": "integration",
  "start": false,
  "description": "Описание API вызова",
  "expressions": [
    {
      "variable": "response_variable",
      "url": "https://api.example.com/endpoint",
      "params": {},
      "method": "get",
      "metadata": {
        "description": "Подробное описание",
        "category": "data",
        "tags": ["integration", "api"]
      }
    }
  ],
  "transitions": [
    {
      "variable": "response_variable",
      "case": null,
      "state_id": "next-node-id"
    }
  ],
  "edges": []
}
```

---

## 🎯 Готовые промпты для типовых задач

### Промпт 1: Добавление экрана авторизации

```
Проанализируй avitoDemo.json и добавь полноценный экран авторизации:

1. Screen "auth-screen" с полями:
   - Email input с валидацией
   - Password input с показом/скрытием пароля
   - Кнопка "Войти"
   - Ссылка "Забыли пароль?"

2. Integration "auth-integration":
   - POST https://sandkittens.me/backservices/api/auth/login
   - Body: { email, password }
   - Обработка success/error

3. Context updates:
   - Добавь user_session в variableSchemas
   - Добавь auth_token в initialContext
   - Создай error_message для отображения ошибок

4. Navigation:
   - Success → cart-main
   - Error → показать ошибку на том же экране

Используй стиль и структуру существующих экранов.
```

### Промпт 2: Добавление функции поиска

```
Добавь поиск товаров в корзину:

1. Search input в header секции screen-cart-main:
   - Placeholder "Поиск товаров..."
   - Icon лупы
   - Clear button при наличии текста

2. Integration "search-products":
   - GET https://sandkittens.me/backservices/api/advertisements/search
   - Query params: { q: "${search_query}", owner_id: 14 }
   - Debounce 300ms

3. Фильтрация результатов:
   - Показывать только результаты поиска при активном поиске
   - Показывать все товары при пустом поиске
   - Empty state "Ничего не найдено"

4. Context:
   - search_query: string
   - search_results: array
   - is_searching: boolean

Сохрани текущий дизайн и структуру.
```

### Промпт 3: Добавление профиля пользователя

```
Создай экран профиля пользователя:

1. Node "user-profile" с navigation:
   - From: cart-main через новую кнопку в header
   - To: edit-profile, change-password

2. Screen "screen-user-profile":
   - Avatar с placeholder
   - Имя и email
   - Статистика: заказов, избранного
   - Кнопки: "Редактировать", "Сменить пароль", "Выйти"

3. Integration "fetch-user-profile":
   - GET https://sandkittens.me/backservices/api/users/me
   - Headers: Authorization Bearer ${auth_token}

4. Стилизация:
   - Следуй существующему design system
   - Используй те же цвета (#0A74F0, #F0F0F0, etc)
   - Border radius: 12px
   - Spacing: 16px

Создай полную структуру с error handling и loading states.
```

### Промпт 4: Добавление уведомлений

```
Реализуй систему уведомлений:

1. Notification center в header:
   - Badge с количеством непрочитанных
   - Dropdown с последними 5 уведомлениями
   - "Показать все" → полный экран

2. Screen "screen-notifications":
   - List с типами: success, info, warning, error
   - Фильтры по типу и статусу
   - Mark as read функция
   - Clear all button

3. Integration "fetch-notifications":
   - GET https://sandkittens.me/backservices/api/notifications
   - Real-time polling каждые 30 секунд
   - Mark read: POST /api/notifications/{id}/read

4. Context:
   - notifications: array
   - unread_count: number
   - notification_filters: object

Добавь анимации для новых уведомлений (slide-in).
```

### Промпт 5: Добавление истории заказов

```
Создай экран истории заказов:

1. Node "order-history":
   - Navigation from: checkout-screen после успешного заказа
   - Edge "viewOrder" → order-details

2. Screen "screen-order-history":
   - List с карточками заказов:
     * Order ID, дата
     * Статус (pending, completed, cancelled)
     * Сумма
     * Количество товаров
   - Фильтры по статусу
   - Сортировка по дате

3. Integration "fetch-orders":
   - GET https://sandkittens.me/backservices/api/orders
   - Pagination: page, limit
   - Filters: status, date_from, date_to

4. Screen "screen-order-details":
   - Полная информация о заказе
   - Список товаров
   - Адрес доставки
   - Способ оплаты
   - Tracking номер

Используй accordion для развернутых деталей.
```

---

## ⚡ Автоматические улучшения

### Всегда добавляй эти паттерны:

#### 1. Loading State
```json
{
  "id": "loading-indicator",
  "type": "text",
  "properties": {
    "content": "Загрузка...",
    "variant": "caption"
  },
  "style": {
    "textAlign": "center",
    "color": "#8E8E93"
  },
  "conditions": {
    "visible": "${state.loading}"
  }
}
```

#### 2. Error Message
```json
{
  "id": "error-message",
  "type": "text",
  "properties": {
    "content": {
      "reference": "${error.message}",
      "value": "Произошла ошибка"
    },
    "variant": "error"
  },
  "style": {
    "color": "#FF3B30",
    "fontSize": "13px",
    "marginTop": "8px"
  },
  "conditions": {
    "visible": "${error.exists}"
  }
}
```

#### 3. Empty State
```json
{
  "id": "empty-state",
  "type": "column",
  "properties": {
    "alignItems": "center",
    "spacing": 16,
    "padding": 48
  },
  "conditions": {
    "visible": "${data.length} === 0 && !${state.loading}"
  },
  "children": [
    {
      "type": "text",
      "properties": {
        "content": "Ничего не найдено",
        "variant": "heading"
      },
      "style": {
        "fontSize": "20px",
        "color": "#2F3034"
      }
    }
  ]
}
```

#### 4. Pull-to-Refresh
```json
{
  "id": "refresh-indicator",
  "type": "container",
  "properties": {
    "onPullDown": "refreshData"
  },
  "style": {
    "overscrollBehavior": "contain"
  }
}
```

---

## 🔧 Технические требования

### Обязательные проверки:
- ✅ Все `node.id` уникальны
- ✅ Все `edge.target` ссылаются на существующие узлы
- ✅ Все `${reference}` биндинги есть в `variableSchemas`
- ✅ Все API endpoints имеют fallback обработку
- ✅ Стили консистентны с design system

### Design Tokens (используй эти значения):
```json
{
  "colors": {
    "primary": "#0A74F0",
    "secondary": "#F0F0F0",
    "text": "#000000",
    "textSecondary": "#8E8E93",
    "error": "#FF3B30",
    "success": "#34C759",
    "border": "#E5E5E5",
    "background": "#F5F5F5"
  },
  "spacing": {
    "xs": "4px",
    "sm": "8px",
    "md": "12px",
    "lg": "16px",
    "xl": "24px",
    "xxl": "32px"
  },
  "borderRadius": {
    "sm": "8px",
    "md": "12px",
    "lg": "16px",
    "round": "50%"
  },
  "fontSize": {
    "xs": "11px",
    "sm": "13px",
    "md": "15px",
    "lg": "17px",
    "xl": "20px",
    "xxl": "24px"
  }
}
```

---

## 📱 Примеры для разных сценариев

### E-commerce
```
Добавь в avitoDemo.json:
1. Product catalog с категориями
2. Wishlist с сохранением в localStorage
3. Compare products функцию
4. Reviews & ratings систему
5. Promo codes применение

Создай все необходимые nodes, screens, integrations.
```

### Social Features
```
Расширь workflow социальными функциями:
1. User profiles с avatars
2. Follow/Unfollow система
3. Activity feed
4. Comments & likes
5. Share функциональность

Используй существующую архитектуру cart API.
```

### Admin Panel
```
Создай админ-панель для управления:
1. Users CRUD
2. Products management
3. Orders monitoring
4. Analytics dashboard с charts
5. Settings panel

Добавь role-based access control.
```

---

## 🎨 UI Component Library

### Button Variants
```json
"primary": {
  "backgroundColor": "#0A74F0",
  "color": "#ffffff"
},
"secondary": {
  "backgroundColor": "#F0F0F0",
  "color": "#0A74F0"
},
"danger": {
  "backgroundColor": "#FF3B30",
  "color": "#ffffff"
},
"ghost": {
  "backgroundColor": "transparent",
  "color": "#0A74F0",
  "border": "1px solid #E5E5E5"
}
```

### Input States
```json
"default": {
  "border": "1px solid #E5E5E5"
},
"focus": {
  "border": "1px solid #0A74F0",
  "boxShadow": "0 0 0 3px rgba(10, 116, 240, 0.1)"
},
"error": {
  "border": "1px solid #FF3B30"
},
"disabled": {
  "backgroundColor": "#F5F5F5",
  "opacity": 0.6
}
```

---

## 💡 Лучшие практики

### 1. Naming Conventions
```
nodes: kebab-case (fetch-user-data)
screens: screen-* (screen-user-profile)
sections: section-* (section-header)
components: type-description-id (button-submit-form)
variables: snake_case (user_profile_data)
events: camelCase (submitForm, loadMore)
```

### 2. Error Handling Strategy
```json
{
  "transitions": [
    {
      "variable": "api_response",
      "case": "success",
      "state_id": "success-screen"
    },
    {
      "variable": "api_response",
      "case": "error",
      "state_id": "error-screen",
      "contextPatch": {
        "error.message": "${api_response.error}",
        "error.exists": true
      }
    }
  ]
}
```

### 3. Performance Optimization
- Используй виртуализацию для списков >100 элементов
- Добавляй debounce для search/filter (300-500ms)
- Кэшируй API responses в localStorage
- Используй skeleton loaders вместо spinners

### 4. Accessibility
```json
"aria-label": "Описание элемента",
"role": "button|link|navigation",
"tabIndex": 0,
"aria-describedby": "description-id"
```

---

## 🚀 Быстрый старт

### Шаг 1: Открой avitoDemo.json
```bash
code src/pages/Sandbox/data/avitoDemo.json
```

### Шаг 2: Вызови Copilot с промптом
```
@workspace Используя BDUI_COPILOT_PROMPTS.md, добавь [описание фичи]
```

### Шаг 3: Проверь результат
```bash
python3 -m json.tool < src/pages/Sandbox/data/avitoDemo.json
```

### Шаг 4: Тестируй в браузере
```
http://localhost:5173/sandbox
```

---

## 📚 Дополнительные ресурсы

- [cart-api-unification.md](./cart-api-unification.md) - Унификация API
- [add-to-cart-feature.md](./add-to-cart-feature.md) - Пример интеграции
- [avitoDemo-v2-changes.md](./avitoDemo-v2-changes.md) - История изменений

---

## ✨ Tips & Tricks

### Tip 1: Копирование существующих паттернов
```
Найди в avitoDemo.json похожий screen и скопируй его структуру, 
изменив только ID и content.
```

### Tip 2: Тестирование API
```bash
curl -X GET "https://sandkittens.me/backservices/api/carts/3/with-advertisements" \
  -H "Content-Type: application/json"
```

### Tip 3: JSON Validation
```bash
cat avitoDemo.json | python3 -m json.tool > /dev/null && echo "✅ Valid"
```

### Tip 4: Git Workflow
```bash
git checkout -b feature/new-screen
# Внеси изменения
git add src/pages/Sandbox/data/avitoDemo.json
git commit -m "feat: add new screen for [description]"
git push origin feature/new-screen
```

---

**Версия:** 1.0  
**Дата:** 17 октября 2025  
**Автор:** BDUI Team
