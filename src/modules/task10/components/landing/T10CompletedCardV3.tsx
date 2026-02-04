// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT: T10CompletedCardV3
// Purpose: Card for completed week in the Completed tab
// ═══════════════════════════════════════════════════════════════════════════════

import React from 'react';
import { Check, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { T10CompletedWeekView } from '../../types/listCards';

interface T10CompletedCardV3Props {
  week: T10CompletedWeekView;
  onClick: () => void;
}

export function T10CompletedCardV3({ week, onClick }: T10CompletedCardV3Props) {
  const formatDateRange = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    const sMonth = s.toLocaleDateString('en-US', { month: 'short' });
    const sDay = s.getDate();
    const eMonth = e.toLocaleDateString('en-US', { month: 'short' });
    const eDay = e.getDate();
    const year = e.getFullYear();
    
    if (sMonth === eMonth) {
      return `${sMonth} ${sDay} - ${eDay}, ${year}`;
    }
    return `${sMonth} ${sDay} - ${eMonth} ${eDay}, ${year}`;
  };

  const formatCheckoutDate = (date: string | null) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const getStatusBadge = () => {
    if (week.completion_rate === 100) {
      return { text: 'Perfect', className: 't10-status-badge--success' };
    }
    if (week.completion_rate >= 70) {
      return { text: 'Good', className: 't10-status-badge--info' };
    }
    return { text: 'Partial', className: 't10-status-badge--warning' };
  };

  const badge = getStatusBadge();

  return (
    <div
      onClick={onClick}
      className="t10-completed-card"
    >
      {/* Left: Check Icon */}
      <div className="t10-completed-card__icon">
        <Check className="w-5 h-5" strokeWidth={2.5} />
      </div>

      {/* Content */}
      <div className="t10-completed-card__content">
        <div className="t10-completed-card__header">
          <span className="t10-key-badge t10-key-badge--small">{week.list_key}</span>
          <span className="t10-completed-card__name">{week.list_name}</span>
        </div>
        <div className="t10-completed-card__meta">
          {formatDateRange(week.week_start, week.week_end)}
          {week.checkout_at && (
            <>
              <span className="t10-completed-card__dot">·</span>
              <span>Checked out {formatCheckoutDate(week.checkout_at)}</span>
            </>
          )}
        </div>
      </div>

      {/* Right: Stats */}
      <div className="t10-completed-card__stats">
        <div className={cn(
          "t10-completed-card__rate",
          week.completion_rate === 100 ? "text-green-600" : "text-blue-600"
        )}>
          {week.completion_rate}%
        </div>
        <div className="t10-completed-card__counts">
          {week.completed_count}/{week.total_count} done
        </div>
      </div>

      {/* Status Badge */}
      <span className={cn("t10-status-badge", badge.className)}>
        {badge.text}
      </span>

      {/* Chevron */}
      <ChevronRight className="w-4 h-4 text-slate-400" />
    </div>
  );
}
