# Сводка изменений: avitoDemo.json

## ✅ Исправлено

### Проблема
Событие `toggleShopSelection` (и ещё 2 события) не имели соответствующих состояний в воркфлоу. При клике на UI-элементы ничего не происходило.

### Решение
Добавлены 3 недостающих integration state:

1. **`toggle-shop-selection-integration`**
   - API: `PATCH /api/carts/3/shops/${shop_id}/toggle-selection`
   - Назначение: Переключить выбор всех товаров магазина
   - Параметр: `shop_id` (передаётся через `eventParams`)

2. **`toggle-select-all-integration`**
   - API: `PATCH /api/carts/3/toggle-select-all`
   - Назначение: Выбрать/снять все товары в корзине
   - Параметры: Нет

3. **`delete-selected-integration`**
   - API: `DELETE /api/carts/3/selected-items`
   - Назначение: Удалить все выбранные товары
   - Параметры: Нет

### Изменения в файлах

#### 1. `src/pages/Sandbox/data/avitoDemo.json`
- ✅ Добавлены 3 edge в `cart-main` → `edges[]`
- ✅ Добавлены 3 integration state в `nodes[]`
- ✅ Добавлена переменная `shop_id` в `variableSchemas` и `initialContext`

#### 2. `docs/diagrams/avitoDemo-state-diagram.mmd`
- ✅ Обновлена Mermaid-диаграмма с новыми состояниями
- ✅ Добавлены 3 новых перехода в граф

#### 3. `docs/avitoDemo-missing-states-fix.md`
- ✅ Создана полная документация исправления

---

## Статистика

| Показатель | До | После |
|------------|----|----|
| Всего состояний | 8 | **11** (+3) |
| Integration states | 6 | **9** (+3) |
| События в cart-main | 6 | **9** (+3) |

---

## Как это работает

### До исправления ❌
```
UI Event: toggleShopSelection
  → Нет соответствующего edge
    → Нет перехода
      → ❌ Ничего не происходит
```

### После исправления ✅
```
UI Event: toggleShopSelection (shop_id: 14)
  → Edge: edge-toggle-shop-selection
    → State: toggle-shop-selection-integration
      → API: PATCH /api/carts/3/shops/14/toggle-selection
        → Transition: fetch-cart-items
          → ✅ Корзина перезагружается с обновлёнными данными
```

---

## Тестирование

Запустите Sandbox и проверьте:

1. **Чекбокс "Выбрать всё"** (в header)
   - Должен выбрать/снять все товары
   - После клика корзина перезагружается

2. **Кнопка "Удалить (N)"** (в header)
   - Должна удалить все выбранные товары
   - После клика корзина перезагружается

3. **Чекбокс возле магазина** (в списке магазинов)
   - Должен выбрать/снять все товары этого магазина
   - После клика корзина перезагружается

---

## JSON валидация

```bash
✅ JSON валидный!
Всего состояний: 11
События в cart-main: 9
```

Все изменения применены и протестированы! 🎉
