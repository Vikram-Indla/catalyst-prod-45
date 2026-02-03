// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT: T10WeekSelector
// Purpose: Previous/Next week navigation (Prompt 6)
// ═══════════════════════════════════════════════════════════════════════════════

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { T10Week } from '../../types';

interface T10WeekSelectorProps {
  weeks: T10Week[];
  currentWeekId: string;
  onWeekChange: (weekId: string) => void;
}

export function T10WeekSelector({ weeks, currentWeekId, onWeekChange }: T10WeekSelectorProps) {
  // Sort weeks by week_start descending (newest first)
  const sortedWeeks = [...weeks].sort(
    (a, b) => new Date(b.week_start_date || b.week_start).getTime() - new Date(a.week_start_date || a.week_start).getTime()
  );

  const currentIndex = sortedWeeks.findIndex(w => w.id === currentWeekId);
  const hasPrev = currentIndex < sortedWeeks.length - 1; // Older week exists
  const hasNext = currentIndex > 0; // Newer week exists

  const handlePrev = () => {
    if (hasPrev) {
      const prevWeek = sortedWeeks[currentIndex + 1];
      onWeekChange(prevWeek.id);
      console.log('[T10] Week selector: Previous week', prevWeek.week_start_date || prevWeek.week_start);
    }
  };

  const handleNext = () => {
    if (hasNext) {
      const nextWeek = sortedWeeks[currentIndex - 1];
      onWeekChange(nextWeek.id);
      console.log('[T10] Week selector: Next week', nextWeek.week_start_date || nextWeek.week_start);
    }
  };

  // Get week number for display
  const totalWeeks = sortedWeeks.length;
  const weekNumber = totalWeeks - currentIndex;

  return (
    <div className="t10-week-selector-nav">
      <button
        type="button"
        className="t10-week-selector-btn"
        onClick={handlePrev}
        disabled={!hasPrev}
        aria-label="Previous week"
      >
        <ChevronLeft size={14} />
        Prev
      </button>

      <span className="t10-week-selector-current">
        Week {weekNumber} of {totalWeeks}
      </span>

      <button
        type="button"
        className="t10-week-selector-btn"
        onClick={handleNext}
        disabled={!hasNext}
        aria-label="Next week"
      >
        Next
        <ChevronRight size={14} />
      </button>
    </div>
  );
}

export default T10WeekSelector;
