/**
 * AdsThemeProvider — bridges Catalyst's useTheme() to @atlaskit/tokens.
 *
 * Where it mounts
 * ───────────────
 * Inside <ThemeProvider> in src/App.tsx, wrapping everything below so ADS
 * wrappers render against the correct colour mode from the first paint.
 *
 *   <ThemeProvider>          ← Catalyst source of truth (supabase + localStorage)
 *     <AdsThemeProvider>     ← this — syncs Atlaskit tokens
 *       …
 *     </AdsThemeProvider>
 *   </ThemeProvider>
 *
 * What it does
 * ────────────
 * 1. Reads the resolved light/dark mode from `useTheme()`.
 * 2. Calls `@atlaskit/tokens` `setGlobalTheme` with matching colorMode on
 *    mount and whenever the resolved mode changes. `setGlobalTheme` is
 *    idempotent — repeated calls with the same mode are free.
 * 3. Feeds `customColors` from `atlaskitCustomColors(mode)` so Atlaskit
 *    renders with NOCTURNE / V12 hex rather than its own defaults. This
 *    is the alignment layer — without it, Atlaskit Lozenge greys would
 *    not match Catalyst Lozenge greys after a token bump.
 *
 * What it deliberately does not do
 * ────────────────────────────────
 * - Does NOT own the theme state — Catalyst's ThemeProvider already is the
 *   source of truth. Adding another state holder would create flicker.
 * - Does NOT touch <html class="dark"> — ThemeProvider does that for
 *   Tailwind `dark:` utilities. We only touch `data-color-mode` via
 *   Atlaskit's API.
 * - Does NOT inject any markup. It's a pure effect — returns children.
 *
 * History
 * ───────
 * Before this provider, Atlaskit theme sync was scoped to SubtasksPanel
 * (`useAtlaskitThemeSync` in src/modules/project-work-hub/components/
 * SubtasksPanel/atlaskitTheme.ts). That works for one surface; it breaks
 * when a second surface mounts an Atlaskit component before the panel
 * is on screen — Atlaskit falls back to its default (light) tokens. This
 * provider hoists the sync to the root so every surface is covered.
 */
import { useEffect, type ReactNode } from 'react';
import { setGlobalTheme } from '@atlaskit/tokens';
import { useTheme } from '@/hooks/useTheme';
import { atlaskitCustomColors } from './tokens';

interface AdsThemeProviderProps {
  children: ReactNode;
}

export function AdsThemeProvider({ children }: AdsThemeProviderProps) {
  const { isDark } = useTheme();

  useEffect(() => {
    const mode: 'light' | 'dark' = isDark ? 'dark' : 'light';
    // setGlobalTheme is async-returning-promise but fire-and-forget here is
    // correct — we don't block render on Atlaskit's CSS injection, and the
    // light-mode default is already applied by its auto-setup.
    void setGlobalTheme({
      colorMode: mode,
      // @atlaskit/tokens accepts `customColors` as an opt-in override. We
      // feed it our bridge so every Atlaskit component inherits Catalyst
      // values without per-component work. Null-safe on older Atlaskit
      // builds — unknown keys are silently ignored.
      customColors: atlaskitCustomColors(mode) as unknown as Record<string, string>,
    } as Parameters<typeof setGlobalTheme>[0]);
  }, [isDark]);

  return <>{children}</>;
}
