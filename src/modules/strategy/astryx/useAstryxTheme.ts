/**
 * useAstryxTheme — Bridge Catalyst theme to Astryx scope
 *
 * Catalyst has its own light/dark theme (from ThemeProvider).
 * This hook reads Catalyst's resolved theme and reflects it to
 * Astryx, enabling synchronized dark mode when implemented.
 *
 * Currently light-mode-first (dark deferred).
 */

import { useThemeMode } from '@/hooks/useTheme';

export interface AstryxThemeState {
  isLightMode: boolean;
  isDarkMode: boolean;
  resolvedTheme: 'light' | 'dark';
}

export function useAstryxTheme(): AstryxThemeState {
  const { isDark } = useThemeMode();

  return {
    isLightMode: !isDark,
    isDarkMode: isDark,
    resolvedTheme: isDark ? 'dark' : 'light',
  };
}
