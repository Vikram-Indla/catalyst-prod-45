/**
 * CalendarThemeView — Horizontal timeline showing themes as colored bars
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Palette } from 'lucide-react';
import type { CalendarEvent } from '@/types/workhub.types';
import { getMonthName, toDateString, isToday, eventOverlapsMonth } from '@/lib/workhub/calendarHelpers';

interface Props {
  year: number;
  month: number;
  events: CalendarEvent[];
  isLoading: boolean;
}

export function CalendarThemeView({ year, month, events, isLoading }: Props) {
  const navigate = useNavigate();
  const themes = events.filter((e) => e.event_type === 'theme' && eventOverlapsMonth(e, year, month));
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const todayStr = toDateString(new Date());
  const todayDay = new Date().getDate();
  const todayInMonth = new Date().getMonth() === month && new Date().getFullYear() === year;

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '16px 0' }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="animate-pulse" style={{ height: 24, borderRadius: 4, backgroundColor: 'var(--wh-border-light)' }} />
        ))}
      </div>
    );
  }

  if (themes.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 24px', color: 'var(--wh-text-tertiary)', fontFamily: 'var(--wh-font-sans)' }}>
        <Palette style={{ width: 48, height: 48, marginBottom: 16 }} />
        <p style={{ fontSize: 14, margin: 0 }}>No themes span {getMonthName(month)} {year}</p>
      </div>
    );
  }

  const monthStart = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const monthEnd = `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

  return (
    <div style={{ border: '1px solid var(--wh-border)', borderRadius: 'var(--wh-radius-lg)', overflow: 'hidden', fontFamily: 'var(--wh-font-sans)' }}>
      {/* Day number header */}
      <div style={{ display: 'grid', gridTemplateColumns: `180px repeat(${daysInMonth}, 1fr)`, borderBottom: '1px solid var(--wh-border)', backgroundColor: 'var(--wh-surface)' }}>
        <div style={{ padding: '8px 12px', fontSize: 11, fontWeight: 600, color: 'var(--wh-text-tertiary)', textTransform: 'uppercase' }}>
          Theme
        </div>
        {days.map((d) => (
          <div
            key={d}
            style={{
              padding: '8px 2px',
              textAlign: 'center',
              fontSize: 11,
              fontWeight: todayInMonth && d === todayDay ? 700 : 400,
              color: todayInMonth && d === todayDay ? 'var(--wh-primary)' : 'var(--wh-text-tertiary)',
              backgroundColor: todayInMonth && d === todayDay ? 'var(--wh-primary-light)' : undefined,
            }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Theme rows */}
      <div style={{ position: 'relative' }}>
        {/* Today vertical line */}
        {todayInMonth && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: `calc(180px + ${((todayDay - 0.5) / daysInMonth) * 100}% * ${daysInMonth / (daysInMonth)})`,
              width: 2,
              backgroundColor: 'var(--wh-primary)',
              opacity: 0.4,
              zIndex: 2,
              // Recalculate: column width
              marginLeft: `calc(((100% - 180px) / ${daysInMonth}) * ${todayDay - 1} + ((100% - 180px) / ${daysInMonth}) / 2)`,
            }}
          />
        )}

        {themes.map((theme) => {
          const startStr = theme.event_start || theme.event_date;
          const endStr = theme.event_end || theme.event_date;

          // Calculate bar position within the month columns
          const barStartDay = startStr < monthStart ? 1 : parseInt(startStr.split('-')[2], 10);
          const barEndDay = endStr > monthEnd ? daysInMonth : parseInt(endStr.split('-')[2], 10);

          const colStart = barStartDay; // 1-indexed
          const colSpan = barEndDay - barStartDay + 1;

          // Format dates
          const fmtStart = new Date(startStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          const fmtEnd = new Date(endStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

          return (
            <div
              key={theme.entity_id}
              onClick={() => navigate(`/projecthub/themes/${theme.entity_id}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter') navigate(`/projecthub/themes/${theme.entity_id}`);
              }}
              style={{
                display: 'grid',
                gridTemplateColumns: `180px repeat(${daysInMonth}, 1fr)`,
                minHeight: 60,
                borderBottom: '1px solid var(--wh-border-light)',
                cursor: 'pointer',
                transition: 'background var(--wh-transition-fast)',
                outline: 'none',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.backgroundColor = 'var(--wh-primary-light)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.backgroundColor = ''; }}
              onFocus={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--wh-shadow-focus)'; }}
              onBlur={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = ''; }}
            >
              {/* Label */}
              <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--wh-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {theme.event_title}
                </span>
                <span style={{ fontSize: 12, color: 'var(--wh-text-tertiary)', marginTop: 2 }}>
                  {fmtStart} — {fmtEnd}
                </span>
              </div>

              {/* Bar spanning columns */}
              {days.map((d) => {
                const isBar = d >= barStartDay && d <= barEndDay;
                const isStart = d === barStartDay;
                const isEnd = d === barEndDay;

                return (
                  <div key={d} style={{ display: 'flex', alignItems: 'center', padding: '0 1px' }}>
                    {isBar && (
                      <div
                        style={{
                          width: '100%',
                          height: 24,
                          backgroundColor: theme.event_color,
                          borderRadius:
                            isStart && isEnd
                              ? 4
                              : isStart
                                ? '4px 0 0 4px'
                                : isEnd
                                  ? '0 4px 4px 0'
                                  : 0,
                          opacity: 0.85,
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
