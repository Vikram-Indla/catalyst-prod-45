import React, { useEffect, useState, useCallback } from 'react';
import { X, Check, Info, AlertTriangle, Trash2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type CatalystToastType = 'info' | 'success' | 'error' | 'warning' | 'undo' | 'loading';

export interface CatalystToastAction {
  label: string;
  onClick: () => void;
}

export interface CatalystToastProps {
  id: string;
  type: CatalystToastType;
  title: string;
  message?: string;
  action?: CatalystToastAction;
  onClose: (id: string) => void;
  duration?: number;
  undoCountdown?: number;
  isRTL?: boolean;
}

// Variant configurations with Catalyst brand colors
const variantConfig: Record<CatalystToastType, {
  bg: string;
  iconBg: string;
  icon: React.ReactNode;
}> = {
  success: {
    bg: 'bg-[#0d9488]', // Teal
    iconBg: 'bg-white/20',
    icon: <Check className="w-5 h-5 text-white" />,
  },
  error: {
    bg: 'bg-red-600',
    iconBg: 'bg-white/20',
    icon: <X className="w-5 h-5 text-white" />,
  },
  warning: {
    bg: 'bg-[#f59e0b]', // Amber
    iconBg: 'bg-white/20',
    icon: <AlertTriangle className="w-5 h-5 text-white" />,
  },
  info: {
    bg: 'bg-[#2563eb]', // Blue
    iconBg: 'bg-white/20',
    icon: <Info className="w-5 h-5 text-white" />,
  },
  undo: {
    bg: 'bg-gray-900 dark:bg-gray-700',
    iconBg: 'bg-white/10',
    icon: <Trash2 className="w-5 h-5 text-white" />,
  },
  loading: {
    bg: 'bg-blue-600',
    iconBg: 'bg-white/20',
    icon: <Loader2 className="w-5 h-5 text-white animate-spin" />,
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
  undoCountdown,
  isRTL = false,
}) => {
  const [isExiting, setIsExiting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [countdown, setCountdown] = useState(undoCountdown || 0);

  const config = variantConfig[type];

  const handleClose = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => onClose(id), 200);
  }, [id, onClose]);

  // Countdown for undo toasts
  useEffect(() => {
    if (type === 'undo' && undoCountdown && !isPaused) {
      const interval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            handleClose();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [type, undoCountdown, isPaused, handleClose]);

  // Auto-dismiss timer (not for loading or undo toasts)
  useEffect(() => {
    if (duration && type !== 'loading' && type !== 'undo' && !isPaused) {
      const timer = setTimeout(handleClose, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, type, isPaused, handleClose]);

  return (
    <div
      className={cn(
        'relative flex items-center gap-3 min-w-[320px] max-w-[480px] py-3 px-4',
        'rounded-xl text-white shadow-lg',
        'motion-reduce:animate-none',
        config.bg,
        isExiting 
          ? 'animate-out fade-out slide-out-to-bottom-4 duration-200' 
          : 'animate-in fade-in slide-in-from-bottom-4 duration-300',
        isRTL ? 'rtl' : 'ltr'
      )}
      role="alert"
      aria-live={type === 'error' ? 'assertive' : 'polite'}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Icon with subtle background */}
      <div className={cn(
        'flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full',
        config.iconBg
      )}>
        {config.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white leading-tight">
          {title}
        </p>
        {message && (
          <p className="text-xs text-white/80 mt-0.5 truncate">
            {message}
          </p>
        )}
      </div>

      {/* Action Button */}
      {action && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            action.onClick();
            handleClose();
          }}
          className={cn(
            'flex-shrink-0 text-xs font-medium text-white/90 px-2 py-1',
            'bg-white/20 rounded hover:bg-white/30',
            'transition-colors duration-150',
            'focus:outline-none focus:ring-2 focus:ring-white/50'
          )}
        >
          {action.label}
        </button>
      )}

      {/* Countdown for undo */}
      {type === 'undo' && countdown > 0 && (
        <span className="flex-shrink-0 text-xs text-white/70 ml-1">
          {countdown}s
        </span>
      )}

      {/* Dismiss button (for non-auto-dismiss toasts) */}
      {(type === 'loading' || (!duration && type !== 'undo')) && (
        <button
          onClick={handleClose}
          aria-label="Dismiss notification"
          className={cn(
            'flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-md ml-1',
            'text-white/70 hover:text-white hover:bg-white/20',
            'transition-colors duration-150',
            'focus:outline-none focus:ring-2 focus:ring-white/50'
          )}
        >
          <X size={16} aria-hidden="true" />
        </button>
      )}
    </div>
  );
};

export default CatalystToast;
