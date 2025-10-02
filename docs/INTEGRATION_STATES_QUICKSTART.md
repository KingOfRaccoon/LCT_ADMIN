# 🌐 Integration States — Quick Start

## Что это?

**Integration States** — это узлы workflow, которые автоматически загружают данные из внешних API и сохраняют результат в контекст. Данные становятся доступны на всех последующих экранах.

## ⚡ Быстрый старт (5 минут)

### 1. Создайте Integration State

```json
{
  "id": "fetch-products",
  "type": "integration",
  "expressions": [
    {
      "variable": "products",
      "url": "https://api.shop.com/products",
      "method": "get"
    }
  ],
  "transitions": [
    {
      "variable": "products",
      "case": null,
      "state_id": "catalog-screen"
    }
  ]
}
```

### 2. Используйте данные на экране

```json
{
  "id": "catalog-screen",
  "type": "screen",
  "sections": {
    "body": {
      "children": [
        {
          "type": "list",
          "properties": {
            "dataSource": "{{products}}"
          },
          "itemTemplate": {
            "children": [
              {
                "type": "text",
                "properties": {
                  "content": "{{item.name}} - {{item.price}} ₽"
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

### 3. Запустите в песочнице

```bash
npm run dev
# Откройте http://localhost:5173/sandbox?product=avitoDemo
```

## 🎯 Живой пример

Откройте **Avito Demo** в песочнице - первый экран загружает милые картинки с Nekos Best API!

```
fetch-cute-images (Integration) → show-cute-images (Screen)
```

## 📝 Минимальная конфигурация

```json
{
  "id": "my-integration",
  "type": "integration",
  "expressions": [{
    "variable": "api_result",
    "url": "https://api.example.com/data"
  }],
  "transitions": [{
    "variable": "api_result",
    "case": null,
    "state_id": "next-screen"
  }]
}
```

## 🔧 Подстановка переменных

```json
{
  "url": "https://api.example.com/users/{{user_id}}",
  "params": {
    "token": "{{auth_token}}",
    "limit": "10"
  }
}
```

## 📚 Документация

- [Полное руководство разработчика](./INTEGRATION_STATES_DEVELOPER_GUIDE.md)
- [Промпт для админ-панели](./INTEGRATION_STATES_ADMIN_PROMPT.md)
- [Примеры](../src/pages/Sandbox/data/avitoDemo.json)

## 💬 Поддержка

Создайте issue в репозитории или обратитесь к команде разработки.

---

🚀 **Готово!** Теперь вы можете создавать динамические workflow с подгрузкой данных из API.
