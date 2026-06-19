/**
 * Release Operations — Calendar (route /release-hub/calendar)
 *
 * Phase 11 (net-new surface — no Jira/canonical equivalent). Month grid with
 * four lanes: release (blue), change (teal), freeze window (red, multi-day),
 * production event (green). Days where a release/change falls inside a freeze
 * window are conflict-tinted. Clicking an event chip opens its detail.
 */
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  isSameMonth, isSameDay, format, addMonths, subMonths,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from '@/lib/atlaskit-icons';
import { useReleaseCalendar, useReleasePredictions, type CalendarEvent, type CalendarLane, type Prediction, type PredictionRisk } from '@/hooks/useReleaseHub';
import { RH } from '@/constants/releasehub.design';
import { ProjectPageHeader } from '@/components/layout/ProjectPageHeader';
import { ReleasePredictorCard } from '@/components/releasehub/ReleasePredictorCard';

const T = {
  surface: 'var(--ds-surface, #FFFFFF)',
  card: 'var(--ds-surface-raised, #FFFFFF)',
  sunken: 'var(--ds-surface-sunken, #F7F8F9)',
  border: 'var(--ds-border, #DFE1E6)',
  text: 'var(--ds-text, #172B4D)',
  subtle: 'var(--ds-text-subtle, #44546F)',
  subtlest: 'var(--ds-text-subtlest, #626F86)',
  todayBg: 'var(--ds-background-selected, #E9F2FE)',
  conflictBg: 'var(--ds-background-danger, #FFECEB)',
};

const LANE: Record<CalendarLane, { label: string; fg: string; bg: string }> = {
  release: { label: 'Release', fg: 'var(--ds-text-information, #0055CC)', bg: 'var(--ds-background-information, #E9F2FE)' },
  change: { label: 'Change', fg: 'var(--ds-text-accent-teal, #1D7F8C)', bg: 'var(--ds-background-accent-teal-subtlest, #E7F9FF)' },
  freeze: { label: 'Freeze', fg: 'var(--ds-text-danger, #AE2A19)', bg: 'var(--ds-background-danger, #FFECEB)' },
  prod: { label: 'Production', fg: 'var(--ds-text-success, #216E4E)', bg: 'var(--ds-background-success, #DCFFF1)' },
};
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const RISK_DOT: Record<PredictionRisk, string> = {
  on_track: 'var(--ds-icon-success, #22A06B)',
  at_risk: 'var(--ds-icon-warning, #E2B203)',
  off_track: 'var(--ds-icon-danger, #C9372C)',
  done: 'var(--ds-icon-success, #22A06B)',
  no_data: 'var(--ds-icon-subtlest, #8590A2)',
};

function Chip({ ev, onClick, pred }: { ev: CalendarEvent; onClick: () => void; pred?: Prediction }) {
  const l = LANE[ev.lane];
  const showPred = ev.lane === 'release' && pred && pred.risk !== 'no_data';
  return (
    <button
      onClick={onClick}
      title={ev.label}
      style={{ display: 'flex', alignItems: 'center', gap: 4, width: '100%', textAlign: 'left', border: 'none', cursor: ev.link ? 'pointer' : 'default', background: l.bg, color: l.fg, fontFamily: RH.fontBody, fontSize: 10, fontWeight: 600, borderRadius: 3, padding: '0 4px', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', lineHeight: '16px' }}
    >
      {showPred && <span style={{ width: 6, height: 6, borderRadius: '50%', flex: 'none', background: RISK_DOT[pred!.risk] }} />}
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.label}</span>
      {showPred && pred!.predictedPct != null && (
        <span style={{ flex: 'none', fontWeight: 600, opacity: 0.85 }}>{pred!.predictedPct}%</span>
      )}
    </button>
  );
}

export default function ReleaseCalendarPage() {
  const navigate = useNavigate();
  const { data: events = [] } = useReleaseCalendar();
  const { data: predictions } = useReleasePredictions();
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [peek, setPeek] = useState<{ id: string; label: string } | null>(null);

  const relUuid = (ev: CalendarEvent): string | null =>
    ev.lane === 'release' && ev.id.startsWith('rel-') ? ev.id.slice(4) : null;
  const predFor = (ev: CalendarEvent): Prediction | undefined => {
    const uuid = relUuid(ev);
    return uuid ? predictions?.get(`release:${uuid}`) : undefined;
  };
  const onChipClick = (ev: CalendarEvent) => {
    const uuid = relUuid(ev);
    if (uuid) setPeek({ id: uuid, label: ev.label });
    else if (ev.link) navigate(ev.link);
  };

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month));
    const end = endOfWeek(endOfMonth(month));
    return eachDayOfInterval({ start, end });
  }, [month]);

  // Freeze ranges (ms) for conflict detection.
  const freezeRanges = useMemo(
    () => events.filter((e) => e.lane === 'freeze').map((e) => ({
      start: new Date(e.date).getTime(),
      end: new Date(e.endDate ?? e.date).getTime(),
    })),
    [events],
  );
  const inFreeze = (day: Date) => {
    const t = day.getTime();
    return freezeRanges.some((r) => t >= r.start && t <= r.end);
  };

  const eventsForDay = (day: Date): CalendarEvent[] => {
    const ds = format(day, 'yyyy-MM-dd');
    return events.filter((e) => {
      if (e.lane === 'freeze') {
        const t = day.getTime();
        return t >= new Date(e.date).getTime() && t <= new Date(e.endDate ?? e.date).getTime();
      }
      return e.date === ds;
    });
  };

  const today = new Date();

  return (
    <div style={{ padding: 24, background: T.surface, minHeight: '100%' }}>
      <div style={{ margin: '-24px -24px 0' }}>
        <ProjectPageHeader projectKey="RELEASES" hubType="release" />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => setMonth((m) => subMonths(m, 1))} aria-label="Previous month" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 6, border: `1px solid ${T.border}`, background: T.card, cursor: 'pointer', color: T.subtle }}>
            <ChevronLeft size={16} style={{ color: T.subtle }} />
          </button>
          <span style={{ fontFamily: RH.fontDisplay, fontSize: 16, fontWeight: 600, color: T.text, minWidth: 160, textAlign: 'center' }}>{format(month, 'MMMM yyyy')}</span>
          <button onClick={() => setMonth((m) => addMonths(m, 1))} aria-label="Next month" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 6, border: `1px solid ${T.border}`, background: T.card, cursor: 'pointer', color: T.subtle }}>
            <ChevronRight size={16} style={{ color: T.subtle }} />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
        {(Object.keys(LANE) as CalendarLane[]).map((k) => (
          <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: RH.fontBody, fontSize: 12, color: T.subtle }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: LANE[k].fg }} />{LANE[k].label}
          </span>
        ))}
      </div>

      {/* Weekday header */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
        {WEEKDAYS.map((w) => (
          <div key={w} style={{ fontFamily: RH.fontBody, fontSize: 11, fontWeight: 600, color: T.subtlest, textAlign: 'center', padding: 4 }}>{w}</div>
        ))}
      </div>

      {/* Day grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {days.map((day) => {
          const inMonth = isSameMonth(day, month);
          const isToday = isSameDay(day, today);
          const dayEvents = eventsForDay(day);
          const hasReleaseOrChange = dayEvents.some((e) => e.lane === 'release' || e.lane === 'change');
          const conflict = hasReleaseOrChange && inFreeze(day);
          const bg = conflict ? T.conflictBg : isToday ? T.todayBg : T.card;
          return (
            <div key={day.toISOString()} style={{ minHeight: 96, border: `1px solid ${T.border}`, borderRadius: 6, background: bg, padding: 4, opacity: inMonth ? 1 : 0.45, overflow: 'hidden' }}>
              <div style={{ fontFamily: RH.fontBody, fontSize: 12, fontWeight: isToday ? 700 : 500, color: T.subtle, textAlign: 'right', padding: '0 4px' }}>{format(day, 'd')}</div>
              {dayEvents.slice(0, 4).map((ev) => (
                <Chip key={`${ev.id}-${format(day, 'yyyyMMdd')}`} ev={ev} pred={predFor(ev)} onClick={() => onChipClick(ev)} />
              ))}
              {dayEvents.length > 4 && (
                <span style={{ fontFamily: RH.fontBody, fontSize: 10, color: T.subtlest, padding: '0 4px' }}>+{dayEvents.length - 4} more</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Predictor peek — opens when a release chip is clicked */}
      {peek && (
        <div
          onClick={() => setPeek(null)}
          style={{ position: 'fixed', inset: 0, background: 'var(--ds-blanket, rgba(9,30,66,0.36))', zIndex: 400, display: 'flex', justifyContent: 'flex-end' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: 420, maxWidth: '92vw', height: '100%', background: T.surface, borderLeft: `1px solid ${T.border}`, padding: 16, overflowY: 'auto', boxShadow: 'var(--ds-shadow-overlay, 0 8px 28px rgba(9,30,66,0.18))' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontFamily: RH.fontDisplay, fontSize: 16, fontWeight: 600, color: T.text, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{peek.label}</span>
              <button onClick={() => navigate(`/release-hub/${peek.id}`)} style={{ fontFamily: RH.fontBody, fontSize: 12, color: T.subtle, background: 'transparent', border: `0.5px solid ${T.border}`, borderRadius: 6, padding: '4px 8px', cursor: 'pointer', marginRight: 8 }}>Open release</button>
              <button onClick={() => setPeek(null)} aria-label="Close" style={{ fontFamily: RH.fontBody, fontSize: 16, color: T.subtle, background: 'transparent', border: 'none', cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>
            <ReleasePredictorCard
              kind="release"
              id={peek.id}
              label={peek.label}
              prediction={predictions?.get(`release:${peek.id}`) ?? null}
            />
          </div>
        </div>
      )}
    </div>
  );
}
