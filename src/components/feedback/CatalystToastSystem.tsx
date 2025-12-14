/**
 * Catalyst Toast System - Atlassian-aligned feedback component
 * Provides consistent toast notifications across the app
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import { X, CheckCircle2, AlertTriangle, AlertCircle, Info, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading';

export interface CatalystToast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  dismissible?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastItemProps {
  toast: CatalystToast;
  onDismiss: (id: string) => void;
}

const iconMap: Record<ToastType, React.ComponentType<{ className?: string }>> = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
  loading: Loader2,
};

const typeStyles: Record<ToastType, { bg: string; border: string; icon: string }> = {
  success: {
    bg: 'bg-card',
    border: 'border-l-4 border-l-success',
    icon: 'text-success',
  },
  error: {
    bg: 'bg-card',
    border: 'border-l-4 border-l-destructive',
    icon: 'text-destructive',
  },
  warning: {
    bg: 'bg-card',
    border: 'border-l-4 border-l-warning',
    icon: 'text-warning',
  },
  info: {
    bg: 'bg-card',
    border: 'border-l-[3px] border-l-[var(--accent-color)]',
    icon: 'text-brand-gold',
  },
  loading: {
    bg: 'bg-card',
    border: 'border-l-4 border-l-muted-foreground',
    icon: 'text-muted-foreground',
  },
};

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const [isExiting, setIsExiting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  const Icon = iconMap[toast.type];
  const styles = typeStyles[toast.type];
  
  const handleDismiss = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => onDismiss(toast.id), 150);
  }, [onDismiss, toast.id]);
  
  useEffect(() => {
    if (toast.type === 'loading' || !toast.duration || isPaused) return;
    
    const timer = setTimeout(handleDismiss, toast.duration);
    return () => clearTimeout(timer);
  }, [toast.duration, toast.type, isPaused, handleDismiss]);
  
  return (
    <div
      data-ui="Toast"
      role="status"
      aria-live="polite"
      className={cn(
        'relative flex items-start gap-3 p-4 rounded-lg shadow-lg',
        'w-[360px] max-w-[calc(100vw-32px)]',
        'transition-all duration-150 ease-out',
        styles.bg,
        styles.border,
        'border border-border',
        isExiting ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0',
        'animate-in slide-in-from-right-4 fade-in-0'
      )}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Icon */}
      <div className={cn('shrink-0 mt-0.5', styles.icon)}>
        <Icon className={cn('h-5 w-5', toast.type === 'loading' && 'animate-spin')} />
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground leading-5">
          {toast.title}
        </p>
        {toast.message && (
          <p className="text-sm text-muted-foreground mt-1 leading-5">
            {toast.message}
          </p>
        )}
        {toast.action && (
          <button
            onClick={toast.action.onClick}
            className="mt-2 text-sm font-medium text-brand-gold hover:text-brand-gold-hover transition-colors"
          >
            {toast.action.label}
          </button>
        )}
      </div>
      
      {/* Dismiss button */}
      {toast.dismissible !== false && toast.type !== 'loading' && (
        <button
          onClick={handleDismiss}
          className="shrink-0 p-1 -m-1 text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

// Toast container component
interface ToastContainerProps {
  toasts: CatalystToast[];
  onDismiss: (id: string) => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center';
}

export function ToastContainer({ 
  toasts, 
  onDismiss, 
  position = 'top-right' 
}: ToastContainerProps) {
  const positionClasses = useMemo(() => {
    switch (position) {
      case 'top-left':
        return 'top-4 left-4';
      case 'bottom-right':
        return 'bottom-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'top-center':
        return 'top-4 left-1/2 -translate-x-1/2';
      default:
        return 'top-4 right-4';
    }
  }, [position]);
  
  if (toasts.length === 0) return null;
  
  return (
    <div
      className={cn(
        'fixed z-[100] flex flex-col gap-2',
        positionClasses
      )}
      aria-label="Notifications"
    >
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

// Hook for managing toasts
let toastIdCounter = 0;

export function useToasts() {
  const [toasts, setToasts] = useState<CatalystToast[]>([]);
  
  const addToast = useCallback((toast: Omit<CatalystToast, 'id'>) => {
    const id = `toast-${++toastIdCounter}`;
    setToasts(prev => [...prev, { ...toast, id, duration: toast.duration ?? 5000 }]);
    return id;
  }, []);
  
  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);
  
  const dismissAll = useCallback(() => {
    setToasts([]);
  }, []);
  
  // Convenience methods
  const success = useCallback((title: string, message?: string) => {
    return addToast({ type: 'success', title, message });
  }, [addToast]);
  
  const error = useCallback((title: string, message?: string) => {
    return addToast({ type: 'error', title, message });
  }, [addToast]);
  
  const warning = useCallback((title: string, message?: string) => {
    return addToast({ type: 'warning', title, message });
  }, [addToast]);
  
  const info = useCallback((title: string, message?: string) => {
    return addToast({ type: 'info', title, message });
  }, [addToast]);
  
  const loading = useCallback((title: string, message?: string) => {
    return addToast({ type: 'loading', title, message, dismissible: false });
  }, [addToast]);
  
  return {
    toasts,
    addToast,
    dismissToast,
    dismissAll,
    success,
    error,
    warning,
    info,
    loading,
  };
}

export default ToastContainer;
