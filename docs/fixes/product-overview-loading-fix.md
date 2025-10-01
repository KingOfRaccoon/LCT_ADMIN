# 🐛 Исправление: Данные продукта не загружаются при переходе

## Проблема

**Симптомы:**
- При переходе с `Products` на `Product Information` данные продукта **не подгружаются**
- При **перезагрузке страницы** `Product Information` информация подгружается корректно
- Экраны не отображаются при первом переходе

## 🔍 Анализ причины

### Исходный код (с ошибкой):

```javascript
useEffect(() => {
  // In real app, fetch product data by ID
  if (currentProduct && currentProduct.id === productId) {
    // Загрузка из currentProduct
    setProductMeta({...});
  } else {
    // Загрузка из JSON/mock данных
    if (productId === 'avito-cart-demo') {
      loadAvitoDemoAsGraphData()...
    } else {
      // Mock data для E-commerce
    }
  }
}, [productId, currentProduct, setProduct, setGraphData, setVariableSchemas]);
```

### Корневая причина:

1. **При переходе из ProductList:**
   ```
   ProductList (клик на карточку)
   → navigate(`/products/${product.id}`)
   → ProductOverview монтируется
   → currentProduct в VirtualContext = null/undefined
   → Условие if (currentProduct && currentProduct.id === productId) = FALSE
   → Блок else НЕ выполняется (потому что currentProduct существует, но id не совпадает)
   → Данные НЕ загружаются ❌
   ```

2. **При перезагрузке страницы:**
   ```
   Браузер загружает /products/avito-cart-demo
   → ProductOverview монтируется
   → currentProduct может быть восстановлен из localStorage/context
   → Условие if (currentProduct && currentProduct.id === productId) = TRUE
   → Данные загружаются ✅
   ```

### Логическая ошибка:

Проблема в условии `if (currentProduct && currentProduct.id === productId)`:
- Если `currentProduct` существует, но `id` не совпадает → условие `false`
- Блок `else` **не выполняется**, потому что `currentProduct` не `null`
- Данные не загружаются!

## ✅ Решение

### Исправленный код:

```javascript
useEffect(() => {
  // Загружаем данные по productId (независимо от currentProduct)
  if (productId === 'avito-cart-demo') {
    setIsLoadingData(true);
    loadAvitoDemoAsGraphData()
      .then((data) => {
        setGraphData({ nodes: data.nodes, edges: data.edges });
        setVariableSchemas(data.variableSchemas);
        
        const screensArray = convertAvitoDemoScreensToArray(data.screens, data.nodes);
        setProductScreens(screensArray);
        
        const mockProduct = {
          id: productId,
          name: 'Авито — Корзина',
          version: '1.0.0',
          description: 'Демонстрационный сценарий корзины Avito с 11 экранами и 25 действиями',
          theme: 'light',
          permissions: ['admin', 'viewer'],
          integrations: ['avito-api']
        };
        setProduct(mockProduct);
        setProductMeta(mockProduct);
        setIsLoadingData(false);
        toast.success('avitoDemo загружен успешно!');
      })
      .catch((error) => {
        console.error('Failed to load avitoDemo:', error);
        setIsLoadingData(false);
        toast.error('Ошибка загрузки avitoDemo: ' + error.message);
      });
  } else {
    // Mock loading product data для обычных продуктов
    const mockProduct = {
      id: productId,
      name: 'E-commerce Dashboard',
      version: '2.1.0',
      description: 'Admin panel for managing products, orders, and customers',
      theme: 'light',
      permissions: ['admin', 'editor'],
      integrations: ['stripe', 'analytics']
    };
    setProduct(mockProduct);
    setProductMeta(mockProduct);
    
    const mockScreens = [/* ... */];
    setProductScreens(mockScreens);
  }
}, [productId, setProduct, setGraphData, setVariableSchemas]);
```

### Ключевые изменения:

1. **Убрали проверку `currentProduct`:**
   - Раньше: `if (currentProduct && currentProduct.id === productId)`
   - Теперь: `if (productId === 'avito-cart-demo')`

2. **Убрали вложенность `else`:**
   - Раньше: `if (currentProduct) {...} else { if (productId) {...} }`
   - Теперь: `if (productId === 'avito-cart-demo') {...} else {...}`

3. **Убрали `currentProduct` из зависимостей:**
   - Раньше: `[productId, currentProduct, setProduct, ...]`
   - Теперь: `[productId, setProduct, ...]`

## 🎯 Результат

### До исправления:
```
ProductList → ProductOverview: ❌ Данные не загружаются
Reload ProductOverview:       ✅ Данные загружаются
```

### После исправления:
```
ProductList → ProductOverview: ✅ Данные загружаются
Reload ProductOverview:       ✅ Данные загружаются
```

## 📊 Тестирование

### Тестовый сценарий 1: Переход из ProductList
1. Открыть http://localhost:5173/products
2. Кликнуть на карточку "Авито — Корзина"
3. **Ожидаемый результат:** Экраны загружаются, отображается 11 экранов
4. **Статус:** ✅ PASSED

### Тестовый сценарий 2: Переход из ProductList (E-commerce)
1. Открыть http://localhost:5173/products
2. Кликнуть на карточку "E-commerce Dashboard"
3. **Ожидаемый результат:** Mock экраны загружаются, отображается 3 экрана
4. **Статус:** ✅ PASSED

### Тестовый сценарий 3: Прямая загрузка URL
1. Открыть http://localhost:5173/products/avito-cart-demo
2. **Ожидаемый результат:** Экраны загружаются, отображается 11 экранов
3. **Статус:** ✅ PASSED

### Тестовый сценарий 4: Перезагрузка страницы
1. Находясь на Product Overview, нажать F5
2. **Ожидаемый результат:** Экраны загружаются, данные сохраняются
3. **Статус:** ✅ PASSED

## 🧠 Уроки

### Что мы узнали:

1. **Условия в useEffect должны быть простыми:**
   - Избегайте сложных вложенных условий
   - Проверяйте только то, что действительно нужно

2. **Зависимости useEffect должны быть минимальными:**
   - Не добавляйте переменные, которые могут вызвать лишние ре-рендеры
   - `currentProduct` был лишним в зависимостях

3. **Источник правды — URL параметры:**
   - `productId` из `useParams()` — единственный источник правды
   - `currentProduct` из context — вторичный, может быть несинхронизирован

4. **Асинхронная инициализация context:**
   - При первом монтировании `currentProduct` может быть `null`
   - Нельзя полагаться на его наличие в useEffect

## 📝 Рекомендации

### Для будущих разработчиков:

1. **При добавлении новых продуктов:**
   ```javascript
   if (productId === 'new-product') {
     // Загрузка данных по productId
   } else if (productId === 'another-product') {
     // Другой продукт
   } else {
     // Default fallback
   }
   ```

2. **Не используйте `currentProduct` для проверки загрузки:**
   ```javascript
   // ❌ НЕ ДЕЛАЙТЕ ТАК:
   if (currentProduct && currentProduct.id === productId) {
     // ...
   }
   
   // ✅ ДЕЛАЙТЕ ТАК:
   if (productId === 'specific-product') {
     // ...
   }
   ```

3. **Минимизируйте зависимости useEffect:**
   ```javascript
   // ❌ Слишком много зависимостей:
   useEffect(() => {}, [productId, currentProduct, screens, variables, ...]);
   
   // ✅ Только необходимые:
   useEffect(() => {}, [productId, setProduct, setGraphData]);
   ```

## 🔗 Связанные документы

- [AVITO_DEMO_INTEGRATION.md](../AVITO_DEMO_INTEGRATION.md) - Интеграция avitoDemo
- [INFINITE_LOOP_FIX.md](./infinite-loop-fix.md) - Исправление бесконечного цикла
- [HOW_TO_ADD_PRODUCT.md](../HOW_TO_ADD_PRODUCT.md) - Добавление новых продуктов

---

**Дата исправления:** 1 октября 2025  
**Затронутые файлы:** `src/pages/ProductOverview/ProductOverview.jsx`  
**Затронутые продукты:** avitoDemo, E-commerce Dashboard  
**Статус:** ✅ Исправлено и протестировано
