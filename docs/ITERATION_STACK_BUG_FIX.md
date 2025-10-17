# Исправление критического бага с iterationStack

## Дата: 18 октября 2025 г.

## 🐛 Описание проблемы

После внедрения Phase 2 (мемоизация компонентов) и Phase 1 (оптимизация списков) был обнаружен критический баг:

**Симптомы:**
- Списки отображали placeholder-значения вместо реальных данных
- `${product.name}` возвращал "Название товара" (fallback)
- `${product.description}` возвращал "Описание товара" (fallback)
- Количество элементов было корректным (4 элемента), но данные не подтягивались

**Пример:**
```
Товар #1: Название товара
Товар #2: Название товара
Товар #3: Название товара
Товар #4: Название товара
```

Вместо ожидаемого:
```
Товар #1: Классные кроссовки
Товар #2: Телефон Samsung
Товар #3: Ноутбук
Товар #4: Наушники Sony
```

## 🔍 Root Cause Analysis

### Причина #1: Отсутствие iterationStack в мемоизированных компонентах

**Проблема:**
Мемоизированные компоненты (Phase 2) были созданы до оптимизации списков (Phase 1) и не знали о существовании `iterationStack` - параметра, необходимого для разрешения binding-значений внутри списков.

**Где происходило:**
```jsx
// ❌ БЫЛО (в ScreenComponents.jsx)
export const TextComponent = React.memo(({ component, context }) => {
  const props = component?.props ?? component?.properties ?? {};
  const content = resolveBindingValue(props?.content, context, 'Текст');
  //                                                             ^^^^^^
  //                                          Нет iterationStack!
  ...
});
```

**Что происходило:**
1. Список создавал `iterationStack = [{ alias: 'product', item: {...}, index: 0 }]`
2. `TextComponent` получал `context` и `component`, но НЕ получал `iterationStack`
3. `resolveBindingValue('${product.name}', context, 'Название товара')` вызывался БЕЗ iterationStack
4. Функция не могла найти `product` в пустом iterationStack и возвращала fallback

### Причина #2: Компоненты не передавались iterationStack в SandboxScreenRenderer

**Проблема:**
Даже после добавления параметра в компоненты, case-блоки в `SandboxScreenRenderer.jsx` не передавали этот параметр.

**Где происходило:**
```jsx
// ❌ БЫЛО
case 'button': {
  return (
    <ButtonComponent
      component={component}
      context={context}
      // iterationStack не передавался!
      onEvent={onEvent}
    />
  );
}
```

## ✅ Решение

### Шаг 1: Обновлены все мемоизированные компоненты (ScreenComponents.jsx)

Добавлен параметр `iterationStack = []` и передача в `resolveBindingValue`:

```jsx
// ✅ СТАЛО
export const TextComponent = React.memo(({ 
  component, 
  context, 
  iterationStack = []  // ← Добавлен параметр
}) => {
  const props = component?.props ?? component?.properties ?? {};
  const content = resolveBindingValue(
    props?.content, 
    context, 
    'Текст',
    { iterationStack }  // ← Передаём в resolveBindingValue
  );
  ...
});
```

**Обновлены функции сравнения (memo):**
```jsx
}, (prevProps, nextProps) => 
  prevProps.component === nextProps.component && 
  prevProps.context === nextProps.context &&
  prevProps.iterationStack === nextProps.iterationStack  // ← Добавлена проверка
);
```

### Шаг 2: Обновлены все case-блоки (SandboxScreenRenderer.jsx)

Добавлена передача `iterationStack` во все мемоизированные компоненты:

```jsx
// ✅ СТАЛО
case 'button': {
  return (
    <ButtonComponent
      component={component}
      context={context}
      iterationStack={iterationStack}  // ← Добавлена передача
      onEvent={onEvent}
    />
  );
}
```

### Шаг 3: Удалены debug логи

Удалены все временные `console.log('🔍 ...)` логи, добавленные для отладки.

## 📊 Затронутые компоненты

### ScreenComponents.jsx (7 компонентов)

| Компонент | Обновлён параметр | Обновлён memo | resolveBindingValue вызовов |
|-----------|-------------------|---------------|----------------------------|
| TextComponent | ✅ | ✅ | 1 |
| ButtonComponent | ✅ | ✅ | 5 |
| ImageComponent | ✅ | ✅ | 2 |
| InputComponent | ✅ | ✅ | 3 |
| ColumnComponent | ✅ | ✅ | 0 (контейнер) |
| RowComponent | ✅ | ✅ | 0 (контейнер) |
| ContainerComponent | ✅ | ✅ | 0 (контейнер) |

### SandboxScreenRenderer.jsx (7 case-блоков)

| Case-блок | Добавлен iterationStack |
|-----------|------------------------|
| case 'column' | ✅ |
| case 'container' | ✅ |
| case 'row' | ✅ |
| case 'button' | ✅ |
| case 'text' | ✅ (уже был) |
| case 'input' | ✅ |
| case 'image' | ✅ |

## 🧪 Проверка исправления

### Результат до исправления:
```
🔍 [RAW ITEMS] Array length: 4
🔍 [CHILD RENDER] index: 0, alias: "product"
TextComponent content: "Название товара" (fallback!)
```

### Результат после исправления:
```
✅ Товар #1: Классные кроссовки
✅ Товар #2: Телефон Samsung  
✅ Товар #3: Ноутбук
✅ Товар #4: Наушники Sony
```

## 📝 Уроки

1. **Параметры должны быть согласованы между фазами**
   - Phase 2 (мемоизация) создана ДО Phase 1 (списки)
   - Нужно было обновить Phase 2 после добавления iterationStack в Phase 1

2. **Мемоизированные компоненты должны знать о контексте итерации**
   - React.memo сравнивает props, поэтому iterationStack должен быть в списке сравнения
   - Без этого компоненты не обновятся при изменении итерации

3. **Binding resolution требует полного контекста**
   - `resolveBindingValue` нуждается в `iterationStack` для разрешения `${product.xxx}`
   - Без iterationStack функция не знает, где искать `product`

## 🎯 Checklist для будущих изменений

При добавлении новых мемоизированных компонентов:

- [ ] Добавить `iterationStack = []` в параметры компонента
- [ ] Передать `{ iterationStack }` во все вызовы `resolveBindingValue`
- [ ] Добавить `prevProps.iterationStack === nextProps.iterationStack` в memo comparison
- [ ] Обновить соответствующий case-блок в `SandboxScreenRenderer.jsx`
- [ ] Протестировать компонент внутри списка с реальными данными

## 📦 Связанные файлы

- `/src/pages/Sandbox/components/ScreenComponents.jsx` (360+ строк)
- `/src/pages/Sandbox/SandboxScreenRenderer.jsx` (740+ строк)
- `/docs/FINAL_OPTIMIZATION_REPORT.md` (основной отчёт по оптимизации)
- `/docs/REACT_WINDOW_MIGRATION.md` (миграция react-window)

## ✨ Статус

**Статус:** ✅ Исправлено и протестировано
**Версия:** Dev server работает без ошибок
**Подтверждение:** Пользователь подтвердил "Заработало!!"
