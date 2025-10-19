# 🔧 Bottom Sheet: Исправление контейнера и размеров

## Проблема v2

После первого исправления Bottom Sheet появилась новая проблема:
- ❌ Bottom Sheet растягивался на весь экран
- ❌ Контент формы выходил за границы экрана
- ❌ Backdrop и контейнер не разделялись правильно

## Причина

```json
// БЫЛО:
"style": {
  "alignItems": "stretch"  // ← Растягивал контейнер на всю ширину
}

// bottomsheet-container:
"style": {
  // Нет ограничений по размеру!
}

// backdrop:
"style": {
  "flex": "1"
  // Нет width: "100%"
}
```

**Проблема:** 
- `alignItems: "stretch"` растягивал контейнер
- Отсутствие `maxHeight` позволяло контенту расти бесконечно
- Backdrop не занимал всю ширину

## Решение

### 1. JSON: Правильные размеры и ограничения

```json
{
  "overlay": {
    "style": {
      "flexDirection": "column",
      "justifyContent": "flex-end",
      "alignItems": "center"  // ← center вместо stretch
    },
    "children": [
      {
        "id": "bottomsheet-backdrop",
        "style": {
          "flex": "1",
          "width": "100%",        // ← Добавлено: на всю ширину
          "cursor": "pointer"
        }
      },
      {
        "id": "bottomsheet-container",
        "style": {
          "width": "100%",        // ← Добавлено: на всю ширину
          "maxHeight": "80vh",    // ← Добавлено: максимум 80% экрана
          "flexShrink": "0",      // ← Добавлено: не сжиматься
          "overflow": "auto"      // ← Добавлено: прокрутка если много контента
        }
      }
    ]
  }
}
```

### 2. CSS: Дополнительная защита

```css
.sandbox-screen {
  position: relative;
  isolation: isolate;
  overflow: hidden;  /* ← Добавлено: предотвращает выход контента */
}

.sandbox-section[data-slot="overlay"] {
  /* ... existing styles ... */
  overflow: hidden;  /* ← Добавлено */
}

/* Дочерние элементы не выходят за границы */
.sandbox-section[data-slot="overlay"] > * {
  max-width: 100%;
  max-height: 100%;
  box-sizing: border-box;
}
```

## Как это работает

### Структура с правильными размерами

```
┌───────────────────────────────────────┐
│  overlay (fixed, 100vw × 100vh)       │
│  ┌─────────────────────────────────┐  │
│  │  backdrop                        │  │
│  │  flex: 1, width: 100%           │  │
│  │  ← Занимает все оставшееся      │  │
│  │     пространство сверху          │  │
│  └─────────────────────────────────┘  │
│  ┌─────────────────────────────────┐  │
│  │  bottomsheet-container           │  │
│  │  width: 100%, maxHeight: 80vh   │  │
│  │  flexShrink: 0, overflow: auto  │  │
│  │                                  │  │
│  │  [Форма с прокруткой]            │  │
│  └─────────────────────────────────┘  │
└───────────────────────────────────────┘
        ↑                      ↑
   justifyContent      Не больше 80%
    flex-end              экрана
```

### Ключевые изменения

| Свойство | Было | Стало | Зачем |
|----------|------|-------|-------|
| `alignItems` | `stretch` | `center` | Не растягивать контейнер |
| `backdrop.width` | - | `100%` | Занять всю ширину |
| `container.width` | - | `100%` | Занять всю ширину |
| `container.maxHeight` | - | `80vh` | Ограничить высоту |
| `container.flexShrink` | - | `0` | Не сжиматься |
| `container.overflow` | - | `auto` | Прокрутка при переполнении |
| `screen.overflow` | - | `hidden` | Не выходить за границы |
| `overlay.overflow` | - | `hidden` | Не выходить за границы |

## Преимущества

### ✅ Правильные размеры
```css
/* Контейнер занимает всю ширину, но... */
width: 100%

/* ...не больше 80% высоты экрана */
maxHeight: 80vh

/* Если контента много - появляется прокрутка */
overflow: auto
```

### ✅ Backdrop занимает оставшееся пространство
```css
/* Backdrop растягивается и заполняет верх */
flex: 1
width: 100%

/* Container прижат к низу и не растягивается */
flexShrink: 0
```

### ✅ Защита на уровне CSS
```css
/* Экран не позволяет контенту выйти за границы */
.sandbox-screen {
  overflow: hidden;
}

/* Overlay также защищён */
.sandbox-section[data-slot="overlay"] {
  overflow: hidden;
}

/* Все дочерние элементы ограничены */
.sandbox-section[data-slot="overlay"] > * {
  max-width: 100%;
  max-height: 100%;
}
```

## Визуальная схема

### До исправления (v2.0)
```
┌─────────────────────┐
│ overlay             │
│ ┌─────────────────┐ │
│ │ backdrop УЗКИЙ  │ │
│ └─────────────────┘ │
│ ┌─────────────────┐ │
│ │ container       │ │
│ │ РАСТЯНУТ НА     │ │
│ │ ВЕСЬ ЭКРАН      │ │
│ │                 │ │
│ │                 │ │  ← Выходит за границы!
│ │                 │ │
└─┴─────────────────┴─┘
```

### После исправления (v2.1)
```
┌─────────────────────┐
│ overlay             │
│ ┌─────────────────┐ │
│ │ backdrop        │ │
│ │ 100% width      │ │
│ │ flex: 1         │ │
│ └─────────────────┘ │
│ ┌─────────────────┐ │
│ │ container       │ │
│ │ 100% width      │ │
│ │ max 80vh        │ │
│ └─────────────────┘ │
└─────────────────────┘
   ↑               ↑
   Всё внутри   Не выходит
   границ       за пределы
```

## Тестирование

### ✅ Тест 1: Размеры backdrop
1. Открыть Bottom Sheet
2. **Проверка:** Backdrop занимает всю ширину и верхнюю часть экрана
3. **Клик:** Клик в любом месте backdrop закрывает BS

### ✅ Тест 2: Размеры контейнера
1. Открыть Bottom Sheet
2. **Проверка:** 
   - Контейнер на всю ширину экрана
   - Максимум 80% высоты
   - Закругление только сверху

### ✅ Тест 3: Прокрутка контента
1. Открыть Bottom Sheet
2. **Если контента много:** Появляется прокрутка внутри контейнера
3. **Проверка:** Контейнер не растягивается за границы экрана

### ✅ Тест 4: Позиционирование
1. Открыть Bottom Sheet
2. **Проверка:**
   - Контейнер прижат к низу
   - Backdrop сверху
   - Всё содержимое внутри viewport

## Debug checklist

Если контент всё ещё выходит за границы:

### 1. DevTools: Проверить размеры overlay
```css
position: absolute;
width: 100%;
height: 100%;
overflow: hidden;  /* Должен быть! */
```

### 2. DevTools: Проверить backdrop
```css
flex: 1;
width: 100%;  /* Должен быть! */
```

### 3. DevTools: Проверить container
```css
width: 100%;       /* Должен быть! */
max-height: 80vh;  /* Должен быть! */
flex-shrink: 0;    /* Должен быть! */
overflow: auto;    /* Должен быть! */
```

### 4. Console: Проверить размеры
```javascript
// В DevTools Console:
const overlay = document.querySelector('[data-slot="overlay"]');
console.log('Overlay:', {
  width: overlay.offsetWidth,
  height: overlay.offsetHeight
});

const container = document.querySelector('#bottomsheet-container');
console.log('Container:', {
  width: container.offsetWidth,
  height: container.offsetHeight,
  maxHeight: getComputedStyle(container).maxHeight
});
```

## Измененные файлы

### `/src/pages/Sandbox/data/avitoDemo.json`
```json
{
  "overlay": {
    "style": {
      "alignItems": "center"  // ← Изменено с "stretch"
    },
    "children": [
      {
        "id": "bottomsheet-backdrop",
        "style": {
          "width": "100%"  // ← Добавлено
        }
      },
      {
        "id": "bottomsheet-container",
        "style": {
          "width": "100%",        // ← Добавлено
          "maxHeight": "80vh",    // ← Добавлено
          "flexShrink": "0",      // ← Добавлено
          "overflow": "auto"      // ← Добавлено
        }
      }
    ]
  }
}
```

### `/src/pages/Sandbox/SandboxPage.css`
```css
.sandbox-screen {
  overflow: hidden;  /* ← Добавлено */
}

.sandbox-section[data-slot="overlay"] {
  overflow: hidden;  /* ← Добавлено */
}

/* ← Добавлено новое правило */
.sandbox-section[data-slot="overlay"] > * {
  max-width: 100%;
  max-height: 100%;
  box-sizing: border-box;
}
```

## Связанные документы

- 📄 **v1.0 (видимость):** `/docs/bottomsheet-display-fix.md`
- 📄 **v2.1 (размеры — этот документ):** `/docs/bottomsheet-container-fix.md`
- 📄 **v2.2 (позиционирование обновлено):** `/docs/bottomsheet-position-fix.md`
- 📄 **Логика:** `/docs/bottomsheet-logic.md`

---

**Дата исправления:** 19 октября 2025  
**Версия:** 2.1.0  
**Статус:** ✅ Исправлено - контейнер с правильными размерами
