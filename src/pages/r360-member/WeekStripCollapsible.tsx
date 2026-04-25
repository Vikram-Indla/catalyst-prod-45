/**
 * R360 Collapsible Week Strip — V12 Redesign
 * Extracted from R360MemberDetail.tsx
 */
import React, { useState, useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import type { R360WorkItem } from '@/types/r360';
import { getSaudiWorkDays, getWeekCells } from './helpers';
import type { PeriodType } from './helpers';

export function WeekStripCollapsible({
  periodType, onPeriodTypeChange, weekOffset, onNavigatePeriod, period,
  weekItems, allOpenItems, allStaleItems, counts, statusFilter, setStatusFilter,
  selectedDay, onDaySelect,
}: {
  periodType: PeriodType;
  onPeriodTypeChange: (t: PeriodType) => void;
  weekOffset: number;
  onNavigatePeriod: (dir: -1 | 1) => void;
  period: { start: Date; end: Date; label: string; range: string };
  weekItems: R360WorkItem[];
  allOpenItems: R360WorkItem[];
  allStaleItems: R360WorkItem[];
  counts: { all: number; to_do: number; in_progress: number; in_qa: number; done: number; blocked: number };
  statusFilter: string | null;
  setStatusFilter: (s: string | null) => void;
  selectedDay: string | null;
  onDaySelect: (day: string | null) => void;
}) {
  const { isDark } = useTheme();
  const [expanded, setExpanded] = useState(false);
  // selectedDay is lifted from parent -- not local

  // Week-scoped stats: recalculate from weekItems for the SELECTED period
  const weekOpenItems = weekItems.filter(i => i.status_category !== 'done');
  const openCount = weekOpenItems.length;
  const staleCount = weekOpenItems.filter(i => (i.age_days || 0) > 14).length;
  const doneCount = counts.done;
  const touchedCount = weekItems.filter(i => i.status_category !== 'to_do').length;
  const totalCount = weekItems.length;
  const isLive = weekOffset === 0;
  const today = new Date();

  const dayCells = useMemo(() => periodType === 'weekly' ? getSaudiWorkDays(period.start) : getWeekCells(period.start), [periodType, period.start]);

  return (
    <div style={{ padding: '10px 0', borderBottom: `1px solid ${isDark ? '#292929' : '#F1F5F9'}` }}>
      {/* Top toolbar: Toggle + Date + Mode Badge + Nav arrows */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' as const }}>
        {/* Prominent Period Toggle */}
        <div className="r3-period-toggle">
          <button className={periodType === 'weekly' ? 'active' : ''} onClick={() => onPeriodTypeChange('weekly')}>Weekly</button>
          <button className={periodType === 'monthly' ? 'active' : ''} onClick={() => onPeriodTypeChange('monthly')}>Monthly</button>
        </div>

        <div style={{ width: '1px', height: '20px', background: isDark ? '#2E2E2E' : '#E2E8F0' }} />
        <span style={{ fontSize: '13px', fontWeight: 700, color: isDark ? '#EDEDED' : '#0F172A' }}>{'\u{1F4C5}'} {period.label}</span>
        <span style={{ fontSize: '13px', fontWeight: 500, color: isDark ? '#A1A1A1' : '#334155' }}>{period.range}</span>

        {/* Mode Badge */}
        <span className={`r3-mode-badge ${isLive ? 'live' : 'snapshot'}`}>
          {isLive ? 'LIVE' : 'SNAPSHOT'}
        </span>

        <button style={{ width: '28px', height: '28px', border: `1px solid ${isDark ? '#2E2E2E' : '#E2E8F0'}`, borderRadius: '4px', background: isDark ? '#1A1A1A' : '#FFF', cursor: 'pointer', fontSize: '13px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transition: 'background var(--cp-duration-fast, 0.15s) ease' }} onClick={() => onNavigatePeriod(-1)}
          onMouseEnter={e => { e.currentTarget.style.background = isDark ? '#1F1F1F' : 'rgba(15,23,42,0.04)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = isDark ? '#1A1A1A' : '#FFF'; }}
        >{'\u2039'}</button>
        <button style={{ width: '28px', height: '28px', border: `1px solid ${isDark ? '#2E2E2E' : '#E2E8F0'}`, borderRadius: '4px', background: isDark ? '#1A1A1A' : '#FFF', cursor: 'pointer', fontSize: '13px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transition: 'background var(--cp-duration-fast, 0.15s) ease' }} onClick={() => onNavigatePeriod(1)}
          onMouseEnter={e => { e.currentTarget.style.background = isDark ? '#1F1F1F' : 'rgba(15,23,42,0.04)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = isDark ? '#1A1A1A' : '#FFF'; }}
        >{'\u203A'}</button>

        <div style={{ width: '1px', height: '20px', background: isDark ? '#2E2E2E' : '#E2E8F0', margin: '0 4px' }} />
        {/* Status filter tabs */}
        {([
          { key: null, label: `All (${counts.all})` },
          { key: 'to_do', label: `To Do (${counts.to_do})` },
          { key: 'in_progress', label: `In Progress (${counts.in_progress})` },
        ] as const).map(f => {
          const isActive = statusFilter === f.key || (f.key === null && !statusFilter);
          return (
            <span key={f.key ?? 'all'} onClick={() => setStatusFilter(statusFilter === f.key ? null : f.key)} style={{
              padding: '5px 14px', fontSize: '12.5px', fontWeight: isActive ? 600 : 500,
              borderRadius: '6px', cursor: 'pointer', transition: 'all var(--cp-duration-fast, 0.15s) ease',
              background: isActive ? 'rgba(37,99,235,0.10)' : 'transparent',
              color: isActive ? '#2563EB' : (isDark ? '#A1A1A1' : '#64748B'),
              border: 'none',
            }}
            onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = isDark ? '#1F1F1F' : 'rgba(15,23,42,0.04)'; }}
            onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = isActive ? 'rgba(37,99,235,0.10)' : 'transparent'; }}
            >{f.label}</span>
          );
        })}
        <span style={{ marginLeft: 'auto', fontSize: '12.5px', color: isDark ? '#878787' : '#64748B', fontFamily: 'var(--cp-font-mono)' }}>{weekItems.length} items</span>
      </div>

      {/* Collapsible Week Strip */}
      <div className="r3-week-strip">
        {/* Summary bar -- 44px collapsed */}
        <div className="r3-week-strip-summary" onClick={() => setExpanded(!expanded)}>
          <span className="r3-week-strip-left">
            {openCount} open &middot; {staleCount} stale &middot; {doneCount} done
          </span>
          <div className="r3-week-strip-center">
            <div className="r3-week-strip-bar-track">
              <div className="r3-week-strip-bar-fill" style={{ width: `${totalCount > 0 ? (touchedCount / totalCount) * 100 : 0}%` }} />
            </div>
            <span className="r3-week-strip-label">{touchedCount} of {totalCount} touched</span>
          </div>
          <div className={`r3-week-strip-chevron ${expanded ? 'open' : ''}`}>
            <ChevronDown size={16} />
          </div>
        </div>

        {/* Expandable grid */}
        <div className={`r3-week-strip-grid ${expanded ? 'open' : ''} ${periodType}`}>
          {dayCells.map((cell, i) => {
            const isToday = periodType === 'weekly' && cell.date.toDateString() === today.toDateString();
            const isFuture = cell.date > today;
            const cellDateStr2 = cell.date.toISOString().slice(0, 10);
            const isSelected = selectedDay === cellDateStr2;
            const dateStr = cell.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            // Y = total open items for the member (constant across all days)
            const openItems = weekItems.filter(it => it.status_category !== 'done');
            const dayY = openItems.length;
            // X = items that had activity (updated_at) on this specific day
            const cellDateStr = cell.date.toISOString().slice(0, 10);
            const dayX = isFuture ? 0 : weekItems.filter(it => {
              const updStr = it.updated_at?.slice(0, 10);
              return updStr === cellDateStr;
            }).length;
            return (
              <div
                key={i}
                className={`r3-day-cell ${isToday ? 'today' : ''} ${isFuture ? 'future' : ''} ${isSelected ? 'selected' : ''}`}
                onClick={(e) => { e.stopPropagation(); if (!isFuture) onDaySelect(isSelected ? null : cellDateStr2); }}
              >
                <div>
                  <div className="r3-day-cell-name">{periodType === 'weekly' ? cell.name : (cell as any).label}</div>
                  <div className="r3-day-cell-date">{dateStr}</div>
                </div>
                <div className="r3-day-cell-right">
                  {isFuture ? (
                    <span className="r3-day-cell-count">&mdash;</span>
                  ) : (
                    <>
                      <div className="r3-day-cell-minibar">
                        <div className="r3-day-cell-minibar-fill" style={{ width: `${dayY > 0 ? (dayX / dayY) * 100 : 0}%` }} />
                      </div>
                      <span className="r3-day-cell-count">{dayX}/{dayY}</span>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
