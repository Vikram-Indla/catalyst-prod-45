import { useCallback } from 'react';
import { useThemeMode } from '@/providers/ThemeProvider';

export type ChatTheme = 'dark' | 'light';

export function useChatTheme(): { theme: ChatTheme; toggle: () => void; setTheme: (t: ChatTheme) => void } {
  const { resolvedTheme, setTheme: setGlobalTheme } = useThemeMode();
  const theme: ChatTheme = resolvedTheme;

  const setTheme = useCallback((t: ChatTheme) => setGlobalTheme(t), [setGlobalTheme]);
  const toggle = useCallback(() => setGlobalTheme(resolvedTheme === 'dark' ? 'light' : 'dark'), [resolvedTheme, setGlobalTheme]);

  return { theme, toggle, setTheme };
}
