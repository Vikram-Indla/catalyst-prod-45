import { useState, useCallback } from 'react';

type StrategyTheme = 'light' | 'dark';
type StrategyDensity = 'compact' | 'default' | 'comfortable';

interface StrategyPreferences {
  theme: StrategyTheme;
  density: StrategyDensity;
}

const STORAGE_KEY = 'catalyst-strategy-prefs';

function loadPrefs(): StrategyPreferences {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return { theme: 'light', density: 'default' };
}

function savePrefs(prefs: StrategyPreferences) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch { /* ignore */ }
}

export function useStrategyPreferences() {
  const [prefs, setPrefs] = useState<StrategyPreferences>(loadPrefs);

  const setTheme = useCallback((theme: StrategyTheme) => {
    setPrefs(prev => {
      const next = { ...prev, theme };
      savePrefs(next);
      return next;
    });
  }, []);

  const setDensity = useCallback((density: StrategyDensity) => {
    setPrefs(prev => {
      const next = { ...prev, density };
      savePrefs(next);
      return next;
    });
  }, []);

  const toggleTheme = useCallback(() => {
    setPrefs(prev => {
      const next = { ...prev, theme: prev.theme === 'light' ? 'dark' as const : 'light' as const };
      savePrefs(next);
      return next;
    });
  }, []);

  return {
    theme: prefs.theme,
    density: prefs.density,
    setTheme,
    setDensity,
    toggleTheme,
  };
}
