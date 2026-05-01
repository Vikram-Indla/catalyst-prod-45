/**
 * CalendarGrid — Shared month grid for Release + Resource views
 * 7-column layout with day cells, events rendered via renderCell prop
 */

import React from 'react';
import type { CalendarEvent } from '@/types/workhub.types';
import {
  getMonthGridDates,
  isToday,
  isCurrentMonth,
  toDateString,
  getEventsForDate,
} from '@/lib/workhub/calendarHelpers';

const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface CalendarGridProps {
  year: number;
  month: number;
  events: CalendarEvent[];
  renderCell: (date: Date, dayEvents: CalendarEvent[]) => React.ReactNode;
  onDateClick?: (dateStr: string, dayEvents: CalendarEvent[]) => void;
}

export function CalendarGrid({ year, month, events, renderCell, onDateClick }: CalendarGridProps) {
  const dates = getMonthGridDates(year, month);

  return (
    <div
      style={{
        border: '1px solid var(--divider)',
        borderRadius: 'var(--wh-radius-lg)',
        overflow: 'hidden',
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          borderBottom: '1px solid var(--divider)',
          backgroundColor: 'var(--cp-float)',
        }}
      >
        {DAY_HEADERS.map((d) => (
          <div
            key={d}
            style={{
              padding: '8px 4px',
              textAlign: 'center',
              fontFamily: 'var(--wh-font-sans)',
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase' as const,
              color: 'var(--fg-4)',
              letterSpacing: '0.05em',
            }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Grid cells */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {dates.map((date, idx) => {
          const dateStr = toDateString(date);
          const dayEvents = getEventsForDate(events, dateStr);
          const today = isToday(date);
          const inMonth = isCurrentMonth(date, year, month);

          return (
            <div
              key={idx}
              onClick={() => onDateClick?.(dateStr, dayEvents)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') onDateClick?.(dateStr, dayEvents);
              }}
              style={{
                minHeight: 100,
                padding: '4px 6px',
                borderRight: (idx + 1) % 7 !== 0 ? '1px solid var(--bg-1)' : undefined,
                borderBottom: idx < 35 ? '1px solid var(--bg-1)' : undefined,
                backgroundColor: today ? 'var(--cp-primary-5)' : 'var(--cp-float)',
                cursor: 'pointer',
                transition: 'background 150ms',
                outline: 'none',
              }}
              onFocus={(e) => {
                (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--wh-shadow-focus)';
              }}
              onBlur={(e) => {
                (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
              }}
            >
              {/* Day number */}
              <div style={{ marginBottom: 4 }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: today ? 28 : undefined,
                    height: today ? 28 : undefined,
                    borderRadius: today ? '50%' : undefined,
                    backgroundColor: today ? 'var(--cp-blue)' : undefined,
                    color: today
                      ? 'var(--ds-text-inverse, #ffffff)'
                      : inMonth
                        ? 'var(--fg-1)'
                        : 'var(--fg-4)',
                    fontFamily: 'var(--wh-font-sans)',
                    fontSize: 13,
                    fontWeight: 500,
                  }}
                >
                  {date.getDate()}
                </span>
              </div>

              {/* Render cell content */}
              {renderCell(date, dayEvents)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Loading skeleton for the grid */
export function CalendarGridSkeleton() {
  return (
    <div
      style={{
        border: '1px solid var(--divider)',
        borderRadius: 'var(--wh-radius-lg)',
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--divider)', backgroundColor: 'var(--cp-float)' }}>
        {DAY_HEADERS.map((d) => (
          <div key={d} style={{ padding: '8px 4px', textAlign: 'center', fontFamily: 'var(--wh-font-sans)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--fg-4)', letterSpacing: '0.05em' }}>
            {d}
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {Array.from({ length: 42 }).map((_, i) => (
          <div
            key={i}
            style={{
              minHeight: 100,
              padding: '4px 6px',
              borderRight: (i + 1) % 7 !== 0 ? '1px solid var(--bg-1)' : undefined,
              borderBottom: i < 35 ? '1px solid var(--bg-1)' : undefined,
              backgroundColor: 'var(--cp-float)',
            }}
          >
            <div
              className="animate-pulse"
              style={{
                width: 20,
                height: 14,
                borderRadius: 4,
                backgroundColor: 'var(--bg-1)',
                marginBottom: 8,
              }}
            />
            <div
              className="animate-pulse"
              style={{
                width: '60%',
                height: 6,
                borderRadius: 4,
                backgroundColor: 'var(--bg-1)',
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
