/**
 * CalendarEventDrawer — Shows all events for a selected date
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Rocket, Palette, FileStack, ArrowRight } from 'lucide-react';
import type { CalendarEvent } from '@/types/workhub.types';
import { WorkHubDrawer } from '../shared/WorkHubDrawer';
import { formatCalendarDate } from '@/lib/workhub/calendarHelpers';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  dateStr: string | null;
  events: CalendarEvent[];
}

function EventCard({ event, onClick }: { event: CalendarEvent; onClick: () => void }) {
  return (
    <div
      style={{
        backgroundColor: 'var(--wh-surface)',
        border: '1px solid var(--wh-border)',
        borderRadius: 'var(--wh-radius-lg)',
        borderLeft: `3px solid ${event.event_color}`,
        padding: '12px 16px',
        marginBottom: 8,
        fontFamily: 'var(--wh-font-sans)',
        transition: 'box-shadow var(--wh-transition-fast)',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--wh-shadow-sm)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') onClick(); }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: event.event_color, flexShrink: 0 }} />
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--wh-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {event.event_title}
        </span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 12, color: 'var(--wh-text-secondary)', marginBottom: 8, paddingLeft: 16 }}>
        <span>{event.event_status}</span>
        {event.event_start && event.event_end && (
          <span>
            {new Date(event.event_start + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            {' — '}
            {new Date(event.event_end + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}
        {event.assignee_name && <span>Assigned: {event.assignee_name}</span>}
      </div>

      <div style={{ paddingLeft: 16 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 500, color: 'var(--wh-primary)', cursor: 'pointer' }}>
          View {event.event_type === 'release' ? 'Release' : event.event_type === 'theme' ? 'Theme' : 'Item'} <ArrowRight style={{ width: 12, height: 12 }} />
        </span>
      </div>
    </div>
  );
}

function SectionHeader({ icon: Icon, label }: { icon: React.ComponentType<{ style?: React.CSSProperties }>; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, marginTop: 16 }}>
      <Icon style={{ width: 16, height: 16, color: 'var(--wh-text-secondary)' }} />
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--wh-text-secondary)', fontFamily: 'var(--wh-font-sans)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </span>
    </div>
  );
}

export function CalendarEventDrawer({ isOpen, onClose, dateStr, events }: Props) {
  const navigate = useNavigate();

  const date = dateStr ? new Date(dateStr + 'T00:00:00') : new Date();
  const releases = events.filter((e) => e.event_type === 'release');
  const themes = events.filter((e) => e.event_type === 'theme');
  const workitems = events.filter((e) => e.event_type === 'workitem');

  const handleNavigate = (event: CalendarEvent) => {
    if (event.event_type === 'release') navigate(`/projecthub/releases/${event.entity_id}`);
    else if (event.event_type === 'theme') navigate(`/projecthub/themes/${event.entity_id}`);
    else navigate('/projecthub/workitems');
  };

  return (
    <WorkHubDrawer
      isOpen={isOpen}
      onClose={onClose}
      title={formatCalendarDate(date)}
      subtitle={`${events.length} event${events.length !== 1 ? 's' : ''}`}
      width={380}
    >
      {events.length === 0 ? (
        <p style={{ color: 'var(--wh-text-tertiary)', fontFamily: 'var(--wh-font-sans)', fontSize: 14, textAlign: 'center', padding: '32px 0' }}>
          No events on this date.
        </p>
      ) : (
        <div>
          {releases.length > 0 && (
            <>
              <SectionHeader icon={Rocket} label="Releases" />
              {releases.map((e) => <EventCard key={e.entity_id} event={e} onClick={() => handleNavigate(e)} />)}
            </>
          )}

          {themes.length > 0 && (
            <>
              <SectionHeader icon={Palette} label="Themes" />
              {themes.map((e) => <EventCard key={e.entity_id} event={e} onClick={() => handleNavigate(e)} />)}
            </>
          )}

          {workitems.length > 0 && (
            <>
              <SectionHeader icon={FileStack} label="Work Items" />
              {workitems.map((e) => <EventCard key={e.entity_id} event={e} onClick={() => handleNavigate(e)} />)}
            </>
          )}
        </div>
      )}
    </WorkHubDrawer>
  );
}
