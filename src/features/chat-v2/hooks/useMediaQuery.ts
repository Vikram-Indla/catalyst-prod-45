/**
 * useMediaQuery — SSR-safe media-query subscription.
 *
 * Returns whether `query` currently matches. Initial state is computed
 * lazily (false when `window`/`matchMedia` is unavailable, e.g. SSR),
 * then kept in sync via the MediaQueryList `change` event. Listener is
 * cleaned up on unmount / query change. Falls back to the legacy
 * addListener/removeListener API for older Safari.
 */
import { useEffect, useState } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia(query);
    // Re-sync in case the query prop changed between render and effect.
    setMatches(mql.matches);
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    }
    // Legacy fallback (Safari < 14).
    mql.addListener(onChange);
    return () => mql.removeListener(onChange);
  }, [query]);

  return matches;
}
