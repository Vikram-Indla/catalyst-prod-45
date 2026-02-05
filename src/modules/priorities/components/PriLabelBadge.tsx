// ============================================================
// File: src/modules/priorities/components/PriLabelBadge.tsx
// ============================================================

import type { PriLabelSummary } from '../types';
import styles from '../styles/priorities.module.css';

interface PriLabelBadgeProps {
  label: PriLabelSummary;
  onRemove?: () => void;
}

export function PriLabelBadge({ label, onRemove }: PriLabelBadgeProps) {
  return (
    <span
      className={styles['pri-label']}
      style={{ color: label.color, borderColor: label.color }}
    >
      {label.name}
      {onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'inherit', padding: 0, fontSize: 11, lineHeight: 1,
          }}
          aria-label={`Remove ${label.name} label`}
        >
          ×
        </button>
      )}
    </span>
  );
}
