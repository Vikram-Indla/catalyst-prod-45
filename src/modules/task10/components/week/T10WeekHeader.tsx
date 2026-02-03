// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT: T10WeekHeader
// Purpose: Week view header with navigation and action buttons (Prompt 6)
// ═══════════════════════════════════════════════════════════════════════════════

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Zap, Plus, Calendar } from 'lucide-react';
import { T10WeekSelector } from './T10WeekSelector';
import { formatT10WeekRange } from '../../utils';
import type { T10List, T10Week } from '../../types';

interface T10WeekHeaderProps {
  list: T10List;
  week: T10Week;
  allWeeks: T10Week[];
  completedCount: number;
  onWeekChange: (weekId: string) => void;
  onCheckout: () => void;
  onAddItem: () => void;
  backPath?: string;
}

export function T10WeekHeader({
  list,
  week,
  allWeeks,
  completedCount,
  onWeekChange,
  onCheckout,
  onAddItem,
  backPath = '/taskhub/task10',
}: T10WeekHeaderProps) {
  const navigate = useNavigate();

  const weekStart = week.week_start;
  const weekEnd = week.week_end;
  const weekLabel = formatT10WeekRange(weekStart, weekEnd);
  const isCurrentWeek = week.is_current ?? !week.is_checked_out;
  const hasCompletedItems = completedCount > 0;

  const handleWeekChange = (weekId: string) => {
    navigate(`/taskhub/task10/list/${list.id}/week/${weekId}`, { replace: true });
    onWeekChange(weekId);
  };

  return (
    <header className="t10-week-header-v2">
      <div className="t10-week-header-v2-top">
        {/* Left: Back + Title */}
        <div className="t10-week-header-v2-left">
          <Link to={backPath} className="t10-back-link-v2">
            <ArrowLeft size={16} />
            Back
          </Link>
          <h1 className="t10-week-header-v2-title">{list.name}</h1>
          <div className="t10-week-header-v2-subtitle">
            <span className="t10-week-header-v2-date">
              <Calendar size={16} />
              {weekLabel}
            </span>
            <span
              className={`t10-week-header-v2-status ${
                isCurrentWeek
                  ? 't10-week-header-v2-status-current'
                  : 't10-week-header-v2-status-past'
              }`}
            >
              {isCurrentWeek ? 'Current Week' : 'Past Week'}
            </span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="t10-week-header-v2-right">
          {/* Week Selector */}
          {allWeeks.length > 1 && (
            <T10WeekSelector
              weeks={allWeeks}
              currentWeekId={week.id}
              onWeekChange={handleWeekChange}
            />
          )}

          {/* Checkout Button */}
          <button
            type="button"
            className="t10-btn t10-btn-checkout"
            onClick={onCheckout}
            disabled={!hasCompletedItems}
            title={hasCompletedItems ? `Checkout ${completedCount} completed items` : 'No completed items to checkout'}
          >
            <Zap size={16} />
            Checkout
            {hasCompletedItems && ` (${completedCount})`}
          </button>

          {/* Add Item Button */}
          {isCurrentWeek && (
            <button
              type="button"
              className="t10-btn t10-btn-primary"
              onClick={onAddItem}
            >
              <Plus size={16} />
              Add
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

export default T10WeekHeader;
