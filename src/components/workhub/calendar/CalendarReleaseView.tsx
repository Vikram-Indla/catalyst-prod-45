/**
 * CalendarReleaseView — Release deadlines + work item dots on the month grid
 */

import React from 'react';
import type { CalendarEvent } from '@/types/workhub.types';
import { CalendarGrid, CalendarGridSkeleton } from './CalendarGrid';
import { CalendarDays } from 'lucide-react';
import { getMonthName } from '@/lib/workhub/calendarHelpers';

interface Props {
  year: number;
  month: number;
  events: CalendarEvent[];
  isLoading: boolean;
  onDateClick: (dateStr: string, dayEvents: CalendarEvent[]) => void;
}

export function CalendarReleaseView({ year, month, events, isLoading, onDateClick }: Props) {
  const filtered = events.filter((e) => e.event_type === 'release' || e.event_type === 'workitem');

  if (isLoading) return <CalendarGridSkeleton />;

  if (filtered.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 24px', color: 'var(--wh-text-tertiary)', fontFamily: 'var(--wh-font-sans)' }}>
        <CalendarDays style={{ width: 48, height: 48, marginBottom: 16, color: 'var(--wh-text-tertiary)' }} />
        <p style={{ fontSize: 14, margin: 0 }}>No release deadlines or work items due in {getMonthName(month)} {year}</p>
      </div>
    );
  }

  const renderCell = (_date: Date, dayEvents: CalendarEvent[]) => {
    const releases = dayEvents.filter((e) => e.event_type === 'release');
    const workitems = dayEvents.filter((e) => e.event_type === 'workitem');
    const maxVisible = 2;
    const totalExtra = Math.max(0, releases.length - maxVisible) + Math.max(0, workitems.length - 4);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Release bars */}
        {releases.slice(0, maxVisible).map((r) => (
          <div key={r.entity_id} style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <div
              style={{
                height: 6,
                width: '100%',
                backgroundColor: r.event_color,
                borderRadius: 3,
              }}
            />
            <span
              style={{
                fontSize: 10,
                color: r.event_color,
                fontFamily: 'var(--wh-font-sans)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {r.event_title}
            </span>
          </div>
        ))}

        {/* Work item dots */}
        {workitems.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 2 }}>
            {workitems.slice(0, 4).map((w) => (
              <div
                key={w.entity_id}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  backgroundColor: w.event_color,
                }}
              />
            ))}
          </div>
        )}

        {/* Overflow */}
        {totalExtra > 0 && (
          <span style={{ fontSize: 10, color: 'var(--wh-primary)', fontFamily: 'var(--wh-font-sans)', fontWeight: 500 }}>
            +{totalExtra} more
          </span>
        )}
      </div>
    );
  };

  return (
    <div>
      <CalendarGrid
        year={year}
        month={month}
        events={filtered}
        renderCell={renderCell}
        onDateClick={onDateClick}
      />

      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 0', fontFamily: 'var(--wh-font-sans)', fontSize: 11, color: 'var(--wh-text-secondary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 16, height: 6, borderRadius: 3, backgroundColor: 'var(--wh-primary)' }} />
          <span>Releases</span>
        </div>
        <span style={{ color: 'var(--wh-text-tertiary)' }}>·</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'var(--wh-primary)' }} />
          <span>Work Items</span>
        </div>
      </div>
    </div>
  );
}
