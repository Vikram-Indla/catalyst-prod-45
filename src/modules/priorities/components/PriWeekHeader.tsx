// ============================================================
// File: src/modules/priorities/components/PriWeekHeader.tsx
// ============================================================

import { ChevronLeft, ChevronRight, LogOut } from 'lucide-react';
import type { PriListFull, PriWeekFull } from '../types';
import { formatWeekRange } from '../utils';
import styles from '../styles/priorities.module.css';

interface PriWeekHeaderProps {
  list: PriListFull;
  week: PriWeekFull;
  onPrevWeek?: () => void;
  onNextWeek?: () => void;
  onCheckout: () => void;
  isCurrentWeek: boolean;
  hasPrevWeek?: boolean;
  hasNextWeek?: boolean;
}

export function PriWeekHeader({
  list, week, onPrevWeek, onNextWeek, onCheckout,
  isCurrentWeek, hasPrevWeek = false, hasNextWeek = false,
}: PriWeekHeaderProps) {
  return (
    <div className={styles['pri-week-header']}>
      <div className={styles['pri-week-header-left']}>
        {/* Week navigation */}
        <div className={styles['pri-week-nav']}>
          <button
            className={styles['pri-week-nav-btn']}
            onClick={onPrevWeek}
            disabled={!hasPrevWeek}
            aria-label="Previous week"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            className={styles['pri-week-nav-btn']}
            onClick={onNextWeek}
            disabled={!hasNextWeek}
            aria-label="Next week"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <div>
          <div className={styles['pri-week-title']}>{list.title}</div>
          <div className={styles['pri-week-range']}>
            Week of {formatWeekRange(week.week_start, week.week_end)}
          </div>
        </div>

        {/* Owner */}
        {list.owner_name && (
          <div className={styles['pri-week-owner']}>
            <span className={styles['pri-week-owner-avatar']} />
            {list.owner_name}
          </div>
        )}
      </div>

      <div className={styles['pri-week-header-right']}>
        {/* Stats */}
        <div className={styles['pri-week-stats']}>
          <span className={styles['pri-week-stat']}>
            <span className={styles['pri-week-stat-dot']} style={{ background: 'var(--pri-gray-300)' }} />
            {week.todo_count} To Do
          </span>
          <span className={styles['pri-week-stat']}>
            <span className={styles['pri-week-stat-dot']} style={{ background: 'var(--pri-warning)' }} />
            {week.in_progress_count} In Progress
          </span>
          <span className={styles['pri-week-stat']}>
            <span className={styles['pri-week-stat-dot']} style={{ background: 'var(--pri-success)' }} />
            {week.completed_count} Done
          </span>
        </div>

        {/* Checkout button */}
        {isCurrentWeek && week.status === 'active' && (
          <button
            className={`${styles['pri-btn']} ${styles['pri-btn-checkout']}`}
            onClick={onCheckout}
          >
            <LogOut size={14} />
            Checkout Week
          </button>
        )}
      </div>
    </div>
  );
}
