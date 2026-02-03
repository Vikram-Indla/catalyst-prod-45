// ═══════════════════════════════════════════════════════════════════════════
// TASK¹⁰ WEEK HEADER COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

import { ArrowLeft, Calendar, CheckSquare } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import type { T10WeekRow, T10ListRow } from '../../types';

interface T10WeekHeaderProps {
  list: T10ListRow;
  week: T10WeekRow;
  completedCount: number;
  totalCount: number;
  onBack: () => void;
  onCheckout?: () => void;
}

export function T10WeekHeader({ 
  list, 
  week, 
  completedCount, 
  totalCount, 
  onBack,
  onCheckout,
}: T10WeekHeaderProps) {
  const weekStart = parseISO(week.week_start_date);
  const weekEnd = parseISO(week.week_end_date);
  const dateRange = `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;

  return (
    <div className="t10-week-header">
      <div className="t10-week-header__left">
        <button className="t10-back-btn" onClick={onBack}>
          <ArrowLeft className="t10-back-btn__icon" />
        </button>
        
        <div className="t10-week-header__info">
          <div className="t10-week-header__breadcrumb">
            <span className="t10-week-header__list-key">{list.list_key}</span>
            <span className="t10-week-header__separator">/</span>
            <span className="t10-week-header__list-name">{list.name}</span>
          </div>
          
          <div className="t10-week-header__date-row">
            <Calendar className="t10-week-header__date-icon" />
            <span className="t10-week-header__date">{dateRange}</span>
            <span className="t10-week-header__badge">Current Week</span>
          </div>
        </div>
      </div>
      
      <div className="t10-week-header__right">
        <div className="t10-week-header__stats">
          <span className="t10-week-header__stats-value">{completedCount}</span>
          <span className="t10-week-header__stats-separator">/</span>
          <span className="t10-week-header__stats-total">{totalCount}</span>
          <span className="t10-week-header__stats-label">completed</span>
        </div>
        
        {!week.is_checked_out && onCheckout && (
          <button className="t10-btn t10-btn--primary" onClick={onCheckout}>
            <CheckSquare className="t10-btn__icon" />
            Checkout Week
          </button>
        )}
        
        {week.is_checked_out && (
          <span className="t10-week-header__checked-out">
            ✓ Week checked out
          </span>
        )}
      </div>
    </div>
  );
}

export default T10WeekHeader;
