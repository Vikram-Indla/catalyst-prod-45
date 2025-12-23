import React, { createContext, useContext, ReactNode, useEffect, useState, useCallback } from 'react';
import { CatalystToastContainer } from '@/components/ui/catalyst-toast';
import type { CatalystToastAction, CatalystToastType } from '@/components/ui/catalyst-toast';
import { catalystToast, CatalystToastItem } from '@/lib/catalystToast';

interface CatalystToastContextValue {
  showToast: (options: Omit<CatalystToastItem, 'id'>) => string;
  dismissToast: (id: string) => void;
  dismissAll: () => void;
  success: (title: string, message?: string, action?: CatalystToastAction, duration?: number) => string;
  error: (title: string, message?: string, action?: CatalystToastAction, duration?: number) => string;
  warning: (title: string, message?: string, action?: CatalystToastAction, duration?: number) => string;
  info: (title: string, message?: string, action?: CatalystToastAction, duration?: number) => string;
  loading: (title: string, message?: string) => string;
  undo: (title: string, onUndo: () => void, countdown?: number) => string;
}

const CatalystToastContext = createContext<CatalystToastContextValue | undefined>(undefined);

interface CatalystToastProviderProps {
  children: ReactNode;
  isRTL?: boolean;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  maxToasts?: number;
}

export const CatalystToastProvider: React.FC<CatalystToastProviderProps> = ({ 
  children, 
  isRTL = false,
  position = 'top-right',
  maxToasts = 5
}) => {
  const [toasts, setToasts] = useState<CatalystToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setToasts([]);
  }, []);

  // Subscribe to the singleton toast system
  useEffect(() => {
    const unsubscribe = catalystToast._subscribe(
      (newToast) => {
        setToasts((prev) => {
          const updated = [newToast, ...prev];
          return updated.slice(0, maxToasts);
        });
      },
      (id) => {
        dismissToast(id);
      }
    );
    return unsubscribe;
  }, [maxToasts, dismissToast]);

  const contextValue: CatalystToastContextValue = {
    showToast: catalystToast.show,
    dismissToast,
    dismissAll,
    success: catalystToast.success,
    error: catalystToast.error,
    warning: catalystToast.warning,
    info: catalystToast.info,
    loading: catalystToast.loading,
    undo: catalystToast.undo,
  };

  return (
    <CatalystToastContext.Provider value={contextValue}>
      {children}
      <CatalystToastContainer 
        toasts={toasts}
        onDismiss={dismissToast}
        isRTL={isRTL}
        position={position}
      />
    </CatalystToastContext.Provider>
  );
};

export const useCatalystToastContext = () => {
  const context = useContext(CatalystToastContext);
  if (!context) {
    throw new Error('useCatalystToastContext must be used within a CatalystToastProvider');
  }
  return context;
};

export default CatalystToastProvider;
