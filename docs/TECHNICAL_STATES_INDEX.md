# Индекс документации: Технические состояния

## 📚 Полный набор документации

Этот индекс поможет быстро найти нужную информацию о технических состояниях.

---

## 🚀 Быстрый старт

**Начните отсюда:**

1. 📖 [**README**](./TECHNICAL_STATES_README.md) - общий обзор, быстрый старт
2. 💻 [**Примеры**](./TECHNICAL_STATES_EXAMPLES.md) - практические примеры кода
3. 📊 [**Визуальная схема**](./TECHNICAL_STATES_VISUAL_SCHEMA.md) - диаграммы архитектуры

---

## 📖 Документация по разделам

### Для разработчиков

| Документ | Описание | Когда использовать |
|----------|----------|-------------------|
| [**API Reference**](./TECHNICAL_STATES_CONVERTER.md) | Полное API всех функций конвертера | При написании кода, интеграции |
| [**Примеры**](./TECHNICAL_STATES_EXAMPLES.md) | 8 практических примеров использования | Для копипасты готовых решений |
| [**Сводка изменений**](./TECHNICAL_STATES_CONVERTER_SUMMARY.md) | Что было сделано, статистика | Для понимания объёма работ |

### Для менеджеров/планирования

| Документ | Описание | Когда использовать |
|----------|----------|-------------------|
| [**Чеклист интеграции**](./TECHNICAL_STATES_INTEGRATION_CHECKLIST.md) | 90 задач в 9 этапах | Для планирования спринтов |
| [**README**](./TECHNICAL_STATES_README.md) | Краткий обзор с метриками | Для презентаций, отчётов |

### Для понимания архитектуры

| Документ | Описание | Когда использовать |
|----------|----------|-------------------|
| [**Визуальная схема**](./TECHNICAL_STATES_VISUAL_SCHEMA.md) | ASCII-диаграммы, flow-схемы | Для быстрого понимания потоков |
| [**API Reference**](./TECHNICAL_STATES_CONVERTER.md) | Детальное описание структур данных | Для глубокого погружения |

---

## 🗂️ Структура документации

```
docs/
├── TECHNICAL_STATES_README.md                    ← Начните здесь
├── TECHNICAL_STATES_CONVERTER.md                 ← API Reference (400+ строк)
├── TECHNICAL_STATES_EXAMPLES.md                  ← Примеры кода (500+ строк)
├── TECHNICAL_STATES_INTEGRATION_CHECKLIST.md     ← Чеклист (200+ строк)
├── TECHNICAL_STATES_VISUAL_SCHEMA.md             ← Диаграммы
├── TECHNICAL_STATES_CONVERTER_SUMMARY.md         ← Сводка изменений
└── TECHNICAL_STATES_INDEX.md                     ← Этот файл
```

---

## 🔍 Поиск информации

### Хочу понять, как использовать конвертер
👉 [Примеры](./TECHNICAL_STATES_EXAMPLES.md) → Раздел 1: "Базовое использование"

### Нужно создать технический узел в UI
👉 [Примеры](./TECHNICAL_STATES_EXAMPLES.md) → Раздел 2: "Создание технического узла в UI"

### Как валидировать выражения?
👉 [API Reference](./TECHNICAL_STATES_CONVERTER.md) → Раздел "Функции валидации"

### Какие функции доступны в expressions?
👉 [API Reference](./TECHNICAL_STATES_CONVERTER.md) → `SAFE_FUNCTIONS_LIST`  
👉 [Визуальная схема](./TECHNICAL_STATES_VISUAL_SCHEMA.md) → Раздел "Безопасные функции"

### Как работает логика переходов (transitions)?
👉 [Визуальная схема](./TECHNICAL_STATES_VISUAL_SCHEMA.md) → Раздел "Transition Logic"  
👉 [API Reference](./TECHNICAL_STATES_CONVERTER.md) → Раздел "Множественные переходы"

### Что нужно сделать для полной интеграции?
👉 [Чеклист](./TECHNICAL_STATES_INTEGRATION_CHECKLIST.md)

### Как генерировать документацию?
👉 [Примеры](./TECHNICAL_STATES_EXAMPLES.md) → Раздел 5: "Генерация документации"

### Как экспортировать на бэкенд?
👉 [Примеры](./TECHNICAL_STATES_EXAMPLES.md) → Раздел 6: "Экспорт на бэкенд"

---

## 📊 Ключевые концепции

### 1. Expression (Выражение)

**Что это:** Вычисляемое выражение, возвращающее значение определённого типа.

**Основные поля:**
- `variable` - имя результата
- `expression` - вычисляемое выражение
- `return_type` - тип результата (`boolean`, `integer`, `float`, `string`, `list`, `dict`)
- `default_value` - значение при ошибке
- `metadata` - описание, примеры, теги

**Где читать:**
- [Визуальная схема](./TECHNICAL_STATES_VISUAL_SCHEMA.md) → "Expression Structure"
- [API Reference](./TECHNICAL_STATES_CONVERTER.md) → "Типизация результатов"

### 2. Transition (Переход)

**Что это:** Условный переход между состояниями на основе значений expressions.

**Основные поля:**
- `variable` / `variables` - проверяемая переменная(ые)
- `case` - ожидаемое значение
- `logic` - логика для множественных переменных (`all_true`, `any_true`, `none_true`, и т.д.)
- `state_id` - целевое состояние

**Где читать:**
- [Визуальная схема](./TECHNICAL_STATES_VISUAL_SCHEMA.md) → "Transition Logic"
- [Примеры](./TECHNICAL_STATES_EXAMPLES.md) → Пример 3: "Множественная верификация"

### 3. Metadata (Метаданные)

**Что это:** Дополнительная информация для админ-панели (описание, примеры, теги).

**Основные поля:**
- `description` - текстовое описание
- `category` - категория
- `tags` - массив тегов
- `examples` - примеры входных/выходных данных
- `author`, `version` - информация об авторе и версии

**Где читать:**
- [API Reference](./TECHNICAL_STATES_CONVERTER.md) → "Метаданные для админ-панели"
- [Примеры](./TECHNICAL_STATES_EXAMPLES.md) → Раздел 4: "Работа с метаданными"

### 4. Safe Functions (Безопасные функции)

**Что это:** Набор из 27 функций, доступных в expressions.

**Категории:**
- Math (6): abs, round, min, max, sum, pow
- String (6): upper, lower, strip, startswith, endswith, contains
- Collection (5): len, any, all, sorted, reversed
- Check (3): is_none, is_not_none, is_empty
- Dict (3): get, keys, values
- Cast (4): int, float, str, bool

**Где читать:**
- [README](./TECHNICAL_STATES_README.md) → "Безопасные функции"
- [Визуальная схема](./TECHNICAL_STATES_VISUAL_SCHEMA.md) → "Безопасные функции"

### 5. Validation (Валидация)

**Что это:** Проверка корректности expressions и transitions.

**Проверки:**
- Синтаксис выражения
- Существование переменных в контексте
- Корректность типов
- Запрещённые конструкции
- Длина выражения

**Где читать:**
- [API Reference](./TECHNICAL_STATES_CONVERTER.md) → "Функции валидации"
- [Примеры](./TECHNICAL_STATES_EXAMPLES.md) → Раздел 3: "Валидация перед сохранением"

---

## 🎯 Сценарии использования

### Сценарий 1: Я начинающий разработчик
1. Прочитайте [README](./TECHNICAL_STATES_README.md)
2. Изучите [Примеры](./TECHNICAL_STATES_EXAMPLES.md)
3. Посмотрите [Визуальную схему](./TECHNICAL_STATES_VISUAL_SCHEMA.md)
4. Запустите тест: `node test-technical-state-converter.js`

### Сценарий 2: Нужно добавить technical узел в UI
1. [Примеры](./TECHNICAL_STATES_EXAMPLES.md) → Раздел 2
2. [Чеклист](./TECHNICAL_STATES_INTEGRATION_CHECKLIST.md) → Этап 2: UI компоненты
3. [API Reference](./TECHNICAL_STATES_CONVERTER.md) → `createTechnicalNodeTemplate()`

### Сценарий 3: Нужно интегрировать с бэкендом
1. [API Reference](./TECHNICAL_STATES_CONVERTER.md) → `exportTechnicalNodeForBackend()`
2. [Примеры](./TECHNICAL_STATES_EXAMPLES.md) → Раздел 6
3. [Чеклист](./TECHNICAL_STATES_INTEGRATION_CHECKLIST.md) → Этап 5: API

### Сценарий 4: Планирую интеграцию
1. [Чеклист](./TECHNICAL_STATES_INTEGRATION_CHECKLIST.md) - полный список задач
2. [Сводка](./TECHNICAL_STATES_CONVERTER_SUMMARY.md) - что уже готово
3. [README](./TECHNICAL_STATES_README.md) → "Следующие шаги"

### Сценарий 5: Ищу конкретную функцию API
1. [API Reference](./TECHNICAL_STATES_CONVERTER.md) - полный справочник
2. Используйте Ctrl+F для поиска по имени функции

---

## ✅ Проверочный лист перед стартом

Перед началом работы убедитесь, что вы:

- [ ] Прочитали [README](./TECHNICAL_STATES_README.md)
- [ ] Запустили тесты: `node test-technical-state-converter.js`
- [ ] Изучили хотя бы 2-3 [примера](./TECHNICAL_STATES_EXAMPLES.md)
- [ ] Понимаете структуру [Expression](#1-expression-выражение) и [Transition](#2-transition-переход)
- [ ] Знаете, где искать [список безопасных функций](#4-safe-functions-безопасные-функции)
- [ ] Открыли [чеклист](./TECHNICAL_STATES_INTEGRATION_CHECKLIST.md) и знаете следующие шаги

---

## 🔗 Внешние ссылки

- **Исходный промпт с требованиями** - в контексте беседы
- **Основной код**: `src/utils/avitoDemoConverter.js`
- **Тесты**: `test-technical-state-converter.js`
- **Данные**: `src/pages/Sandbox/data/avitoDemo.json`

---

## 📞 Помощь

**Не нашли ответ?**

1. Проверьте [API Reference](./TECHNICAL_STATES_CONVERTER.md) - самый полный документ
2. Посмотрите [примеры](./TECHNICAL_STATES_EXAMPLES.md) - возможно, есть похожий кейс
3. Изучите визуальные схемы - иногда проще понять по диаграмме

---

**Обновлено:** 2 октября 2025 г.  
**Версия документации:** 1.0.0
