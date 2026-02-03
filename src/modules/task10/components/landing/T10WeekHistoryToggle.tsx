// ═══════════════════════════════════════════════════════════════════════════
// TASK¹⁰ WEEK HISTORY TOGGLE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import { ChevronDown, CheckCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import type { T10WeekHistory } from '../../types';

interface T10WeekHistoryToggleProps {
  weeks: T10WeekHistory[];
  onWeekClick?: (week: T10WeekHistory) => void;
}

export function T10WeekHistoryToggle({ weeks, onWeekClick }: T10WeekHistoryToggleProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (weeks.length === 0) return null;

  const formatWeekRange = (startDate: string, endDate: string) => {
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
  };

  return (
    <div className="t10-week-history">
      <button
        className={`t10-week-history-toggle ${isExpanded ? 't10-week-history-toggle--expanded' : ''}`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <ChevronDown className="t10-week-history-toggle__chevron" />
        <span>View {weeks.length} past week{weeks.length > 1 ? 's' : ''}</span>
      </button>
      
      {isExpanded && (
        <div className="t10-week-history__list">
          {weeks.map((week) => (
            <div 
              key={week.id}
              className="t10-week-history-item"
              onClick={() => onWeekClick?.(week)}
            >
              <div className="t10-week-history-item__left">
                <CheckCircle className="t10-week-history-item__check" />
                <span>{formatWeekRange(week.week_start_date, week.week_end_date)}</span>
              </div>
              <div className="t10-week-history-item__stats">
                {week.closed_count} closed · {week.carried_count} carried
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default T10WeekHistoryToggle;
