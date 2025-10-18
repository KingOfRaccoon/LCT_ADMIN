import { useState, useEffect, useCallback } from 'react';
import { getSubflowRegistry } from '../services/subflowRegistry';

/**
 * React Hook для работы с Subflow Registry (сохранение на бэкенд)
 * 
 * @param {string} baseUrl - Base URL для API
 * @returns {Object} - { registry, subflows, save, getId, refresh }
 */
export function useSubflowRegistry(baseUrl) {
  const [registry, setRegistry] = useState(null);
  const [subflows, setSubflows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const reg = getSubflowRegistry(baseUrl);
    setRegistry(reg);
    setSubflows(reg.list());
  }, [baseUrl]);

  /**
   * Обновить список subflow
   */
  const refresh = useCallback(() => {
    if (registry) {
      setSubflows(registry.list());
    }
  }, [registry]);

  /**
   * Сохранить subflow на бэкенд
   */
  const save = useCallback(async (name) => {
    if (!registry) return null;

    setLoading(true);
    setError(null);

    try {
      const id = await registry.save(name);
      refresh();
      return id;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [registry, refresh]);

  /**
   * Получить ID subflow (сохранить если нужно)
   */
  const getId = useCallback(async (name) => {
    if (!registry) return null;

    setLoading(true);
    setError(null);

    try {
      const id = await registry.getId(name);
      refresh();
      return id;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [registry, refresh]);

  /**
   * Сбросить ID subflow
   */
  const reset = useCallback((name) => {
    if (registry) {
      registry.reset(name);
      refresh();
    }
  }, [registry, refresh]);

  /**
   * Зарегистрировать новый subflow
   */
  const register = useCallback((name, definition, metadata) => {
    if (registry) {
      registry.register(name, definition, metadata);
      refresh();
    }
  }, [registry, refresh]);

  /**
   * Сохранить все несохранённые subflow на бэкенд
   */
  const saveAll = useCallback(async () => {
    if (!registry) return {};

    setLoading(true);
    setError(null);

    try {
      const results = await registry.saveAll();
      refresh();
      return results;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [registry, refresh]);

  return {
    registry,
    subflows,
    loading,
    error,
    save,
    getId,
    reset,
    register,
    saveAll,
    refresh
  };
}

export default useSubflowRegistry;
