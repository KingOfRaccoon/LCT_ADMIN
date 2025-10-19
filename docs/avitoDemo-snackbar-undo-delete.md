# ✅ Добавлен Snackbar с возможностью отмены удаления товара

## 📋 Описание

Реализован функционал показа snackbar-уведомления при удалении товара из корзины с возможностью отмены действия. Snackbar вынесен в отдельную секцию и располагается выше footer.

## 🎨 Визуальное расположение

```
┌─────────────────────────────────────┐
│           HEADER                     │
├─────────────────────────────────────┤
│                                      │
│           BODY                       │
│      (список товаров)                │
│                                      │
├─────────────────────────────────────┤
│         ┌─────────────────────┐     │ ← SNACKBAR (отдельная секция)
│         │ Товар удалён | ↩️ Вернуть │
│         └─────────────────────┘     │
├─────────────────────────────────────┤
│           FOOTER                     │
│    (итого + кнопка оформить)         │
└─────────────────────────────────────┘
```

## 🔧 Реализованные изменения

### 1. Новые переменные в `variableSchemas` и `initialContext`

```json
{
  "removed_item": {
    "type": "object",
    "schema": {
      "id": "number",
      "quantity": "number"
    }
  }
}
```

**Назначение**: Хранит ID и количество удалённого товара для возможности восстановления.

### 2. Новое состояние: `prepare-remove-item`

**Тип**: Technical State  
**Триггер**: Событие `removeItem`

**Действия**:
1. Находит товар в корзине по `selected_item_id`
2. Сохраняет `{ id, quantity }` в переменную `removed_item`
3. Устанавливает уведомление:
   - `ui.notifications.message = "Товар удалён из корзины"`
   - `ui.notifications.actionLabel = "Вернуть"`
   - `ui.notifications.actionEvent = "undoRemoveItem"`
4. Переходит к `remove-item-integration`

### 3. Новое состояние: `undo-remove-item-integration`

**Тип**: Integration State  
**Триггер**: Событие `undoRemoveItem` (кнопка "Вернуть" в snackbar)

**API запрос**:
```http
PATCH /api/carts/3/items/${removed_item.id}
Content-Type: application/json

{
  "quantity": ${removed_item.quantity}
}
```

**Действия после запроса**:
- Переходит к `clear-undo-state` для очистки переменных

### 4. Новое состояние: `clear-undo-state`

**Тип**: Technical State  
**Триггер**: Автоматически после `undo-remove-item-integration`

**Действия**:
1. Скрывает snackbar (очищает `ui.notifications.*`)
2. Очищает `removed_item`
3. Перезагружает корзину (`fetch-cart-items`)

### 5. Обновлённый Edge для удаления

```json
{
  "id": "edge-remove-item",
  "event": "removeItem",
  "target": "prepare-remove-item",  // ← Изменено с "remove-item-integration"
  "contextPatch": {
    "selected_item_id": "${eventParams.selected_item_id}"
  }
}
```

### 5. Новый Edge для отмены удаления

```json
{
  "id": "edge-undo-remove-item",
  "event": "undoRemoveItem",
  "target": "undo-remove-item-integration"
}
```

### 6. Новая секция `snackbar`

**Расположение**: Между `body` и `footer`

**Стили**:
```json
{
  "position": "fixed",
  "bottom": "90px",      // Выше футера
  "left": "0",
  "right": "0",
  "zIndex": 1000,
  "pointerEvents": "none"  // Не блокирует клики
}
```

**Содержимое**:
- Условный рендеринг по `ui.notifications.message !== null`
- Тёмный фон (#2F3034)
- Белый текст сообщения
- Фиолетовая кнопка действия (#8B5CF6)

## 📊 Диаграмма потока

```mermaid
graph LR
    A[Пользователь нажимает 🗑️] --> B[removeItem event]
    B --> C[prepare-remove-item]
    C --> D[Сохранить removed_item]
    D --> E[Показать snackbar]
    E --> F[remove-item-integration]
    F --> G[DELETE API]
    G --> H[fetch-cart-items]
    H --> I[Товар удалён, snackbar виден]
    
    I -->|Клик "Вернуть"| J[undoRemoveItem event]
    J --> K[undo-remove-item-integration]
    K --> L[PATCH API с quantity]
    L --> M[clear-undo-state]
    M --> N[Скрыть snackbar, очистить removed_item]
    N --> O[fetch-cart-items]
    O --> P[Товар восстановлен]
```

## 🧪 Тестирование

### Сценарий 1: Удаление товара

1. Откройте корзину в Sandbox
2. Нажмите 🗑️ на любом товаре
3. **Ожидаемый результат**:
   - ✅ Товар удаляется из списка
   - ✅ Появляется snackbar "Товар удалён из корзины | Вернуть"
   - ✅ Snackbar располагается выше footer
   - ✅ API запрос: `DELETE /api/carts/3/advertisements/${id}`

### Сценарий 2: Отмена удаления

1. После удаления товара (Сценарий 1)
2. Нажмите кнопку "Вернуть" в snackbar
3. **Ожидаемый результат**:
   - ✅ Snackbar исчезает
   - ✅ Товар возвращается в корзину
   - ✅ Количество восстанавливается до исходного
   - ✅ API запрос: `PATCH /api/carts/3/items/${id}` с `{"quantity": ${original_quantity}}`

### Сценарий 3: Удаление товара с количеством > 1

1. Откройте корзину с товаром, где quantity = 3
2. Нажмите 🗑️
3. Нажмите "Вернуть" в snackbar
4. **Ожидаемый результат**:
   - ✅ Товар возвращается с quantity = 3 (исходное значение)

## 🎯 Ключевые особенности

### ✅ Преимущества реализации

1. **Отдельная секция**: Snackbar не зависит от контента body
2. **Фиксированное позиционирование**: Всегда видим пользователю
3. **Сохранение quantity**: Восстанавливается точное количество
4. **Чистая архитектура**: Промежуточное состояние для подготовки
5. **Независимость от scrolling**: Snackbar виден при любой прокрутке

### 🔒 Безопасность

- Сохраняется только ID и quantity, не вся информация о товаре
- После успешной отмены `removed_item` очищается
- Snackbar автоматически скрывается при отмене

## 📱 UI компоненты

### Snackbar стили

```json
{
  "backgroundColor": "#2F3034",     // Тёмно-серый
  "borderRadius": "12px",
  "boxShadow": "0 4px 12px rgba(0, 0, 0, 0.15)",
  "padding": "16px",
  "margin": "0 16px"
}
```

### Кнопка "Вернуть"

```json
{
  "fontSize": "15px",
  "fontWeight": 600,
  "color": "#8B5CF6",              // Фиолетовый Avito
  "background": "transparent",
  "border": "none",
  "cursor": "pointer"
}
```

## 🚀 Дальнейшие улучшения (опционально)

1. **Автоскрытие**: Добавить таймер для автоматического скрытия snackbar через 5-10 секунд
2. **Анимация**: Добавить плавное появление/исчезновение
3. **История удалений**: Расширить `removed_item` до массива для нескольких отмен
4. **Кнопка закрытия**: Добавить ✕ для ручного закрытия snackbar

---

**Дата реализации**: 19 октября 2025  
**Статус**: ✅ Готово и протестировано
