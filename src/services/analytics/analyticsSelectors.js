import { AnalyticsEventType } from './constants';

const asNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const formatBucketKey = (timestamp, bucketSizeMs) => {
  const date = new Date(timestamp);
  const bucketStart = Math.floor(date.getTime() / bucketSizeMs) * bucketSizeMs;
  return new Date(bucketStart).toISOString();
};

/**
 * Строит агрегированные наборы данных для дашборда аналитики.
 * @param {Array} events - список аналитических событий
 * @param {Object} [options]
 * @param {number} [options.timelineBucketMs] - размер временного сегмента для таймлайна (по умолчанию 5 минут)
 * @returns {{
 *  screenSeries: Array<{screenId: string, screenName: string, views: number, totalDurationMs: number, avgDurationMs: number}>,
 *  clickSeries: Array<{componentId: string|null, label: string, screenId: string|null, screenName: string|null, count: number}>,
 *  timelineSeries: Array<{timestamp: string, screenViews: number, clicks: number}>,
 *  totals: {views: number, clicks: number, trackedScreens: number, avgDurationMs: number}
 * }}
 */
export const buildAnalyticsSummary = (events, { timelineBucketMs = 1000 * 60 * 5 } = {}) => {
  const screenMap = new Map();
  const clicksMap = new Map();
  const timelineMap = new Map();

  events.forEach((event) => {
    if (!event || typeof event !== 'object') {
      return;
    }

    if (!event.type || !event.timestamp) {
      return;
    }

    const { type, payload = {}, timestamp } = event;
    const timeKey = formatBucketKey(timestamp, timelineBucketMs);
    if (!timelineMap.has(timeKey)) {
      timelineMap.set(timeKey, {
        timestamp: timeKey,
        screenViews: 0,
        clicks: 0
      });
    }
    const timelineEntry = timelineMap.get(timeKey);

    switch (type) {
      case AnalyticsEventType.SCREEN_VIEW: {
        const screenId = payload.screenId ?? 'unknown';
        if (!screenMap.has(screenId)) {
          screenMap.set(screenId, {
            screenId,
            screenName: payload.screenName ?? screenId,
            views: 0,
            totalDurationMs: 0
          });
        }
        const stat = screenMap.get(screenId);
        stat.views += 1;
        timelineEntry.screenViews += 1;
        break;
      }
      case AnalyticsEventType.INTERACTION_TIME: {
        const screenId = payload.screenId ?? 'unknown';
        const durationMs = asNumber(payload.durationMs, 0);
        if (!screenMap.has(screenId)) {
          screenMap.set(screenId, {
            screenId,
            screenName: payload.screenName ?? screenId,
            views: 0,
            totalDurationMs: 0
          });
        }
        const stat = screenMap.get(screenId);
        stat.totalDurationMs += durationMs;
        break;
      }
      case AnalyticsEventType.UI_CLICK: {
        const componentKey = payload.componentId
          || `${payload.screenId ?? 'unknown'}::${payload.eventName ?? payload.label ?? payload.componentType ?? 'interaction'}`;
        if (!clicksMap.has(componentKey)) {
          clicksMap.set(componentKey, {
            componentId: payload.componentId ?? null,
            label: payload.label ?? payload.componentType ?? 'Компонент',
            screenId: payload.screenId ?? null,
            screenName: payload.screenName ?? null,
            count: 0
          });
        }
        const stat = clicksMap.get(componentKey);
        stat.count += 1;
        timelineEntry.clicks += 1;
        break;
      }
      default:
        break;
    }
  });

  const screenSeries = Array.from(screenMap.values()).map((entry) => ({
    ...entry,
    avgDurationMs: entry.views > 0 ? Math.round(entry.totalDurationMs / entry.views) : 0
  })).sort((a, b) => b.views - a.views);

  const clickSeries = Array.from(clicksMap.values()).sort((a, b) => b.count - a.count);

  const timelineSeries = Array.from(timelineMap.values()).sort((a, b) => (
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  ));

  const totals = {
    views: screenSeries.reduce((acc, item) => acc + item.views, 0),
    clicks: clickSeries.reduce((acc, item) => acc + item.count, 0),
    trackedScreens: screenSeries.length,
    avgDurationMs: screenSeries.length > 0
      ? Math.round(screenSeries.reduce((acc, item) => acc + item.avgDurationMs, 0) / screenSeries.length)
      : 0
  };

  return {
    screenSeries,
    clickSeries,
    timelineSeries,
    totals
  };
};
