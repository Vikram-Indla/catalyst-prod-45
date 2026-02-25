/**
 * Product Roadmap — Gantt chart (right panel)
 */
import React, { useMemo } from 'react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { RoadmapTimelineBar } from './RoadmapTimelineBar';
import type { RoadmapInitiative, RoadmapGroup, ZoomLevel, TimelinePeriod } from './types/roadmap.types';
import { SURFACE, INK, ROW_HEIGHT, GROUP_HEADER_HEIGHT } from './constants/roadmap.constants';
import {
  startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfWeek, endOfWeek,
  addMonths, addQuarters, addWeeks, format, isWithinInterval,
  differenceInDays,
} from 'date-fns';

interface RoadmapGanttChartProps {
  groups: RoadmapGroup[];
  timelineStart: Date;
  timelineEnd: Date;
  zoom: ZoomLevel;
  selectedId: string | null;
  hoveredId: string | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}

function generatePeriods(start: Date, end: Date, zoom: ZoomLevel): TimelinePeriod[] {
  const periods: TimelinePeriod[] = [];
  const now = new Date();

  if (zoom === 'Quarter') {
    let cur = startOfQuarter(start);
    while (cur < end) {
      const qEnd = endOfQuarter(cur);
      const qNum = Math.ceil((cur.getMonth() + 1) / 3);
      periods.push({
        key: format(cur, 'yyyy-QQQ'),
        label: `Q${qNum} ${format(cur, 'yyyy')}`,
        startDate: cur,
        endDate: qEnd,
        isCurrent: isWithinInterval(now, { start: cur, end: qEnd }),
        isQuarterStart: true,
      });
      cur = addQuarters(cur, 1);
    }
  } else if (zoom === 'Week') {
    let cur = startOfWeek(start, { weekStartsOn: 0 });
    while (cur < end) {
      const wEnd = endOfWeek(cur, { weekStartsOn: 0 });
      periods.push({
        key: format(cur, 'yyyy-ww'),
        label: format(cur, 'MMM d'),
        sublabel: format(cur, 'yyyy'),
        startDate: cur,
        endDate: wEnd,
        isCurrent: isWithinInterval(now, { start: cur, end: wEnd }),
        isQuarterStart: false,
      });
      cur = addWeeks(cur, 1);
    }
  } else {
    // Month (default)
    let cur = startOfMonth(start);
    while (cur < end) {
      const mEnd = endOfMonth(cur);
      const isQStart = cur.getMonth() % 3 === 0;
      periods.push({
        key: format(cur, 'yyyy-MM'),
        label: format(cur, 'MMM'),
        sublabel: isQStart ? `Q${Math.ceil((cur.getMonth() + 1) / 3)}` : undefined,
        startDate: cur,
        endDate: mEnd,
        isCurrent: isWithinInterval(now, { start: cur, end: mEnd }),
        isQuarterStart: isQStart,
      });
      cur = addMonths(cur, 1);
    }
  }
  return periods;
}

function calcBarPosition(startDate: string, endDate: string, tlStart: Date, tlEnd: Date) {
  const s = new Date(startDate);
  const e = new Date(endDate);
  const totalDays = differenceInDays(tlEnd, tlStart) || 1;
  const left = Math.max(0, (differenceInDays(s, tlStart) / totalDays) * 100);
  const width = Math.max(1, (differenceInDays(e, s) / totalDays) * 100);
  return { left, width };
}

export function RoadmapGanttChart({ groups, timelineStart, timelineEnd, zoom, selectedId, hoveredId, onSelect, onHover }: RoadmapGanttChartProps) {
  const periods = useMemo(() => generatePeriods(timelineStart, timelineEnd, zoom), [timelineStart, timelineEnd, zoom]);

  const todayPct = useMemo(() => {
    const total = differenceInDays(timelineEnd, timelineStart) || 1;
    const pos = (differenceInDays(new Date(), timelineStart) / total) * 100;
    return pos >= 0 && pos <= 100 ? pos : null;
  }, [timelineStart, timelineEnd]);

  const periodMinWidth = zoom === 'Week' ? 80 : zoom === 'Quarter' ? 200 : 120;
  const totalMinWidth = periods.length * periodMinWidth;

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden" style={{ background: SURFACE.card }}>
      <ScrollArea className="flex-1 w-full">
        <div style={{ minWidth: totalMinWidth }}>
          {/* Header */}
          <div className="flex" style={{ height: ROW_HEIGHT, borderBottom: `1px solid ${SURFACE.border}`, background: '#FAFBFC' }}>
            {periods.map(p => (
              <div
                key={p.key}
                className="flex-shrink-0 flex flex-col items-center justify-center"
                style={{
                  minWidth: periodMinWidth,
                  width: `${100 / periods.length}%`,
                  borderRight: `1px solid ${p.isQuarterStart ? SURFACE.border : SURFACE.borderLight}`,
                  background: p.isCurrent ? 'rgba(37,99,235,0.04)' : 'transparent',
                }}
              >
                {p.sublabel && (
                  <span style={{ fontSize: 9, fontWeight: 700, color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{p.sublabel}</span>
                )}
                <span style={{ fontSize: 11, fontWeight: 600, color: INK[2] }}>{p.label}</span>
              </div>
            ))}
            {/* Year label */}
            <div className="absolute right-3" style={{ top: 4, fontSize: 11, fontWeight: 700, color: INK[4] }}>
              {timelineStart.getFullYear()}
            </div>
          </div>

          {/* Body */}
          <div className="relative">
            {/* Grid lines */}
            <div className="absolute inset-0 pointer-events-none flex">
              {periods.map(p => (
                <div
                  key={p.key}
                  className="flex-shrink-0"
                  style={{
                    minWidth: periodMinWidth,
                    width: `${100 / periods.length}%`,
                    borderRight: `1px solid ${p.isQuarterStart ? SURFACE.border : SURFACE.borderLight}`,
                    background: p.isCurrent ? 'rgba(37,99,235,0.03)' : 'transparent',
                  }}
                />
              ))}
            </div>

            {/* Today marker */}
            {todayPct !== null && (
              <div className="absolute pointer-events-none" style={{ left: `${todayPct}%`, top: 0, bottom: 0, zIndex: 20 }}>
                <div style={{ position: 'absolute', top: -2, left: '50%', transform: 'translateX(-50%)', fontSize: 9, fontWeight: 700, color: '#EF4444', background: '#FEF2F2', padding: '1px 5px', borderRadius: 3, whiteSpace: 'nowrap' }}>
                  Today
                </div>
                <div style={{ width: 1.5, height: '100%', background: 'linear-gradient(180deg, #EF4444 0%, transparent 100%)', margin: '0 auto', marginTop: 14 }} />
              </div>
            )}

            {/* Groups + Rows */}
            {groups.map(group => (
              <div key={group.key}>
                {groups.length > 1 && (
                  <div style={{ height: GROUP_HEADER_HEIGHT, background: '#FAFBFC', borderBottom: `1px solid ${SURFACE.border}` }}>
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: INK[3], paddingLeft: 16, lineHeight: `${GROUP_HEADER_HEIGHT}px` }}>
                      {group.label}
                    </span>
                  </div>
                )}
                {group.items.map(item => {
                  const pos = calcBarPosition(item.startDate, item.endDate, timelineStart, timelineEnd);
                  return (
                    <div
                      key={item.id}
                      className="relative flex items-center cursor-pointer transition-colors"
                      onMouseEnter={() => onHover(item.id)}
                      onMouseLeave={() => onHover(null)}
                      style={{
                        height: ROW_HEIGHT,
                        backgroundColor: selectedId === item.id ? 'rgba(37,99,235,0.06)' : hoveredId === item.id ? '#FAFBFC' : 'transparent',
                        borderBottom: `1px solid ${SURFACE.borderLight}`,
                      }}
                      onClick={() => onSelect(item.id)}
                    >
                      <RoadmapTimelineBar
                        item={item}
                        left={pos.left}
                        width={pos.width}
                        isSelected={selectedId === item.id}
                        isHovered={hoveredId === item.id}
                        onClick={() => onSelect(item.id)}
                      />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
