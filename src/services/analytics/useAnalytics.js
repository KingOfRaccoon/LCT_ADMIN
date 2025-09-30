import { useContext } from 'react';
import { AnalyticsContext, EMPTY_ANALYTICS } from './AnalyticsContext.js';

/**
 * Возвращает строгую реализацию аналитического контекста.
 * @throws {Error} если провайдер отсутствует в дереве.
 */
export const useAnalytics = () => {
  const context = useContext(AnalyticsContext);
  if (!context) {
    throw new Error('useAnalytics должен использоваться внутри AnalyticsProvider');
  }
  return context;
};

/**
 * Возвращает контекст аналитики, если он доступен, либо no-op реализацию (Storybook, Playground).
 */
export const useAnalyticsOptional = () => {
  const context = useContext(AnalyticsContext);
  return context ?? EMPTY_ANALYTICS;
};
