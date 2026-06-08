/**
 * useAutoRefresh — fires `callback` every `intervalMinutes` while `enabled`.
 * Clears interval on unmount / disabled / settings change. Returns the
 * Date of the most recent fire (or null if never fired) so widgets can
 * surface a "last refreshed" indicator + visual pulse.
 */
import { useEffect, useRef, useState } from 'react';

export function useAutoRefresh(
  enabled: boolean | undefined,
  intervalMinutes: number | undefined,
  callback: () => void,
): Date | null {
  const cbRef = useRef(callback);
  const [lastFired, setLastFired] = useState<Date | null>(null);
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
        setLastFired(new Date());
      } catch {
        /* swallow — refetch errors surface via react-query state */
      }
    }, ms);
    return () => window.clearInterval(id);
  }, [enabled, intervalMinutes]);

  return lastFired;
}
