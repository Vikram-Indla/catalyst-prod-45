import { CheckCircle, XCircle, AlertTriangle, Info, X } from '@/lib/atlaskit-icons';
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
    iconColor: 'var(--quality-high)',
    bgColor: 'var(--ds-background-success)',
    borderColor: 'var(--ds-background-success)',
    titleColor: 'var(--ds-background-success-bold)',
    descColor: 'var(--ds-background-success-bold)',
  },
  error: {
    icon: XCircle,
    iconColor: 'var(--ds-text-danger, var(--cp-danger))',
    bgColor: 'var(--ds-background-danger)',
    borderColor: 'var(--ds-background-danger)',
    titleColor: 'var(--ds-text-danger)',
    descColor: 'var(--ds-text-danger)',
  },
  warning: {
    icon: AlertTriangle,
    iconColor: 'var(--ds-text-warning, var(--cp-warning))',
    bgColor: 'var(--ds-background-warning)',
    borderColor: 'var(--ds-background-warning)',
    titleColor: 'var(--ds-text-warning)',
    descColor: 'var(--ds-text-warning)',
  },
  info: {
    icon: Info,
    iconColor: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))',
    bgColor: 'var(--ds-background-selected)',
    borderColor: 'var(--ds-background-information)',
    titleColor: 'var(--ds-background-brand-bold)',
    descColor: 'var(--ds-background-brand-bold-hovered)',
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
          fontFamily: 'var(--cp-font-body)',
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
                padding: 'var(--ds-space-075, 6px) var(--ds-space-150, 12px)',
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
