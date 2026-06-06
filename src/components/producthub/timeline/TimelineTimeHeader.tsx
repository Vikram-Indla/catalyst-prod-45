// =====================================================
// TIMELINE TIME HEADER — Dual-row time axis (sticky)
// =====================================================

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useTimelineState } from '@/hooks/producthub/useTimelineState';
import { getColumns, getParentGroups, isCurrentPeriod, COLUMN_WIDTHS, getTotalWidth } from './timelineUtils';

interface TimelineTimeHeaderProps {
  scrollLeft: number;
}

export const TimelineTimeHeader: React.FC<TimelineTimeHeaderProps> = ({ scrollLeft }) => {
  const { granularity } = useTimelineState();

  const columns = useMemo(() => getColumns(granularity), [granularity]);
  const parentGroups = useMemo(() => getParentGroups(granularity), [granularity]);
  const colWidth = COLUMN_WIDTHS[granularity];
  const totalWidth = useMemo(() => getTotalWidth(granularity), [granularity]);

  return (
    <div className="h-16 border-b border-border shrink-0 overflow-hidden sticky top-0 z-20 bg-background">
      <div
        style={{ width: totalWidth, transform: `translateX(-${scrollLeft}px)` }}
      >
        {/* Row 1: Parent labels (28px) */}
        <div className="h-7 flex bg-muted/50 border-b border-border">
          {parentGroups.map((pg, i) => (
            <div
              key={`${pg.label}-${i}`}
              className="flex items-center justify-center border-r border-border text-muted-foreground"
              style={{
                width: pg.span * colWidth,
                fontSize: 11,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {pg.label}
            </div>
          ))}
        </div>

        {/* Row 2: Period labels (36px) */}
        <div className="h-9 flex bg-background border-b border-border">
          {columns.map((col, i) => {
            const isCurrent = isCurrentPeriod(col.start, granularity);
            return (
              <div
                key={i}
                className={cn(
                  'flex items-center justify-center border-r border-border',
                  isCurrent
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-foreground/70'
                )}
                style={{
                  width: colWidth,
                  fontSize: 12,
                  fontWeight: isCurrent ? 600 : 500,
                }}
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
