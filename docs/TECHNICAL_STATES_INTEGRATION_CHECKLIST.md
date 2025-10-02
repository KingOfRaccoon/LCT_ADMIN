# Чеклист интеграции технических состояний

## ✅ Этап 1: Обновление конвертера (Завершено)

- [x] Добавлена поддержка `return_type` и `default_value`
- [x] Добавлена поддержка метаданных (`metadata`)
- [x] Добавлена поддержка явной логики для transitions (`logic`)
- [x] Реализована нормализация expressions и transitions
- [x] Реализована валидация технических узлов
- [x] Добавлены функции для работы с метаданными
- [x] Добавлен список безопасных функций (`SAFE_FUNCTIONS_LIST`)
- [x] Реализован экспорт в формат бэкенда
- [x] Создан шаблон технического узла
- [x] Документация конвертера

## 📋 Этап 2: Обновление UI компонентов

### ScreenEditor (React Flow)

- [ ] **Добавить визуализацию технических узлов**
  - [ ] Специальная иконка для technical узлов
  - [ ] Цветовая схема для technical узлов (например, фиолетовый)
  - [ ] Отображение количества expressions в узле
  - [ ] Тултип с метаданными при наведении

- [ ] **Улучшить отображение transitions**
  - [ ] Лейблы с явной логикой (`ALL TRUE`, `ANY TRUE`, и т.д.)
  - [ ] Разные стили для разных типов logic
  - [ ] Показывать список переменных в тултипе

**Файлы для изменения:**
- `src/pages/ScreenEditor/ScreenEditor.jsx`
- `src/pages/ScreenEditor/components/CustomNode.jsx`
- `src/pages/ScreenEditor/components/CustomEdge.jsx`

### ScreenBuilder (Редактор состояния)

- [ ] **Создать TechnicalStateEditor компонент**
  - [ ] Редактор expressions с валидацией
  - [ ] Expression Builder с автодополнением
  - [ ] Показ доступных функций (используя `SAFE_FUNCTIONS_LIST`)
  - [ ] Выбор `return_type` из dropdown
  - [ ] Поле для `default_value` с валидацией типа
  - [ ] Редактор метаданных

- [ ] **Создать TransitionsEditor компонент**
  - [ ] Выбор переменных из списка expressions
  - [ ] Выбор `logic` для множественных переменных
  - [ ] Выбор целевого состояния из графа
  - [ ] Превью логики перехода

- [ ] **Добавить валидацию в реальном времени**
  - [ ] Использовать `validateTechnicalExpression()`
  - [ ] Показывать ошибки под полями
  - [ ] Блокировать сохранение при наличии ошибок

- [ ] **Кнопка "Test Expression"**
  - [ ] Поля для ввода тестовых значений
  - [ ] Отправка на `/api/workflow/test-expression`
  - [ ] Отображение результата и типа

**Файлы для создания:**
- `src/pages/ScreenBuilder/components/TechnicalStateEditor.jsx`
- `src/pages/ScreenBuilder/components/ExpressionEditor.jsx`
- `src/pages/ScreenBuilder/components/TransitionsEditor.jsx`
- `src/pages/ScreenBuilder/components/FunctionsPalette.jsx`
- `src/pages/ScreenBuilder/components/ExpressionTester.jsx`

### ProductOverview

- [ ] **Отображать статистику технических узлов**
  - [ ] Количество technical узлов в продукте
  - [ ] Количество expressions
  - [ ] Статус валидации

**Файлы для изменения:**
- `src/pages/ProductOverview/ProductOverview.jsx`

## 🔄 Этап 3: Интеграция с VirtualContext

- [ ] **Обновить редьюсер VirtualContext**
  - [ ] Добавить экшены для technical узлов:
    - `ADD_TECHNICAL_NODE`
    - `UPDATE_TECHNICAL_NODE`
    - `ADD_EXPRESSION`
    - `UPDATE_EXPRESSION`
    - `DELETE_EXPRESSION`
    - `ADD_TRANSITION`
    - `UPDATE_TRANSITION`
    - `DELETE_TRANSITION`
  
- [ ] **Синхронизация с graphData**
  - [ ] При изменении expressions обновлять узел в graphData
  - [ ] При изменении transitions обновлять рёбра в graphData

- [ ] **Валидация при сохранении**
  - [ ] Вызывать `validateTechnicalNode()` перед сохранением
  - [ ] Показывать модальное окно с ошибками если валидация провалилась

**Файлы для изменения:**
- `src/context/VirtualContext.jsx`

## 🗄️ Этап 4: Обновление данных

### avitoDemo.json

- [ ] **Обновить существующие technical узлы**
  - [ ] Добавить `return_type` ко всем expressions
  - [ ] Добавить `default_value`
  - [ ] Добавить метаданные с examples
  - [ ] Преобразовать transitions в новый формат с `logic`

- [ ] **Создать примеры**
  - [ ] Пример с проверкой email
  - [ ] Пример с расчётом скидки
  - [ ] Пример с множественными переходами

**Файл для изменения:**
- `src/pages/Sandbox/data/avitoDemo.json`

### Другие конфигурации

- [ ] `src/data/ecommerceDashboard.json`
- [ ] `src/data/screenConfigs.json`

## 🔌 Этап 5: Интеграция с API

### Существующие эндпоинты

- [ ] **`/api/workflow/save`**
  - [ ] Использовать `exportTechnicalNodeForBackend()` для преобразования
  - [ ] Убедиться, что формат соответствует бэкенду

- [ ] **Новые эндпоинты (если ещё не реализованы)**
  - [ ] `POST /api/workflow/test-expression` - тестирование выражения
  - [ ] `GET /api/workflow/safe-functions` - список доступных функций
  - [ ] `POST /api/workflow/validate-expression` - валидация выражения

**Файлы для изменения/создания:**
- `src/api/*` (если есть API клиент)
- Обновить `docs/admin-api-spec.md`

## 🎨 Этап 6: Стили и UI/UX

- [ ] **Добавить цветовые токены для technical узлов**
  - [ ] `--color-technical-primary`
  - [ ] `--color-technical-secondary`
  - [ ] `--color-transition-all-true`
  - [ ] `--color-transition-any-true`
  - [ ] и т.д.

- [ ] **Добавить иконки**
  - [ ] Иконка для technical узла
  - [ ] Иконки для разных типов logic

- [ ] **Создать стили для компонентов**
  - [ ] TechnicalStateEditor
  - [ ] ExpressionEditor
  - [ ] FunctionsPalette

**Файлы для изменения:**
- `src/data/designTokens.json`
- `src/styles/*`

## 🧪 Этап 7: Тестирование

- [ ] **Unit тесты**
  - [ ] Тесты для `validateTechnicalExpression()`
  - [ ] Тесты для `validateTechnicalNode()`
  - [ ] Тесты для `normalizeExpression()`
  - [ ] Тесты для `normalizeTransitions()`

- [ ] **Integration тесты**
  - [ ] Загрузка avitoDemo с валидацией
  - [ ] Создание технического узла в UI
  - [ ] Сохранение и экспорт на бэкенд

- [ ] **E2E тесты**
  - [ ] Полный флоу: создание → валидация → сохранение → загрузка

**Файлы для создания:**
- `src/utils/__tests__/avitoDemoConverter.test.js`
- `src/pages/ScreenBuilder/__tests__/TechnicalStateEditor.test.jsx`

## 📚 Этап 8: Документация

- [x] **Документация конвертера** (`TECHNICAL_STATES_CONVERTER.md`)
- [x] **Чеклист интеграции** (этот файл)
- [ ] **Обновить существующие доки**
  - [ ] `docs/declarative-refactoring.md` - добавить раздел о technical states
  - [ ] `docs/HOW_TO_ADD_PRODUCT.md` - примеры с technical узлами
  - [ ] `docs/admin-api-spec.md` - обновить контракт API
- [ ] **User Guide для админ-панели**
  - [ ] Как создать technical узел
  - [ ] Как писать expressions
  - [ ] Примеры использования безопасных функций
  - [ ] Best practices

## 🚀 Этап 9: Деплой и мониторинг

- [ ] **Проверить совместимость с бэкендом**
  - [ ] Список функций совпадает с сервером
  - [ ] Формат данных соответствует ожиданиям
  - [ ] Все новые поля корректно обрабатываются

- [ ] **Миграция данных**
  - [ ] Скрипт для миграции старых technical узлов в новый формат
  - [ ] Валидация всех существующих узлов

- [ ] **Мониторинг**
  - [ ] Логирование ошибок валидации
  - [ ] Метрики использования технических узлов
  - [ ] Алерты на критические ошибки

## 📊 Прогресс

**Общий прогресс:** 10% (9/90 задач)

- ✅ Этап 1: Конвертер - 100% (9/9)
- ⏳ Этап 2: UI компоненты - 0% (0/15)
- ⏳ Этап 3: VirtualContext - 0% (0/6)
- ⏳ Этап 4: Данные - 0% (0/7)
- ⏳ Этап 5: API - 0% (0/5)
- ⏳ Этап 6: Стили - 0% (0/8)
- ⏳ Этап 7: Тесты - 0% (0/7)
- ⏳ Этап 8: Документация - 22% (2/9)
- ⏳ Этап 9: Деплой - 0% (0/6)

## 🎯 Приоритеты

### Высокий приоритет (для MVP)
1. ✅ Конвертер (Этап 1) - **Завершено**
2. UI компоненты для создания/редактирования (Этап 2)
3. Интеграция с VirtualContext (Этап 3)
4. Валидация при сохранении (Этап 3)
5. Обновление avitoDemo.json (Этап 4)

### Средний приоритет
6. API endpoints (Этап 5)
7. Стили и UI/UX (Этап 6)
8. Unit тесты (Этап 7)

### Низкий приоритет
9. E2E тесты (Этап 7)
10. User Guide (Этап 8)
11. Мониторинг (Этап 9)

## 💡 Рекомендации

1. **Начать с UI компонентов** - это самая заметная для пользователя часть
2. **Использовать существующие паттерны** из ScreenBuilder/ScreenEditor
3. **Валидация в реальном времени** - критически важна для UX
4. **Постепенная миграция** - не нужно сразу переделывать все данные
5. **Тестирование на каждом этапе** - не накапливать технический долг

## 🔗 Полезные ссылки

- [Конвертер - Документация](./TECHNICAL_STATES_CONVERTER.md)
- [Декларативная архитектура](./declarative-refactoring.md)
- [Admin API Spec](./admin-api-spec.md)
- [How to Add Product](./HOW_TO_ADD_PRODUCT.md)
