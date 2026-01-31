/**
 * Caty AI V7 — Toast Hook
 */

import { useCallback } from 'react';

export function useCatyToast() {
  const showToast = useCallback((message: string, duration = 3000) => {
    const toast = document.createElement('div');
    toast.className = 'caty-toast';
    toast.textContent = message;
    toast.setAttribute('role', 'status');
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('hiding');
      setTimeout(() => toast.remove(), 200);
    }, duration);
  }, []);

  return { showToast };
}
