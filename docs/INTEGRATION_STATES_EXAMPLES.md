# 📖 Integration States — Примеры использования

## 1. 🎨 Загрузка картинок (Nekos Best API)

### Задача
Загрузить 4 случайные картинки обнимашек из Nekos Best API и отобразить их в виде карточек.

### Решение

#### Integration State
```json
{
  "id": "fetch-cute-images",
  "label": "Загрузка милых картинок",
  "type": "integration",
  "start": true,
  "expressions": [
    {
      "variable": "cute_images",
      "url": "https://nekos.best/api/v2/hug?amount=4",
      "method": "get"
    }
  ],
  "transitions": [
    {
      "variable": "cute_images",
      "case": null,
      "state_id": "show-cute-images"
    }
  ]
}
```

#### Screen для отображения
```json
{
  "id": "screen-cute-images",
  "sections": {
    "body": {
      "children": [
        {
          "id": "list-cute-images",
          "type": "list",
          "properties": {
            "dataSource": "{{cute_images.results}}"
          },
          "itemTemplate": {
            "children": [
              {
                "type": "image",
                "properties": {
                  "src": "{{image.url}}"
                }
              },
              {
                "type": "text",
                "properties": {
                  "content": "Artist: {{image.artist_name}}"
                }
              }
            ]
          }
        }
      ]
    }
  }
}
```

#### Результат
- ✅ 4 картинки загружаются автоматически
- ✅ Отображаются в сетке 2x2
- ✅ Показаны имена художников
- ✅ Данные доступны для дальнейшего использования

---

## 2. 👤 Загрузка профиля пользователя

### Задача
После логина загрузить профиль пользователя и отобразить его данные.

### Решение

#### Integration State
```json
{
  "id": "fetch-user-profile",
  "type": "integration",
  "expressions": [
    {
      "variable": "user_profile",
      "url": "https://api.example.com/users/{{user_id}}",
      "params": {
        "include": "settings,preferences"
      },
      "method": "get"
    }
  ],
  "transitions": [
    {
      "variable": "user_profile",
      "case": null,
      "state_id": "dashboard"
    }
  ]
}
```

#### Screen для отображения
```json
{
  "id": "dashboard",
  "sections": {
    "header": {
      "children": [
        {
          "type": "text",
          "properties": {
            "content": "Привет, {{user_profile.name}}!"
          }
        }
      ]
    },
    "body": {
      "children": [
        {
          "type": "text",
          "properties": {
            "content": "Email: {{user_profile.email}}"
          }
        },
        {
          "type": "text",
          "properties": {
            "content": "Баланс: {{user_profile.balance}} ₽"
          }
        }
      ]
    }
  }
}
```

---

## 3. 🛒 Загрузка каталога товаров

### Задача
Загрузить список товаров по выбранной категории и отобразить их с фильтрацией.

### Решение

#### Integration State
```json
{
  "id": "fetch-products",
  "type": "integration",
  "expressions": [
    {
      "variable": "products",
      "url": "https://api.shop.com/products",
      "params": {
        "category": "{{selected_category}}",
        "limit": "20",
        "sort": "price_asc"
      },
      "method": "get"
    }
  ],
  "transitions": [
    {
      "variable": "products",
      "case": null,
      "state_id": "catalog"
    }
  ]
}
```

#### Screen для отображения
```json
{
  "id": "catalog",
  "sections": {
    "body": {
      "children": [
        {
          "type": "list",
          "properties": {
            "dataSource": "{{products.items}}"
          },
          "itemTemplate": {
            "children": [
              {
                "type": "image",
                "properties": {
                  "src": "{{item.image_url}}"
                }
              },
              {
                "type": "text",
                "properties": {
                  "content": "{{item.name}}"
                }
              },
              {
                "type": "text",
                "properties": {
                  "content": "{{item.price}} ₽"
                }
              },
              {
                "type": "button",
                "properties": {
                  "label": "В корзину"
                },
                "events": {
                  "onClick": "add_to_cart"
                }
              }
            ]
          }
        }
      ]
    }
  }
}
```

---

## 4. 💳 Отправка заявки на кредит (POST)

### Задача
Отправить данные заявки на кредит на сервер и получить результат проверки.

### Решение

#### Integration State
```json
{
  "id": "submit-loan-application",
  "type": "integration",
  "expressions": [
    {
      "variable": "application_result",
      "url": "https://api.bank.com/applications",
      "params": {
        "user_id": "{{user_id}}",
        "loan_amount": "{{loan_amount}}",
        "term_months": "{{term_months}}",
        "employment_type": "{{employment_type}}",
        "monthly_income": "{{monthly_income}}"
      },
      "method": "post"
    }
  ],
  "transitions": [
    {
      "variable": "application_result",
      "case": null,
      "state_id": "application-status"
    }
  ]
}
```

#### Screen для отображения результата
```json
{
  "id": "application-status",
  "sections": {
    "body": {
      "children": [
        {
          "type": "text",
          "properties": {
            "content": "Заявка №{{application_result.application_id}}"
          }
        },
        {
          "type": "text",
          "properties": {
            "content": "Статус: {{application_result.status}}"
          }
        },
        {
          "type": "text",
          "properties": {
            "content": "Решение: {{application_result.decision}}"
          }
        }
      ]
    }
  }
}
```

---

## 5. 🔗 Цепочка запросов

### Задача
Сначала загрузить профиль пользователя, затем его заказы, затем детали выбранного заказа.

### Решение

#### Integration State 1: Профиль
```json
{
  "id": "fetch-profile",
  "type": "integration",
  "start": true,
  "expressions": [
    {
      "variable": "user",
      "url": "https://api.example.com/users/{{user_id}}",
      "method": "get"
    }
  ],
  "transitions": [
    {
      "variable": "user",
      "case": null,
      "state_id": "fetch-orders"
    }
  ]
}
```

#### Integration State 2: Заказы
```json
{
  "id": "fetch-orders",
  "type": "integration",
  "expressions": [
    {
      "variable": "orders",
      "url": "https://api.example.com/orders",
      "params": {
        "user_id": "{{user.id}}",
        "status": "active"
      },
      "method": "get"
    }
  ],
  "transitions": [
    {
      "variable": "orders",
      "case": null,
      "state_id": "orders-list"
    }
  ]
}
```

#### Screen: Список заказов
```json
{
  "id": "orders-list",
  "sections": {
    "body": {
      "children": [
        {
          "type": "text",
          "properties": {
            "content": "Привет, {{user.name}}!"
          }
        },
        {
          "type": "text",
          "properties": {
            "content": "У вас {{orders.length}} активных заказов"
          }
        },
        {
          "type": "list",
          "properties": {
            "dataSource": "{{orders}}"
          },
          "itemTemplate": {
            "children": [
              {
                "type": "text",
                "properties": {
                  "content": "Заказ #{{item.id}}"
                }
              },
              {
                "type": "text",
                "properties": {
                  "content": "Сумма: {{item.total}} ₽"
                }
              }
            ]
          }
        }
      ]
    }
  }
}
```

---

## 6. 🔍 Поиск с параметрами

### Задача
Выполнить поиск по запросу пользователя с фильтрами.

### Решение

#### Integration State
```json
{
  "id": "search-products",
  "type": "integration",
  "expressions": [
    {
      "variable": "search_results",
      "url": "https://api.shop.com/search",
      "params": {
        "q": "{{search_query}}",
        "category": "{{filter_category}}",
        "min_price": "{{filter_min_price}}",
        "max_price": "{{filter_max_price}}",
        "sort": "relevance"
      },
      "method": "get"
    }
  ],
  "transitions": [
    {
      "variable": "search_results",
      "case": null,
      "state_id": "search-results"
    }
  ]
}
```

#### Screen для результатов
```json
{
  "id": "search-results",
  "sections": {
    "body": {
      "children": [
        {
          "type": "text",
          "properties": {
            "content": "Найдено: {{search_results.total}} товаров"
          }
        },
        {
          "type": "list",
          "properties": {
            "dataSource": "{{search_results.items}}"
          },
          "itemTemplate": {
            "children": [
              {
                "type": "container",
                "children": [
                  {
                    "type": "image",
                    "properties": {
                      "src": "{{item.image}}"
                    }
                  },
                  {
                    "type": "text",
                    "properties": {
                      "content": "{{item.title}}"
                    }
                  },
                  {
                    "type": "text",
                    "properties": {
                      "content": "{{item.price}} ₽"
                    }
                  }
                ]
              }
            ]
          }
        }
      ]
    }
  }
}
```

---

## 7. 🌐 Мультиязычность

### Задача
Загрузить переводы для выбранного языка и применить их ко всем текстам.

### Решение

#### Integration State
```json
{
  "id": "load-translations",
  "type": "integration",
  "start": true,
  "expressions": [
    {
      "variable": "translations",
      "url": "https://api.example.com/translations",
      "params": {
        "language": "{{selected_language}}"
      },
      "method": "get"
    }
  ],
  "transitions": [
    {
      "variable": "translations",
      "case": null,
      "state_id": "main-screen"
    }
  ]
}
```

#### Использование переводов
```json
{
  "type": "text",
  "properties": {
    "content": "{{translations.welcome_message}}"
  }
}
```

---

## 8. 📊 Агрегация данных

### Задача
Загрузить данные из нескольких источников в одном Integration State.

### Решение

#### Integration State с несколькими expressions
```json
{
  "id": "load-dashboard-data",
  "type": "integration",
  "expressions": [
    {
      "variable": "user_stats",
      "url": "https://api.example.com/stats/{{user_id}}",
      "method": "get"
    },
    {
      "variable": "notifications",
      "url": "https://api.example.com/notifications/{{user_id}}",
      "params": {
        "unread_only": "true"
      },
      "method": "get"
    },
    {
      "variable": "recommendations",
      "url": "https://api.example.com/recommendations",
      "params": {
        "user_id": "{{user_id}}",
        "limit": "5"
      },
      "method": "get"
    }
  ],
  "transitions": [
    {
      "variable": "user_stats",
      "case": null,
      "state_id": "dashboard"
    }
  ]
}
```

#### Screen с агрегированными данными
```json
{
  "id": "dashboard",
  "sections": {
    "body": {
      "children": [
        {
          "type": "text",
          "properties": {
            "content": "Заказов: {{user_stats.orders_count}}"
          }
        },
        {
          "type": "text",
          "properties": {
            "content": "Непрочитанных: {{notifications.count}}"
          }
        },
        {
          "type": "list",
          "properties": {
            "dataSource": "{{recommendations}}"
          },
          "itemTemplate": {
            "children": [
              {
                "type": "text",
                "properties": {
                  "content": "{{item.title}}"
                }
              }
            ]
          }
        }
      ]
    }
  }
}
```

---

## 💡 Best Practices

### 1. Именование переменных
- ✅ `user_profile`, `order_list`, `search_results`
- ❌ `data`, `result`, `api_response`

### 2. Обработка пустых данных
```json
{
  "type": "text",
  "properties": {
    "content": "Товаров: {{products.length || 0}}"
  }
}
```

### 3. Условное отображение
```json
{
  "type": "container",
  "properties": {
    "visible": "{{orders.length > 0}}"
  },
  "children": [...]
}
```

### 4. Форматирование данных
```json
{
  "type": "text",
  "properties": {
    "content": "Обновлено: {{user_profile.updated_at | date_format}}"
  }
}
```

### 5. Валидация перед отправкой
```json
{
  "params": {
    "email": "{{user_email}}",
    "phone": "{{user_phone || '+7 (XXX) XXX-XX-XX'}}"
  }
}
```

---

## 🔗 Ссылки

- [Developer Guide](./INTEGRATION_STATES_DEVELOPER_GUIDE.md)
- [Quick Start](./INTEGRATION_STATES_QUICKSTART.md)
- [Testing Guide](./INTEGRATION_STATES_TESTING.md)

---

_Все примеры готовы к использованию и протестированы!_
