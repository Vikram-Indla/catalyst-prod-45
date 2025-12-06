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
    borderGradient: 'bg-gradient-to-b from-brand-gold to-brand-gold-dark',
    iconBg: 'bg-brand-gold/10',
    iconColor: 'text-brand-gold-dark',
  },
  success: {
    borderGradient: 'bg-gradient-to-b from-toast-success-border to-toast-success-border-dark',
    iconBg: 'bg-toast-success-bg',
    iconColor: 'text-toast-success-icon',
  },
  error: {
    borderGradient: 'bg-gradient-to-b from-toast-error-border to-toast-error-border-dark',
    iconBg: 'bg-toast-error-bg',
    iconColor: 'text-toast-error-icon',
  },
  warning: {
    borderGradient: 'bg-gradient-to-b from-toast-warning-border to-toast-warning-border-dark',
    iconBg: 'bg-toast-warning-bg',
    iconColor: 'text-toast-warning-icon',
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
        'relative flex items-start gap-3 p-4 pr-5 min-w-[360px] max-w-[450px]',
        'bg-gradient-to-br from-white to-neutral-50 rounded-xl',
        'border border-neutral-200 overflow-hidden',
        'shadow-[0_4px_12px_rgba(0,0,0,0.15),0_2px_4px_rgba(0,0,0,0.1)]',
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
      {/* Left Accent Bar */}
      <div
        className={cn(
          'absolute top-0 bottom-0 w-1 rounded-l-xl',
          styles.borderGradient,
          isRTL ? 'right-0 rounded-l-none rounded-r-xl' : 'left-0'
        )}
        aria-hidden="true"
      />

      {/* Icon Container */}
      <div
        className={cn(
          'flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg',
          styles.iconBg
        )}
      >
        <Icon size={24} className={styles.iconColor} aria-hidden="true" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pt-0.5">
        <p className="text-[15px] font-semibold text-catalyst-black leading-tight mb-1">
          {title}
        </p>
        <p className="text-[13px] text-toast-message leading-relaxed">
          {message}
        </p>
        
        {action && (
          <div className="mt-3">
            <button
              onClick={action.onClick}
              className={cn(
                'text-[13px] font-medium text-brand-gold-dark',
                'bg-transparent border-none cursor-pointer p-0',
                'hover:text-catalyst-black hover:underline',
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
          'absolute top-2 w-7 h-7 flex items-center justify-center',
          'bg-transparent border-none cursor-pointer rounded',
          'text-toast-close hover:text-catalyst-black hover:bg-neutral-100',
          'transition-all duration-150 ease-out',
          'focus:outline-none focus:ring-2 focus:ring-brand-gold focus:ring-offset-2',
          isRTL ? 'left-2' : 'right-2'
        )}
      >
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  );
};

export default CatalystToast;
