// ============================================================
// File: src/modules/priorities/components/PriToastContainer.tsx
// ============================================================

import { X, CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react';
import type { PriToast } from '../types';
import styles from '../styles/priorities.module.css';

interface PriToastContainerProps {
  toasts: PriToast[];
  onDismiss: (id: string) => void;
}

const ICONS = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
};

export function PriToastContainer({ toasts, onDismiss }: PriToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className={styles['pri-toast-container']}>
      {toasts.map((toast) => {
        const Icon = ICONS[toast.type];
        return (
          <div
            key={toast.id}
            className={`${styles['pri-toast']} ${styles[`pri-toast-${toast.type}`]}`}
          >
            <Icon size={16} />
            <span>{toast.message}</span>
            <button
              className={styles['pri-toast-dismiss']}
              onClick={() => onDismiss(toast.id)}
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
