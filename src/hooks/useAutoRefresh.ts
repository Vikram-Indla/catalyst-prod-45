/**
 * useAutoRefresh — fires `callback` every `intervalMinutes` while `enabled`.
 * Clears interval on unmount / disabled / settings change.
 *
 * Used by dashboard widgets to re-run their react-query refetch on a cadence
 * driven by GadgetSettings.autoRefresh + autoRefreshMinutes.
 */
import { useEffect, useRef } from 'react';

export function useAutoRefresh(
  enabled: boolean | undefined,
  intervalMinutes: number | undefined,
  callback: () => void,
) {
  const cbRef = useRef(callback);
  useEffect(() => {
    cbRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) return;
    const minutes = Math.max(1, Number(intervalMinutes) || 15);
    const ms = minutes * 60 * 1000;
    const id = window.setInterval(() => {
      try {
        cbRef.current();
      } catch {
        /* swallow — refetch errors surface via react-query state */
      }
    }, ms);
    return () => window.clearInterval(id);
  }, [enabled, intervalMinutes]);
}
