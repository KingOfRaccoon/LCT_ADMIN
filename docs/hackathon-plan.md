# План доработок MUST HAVE требований

## 1. Демонстрационный сценарий из макета ✅
- **Зависимости**: требуется доступ к актуальному макету Figma и Avito Design Materials (компоненты, токены).
- **Работы**:
  - ✅ Сбор всех экранов макета, описание состояний и интерактивов (6 экранов: loading, cart x3 states, cart-empty, undo notification).
  - ✅ Создание пресета `src/pages/Sandbox/data/avitoDemo.json` с полным графом узлов, контекстом и экранами.
  - ✅ Валидация JSON против текущих схем и бекендов (JS/FastAPI).
  - ✅ Интеграция с Sandbox (demoProduct.js → avitoDemo, server.js → SANDBOX_PRESET env var).
- **Состояние**: Реализован полный флоу корзины Avito.

### avitoDemo.json — структура и возможности

**Экраны (screens):**
- `screen-loading` — Загрузочный экран с центрированным текстом "Загружаем вашу корзину…"
- `screen-cart-main` — Основной экран корзины:
  - **Header**: кнопки назад, "Выбрать всё", "Удалить (N)" с биндингом к `cart.selectedCount`
  - **Body**: список магазинов (`stores[]`) с товарами, блок рекомендаций (upsell) с CTA "В корзину"
  - **Footer**: итоговая сумма (`cart.totalPrice`) и кнопка "Оформить доставку"
- `screen-cart-empty` — Пустое состояние: иллюстрация, текст "В корзине пусто", CTA "Как это работает?"
- `screen-checkout` — Заглушка оформления заказа (placeholder для будущей реализации)

**Контекст (initialContext):**
- `cart.items[]` — массив товаров с полями: `id`, `storeId`, `storeName`, `title`, `price`, `originalPrice`, `quantity`, `image`, `isSelected`, `deliveryAvailable`, `liked`
  - Примеры: MagSafe Charger (₽4990 -₽2000), AirPods Pro 2 (₽15990 -₽2500), iPhone 15 Pro (₽99990)
- `cart.selectedCount` — количество выбранных товаров
- `cart.totalPrice` — итоговая сумма корзины
- `cart.totalDiscount` — общая скидка
- `stores[]` — магазины с `id`, `name`, `rating` (Pear Store 4.8★, TECHNO ZONE 5.0★)
- `recommendations[]` — товары для upsell (чехол Premium ₽26551 -22%, "Добавьте ещё 1 товар до скидки 5%")
- `ui.notifications` — система уведомлений для undo/success/info с полями `type`, `message`, `actionLabel`, `actionEvent`
- `state.loading`, `state.empty`, `state.checkingOut` — флаги состояний UI

**Узлы и переходы (nodes):**
- `loading` (start) → `loadComplete` → `cart-main`
- `cart-main` → события:
  - `incrementItem` → `action-increment` (увеличение quantity, пересчёт totals) → обратно к `cart-main`
  - `decrementItem` → `action-decrement` (уменьшение quantity) → `cart-main`
  - `removeItem` → `action-remove` (удаление товара, показ undo-уведомления) → `cart-main`
  - `addRecommended` → `action-add-recommended` (добавление товара из upsell) → `cart-main`
  - `selectAll` → `action-select-all` (выделение всех товаров) → `cart-main`
  - `clearAll` → `cart-empty` (очистка корзины, переход к пустому состоянию)
  - `checkout` → `checkout-screen` (переход к оформлению)
- `cart-empty` → `help` (открытие справки)

**Поддерживаемые взаимодействия:**
- ✅ Загрузка корзины (loadComplete event)
- ✅ Увеличение/уменьшение количества товара (contextPatch обновляет totals)
- ✅ Удаление товара с уведомлением undo (ui.notifications.type = 'undo')
- ✅ Добавление рекомендованного товара из блока upsell
- ✅ Выбор всех товаров / очистка корзины
- ✅ Переход к оформлению заказа
- ✅ Справка на пустом экране

**Ограничения и планы:**
- **Реализовано**: структура данных, граф переходов, базовые компоненты (text, button, row, column, list, section)
- **Упрощено vs. макет**: товары в stores отображаются placeholder-текстом вместо полноценного рендеринга списка с изображениями (требует расширения SandboxScreenRenderer для вложенных list-итераций)
- **Placeholder изображения**: используются via.placeholder.com вместо реальных картинок Avito
- **Недостаёт компонентов**: чекбоксы для выбора товаров, свайпы для удаления, модальные окна подтверждения — требуют расширения библиотеки виджетов
- **Будущие доработки**: интеграция с Avito Design Materials (токены, компоненты), полноценный рендеринг товарных карточек, анимации переходов

**Использование:**
- **Offline режим**: откройте `/sandbox`, пресет загружается автоматически из `demoProduct.js`
- **API режим**: запустите `npm run sandbox:server` (JS backend) или `uvicorn server.main:app --reload` (Python), проверьте пинг API — при успехе управление передаётся ApiSandboxRunner
- **Переключение пресетов**: раскомментируйте импорт `ecommerceDashboard` в `demoProduct.js` и измените `export const demoProduct = ...`
- **Серверный режим**: установите `SANDBOX_PRESET=avitoDemo` (или `ecommerceDashboard`) перед запуском `npm run sandbox:server`

## 2. Документация
- **Архитектура**: diagram Mermaid + текстовое описание слоев (UI, VirtualContext, sandbox servers).
- **API**: таблицы контрактов `/api/start`, `/api/action`, схема JSON конфигов.
- **Развёртывание**: единая инструкция для UI, sandbox JS и FastAPI.
- **ADR**: минимум по трём ключевым решениям (VirtualContext, analytics, storage).

## 3. Тестирование
- **Unit**: покрыть редьюсер `VirtualContext` (инициализация, обновление узлов, типы переменных).
- **E2E**: сценарий «создание продукта → сборка экрана → превью» (Playwright).
- **Contract**: JSON схемы для продуктов/экранов + проверки через Ajv/zod.
- **Инфраструктура**: добавить npm-скрипты и CI шаги (см. приоритет 10).

## Следующие шаги
1. Получить макет Figma и список компонентов Avito.
2. Определить формат JSON для `avitoDemo.json`, подготовить схему.
3. Спланировать структуру документации (README, ADR, диаграммы).
4. Согласовать стек тестирования и целевой охват.
