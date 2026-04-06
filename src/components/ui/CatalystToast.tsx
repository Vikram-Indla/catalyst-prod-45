import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { toast as sonnerToast } from 'sonner';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface CatalystToastOptions {
  title?: string;
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const toastConfig = {
  success: {
    icon: CheckCircle,
    iconColor: '#059669',
    bgColor: 'var(--tint-green-soft, #ECFDF5)',
    borderColor: '#A7F3D0',
    titleColor: '#065F46',
    descColor: '#047857',
  },
  error: {
    icon: XCircle,
    iconColor: '#DC2626',
    bgColor: 'var(--tint-red, #FEF2F2)',
    borderColor: '#FECACA',
    titleColor: '#991B1B',
    descColor: '#B91C1C',
  },
  warning: {
    icon: AlertTriangle,
    iconColor: '#D97706',
    bgColor: '#FFFBEB',
    borderColor: '#FDE68A',
    titleColor: '#92400E',
    descColor: '#B45309',
  },
  info: {
    icon: Info,
    iconColor: '#2563EB',
    bgColor: 'var(--tint-blue, #EFF6FF)',
    borderColor: '#BFDBFE',
    titleColor: '#1E40AF',
    descColor: '#1D4ED8',
  },
};

export const showCatalystToast = (
  type: ToastType,
  message: string,
  options?: CatalystToastOptions
) => {
  const config = toastConfig[type];
  const Icon = config.icon;

  sonnerToast.custom(
    (id) => (
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          padding: '14px 16px',
          backgroundColor: config.bgColor,
          border: `1px solid ${config.borderColor}`,
          borderRadius: 12,
          boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          minWidth: 320,
          maxWidth: 420,
          fontFamily: 'Inter, sans-serif',
        }}
      >
        <Icon size={20} style={{ color: config.iconColor, flexShrink: 0, marginTop: 1 }} />

        <div style={{ flex: 1, minWidth: 0 }}>
          {options?.title && (
            <div style={{ fontSize: 14, fontWeight: 600, color: config.titleColor, marginBottom: 2 }}>
              {options.title}
            </div>
          )}
          <div style={{ fontSize: 13, color: config.descColor, lineHeight: 1.5 }}>
            {message}
          </div>

          {options?.action && (
            <button
              onClick={() => {
                options.action?.onClick();
                sonnerToast.dismiss(id);
              }}
              style={{
                marginTop: 10,
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 600,
                color: config.iconColor,
                backgroundColor: 'transparent',
                border: `1.5px solid ${config.iconColor}`,
                borderRadius: 6,
                cursor: 'pointer',
              }}
            >
              {options.action.label}
            </button>
          )}
        </div>

        <button
          onClick={() => sonnerToast.dismiss(id)}
          style={{
            width: 24,
            height: 24,
            padding: 0,
            border: 'none',
            backgroundColor: 'transparent',
            color: config.descColor,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0.6,
            flexShrink: 0,
          }}
        >
          <X size={14} />
        </button>
      </div>
    ),
    {
      duration: options?.duration || 4000,
      position: 'top-right',
    }
  );
};

export const catalystToast = {
  success: (message: string, options?: CatalystToastOptions) =>
    showCatalystToast('success', message, options),
  error: (message: string, options?: CatalystToastOptions) =>
    showCatalystToast('error', message, options),
  warning: (message: string, options?: CatalystToastOptions) =>
    showCatalystToast('warning', message, options),
  info: (message: string, options?: CatalystToastOptions) =>
    showCatalystToast('info', message, options),
};
