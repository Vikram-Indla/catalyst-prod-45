// =====================================================
// TIMELINE GRID — Main timeline grid container
// =====================================================

import React, { useRef, useCallback, useState, useMemo, useEffect } from 'react';
import type { TimelineInitiative } from '@/types/producthub/initiative';
import { DENSITY_MAP } from '@/types/producthub/initiative';
import { useTimelineState } from '@/hooks/producthub/useTimelineState';
import { TimelineTimeHeader } from './TimelineTimeHeader';
import { TimelineBar } from './TimelineBar';
import { TimelineTodayLine } from './TimelineTodayLine';
import { TimelineDateCursor } from './TimelineDateCursor';
import { getTotalWidth, dateToX, xToDate, getColumns, COLUMN_WIDTHS } from './timelineUtils';

interface GroupData {
  name: string;
  items: TimelineInitiative[];
  count: number;
}

interface TimelineGridProps {
  initiatives: TimelineInitiative[];
  groups: GroupData[];
  isLoading: boolean;
  leftScrollRef: React.RefObject<HTMLDivElement>;
}

export const TimelineGrid: React.FC<TimelineGridProps> = ({
  initiatives,
  groups,
  isLoading,
  leftScrollRef,
}) => {
  const { granularity, density, groupBy, collapsedGroups } = useTimelineState();
  const bodyRef = useRef<HTMLDivElement>(null);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [cursorX, setCursorX] = useState(0);
  const [cursorDate, setCursorDate] = useState(new Date());
  const [showCursor, setShowCursor] = useState(false);
  const rafRef = useRef<number>(0);

  const totalWidth = useMemo(() => getTotalWidth(granularity), [granularity]);
  const columns = useMemo(() => getColumns(granularity), [granularity]);
  const colWidth = COLUMN_WIDTHS[granularity];
  const { row: rowHeight } = DENSITY_MAP[density];
  const isGrouped = groupBy !== 'none' && groups.length > 0;

  // Build row list: interleave group headers + items
  const rowList = useMemo(() => {
    if (!isGrouped) {
      return initiatives.map(item => ({ type: 'item' as const, initiative: item }));
    }

    const rows: ({ type: 'group'; name: string; count: number } | { type: 'item'; initiative: TimelineInitiative })[] = [];
    for (const group of groups) {
      rows.push({ type: 'group', name: group.name, count: group.count });
      if (!collapsedGroups.has(group.name)) {
        for (const item of group.items) {
          rows.push({ type: 'item', initiative: item });
        }
      }
    }
    return rows;
  }, [initiatives, groups, isGrouped, collapsedGroups]);

  // Total grid height
  const gridHeight = useMemo(() => {
    return rowList.reduce((h, row) => h + (row.type === 'group' ? 36 : rowHeight), 0);
  }, [rowList, rowHeight]);

  // Scroll sync: body → left panel (vertical) & header (horizontal)
  const handleScroll = useCallback(() => {
    if (!bodyRef.current) return;
    const { scrollLeft: sl, scrollTop } = bodyRef.current;
    setScrollLeft(sl);

    // Sync left panel vertical scroll
    if (leftScrollRef.current) {
      leftScrollRef.current.scrollTop = scrollTop;
    }
  }, [leftScrollRef]);

  // Sync left panel scroll → body
  useEffect(() => {
    const leftEl = leftScrollRef.current;
    if (!leftEl) return;

    const syncFromLeft = () => {
      if (bodyRef.current) {
        bodyRef.current.scrollTop = leftEl.scrollTop;
      }
    };

    leftEl.addEventListener('scroll', syncFromLeft, { passive: true });
    return () => leftEl.removeEventListener('scroll', syncFromLeft);
  }, [leftScrollRef]);

  // Scroll to today on mount + on toolbar "Today" button
  const scrollToToday = useCallback(() => {
    if (!bodyRef.current) return;
    const x = dateToX(new Date(), granularity);
    const containerWidth = bodyRef.current.clientWidth;
    bodyRef.current.scrollLeft = Math.max(0, x - containerWidth * 0.25);
  }, [granularity]);

  useEffect(() => {
    scrollToToday();
  }, [scrollToToday]);

  // Listen for toolbar "Today" button event
  useEffect(() => {
    const handler = () => scrollToToday();
    window.addEventListener('timeline-scroll-today', handler);
    return () => window.removeEventListener('timeline-scroll-today', handler);
  }, [scrollToToday]);

  // Mouse move for date cursor
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!bodyRef.current) return;
    const rect = bodyRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + bodyRef.current.scrollLeft;
    setCursorX(x);
    setCursorDate(xToDate(x, granularity));
    setShowCursor(true);
  }, [granularity]);

  const handleMouseLeave = useCallback(() => {
    setShowCursor(false);
  }, []);

  // Scroll to specific bar
  const scrollToBar = useCallback((id: string) => {
    if (!bodyRef.current) return;
    const barEl = bodyRef.current.querySelector(`[data-bar-id="${id}"]`) as HTMLElement | null;
    if (!barEl) return;
    const barLeft = barEl.offsetLeft;
    const barWidth = barEl.offsetWidth;
    const containerWidth = bodyRef.current.clientWidth;
    bodyRef.current.scrollLeft = barLeft + barWidth / 2 - containerWidth / 2;
  }, []);

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Time header */}
      <TimelineTimeHeader scrollLeft={scrollLeft} />

      {/* Grid body */}
      <div
        ref={bodyRef}
        data-timeline-body
        className="flex-1 overflow-auto min-h-0"
        onScroll={handleScroll}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <div className="relative" style={{ width: totalWidth, height: gridHeight }}>
          {/* Column grid lines */}
          {columns.map((_, i) => (
            <div
              key={i}
              className="absolute top-0 bottom-0 border-r border-border"
              style={{ left: (i + 1) * colWidth }}
            />
          ))}

          {/* Row backgrounds */}
          {(() => {
            let y = 0;
            return rowList.map((row, idx) => {
              const currentY = y;
              const h = row.type === 'group' ? 36 : rowHeight;
              y += h;

              if (row.type === 'group') {
                return (
                  <div
                    key={`grp-${row.name}`}
                    className="absolute left-0 right-0 bg-muted/70 border-b border-border/30"
                    style={{ top: currentY, height: 36 }}
                  />
                );
              }

              return (
                <div
                  key={`row-bg-${idx}`}
                  className="absolute left-0 right-0 border-b border-border/20"
                  style={{
                    top: currentY,
                    height: rowHeight,
                    backgroundColor: idx % 2 === 1 ? 'rgba(250,250,250,0.5)' : undefined,
                  }}
                />
              );
            });
          })()}

          {/* Bars */}
          {(() => {
            let y = 0;
            let itemIndex = 0;
            return rowList.map((row, idx) => {
              const currentY = y;
              if (row.type === 'group') {
                y += 36;
                return null;
              }
              y += rowHeight;
              const barIdx = itemIndex++;
              return (
                <div
                  key={row.initiative.id}
                  className="absolute left-0"
                  style={{ top: currentY, width: totalWidth, height: rowHeight }}
                >
                  <TimelineBar initiative={row.initiative} rowIndex={barIdx} />
                </div>
              );
            });
          })()}

          {/* Today line */}
          <TimelineTodayLine granularity={granularity} gridHeight={gridHeight} />

          {/* Date cursor */}
          <TimelineDateCursor
            x={cursorX}
            date={cursorDate}
            gridHeight={gridHeight}
            visible={showCursor}
          />
        </div>
      </div>
    </div>
  );
};

export default TimelineGrid;
