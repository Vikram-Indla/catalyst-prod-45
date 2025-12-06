import { CatalystToastType, CatalystToastAction } from '@/components/ui/catalyst-toast';

// Singleton toast state management for use outside React component tree
type ToastListener = (toast: CatalystToastItem) => void;
type DismissListener = (id: string) => void;

export interface CatalystToastItem {
  id: string;
  type: CatalystToastType;
  title: string;
  message: string;
  action?: CatalystToastAction;
  duration?: number;
}

let toastIdCounter = 0;
let toastListeners: ToastListener[] = [];
let dismissListeners: DismissListener[] = [];

export const catalystToast = {
  _subscribe: (onToast: ToastListener, onDismiss: DismissListener) => {
    toastListeners.push(onToast);
    dismissListeners.push(onDismiss);
    return () => {
      toastListeners = toastListeners.filter(l => l !== onToast);
      dismissListeners = dismissListeners.filter(l => l !== onDismiss);
    };
  },

  show: (options: Omit<CatalystToastItem, 'id'>): string => {
    const id = `catalyst-toast-${++toastIdCounter}`;
    const toast: CatalystToastItem = { id, ...options };
    toastListeners.forEach(listener => listener(toast));
    return id;
  },

  dismiss: (id: string) => {
    dismissListeners.forEach(listener => listener(id));
  },

  success: (title: string, message: string, action?: CatalystToastAction, duration?: number): string => {
    return catalystToast.show({ type: 'success', title, message, action, duration });
  },

  error: (title: string, message: string, action?: CatalystToastAction, duration?: number): string => {
    return catalystToast.show({ type: 'error', title, message, action, duration });
  },

  warning: (title: string, message: string, action?: CatalystToastAction, duration?: number): string => {
    return catalystToast.show({ type: 'warning', title, message, action, duration });
  },

  info: (title: string, message: string, action?: CatalystToastAction, duration?: number): string => {
    return catalystToast.show({ type: 'info', title, message, action, duration });
  },
};

export default catalystToast;
