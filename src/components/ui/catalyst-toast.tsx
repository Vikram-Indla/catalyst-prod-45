/**
 * CatalystToast — Enterprise branded toast system
 * 
 * Token-based styling, supports success/info/warn/error variants
 * with icon, title, optional description, and action link.
 */

import { toast as sonnerToast, Toaster as SonnerToaster } from 'sonner';
import { CheckCircle2, AlertTriangle, XCircle, Info, ExternalLink, X } from 'lucide-react';
import { cn } from '@/lib/utils';

// ====== Legacy type exports for backwards compatibility ======
export type CatalystToastType = 'success' | 'info' | 'warning' | 'error';

export interface CatalystToastAction {
  label: string;
  onClick: () => void;
}

export interface CatalystToastItem {
  id: string;
  type: CatalystToastType;
  title: string;
  message: string;
  action?: CatalystToastAction;
  duration?: number;
  onClose?: (id: string) => void;
}

// Legacy container component for context provider
export function CatalystToastContainer({ 
  toasts, 
  isRTL = false,
  position = 'top-right',
}: { 
  toasts: CatalystToastItem[];
  isRTL?: boolean;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}) {
  const positionStyles = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
  };

  return (
    <div 
      className={cn(
        'fixed z-50 flex flex-col gap-2 pointer-events-none',
        positionStyles[position],
        isRTL && 'direction-rtl'
      )}
      style={{ maxWidth: '380px' }}
    >
      {toasts.map((toast) => (
        <LegacyToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}

function LegacyToastItem({ toast }: { toast: CatalystToastItem }) {
  const config = variantConfig[toast.type];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'pointer-events-auto flex items-start gap-3 w-full p-4 rounded-lg shadow-lg border border-l-4 animate-in slide-in-from-right-5 fade-in',
        config.borderClass
      )}
      style={{
        background: 'var(--surface-1, hsl(var(--background)))',
        borderColor: 'var(--border)',
        boxShadow: 'var(--card-shadow, 0 4px 6px -1px rgba(0, 0, 0, 0.1))',
      }}
    >
      <Icon className={cn('h-5 w-5 flex-shrink-0 mt-0.5', config.iconClass)} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">{toast.title}</p>
        {toast.message && (
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{toast.message}</p>
        )}
        {toast.action && (
          <button
            onClick={() => {
              toast.action?.onClick();
              toast.onClose?.(toast.id);
            }}
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            {toast.action.label}
            <ExternalLink className="h-3 w-3" />
          </button>
        )}
      </div>
      <button
        onClick={() => toast.onClose?.(toast.id)}
        className="flex-shrink-0 p-1 rounded hover:bg-muted transition-colors"
      >
        <X className="h-4 w-4 text-muted-foreground" />
      </button>
    </div>
  );
}

// ====== New simplified API (uses Sonner under the hood) ======
export type ToastVariant = 'success' | 'info' | 'warning' | 'error';

interface CatalystToastOptions {
  title: string;
  description?: string;
  variant?: ToastVariant;
  action?: {
    label: string;
    onClick: () => void;
  };
  duration?: number;
}

const variantConfig: Record<ToastVariant, { 
  icon: React.ElementType; 
  iconClass: string;
  borderClass: string;
  bgClass: string;
}> = {
  success: {
    icon: CheckCircle2,
    iconClass: 'text-[#5c7c5c]',
    borderClass: 'border-l-[#5c7c5c]',
    bgClass: 'bg-[#5c7c5c]/10',
  },
  info: {
    icon: Info,
    iconClass: 'text-[#c69c6d]',
    borderClass: 'border-l-[#c69c6d]',
    bgClass: 'bg-[#c69c6d]/10',
  },
  warning: {
    icon: AlertTriangle,
    iconClass: 'text-[#8b7355]',
    borderClass: 'border-l-[#8b7355]',
    bgClass: 'bg-[#8b7355]/10',
  },
  error: {
    icon: XCircle,
    iconClass: 'text-red-600 dark:text-red-400',
    borderClass: 'border-l-red-500',
    bgClass: 'bg-red-500/10',
  },
};

/**
 * Show a branded Catalyst toast notification (new API using Sonner)
 */
export function catalystToast({ 
  title, 
  description, 
  variant = 'info',
  action,
  duration = 4000,
}: CatalystToastOptions) {
  const config = variantConfig[variant];
  const Icon = config.icon;

  return sonnerToast.custom(
    (id) => (
      <div
        className={cn(
          'flex items-start gap-3 w-[360px] p-4 rounded-lg shadow-lg border border-l-4',
          config.borderClass,
          config.bgClass
        )}
        style={{
          background: 'var(--surface-1, hsl(var(--background)))',
          boxShadow: 'var(--card-shadow, 0 4px 6px -1px rgba(0, 0, 0, 0.1))',
        }}
      >
        <div className={cn('w-8 h-8 rounded-full flex items-center justify-center shrink-0', config.bgClass)}>
          <Icon className={cn('h-4 w-4 flex-shrink-0', config.iconClass)} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          {description && (
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{description}</p>
          )}
          {action && (
            <button
              onClick={() => {
                action.onClick();
                sonnerToast.dismiss(id);
              }}
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              {action.label}
              <ExternalLink className="h-3 w-3" />
            </button>
          )}
        </div>
        <button
          onClick={() => sonnerToast.dismiss(id)}
          className="flex-shrink-0 p-1 rounded hover:bg-muted transition-colors"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
    ),
    { duration }
  );
}

// Convenience methods for the new API
export const toast = {
  success: (title: string, options?: Omit<CatalystToastOptions, 'title' | 'variant'>) =>
    catalystToast({ title, variant: 'success', ...options }),
  
  info: (title: string, options?: Omit<CatalystToastOptions, 'title' | 'variant'>) =>
    catalystToast({ title, variant: 'info', ...options }),
  
  warning: (title: string, options?: Omit<CatalystToastOptions, 'title' | 'variant'>) =>
    catalystToast({ title, variant: 'warning', ...options }),
  
  error: (title: string, options?: Omit<CatalystToastOptions, 'title' | 'variant'>) =>
    catalystToast({ title, variant: 'error', ...options }),
};

/**
 * CatalystToaster — Include once in your app layout (for Sonner-based toasts)
 */
export function CatalystToaster() {
  return (
    <SonnerToaster 
      position="top-right"
      toastOptions={{
        unstyled: true,
        classNames: {
          toast: 'group',
        },
      }}
    />
  );
}
