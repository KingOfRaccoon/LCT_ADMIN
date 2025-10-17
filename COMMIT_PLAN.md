# 📋 Коммит-план: Очистка проекта

## Цель
Подготовить проект к GitHub с профессиональным видом

## Файлы для коммита

### ✅ Изменённые файлы (код):
```
M  .gitignore                           # Добавлены правила игнорирования
M  src/components/Layout/Sidebar.jsx    # Обновления UI
M  src/config/api.js                    # Конфигурация API
M  src/pages/Sandbox/SandboxPage.jsx    # Sandbox обновления
M  src/pages/Sandbox/SandboxScreenRenderer.jsx  # Renderer fixes
M  src/pages/Sandbox/data/avitoDemo.json        # Новая версия демо
M  src/pages/ScreenBuilder/ScreenBuilder.jsx    # Screen builder
M  src/services/workflowApi.js          # API сервис
M  src/utils/avitoDemoConverter.js      # Converter утилита
M  src/utils/workflowMapper.js          # Workflow маппер
```

### ✅ Новые файлы (документация):
```
A  docs/add-to-cart-feature.md          # Новая функция
A  docs/add-to-cart-refactor.md         # Рефакторинг UI
A  docs/avitoDemo-v2-changes.md         # Changelog v2
A  docs/cart-api-unification.md         # API унификация
A  docs/PROJECT_CLEANUP.md              # Документация очистки
```

### ❌ Удалённые файлы (устаревшая документация):
```
D  .github/copilot-instructions.md
D  API_CONFIG_SUMMARY.md
D  CHANGELOG_API_URL.md
D  ... (72 файла устаревшей документации)
```

## Команды для коммита

### Вариант 1: Один большой коммит
```bash
cd /Users/aleksandrzvezdakov/WebstormProjects/TeST

# Добавить все изменения
git add -A

# Коммит
git commit -m "refactor: major cleanup and documentation update

- Remove 72+ outdated documentation files
- Update .gitignore with comprehensive rules
- Add new documentation for cart API unification
- Refactor avitoDemo.json to use new cart API
- Update code for cart_response.advertisements data structure

Breaking changes:
- Removed products_response, use cart_response.advertisements
- Unified fetch-products and refresh-cart-items into fetch-cart-items

Docs:
- add-to-cart-feature.md
- add-to-cart-refactor.md
- avitoDemo-v2-changes.md
- cart-api-unification.md
- PROJECT_CLEANUP.md"

# Push
git push origin master
```

### Вариант 2: Раздельные коммиты (рекомендуется)

```bash
cd /Users/aleksandrzvezdakov/WebstormProjects/TeST

# 1. Коммит: Обновление .gitignore
git add .gitignore
git commit -m "chore: update .gitignore with comprehensive rules

- Add backup file patterns (*.backup, *_old.*, *.bak)
- Add Python cache files
- Add environment files (.env*)
- Add build artifacts
- Add test coverage directories
- Add temporary files"

# 2. Коммит: Удаление устаревшей документации
git add -u  # Добавляет только удалённые файлы
git commit -m "docs: remove 72+ outdated documentation files

Removed obsolete documentation:
- Old API guides and configs
- Deprecated AVITO demo docs
- Outdated integration guides
- Duplicate quickstart files
- Old fix documentation

This cleanup improves repository navigation and reduces confusion."

# 3. Коммит: Новая документация
git add docs/*.md
git commit -m "docs: add new documentation for cart API updates

Added:
- add-to-cart-feature.md: POST integration flow
- add-to-cart-refactor.md: Button UX improvements
- avitoDemo-v2-changes.md: Version 2 changelog
- cart-api-unification.md: API endpoint unification
- PROJECT_CLEANUP.md: Cleanup documentation"

# 4. Коммит: Код изменения
git add src/
git commit -m "refactor: unify cart API and update data structure

Breaking changes:
- Removed products_response variable
- Added cart_response with nested advertisements
- Unified fetch-products and refresh-cart-items nodes
- Changed API endpoint to /carts/3/with-advertisements

Updated files:
- avitoDemo.json: New cart API integration
- SandboxPage.jsx: Event params handling
- SandboxScreenRenderer.jsx: dataSource support
- workflowApi.js, workflowMapper.js: API updates

Benefits:
- DRY principle (removed duplicate node)
- Correct semantics (cart vs products)
- Better data structure
- Single source of truth"

# Push всех коммитов
git push origin master
```

## Рекомендация

**Используйте Вариант 2** для лучшей git истории:
- Логическое разделение изменений
- Легче откатить конкретное изменение
- Лучше для code review
- Профессиональная git история

## После коммита

### Проверка GitHub
1. Откройте https://github.com/KingOfRaccoon/LCT_ADMIN
2. Проверьте, что все коммиты видны
3. Убедитесь, что backup файлы не попали в репозиторий
4. Проверьте README и документацию

### Обновление README (опционально)
Добавьте в README.md раздел с последними изменениями:

```markdown
## 📝 Latest Updates (2025-10-17)

### Cart API Unification
- Unified cart API endpoint
- Removed duplicate integration nodes
- Improved data structure with cart_response.advertisements

### Documentation Cleanup
- Removed 72+ outdated documentation files
- Added comprehensive .gitignore rules
- Updated documentation structure

See [docs/cart-api-unification.md](docs/cart-api-unification.md) for details.
```

## Проверка перед push

```bash
# Проверить статус
git status

# Проверить что будет запушено
git log origin/master..HEAD --oneline

# Проверить что backup файлы игнорируются
git status --ignored | grep backup

# Dry-run push
git push --dry-run origin master
```

## Если что-то пошло не так

```bash
# Отменить последний коммит (но сохранить изменения)
git reset --soft HEAD~1

# Отменить последний коммит (и удалить изменения)
git reset --hard HEAD~1

# Отменить push (если ещё не поздно)
git push --force origin HEAD~1:master
```

## Итоговая структура

```
LCT_ADMIN/
├── .gitignore                    # ✅ Обновлён
├── src/                          # ✅ Код обновлён
│   ├── components/
│   ├── pages/
│   │   └── Sandbox/
│   │       └── data/
│   │           └── avitoDemo.json  # ✅ Новая версия
│   └── utils/
├── docs/                         # ✅ Очищено + новые файлы
│   ├── add-to-cart-feature.md
│   ├── add-to-cart-refactor.md
│   ├── avitoDemo-v2-changes.md
│   ├── cart-api-unification.md
│   ├── PROJECT_CLEANUP.md
│   ├── context-schema.mmd
│   └── openapi.yaml
└── README.md                     # Рассмотреть обновление
```

## Готово! 🎉

Проект подготовлен для красивого GitHub репозитория:
- ✅ Чистая структура
- ✅ Актуальная документация
- ✅ Профессиональный .gitignore
- ✅ Логичные коммиты

Выполните команды из **Вариант 2** для идеального результата! 🚀
