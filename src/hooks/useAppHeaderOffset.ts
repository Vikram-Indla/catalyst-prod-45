import { useEffect } from 'react';

/**
 * Global layout contract:
 * Keeps CSS variables in sync with the actual rendered header height.
 * Consumers use:
 *   top: var(--app-top-offset)
 *   height: calc(100dvh - var(--app-top-offset))
 */
export function useAppHeaderOffset(headerRef: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;

    const root = document.documentElement;

    const sync = () => {
      const h = Math.ceil(el.getBoundingClientRect().height);
      root.style.setProperty('--app-header-h', `${h}px`);
      // Keep derived var updated for any non-CSS consumers.
      root.style.setProperty('--app-top-offset', `calc(var(--app-safe-top) + ${h}px)`);
    };

    sync();

    const ro = new ResizeObserver(sync);
    ro.observe(el);

    window.addEventListener('resize', sync, { passive: true });
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', sync);
    };
  }, [headerRef]);
}
