import React, { createContext, useContext, ReactNode } from 'react';
import { useCatalystToast, CatalystToastOptions, CatalystToastItem } from '@/hooks/useCatalystToast';
import { CatalystToastContainer } from '@/components/ui/catalyst-toast';
import { CatalystToastAction } from '@/components/ui/catalyst-toast';

interface CatalystToastContextValue {
  showToast: (options: CatalystToastOptions) => string;
  dismissToast: (id: string) => void;
  dismissAll: () => void;
  success: (title: string, message: string, action?: CatalystToastAction, duration?: number) => string;
  error: (title: string, message: string, action?: CatalystToastAction, duration?: number) => string;
  warning: (title: string, message: string, action?: CatalystToastAction, duration?: number) => string;
  info: (title: string, message: string, action?: CatalystToastAction, duration?: number) => string;
}

const CatalystToastContext = createContext<CatalystToastContextValue | undefined>(undefined);

interface CatalystToastProviderProps {
  children: ReactNode;
  isRTL?: boolean;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  maxToasts?: number;
}

export const CatalystToastProvider: React.FC<CatalystToastProviderProps> = ({ 
  children, 
  isRTL = false,
  position = 'top-right',
  maxToasts = 5
}) => {
  const { toasts, dismissToast, ...toastMethods } = useCatalystToast(maxToasts);

  return (
    <CatalystToastContext.Provider value={{ dismissToast, ...toastMethods }}>
      {children}
      <CatalystToastContainer 
        toasts={toasts.map(t => ({ ...t, onClose: dismissToast }))} 
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
