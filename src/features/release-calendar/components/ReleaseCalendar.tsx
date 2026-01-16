/**
 * Release Calendar - Main Component
 * Combines all calendar components
 */

import React, { useState, useMemo } from 'react';
import { CalendarHeader } from './CalendarHeader';
import { CalendarAIInsights } from './CalendarAIInsights';
import { CalendarGrid } from './CalendarGrid';
import { CalendarRelease, TimeScale, ConflictWarning, CalendarInsight } from '../types';
import { getViewBounds, navigateView, formatViewTitle, detectConflicts, generateInsights } from '../utils/calendarUtils';

interface ReleaseCalendarProps {
  releases: CalendarRelease[];
  onReleaseClick?: (release: CalendarRelease) => void;
}

export function ReleaseCalendar({ releases, onReleaseClick }: ReleaseCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [scale, setScale] = useState<TimeScale>('month');
  const [showDependencies, setShowDependencies] = useState(false);

  const { start: viewStart, end: viewEnd } = useMemo(
    () => getViewBounds(currentDate, scale),
    [currentDate, scale]
  );

  const viewTitle = useMemo(
    () => formatViewTitle(currentDate, scale),
    [currentDate, scale]
  );

  // Filter releases that overlap with current view
  const visibleReleases = useMemo(() => {
    return releases.filter(r => {
      const releaseStart = new Date(r.startDate);
      const releaseEnd = new Date(r.targetDate);
      return releaseEnd >= viewStart && releaseStart <= viewEnd;
    });
  }, [releases, viewStart, viewEnd]);

  // Detect conflicts
  const conflicts: ConflictWarning[] = useMemo(
    () => detectConflicts(visibleReleases),
    [visibleReleases]
  );

  // Generate insights
  const insights: CalendarInsight[] = useMemo(
    () => generateInsights(visibleReleases),
    [visibleReleases]
  );

  const handlePrev = () => {
    setCurrentDate(navigateView(currentDate, scale, 'prev'));
  };

  const handleNext = () => {
    setCurrentDate(navigateView(currentDate, scale, 'next'));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <CalendarHeader
        title={viewTitle}
        scale={scale}
        onScaleChange={setScale}
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={handleToday}
      />

      <div className="max-w-[1600px] mx-auto px-6 py-6">
        <CalendarAIInsights
          insights={insights}
          conflicts={conflicts}
        />

        <CalendarGrid
          releases={visibleReleases}
          viewStart={viewStart}
          viewEnd={viewEnd}
          scale={scale}
          showDependencies={showDependencies}
          onReleaseClick={onReleaseClick}
        />
      </div>
    </div>
  );
}
