# ADR-002: Analytics Implementation with localStorage

**Status:** Accepted  
**Date:** 2025-09-30  
**Authors:** BDUI Team  
**Deciders:** Technical Lead, Product Owner

---

## Context

BDUI платформа требует системы аналитики для:
- Отслеживания пользовательских взаимодействий в Sandbox (просмотры экранов, клики, длительность)
- Визуализации метрик для оценки UX продуктов
- Предоставления данных для A/B тестирования (будущая фича)
- Мониторинга производительности и bottlenecks

### Требования

**Функциональные:**
1. Сбор событий: SCREEN_VIEW, UI_CLICK, INTERACTION_TIME, SESSION_START
2. Dashboard с визуализацией метрик (timeline, screen stats, click stats)
3. Persistence событий между сеансами
4. Session management с TTL (автоочистка устаревших данных)
5. Интеграция в Sandbox без изменения бизнес-логики

**Нефункциональные:**
1. Производительность: накладные расходы на tracking < 5ms
2. Privacy: хранение данных только локально (без сервера)
3. Масштабируемость: поддержка 10K+ событий без деградации UI
4. Отказоустойчивость: graceful degradation при недоступности localStorage

---

## Decision

Выбрана архитектура **localStorage + React Context** для аналитики.

> **Примечание:** Client Session ID (для Client Workflow API) использует **in-memory storage** и обновляется при каждом F5. Это отдельная система от аналитики.

### Архитектура

```javascript
// src/services/analytics/

analytics/
├── constants.js              // Event types, storage key
├── analyticsStore.js         // AnalyticsStore class (core logic)
├── AnalyticsContext.js       // React Context + EMPTY_ANALYTICS fallback
├── AnalyticsProvider.jsx     // React provider with tracking methods
├── useAnalytics.js           // Hooks: useAnalytics, useAnalyticsOptional
├── analyticsSelectors.js     // buildAnalyticsSummary aggregation
└── index.js                  // Barrel export
```

### Компоненты системы

**1. AnalyticsStore (analyticsStore.js)**

```javascript
class AnalyticsStore {
  constructor() {
    this.events = [];
    this.activeTimers = new Map();
    this.sessionId = this._generateSessionId();
    this.listeners = new Set();
    this._loadFromStorage();
    this._cleanupExpiredSessions();
  }

  logEvent(type, payload, meta = {}) {
    const event = {
      id: crypto.randomUUID(),
      type,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      ...payload,
      ...meta
    };
    this.events.push(event);
    this._saveToStorage();
    this._notifyListeners();
  }

  startTimer(key, payload) {
    this.activeTimers.set(key, { startTime: Date.now(), payload });
  }

  stopTimer(key, extraPayload = {}) {
    const timer = this.activeTimers.get(key);
    if (!timer) return null;
    
    const duration = Date.now() - timer.startTime;
    this.logEvent(AnalyticsEventType.INTERACTION_TIME, {
      ...timer.payload,
      ...extraPayload,
      duration
    });
    
    this.activeTimers.delete(key);
    return duration;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
```

**2. AnalyticsProvider (AnalyticsProvider.jsx)**

```javascript
export const AnalyticsProvider = ({ children }) => {
  const [store] = useState(() => new AnalyticsStore());
  const [, forceUpdate] = useReducer(x => x + 1, 0);

  useEffect(() => {
    const unsubscribe = store.subscribe(() => forceUpdate());
    return unsubscribe;
  }, [store]);

  const trackScreenView = useCallback((payload) => {
    const timerKey = `screen-${payload.screenId}`;
    store.startTimer(timerKey, payload);
    store.logEvent(AnalyticsEventType.SCREEN_VIEW, payload);
  }, [store]);

  const trackClick = useCallback((payload) => {
    store.logEvent(AnalyticsEventType.UI_CLICK, payload);
  }, [store]);

  const finalizeScreenTiming = useCallback((reason) => {
    // Stop all active screen timers
    for (const [key] of store.activeTimers) {
      if (key.startsWith('screen-')) {
        store.stopTimer(key, { reason });
      }
    }
  }, [store]);

  const value = useMemo(() => ({
    events: store.events,
    trackScreenView,
    trackClick,
    finalizeScreenTiming,
    clearAnalytics: () => store.clear()
  }), [store, trackScreenView, trackClick, finalizeScreenTiming]);

  return (
    <AnalyticsContext.Provider value={value}>
      {children}
    </AnalyticsContext.Provider>
  );
};
```

**3. Integration в Sandbox**

```javascript
// SandboxPage.jsx
const { trackScreenView, finalizeScreenTiming } = useAnalytics();

useEffect(() => {
  if (currentScreen) {
    trackScreenView({
      screenId: currentScreen.id,
      screenName: currentScreen.name,
      nodeId: currentNode?.id,
      productId: productData?.id
    });
  }

  return () => {
    finalizeScreenTiming('screen_effect_cleanup');
  };
}, [currentScreen?.id]);

// SandboxScreenRenderer.jsx
const { trackClick } = useAnalyticsOptional();  // Safe for Storybook

const handleButtonClick = (component) => {
  trackClick({
    componentId: component.id,
    componentType: component.type,
    screenId: currentScreen?.id,
    label: resolveProp(component.properties.text),
    eventName: component.properties.event
  });
  
  // Business logic...
};
```

**4. Analytics Dashboard**

```javascript
// src/pages/Analytics/AnalyticsDashboard.jsx
import { useAnalytics } from '@/services/analytics';
import { buildAnalyticsSummary } from '@/services/analytics/analyticsSelectors';
import { LineChart, BarChart, ResponsiveContainer } from 'recharts';

export const AnalyticsDashboard = () => {
  const { events } = useAnalytics();
  const summary = useMemo(() => buildAnalyticsSummary(events), [events]);

  return (
    <>
      {/* Summary Cards */}
      <div className="summary-grid">
        <SummaryCard title="Просмотров экранов" value={summary.totals.screenViews} />
        <SummaryCard title="Кликов" value={summary.totals.clicks} />
        <SummaryCard title="Уникальных экранов" value={summary.totals.uniqueScreens} />
        <SummaryCard title="Средняя длительность" value={`${summary.totals.avgDuration}s`} />
      </div>

      {/* Timeline Chart */}
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={summary.timelineSeries}>
          <Line type="monotone" dataKey="screenViews" stroke="#8b5cf6" />
          <Line type="monotone" dataKey="clicks" stroke="#3b82f6" />
        </LineChart>
      </ResponsiveContainer>

      {/* Screen Stats */}
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={summary.screenSeries}>
          <Bar dataKey="views" fill="#8b5cf6" />
        </BarChart>
      </ResponsiveContainer>
    </>
  );
};
```

---

## Consequences

### Преимущества

✅ **Privacy-first:** Данные хранятся только локально, не отправляются на сервер  
✅ **Zero-config:** Работает из коробки без настройки бэкенда  
✅ **Performance:** localStorage операции < 5ms, не блокируют UI  
✅ **Persistence:** События сохраняются между сеансами  
✅ **Graceful Degradation:** useAnalyticsOptional() для компонентов вне provider  
✅ **Testability:** AnalyticsStore — изолированный класс без React dependencies

### Недостатки

⚠️ **Storage Limit:** localStorage ограничен 5-10MB (решается автоочисткой устаревших событий)  
⚠️ **No Server Analytics:** Невозможен централизованный анализ данных от всех пользователей  
⚠️ **Browser-specific:** Данные не синхронизируются между браузерами/устройствами  
⚠️ **Privacy:** Пользователь может очистить localStorage, потеряв историю

### Mitigations

**Storage Limit:**
- TTL = 6 часов для автоматической очистки (SESSION_TTL_MS)
- Метод `_cleanupExpiredSessions()` удаляет события старше TTL при инициализации
- Лимит 10K событий с ротацией FIFO (будущая фича)

**No Server Analytics:**
- Экспорт событий через `window.localStorage.getItem('bdui.analytics.events')`
- Будущая фича: отправка батчей событий на опциональный analytics backend (Priority 2)

**Browser-specific:**
- Документировать в UI: "Analytics data is stored locally in this browser"
- Будущая фича: экспорт/импорт событий через JSON

---

## Alternatives Considered

### 1. Google Analytics / Mixpanel

**Pros:**
- Готовая инфраструктура с dashboards
- Централизованный сбор данных от всех пользователей
- Advanced features (funnels, cohorts, retention)

**Cons:**
- Privacy concerns (данные отправляются на сторонние серверы)
- Требует согласия пользователя (GDPR/cookie consent)
- Платная подписка для Mixpanel
- Network dependency (не работает offline)

**Вердикт:** Отклонено из-за privacy concerns и complexity

### 2. IndexedDB

**Pros:**
- Больший лимит хранения (50MB+)
- Асинхронные операции (не блокируют main thread)
- Поддержка индексов для быстрых запросов

**Cons:**
- Сложнее API vs localStorage
- Требует полифилла для старых браузеров
- Overkill для простых событий (JSON serializable)

**Вердикт:** Рассмотреть для v2.0 при превышении 5MB лимита

### 3. In-Memory Store (без persistence)

**Pros:**
- Максимальная производительность
- Нет ограничений по размеру хранилища

**Cons:**
- Потеря данных при перезагрузке страницы
- Невозможен анализ исторических данных
- Не подходит для long-term monitoring

**Вердикт:** Отклонено из-за отсутствия persistence

### 4. Server-side Analytics (Custom Backend)

**Pros:**
- Централизованный сбор данных
- Неограниченное хранилище
- Advanced analytics с SQL queries

**Cons:**
- Требует разработки и поддержки backend
- Privacy concerns (отправка данных на сервер)
- Network dependency
- Infrastracture costs

**Вердикт:** Отклонено для MVP, рассмотреть для Priority 2 (A/B testing)

---

## Decision Drivers

| Критерий | Вес | localStorage | GA/Mixpanel | IndexedDB | Server-side |
|----------|-----|--------------|-------------|-----------|-------------|
| Privacy | 🔥 | ✅ 5/5 | ❌ 1/5 | ✅ 5/5 | ⚠️ 2/5 |
| Простота внедрения | 🔥 | ✅ 5/5 | ✅ 4/5 | ⚠️ 2/5 | ❌ 1/5 |
| Performance | 🔥 | ✅ 4/5 | ⚠️ 3/5 | ✅ 5/5 | ⚠️ 3/5 |
| Persistence | 🔥 | ✅ 4/5 | ✅ 5/5 | ✅ 5/5 | ✅ 5/5 |
| Storage Capacity | 🟡 | ⚠️ 3/5 | ✅ 5/5 | ✅ 5/5 | ✅ 5/5 |
| Offline Support | 🟡 | ✅ 5/5 | ❌ 1/5 | ✅ 5/5 | ❌ 1/5 |
| Infrastructure Cost | 🟡 | ✅ 5/5 | ⚠️ 3/5 | ✅ 5/5 | ❌ 1/5 |

**Итого:** localStorage выигрывает по всем критическим параметрам для MVP.

---

## Implementation Notes

### Event Schema

```typescript
interface AnalyticsEvent {
  id: string;              // UUID v4
  type: AnalyticsEventType;
  timestamp: number;       // Unix timestamp (ms)
  sessionId: string;       // Session UUID
  
  // Type-specific payload
  screenId?: string;
  screenName?: string;
  nodeId?: string;
  productId?: string;
  componentId?: string;
  componentType?: string;
  label?: string;
  eventName?: string;
  duration?: number;
  reason?: string;
}
```

### Storage Format

```json
{
  "events": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "type": "SCREEN_VIEW",
      "timestamp": 1727712896789,
      "sessionId": "abc123",
      "screenId": "screen-cart-main",
      "screenName": "Корзина",
      "nodeId": "cart-main",
      "productId": "avito-cart-demo"
    },
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "type": "UI_CLICK",
      "timestamp": 1727712897123,
      "sessionId": "abc123",
      "componentId": "button-checkout",
      "componentType": "button",
      "screenId": "screen-cart-main",
      "label": "Оформить доставку",
      "eventName": "checkout"
    }
  ],
  "sessionId": "abc123",
  "lastUpdated": 1727712897123
}
```

### Session Management

```javascript
class AnalyticsStore {
  _generateSessionId() {
    const existingSession = this._loadSessionId();
    const now = Date.now();
    
    if (existingSession && (now - existingSession.timestamp) < SESSION_TTL_MS) {
      return existingSession.id;  // Reuse session
    }
    
    const newSessionId = crypto.randomUUID();
    localStorage.setItem(ANALYTICS_SESSION_KEY, JSON.stringify({
      id: newSessionId,
      timestamp: now
    }));
    
    this.logEvent(AnalyticsEventType.SESSION_START, { sessionId: newSessionId });
    return newSessionId;
  }

  _cleanupExpiredSessions() {
    const cutoff = Date.now() - SESSION_TTL_MS;
    this.events = this.events.filter(event => event.timestamp >= cutoff);
    this._saveToStorage();
  }
}
```

### Aggregation Logic

```javascript
export const buildAnalyticsSummary = (events, options = {}) => {
  const { timelineBucketMs = 60000 } = options;  // 1 minute buckets

  const screenViews = events.filter(e => e.type === AnalyticsEventType.SCREEN_VIEW);
  const clicks = events.filter(e => e.type === AnalyticsEventType.UI_CLICK);
  const durations = events.filter(e => e.type === AnalyticsEventType.INTERACTION_TIME);

  // Screen series (grouped by screenId)
  const screenSeries = Object.entries(
    screenViews.reduce((acc, event) => {
      const key = event.screenId;
      acc[key] = acc[key] || { screenId: key, screenName: event.screenName, views: 0 };
      acc[key].views++;
      return acc;
    }, {})
  ).map(([, data]) => data).sort((a, b) => b.views - a.views);

  // Click series (grouped by componentType)
  const clickSeries = Object.entries(
    clicks.reduce((acc, event) => {
      const key = event.componentType;
      acc[key] = acc[key] || { componentType: key, clicks: 0 };
      acc[key].clicks++;
      return acc;
    }, {})
  ).map(([, data]) => data).sort((a, b) => b.clicks - a.clicks);

  // Timeline series (buckets by time)
  const timelineSeries = events.reduce((acc, event) => {
    const bucketTime = Math.floor(event.timestamp / timelineBucketMs) * timelineBucketMs;
    const bucket = acc.find(b => b.timestamp === bucketTime) || { timestamp: bucketTime, screenViews: 0, clicks: 0 };
    
    if (event.type === AnalyticsEventType.SCREEN_VIEW) bucket.screenViews++;
    if (event.type === AnalyticsEventType.UI_CLICK) bucket.clicks++;
    
    if (!acc.includes(bucket)) acc.push(bucket);
    return acc;
  }, []).sort((a, b) => a.timestamp - b.timestamp);

  // Totals
  const avgDuration = durations.length > 0
    ? Math.round(durations.reduce((sum, e) => sum + e.duration, 0) / durations.length / 1000)
    : 0;

  return {
    screenSeries,
    clickSeries,
    timelineSeries,
    totals: {
      screenViews: screenViews.length,
      clicks: clicks.length,
      uniqueScreens: new Set(screenViews.map(e => e.screenId)).size,
      avgDuration
    }
  };
};
```

---

## Testing Strategy

### Unit Tests

```javascript
// src/services/analytics/__tests__/analyticsStore.test.js

describe('AnalyticsStore', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('logs event and persists to localStorage', () => {
    const store = new AnalyticsStore();
    store.logEvent(AnalyticsEventType.SCREEN_VIEW, { screenId: 'test' });
    
    expect(store.events).toHaveLength(1);
    expect(store.events[0].type).toBe(AnalyticsEventType.SCREEN_VIEW);
    
    const stored = JSON.parse(localStorage.getItem(ANALYTICS_STORAGE_KEY));
    expect(stored.events).toHaveLength(1);
  });

  test('timer tracks duration', () => {
    const store = new AnalyticsStore();
    store.startTimer('screen-1', { screenId: 'test' });
    
    // Simulate 1 second
    jest.advanceTimersByTime(1000);
    
    const duration = store.stopTimer('screen-1');
    expect(duration).toBeGreaterThanOrEqual(1000);
    expect(store.events).toHaveLength(1);
    expect(store.events[0].duration).toBeGreaterThanOrEqual(1000);
  });

  test('cleanup removes expired events', () => {
    const store = new AnalyticsStore();
    
    // Add old event
    store.events.push({
      id: '1',
      type: AnalyticsEventType.SCREEN_VIEW,
      timestamp: Date.now() - SESSION_TTL_MS - 1000  // Expired
    });
    
    // Add fresh event
    store.logEvent(AnalyticsEventType.SCREEN_VIEW, { screenId: 'fresh' });
    
    store._cleanupExpiredSessions();
    expect(store.events).toHaveLength(1);
    expect(store.events[0].screenId).toBe('fresh');
  });
});
```

### Integration Tests

```javascript
// src/pages/Analytics/__tests__/AnalyticsDashboard.test.jsx

test('renders summary cards with correct metrics', () => {
  const mockEvents = [
    { type: AnalyticsEventType.SCREEN_VIEW, timestamp: Date.now(), screenId: 's1' },
    { type: AnalyticsEventType.SCREEN_VIEW, timestamp: Date.now(), screenId: 's2' },
    { type: AnalyticsEventType.UI_CLICK, timestamp: Date.now(), componentId: 'btn1' }
  ];

  render(
    <AnalyticsProvider>
      <MockAnalyticsData events={mockEvents} />
      <AnalyticsDashboard />
    </AnalyticsProvider>
  );

  expect(screen.getByText('2')).toBeInTheDocument();  // Screen views
  expect(screen.getByText('1')).toBeInTheDocument();  // Clicks
});
```

---

## Future Enhancements

**v1.1 (Priority 2):**
- Экспорт событий в CSV/JSON
- Опциональная отправка батчей на аналитический бэкенд
- Фильтры по датам и продуктам в Dashboard

**v1.2 (Priority 3):**
- Real-time analytics с WebSocket для мультиюзерных сценариев
- Heatmaps для кликов на canvas
- Funnel analysis для conversion tracking

**v2.0:**
- Migration на IndexedDB для больших объёмов данных
- Machine learning insights (аномалии, рекомендации)
- Integration с A/B testing framework

---

## References

- [localStorage MDN](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)
- [Recharts Documentation](https://recharts.org/)
- [React Context Best Practices](https://react.dev/learn/passing-data-deeply-with-context)
- BDUI Repository: `src/services/analytics/`
- Analytics Dashboard: `/analytics` route

---

## Appendix: Privacy & GDPR Compliance

**Current implementation:**
- ✅ No personal data collected (только screenId, componentId, timestamps)
- ✅ Data stored locally (не отправляется на сервер)
- ✅ No third-party cookies
- ✅ User can clear data via browser localStorage

**For production:**
- 🔶 Add "Clear Analytics Data" button in UI
- 🔶 Disclosure в Privacy Policy: "We collect anonymous usage data locally in your browser"
- 🔶 Opt-out mechanism (localStorage flag: `bdui.analytics.disabled`)

**Code example:**
```javascript
const { clearAnalytics } = useAnalytics();

<button onClick={clearAnalytics}>
  Clear Analytics Data
</button>
```
