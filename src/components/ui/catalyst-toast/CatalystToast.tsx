import React, { useEffect, useState, useCallback } from 'react';
import { X, CheckCircle, AlertTriangle, XCircle, Star, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type CatalystToastType = 'info' | 'success' | 'error' | 'warning';

export interface CatalystToastAction {
  label: string;
  onClick: () => void;
}

export interface CatalystToastProps {
  id: string;
  type: CatalystToastType;
  title: string;
  message: string;
  action?: CatalystToastAction;
  onClose: (id: string) => void;
  duration?: number;
  isRTL?: boolean;
}

const iconMap: Record<CatalystToastType, LucideIcon> = {
  info: Star,
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
};

const typeStyles = {
  info: {
    iconColor: 'text-brand-gold',
  },
  success: {
    iconColor: 'text-emerald-500',
  },
  error: {
    iconColor: 'text-red-500',
  },
  warning: {
    iconColor: 'text-amber-500',
  },
};

export const CatalystToast: React.FC<CatalystToastProps> = ({
  id,
  type,
  title,
  message,
  action,
  onClose,
  duration = 5000,
  isRTL = false,
}) => {
  const [isExiting, setIsExiting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const styles = typeStyles[type];
  const Icon = iconMap[type];

  const handleClose = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => onClose(id), 200);
  }, [id, onClose]);

  // Auto-dismiss timer
  useEffect(() => {
    if (duration && !isPaused) {
      const timer = setTimeout(handleClose, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, isPaused, handleClose]);

  return (
    <div
      className={cn(
        'relative flex items-start gap-4 px-5 py-4 min-w-[380px] max-w-[460px]',
        'bg-white rounded-xl',
        'border border-neutral-200/80',
        'shadow-[0_8px_30px_rgba(0,0,0,0.08),0_4px_12px_rgba(0,0,0,0.05)]',
        'font-sans motion-reduce:animate-none',
        isExiting ? 'animate-toast-out' : 'animate-toast-in',
        isRTL ? 'rtl' : 'ltr'
      )}
      role="alert"
      aria-live={type === 'error' ? 'assertive' : 'polite'}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Icon */}
      <div className="flex-shrink-0 pt-0.5">
        <Icon size={28} className={cn(styles.iconColor, 'stroke-[1.5]')} aria-hidden="true" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pt-0.5">
        <p className="text-[15px] font-semibold text-neutral-900 leading-tight mb-1">
          {title}
        </p>
        <p className="text-[13px] text-neutral-500 leading-relaxed">
          {message}
        </p>
        
        {action && (
          <div className="mt-2.5">
            <button
              onClick={action.onClick}
              className={cn(
                'text-[13px] font-medium text-brand-gold',
                'bg-transparent border-none cursor-pointer p-0',
                'hover:text-brand-gold-dark hover:underline',
                'transition-all duration-150 ease-out',
                'focus:outline-none focus:ring-2 focus:ring-brand-gold focus:ring-offset-2 rounded'
              )}
            >
              {action.label}
            </button>
          </div>
        )}
      </div>

      {/* Close Button */}
      <button
        onClick={handleClose}
        aria-label="Dismiss notification"
        className={cn(
          'flex-shrink-0 w-6 h-6 flex items-center justify-center',
          'bg-transparent border-none cursor-pointer rounded-md',
          'text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100',
          'transition-all duration-150 ease-out',
          'focus:outline-none focus:ring-2 focus:ring-brand-gold focus:ring-offset-2'
        )}
      >
        <X size={18} strokeWidth={1.5} aria-hidden="true" />
      </button>
    </div>
  );
};

export default CatalystToast;
