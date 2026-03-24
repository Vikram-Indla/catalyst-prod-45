/**
 * useTheme — Convenience wrapper around ThemeProvider
 * 
 * Returns isDark, theme, setTheme, toggleTheme for components
 * that need dark mode awareness (e.g. SidebarBase).
 */

import { useCallback } from 'react';
import { useThemeMode, type ThemeMode } from '@/providers/ThemeProvider';

export type Theme = ThemeMode;

export function useTheme() {
  const { theme, resolvedTheme, setTheme } = useThemeMode();

  const isDark = resolvedTheme === 'dark';

  const toggleTheme = useCallback(() => {
    setTheme(isDark ? 'light' : 'dark');
  }, [isDark, setTheme]);

  return {
    theme,
    setTheme,
    toggleTheme,
    isDark,
    isAdminRoute: false,
    isAuthRoute: false,
  };
}
