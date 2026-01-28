import { useEffect, useCallback } from 'react';

export type Theme = 'light';

/**
 * Theme hook - locked to light mode
 * Dark mode has been removed from the application
 */
export function useTheme() {
  // Apply light theme on mount
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'light');
    document.documentElement.classList.remove('dark');
  }, []);

  const setTheme = useCallback(() => {
    // No-op - always light mode
  }, []);

  const toggleTheme = useCallback(() => {
    // No-op - always light mode
  }, []);

  return {
    theme: 'light' as const,
    setTheme,
    toggleTheme,
    isDark: false,
    isAdminRoute: false,
    isAuthRoute: false,
  };
}
