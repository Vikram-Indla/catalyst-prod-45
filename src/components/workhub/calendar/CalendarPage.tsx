/**
 * CalendarPage — Portfolio timeline with 3 switchable views
 * Releases (default) | Themes | Resources
 */

import { useState, useMemo } from 'react';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import { useCalendarEvents, useCalendarNavigation } from '@/hooks/workhub/useCalendarEvents';
import { getMonthName, getEventsForDate, eventOverlapsMonth } from '@/lib/workhub/calendarHelpers';
import { CommandCenterHeader } from '@/components/shared/CommandCenterHeader';
import { CalendarReleaseView } from './CalendarReleaseView';
import { CalendarThemeView } from './CalendarThemeView';
import { CalendarResourceView } from './CalendarResourceView';
import { CalendarEventDrawer } from './CalendarEventDrawer';
import type { CalendarEvent } from '@/types/workhub.types';

type ViewMode = 'releases' | 'themes' | 'resources';

const VIEW_TABS: { key: ViewMode; label: string }[] = [
  { key: 'releases', label: 'Releases' },
  { key: 'themes', label: 'Themes' },
  { key: 'resources', label: 'Resources' },
];

export function CalendarPage() {
  const { year, month, goNext, goPrev, goToday } = useCalendarNavigation();
  const { data: allEvents, isLoading, isError, refetch } = useCalendarEvents(year, month);
  const [viewMode, setViewMode] = useState<ViewMode>('releases');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [drawerEvents, setDrawerEvents] = useState<CalendarEvent[]>([]);

  // Filter events that overlap with the displayed month
  const events = useMemo(
    () => (allEvents ?? []).filter((e) => eventOverlapsMonth(e, year, month)),
    [allEvents, year, month]
  );

  const handleDateClick = (dateStr: string, dayEvents: CalendarEvent[]) => {
    setSelectedDate(dateStr);
    setDrawerEvents(dayEvents);
  };

  const monthName = getMonthName(month);

  return (
    <div style={{ fontFamily: 'var(--wh-font-sans)', color: 'var(--wh-text-primary)', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <CommandCenterHeader
        title="Calendar"
        subtitle={`Portfolio timeline — ${monthName} ${year}`}
        onRefresh={() => refetch()}
      />

      {/* Month Navigation */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
          padding: '8px 0',
          paddingLeft: 24,
          paddingRight: 24,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <NavButton onClick={goPrev} aria-label="Previous month">
            <ChevronLeft style={{ width: 18, height: 18 }} />
          </NavButton>
          <span style={{ fontFamily: 'var(--wh-font-display)', fontSize: 18, fontWeight: 600, color: 'var(--wh-text-primary)', minWidth: 180, textAlign: 'center' }}>
            {monthName} {year}
          </span>
          <NavButton onClick={goNext} aria-label="Next month">
            <ChevronRight style={{ width: 18, height: 18 }} />
          </NavButton>
          <button
            onClick={goToday}
            style={{
              marginLeft: 8,
              padding: '4px 14px',
              fontSize: 13,
              fontWeight: 500,
              fontFamily: 'var(--wh-font-sans)',
              color: 'var(--wh-primary)',
              backgroundColor: 'var(--wh-primary-light)',
              border: '1px solid var(--wh-primary-100)',
              borderRadius: 'var(--wh-radius-full)',
              cursor: 'pointer',
              transition: 'background var(--wh-transition-fast)',
              outline: 'none',
            }}
          >
            Today
          </button>
        </div>

        {/* View Switcher */}
        <div style={{ display: 'flex', gap: 4, backgroundColor: '#f1f5f9', borderRadius: 'var(--wh-radius-md)', padding: 3 }}>
          {VIEW_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setViewMode(t.key)}
              style={{
                padding: '5px 14px',
                fontSize: 13,
                fontWeight: 500,
                fontFamily: 'var(--wh-font-sans)',
                border: 'none',
                borderRadius: 'var(--wh-radius-sm)',
                cursor: 'pointer',
                backgroundColor: viewMode === t.key ? '#2563eb' : 'transparent',
                color: viewMode === t.key ? '#ffffff' : 'var(--wh-text-secondary)',
                transition: 'all var(--wh-transition-fast)',
                outline: 'none',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex flex-col flex-1 min-h-0 px-6 overflow-y-auto">

      {/* Error */}
        {isError && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '24px', backgroundColor: 'var(--wh-danger-light)', border: '1px solid var(--wh-danger)', borderRadius: 'var(--wh-radius-lg)', marginBottom: 16, fontFamily: 'var(--wh-font-sans)' }}>
            <AlertTriangle style={{ width: 20, height: 20, color: 'var(--wh-danger)' }} />
            <span style={{ flex: 1, fontSize: 14, color: 'var(--wh-danger)' }}>Failed to load calendar events</span>
            <button
              onClick={() => refetch()}
              style={{ padding: '6px 14px', fontSize: 13, fontWeight: 500, backgroundColor: 'var(--wh-danger)', color: '#ffffff', border: 'none', borderRadius: 'var(--wh-radius-md)', cursor: 'pointer' }}
            >
              Retry
            </button>
          </div>
        )}

        {/* Content */}
        {viewMode === 'releases' && (
          <CalendarReleaseView year={year} month={month} events={events} isLoading={isLoading} onDateClick={handleDateClick} />
        )}
        {viewMode === 'themes' && (
          <CalendarThemeView year={year} month={month} events={events} isLoading={isLoading} />
        )}
        {viewMode === 'resources' && (
          <CalendarResourceView year={year} month={month} events={events} isLoading={isLoading} onDateClick={handleDateClick} />
        )}

        {/* Event Drawer */}
        <CalendarEventDrawer
          isOpen={selectedDate !== null}
          onClose={() => setSelectedDate(null)}
          dateStr={selectedDate}
          events={drawerEvents}
        />
      </div>
    </div>
  );
}

function NavButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      style={{
        width: 32,
        height: 32,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 'var(--wh-radius-md)',
        border: '1px solid var(--wh-border)',
        backgroundColor: 'var(--wh-surface)',
        color: 'var(--wh-text-primary)',
        cursor: 'pointer',
        transition: 'background var(--wh-transition-fast)',
        outline: 'none',
      }}
    >
      {children}
    </button>
  );
}
