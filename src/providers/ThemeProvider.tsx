/**
 * ThemeProvider — Catalyst dark mode infrastructure
 * Source of truth: Supabase user_theme_preferences.theme_mode
 * Fast cache: localStorage 'catalyst-theme'
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type ThemeMode = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

interface ThemeContextType {
  theme: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'system',
  resolvedTheme: 'light',
  setTheme: () => {},
});

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveTheme(mode: ThemeMode): ResolvedTheme {
  return mode === 'system' ? getSystemTheme() : mode;
}

function applyTheme(resolved: ResolvedTheme) {
  // Rule 2 (DARK_MODE_HANDOFF): Catalyst owns ONLY the `.dark` class.
  // `data-theme` is owned by Atlaskit's setGlobalTheme — never write it here.
  if (resolved === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Read from localStorage cache for instant apply (prevents flash)
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const cached = localStorage.getItem('catalyst-theme');
    if (cached === 'light' || cached === 'dark' || cached === 'system') return cached;
    return 'system';
  });

  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => resolveTheme(
    (() => {
      const cached = localStorage.getItem('catalyst-theme');
      if (cached === 'light' || cached === 'dark' || cached === 'system') return cached;
      return 'system';
    })()
  ));

  // Apply theme immediately on state change
  useEffect(() => {
    const resolved = resolveTheme(theme);
    setResolvedTheme(resolved);
    applyTheme(resolved);
  }, [theme]);

  // Listen for OS preference changes when in system mode
  useEffect(() => {
    if (theme !== 'system') return;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      const resolved = getSystemTheme();
      setResolvedTheme(resolved);
      applyTheme(resolved);
    };
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [theme]);

  // Sync from Supabase on mount (source of truth)
  useEffect(() => {
    let cancelled = false;

    async function syncFromDB() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const { data } = await supabase
        .from('user_theme_preferences')
        .select('theme_mode, reduce_motion')
        .eq('user_id', user.id)
        .single();

      if (cancelled) return;

      if (data?.theme_mode) {
        const mode = data.theme_mode as ThemeMode;
        if (mode === 'light' || mode === 'dark' || mode === 'system') {
          setThemeState(mode);
          localStorage.setItem('catalyst-theme', mode);
        }
      }

      // Apply reduce_motion preference
      if (data?.reduce_motion || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        document.documentElement.setAttribute('data-reduced-motion', 'true');
      }
    }

    syncFromDB();
    return () => { cancelled = true; };
  }, []);

  const setTheme = useCallback(async (mode: ThemeMode) => {
    // Immediate local update
    setThemeState(mode);
    localStorage.setItem('catalyst-theme', mode);

    // Persist to Supabase
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('user_theme_preferences')
      .upsert({
        user_id: user.id,
        theme_mode: mode,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
  }, []);

  const value = useMemo(() => ({
    theme,
    resolvedTheme,
    setTheme,
  }), [theme, resolvedTheme, setTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeMode() {
  return useContext(ThemeContext);
}
