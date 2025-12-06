import { useState, useCallback } from 'react';
import { CatalystToastType, CatalystToastAction } from '@/components/ui/catalyst-toast';

let toastIdCounter = 0;

export interface CatalystToastOptions {
  type: CatalystToastType;
  title: string;
  message: string;
  action?: CatalystToastAction;
  duration?: number;
}

export interface CatalystToastItem extends CatalystToastOptions {
  id: string;
}

export const useCatalystToast = (maxToasts = 5) => {
  const [toasts, setToasts] = useState<CatalystToastItem[]>([]);

  const showToast = useCallback((options: CatalystToastOptions) => {
    const id = `catalyst-toast-${++toastIdCounter}`;
    const newToast: CatalystToastItem = { id, ...options };

    setToasts((prev) => {
      const updated = [newToast, ...prev];
      return updated.slice(0, maxToasts);
    });

    return id;
  }, [maxToasts]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setToasts([]);
  }, []);

  // Convenience methods
  const success = useCallback((title: string, message: string, action?: CatalystToastAction, duration?: number) => {
    return showToast({ type: 'success', title, message, action, duration });
  }, [showToast]);

  const error = useCallback((title: string, message: string, action?: CatalystToastAction, duration?: number) => {
    return showToast({ type: 'error', title, message, action, duration });
  }, [showToast]);

  const warning = useCallback((title: string, message: string, action?: CatalystToastAction, duration?: number) => {
    return showToast({ type: 'warning', title, message, action, duration });
  }, [showToast]);

  const info = useCallback((title: string, message: string, action?: CatalystToastAction, duration?: number) => {
    return showToast({ type: 'info', title, message, action, duration });
  }, [showToast]);

  return {
    toasts,
    showToast,
    dismissToast,
    dismissAll,
    success,
    error,
    warning,
    info,
  };
};

export default useCatalystToast;
