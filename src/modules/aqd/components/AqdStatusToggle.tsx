/**
 * Task¹⁰ Status Toggle - Three-State Visual Component
 * States: To Do (gray) → In Progress (orange) → Completed (green)
 */
import { Check } from 'lucide-react';
import type { AqdItemStatus } from '../types/aqd.types';
import styles from '../styles/aqd.module.css';

interface AqdStatusToggleProps {
  status: AqdItemStatus;
  onClick: () => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

const STATUS_CONFIG = {
  not_started: {
    className: styles['aqd-status-todo'],
    label: 'To Do',
    nextLabel: 'Mark In Progress',
  },
  in_progress: {
    className: styles['aqd-status-progress'],
    label: 'In Progress',
    nextLabel: 'Mark Complete',
  },
  completed: {
    className: styles['aqd-status-done'],
    label: 'Completed',
    nextLabel: 'Reset to To Do',
  },
};

export function AqdStatusToggle({ status, onClick, disabled = false, size = 'md' }: AqdStatusToggleProps) {
  const config = STATUS_CONFIG[status];
  const sizeClass = size === 'sm' ? 'w-6 h-6' : 'w-7 h-7';

  return (
    <button
      type="button"
      className={`${styles['aqd-status-toggle']} ${config.className} ${sizeClass}`}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) onClick();
      }}
      disabled={disabled}
      title={config.nextLabel}
      aria-label={`Status: ${config.label}. Click to ${config.nextLabel.toLowerCase()}`}
    >
      {status === 'completed' && <Check size={14} strokeWidth={3} />}
    </button>
  );
}

export default AqdStatusToggle;
