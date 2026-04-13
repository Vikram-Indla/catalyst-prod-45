import { CatalystToastType, CatalystToastAction } from '@/components/ui/catalyst-toast';

// Singleton toast state management for use outside React component tree
type ToastListener = (toast: CatalystToastItem) => void;
type DismissListener = (id: string) => void;

export interface CatalystToastItem {
  id: string;
  type: CatalystToastType;
  title: string;
  message?: string;
  action?: CatalystToastAction;
  actions?: CatalystToastAction[];
  duration?: number;
  undoCountdown?: number;
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

  success: (title: string, message?: string, action?: CatalystToastAction, duration?: number): string => {
    return catalystToast.show({ type: 'success', title, message, action, duration: duration ?? 4000 });
  },

  error: (title: string, message?: string, action?: CatalystToastAction, duration?: number): string => {
    return catalystToast.show({ type: 'error', title, message, action, duration: duration ?? 5000 });
  },

  warning: (title: string, message?: string, action?: CatalystToastAction, duration?: number): string => {
    return catalystToast.show({ type: 'warning', title, message, action, duration: duration ?? 4000 });
  },

  info: (title: string, message?: string, action?: CatalystToastAction, duration?: number): string => {
    return catalystToast.show({ type: 'info', title, message, action, duration: duration ?? 4000 });
  },

  loading: (title: string, message?: string): string => {
    return catalystToast.show({ type: 'loading', title, message });
  },

  undo: (title: string, onUndo: () => void, countdown: number = 5): string => {
    return catalystToast.show({
      type: 'undo',
      title,
      undoCountdown: countdown,
      action: { label: 'Undo', onClick: onUndo },
    });
  },
};

export default catalystToast;
