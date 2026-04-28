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
    // setGlobalTheme is async-returning-promise. We MUST chain on it because
    // it writes a parameterised `data-theme="dark:dark light:light spacing:
    // spacing typography:typography"` string to <html> for its own internal
    // lookups. That string clobbers Catalyst's clean `data-theme="dark"`,
    // and every Catalyst CSS rule keyed on `[data-theme="dark"]` (the entire
    // --cp-* dark-mode override block in theme-tokens.css and index.css)
    // is an exact-equals attribute selector — it never matches the mangled
    // value. Net effect: the entire Catalyst dark theme silently dies the
    // moment AdsThemeProvider mounts.
    //
    // Fix (2026-04-28, jira-compare lesson): after setGlobalTheme resolves,
    // restore the attribute to the clean mode string so Catalyst's CSS
    // selectors match. Atlaskit reads the attribute internally during the
    // setGlobalTheme call — by the time the promise resolves, its lookups
    // are done and we can take the attribute back. Verified live: --cp-bg
    // flips to #0A0A0A, sidebar/header/main all turn dark, Atlaskit
    // components keep their --ds-* tokens.
    void setGlobalTheme({
      colorMode: mode,
      typography: 'typography',
      // @atlaskit/tokens accepts `customColors` as an opt-in override. We
      // feed it our bridge so every Atlaskit component inherits Catalyst
      // values without per-component work. Null-safe on older Atlaskit
      // builds — unknown keys are silently ignored.
      customColors: atlaskitCustomColors(mode) as unknown as Record<string, string>,
    } as Parameters<typeof setGlobalTheme>[0])
      .then(() => {
        if (typeof document !== 'undefined') {
          document.documentElement.setAttribute('data-theme', mode);
        }
      })
      .catch(() => {
        // Even if setGlobalTheme rejects, the attribute may already be
        // mangled — restore it anyway so CSS doesn't end up in a broken
        // intermediate state.
        if (typeof document !== 'undefined') {
          document.documentElement.setAttribute('data-theme', mode);
        }
      });
  }, [isDark]);

  return <>{children}</>;
}
