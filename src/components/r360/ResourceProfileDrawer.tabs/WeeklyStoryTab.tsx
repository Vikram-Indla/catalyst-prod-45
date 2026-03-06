/**
 * WeeklyStoryTab — Week navigator + summary + 5-day timeline
 */

import { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useR360WorkItems, useR360WeeklyStats, R360_CURRENT_WEEK } from '@/hooks/useR360Profile';
import { StatusLozenge } from '../R360StatusLozenge';

interface WeeklyStoryTabProps {
  resourceId: string;
  weekOffset: number;
  onWeekOffsetChange: (offset: number) => void;
}

const SAUDI_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'] as const;

export function WeeklyStoryTab({ resourceId, weekOffset, onWeekOffsetChange }: WeeklyStoryTabProps) {
  const weekNum = Math.max(1, R360_CURRENT_WEEK + weekOffset);
  const { data: stats } = useR360WeeklyStats(resourceId, weekOffset);
  const { data: workItems = [] } = useR360WorkItems(resourceId);

  // Generate week dates (Saudi work week: Sun-Thu)
  const weekDates = useMemo(() => {
    const baseDate = new Date('2026-03-01'); // W9 Sunday
    const offsetDays = weekOffset * 7;
    return SAUDI_DAYS.map((day, i) => {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + i + offsetDays);
      return {
        dayName: day,
        date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        isToday: i === 4 && weekOffset === 0, // Thursday = today in current week
        isMostActive: i === 0,
        isWeekStart: i === 0,
      };
    });
  }, [weekOffset]);

  // Map work items to timeline entries (simplified — based on updated_at)
  const timelineByDay = useMemo(() => {
    const map: Record<number, typeof workItems> = {};
    SAUDI_DAYS.forEach((_, i) => { map[i] = []; });

    workItems.forEach((item) => {
      const updated = new Date(item.updatedAt);
      const dayOfWeek = updated.getDay(); // 0=Sunday
      if (dayOfWeek >= 0 && dayOfWeek <= 4) {
        map[dayOfWeek]?.push(item);
      }
    });
    return map;
  }, [workItems]);

  const weekLabel = weekDates.length >= 2
    ? `W${weekNum} · ${weekDates[0].date} – ${weekDates[weekDates.length - 1].date}, 2026`
    : `W${weekNum}`;

  const totalOpen = stats?.totalOpen ?? workItems.filter(i => i.status !== 'DONE').length;

  return (
    <div className="r3p-section" style={{ borderBottom: 'none' }}>
      {/* Week navigator */}
      <div className="r3p-week-nav">
        <button
          className="r3p-week-btn"
          onClick={() => onWeekOffsetChange(Math.max(-7, weekOffset - 1))}
          disabled={weekOffset <= -7}
          aria-label="Previous week"
        >
          <ChevronLeft size={12} />
        </button>
        <span className="r3p-week-label">{weekLabel}</span>
        <button
          className="r3p-week-btn"
          onClick={() => onWeekOffsetChange(Math.min(0, weekOffset + 1))}
          disabled={weekOffset >= 0}
          aria-label="Next week"
        >
          <ChevronRight size={12} />
        </button>
      </div>

      {/* Summary card */}
      <div className="r3p-card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="r3p-dot" style={{ width: 10, height: 10, background: 'var(--r3-danger)' }} />
          <span style={{ fontSize: 13, color: 'var(--tx-secondary)', flex: 1 }}>
            {stats?.closedThisWeek ?? 0} items closed, {stats?.totalTouched ?? workItems.length} touched this week.
            Backlog remains at {totalOpen} open items.
          </span>
          <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 13, fontWeight: 700, color: 'var(--r3-danger)' }}>
            {totalOpen}
          </span>
        </div>
      </div>

      {/* Timeline */}
      <div className="r3p-timeline">
        {weekDates.map((day, dayIdx) => {
          const items = timelineByDay[dayIdx] || [];
          return (
            <div key={dayIdx} className="r3p-tl-day">
              <div className={`r3p-tl-day-dot ${items.length > 0 ? 'r3p-tl-day-dot--active' : ''}`} />
              <div className="r3p-tl-day-header">
                <span className="r3p-tl-day-name">{day.dayName}</span>
                <span className="r3p-tl-day-date">{day.date}</span>
                {day.isWeekStart && (
                  <span className="r3p-tl-pill" style={{ background: 'var(--r3-primary-bg)', color: 'var(--r3-primary)' }}>
                    Week Start
                  </span>
                )}
                {day.isMostActive && items.length > 0 && (
                  <span className="r3p-tl-pill" style={{ background: 'var(--r3-success-bg)', color: 'var(--r3-success)' }}>
                    Most Active
                  </span>
                )}
                {day.isToday && (
                  <span className="r3p-tl-pill" style={{ background: 'var(--r3-primary-bg)', color: 'var(--r3-primary)' }}>
                    Today
                  </span>
                )}
              </div>

              {items.length === 0 ? (
                <div className="r3p-tl-empty">No activity recorded yet today</div>
              ) : (
                items.map((item) => (
                  <div key={item.id} className="r3p-tl-item">
                    <span className="r3p-tl-time">
                      {new Date(item.updatedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                    </span>
                    <span className="r3p-tl-key">{item.itemKey}</span>
                    <span className="r3p-tl-title">{item.title}</span>
                    <StatusLozenge status={item.status} />
                  </div>
                ))
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
