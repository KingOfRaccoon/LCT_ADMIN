# 🚀 Quick Start: Avito Demo Subflow

## Что это?

Демонстрационный продукт, показывающий работу **Subflow** — переиспользуемых блоков workflow.

## Быстрый старт

### 1. Файлы готовы ✅

- ✅ `avitoDemoSubflow.json` - workflow с subflow
- ✅ `avitoDemoSubflowProduct.js` - экспорт продукта
- ✅ `demoProduct.js` - настроен на новый продукт
- ✅ `SandboxPage.jsx` - импортирует новый продукт

### 2. Запустите приложение

```bash
npm run dev
```

### 3. Откройте Sandbox

Перейдите на страницу `/sandbox` — автоматически загрузится новый продукт!

## Что произойдет

### Сценарий 1: "Завершить онбординг"

```
1. Экран "Добро пожаловать" 
   → Кнопка "Продолжить"
   
2. Экран "Настройка профиля"
   → Кнопка "Завершить настройку"
   
3. Результат subflow:
   - onboarding_result.completed = true
   - user_name = "Опытный пользователь"
   
4. Загрузка корзины
   
5. Экран корзины
   - Заголовок: "Корзина — Опытный пользователь" ✨
```

### Сценарий 2: "Пропустить онбординг"

```
1. Экран "Добро пожаловать"
   → Кнопка "Продолжить"
   
2. Экран "Настройка профиля"
   → Кнопка "Пропустить"
   
3. Результат subflow:
   - onboarding_result.completed = false
   - user_name = "Гость"
   
4. Загрузка корзины
   
5. Экран корзины
   - Заголовок: "Корзина — Гость" ✨
```

## Ключевые особенности

### 🔄 Input Mapping
```javascript
// Данные ИЗ родительского контекста В subflow:
"user_id": "cart_response.user_id"
"store_name": "store.name"
```

### 📤 Output Mapping
```javascript
// Данные ИЗ subflow В родительский контекст:
"completed": "onboarding_result.completed"
"user_preferences": "user_name"
```

### 📋 Dependent Variables
```javascript
// Переменные, которые должны существовать:
["cart_response", "store"]
```

## Переключение продуктов

Редактируйте `/src/pages/Sandbox/data/demoProduct.js`:

```javascript
// Текущий продукт (с subflow)
import avitoDemoSubflow from './avitoDemoSubflow.json';
export const demoProduct = avitoDemoSubflow;

// Или вернитесь к оригинальному:
// import avitoDemo from './avitoDemo.json';
// export const demoProduct = avitoDemo;
```

## Структура Subflow

```json
{
  "subflows": {
    "onboarding-flow": {
      "id": "onboarding-flow",
      "name": "Онбординг",
      "input_variables": ["user_id", "store_name"],
      "output_variables": ["completed", "user_preferences"],
      "nodes": [
        { "id": "onboarding-screen-1", ... },
        { "id": "onboarding-screen-2", ... }
      ],
      "screens": { ... }
    }
  }
}
```

## Вызов Subflow

```json
{
  "id": "onboarding-subflow",
  "type": "subflow",
  "state_type": "subflow",
  "expressions": [{
    "variable": "onboarding_result",
    "subflow_workflow_id": "onboarding-flow",
    "input_mapping": { ... },
    "output_mapping": { ... }
  }],
  "transitions": [
    { "variable": "onboarding_result", "state_id": "next-state" }
  ]
}
```

## Debug Context

Используйте панель "Контекст" в Sandbox для отслеживания:

- ✅ `user_name` - обновляется после subflow
- ✅ `onboarding_result` - результат выполнения
- ✅ `onboarding_error` - ошибки (если есть)

## Что дальше?

📖 Полная документация: `/docs/avitoDemoSubflow-product.md`

🎯 Примеры использования:
- Онбординг
- Страховка при покупке
- Выбор доставки
- Предложение аксессуаров
- KYC-проверка

🛠 Создайте свой subflow:
1. Скопируйте структуру из `subflows`
2. Создайте экраны
3. Определите input/output mapping
4. Вызовите из родительского workflow

---

**Готово к использованию!** 🎉
