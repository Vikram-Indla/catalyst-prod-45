import { useEffect } from 'react';

/**
 * Trigger the browser's native "Leave site?" prompt on refresh / tab-close /
 * hard navigation while `active` is true (e.g. a form has unsaved edits).
 * Attaches a `beforeunload` listener only while active; detaches on cleanup.
 * SSR-safe (no-op when `window` is undefined).
 */
export function useBeforeUnload(active: boolean): void {
  useEffect(() => {
    if (!active || typeof window === 'undefined') return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Legacy requirement — some browsers only show the prompt when
      // returnValue is set to a (any) string.
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [active]);
}
