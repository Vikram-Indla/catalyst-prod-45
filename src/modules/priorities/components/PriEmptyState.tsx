// ============================================================
// File: src/modules/priorities/components/PriEmptyState.tsx
// ============================================================

import { CheckSquare, Plus } from 'lucide-react';
import styles from '../styles/priorities.module.css';

interface PriEmptyStateProps {
  type: 'lists' | 'items';
  onAction?: () => void;
}

const CONTENT = {
  lists: {
    icon: CheckSquare,
    title: 'Build your weekly rhythm',
    text: 'Create a priority list for each workstream to track the 10 most critical items each week. Stay focused, carry over unfinished work, and checkout at the end of each cycle.',
    actionLabel: 'Create Priority List',
  },
  items: {
    icon: CheckSquare,
    title: 'No priorities yet',
    text: 'Add your first priority to start tracking the most important work for this week.',
    actionLabel: 'Add Priority',
  },
};

export function PriEmptyState({ type, onAction }: PriEmptyStateProps) {
  const content = CONTENT[type];
  const Icon = content.icon;

  return (
    <div className={styles['pri-empty-state']}>
      <div className={styles['pri-empty-icon']}>
        <Icon size={28} />
      </div>
      <h3 className={styles['pri-empty-title']}>{content.title}</h3>
      <p className={styles['pri-empty-text']}>{content.text}</p>
      {onAction && (
        <button
          className={`${styles['pri-btn']} ${styles['pri-btn-primary']}`}
          onClick={onAction}
        >
          <Plus size={15} />
          {content.actionLabel}
        </button>
      )}
    </div>
  );
}
