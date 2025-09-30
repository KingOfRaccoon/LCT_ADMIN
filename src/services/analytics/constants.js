export const ANALYTICS_STORAGE_KEY = 'bdui.analytics.events';

export const AnalyticsEventType = Object.freeze({
  SCREEN_VIEW: 'screen_view',
  UI_CLICK: 'ui_click',
  INTERACTION_TIME: 'interaction_time',
  SESSION_START: 'session_start'
});

export const DEFAULT_SESSION_TTL_MS = 1000 * 60 * 60 * 6; // 6 hours
