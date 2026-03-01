import { useState, useEffect, useCallback } from 'react';

type WikiTheme = 'light' | 'dark';

export function useWikiTheme() {
  const [theme, setThemeState] = useState<WikiTheme>(() => {
    return (localStorage.getItem('catalyst-wiki-theme') as WikiTheme) || 'light';
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('catalyst-wiki-theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setThemeState(prev => prev === 'light' ? 'dark' : 'light');
  }, []);

  return { theme, toggleTheme };
}
