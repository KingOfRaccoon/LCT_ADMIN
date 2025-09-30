import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { AnalyticsStore } from './analyticsStore';
import { AnalyticsEventType } from './constants';
import { AnalyticsContext } from './AnalyticsContext.js';

/**
 * Provider, отвечающий за сбор и распространение аналитических событий по всему приложению.
 * Все события буферизуются в памяти и синхронизируются с localStorage для сохранения сессии между перезагрузками.
 * @param {{ children: import('react').ReactNode }} props
 */
export const AnalyticsProvider = ({ children }) => {
  const storeRef = useRef(null);
  if (!storeRef.current) {
    storeRef.current = new AnalyticsStore();
  }
  const store = storeRef.current;

  const [events, setEvents] = useState(() => store.getEvents());
  const activeScreenRef = useRef(null);

  useEffect(() => {
    const unsubscribe = store.subscribe((nextEvents) => {
      setEvents(nextEvents);
    });
    return unsubscribe;
  }, [store]);

  /**
   * Завершает активный таймер экрана и фиксирует длительность взаимодействия.
   * @param {string} reason
   * @returns {Object|null}
   */
  const stopActiveScreenTimer = useCallback((reason = 'navigation') => {
    const active = activeScreenRef.current;
    if (!active) {
      return null;
    }
    const result = store.stopTimer(active.key, { reason });
    activeScreenRef.current = null;
    return result;
  }, [store]);

  /**
   * Записывает просмотр экрана и запускает таймер длительности.
   * @param {{ screenId?: string|null, screenName?: string|null, nodeId?: string|null, productId?: string|null }} payload
   * @returns {Object|null}
   */
  const trackScreenView = useCallback((payload) => {
    if (!payload) {
      return null;
    }
    const normalized = {
      screenId: payload.screenId ?? null,
      screenName: payload.screenName ?? payload.screenId ?? 'unknown-screen',
      nodeId: payload.nodeId ?? null,
      productId: payload.productId ?? null
    };

    stopActiveScreenTimer('screen_change');
    const viewEvent = store.logEvent(AnalyticsEventType.SCREEN_VIEW, normalized);

    const timerKey = `screen:${normalized.nodeId || normalized.screenId || uuidv4()}`;
    store.startTimer(timerKey, normalized);
    activeScreenRef.current = { key: timerKey, payload: normalized };

    return viewEvent;
  }, [stopActiveScreenTimer, store]);

  /**
   * Ручное завершение отслеживания длительности экрана.
   * @param {string} reason
   * @returns {Object|null}
   */
  const finalizeScreenTiming = useCallback((reason = 'cleanup') => {
    return stopActiveScreenTimer(reason);
  }, [stopActiveScreenTimer]);

  /**
   * Логирование клика по компоненту на экране.
   * @param {{ componentId?: string|null, componentType?: string|null, screenId?: string|null, screenName?: string|null, label?: string|null, eventName?: string|null }} payload
   * @returns {Object|null}
   */
  const trackClick = useCallback((payload) => {
    if (!payload) {
      return null;
    }
    const normalized = {
      componentId: payload.componentId ?? null,
      componentType: payload.componentType ?? 'unknown',
      screenId: payload.screenId ?? null,
      screenName: payload.screenName ?? null,
      label: payload.label ?? null,
      eventName: payload.eventName ?? null
    };
    return store.logEvent(AnalyticsEventType.UI_CLICK, normalized);
  }, [store]);

  /**
   * Низкоуровневый доступ к логированию произвольных событий.
   * @param {string} type
   * @param {Object} payload
   * @param {Object} meta
   */
  const logEvent = useCallback((type, payload, meta) => {
    return store.logEvent(type, payload, meta);
  }, [store]);

  /**
   * Полностью очищает историю аналитики.
   */
  const clearEvents = useCallback(() => {
    activeScreenRef.current = null;
    store.clear();
  }, [store]);

  const contextValue = useMemo(() => ({
    events,
    trackScreenView,
    finalizeScreenTiming,
    trackClick,
    logEvent,
    clearEvents,
    sessionId: store.sessionId,
    sessionStartedAt: store.sessionStartedAt
  }), [clearEvents, events, finalizeScreenTiming, logEvent, store.sessionId, store.sessionStartedAt, trackClick, trackScreenView]);

  return (
    <AnalyticsContext.Provider value={contextValue}>
      {children}
    </AnalyticsContext.Provider>
  );
};
