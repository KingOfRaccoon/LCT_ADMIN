# 🚀 Руководство по миграции движка шаблонов на Kotlin Compose

**Дата:** 19 октября 2025 г.  
**Версия движка:** 2.0 (с поддержкой шаблонных строк)  
**Цель:** Портирование React-based движка на Kotlin Compose

---

## 📋 Оглавление

1. [Обзор архитектуры](#обзор-архитектуры)
2. [Движок шаблонов](#движок-шаблонов)
3. [Система рендеринга](#система-рендеринга)
4. [Поддерживаемые компоненты](#поддерживаемые-компоненты)
5. [JSON-конфигурация](#json-конфигурация)
6. [Тестирование](#тестирование)
7. [Рекомендации для Kotlin Compose](#рекомендации-для-kotlin-compose)

---

## 🏗️ Обзор архитектуры

### Компоненты системы

```
┌─────────────────────────────────────────────────────────────┐
│                      JSON Configuration                      │
│                    (avitoDemo.json)                         │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   Template Engine                           │
│                   (bindings.js)                             │
│  • isBindingValue()      • normalizeReference()            │
│  • isTemplateString()    • processTemplateString()         │
│  • resolveBindingValue() • safeEvalExpression()            │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                Screen Renderer                              │
│            (SandboxScreenRenderer.jsx)                      │
│  • Component Switch • Event Handling                       │
│  • Context Management • Iteration Stacks                   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                 UI Components                               │
│            (ScreenComponents.jsx)                           │
│  • ButtonComponent   • CardComponent                       │
│  • TextComponent     • ImageComponent                      │
│  • ListComponent     • ConditionalComponent                │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 Движок шаблонов

### 1. Основные типы биндингов

Движок поддерживает три типа биндингов:

#### 1.1. Простые биндинги
```javascript
// Формат в JSON
{
  "reference": "${product.name}"
}

// Результат
"iPhone 15 Pro"
```

**Характеристики:**
- Вся строка состоит из одного `${expression}`
- Возвращает значение как есть (число, строка, объект, массив)
- Тип данных сохраняется

#### 1.2. Простые шаблонные строки
```javascript
// Формат в JSON
{
  "reference": "Удалить (${cart_response.total_items_count})"
}

// Результат
"Удалить (5)"
```

**Характеристики:**
- Содержит текст ВНЕ `${}`
- Всегда возвращает строку
- Поддерживает одно выражение с окружающим текстом

#### 1.3. Множественные выражения
```javascript
// Формат в JSON
{
  "reference": "${firstName} ${lastName}"
}

// Результат
"Иван Иванов"
```

**Характеристики:**
- Содержит несколько `${expression}`
- Всегда возвращает строку
- Все выражения вычисляются и конкатенируются

---

### 2. Ключевые функции движка

#### 2.1. `isBindingValue(value)`

```javascript
export const isBindingValue = (value) => Boolean(
  value && typeof value === 'object' && typeof value.reference === 'string'
);
```

**Цель:** Определяет, является ли значение биндингом (объект с полем `reference`)

**Kotlin аналог:**
```kotlin
fun isBindingValue(value: Any?): Boolean {
    return value is Map<*, *> && 
           value["reference"] is String
}
```

---

#### 2.2. `normalizeReference(reference)`

```javascript
export const normalizeReference = (reference) => {
  if (!reference || typeof reference !== 'string') {
    return '';
  }
  return reference.replace(/^\$\{/, '').replace(/\}$/, '');
};
```

**Цель:** Удаляет внешние `${` и `}` из биндинга

**Примеры:**
- `"${product.name}"` → `"product.name"`
- `"${count}"` → `"count"`

**Kotlin аналог:**
```kotlin
fun normalizeReference(reference: String?): String {
    if (reference.isNullOrBlank()) return ""
    return reference
        .removePrefix("\${")
        .removeSuffix("}")
}
```

---

#### 2.3. `isTemplateString(str)` ⭐ КЛЮЧЕВАЯ ФУНКЦИЯ

```javascript
const isTemplateString = (str) => {
  if (!str || typeof str !== 'string') return false;
  
  // Проверяем, что строка содержит хотя бы один ${}
  const matches = str.match(/\$\{[^}]+\}/g);
  if (!matches || matches.length === 0) return false;
  
  // Если строка полностью состоит из одного ${} выражения - это не шаблонная строка
  if (matches.length === 1) {
    const cleaned = str.trim();
    const match = matches[0];
    // Проверяем, что вся строка это одно ${} выражение
    if (cleaned === match) {
      return false; // Простой биндинг
    }
  }
  
  // Иначе это шаблонная строка (есть текст вне ${} или несколько ${})
  return true;
};
```

**Цель:** Различает простые биндинги от шаблонных строк

**Логика решения:**
1. Если нет `${}` → `false`
2. Если один `${}` И вся строка = `${}` → `false` (простой биндинг)
3. Если один `${}` НО есть текст вне → `true` (шаблонная строка)
4. Если несколько `${}` → `true` (шаблонная строка)

**Тесты:**
| Вход | Результат | Тип |
|------|-----------|-----|
| `${product.name}` | `false` | Простой биндинг |
| `Удалить (${count})` | `true` | Шаблонная строка |
| `${a} ${b}` | `true` | Множественные выражения |

**Kotlin аналог:**
```kotlin
fun isTemplateString(str: String?): Boolean {
    if (str.isNullOrBlank()) return false
    
    val regex = Regex("""\$\{[^}]+\}""")
    val matches = regex.findAll(str).toList()
    
    if (matches.isEmpty()) return false
    
    if (matches.size == 1) {
        val cleaned = str.trim()
        val match = matches[0].value
        if (cleaned == match) {
            return false // Простой биндинг
        }
    }
    
    return true // Шаблонная строка
}
```

---

#### 2.4. `processTemplateString(template, context, iterationStack)`

```javascript
const processTemplateString = (template, context, iterationStack = []) => {
  // Создаем расширенный контекст с итерациями
  const extendedContext = { ...context };
  iterationStack.forEach((frame) => {
    const alias = frame.alias || 'item';
    extendedContext[alias] = frame.item;
    extendedContext[`${alias}Index`] = frame.index;
    extendedContext[`${alias}Total`] = frame.total;
  });
  
  // Заменяем каждое ${...} выражение на его значение
  return template.replace(/\$\{([^}]+)\}/g, (match, expression) => {
    try {
      const result = safeEvalExpression(expression.trim(), extendedContext);
      return result !== undefined && result !== null ? String(result) : '';
    } catch (error) {
      console.warn('[sandbox] Failed to evaluate template expression:', expression, error);
      return match; // Возвращаем оригинальное выражение при ошибке
    }
  });
};
```

**Цель:** Обрабатывает шаблонные строки с несколькими `${}`

**Алгоритм:**
1. Расширяет контекст данными из `iterationStack` (для списков)
2. Находит все `${expression}` с помощью regex
3. Вычисляет каждое выражение через `safeEvalExpression()`
4. Заменяет `${expression}` на результат
5. При ошибке возвращает оригинальное выражение

**Kotlin аналог:**
```kotlin
fun processTemplateString(
    template: String,
    context: MutableMap<String, Any?>,
    iterationStack: List<IterationFrame> = emptyList()
): String {
    // Расширяем контекст данными из стека итераций
    val extendedContext = context.toMutableMap()
    iterationStack.forEach { frame ->
        val alias = frame.alias ?: "item"
        extendedContext[alias] = frame.item
        extendedContext["${alias}Index"] = frame.index
        extendedContext["${alias}Total"] = frame.total
    }
    
    // Регулярка для поиска ${...}
    val regex = Regex("""\$\{([^}]+)\}""")
    
    return regex.replace(template) { matchResult ->
        val expression = matchResult.groupValues[1].trim()
        try {
            val result = safeEvalExpression(expression, extendedContext)
            result?.toString() ?: ""
        } catch (e: Exception) {
            Log.w("TemplateEngine", "Failed to evaluate: $expression", e)
            matchResult.value // Возвращаем оригинал при ошибке
        }
    }
}
```

---

#### 2.5. `safeEvalExpression(expression, context)`

```javascript
export const safeEvalExpression = (expression, context = {}) => {
  try {
    // Создаем функцию с доступом к контексту
    const contextKeys = Object.keys(context);
    const contextValues = Object.values(context);
    
    const fn = new Function(...contextKeys, `
      "use strict";
      return (${expression});
    `);
    
    return fn(...contextValues);
  } catch (error) {
    console.warn('[sandbox] Failed to evaluate expression:', expression, error);
    return undefined;
  }
};
```

**Цель:** Безопасно вычисляет JavaScript выражения с доступом к контексту

**Поддерживаемые операторы:**
- ✅ Арифметические: `+`, `-`, `*`, `/`, `%`
- ✅ Сравнения: `===`, `!==`, `>`, `<`, `>=`, `<=`
- ✅ Логические: `&&`, `||`, `!`
- ✅ Тернарный: `condition ? true : false`
- ✅ Доступ к свойствам: `object.property`, `array[index]`
- ✅ Вызов методов: `string.toUpperCase()`, `array.length`

**Примеры:**
```javascript
// Арифметика
safeEvalExpression("count * 2", { count: 21 }) // → 42

// Сравнение
safeEvalExpression("price > 1000", { price: 1500 }) // → true

// Тернарный оператор
safeEvalExpression("count === 1 ? 'товар' : 'товаров'", { count: 5 }) // → "товаров"

// Сложное выражение
safeEvalExpression("product.price + ' ₽'", { product: { price: 1500 } }) // → "1500 ₽"
```

**Kotlin аналог (используя Expression Evaluator):**

Для Kotlin Compose рекомендуется использовать библиотеку **[expr](https://github.com/ezylang/EvalEx)** или **[JEval](https://github.com/metadatacenter/jeval)**:

```kotlin
import com.ezylang.evalex.EvaluationException
import com.ezylang.evalex.Expression

fun safeEvalExpression(expression: String, context: Map<String, Any?>): Any? {
    try {
        val expr = Expression(expression)
        
        // Добавляем переменные из контекста
        context.forEach { (key, value) ->
            expr.with(key, value)
        }
        
        return expr.evaluate().value
    } catch (e: EvaluationException) {
        Log.w("TemplateEngine", "Failed to evaluate: $expression", e)
        return null
    }
}
```

**Альтернатива без библиотек (ограниченная):**
```kotlin
fun safeEvalExpression(expression: String, context: Map<String, Any?>): Any? {
    return try {
        // Простой парсер для базовых выражений
        when {
            expression.contains("?") -> evaluateTernary(expression, context)
            expression.contains("+") -> evaluateAddition(expression, context)
            expression.contains("===") -> evaluateEquals(expression, context)
            expression.contains(".") -> evaluatePropertyAccess(expression, context)
            else -> context[expression]
        }
    } catch (e: Exception) {
        Log.w("TemplateEngine", "Failed to evaluate: $expression", e)
        null
    }
}
```

---

#### 2.6. `resolveBindingValue(value, context, fallback, options)` ⭐ ГЛАВНАЯ ФУНКЦИЯ

```javascript
export const resolveBindingValue = (value, context, fallback, options = {}) => {
  if (!isBindingValue(value)) {
    return value ?? fallback;
  }

  const { iterationStack = [] } = options;
  
  // Проверяем, является ли это шаблонной строкой
  if (isTemplateString(value.reference)) {
    try {
      const result = processTemplateString(value.reference, context, iterationStack);
      return result;
    } catch (error) {
      console.warn('[sandbox] Failed to process template string:', value.reference, error);
    }
  }
  
  // Обрабатываем как простой биндинг
  const normalized = normalizeReference(value.reference);
  
  // Расширяем контекст данными из итерационного стека
  const extendedContext = { ...context };
  iterationStack.forEach((frame) => {
    const alias = frame.alias || 'item';
    extendedContext[alias] = frame.item;
    extendedContext[`${alias}Index`] = frame.index;
    extendedContext[`${alias}Total`] = frame.total;
  });
  
  // Пробуем вычислить как выражение
  try {
    const result = safeEvalExpression(normalized, extendedContext);
    if (result !== undefined) {
      return result;
    }
  } catch (error) {
    // Игнорируем ошибки и пробуем получить значение из контекста
  }
  
  // Получаем значение из контекста по пути
  const contextValue = getContextValue(extendedContext, normalized);
  
  if (contextValue !== undefined) {
    return contextValue;
  }
  
  return fallback;
};
```

**Цель:** Главная функция резолва биндингов

**Алгоритм:**
1. Проверяет, является ли `value` биндингом (объект с `reference`)
2. Если нет — возвращает как есть
3. Если шаблонная строка — использует `processTemplateString()`
4. Если простой биндинг:
   - Нормализует reference (удаляет `${}`)
   - Расширяет контекст данными из `iterationStack`
   - Пробует вычислить как JavaScript выражение
   - Если не получилось — ищет значение в контексте по пути
5. Возвращает `fallback` если ничего не найдено

**Kotlin аналог:**
```kotlin
data class BindingValue(
    val reference: String,
    val value: Any? = null
)

fun resolveBindingValue(
    value: Any?,
    context: Map<String, Any?>,
    fallback: Any? = null,
    iterationStack: List<IterationFrame> = emptyList()
): Any? {
    // Проверяем, является ли value биндингом
    if (!isBindingValue(value)) {
        return value ?: fallback
    }
    
    val bindingValue = value as? Map<*, *> ?: return fallback
    val reference = bindingValue["reference"] as? String ?: return fallback
    
    // Проверяем, является ли это шаблонной строкой
    if (isTemplateString(reference)) {
        return try {
            processTemplateString(reference, context.toMutableMap(), iterationStack)
        } catch (e: Exception) {
            Log.w("TemplateEngine", "Failed to process template string: $reference", e)
            fallback
        }
    }
    
    // Обрабатываем как простой биндинг
    val normalized = normalizeReference(reference)
    
    // Расширяем контекст данными из итерационного стека
    val extendedContext = context.toMutableMap()
    iterationStack.forEach { frame ->
        val alias = frame.alias ?: "item"
        extendedContext[alias] = frame.item
        extendedContext["${alias}Index"] = frame.index
        extendedContext["${alias}Total"] = frame.total
    }
    
    // Пробуем вычислить как выражение
    try {
        val result = safeEvalExpression(normalized, extendedContext)
        if (result != null) return result
    } catch (e: Exception) {
        // Игнорируем и пробуем получить из контекста
    }
    
    // Получаем значение из контекста по пути
    val contextValue = getContextValue(extendedContext, normalized)
    return contextValue ?: fallback
}
```

---

#### 2.7. `getContextValue(context, path)`

```javascript
export const getContextValue = (context, path) => {
  if (!path) {
    return undefined;
  }

  const segments = path.split('.');
  let acc = context;
  for (let i = 0; i < segments.length; i += 1) {
    const segment = segments[i];

    if (
      acc === undefined || 
      acc === null || 
      acc === 'None' || 
      acc === 'null' || 
      acc === 'undefined'
    ) {
      return undefined;
    }

    if (typeof acc !== 'object' || acc === null) {
      return undefined;
    }

    acc = acc[segment];
  }

  return acc;
};
```

**Цель:** Получает значение из объекта по пути с точкой (например, `product.price`)

**Примеры:**
```javascript
const context = {
  product: {
    name: "iPhone",
    price: 1500
  }
};

getContextValue(context, "product.name") // → "iPhone"
getContextValue(context, "product.price") // → 1500
getContextValue(context, "unknown") // → undefined
```

**Kotlin аналог:**
```kotlin
fun getContextValue(context: Map<String, Any?>, path: String): Any? {
    if (path.isBlank()) return null
    
    val segments = path.split(".")
    var acc: Any? = context
    
    for (segment in segments) {
        when {
            acc == null || acc == "None" || acc == "null" || acc == "undefined" -> return null
            acc !is Map<*, *> -> return null
        }
        
        acc = (acc as? Map<*, *>)?.get(segment)
    }
    
    return acc
}
```

---

## 🎨 Система рендеринга

### 1. Структура рендерера

```javascript
const SandboxScreenRenderer = ({ screen, context, onEvent }) => {
  const renderComponent = (component, iterationStack = []) => {
    const type = component.type;
    
    switch (type) {
      case 'text':
        return <TextComponent {...component} context={context} iterationStack={iterationStack} />;
      
      case 'button':
        return <ButtonComponent {...component} context={context} onEvent={onEvent} iterationStack={iterationStack} />;
      
      case 'card':
        return <CardComponent {...component} context={context} onEvent={onEvent} iterationStack={iterationStack} />;
      
      case 'image':
        return <ImageComponent {...component} context={context} iterationStack={iterationStack} />;
      
      case 'list':
        return renderList(component, iterationStack);
      
      case 'conditional':
        return renderConditional(component, iterationStack);
      
      case 'row':
      case 'column':
        return renderContainer(component, iterationStack);
      
      default:
        return null;
    }
  };
  
  return renderComponent(screen);
};
```

**Kotlin Compose аналог:**
```kotlin
@Composable
fun SandboxScreenRenderer(
    screen: ComponentConfig,
    context: Map<String, Any?>,
    onEvent: (String, Map<String, Any?>) -> Unit
) {
    RenderComponent(
        component = screen,
        context = context,
        onEvent = onEvent,
        iterationStack = emptyList()
    )
}

@Composable
fun RenderComponent(
    component: ComponentConfig,
    context: Map<String, Any?>,
    onEvent: (String, Map<String, Any?>) -> Unit,
    iterationStack: List<IterationFrame> = emptyList()
) {
    when (component.type) {
        "text" -> TextComponent(component, context, iterationStack)
        "button" -> ButtonComponent(component, context, onEvent, iterationStack)
        "card" -> CardComponent(component, context, onEvent, iterationStack)
        "image" -> ImageComponent(component, context, iterationStack)
        "list" -> ListComponent(component, context, onEvent, iterationStack)
        "conditional" -> ConditionalComponent(component, context, onEvent, iterationStack)
        "row" -> RowComponent(component, context, onEvent, iterationStack)
        "column" -> ColumnComponent(component, context, onEvent, iterationStack)
    }
}
```

---

### 2. Iteration Stack (для списков)

```javascript
// Структура фрейма итерации
{
  alias: 'product',      // Имя переменной для элемента
  item: { id: 1, ... },  // Данные элемента
  index: 0,              // Индекс элемента (начиная с 0)
  total: 10              // Общее количество элементов
}
```

**Использование в списках:**
```javascript
const renderList = (component, iterationStack) => {
  const dataSource = resolveBindingValue(
    component.properties.dataSource,
    context,
    [],
    { iterationStack }
  );
  
  const itemAlias = component.properties.itemAlias || 'item';
  
  return dataSource.map((item, index) => {
    const frame = {
      alias: itemAlias,
      item,
      index,
      total: dataSource.length
    };
    
    const newStack = [...iterationStack, frame];
    
    return component.children.map(child => 
      renderComponent(child, newStack)
    );
  });
};
```

**Kotlin Compose аналог:**
```kotlin
data class IterationFrame(
    val alias: String,
    val item: Any?,
    val index: Int,
    val total: Int
)

@Composable
fun ListComponent(
    component: ComponentConfig,
    context: Map<String, Any?>,
    onEvent: (String, Map<String, Any?>) -> Unit,
    iterationStack: List<IterationFrame>
) {
    val dataSource = resolveBindingValue(
        value = component.properties["dataSource"],
        context = context,
        fallback = emptyList<Any>(),
        iterationStack = iterationStack
    ) as? List<*> ?: emptyList<Any?>()
    
    val itemAlias = component.properties["itemAlias"] as? String ?: "item"
    
    dataSource.forEachIndexed { index, item ->
        val frame = IterationFrame(
            alias = itemAlias,
            item = item,
            index = index,
            total = dataSource.size
        )
        
        val newStack = iterationStack + frame
        
        component.children?.forEach { child ->
            RenderComponent(child, context, onEvent, newStack)
        }
    }
}
```

---

## 🧩 Поддерживаемые компоненты

### 1. TextComponent

**JSON:**
```json
{
  "id": "text-title",
  "type": "text",
  "properties": {
    "content": {
      "reference": "${product.name}",
      "value": "Заголовок"
    },
    "variant": "heading"
  },
  "style": {
    "fontSize": "24px",
    "fontWeight": 700,
    "color": "#2F3034"
  }
}
```

**React:**
```jsx
const TextComponent = React.memo(({ properties, style, context, iterationStack }) => {
  const content = resolveBindingValue(
    properties.content,
    context,
    '',
    { iterationStack }
  );
  
  return <div style={style}>{content}</div>;
});
```

**Kotlin Compose:**
```kotlin
@Composable
fun TextComponent(
    component: ComponentConfig,
    context: Map<String, Any?>,
    iterationStack: List<IterationFrame>
) {
    val content = resolveBindingValue(
        value = component.properties["content"],
        context = context,
        fallback = "",
        iterationStack = iterationStack
    )?.toString() ?: ""
    
    val style = component.style ?: emptyMap()
    
    Text(
        text = content,
        fontSize = parseFontSize(style["fontSize"]),
        fontWeight = parseFontWeight(style["fontWeight"]),
        color = parseColor(style["color"])
    )
}
```

---

### 2. ButtonComponent

**JSON:**
```json
{
  "id": "button-add",
  "type": "button",
  "properties": {
    "text": {
      "reference": "Удалить (${count})",
      "value": "Удалить (0)"
    },
    "variant": "primary",
    "event": "addToCart",
    "eventParams": {
      "product_id": {
        "reference": "${product.id}",
        "value": 0
      }
    },
    "disabled": {
      "reference": "${count === 0}",
      "value": false
    }
  },
  "style": {
    "backgroundColor": "#8B5CF6",
    "color": "#ffffff"
  }
}
```

**React:**
```jsx
const ButtonComponent = React.memo(({ properties, style, context, onEvent, iterationStack }) => {
  const text = resolveBindingValue(properties.text, context, '', { iterationStack });
  const disabled = resolveBindingValue(properties.disabled, context, false, { iterationStack });
  
  const handleClick = () => {
    if (disabled) return;
    
    const eventName = properties.event;
    const params = {};
    
    if (properties.eventParams) {
      Object.entries(properties.eventParams).forEach(([key, value]) => {
        params[key] = resolveBindingValue(value, context, null, { iterationStack });
      });
    }
    
    onEvent(eventName, params);
  };
  
  return (
    <button onClick={handleClick} disabled={disabled} style={style}>
      {text}
    </button>
  );
});
```

**Kotlin Compose:**
```kotlin
@Composable
fun ButtonComponent(
    component: ComponentConfig,
    context: Map<String, Any?>,
    onEvent: (String, Map<String, Any?>) -> Unit,
    iterationStack: List<IterationFrame>
) {
    val text = resolveBindingValue(
        value = component.properties["text"],
        context = context,
        fallback = "",
        iterationStack = iterationStack
    )?.toString() ?: ""
    
    val disabled = resolveBindingValue(
        value = component.properties["disabled"],
        context = context,
        fallback = false,
        iterationStack = iterationStack
    ) as? Boolean ?: false
    
    val eventName = component.properties["event"] as? String
    val eventParams = component.properties["eventParams"] as? Map<*, *>
    
    Button(
        onClick = {
            if (!disabled && eventName != null) {
                val params = eventParams?.mapValues { (_, value) ->
                    resolveBindingValue(value, context, null, iterationStack)
                } ?: emptyMap<String, Any?>()
                
                onEvent(eventName, params)
            }
        },
        enabled = !disabled,
        modifier = Modifier.then(parseStyle(component.style))
    ) {
        Text(text)
    }
}
```

---

### 3. CardComponent (кликабельный контейнер)

**JSON:**
```json
{
  "id": "card-product",
  "type": "card",
  "properties": {
    "event": "addToCart",
    "eventParams": {
      "advertisement_id": {
        "reference": "${product.id}",
        "value": 0
      }
    }
  },
  "style": {
    "borderRadius": "12px",
    "border": "1px solid #E5E5E5"
  },
  "children": [
    { "type": "image", ... },
    { "type": "text", ... }
  ]
}
```

**React:**
```jsx
const CardComponent = React.memo(({ properties, style, children, context, onEvent, iterationStack }) => {
  const handleClick = () => {
    const eventName = properties.event;
    const params = {};
    
    if (properties.eventParams) {
      Object.entries(properties.eventParams).forEach(([key, value]) => {
        params[key] = resolveBindingValue(value, context, null, { iterationStack });
      });
    }
    
    onEvent(eventName, params);
  };
  
  return (
    <div onClick={handleClick} style={{ ...style, cursor: 'pointer' }}>
      {children.map(child => renderComponent(child, iterationStack))}
    </div>
  );
});
```

**Kotlin Compose:**
```kotlin
@Composable
fun CardComponent(
    component: ComponentConfig,
    context: Map<String, Any?>,
    onEvent: (String, Map<String, Any?>) -> Unit,
    iterationStack: List<IterationFrame>
) {
    val eventName = component.properties["event"] as? String
    val eventParams = component.properties["eventParams"] as? Map<*, *>
    
    Card(
        modifier = Modifier
            .clickable {
                if (eventName != null) {
                    val params = eventParams?.mapValues { (_, value) ->
                        resolveBindingValue(value, context, null, iterationStack)
                    } ?: emptyMap<String, Any?>()
                    
                    onEvent(eventName, params)
                }
            }
            .then(parseStyle(component.style)),
        shape = RoundedCornerShape(12.dp),
        border = BorderStroke(1.dp, Color(0xFFE5E5E5))
    ) {
        Column {
            component.children?.forEach { child ->
                RenderComponent(child, context, onEvent, iterationStack)
            }
        }
    }
}
```

---

### 4. ImageComponent

**JSON:**
```json
{
  "id": "image-product",
  "type": "image",
  "properties": {
    "src": {
      "reference": "${product.image}",
      "value": "https://via.placeholder.com/200"
    },
    "alt": "Изображение товара"
  },
  "style": {
    "width": "200px",
    "height": "200px",
    "borderRadius": "8px"
  }
}
```

**Kotlin Compose:**
```kotlin
@Composable
fun ImageComponent(
    component: ComponentConfig,
    context: Map<String, Any?>,
    iterationStack: List<IterationFrame>
) {
    val src = resolveBindingValue(
        value = component.properties["src"],
        context = context,
        fallback = "",
        iterationStack = iterationStack
    )?.toString() ?: ""
    
    AsyncImage(
        model = ImageRequest.Builder(LocalContext.current)
            .data(src)
            .crossfade(true)
            .build(),
        contentDescription = component.properties["alt"] as? String,
        modifier = Modifier.then(parseStyle(component.style)),
        contentScale = ContentScale.Crop
    )
}
```

---

### 5. ConditionalComponent

**JSON:**
```json
{
  "id": "conditional-discount",
  "type": "conditional",
  "properties": {
    "condition": {
      "reference": "${product.discount > 0}",
      "value": false
    }
  },
  "children": [
    {
      "type": "text",
      "properties": {
        "content": "Скидка!"
      }
    }
  ]
}
```

**React:**
```jsx
const ConditionalComponent = ({ properties, children, context, iterationStack }) => {
  const condition = resolveBindingValue(
    properties.condition,
    context,
    false,
    { iterationStack }
  );
  
  if (!condition) return null;
  
  return children.map(child => renderComponent(child, iterationStack));
};
```

**Kotlin Compose:**
```kotlin
@Composable
fun ConditionalComponent(
    component: ComponentConfig,
    context: Map<String, Any?>,
    onEvent: (String, Map<String, Any?>) -> Unit,
    iterationStack: List<IterationFrame>
) {
    val condition = resolveBindingValue(
        value = component.properties["condition"],
        context = context,
        fallback = false,
        iterationStack = iterationStack
    ) as? Boolean ?: false
    
    if (condition) {
        component.children?.forEach { child ->
            RenderComponent(child, context, onEvent, iterationStack)
        }
    }
}
```

---

### 6. Row/Column Containers

**JSON:**
```json
{
  "id": "row-header",
  "type": "row",
  "properties": {
    "spacing": 12,
    "alignItems": "center",
    "justifyContent": "space-between"
  },
  "style": {
    "padding": "16px"
  },
  "children": [...]
}
```

**Kotlin Compose:**
```kotlin
@Composable
fun RowComponent(
    component: ComponentConfig,
    context: Map<String, Any?>,
    onEvent: (String, Map<String, Any?>) -> Unit,
    iterationStack: List<IterationFrame>
) {
    val spacing = (component.properties["spacing"] as? Number)?.toInt() ?: 0
    
    Row(
        modifier = Modifier.then(parseStyle(component.style)),
        horizontalArrangement = parseHorizontalArrangement(component.properties["justifyContent"]),
        verticalAlignment = parseVerticalAlignment(component.properties["alignItems"])
    ) {
        component.children?.forEachIndexed { index, child ->
            RenderComponent(child, context, onEvent, iterationStack)
            if (index < component.children.size - 1) {
                Spacer(modifier = Modifier.width(spacing.dp))
            }
        }
    }
}

@Composable
fun ColumnComponent(
    component: ComponentConfig,
    context: Map<String, Any?>,
    onEvent: (String, Map<String, Any?>) -> Unit,
    iterationStack: List<IterationFrame>
) {
    val spacing = (component.properties["spacing"] as? Number)?.toInt() ?: 0
    
    Column(
        modifier = Modifier.then(parseStyle(component.style)),
        verticalArrangement = parseVerticalArrangement(component.properties["justifyContent"]),
        horizontalAlignment = parseHorizontalAlignment(component.properties["alignItems"])
    ) {
        component.children?.forEachIndexed { index, child ->
            RenderComponent(child, context, onEvent, iterationStack)
            if (index < component.children.size - 1) {
                Spacer(modifier = Modifier.height(spacing.dp))
            }
        }
    }
}
```

---

## 📝 JSON-конфигурация

### Структура файла

```json
{
  "id": "avito-cart-demo",
  "name": "Авито — Корзина",
  "initialContext": {
    "cart_response": {
      "shop_groups": [],
      "total_items_count": 0,
      "selected_items_count": 0,
      "total_amount": 0
    }
  },
  "screens": {
    "screen-cart-main": {
      "id": "screen-cart-main",
      "type": "Screen",
      "sections": {
        "header": { ... },
        "body": { ... },
        "footer": { ... }
      }
    }
  }
}
```

### Типичный компонент

```json
{
  "id": "button-delete",
  "type": "button",
  "properties": {
    "text": {
      "reference": "Удалить (${cart_response.total_items_count})",
      "value": "Удалить (0)"
    },
    "event": "deleteSelected",
    "disabled": {
      "reference": "${cart_response.selected_items_count === 0}",
      "value": true
    }
  },
  "style": {
    "fontSize": "15px",
    "color": "#0A74F0"
  }
}
```

**Ключевые моменты:**
1. Каждое динамическое значение — объект с `reference` и `value`
2. `reference` — выражение с `${}`
3. `value` — fallback значение
4. `style` — CSS-подобные свойства
5. `properties` — специфичные для компонента свойства

---

## 🧪 Тестирование

### Тестовый набор

Все тесты находятся в корне проекта:

1. **test-simple-binding.cjs** — простые биндинги
2. **test-simple-template.js** — простые шаблонные строки
3. **test-complex-ternary.js** — сложные тернарные операторы
4. **test-template-engine.cjs** — сводный тест всех возможностей

### Запуск тестов

```bash
# Сводный тест
node test-template-engine.cjs

# Результат: ✅ 10/10 тестов пройдено
```

### Тестовые случаи для Kotlin

```kotlin
class TemplateEngineTest {
    
    @Test
    fun `test simple bindings`() {
        val context = mapOf(
            "product" to mapOf("name" to "iPhone 15 Pro"),
            "count" to 42
        )
        
        val binding1 = mapOf("reference" to "\${product.name}")
        assertEquals("iPhone 15 Pro", resolveBindingValue(binding1, context, ""))
        
        val binding2 = mapOf("reference" to "\${count}")
        assertEquals(42, resolveBindingValue(binding2, context, ""))
    }
    
    @Test
    fun `test simple template strings`() {
        val context = mapOf("count" to 5)
        val binding = mapOf("reference" to "Удалить (\${count})")
        
        assertEquals("Удалить (5)", resolveBindingValue(binding, context, ""))
    }
    
    @Test
    fun `test multiple expressions`() {
        val context = mapOf("a" to 2, "b" to 3, "c" to 5)
        val binding = mapOf("reference" to "\${a} + \${b} = \${c}")
        
        assertEquals("2 + 3 = 5", resolveBindingValue(binding, context, ""))
    }
    
    @Test
    fun `test ternary operators`() {
        val context1 = mapOf("count" to 1)
        val binding = mapOf("reference" to "\${count === 1 ? \"товар\" : \"товаров\"}")
        
        assertEquals("товар", resolveBindingValue(binding, context1, ""))
        
        val context2 = mapOf("count" to 5)
        assertEquals("товаров", resolveBindingValue(binding, context2, ""))
    }
    
    @Test
    fun `test comparison operators`() {
        val context = mapOf("price" to 1500)
        val binding = mapOf("reference" to "\${price > 1000 ? \"дорого\" : \"доступно\"}")
        
        assertEquals("дорого", resolveBindingValue(binding, context, ""))
    }
}
```

---

## 🎯 Рекомендации для Kotlin Compose

### 1. Архитектура

```
app/
├── data/
│   ├── model/
│   │   ├── ComponentConfig.kt
│   │   ├── ScreenConfig.kt
│   │   └── BindingValue.kt
│   └── repository/
│       └── ConfigRepository.kt
├── domain/
│   ├── engine/
│   │   ├── TemplateEngine.kt
│   │   ├── ExpressionEvaluator.kt
│   │   └── BindingResolver.kt
│   └── usecase/
│       └── RenderScreenUseCase.kt
└── ui/
    ├── components/
    │   ├── TextComponent.kt
    │   ├── ButtonComponent.kt
    │   ├── CardComponent.kt
    │   ├── ImageComponent.kt
    │   ├── ListComponent.kt
    │   └── ConditionalComponent.kt
    └── renderer/
        └── ScreenRenderer.kt
```

### 2. Data Models

```kotlin
data class ComponentConfig(
    val id: String,
    val type: String,
    val properties: Map<String, Any?> = emptyMap(),
    val style: Map<String, Any?> = emptyMap(),
    val children: List<ComponentConfig>? = null
)

data class ScreenConfig(
    val id: String,
    val name: String,
    val sections: Map<String, ComponentConfig>
)

data class IterationFrame(
    val alias: String,
    val item: Any?,
    val index: Int,
    val total: Int
)
```

### 3. Template Engine

```kotlin
object TemplateEngine {
    
    fun isBindingValue(value: Any?): Boolean {
        return value is Map<*, *> && value["reference"] is String
    }
    
    fun normalizeReference(reference: String?): String {
        if (reference.isNullOrBlank()) return ""
        return reference.removePrefix("\${").removeSuffix("}")
    }
    
    fun isTemplateString(str: String?): Boolean {
        if (str.isNullOrBlank()) return false
        
        val regex = Regex("""\$\{[^}]+\}""")
        val matches = regex.findAll(str).toList()
        
        if (matches.isEmpty()) return false
        
        if (matches.size == 1) {
            val cleaned = str.trim()
            val match = matches[0].value
            if (cleaned == match) return false
        }
        
        return true
    }
    
    fun processTemplateString(
        template: String,
        context: MutableMap<String, Any?>,
        iterationStack: List<IterationFrame> = emptyList()
    ): String {
        val extendedContext = context.toMutableMap()
        iterationStack.forEach { frame ->
            val alias = frame.alias
            extendedContext[alias] = frame.item
            extendedContext["${alias}Index"] = frame.index
            extendedContext["${alias}Total"] = frame.total
        }
        
        val regex = Regex("""\$\{([^}]+)\}""")
        
        return regex.replace(template) { matchResult ->
            val expression = matchResult.groupValues[1].trim()
            try {
                val result = ExpressionEvaluator.evaluate(expression, extendedContext)
                result?.toString() ?: ""
            } catch (e: Exception) {
                Log.w("TemplateEngine", "Failed to evaluate: $expression", e)
                matchResult.value
            }
        }
    }
    
    fun resolveBindingValue(
        value: Any?,
        context: Map<String, Any?>,
        fallback: Any? = null,
        iterationStack: List<IterationFrame> = emptyList()
    ): Any? {
        if (!isBindingValue(value)) {
            return value ?: fallback
        }
        
        val bindingValue = value as? Map<*, *> ?: return fallback
        val reference = bindingValue["reference"] as? String ?: return fallback
        
        if (isTemplateString(reference)) {
            return try {
                processTemplateString(reference, context.toMutableMap(), iterationStack)
            } catch (e: Exception) {
                Log.w("TemplateEngine", "Failed to process template string: $reference", e)
                fallback
            }
        }
        
        val normalized = normalizeReference(reference)
        val extendedContext = context.toMutableMap()
        
        iterationStack.forEach { frame ->
            val alias = frame.alias
            extendedContext[alias] = frame.item
            extendedContext["${alias}Index"] = frame.index
            extendedContext["${alias}Total"] = frame.total
        }
        
        try {
            val result = ExpressionEvaluator.evaluate(normalized, extendedContext)
            if (result != null) return result
        } catch (e: Exception) {
            // Ignore and try context lookup
        }
        
        val contextValue = getContextValue(extendedContext, normalized)
        return contextValue ?: fallback
    }
    
    fun getContextValue(context: Map<String, Any?>, path: String): Any? {
        if (path.isBlank()) return null
        
        val segments = path.split(".")
        var acc: Any? = context
        
        for (segment in segments) {
            when {
                acc == null || acc == "None" || acc == "null" -> return null
                acc !is Map<*, *> -> return null
            }
            
            acc = (acc as? Map<*, *>)?.get(segment)
        }
        
        return acc
    }
}
```

### 4. Expression Evaluator

```kotlin
object ExpressionEvaluator {
    
    fun evaluate(expression: String, context: Map<String, Any?>): Any? {
        return try {
            when {
                expression.contains("?") -> evaluateTernary(expression, context)
                expression.contains("===") -> evaluateEquals(expression, context)
                expression.contains("!==") -> evaluateNotEquals(expression, context)
                expression.contains(">=") -> evaluateGreaterOrEqual(expression, context)
                expression.contains("<=") -> evaluateLessOrEqual(expression, context)
                expression.contains(">") -> evaluateGreater(expression, context)
                expression.contains("<") -> evaluateLess(expression, context)
                expression.contains("&&") -> evaluateAnd(expression, context)
                expression.contains("||") -> evaluateOr(expression, context)
                expression.contains("+") -> evaluateAddition(expression, context)
                expression.contains("-") -> evaluateSubtraction(expression, context)
                expression.contains("*") -> evaluateMultiplication(expression, context)
                expression.contains("/") -> evaluateDivision(expression, context)
                expression.contains(".") -> evaluatePropertyAccess(expression, context)
                else -> context[expression]
            }
        } catch (e: Exception) {
            Log.w("ExpressionEvaluator", "Failed to evaluate: $expression", e)
            null
        }
    }
    
    private fun evaluateTernary(expression: String, context: Map<String, Any?>): Any? {
        val parts = expression.split("?")
        val condition = evaluate(parts[0].trim(), context) as? Boolean ?: false
        
        val branches = parts[1].split(":")
        return if (condition) {
            evaluate(branches[0].trim().removeSurrounding("\""), context)
        } else {
            evaluate(branches[1].trim().removeSurrounding("\""), context)
        }
    }
    
    // Реализуйте остальные операторы аналогично
    // ...
}
```

### 5. Style Parser

```kotlin
object StyleParser {
    
    fun parseStyle(style: Map<String, Any?>?): Modifier {
        var modifier = Modifier
        
        style?.forEach { (key, value) ->
            modifier = when (key) {
                "width" -> modifier.width(parseSize(value))
                "height" -> modifier.height(parseSize(value))
                "padding" -> modifier.padding(parseSize(value))
                "borderRadius" -> modifier.clip(RoundedCornerShape(parseSize(value)))
                "backgroundColor" -> modifier.background(parseColor(value))
                else -> modifier
            }
        }
        
        return modifier
    }
    
    fun parseSize(value: Any?): Dp {
        val str = value?.toString() ?: return 0.dp
        return str.removeSuffix("px").toIntOrNull()?.dp ?: 0.dp
    }
    
    fun parseColor(value: Any?): Color {
        val str = value?.toString() ?: return Color.Transparent
        return try {
            Color(android.graphics.Color.parseColor(str))
        } catch (e: Exception) {
            Color.Transparent
        }
    }
    
    fun parseFontSize(value: Any?): TextUnit {
        val str = value?.toString() ?: return 14.sp
        return str.removeSuffix("px").toIntOrNull()?.sp ?: 14.sp
    }
    
    fun parseFontWeight(value: Any?): FontWeight {
        val weight = (value as? Number)?.toInt() ?: 400
        return when (weight) {
            100 -> FontWeight.Thin
            200 -> FontWeight.ExtraLight
            300 -> FontWeight.Light
            400 -> FontWeight.Normal
            500 -> FontWeight.Medium
            600 -> FontWeight.SemiBold
            700 -> FontWeight.Bold
            800 -> FontWeight.ExtraBold
            900 -> FontWeight.Black
            else -> FontWeight.Normal
        }
    }
}
```

### 6. Screen Renderer

```kotlin
@Composable
fun ScreenRenderer(
    screenConfig: ScreenConfig,
    context: Map<String, Any?>,
    onEvent: (String, Map<String, Any?>) -> Unit
) {
    Column(modifier = Modifier.fillMaxSize()) {
        screenConfig.sections["header"]?.let { header ->
            RenderComponent(header, context, onEvent)
        }
        
        screenConfig.sections["body"]?.let { body ->
            RenderComponent(
                component = body,
                context = context,
                onEvent = onEvent,
                modifier = Modifier.weight(1f)
            )
        }
        
        screenConfig.sections["footer"]?.let { footer ->
            RenderComponent(footer, context, onEvent)
        }
    }
}
```

---

## ✅ Чеклист миграции

### Фаза 1: Подготовка
- [ ] Настроить JSON парсинг (Gson/Kotlinx.serialization)
- [ ] Создать data models (ComponentConfig, ScreenConfig, etc.)
- [ ] Настроить систему логирования

### Фаза 2: Template Engine
- [ ] Реализовать `isBindingValue()`
- [ ] Реализовать `normalizeReference()`
- [ ] Реализовать `isTemplateString()` ⭐
- [ ] Реализовать `processTemplateString()` ⭐
- [ ] Реализовать `getContextValue()`
- [ ] Реализовать `resolveBindingValue()` ⭐

### Фаза 3: Expression Evaluator
- [ ] Выбрать библиотеку (EvalEx, JEval) или написать свою
- [ ] Поддержка арифметических операторов
- [ ] Поддержка операторов сравнения
- [ ] Поддержка логических операторов
- [ ] Поддержка тернарного оператора
- [ ] Поддержка доступа к свойствам

### Фаза 4: UI Components
- [ ] TextComponent
- [ ] ButtonComponent
- [ ] CardComponent
- [ ] ImageComponent (AsyncImage/Coil)
- [ ] ListComponent
- [ ] ConditionalComponent
- [ ] Row/Column Containers

### Фаза 5: Renderer
- [ ] ScreenRenderer с секциями
- [ ] Component Switch (when)
- [ ] Iteration Stack для списков
- [ ] Event handling system

### Фаза 6: Style Parser
- [ ] parseStyle() для Modifier
- [ ] parseColor()
- [ ] parseFontSize()
- [ ] parseFontWeight()
- [ ] parseSize() (dp conversion)

### Фаза 7: Testing
- [ ] Unit тесты для TemplateEngine
- [ ] Unit тесты для ExpressionEvaluator
- [ ] Integration тесты для Renderer
- [ ] UI тесты для компонентов

### Фаза 8: Оптимизация
- [ ] Кеширование скомпилированных выражений
- [ ] LazyColumn для списков
- [ ] remember/derivedStateOf для биндингов
- [ ] Профилирование производительности

---

## 📊 Сравнение React vs Kotlin Compose

| Аспект | React | Kotlin Compose |
|--------|-------|----------------|
| Мемоизация | `React.memo()` | `remember`, `derivedStateOf` |
| Списки | `.map()` | `items()`, `forEach` |
| Условный рендер | `condition && <Component/>` | `if (condition) { }` |
| События | `onClick={() => {}}` | `onClick = {}` |
| Стили | CSS-in-JS / style prop | Modifier chain |
| Состояние | `useState()` | `mutableStateOf()` |
| Эффекты | `useEffect()` | `LaunchedEffect()` |

---

## 🔗 Полезные ссылки

### Kotlin Compose
- [Jetpack Compose Basics](https://developer.android.com/jetpack/compose/tutorial)
- [Compose Modifiers](https://developer.android.com/jetpack/compose/modifiers)
- [State Management](https://developer.android.com/jetpack/compose/state)

### Expression Evaluation
- [EvalEx Library](https://github.com/ezylang/EvalEx)
- [JEval Library](https://github.com/metadatacenter/jeval)

### JSON Parsing
- [Kotlinx Serialization](https://github.com/Kotlin/kotlinx.serialization)
- [Gson](https://github.com/google/gson)

### Image Loading
- [Coil for Compose](https://coil-kt.github.io/coil/compose/)

---

## 🎓 Заключение

Этот движок реализует полноценную систему data-driven UI с поддержкой:

✅ **Простых биндингов** — прямая подстановка значений  
✅ **Шаблонных строк** — интерполяция с текстом  
✅ **JavaScript выражений** — арифметика, логика, сравнения  
✅ **Тернарных операторов** — условная логика  
✅ **Вложенных списков** — iteration stack  
✅ **Условного рендеринга** — динамические UI  
✅ **Event handling** — интерактивность  
✅ **Dynamic styling** — адаптивный дизайн  

Ключевая сложность при портировании — это **Expression Evaluator**, так как в Kotlin нет встроенного `eval()`. Рекомендуется использовать библиотеку **EvalEx** для максимальной совместимости с текущим движком.

Все тесты проходят: **10/10** ✅

---

**Автор:** GitHub Copilot  
**Дата:** 19 октября 2025 г.  
**Версия документа:** 1.0
