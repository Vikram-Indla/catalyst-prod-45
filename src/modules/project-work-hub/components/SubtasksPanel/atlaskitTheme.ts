/**
 * Atlaskit theme bridge.
 *
 * Keeps @atlaskit/tokens' global colour mode in sync with Catalyst's own
 * useTheme() so every Atlaskit component inside SubtasksPanel (and anywhere
 * else that eventually opts in) renders with the correct light/dark tokens.
 *
 * setGlobalTheme writes `data-color-mode` (and related attrs) to
 * document.documentElement and injects the matching CSS custom-property set.
 * It is idempotent and global — calling it repeatedly with the same colour
 * mode is a no-op.
 *
 * Why a hook, not a module-level call: the panel is lazily mounted on detail
 * views; running the sync as an effect keyed on `isDark` means we only touch
 * the document when this panel is actually on screen AND the Catalyst theme
 * state changes.
 */
import { useEffect } from 'react';
import { setGlobalTheme } from '@atlaskit/tokens';
import { useTheme } from '@/hooks/useTheme';

export function useAtlaskitThemeSync(): void {
  const { isDark } = useTheme();
  useEffect(() => {
    setGlobalTheme({ colorMode: isDark ? 'dark' : 'light' });
  }, [isDark]);
}
