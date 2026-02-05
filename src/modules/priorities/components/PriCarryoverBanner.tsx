// ============================================================
// File: src/modules/priorities/components/PriCarryoverBanner.tsx
// ============================================================

import { AlertTriangle, Check } from 'lucide-react';
import styles from '../styles/priorities.module.css';

interface PriCarryoverBannerProps {
  count: number;
  onConfirm: () => void;
}

export function PriCarryoverBanner({ count, onConfirm }: PriCarryoverBannerProps) {
  if (count === 0) return null;

  return (
    <div className={styles['pri-carryover-banner']}>
      <span className={styles['pri-carryover-icon']}>
        <AlertTriangle size={18} />
      </span>
      <span className={styles['pri-carryover-text']}>
        <strong>{count} {count === 1 ? 'item' : 'items'}</strong> carried over from last week.
        Review and confirm to continue.
      </span>
      <div className={styles['pri-carryover-action']}>
        <button
          className={`${styles['pri-btn']} ${styles['pri-btn-sm']} ${styles['pri-btn-primary']}`}
          onClick={onConfirm}
        >
          <Check size={14} />
          Confirm
        </button>
      </div>
    </div>
  );
}
