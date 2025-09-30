import { createContext } from 'react';

const noop = () => null;

export const AnalyticsContext = createContext(null);
export const EMPTY_ANALYTICS = Object.freeze({
  events: [],
  trackScreenView: noop,
  finalizeScreenTiming: noop,
  trackClick: noop,
  logEvent: noop,
  clearEvents: noop,
  sessionId: null,
  sessionStartedAt: null
});
