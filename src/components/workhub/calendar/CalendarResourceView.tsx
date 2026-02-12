/**
 * CalendarResourceView — Shows WHO is working on WHAT each day
 * Uses CalendarGrid with avatar dots
 */

import React, { useState, useMemo } from 'react';
import { Users } from 'lucide-react';
import type { CalendarEvent } from '@/types/workhub.types';
import { CalendarGrid, CalendarGridSkeleton } from './CalendarGrid';
import { AvatarChip } from '../shared/AvatarChip';
import { getMonthName } from '@/lib/workhub/calendarHelpers';

interface Props {
  year: number;
  month: number;
  events: CalendarEvent[];
  isLoading: boolean;
  onDateClick: (dateStr: string, dayEvents: CalendarEvent[]) => void;
}

export function CalendarResourceView({ year, month, events, isLoading, onDateClick }: Props) {
  const workItems = useMemo(() => events.filter((e) => e.event_type === 'workitem' && e.assignee_user_id), [events]);
  const [filterAssignee, setFilterAssignee] = useState<string | null>(null);

  // Unique team members
  const teamMembers = useMemo(() => {
    const map = new Map<string, { id: string; name: string; color: string }>();
    workItems.forEach((e) => {
      if (e.assignee_user_id && !map.has(e.assignee_user_id)) {
        map.set(e.assignee_user_id, { id: e.assignee_user_id, name: e.assignee_name || 'Unknown', color: e.event_color });
      }
    });
    return Array.from(map.values());
  }, [workItems]);

  const filteredEvents = filterAssignee
    ? workItems.filter((e) => e.assignee_user_id === filterAssignee)
    : workItems;

  if (isLoading) return <CalendarGridSkeleton />;

  if (workItems.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 24px', color: 'var(--wh-text-tertiary)', fontFamily: 'var(--wh-font-sans)' }}>
        <Users style={{ width: 48, height: 48, marginBottom: 16 }} />
        <p style={{ fontSize: 14, margin: 0 }}>No work items due in {getMonthName(month)} {year}</p>
      </div>
    );
  }

  const renderCell = (_date: Date, dayEvents: CalendarEvent[]) => {
    // Get unique assignees for this day
    const assigneeMap = new Map<string, CalendarEvent>();
    dayEvents.forEach((e) => {
      if (e.assignee_user_id && !assigneeMap.has(e.assignee_user_id)) {
        assigneeMap.set(e.assignee_user_id, e);
      }
    });
    const assignees = Array.from(assigneeMap.values());
    const maxAvatars = 4;
    const extra = assignees.length - maxAvatars;

    if (assignees.length === 0) return null;

    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, marginTop: 2 }}>
        {assignees.slice(0, maxAvatars).map((a) => (
          <div key={a.assignee_user_id} title={`${a.assignee_name}: ${a.event_title}`}>
            <AvatarChip name={a.assignee_name || 'U'} color={a.event_color} size={20} />
          </div>
        ))}
        {extra > 0 && (
          <span style={{ fontSize: 10, color: 'var(--wh-text-secondary)', fontFamily: 'var(--wh-font-sans)', lineHeight: '20px', fontWeight: 600 }}>
            +{extra}
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
        events={filteredEvents}
        renderCell={renderCell}
        onDateClick={onDateClick}
      />

      {/* Resource legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, padding: '12px 0', fontFamily: 'var(--wh-font-sans)' }}>
        {teamMembers.map((m) => {
          const isActive = filterAssignee === m.id;
          const isFiltering = filterAssignee !== null;

          return (
            <button
              key={m.id}
              onClick={() => setFilterAssignee(isActive ? null : m.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 8px',
                borderRadius: 'var(--wh-radius-full)',
                border: isActive ? '2px solid var(--wh-primary)' : '2px solid transparent',
                background: 'none',
                cursor: 'pointer',
                opacity: isFiltering && !isActive ? 0.5 : 1,
                transition: 'all var(--wh-transition-fast)',
                outline: 'none',
              }}
              onFocus={(e) => { (e.currentTarget as HTMLButtonElement).style.boxShadow = 'var(--wh-shadow-focus)'; }}
              onBlur={(e) => { (e.currentTarget as HTMLButtonElement).style.boxShadow = ''; }}
            >
              <AvatarChip name={m.name} color={m.color} size={24} />
              <span style={{ fontSize: 12, color: 'var(--wh-text-secondary)' }}>{m.name}</span>
            </button>
          );
        })}

        {filterAssignee && (
          <button
            onClick={() => setFilterAssignee(null)}
            style={{
              fontSize: 12,
              color: 'var(--wh-primary)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 500,
              fontFamily: 'var(--wh-font-sans)',
            }}
          >
            Show All
          </button>
        )}
      </div>
    </div>
  );
}
