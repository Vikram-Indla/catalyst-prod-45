/**
 * Release Operations — Calendar (route /release-hub/calendar)
 *
 * Net-new surface (no Jira/canonical equivalent). Enterprise, signal-only:
 * a neutral month grid where work type is a thin left rail, color is reserved
 * for freeze/conflict and prediction risk. Two lenses (Product / Project) and
 * two scales (Month / Quarter). Releases and sprints carry a date-based
 * completion prediction (risk dot + %); clicking opens a drill-down peek.
 */
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  isSameMonth, isSameDay, format, addMonths, subMonths,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from '@/lib/atlaskit-icons';
import {
  useReleaseCalendar, useReleasePredictions, useSprintBands,
  type CalendarEvent, type CalendarLane, type Prediction, type PredictionRisk, type SprintBand,
} from '@/hooks/useReleaseHub';
import Button from '@atlaskit/button';
import Spinner from '@atlaskit/spinner';
import { RH } from '@/constants/releasehub.design';
import { ProjectPageHeader } from '@/components/layout/ProjectPageHeader';
import { ReleasePredictorCard } from '@/components/releasehub/ReleasePredictorCard';
import { Modal, ModalHeader, ModalTitle, ModalBody, ModalFooter } from '@/components/ads/Modal';

const T = {
  surface: 'var(--ds-surface)',
  card: 'var(--ds-surface-raised)',
  sunken: 'var(--ds-surface-sunken)',
  border: 'var(--ds-border)',
  text: 'var(--ds-text)',
  subtle: 'var(--ds-text-subtle)',
  subtlest: 'var(--ds-text-subtlest)',
  selected: 'var(--ds-background-selected)',
  info: 'var(--ds-border-information)',
  freeze: 'var(--ds-icon-danger)',
};

const RAIL: Record<CalendarLane | 'sprint', string> = {
  release: 'var(--ds-icon-information)',
  change: 'var(--ds-icon-accent-teal)',
  prod: 'var(--ds-icon-success)',
  freeze: 'var(--ds-icon-danger)',
  sprint: 'var(--ds-icon-accent-purple)',
};
const LANE_LABEL: Record<CalendarLane, string> = { release: 'Release', change: 'Change', freeze: 'Freeze', prod: 'Production' };
const RISK_DOT: Record<PredictionRisk, string> = {
  on_track: 'var(--ds-icon-success)',
  at_risk: 'var(--ds-icon-warning)',
  off_track: 'var(--ds-icon-danger)',
  done: 'var(--ds-icon-success)',
  no_data: 'var(--ds-icon-subtlest)',
};
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Sprint-only prediction preview (releases open full-page detail; no side panels — D-001).
type Peek = { id: string; label: string };

function Chip({ ev, onClick, pred }: { ev: CalendarEvent; onClick: () => void; pred?: Prediction }) {
  const showPred = ev.lane === 'release' && pred && pred.risk !== 'no_data';
  return (
    <button
      onClick={onClick}
      title={ev.label}
      style={{ display: 'flex', alignItems: 'center', gap: 4, width: '100%', textAlign: 'left', background: T.sunken, color: T.text, boxShadow: `inset 2px 0 0 ${RAIL[ev.lane]}`, border: 'none', cursor: ev.link ? 'pointer' : 'default', fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', fontWeight: 500, borderRadius: 4, padding: '0 4px', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', lineHeight: '16px' }}
    >
      {showPred && <span style={{ width: 6, height: 6, borderRadius: '50%', flex: 'none', background: RISK_DOT[pred!.risk] }} />}
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.label}</span>
      {showPred && pred!.predictedPct != null && <span style={{ flex: 'none', fontWeight: 600, color: T.subtle }}>{pred!.predictedPct}%</span>}
    </button>
  );
}

function SprintBandRow({ band, pred, onClick }: { band: SprintBand; pred?: Prediction; onClick: () => void }) {
  const showPred = pred && pred.risk !== 'no_data';
  return (
    <button
      onClick={onClick}
      style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left', background: T.sunken, color: T.text, boxShadow: `inset 3px 0 0 ${RAIL.sprint}`, border: 'none', cursor: 'pointer', fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', fontWeight: 500, borderRadius: 4, padding: '0 8px', marginTop: 4, lineHeight: '18px' }}
    >
      {showPred && <span style={{ width: 7, height: 7, borderRadius: '50%', flex: 'none', background: RISK_DOT[pred!.risk] }} />}
      <span style={{ color: T.text }}>{band.name}</span>
      <span style={{ color: T.subtlest }}>{format(new Date(band.start + 'T00:00:00'), 'MMM d')} – {format(new Date(band.end + 'T00:00:00'), 'MMM d')}</span>
      {showPred && pred!.predictedPct != null && <span style={{ marginLeft: 'auto', fontWeight: 600, color: T.subtle }}>{pred!.predictedPct}%</span>}
    </button>
  );
}

function Seg({ options, value, onChange }: { options: { v: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', border: `0.5px solid ${T.border}`, borderRadius: 6, overflow: 'hidden' }}>
      {options.map((o, i) => (
        <button key={o.v} onClick={() => onChange(o.v)} style={{ padding: '4px 12px', fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', cursor: 'pointer', border: 'none', borderLeft: i ? `0.5px solid ${T.border}` : 'none', background: value === o.v ? T.sunken : 'transparent', color: value === o.v ? T.text : T.subtle }}>{o.label}</button>
      ))}
    </div>
  );
}

export default function ReleaseCalendarPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: events = [], isFetching: calFetching } = useReleaseCalendar();
  const { data: predictions } = useReleasePredictions();
  const { data: sprintBands = [] } = useSprintBands();
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [perspective, setPerspective] = useState<'product' | 'project'>('product');
  const [view, setView] = useState<'month' | 'quarter'>('month');
  const [peek, setPeek] = useState<Peek | null>(null);
  const today = new Date();

  const relUuid = (ev: CalendarEvent): string | null =>
    ev.lane === 'release' && ev.id.startsWith('rel-') ? ev.id.slice(4) : null;
  const predForRelease = (ev: CalendarEvent): Prediction | undefined => {
    const uuid = relUuid(ev);
    return uuid ? predictions?.get(`release:${uuid}`) : undefined;
  };
  const onChipClick = (ev: CalendarEvent) => {
    const uuid = relUuid(ev);
    // Release chip → full-page release detail (no drawer/peek — D-001).
    if (uuid) navigate(`/release-hub/${uuid}`);
    else if (ev.link) navigate(ev.link);
  };

  // Product lens shows releases/changes/prod + freeze; Project lens shows freeze only (sprints render as bands).
  const laneVisible = (lane: CalendarLane) =>
    perspective === 'product' ? true : lane === 'freeze';

  const freezeRanges = useMemo(
    () => events.filter((e) => e.lane === 'freeze').map((e) => ({
      start: new Date(e.date).getTime(), end: new Date(e.endDate ?? e.date).getTime(),
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
      if (!laneVisible(e.lane)) return false;
      if (e.lane === 'freeze') {
        const t = day.getTime();
        return t >= new Date(e.date).getTime() && t <= new Date(e.endDate ?? e.date).getTime();
      }
      return e.date === ds;
    });
  };

  const monthDays = (m: Date) => eachDayOfInterval({ start: startOfWeek(startOfMonth(m)), end: endOfWeek(endOfMonth(m)) });
  const weeksOf = (m: Date): Date[][] => {
    const days = monthDays(m);
    const weeks: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
    return weeks;
  };
  const sprintsForWeek = (week: Date[]): SprintBand[] => {
    if (perspective !== 'project') return [];
    const ws = week[0].getTime();
    const we = week[6].getTime() + 86_400_000 - 1;
    return sprintBands.filter((b) => new Date(b.start).getTime() <= we && new Date(b.end + 'T23:59:59').getTime() >= ws);
  };

  const renderDayCell = (day: Date, m: Date, compact: boolean) => {
    const inMonth = isSameMonth(day, m);
    const isToday = isSameDay(day, today);
    const dayEvents = eventsForDay(day);
    const conflict = dayEvents.some((e) => e.lane === 'release' || e.lane === 'change') && inFreeze(day);
    const frozen = inFreeze(day);
    return (
      <div key={day.toISOString()} style={{ minHeight: compact ? 44 : 88, border: `0.5px solid ${T.border}`, borderRadius: 6, background: frozen ? T.sunken : isToday ? T.selected : T.card, padding: 4, opacity: inMonth ? 1 : 0.4, overflow: 'hidden', position: 'relative', boxShadow: isToday ? `inset 0 0 0 1px ${T.info}` : undefined }}>
        {frozen && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: T.freeze, opacity: 0.55 }} />}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          {isToday ? (
            <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-50)', fontWeight: 600, color: 'var(--ds-text-inverse)', background: T.info, borderRadius: 999, padding: '0 8px' }}>Today</span>
          ) : (
            <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', fontWeight: 500, color: inMonth ? T.subtle : T.subtlest }}>{format(day, 'd')}</span>
          )}
        </div>
        {conflict && !compact && (
          <div style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-50)', fontWeight: 600, color: 'var(--ds-text-danger)', marginTop: 4 }}>Freeze conflict</div>
        )}
        {compact
          ? dayEvents.slice(0, 3).map((ev) => <span key={ev.id} title={ev.label} style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: RAIL[ev.lane], marginRight: 4, marginTop: 4 }} />)
          : dayEvents.slice(0, 4).map((ev) => <Chip key={`${ev.id}-${format(day, 'yyyyMMdd')}`} ev={ev} pred={predForRelease(ev)} onClick={() => onChipClick(ev)} />)}
        {!compact && dayEvents.length > 4 && (
          <span style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-50)', color: T.subtlest, padding: '0 4px' }}>+{dayEvents.length - 4} more</span>
        )}
      </div>
    );
  };

  const renderMonthGrid = (m: Date, compact: boolean) => (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
        {WEEKDAYS.map((w) => (
          <div key={w} style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: T.subtlest, textAlign: 'center', padding: 4 }}>{compact ? w[0] : w}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {weeksOf(m).map((week, wi) => (
          <React.Fragment key={wi}>
            {sprintsForWeek(week).map((b) => (
              <SprintBandRow key={`${b.name}-${wi}`} band={b} pred={predictions?.get(`sprint:${b.name}`)} onClick={() => setPeek({ id: b.name, label: b.name })} />
            ))}
            {week.map((day) => renderDayCell(day, m, compact))}
          </React.Fragment>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ padding: 24, background: T.surface, minHeight: '100%' }}>
      <div style={{ width: '100%' }}>
      <div style={{ margin: '-24px -24px 0' }}>
        <ProjectPageHeader projectKey="RELEASES" hubType="release" />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <Seg options={[{ v: 'product', label: 'Product' }, { v: 'project', label: 'Project' }]} value={perspective} onChange={(v) => setPerspective(v as 'product' | 'project')} />
        <Seg options={[{ v: 'month', label: 'Month' }, { v: 'quarter', label: 'Quarter' }]} value={view} onChange={(v) => setView(v as 'month' | 'quarter')} />
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Button
            appearance="subtle"
            spacing="compact"
            isDisabled={calFetching}
            iconBefore={calFetching ? <Spinner size="small" /> : undefined}
            onClick={() => qc.invalidateQueries({ queryKey: ['release-hub', 'calendar'] })}
          >
            {calFetching ? 'Refreshing…' : '↻ Re-run all'}
          </Button>
          <button onClick={() => setMonth((m) => subMonths(m, view === 'quarter' ? 3 : 1))} aria-label="Previous" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 6, border: `0.5px solid ${T.border}`, background: T.card, cursor: 'pointer', color: T.subtle }}><ChevronLeft size={16} /></button>
          <button onClick={() => setMonth(startOfMonth(new Date()))} style={{ fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', color: T.text, background: T.card, border: `0.5px solid ${T.border}`, borderRadius: 6, padding: '0 12px', height: 32, cursor: 'pointer' }}>Today</button>
          <span style={{ fontFamily: RH.fontDisplay, fontSize: 'var(--ds-font-size-500)', fontWeight: 600, color: T.text, minWidth: 160, textAlign: 'center' }}>{view === 'quarter' ? `${format(month, 'MMM')} – ${format(addMonths(month, 2), 'MMM yyyy')}` : format(month, 'MMMM yyyy')}</span>
          <button onClick={() => setMonth((m) => addMonths(m, view === 'quarter' ? 3 : 1))} aria-label="Next" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 6, border: `0.5px solid ${T.border}`, background: T.card, cursor: 'pointer', color: T.subtle }}><ChevronRight size={16} /></button>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        {perspective === 'project' ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', color: T.subtle }}><span style={{ width: 3, height: 11, borderRadius: 1, background: RAIL.sprint }} />Sprint</span>
        ) : (Object.keys(LANE_LABEL) as CalendarLane[]).map((k) => (
          <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', color: T.subtle }}><span style={{ width: 3, height: 11, borderRadius: 1, background: RAIL[k] }} />{LANE_LABEL[k]}</span>
        ))}
        <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: RH.fontBody, fontSize: 'var(--ds-font-size-200)', color: T.subtle }}>
          Health <span style={{ width: 8, height: 8, borderRadius: '50%', background: RISK_DOT.on_track }} />on track <span style={{ width: 8, height: 8, borderRadius: '50%', background: RISK_DOT.at_risk }} />at risk <span style={{ width: 8, height: 8, borderRadius: '50%', background: RISK_DOT.off_track }} />off track
        </span>
      </div>

      {view === 'month' ? renderMonthGrid(month, false) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {[0, 1, 2].map((i) => {
            const m = addMonths(month, i);
            return (
              <div key={i}>
                <div role="heading" aria-level={3} style={{ fontFamily: RH.fontDisplay, fontSize: 'var(--ds-font-size-400)', fontWeight: 600, color: T.text, marginBottom: 8 }}>{format(m, 'MMMM yyyy')}</div>
                {renderMonthGrid(m, true)}
              </div>
            );
          })}
        </div>
      )}

      {/* Sprint prediction preview — centered modal (no side drawer — D-001). */}
      <Modal isOpen={!!peek} onClose={() => setPeek(null)} width="medium" aria-label={peek ? `${peek.label} prediction` : 'Sprint prediction'}>
        {peek && (
          <>
            <ModalHeader><ModalTitle>{peek.label}</ModalTitle></ModalHeader>
            <ModalBody>
              <ReleasePredictorCard kind="sprint" id={peek.id} label={peek.label} prediction={predictions?.get(`sprint:${peek.id}`) ?? null} />
            </ModalBody>
            <ModalFooter>
              <Button appearance="subtle" onClick={() => setPeek(null)}>Close</Button>
            </ModalFooter>
          </>
        )}
      </Modal>
      </div>
    </div>
  );
}
