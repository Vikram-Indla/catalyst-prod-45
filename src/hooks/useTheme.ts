import { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'catalyst_theme';

export function useTheme() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isAuthRoute = location.pathname === '/auth' || location.pathname.startsWith('/auth');
  const forceLightMode = isAdminRoute || isAuthRoute;
  
  const [theme, setThemeState] = useState<Theme>(() => {
    // Initial value - will be corrected in useEffect
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
      const system = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      return stored || system;
    }
    return 'light';
  });

  // Apply theme to document
  const applyTheme = useCallback((newTheme: Theme) => {
    document.documentElement.setAttribute('data-theme', newTheme);
    // Also update class for Tailwind dark mode if needed
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  // Handle admin and auth routes forcing light theme
  useEffect(() => {
    if (forceLightMode) {
      applyTheme('light');
    } else {
      applyTheme(theme);
    }
  }, [forceLightMode, theme, applyTheme]);

  // Listen for system preference changes when no stored preference
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return; // User has explicit preference, don't listen to system

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (!forceLightMode) {
        const newTheme = e.matches ? 'dark' : 'light';
        setThemeState(newTheme);
        applyTheme(newTheme);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [forceLightMode, applyTheme]);

  const setTheme = useCallback((newTheme: Theme) => {
    if (forceLightMode) return; // Don't allow theme change on admin/auth routes
    
    setThemeState(newTheme);
    localStorage.setItem(STORAGE_KEY, newTheme);
    applyTheme(newTheme);
  }, [forceLightMode, applyTheme]);

  const toggleTheme = useCallback(() => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  }, [theme, setTheme]);

  return {
    theme: forceLightMode ? 'light' : theme,
    setTheme,
    toggleTheme,
    isDark: !forceLightMode && theme === 'dark',
    isAdminRoute,
    isAuthRoute,
  };
}
