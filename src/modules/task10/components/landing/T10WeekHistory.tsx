// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT: T10WeekHistory
// Purpose: Collapsible past weeks section — CRITICAL FEATURE
// This component fetches week history directly from the database
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { useT10WeekHistory } from '../../hooks';
import { formatT10WeekRange } from '../../utils';

interface T10WeekHistoryProps {
  listId: string;
}

export function T10WeekHistory({ listId }: T10WeekHistoryProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // CRITICAL: Fetch past weeks from database
  const { data: pastWeeks, isLoading } = useT10WeekHistory(listId);

  // Don't render if loading or no past weeks
  if (isLoading) {
    return null;
  }

  if (!pastWeeks || pastWeeks.length === 0) {
    return null;
  }

  const toggleExpanded = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    setIsExpanded(!isExpanded);
    console.log('[T10] Week history toggled:', isExpanded ? 'collapsed' : 'expanded', '| List:', listId);
  };

  return (
    <div className="t10-week-history">
      {/* Toggle Button */}
      <button
        type="button"
        className={`t10-week-history-toggle ${isExpanded ? 't10-expanded' : ''}`}
        onClick={toggleExpanded}
        aria-expanded={isExpanded}
      >
        <ChevronDown size={16} />
        <span>Past Weeks</span>
        <span className="t10-week-history-count">{pastWeeks.length}</span>
      </button>

      {/* Expanded List */}
      {isExpanded && (
        <ul className="t10-week-history-list">
          {pastWeeks.map((week) => {
            const isComplete = week.completed_count === week.total_count && week.total_count > 0;
            
            return (
              <li 
                key={week.id} 
                className={`t10-week-history-item ${isComplete ? 't10-complete' : ''}`}
              >
                <span className="t10-week-history-date">
                  {formatT10WeekRange(week.week_start, week.week_end)}
                </span>
                <span className="t10-week-history-stats">
                  {week.completed_count}/{week.total_count} completed
                </span>
                {isComplete && (
                  <span className="t10-week-history-complete-badge">
                    <Check size={14} />
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default T10WeekHistory;
