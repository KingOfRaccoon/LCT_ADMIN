import { v4 as uuidv4 } from 'uuid';
import { ANALYTICS_STORAGE_KEY, AnalyticsEventType, DEFAULT_SESSION_TTL_MS } from './constants';

const getNow = () => Date.now();
const getIsoTimestamp = () => new Date().toISOString();

const canUseStorage = () => {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return false;
  }
  try {
    const testKey = '__analytics_test__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    return true;
  } catch (error) {
    console.warn('[AnalyticsStore] localStorage недоступен:', error);
    return false;
  }
};

/**
 * Centralized storage for analytics events. Handles persistence, session lifecycle and timers.
 */
export class AnalyticsStore {
  constructor({ storageKey = ANALYTICS_STORAGE_KEY, sessionTtl = DEFAULT_SESSION_TTL_MS } = {}) {
    this.storageKey = storageKey;
    this.sessionTtl = sessionTtl;
    this.subscribers = new Set();
    this.timers = new Map();
    this.sessionId = null;
    this.sessionStartedAt = null;
    this.storageAvailable = canUseStorage();
    this.events = this._hydrateEvents();
    this._ensureSession();
  }

  _hydrateEvents() {
    if (!this.storageAvailable) {
      return [];
    }
    try {
      const raw = window.localStorage.getItem(this.storageKey);
      if (!raw) {
        return [];
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed;
    } catch (error) {
      console.warn('[AnalyticsStore] Не удалось прочитать события из storage:', error);
      return [];
    }
  }

  _persist() {
    if (!this.storageAvailable) {
      return;
    }
    try {
      window.localStorage.setItem(this.storageKey, JSON.stringify(this.events));
    } catch (error) {
      console.warn('[AnalyticsStore] Не удалось сохранить события в storage:', error);
    }
  }

  _ensureSession() {
    const now = getNow();
    if (this.events.length === 0) {
      this.sessionId = uuidv4();
      this.sessionStartedAt = now;
      this.logEvent(AnalyticsEventType.SESSION_START, {
        reason: 'bootstrap'
      }, {
        timestamp: getIsoTimestamp()
      });
      return;
    }

    const lastSessionEvent = [...this.events]
      .reverse()
      .find((event) => event.type === AnalyticsEventType.SESSION_START);

    if (!lastSessionEvent || (now - new Date(lastSessionEvent.timestamp).getTime()) > this.sessionTtl) {
      this.sessionId = uuidv4();
      this.sessionStartedAt = now;
      this.logEvent(AnalyticsEventType.SESSION_START, {
        reason: 'expired_or_missing'
      }, {
        timestamp: getIsoTimestamp()
      });
      return;
    }

    this.sessionId = lastSessionEvent.sessionId || uuidv4();
    this.sessionStartedAt = new Date(lastSessionEvent.timestamp).getTime();
  }

  /**
   * Subscribes to store updates.
   * @param {(events: Array) => void} listener
   * @returns {() => void} unsubscribe function
   */
  subscribe(listener) {
    this.subscribers.add(listener);
    listener(this.events.slice());
    return () => {
      this.subscribers.delete(listener);
    };
  }

  /**
   * Notifies all subscribers with the latest snapshot.
   */
  notify() {
    const snapshot = this.events.slice();
    this.subscribers.forEach((listener) => {
      try {
        listener(snapshot);
      } catch (error) {
        console.error('[AnalyticsStore] Ошибка подписчика', error);
      }
    });
  }

  /**
   * Returns a shallow copy of the collected events.
   * @returns {Array}
   */
  getEvents() {
    return this.events.slice();
  }

  /**
   * Adds an analytics event to the store.
   * @param {string} type
   * @param {Object} payload
   * @param {Object} meta
   * @returns {Object} appended event
   */
  logEvent(type, payload = {}, meta = {}) {
    const timestamp = meta.timestamp || getIsoTimestamp();
    const event = {
      id: meta.id || uuidv4(),
      type,
      payload,
      timestamp,
      sessionId: meta.sessionId || this.sessionId,
      context: meta.context || null
    };
    this.events = [...this.events, event];
    this._persist();
    this.notify();
    return event;
  }

  /**
   * Clears all stored events.
   */
  clear() {
    this.events = [];
    this._persist();
    this.notify();
  }

  /**
   * Starts a timer that will emit INTERACTION_TIME on stop.
   * @param {string} key
   * @param {Object} payload
   */
  startTimer(key, payload) {
    if (!key) {
      throw new Error('[AnalyticsStore] startTimer: key обязателен');
    }
    const now = getNow();
    this.timers.set(key, {
      startedAt: now,
      payload
    });
  }

  /**
   * Stops a timer and records interaction duration.
   * @param {string} key
   * @param {Object} extraPayload
   * @returns {Object|null}
   */
  stopTimer(key, extraPayload = {}) {
    if (!this.timers.has(key)) {
      return null;
    }
    const { startedAt, payload } = this.timers.get(key);
    this.timers.delete(key);
    const durationMs = Math.max(0, getNow() - startedAt);
    return this.logEvent(AnalyticsEventType.INTERACTION_TIME, {
      ...payload,
      ...extraPayload,
      durationMs
    });
  }
}

export default AnalyticsStore;
