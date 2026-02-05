// ============================================================
// File: src/modules/priorities/components/PriStatusToggle.tsx
// ============================================================

import { Check } from 'lucide-react';
import type { PriItemStatus } from '../types';
import { getStatusLabel, getStatusClass } from '../utils';
import styles from '../styles/priorities.module.css';

interface PriStatusToggleProps {
  status: PriItemStatus;
  onToggle: () => void;
  size?: 'sm' | 'md';
}

export function PriStatusToggle({ status, onToggle, size = 'md' }: PriStatusToggleProps) {
  const statusClass = `pri-status-${getStatusClass(status)}`;

  return (
    <button
      className={`${styles['pri-status-toggle']} ${styles[statusClass]}`}
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      aria-label={`Status: ${getStatusLabel(status)}. Click to change.`}
      style={size === 'sm' ? { width: 20, height: 20 } : undefined}
    >
      {status === 'completed' && <Check size={size === 'sm' ? 12 : 14} />}
      <span className={styles['pri-status-tooltip']}>
        {getStatusLabel(status)}
      </span>
    </button>
  );
}
