# 🎉 Product Selector реализован!

## Что сделано

✅ **Централизованный список продуктов** (`products.js`)  
✅ **Компонент ProductSelector** с поиском и фильтрацией  
✅ **Интеграция в SandboxPage**  
✅ **Два варианта Avito Demo:**
   - С Subflow (🔥 NEW, Featured)
   - Классический (без Subflow)

## Быстрый старт

```bash
npm run dev
# Откройте /sandbox
```

В правом верхнем углу найдите **Product Selector** (📦) — выберите нужный workflow!

## Доступные продукты

| Продукт | Особенности | Теги |
|---------|-------------|------|
| **Авито — Корзина с Subflow** 🔥 | Переиспользуемый онбординг, Input/Output mapping | `subflow`, `onboarding`, `advanced` |
| **Авито — Корзина (классическая)** | Полный функционал корзины, без subflow | `classic`, `cart`, `api` |
| **E-commerce Dashboard** | Простой демо-сценарий | `demo`, `checkout`, `simple` |

## Возможности селектора

- 🔍 **Поиск** по названию, описанию, тегам
- 🏷️ **Фильтрация** по категориям (E-commerce, Onboarding, Forms)
- ⭐ **Рекомендуемые** продукты в отдельной секции
- ✓ **Подсветка** текущего продукта
- 🎨 **Badges** для новых продуктов

## Добавление своего продукта

### 1. Создайте JSON workflow

```javascript
// src/pages/Sandbox/data/myWorkflow.json
{
  "id": "my-workflow",
  "name": "My Workflow",
  "nodes": [...],
  "screens": {...}
}
```

### 2. Зарегистрируйте в products.js

```javascript
// src/pages/Sandbox/data/products.js
import myWorkflow from './myWorkflow.json';

export const PRODUCTS = [
  // ... существующие
  {
    id: 'my-workflow',
    name: 'My Workflow',
    description: 'Описание',
    category: 'ecommerce',
    data: myWorkflow,
    tags: ['custom'],
    featured: false
  }
];
```

### 3. Готово! 

Продукт появится в селекторе автоматически.

## Сравнение Subflow vs Classic

**С Subflow:**
```
✅ Переиспользуемый код
✅ Изолированный контекст
✅ Input/Output mapping
✅ Легкая композиция
✅ Независимое тестирование
```

**Классический:**
```
✅ Проще для понимания
✅ Все в одном файле
✅ Прямолинейная логика
✅ Быстрый старт
```

## API

```javascript
import {
  getProductById,
  getFeaturedProducts,
  searchProducts
} from './data/products';

const product = getProductById('avito-cart-demo-subflow');
const featured = getFeaturedProducts();
const results = searchProducts('onboarding');
```

## Документация

📖 Полная документация: `/docs/PRODUCT_SELECTOR_GUIDE.md`  
📖 Subflow гайд: `/docs/SUBFLOW_GUIDE.md`  
📖 Avito Subflow Demo: `/docs/avitoDemoSubflow-product.md`

## Структура файлов

```
src/pages/Sandbox/
├── data/
│   ├── products.js                    ← 📦 Список продуктов
│   ├── avitoDemo.json                 ← Классический
│   ├── avitoDemoSubflow.json          ← С Subflow
│   └── ecommerceDashboard.json
├── components/
│   ├── ProductSelector.jsx            ← 🎨 Компонент
│   └── ProductSelector.css            ← Стили
└── SandboxPage.jsx                    ← Интеграция

docs/
├── PRODUCT_SELECTOR_GUIDE.md          ← 📖 Полный гайд
├── SUBFLOW_GUIDE.md                   ← Про Subflow
├── avitoDemoSubflow-product.md        ← Описание демо
└── avitoDemoSubflow-quickstart.md     ← Быстрый старт
```

## Следующие шаги

🎯 **Попробуйте переключиться** между продуктами  
🎯 **Сравните** реализацию с Subflow и без  
🎯 **Создайте** свой продукт  
🎯 **Поделитесь** feedback

---

**Готово к использованию!** 🚀
