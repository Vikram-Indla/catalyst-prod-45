import React, { useState } from 'react';
import { format, startOfDay, addDays, differenceInDays } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useProjectTimeline } from '@/hooks/useProjectTimeline';

const T = {
  card:     'var(--ds-surface-raised, #FFFFFF)',
  border:   'var(--ds-border, #DFE1E6)',
  borderSub:'var(--ds-border-subtle, #F1F2F4)',
  text:     'var(--ds-text, #172B4D)',
  subtle:   'var(--ds-text-subtle, #44546F)',
  subtlest: 'var(--ds-text-subtlest, #626F86)',
  neutral:  'var(--ds-background-neutral, #F1F2F4)',
  sunken:   'var(--ds-surface-sunken, #FAFBFC)',
  selected: 'var(--ds-background-selected, #E9F2FF)',
  link:     'var(--ds-link, #0C66E4)',
};

const BAR = {
  completed: { bar: '#C1C7D0', badge: { bg: '#F1F2F4', text: '#44546F' }, label: 'Completed' },
  active:    { bar: '#0C66E4', badge: { bg: '#E9F2FF', text: '#0C66E4' }, label: 'Active' },
  upcoming:  { bar: '#22A06B', badge: { bg: '#DCFFF1', text: '#216E4E' }, label: 'Upcoming' },
} as const;

type GanttStatus = keyof typeof BAR;

const NAME_W = 168;
const META_W = 96;

function getStatus(endDate: string, today: Date): GanttStatus {
  const diff = differenceInDays(new Date(endDate), today);
  if (diff < -14) return 'completed';
  if (diff <= 14)  return 'active';
  return 'upcoming';
}

export function ProjectDashboardTimeline({ projectKey }: { projectKey: string }) {
  const navigate = useNavigate();
  const { data, isLoading } = useProjectTimeline(projectKey);
  const [showPast, setShowPast] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  if (isLoading || !data?.sprints?.length) return null;

  const today = startOfDay(new Date());
  const sorted = [...data.sprints].sort(
    (a, b) => new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime(),
  );

  // Derive per-sprint startDate = prev sprint's releaseDate (or end − 14d)
  const sprints = sorted.map((s, i) => ({
    ...s,
    startDate: i > 0
      ? sorted[i - 1].releaseDate
      : addDays(new Date(s.releaseDate), -14).toISOString(),
  }));

  const past    = sprints.filter(s => getStatus(s.releaseDate, today) === 'completed');
  const visible = sprints.filter(s => getStatus(s.releaseDate, today) !== 'completed');

  // When no upcoming/active sprints, auto-show last 4 completed so chart isn't empty
  const noUpcoming = visible.length === 0;
  const effectiveShowPast = showPast || noUpcoming;
  const shownPast = effectiveShowPast ? (noUpcoming && !showPast ? past.slice(-4) : past) : [];

  // Range must cover the rows actually rendered — compute AFTER knowing what shows
  const rendered = [...shownPast, ...visible];
  const rangeAnchor = rendered.length > 0 ? rendered : past;
  const firstR = rangeAnchor[0];
  const lastR  = rangeAnchor[rangeAnchor.length - 1];
  const rangeStart = addDays(new Date(firstR.startDate), -7);
  const rangeEnd   = noUpcoming
    ? addDays(new Date(lastR.releaseDate), 21)
    : addDays(new Date(lastR.releaseDate), 21);

  const totalDays  = Math.max(1, differenceInDays(rangeEnd, rangeStart));
  const todayRatio = Math.max(0, Math.min(1, differenceInDays(today, rangeStart) / totalDays));
  const toRatio    = (d: Date) => Math.max(0, Math.min(1, differenceInDays(d, rangeStart) / totalDays));

  const ticks = Array.from({ length: 6 }, (_, i) =>
    addDays(rangeStart, Math.round((i * totalDays) / 5)),
  );

  const hasActive = visible.some(s => getStatus(s.releaseDate, today) === 'active');

  const renderRow = (sprint: typeof sprints[0], dimmed = false) => {
    const status    = getStatus(sprint.releaseDate, today);
    const style     = BAR[status];
    const barLeft   = toRatio(startOfDay(new Date(sprint.startDate)));
    const barRight  = toRatio(startOfDay(new Date(sprint.releaseDate)));
    const barW      = Math.max(0.5, (barRight - barLeft) * 100);
    const isHovered = hoveredId === sprint.id;
    const sprintDays = Math.max(1, differenceInDays(new Date(sprint.releaseDate), new Date(sprint.startDate)));
    const progressPct = status === 'active'
      ? Math.max(0, Math.min(100, (differenceInDays(today, new Date(sprint.startDate)) / sprintDays) * 100))
      : 0;

    return (
      <div
        key={sprint.id}
        onClick={() => navigate(`/project-hub/${projectKey}/filters?sprint=${encodeURIComponent(sprint.name)}`)}
        onMouseEnter={() => setHoveredId(sprint.id)}
        onMouseLeave={() => setHoveredId(null)}
        style={{
          display: 'flex', alignItems: 'center', height: 36,
          borderBottom: `1px solid ${T.borderSub}`,
          cursor: 'pointer', position: 'relative',
          background: isHovered ? T.sunken : 'transparent',
          opacity: dimmed ? 0.65 : 1,
          transition: 'background 0.08s',
        }}
      >
        {/* Name */}
        <div style={{
          width: NAME_W, flexShrink: 0, padding: '0 10px 0 16px',
          fontSize: 12, fontWeight: dimmed ? 400 : 500,
          color: dimmed ? T.subtlest : T.text,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {sprint.name}
        </div>

        {/* Chart */}
        <div style={{ flex: 1, position: 'relative', height: '100%', display: 'flex', alignItems: 'center' }}>
          {/* Bar */}
          <div style={{
            position: 'absolute',
            left:  `${barLeft  * 100}%`,
            width: `${barW}%`,
            height: 16, borderRadius: 3,
            background: dimmed ? '#C1C7D0' : style.bar,
            overflow: 'hidden',
          }}>
            {status === 'active' && (
              <div style={{
                position: 'absolute', left: 0, height: '100%',
                width: `${progressPct}%`,
                background: 'rgba(255,255,255,0.22)',
                borderRadius: '3px 0 0 3px',
              }} />
            )}
          </div>
          {/* End date label */}
          <span style={{
            position: 'absolute',
            left: `calc(${barRight * 100}% + 5px)`,
            fontSize: 10, color: T.subtlest, whiteSpace: 'nowrap',
          }}>
            {format(new Date(sprint.releaseDate), 'MMM d')}
          </span>
        </div>

        {/* Meta */}
        <div style={{
          width: META_W, flexShrink: 0, paddingRight: 12,
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6,
        }}>
          {sprint.storyCount !== undefined && sprint.storyCount > 0 && (
            <span style={{
              fontSize: 10, fontWeight: 600, borderRadius: 10, padding: '1px 7px',
              background: dimmed ? T.neutral : style.badge.bg,
              color: dimmed ? T.subtle : style.badge.text,
              whiteSpace: 'nowrap',
            }}>
              {sprint.storyCount}
            </span>
          )}
          <span style={{
            fontSize: 12, color: T.link, fontWeight: 700,
            opacity: isHovered ? 1 : 0.15, transition: 'opacity 0.1s',
          }}>↗</span>
        </div>
      </div>
    );
  };

  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px', borderBottom: `1px solid ${T.border}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: T.text }}>Sprint Timeline</span>
          {past.length > 0 && (
            <button
              onClick={() => setShowPast(v => !v)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                fontSize: 11, color: T.link, fontFamily: 'inherit', fontWeight: 500,
                display: 'flex', alignItems: 'center', gap: 3,
              }}
            >
              {showPast ? '▼' : '▶'} {past.length} past
            </button>
          )}
        </div>
        <span style={{ fontSize: 11, color: T.subtlest }}>
          {format(rangeStart, 'MMM d')} – {format(rangeEnd, 'MMM d, yyyy')}
        </span>
      </div>

      {/* Gantt body */}
      <div style={{ position: 'relative' }}>

        {/* TODAY vertical line (spans all rows) */}
        <div style={{
          position: 'absolute', top: 0, bottom: 0, pointerEvents: 'none', zIndex: 5,
          left: `calc(${NAME_W}px + ${todayRatio} * (100% - ${NAME_W + META_W}px))`,
          width: 2, background: T.link, opacity: 0.35,
        }} />

        {/* Axis row */}
        <div style={{
          display: 'flex', height: 26,
          borderBottom: `1px solid ${T.border}`,
          background: T.sunken, position: 'relative',
        }}>
          <div style={{
            width: NAME_W, flexShrink: 0, paddingLeft: 16,
            display: 'flex', alignItems: 'center',
          }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: T.subtlest, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Sprint
            </span>
          </div>
          <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
            {ticks.map((tick, i) => (
              <span key={i} style={{
                position: 'absolute',
                left: `${toRatio(tick) * 100}%`,
                transform: 'translateX(-50%)',
                fontSize: 10, whiteSpace: 'nowrap',
                color: Math.abs(differenceInDays(tick, today)) <= 3 ? T.link : T.subtlest,
                fontWeight: Math.abs(differenceInDays(tick, today)) <= 3 ? 700 : 400,
              }}>
                {format(tick, 'MMM d')}
              </span>
            ))}
          </div>
          <div style={{ width: META_W, flexShrink: 0 }} />
        </div>

        {/* Completed section toggle */}
        {past.length > 0 && (
          <div
            onClick={() => setShowPast(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', height: 26, gap: 6,
              borderBottom: `1px solid ${T.border}`,
              background: T.sunken, cursor: 'pointer', padding: '0 16px',
            }}
          >
            <span style={{ fontSize: 9, color: T.subtlest }}>{effectiveShowPast ? '▼' : '▶'}</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: T.subtlest, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              {noUpcoming
                ? `Completed — showing ${shownPast.length} of ${past.length} sprints`
                : `Completed — ${past.length} sprints`}
            </span>
          </div>
        )}
        {effectiveShowPast && shownPast.map(s => renderRow(s, true))}

        {/* TODAY pill row */}
        <div style={{
          position: 'relative', height: 20,
          background: T.selected,
          borderTop: `1px solid ${T.link}20`,
          borderBottom: `1px solid ${T.link}20`,
        }}>
          <span style={{
            position: 'absolute',
            left: `calc(${NAME_W}px + ${todayRatio} * (100% - ${NAME_W + META_W}px))`,
            top: '50%', transform: 'translate(-50%, -50%)',
            background: T.link, color: '#fff',
            fontSize: 9, fontWeight: 800, padding: '1px 6px',
            borderRadius: 2, letterSpacing: '0.07em', whiteSpace: 'nowrap',
            zIndex: 6,
          }}>
            TODAY · {format(today, 'MMM d')}
          </span>
        </div>

        {/* No active sprint — only show when there ARE upcoming but none active */}
        {!hasActive && !noUpcoming && (
          <div style={{
            display: 'flex', alignItems: 'center', height: 36, gap: 10,
            borderBottom: `1px solid ${T.borderSub}`,
            padding: '0 16px',
          }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#C1C7D0', flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: T.subtlest, fontStyle: 'italic' }}>
              No active sprint — none currently scheduled in Jira
            </span>
          </div>
        )}

        {/* Active + upcoming rows */}
        {visible.map(s => renderRow(s))}
      </div>

      {/* Legend */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
        padding: '8px 16px', borderTop: `1px solid ${T.border}`,
        background: T.sunken,
      }}>
        {Object.entries(BAR).map(([key, { bar, label }]) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 12, height: 8, borderRadius: 2, background: bar, flexShrink: 0 }} />
            <span style={{ fontSize: 10, color: T.subtle }}>{label}</span>
          </div>
        ))}
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 10, color: T.subtlest, fontStyle: 'italic' }}>
          Click sprint → opens filter module
        </span>
      </div>
    </div>
  );
}

export default ProjectDashboardTimeline;
