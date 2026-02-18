// =====================================================
// TIMELINE TIME HEADER — Dual-row time axis
// =====================================================

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useTimelineState } from '@/hooks/producthub/useTimelineState';
import { getColumns, getParentGroups, isCurrentPeriod, COLUMN_WIDTHS } from './timelineUtils';

interface TimelineTimeHeaderProps {
  scrollLeft: number;
}

export const TimelineTimeHeader: React.FC<TimelineTimeHeaderProps> = ({ scrollLeft }) => {
  const { granularity } = useTimelineState();

  const columns = useMemo(() => getColumns(granularity), [granularity]);
  const parentGroups = useMemo(() => getParentGroups(granularity), [granularity]);
  const colWidth = COLUMN_WIDTHS[granularity];

  return (
    <div className="h-16 border-b border-border shrink-0 overflow-hidden">
      <div
        className="h-full"
        style={{ transform: `translateX(-${scrollLeft}px)` }}
      >
        {/* Row 1: Parent labels */}
        <div className="h-7 flex">
          {parentGroups.map((pg, i) => (
            <div
              key={`${pg.label}-${i}`}
              className="flex items-center justify-center border-r border-border/50 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
              style={{ width: pg.span * colWidth }}
            >
              {pg.label}
            </div>
          ))}
        </div>

        {/* Row 2: Period labels */}
        <div className="h-9 flex">
          {columns.map((col, i) => {
            const isCurrent = isCurrentPeriod(col.start, granularity);
            return (
              <div
                key={i}
                className={cn(
                  'flex items-center justify-center border-r border-border/50 text-[12px] font-medium',
                  isCurrent
                    ? 'text-blue-600 font-semibold dark:text-blue-400'
                    : 'text-foreground/70'
                )}
                style={{ width: colWidth }}
              >
                {col.label}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TimelineTimeHeader;
