import { useEffect } from 'react';
import { applyDesignTokens } from '../../styles/applyDesignTokens.js';

/**
 * Ensures global design tokens are injected into the document root once when a Ladle story mounts.
 */
export const useDesignTokens = () => {
  useEffect(() => {
    applyDesignTokens();
  }, []);
};
