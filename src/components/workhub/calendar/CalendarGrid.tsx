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
        border: '1px solid var(--wh-border)',
        borderRadius: 'var(--wh-radius-lg)',
        overflow: 'hidden',
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          borderBottom: '1px solid var(--wh-border)',
          backgroundColor: 'var(--wh-surface)',
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
              color: 'var(--wh-text-tertiary)',
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
                borderRight: (idx + 1) % 7 !== 0 ? '1px solid var(--wh-border-light)' : undefined,
                borderBottom: idx < 35 ? '1px solid var(--wh-border-light)' : undefined,
                backgroundColor: today ? 'var(--wh-primary-light)' : 'var(--wh-surface)',
                cursor: 'pointer',
                transition: 'background var(--wh-transition-fast)',
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
                    backgroundColor: today ? 'var(--wh-primary)' : undefined,
                    color: today
                      ? '#ffffff'
                      : inMonth
                        ? 'var(--wh-text-primary)'
                        : 'var(--wh-text-tertiary)',
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
        border: '1px solid var(--wh-border)',
        borderRadius: 'var(--wh-radius-lg)',
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--wh-border)', backgroundColor: 'var(--wh-surface)' }}>
        {DAY_HEADERS.map((d) => (
          <div key={d} style={{ padding: '8px 4px', textAlign: 'center', fontFamily: 'var(--wh-font-sans)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--wh-text-tertiary)', letterSpacing: '0.05em' }}>
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
              borderRight: (i + 1) % 7 !== 0 ? '1px solid var(--wh-border-light)' : undefined,
              borderBottom: i < 35 ? '1px solid var(--wh-border-light)' : undefined,
              backgroundColor: 'var(--wh-surface)',
            }}
          >
            <div
              className="animate-pulse"
              style={{
                width: 20,
                height: 14,
                borderRadius: 4,
                backgroundColor: 'var(--wh-border-light)',
                marginBottom: 8,
              }}
            />
            <div
              className="animate-pulse"
              style={{
                width: '60%',
                height: 6,
                borderRadius: 3,
                backgroundColor: 'var(--wh-border-light)',
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
