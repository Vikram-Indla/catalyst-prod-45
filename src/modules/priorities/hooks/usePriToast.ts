// ============================================================
// File: src/modules/priorities/hooks/usePriToast.ts
// ============================================================

import { useState, useCallback, useRef } from 'react';
import type { PriToast } from '../types';

let toastCounter = 0;

export function usePriToast() {
  const [toasts, setToasts] = useState<PriToast[]>([]);
  const timersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const addToast = useCallback(
    (
      type: PriToast['type'],
      message: string,
      duration = 4000
    ) => {
      const id = `pri-toast-${++toastCounter}`;
      const toast: PriToast = { id, type, message, duration };

      setToasts((prev) => [...prev, toast]);

      if (duration > 0) {
        const timer = setTimeout(() => {
          dismissToast(id);
        }, duration);
        timersRef.current.set(id, timer);
      }

      return id;
    },
    [dismissToast]
  );

  const success = useCallback(
    (message: string) => addToast('success', message),
    [addToast]
  );

  const error = useCallback(
    (message: string) => addToast('error', message, 6000),
    [addToast]
  );

  const warning = useCallback(
    (message: string) => addToast('warning', message),
    [addToast]
  );

  return {
    toasts,
    addToast,
    dismissToast,
    success,
    error,
    warning,
  };
}
