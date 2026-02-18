/**
 * useStrategyPreferences — Manages density preference for Strategy Room
 * Persists to localStorage key: "catalyst-strategy-prefs"
 */

import { useState, useCallback, useEffect } from 'react';

export type StrategyDensity = 'compact' | 'comfortable' | 'spacious';

interface StrategyPreferences {
  density: StrategyDensity;
}

const STORAGE_KEY = 'catalyst-strategy-prefs';
const DEFAULT_PREFS: StrategyPreferences = { density: 'comfortable' };

function loadPrefs(): StrategyPreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<StrategyPreferences>;
      return {
        density: (['compact', 'comfortable', 'spacious'].includes(parsed.density ?? '')
          ? parsed.density
          : DEFAULT_PREFS.density) as StrategyDensity,
      };
    }
  } catch {
    // ignore
  }
  return DEFAULT_PREFS;
}

export function useStrategyPreferences() {
  const [prefs, setPrefs] = useState<StrategyPreferences>(loadPrefs);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  }, [prefs]);

  const setDensity = useCallback((density: StrategyDensity) => {
    setPrefs(prev => ({ ...prev, density }));
  }, []);

  return {
    density: prefs.density,
    setDensity,
  };
}
