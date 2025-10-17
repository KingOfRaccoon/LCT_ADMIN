/**
 * useRenderPerformance Hook
 * 
 * Измеряет производительность рендеринга компонентов
 * Использует Performance API для точных измерений
 */

import { useEffect, useRef } from 'react';

const isDevelopment = import.meta.env.DEV;

/**
 * Hook для измерения производительности рендеринга
 * 
 * @param {string} componentName - Имя компонента для логирования
 * @param {string} componentId - ID компонента/экрана
 * @param {number} itemsCount - Количество элементов (для списков)
 * @param {boolean} enabled - Включить/выключить измерения
 * @returns {Object} Метрики производительности
 */
export const useRenderPerformance = (
  componentName = 'Component',
  componentId = null,
  itemsCount = 0,
  enabled = isDevelopment
) => {
  const renderStartRef = useRef(0);
  const renderCountRef = useRef(0);
  const metricsRef = useRef({
    renderTimes: [],
    avgRenderTime: 0,
    minRenderTime: Infinity,
    maxRenderTime: 0,
    totalRenders: 0
  });

  // Засекаем начало рендера (до useEffect)
  if (enabled) {
    renderStartRef.current = performance.now();
    renderCountRef.current++;
  }

  useEffect(() => {
    if (!enabled) return;

    const renderTime = performance.now() - renderStartRef.current;
    const metrics = metricsRef.current;

    // Обновляем метрики
    metrics.renderTimes.push(renderTime);
    metrics.totalRenders = renderCountRef.current;
    metrics.minRenderTime = Math.min(metrics.minRenderTime, renderTime);
    metrics.maxRenderTime = Math.max(metrics.maxRenderTime, renderTime);
    
    // Вычисляем среднее (последние 10 рендеров)
    const recentTimes = metrics.renderTimes.slice(-10);
    metrics.avgRenderTime = recentTimes.reduce((a, b) => a + b, 0) / recentTimes.length;

    // Логируем в консоль
    const logData = {
      component: componentName,
      id: componentId,
      render: `#${renderCountRef.current}`,
      time: `${renderTime.toFixed(2)}ms`,
      avg: `${metrics.avgRenderTime.toFixed(2)}ms`,
      min: `${metrics.minRenderTime.toFixed(2)}ms`,
      max: `${metrics.maxRenderTime.toFixed(2)}ms`
    };

    if (itemsCount > 0) {
      logData.items = itemsCount;
      logData.timePerItem = `${(renderTime / itemsCount).toFixed(2)}ms`;
    }

    // Цветовой индикатор производительности
    let indicator = '🟢'; // хорошо
    if (renderTime > 100) indicator = '🟡'; // средне
    if (renderTime > 300) indicator = '🔴'; // плохо

    console.log(`${indicator} [Performance]`, logData);

    // Сохраняем в window для доступа из тестов
    if (typeof window !== 'undefined') {
      if (!window.__performanceMetrics) {
        window.__performanceMetrics = {};
      }
      window.__performanceMetrics[componentName] = {
        ...metrics,
        lastRenderTime: renderTime
      };
    }
  }, []); // Запускаем только после рендера

  return metricsRef.current;
};

/**
 * Hook для измерения производительности с профилированием
 * Создаёт performance mark для Chrome DevTools
 * 
 * @param {string} markName - Имя метки
 * @param {boolean} enabled - Включить/выключить
 */
export const usePerformanceMark = (markName, enabled = isDevelopment) => {
  const startMarkRef = useRef(null);

  if (enabled && typeof performance !== 'undefined' && performance.mark) {
    // Начало рендера
    const startMark = `${markName}-start`;
    startMarkRef.current = startMark;
    performance.mark(startMark);
  }

  useEffect(() => {
    if (!enabled || !startMarkRef.current) return;

    // Конец рендера
    const endMark = `${markName}-end`;
    const measureName = `${markName}-render`;

    try {
      performance.mark(endMark);
      performance.measure(measureName, startMarkRef.current, endMark);
      
      // Получаем измерение
      const measures = performance.getEntriesByName(measureName);
      if (measures.length > 0) {
        const duration = measures[measures.length - 1].duration;
        console.log(`⏱️ [Profiler] ${markName}: ${duration.toFixed(2)}ms`);
      }

      // Очищаем метки (не храним больше 100)
      const allMarks = performance.getEntriesByType('mark');
      if (allMarks.length > 100) {
        performance.clearMarks();
        performance.clearMeasures();
      }
    } catch (error) {
      console.warn('[usePerformanceMark] Error:', error);
    }
  }, []);
};

/**
 * Утилита для ручного замера производительности функций
 * 
 * @param {string} label - Метка для логирования
 * @param {Function} fn - Функция для измерения
 * @returns {*} Результат выполнения функции
 */
export const measurePerformance = (label, fn) => {
  const start = performance.now();
  const result = fn();
  const duration = performance.now() - start;
  
  console.log(`⏱️ [Measure] ${label}: ${duration.toFixed(2)}ms`);
  
  return result;
};

/**
 * Утилита для получения сводки по производительности
 * 
 * @returns {Object} Сводка метрик из window.__performanceMetrics
 */
export const getPerformanceSummary = () => {
  if (typeof window === 'undefined' || !window.__performanceMetrics) {
    return {};
  }

  const summary = {};
  
  for (const [component, metrics] of Object.entries(window.__performanceMetrics)) {
    summary[component] = {
      totalRenders: metrics.totalRenders,
      avgRenderTime: `${metrics.avgRenderTime.toFixed(2)}ms`,
      minRenderTime: `${metrics.minRenderTime.toFixed(2)}ms`,
      maxRenderTime: `${metrics.maxRenderTime.toFixed(2)}ms`,
      lastRenderTime: `${metrics.lastRenderTime.toFixed(2)}ms`
    };
  }

  return summary;
};

/**
 * Утилита для очистки метрик производительности
 */
export const clearPerformanceMetrics = () => {
  if (typeof window !== 'undefined') {
    window.__performanceMetrics = {};
  }
  
  if (typeof performance !== 'undefined') {
    performance.clearMarks();
    performance.clearMeasures();
  }
  
  console.log('🧹 [Performance] Metrics cleared');
};
