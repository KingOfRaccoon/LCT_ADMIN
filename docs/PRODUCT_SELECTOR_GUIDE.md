# 📦 Product Selector — Выбор Workflow

## Обзор

**Product Selector** — компонент для выбора workflow (продукта) в Sandbox. Теперь вы можете легко переключаться между разными сценариями без изменения кода!

## 🎯 Доступные продукты

### 1. **Авито — Корзина с Subflow** 🔥 NEW
- **ID:** `avito-cart-demo-subflow`
- **Категория:** E-commerce
- **Особенности:**
  - Переиспользуемый онбординг через Subflow
  - Input/Output mapping
  - Dependent variables
  - Error handling
- **Теги:** `avito`, `cart`, `subflow`, `onboarding`, `api`, `advanced`
- **Статус:** Featured (рекомендуемый)

### 2. **Авито — Корзина (классическая)**
- **ID:** `avito-cart-demo`
- **Категория:** E-commerce
- **Особенности:**
  - Классический монолитный workflow
  - Полная функциональность корзины
  - API интеграция
- **Теги:** `avito`, `cart`, `api`, `classic`

### 3. **E-commerce Dashboard**
- **ID:** `demo-checkout-product`
- **Категория:** E-commerce
- **Особенности:**
  - Простой демо-сценарий
  - Воронка оформления заказа
- **Теги:** `checkout`, `demo`, `simple`

## 🚀 Использование

### В UI

1. Откройте `/sandbox`
2. В правом верхнем углу найдите **Product Selector** (📦)
3. Кликните на него
4. Выберите нужный продукт из списка

### Возможности селектора

#### 🔍 Поиск
Введите в поле поиска:
- Название продукта: `"Авито"`
- Описание: `"Subflow"`
- Теги: `"onboarding"`, `"api"`, `"cart"`

#### 🏷️ Фильтрация по категориям
- **Все** — показать все продукты
- **🛒 E-commerce** — сценарии для интернет-магазинов
- **👋 Onboarding** — приветственные сценарии
- **📝 Forms** — формы и сбор данных

#### ⭐ Рекомендуемые
Продукты с badge "🔥 NEW" или помеченные как Featured отображаются в отдельной секции.

#### ✓ Текущий продукт
Выбранный продукт подсвечивается и имеет галочку.

## 📝 Добавление нового продукта

### 1. Создайте JSON файл workflow

```javascript
// src/pages/Sandbox/data/myNewWorkflow.json
{
  "id": "my-new-workflow",
  "name": "My New Workflow",
  "description": "Описание нового workflow",
  "nodes": [...],
  "screens": {...}
}
```

### 2. Зарегистрируйте в products.js

```javascript
// src/pages/Sandbox/data/products.js
import myNewWorkflow from './myNewWorkflow.json';

export const PRODUCTS = [
  // ... существующие продукты
  {
    id: 'my-new-workflow',
    name: 'My New Workflow',
    description: 'Описание нового workflow',
    category: 'ecommerce', // или 'onboarding', 'forms'
    data: myNewWorkflow,
    tags: ['custom', 'new'],
    featured: false,
    badge: '🎉 NEW' // опционально
  }
];
```

### 3. Готово!

Продукт автоматически появится в селекторе.

## 🎨 Структура продукта

```typescript
type Product = {
  id: string;              // Уникальный идентификатор
  name: string;            // Отображаемое название
  description: string;     // Краткое описание
  category: string;        // Категория (ecommerce, onboarding, forms)
  data: object;            // JSON данные workflow
  tags: string[];          // Теги для поиска
  featured: boolean;       // Рекомендуемый продукт
  badge?: string;          // Опциональный badge (🔥 NEW, ⭐ POPULAR)
};
```

## 📚 API

### Функции из products.js

```javascript
import {
  PRODUCTS,               // Полный список продуктов
  CATEGORIES,             // Категории
  getProductById,         // Получить продукт по ID
  getProductsByCategory,  // Получить продукты по категории
  getFeaturedProducts,    // Получить рекомендуемые
  getDefaultProduct,      // Получить продукт по умолчанию
  searchProducts          // Поиск продуктов
} from './data/products';

// Примеры использования
const product = getProductById('avito-cart-demo-subflow');
const featured = getFeaturedProducts();
const ecommerce = getProductsByCategory('ecommerce');
const results = searchProducts('subflow');
```

### Использование в компонентах

```javascript
import ProductSelector from './components/ProductSelector';

function MyComponent() {
  const [currentProductId, setCurrentProductId] = useState('avito-cart-demo');

  const handleChange = (productId) => {
    setCurrentProductId(productId);
    // Загрузить новый workflow
  };

  return (
    <ProductSelector
      currentProductId={currentProductId}
      onProductChange={handleChange}
      disabled={false}
    />
  );
}
```

## 🎯 Сценарии использования

### Сравнение Subflow vs Classic

1. Выберите **"Авито — Корзина с Subflow"**
2. Пройдите онбординг
3. Переключитесь на **"Авито — Корзина (классическая)"**
4. Сравните реализацию

### Быстрое прототипирование

1. Клонируйте существующий продукт
2. Модифицируйте под свои нужды
3. Добавьте в список
4. Тестируйте через селектор

### A/B тестирование

1. Создайте два варианта workflow
2. Зарегистрируйте оба в products.js
3. Быстро переключайтесь между вариантами
4. Сравнивайте UX и поведение

## 🔧 Технические детали

### Приоритет загрузки продукта

```javascript
const product = 
  workflowData       || // 1. Загружен через API
  runtimeProduct     || // 2. Передан через location.state
  selectedProduct    || // 3. Выбран через ProductSelector
  defaultProductData;   // 4. Продукт по умолчанию (featured)
```

### Сохранение состояния

При смене продукта:
- ✅ Контекст сбрасывается
- ✅ История переходов очищается
- ✅ Форма инпутов сбрасывается
- ✅ Текущая нода переходит на start

### Условия отображения

ProductSelector показывается только если:
- ❌ Нет `workflowData` (не загружен через API)
- ❌ Нет `runtimeProduct` (не передан через state)

## 🎨 Кастомизация

### Изменение стилей

Отредактируйте `/src/pages/Sandbox/components/ProductSelector.css`:

```css
.product-selector-trigger {
  /* Ваши стили */
}
```

### Добавление новых категорий

```javascript
// src/pages/Sandbox/data/products.js
export const CATEGORIES = {
  // ... существующие
  myCategory: {
    id: 'myCategory',
    name: 'My Category',
    icon: '🎨',
    description: 'Описание категории'
  }
};
```

## 📊 Метрики

Отслеживайте выбор продуктов через analytics:

```javascript
// В SandboxPage.jsx
const handleProductChange = (productId) => {
  trackEvent('product_selected', {
    product_id: productId,
    previous_product: currentProductId
  });
  // ...
};
```

## 🐛 Troubleshooting

### Продукт не отображается в списке

- ✅ Проверьте импорт JSON в `products.js`
- ✅ Проверьте формат объекта Product
- ✅ Проверьте уникальность `id`

### Ошибка при смене продукта

- ✅ Проверьте структуру workflow (nodes, screens)
- ✅ Проверьте initialContext
- ✅ Проверьте start node

### ProductSelector не появляется

- ✅ Убедитесь, что нет `workflowData` или `runtimeProduct`
- ✅ Проверьте импорт компонента в SandboxPage

---

**Версия:** 1.0.0  
**Дата:** 18 октября 2025 г.
