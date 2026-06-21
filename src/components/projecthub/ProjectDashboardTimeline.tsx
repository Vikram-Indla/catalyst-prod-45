import React, { useState } from 'react';
import { format, startOfDay, addDays, differenceInDays, isBefore, isAfter } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useProjectTimeline, SprintMilestone } from '@/hooks/useProjectTimeline';
import { Skeleton } from '@/components/ui/skeleton';

// ─── Atlassian design tokens ─────────────────────────────────────────────────
// All color values use var(--ds-*, fallback) per ADS governance rules.
const T = {
  card:        'var(--ds-surface-raised, #FFFFFF)',
  border:      'var(--ds-border, #DFE1E6)',
  borderSub:   'var(--ds-border-subtle, #F1F2F4)',
  text:        'var(--ds-text, #172B4D)',
  subtle:      'var(--ds-text-subtle, #44546F)',
  subtlest:    'var(--ds-text-subtlest, #626F86)',
  neutral:     'var(--ds-background-neutral, #F1F2F4)',
  sunken:      'var(--ds-surface-sunken, #F7F8F9)',
  link:        'var(--ds-link, #0C66E4)',
  // Status — active
  activeBar:   'var(--ds-link, #0C66E4)',
  activeBg:    'var(--ds-background-selected, #E9F2FF)',
  activeText:  'var(--ds-link, #0C66E4)',
  // Status — upcoming
  upcomingBar: 'var(--ds-icon-success, #22A06B)',
  upcomingBg:  'var(--ds-background-success, #DCFFF1)',
  upcomingText:'var(--ds-text-success, #1F845A)',
  // Status — completed
  doneBar:     'var(--ds-background-neutral-bold, #8590A2)',
  doneBg:      'var(--ds-background-neutral, #F1F2F4)',
  doneText:    'var(--ds-text-subtle, #44546F)',
  // Warning / data quality
  warnBg:      'var(--ds-background-warning, #FFF7D6)',
  warnText:    'var(--ds-text-warning, #974F0C)',
  // Danger / heavy load
  dangerBg:    'var(--ds-background-danger, #FFEDEB)',
  dangerText:  'var(--ds-text-danger, #AE2A19)',
};

// ─── Types ────────────────────────────────────────────────────────────────────
type SprintStatus = 'active' | 'upcoming' | 'completed' | 'unknown';
type LoadLevel    = 'empty' | 'normal' | 'heavy' | 'unknown';

interface SprintTimelineItem {
  id:         string;
  name:       string;
  startDate:  Date | null;   // always derived — estimated
  endDate:    Date | null;   // from sprint_release JSONB
  status:     SprintStatus;
  storyCount: number | null;
  loadLevel:  LoadLevel;
  isCurrent:  boolean;
  isNext:     boolean;
  isPast:     boolean;
}

interface CadenceHealth {
  status:       'continuous' | 'gap' | 'overlap' | 'partial' | 'unknown';
  message:      string;
  gapCount:     number;
  overlapCount: number;
}

// ─── Pure helpers ─────────────────────────────────────────────────────────────
function deriveStatus(startDate: Date | null, endDate: Date | null, today: Date): SprintStatus {
  if (!endDate) return 'unknown';
  if (isBefore(startOfDay(endDate), today)) return 'completed';
  if (startDate && isAfter(startOfDay(startDate), today)) return 'upcoming';
  return 'active';
}

function getLoadLevel(count: number | null | undefined): LoadLevel {
  if (count === null || count === undefined) return 'unknown';
  if (count === 0) return 'empty';
  if (count <= 40) return 'normal';
  return 'heavy';
}

function formatDateRange(start: Date | null, end: Date | null): string {
  if (!start && !end) return 'Dates missing';
  if (!start) return end ? `Ends ${format(end, 'MMM d')}` : 'Dates missing';
  if (!end)   return `From ${format(start, 'MMM d')}`;
  return `${format(start, 'MMM d')} – ${format(end, 'MMM d')}`;
}

function buildItems(raw: SprintMilestone[], today: Date): SprintTimelineItem[] {
  const sorted = [...raw].sort(
    (a, b) => new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime()
  );

  const withStatus = sorted.map((s, i) => {
    const endDate   = new Date(s.releaseDate);
    // startDate derived from previous sprint's releaseDate (always estimated)
    const startDate = i > 0
      ? new Date(sorted[i - 1].releaseDate)
      : addDays(endDate, -14);
    const status    = deriveStatus(startDate, endDate, today);
    return {
      id:         s.id,
      name:       s.name,
      startDate,
      endDate,
      status,
      storyCount: s.storyCount ?? null,
      loadLevel:  getLoadLevel(s.storyCount),
      isCurrent:  status === 'active',
      isNext:     false,
      isPast:     status === 'completed',
    } satisfies SprintTimelineItem;
  });

  const firstUpcoming = withStatus.find(x => x.status === 'upcoming');
  return withStatus.map(item => ({
    ...item,
    isNext: !!firstUpcoming && firstUpcoming.id === item.id,
  }));
}

function getCadenceHealth(items: SprintTimelineItem[]): CadenceHealth {
  const datable = items.filter(i => i.startDate && i.endDate);
  if (datable.length < 2) {
    return { status: 'unknown', message: 'Cadence unavailable', gapCount: 0, overlapCount: 0 };
  }
  let gaps = 0, overlaps = 0;
  for (let i = 1; i < datable.length; i++) {
    const gap = differenceInDays(datable[i].startDate!, datable[i - 1].endDate!);
    if (gap > 1) gaps++;
    else if (gap < 0) overlaps++;
  }
  if (gaps > 0 && overlaps > 0) {
    return { status: 'partial', message: `${gaps} gap${gaps > 1 ? 's' : ''}, ${overlaps} overlap${overlaps > 1 ? 's' : ''}`, gapCount: gaps, overlapCount: overlaps };
  }
  if (gaps > 0)     return { status: 'gap',        message: `${gaps} gap${gaps > 1 ? 's' : ''} detected`,        gapCount: gaps, overlapCount: 0 };
  if (overlaps > 0) return { status: 'overlap',     message: `${overlaps} overlap${overlaps > 1 ? 's' : ''} detected`, gapCount: 0, overlapCount: overlaps };
  return              { status: 'continuous', message: 'Continuous cadence',                               gapCount: 0, overlapCount: 0 };
}

function barPosition(item: SprintTimelineItem, rangeStart: Date, totalDays: number) {
  if (!item.startDate || !item.endDate) return { left: 0, width: 0 };
  const ratio = (d: Date) => Math.max(0, Math.min(1, differenceInDays(startOfDay(d), rangeStart) / totalDays));
  const l = ratio(item.startDate);
  const r = ratio(item.endDate);
  return { left: l, width: Math.max(0.5, (r - l) * 100) };
}

function statusStyle(status: SprintStatus) {
  switch (status) {
    case 'active':    return { bar: T.activeBar,   chipBg: T.activeBg,   chipText: T.activeText,   label: 'Active' };
    case 'upcoming':  return { bar: T.upcomingBar, chipBg: T.upcomingBg, chipText: T.upcomingText, label: 'Upcoming' };
    case 'completed': return { bar: T.doneBar,     chipBg: T.doneBg,     chipText: T.doneText,     label: 'Completed' };
    default:          return { bar: T.doneBar,     chipBg: T.neutral,    chipText: T.subtle,       label: 'Unknown' };
  }
}

// ─── Summary chip ─────────────────────────────────────────────────────────────
function Chip({ label, value, textColor, bg }: {
  label: string; value: string; textColor: string; bg: string;
}) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '4px 8px', borderRadius: 12, background: bg, whiteSpace: 'nowrap',
    }}>
      <span style={{ fontSize: 10, color: T.subtlest, fontWeight: 500 }}>{label}:</span>
      <span style={{ fontSize: 10, color: textColor, fontWeight: 600 }}>{value}</span>
    </div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({ title, meta, action }: {
  title: string; meta?: string; action?: React.ReactNode;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '4px 16px', background: T.sunken, borderBottom: `1px solid ${T.border}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: T.subtlest }}>{title}</span>
        {meta && <span style={{ fontSize: 10, color: T.subtlest }}>{meta}</span>}
      </div>
      {action}
    </div>
  );
}

// ─── Sprint row ───────────────────────────────────────────────────────────────
interface SprintRowProps {
  item:       SprintTimelineItem;
  rangeStart: Date;
  totalDays:  number;
  todayRatio: number;
  projectKey: string;
  onOpen:     (item: SprintTimelineItem) => void;
  isLast?:    boolean;
}

function SprintRow({ item, rangeStart, totalDays, todayRatio, onOpen, isLast }: SprintRowProps) {
  const [hovered, setHovered] = useState(false);
  const st = statusStyle(item.status);
  const { left, width } = barPosition(item, rangeStart, totalDays);

  const progressPct = item.status === 'active' && item.startDate && item.endDate
    ? Math.max(0, Math.min(100,
        (differenceInDays(startOfDay(new Date()), item.startDate) /
         Math.max(1, differenceInDays(item.endDate, item.startDate))) * 100
      ))
    : 0;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Open sprint filter for ${item.name}`}
      onClick={() => onOpen(item)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(item); }
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(200px, 28%) minmax(0, 1fr) minmax(170px, auto)',
        alignItems: 'center',
        minHeight: 46,
        borderBottom: isLast ? 'none' : `1px solid ${T.borderSub}`,
        cursor: 'pointer',
        background: hovered ? T.sunken : 'transparent',
        transition: 'background 0.1s',
        outline: 'none',
      }}
    >
      {/* Left — name + date */}
      <div style={{ padding: '8px 8px 8px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
          {item.isCurrent && (
            <span style={{
              fontSize: 9, fontWeight: 700,
              background: T.activeBg, color: T.activeText,
              padding: '0 4px', borderRadius: 3, flexShrink: 0,
            }}>Current</span>
          )}
          {item.isNext && (
            <span style={{
              fontSize: 9, fontWeight: 700,
              background: T.upcomingBg, color: T.upcomingText,
              padding: '0 4px', borderRadius: 3, flexShrink: 0,
            }}>Next</span>
          )}
          <span
            title={item.name}
            style={{
              fontSize: 13,
              fontWeight: item.isCurrent ? 600 : 500,
              color: item.isPast ? T.subtle : T.text,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}
          >
            {item.name}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 11, color: T.subtlest }}>
            {formatDateRange(item.startDate, item.endDate)}
          </span>
          <span style={{ fontSize: 10, color: T.subtlest, fontStyle: 'italic' }}>· est. start</span>
        </div>
      </div>

      {/* Center — bar */}
      <div style={{ position: 'relative', height: '100%', display: 'flex', alignItems: 'center', padding: '0 4px' }}>
        {[0.25, 0.5, 0.75].map(r => (
          <div key={r} style={{
            position: 'absolute', left: `${r * 100}%`, top: 6, bottom: 6,
            width: 1, background: T.borderSub, pointerEvents: 'none',
          }} />
        ))}
        {/* Today line */}
        <div style={{
          position: 'absolute', left: `${todayRatio * 100}%`,
          top: 4, bottom: 4, width: 1,
          background: T.link, opacity: 0.35, zIndex: 2, pointerEvents: 'none',
        }} />
        {/* Sprint bar */}
        {width > 0 && (
          <div style={{
            position: 'absolute',
            left:  `${left * 100}%`,
            width: `${width}%`,
            height: 20, borderRadius: 4,
            background: item.isPast ? T.doneBar : st.bar,
            opacity: item.isPast ? 0.65 : 1,
            overflow: 'hidden', zIndex: 1,
          }}>
            {progressPct > 0 && (
              <div style={{
                position: 'absolute', left: 0, height: '100%', width: `${progressPct}%`,
                background: 'var(--ds-surface-overlay, rgba(255,255,255,0.25))',
                borderRadius: '4px 0 0 4px',
              }} />
            )}
          </div>
        )}
      </div>

      {/* Right — workload */}
      <div style={{
        padding: '8px 12px 8px 8px',
        display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3,
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '4px 8px', borderRadius: 10,
          background: item.isPast ? T.doneBg : st.chipBg,
        }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: item.isPast ? T.doneText : st.chipText }}>
            {item.storyCount !== null ? item.storyCount : '—'}
          </span>
          <span style={{ fontSize: 10, color: item.isPast ? T.doneText : st.chipText }}>
            {item.storyCount === 1 ? 'item' : 'items'}
          </span>
        </div>
        {item.loadLevel === 'heavy' && !item.isPast && (
          <span style={{ fontSize: 10, color: T.dangerText, fontWeight: 500 }}>Heavy load</span>
        )}
        {item.loadLevel === 'empty' && !item.isPast && (
          <span style={{ fontSize: 10, color: T.subtlest, fontStyle: 'italic' }}>No work items</span>
        )}
        {hovered && (
          <span style={{ fontSize: 10, color: T.link, fontWeight: 500 }}>Open sprint →</span>
        )}
      </div>
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────
function TimelineSkeleton() {
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}` }}>
        <Skeleton style={{ height: 16, width: 192, marginBottom: 8 }} />
        <Skeleton style={{ height: 12, width: 288, marginBottom: 12 }} />
        <div style={{ display: 'flex', gap: 8 }}>
          {[96, 80, 64, 56, 80].map((w, i) => (
            <Skeleton key={i} style={{ height: 20, width: w, borderRadius: 12 }} />
          ))}
        </div>
      </div>
      <Skeleton style={{ height: 28, borderRadius: 0 }} />
      {[1, 2, 3].map(i => (
        <div key={i} style={{
          display: 'grid', gridTemplateColumns: '28% 1fr auto', alignItems: 'center',
          height: 46, padding: '0 16px', gap: 12, borderBottom: `1px solid ${T.borderSub}`,
        }}>
          <Skeleton style={{ height: 14, width: 140 }} />
          <Skeleton style={{ height: 14 }} />
          <Skeleton style={{ height: 20, width: 64, borderRadius: 10 }} />
        </div>
      ))}
    </div>
  );
}

// ─── Main widget ──────────────────────────────────────────────────────────────
export function ProjectDashboardTimeline({ projectKey }: { projectKey: string }) {
  const navigate = useNavigate();
  const { data, isLoading } = useProjectTimeline(projectKey);
  const [showAllCompleted, setShowAllCompleted] = useState(false);

  if (isLoading) return <TimelineSkeleton />;

  if (!data?.sprints?.length) {
    return (
      <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>Sprint Execution Timeline</div>
          <div style={{ fontSize: 12, color: T.subtle, marginTop: 4}}>Sprint cadence, workload, and current execution window</div>
        </div>
        <div style={{ padding: '48px 24px', textAlign: 'center' }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%', background: T.neutral,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px',
          }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <rect x="2" y="3" width="16" height="14" rx="2" stroke={T.subtlest} strokeWidth="1.5" />
              <path d="M2 7h16" stroke={T.subtlest} strokeWidth="1.5" />
              <path d="M6 1v4M14 1v4" stroke={T.subtlest} strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 4 }}>No sprint data available</div>
          <div style={{ fontSize: 12, color: T.subtle }}>
            Once sprints are linked to this project, cadence and workload will appear here.
          </div>
        </div>
      </div>
    );
  }

  // Build normalized view model
  const today     = startOfDay(new Date());
  const items     = buildItems(data.sprints, today);
  const current   = items.filter(i => i.status === 'active');
  const upcoming  = items.filter(i => i.status === 'upcoming');
  const completed = items.filter(i => i.status === 'completed');

  const COMPLETED_DEFAULT = 4;
  const shownCompleted = showAllCompleted ? completed : completed.slice(-COMPLETED_DEFAULT);

  // Timeline range
  const rangeItems     = [...shownCompleted, ...current, ...upcoming];
  const effectiveItems = rangeItems.length > 0 ? rangeItems : items;
  const rangeStart = addDays(effectiveItems[0].startDate ?? addDays(today, -14), -7);
  const rangeEnd   = addDays(effectiveItems[effectiveItems.length - 1].endDate ?? addDays(today, 14), 14);
  const totalDays  = Math.max(1, differenceInDays(rangeEnd, rangeStart));
  const todayRatio = Math.max(0, Math.min(1, differenceInDays(today, rangeStart) / totalDays));

  // Adaptive ticks (weekly / biweekly / monthly)
  const tickInterval = totalDays <= 45 ? 7 : totalDays <= 120 ? 14 : 30;
  const rawTicks: Date[] = [];
  for (let d = rangeStart; differenceInDays(rangeEnd, d) >= 0; d = addDays(d, tickInterval)) {
    rawTicks.push(d);
  }
  const ticks = rawTicks.length > 7
    ? rawTicks.filter((_, i) => i % Math.ceil(rawTicks.length / 7) === 0)
    : rawTicks;

  // Summary metrics
  const cadence    = getCadenceHealth(items);
  const activeSprint = current[0] ?? null;
  const nextSprint   = upcoming[0] ?? null;
  const heavyCount   = items.filter(i => i.loadLevel === 'heavy' && !i.isPast).length;

  const openSprintFilter = (item: SprintTimelineItem) => {
    navigate(`/project-hub/${projectKey}/filters?sprint=${encodeURIComponent(item.name)}`);
  };

  const rowProps = { rangeStart, totalDays, todayRatio, projectKey, onOpen: openSprintFilter };

  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}` }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>Sprint Execution Timeline</div>
            <div style={{ fontSize: 12, color: T.subtle, marginTop: 4}}>
              Sprint cadence, workload, and current execution window
            </div>
          </div>
          <span style={{ fontSize: 11, color: T.subtlest, flexShrink: 0, marginLeft: 16, marginTop: 4}}>
            {format(rangeStart, 'MMM d')} – {format(rangeEnd, 'MMM d, yyyy')}
          </span>
        </div>

        {/* Summary chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {activeSprint
            ? <Chip
                label="Active"
                value={activeSprint.name.length > 22 ? `${activeSprint.name.slice(0, 22)}…` : activeSprint.name}
                textColor={T.activeText} bg={T.activeBg}
              />
            : nextSprint
              ? <Chip
                  label="Next sprint"
                  value={nextSprint.startDate ? format(nextSprint.startDate, 'MMM d') : '—'}
                  textColor={T.upcomingText} bg={T.upcomingBg}
                />
              : <Chip label="Sprint" value="No active sprint" textColor={T.subtlest} bg={T.neutral} />
          }
          <Chip
            label="Cadence"
            value={cadence.message}
            textColor={cadence.status === 'continuous' ? T.upcomingText : T.dangerText}
            bg={cadence.status === 'continuous' ? T.upcomingBg : T.dangerBg}
          />
          <Chip
            label="Load"
            value={heavyCount > 0 ? `${heavyCount} heavy sprint${heavyCount > 1 ? 's' : ''}` : 'Normal'}
            textColor={heavyCount > 0 ? T.dangerText : T.upcomingText}
            bg={heavyCount > 0 ? T.dangerBg : T.upcomingBg}
          />
          <Chip label="Completed" value={String(completed.length)} textColor={T.doneText} bg={T.doneBg} />
          <Chip label="Data" value="Estimated dates" textColor={T.warnText} bg={T.warnBg} />
        </div>
      </div>

      {/* Timeline axis */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(200px, 28%) minmax(0, 1fr) minmax(170px, auto)',
        height: 28, background: T.sunken, borderBottom: `1px solid ${T.border}`,
      }}>
        <div style={{ paddingLeft: 16, display: 'flex', alignItems: 'center' }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: T.subtlest }}>Sprint</span>
        </div>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          {ticks.map((tick, i) => {
            const ratio = Math.max(0, Math.min(1, differenceInDays(tick, rangeStart) / totalDays));
            const near  = Math.abs(differenceInDays(tick, today)) <= 3;
            return (
              <span key={i} style={{
                position: 'absolute', left: `${ratio * 100}%`, transform: 'translateX(-50%)',
                fontSize: 10, whiteSpace: 'nowrap',
                color: near ? T.link : T.subtlest,
                fontWeight: near ? 600 : 400,
              }}>
                {format(tick, 'MMM d')}
              </span>
            );
          })}
          <div style={{
            position: 'absolute', left: `${todayRatio * 100}%`,
            top: 4, bottom: 4, width: 1,
            background: T.link, opacity: 0.4, pointerEvents: 'none',
          }} />
        </div>
        <div style={{ paddingRight: 12, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: T.subtlest }}>Workload</span>
        </div>
      </div>

      {/* Current section */}
      <SectionHeader title="Current" />
      {current.length > 0
        ? current.map((item, i) => (
            <SprintRow key={item.id} item={item} {...rowProps} isLast={i === current.length - 1} />
          ))
        : (
          <div style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: T.doneBar, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: T.subtle }}>
              No active sprint scheduled for today.
              {nextSprint?.startDate ? ` Next sprint starts ${format(nextSprint.startDate, 'MMM d')}.` : ''}
            </span>
          </div>
        )
      }

      {/* Upcoming section */}
      {upcoming.length > 0 && (
        <>
          <SectionHeader
            title="Upcoming"
            meta={`${upcoming.length} sprint${upcoming.length > 1 ? 's' : ''}`}
          />
          {upcoming.slice(0, 3).map((item, i) => (
            <SprintRow
              key={item.id} item={item} {...rowProps}
              isLast={i === Math.min(2, upcoming.length - 1)}
            />
          ))}
          {upcoming.length > 3 && (
            <div style={{ padding: '8px 16px', background: T.sunken }}>
              <span style={{ fontSize: 11, color: T.subtle }}>
                + {upcoming.length - 3} more upcoming sprint{upcoming.length - 3 > 1 ? 's' : ''}
              </span>
            </div>
          )}
        </>
      )}

      {/* Recently completed section */}
      {completed.length > 0 && (
        <>
          <SectionHeader
            title="Recently completed"
            meta={showAllCompleted
              ? `${completed.length} sprints`
              : `showing ${shownCompleted.length} of ${completed.length}`}
            action={completed.length > COMPLETED_DEFAULT
              ? (
                <button
                  onClick={() => setShowAllCompleted(v => !v)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                    fontSize: 11, color: T.link, fontFamily: 'inherit', fontWeight: 500,
                  }}
                >
                  {showAllCompleted ? 'Show fewer' : 'Show all completed'}
                </button>
              )
              : undefined
            }
          />
          {shownCompleted.map((item, i) => (
            <SprintRow key={item.id} item={item} {...rowProps} isLast={i === shownCompleted.length - 1} />
          ))}
        </>
      )}

      {/* Footer */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 16px', borderTop: `1px solid ${T.border}`,
        background: T.sunken, flexWrap: 'wrap', gap: 6,
      }}>
        <span style={{ fontSize: 10, color: T.subtlest, fontStyle: 'italic' }}>
          Start dates estimated · End dates from Jira · Workload from stories linked to each sprint
        </span>
        <span style={{ fontSize: 10, color: T.subtlest, fontStyle: 'italic' }}>
          Click any row to open filtered view
        </span>
      </div>
    </div>
  );
}

export default ProjectDashboardTimeline;
