import { useRef, useCallback, useEffect } from 'react';
import { resolveBindingValue, isBindingValue } from '../utils/bindings';

/**
 * ФАЗА 2: Hook для кэширования результатов резолва биндингов
 * 
 * Значительно ускоряет рендеринг при частых обновлениях context,
 * кэшируя результаты resolveBindingValue для одинаковых входных данных.
 * 
 * Использование:
 * ```jsx
 * const { resolveCached, clearCache, getStats } = useBindingCache(context);
 * 
 * // Вместо:
 * const value = resolveBindingValue(binding, context, fallback);
 * 
 * // Используем:
 * const value = resolveCached(binding, fallback);
 * ```
 * 
 * Кэш автоматически очищается при изменении context.
 */
export const useBindingCache = (context) => {
  const cacheRef = useRef(new Map());
  const statsRef = useRef({ hits: 0, misses: 0 });
  const contextHashRef = useRef(null);
  
  // Генерируем хэш контекста для определения изменений
  const getContextHash = useCallback((ctx) => {
    return JSON.stringify(ctx);
  }, []);
  
  // Генерируем ключ кэша для биндинга
  const getCacheKey = useCallback((binding, fallback) => {
    return `${JSON.stringify(binding)}::${fallback}`;
  }, []);
  
  // Очищаем кэш при изменении контекста
  useEffect(() => {
    const currentHash = getContextHash(context);
    
    if (contextHashRef.current !== currentHash) {
      cacheRef.current.clear();
      contextHashRef.current = currentHash;
      
      // Сбрасываем статистику при новом контексте
      if (statsRef.current.hits > 0 || statsRef.current.misses > 0) {
        console.log('🔄 [BindingCache] Context changed, cache cleared', {
          previousStats: { ...statsRef.current },
          cacheSize: cacheRef.current.size
        });
      }
      
      statsRef.current = { hits: 0, misses: 0 };
    }
  }, [context, getContextHash]);
  
  /**
   * Резолвит биндинг с использованием кэша
   */
  const resolveCached = useCallback((binding, fallback = undefined, iterationStack = []) => {
    // Если это не биндинг, возвращаем как есть
    if (!isBindingValue(binding)) {
      return binding ?? fallback;
    }
    
    const cacheKey = getCacheKey(binding, fallback);
    
    // Проверяем кэш
    if (cacheRef.current.has(cacheKey)) {
      statsRef.current.hits++;
      return cacheRef.current.get(cacheKey);
    }
    
    // Кэш промах - резолвим и сохраняем
    statsRef.current.misses++;
    const resolved = resolveBindingValue(binding, context, fallback, iterationStack);
    cacheRef.current.set(cacheKey, resolved);
    
    return resolved;
  }, [context, getCacheKey]);
  
  /**
   * Очищает кэш вручную
   */
  const clearCache = useCallback(() => {
    const size = cacheRef.current.size;
    cacheRef.current.clear();
    statsRef.current = { hits: 0, misses: 0 };
    
    console.log('🗑️ [BindingCache] Cache manually cleared', { previousSize: size });
  }, []);
  
  /**
   * Возвращает статистику использования кэша
   */
  const getStats = useCallback(() => {
    const { hits, misses } = statsRef.current;
    const total = hits + misses;
    const hitRate = total > 0 ? (hits / total * 100).toFixed(2) : 0;
    
    return {
      hits,
      misses,
      total,
      hitRate: `${hitRate}%`,
      cacheSize: cacheRef.current.size
    };
  }, []);
  
  /**
   * Логирует статистику кэша (для отладки)
   */
  const logStats = useCallback(() => {
    const stats = getStats();
    
    if (stats.total > 0) {
      const emoji = parseFloat(stats.hitRate) > 70 ? '🟢' : parseFloat(stats.hitRate) > 40 ? '🟡' : '🔴';
      
      console.log(`${emoji} [BindingCache] Stats:`, stats);
    }
  }, [getStats]);
  
  return {
    resolveCached,
    clearCache,
    getStats,
    logStats
  };
};

/**
 * Hook для кэширования разрешенных props компонента
 * 
 * Использование:
 * ```jsx
 * const resolvedProps = useResolvedPropsCache(component, context);
 * ```
 */
export const useResolvedPropsCache = (component, context) => {
  const { resolveCached } = useBindingCache(context);
  const cacheRef = useRef(new Map());
  
  // Генерируем ключ для компонента
  const componentKey = `${component.id}::${component.type}`;
  
  // Проверяем кэш
  if (cacheRef.current.has(componentKey)) {
    return cacheRef.current.get(componentKey);
  }
  
  // Резолвим все props
  const props = component?.props ?? component?.properties ?? {};
  const resolvedProps = {};
  
  for (const [key, value] of Object.entries(props)) {
    resolvedProps[key] = resolveCached(value);
  }
  
  // Сохраняем в кэш
  cacheRef.current.set(componentKey, resolvedProps);
  
  return resolvedProps;
};

/**
 * Утилита для измерения эффективности кэша
 */
export const measureCacheEfficiency = (cacheName, operation) => {
  const start = performance.now();
  const result = operation();
  const end = performance.now();
  const duration = end - start;
  
  console.log(`⏱️ [CacheEfficiency] ${cacheName}:`, {
    duration: `${duration.toFixed(2)}ms`,
    result
  });
  
  return result;
};
