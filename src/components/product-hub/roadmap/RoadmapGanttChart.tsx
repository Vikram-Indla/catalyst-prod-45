/**
 * Product Roadmap — Gantt chart (right panel)
 * Fixes: swim lane headers always shown, matching list panel
 */
import React, { useMemo } from 'react';
import { RoadmapTimelineBar } from './RoadmapTimelineBar';
import type { RoadmapGroup, ZoomLevel, TimelinePeriod } from './types/roadmap.types';
import { TYPE_COLORS, SURFACE, INK, ROW_HEIGHT, GROUP_HEADER_HEIGHT } from './constants/roadmap.constants';
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
        startDate: cur, endDate: qEnd,
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
        startDate: cur, endDate: wEnd,
        isCurrent: isWithinInterval(now, { start: cur, end: wEnd }),
        isQuarterStart: false,
      });
      cur = addWeeks(cur, 1);
    }
  } else {
    // Month zoom
    let cur = startOfMonth(start);
    while (cur < end) {
      const mEnd = endOfMonth(cur);
      const isQStart = cur.getMonth() % 3 === 0;
      const qNum = Math.ceil((cur.getMonth() + 1) / 3);
      const nowQ = Math.ceil((now.getMonth() + 1) / 3);
      const isCurrentQ = qNum === nowQ && cur.getFullYear() === now.getFullYear();
      periods.push({
        key: format(cur, 'yyyy-MM'),
        label: format(cur, 'MMM'),
        sublabel: isQStart ? `Q${qNum}` : undefined,
        startDate: cur, endDate: mEnd,
        isCurrent: isWithinInterval(now, { start: cur, end: mEnd }),
        isQuarterStart: isQStart,
        isCurrentQuarter: isCurrentQ,
      } as any);
      cur = addMonths(cur, 1);
    }
  }
  return periods;
}

function calcBarPosition(startDate: string, endDate: string, tlStart: Date, tlEnd: Date) {
  const s = new Date(startDate);
  const e = new Date(endDate);
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return { left: 5, width: 8 };
  const totalDays = differenceInDays(tlEnd, tlStart) || 1;
  const left = Math.max(0, (differenceInDays(s, tlStart) / totalDays) * 100);
  const width = Math.max(2, (differenceInDays(e, s) / totalDays) * 100);
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
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden roadmap-scroll" style={{ background: SURFACE.card }}>
      <div className="flex-1 overflow-auto roadmap-scroll">
        <div style={{ minWidth: totalMinWidth }}>
          {/* Sticky header */}
          <div
            className="flex sticky top-0"
            style={{ height: ROW_HEIGHT, borderBottom: `1px solid ${SURFACE.border}`, background: '#FAFBFC', zIndex: 15 }}
          >
            {periods.map(p => {
              const isCurrentQ = (p as any).isCurrentQuarter;
              return (
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
                    <span style={{
                      fontSize: 9, fontWeight: 700,
                      color: isCurrentQ ? '#2563EB' : '#94A3B8',
                      textTransform: 'uppercase', letterSpacing: '0.05em',
                    }}>
                      {p.sublabel}
                    </span>
                  )}
                  <span style={{
                    fontSize: 12, fontWeight: p.isCurrent ? 700 : 500,
                    color: p.isCurrent ? '#2563EB' : '#64748B', letterSpacing: '0.02em',
                  }}>
                    {p.label}
                  </span>
                </div>
              );
            })}
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
                <div style={{
                  position: 'absolute', top: -2, left: '50%', transform: 'translateX(-50%)',
                  fontSize: 10, fontWeight: 700, color: '#FFFFFF', background: '#EF4444',
                  padding: '2px 8px', borderRadius: 4, whiteSpace: 'nowrap', textTransform: 'uppercase',
                }}>
                  Today
                </div>
                <div style={{
                  width: 2, height: '100%', margin: '0 auto', marginTop: 18,
                  background: 'linear-gradient(180deg, #EF4444 0%, rgba(239,68,68,0.15) 100%)',
                }} />
              </div>
            )}

            {/* Groups + Rows */}
            {groups.map((group, gi) => {
              const typeColor = TYPE_COLORS[group.key]?.solid || group.color || '#64748B';
              return (
                <div key={group.key}>
                  {/* Swim lane group header — ALWAYS shown, matching list panel */}
                  <div
                    className="flex items-center gap-2 px-3 relative"
                    style={{
                      height: GROUP_HEADER_HEIGHT,
                      background: '#F8FAFC',
                      borderBottom: `1px solid ${SURFACE.borderLight}`,
                      borderTop: gi > 0 ? `1px solid ${SURFACE.border}` : 'none',
                      zIndex: 10,
                    }}
                  >
                    <div style={{
                      width: 10, height: 10, borderRadius: 2.5, flexShrink: 0,
                      background: `linear-gradient(135deg, ${typeColor}, ${typeColor}dd)`,
                    }} />
                    <span style={{
                      fontSize: 10, fontWeight: 700, color: '#64748B',
                      textTransform: 'uppercase', letterSpacing: '0.04em',
                    }}>
                      {group.label}
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 600, color: '#94A3B8', marginLeft: 'auto' }}>
                      {group.items.length}
                    </span>
                  </div>

                  {group.items.map(item => {
                    const pos = calcBarPosition(item.startDate, item.endDate, timelineStart, timelineEnd);
                    return (
                      <div
                        key={item.id}
                        className="relative flex items-center cursor-pointer"
                        onMouseEnter={() => onHover(item.id)}
                        onMouseLeave={() => onHover(null)}
                        style={{
                          height: ROW_HEIGHT,
                          minHeight: ROW_HEIGHT,
                          maxHeight: ROW_HEIGHT,
                          backgroundColor: selectedId === item.id ? 'rgba(37,99,235,0.06)' : hoveredId === item.id ? '#FAFBFC' : 'transparent',
                          borderBottom: `1px solid ${SURFACE.borderLight}`,
                          transition: 'background-color 0.15s ease',
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
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
