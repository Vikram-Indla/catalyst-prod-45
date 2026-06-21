import React, { useState } from 'react';
import { format, startOfDay, addDays, differenceInDays, isBefore, isAfter } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Rocket, ChevronDown, Check } from 'lucide-react';
import { useProjectTimeline, SprintMilestone } from '@/hooks/useProjectTimeline';
import { Skeleton } from '@/components/ui/skeleton';

// ─── Atlassian Design Tokens ──────────────────────────────────────────────────
const T = {
  card:          'var(--ds-surface-raised, #FFFFFF)',
  sunken:        'var(--ds-surface-sunken, #F7F8F9)',
  border:        'var(--ds-border, #DFE1E6)',
  borderSub:     'var(--ds-border-subtle, #F1F2F4)',
  text:          'var(--ds-text, #172B4D)',
  subtle:        'var(--ds-text-subtle, #44546F)',
  subtlest:      'var(--ds-text-subtlest, #626F86)',
  neutral:       'var(--ds-background-neutral, #F1F2F4)',
  textInverse:   'var(--ds-text-inverse, #FFFFFF)',
  // Active sprint — Jira "In Progress" (blue)
  activeSolid:   'var(--ds-link, #0C66E4)',
  activeBoldBg:  'var(--ds-background-information-bold, #0C66E4)',
  activeBg:      'var(--ds-background-information, #E9F2FF)',
  activeText:    'var(--ds-link, #0C66E4)',
  // Upcoming — Jira "New" / discovery (purple)
  upcomingBar:   'var(--ds-icon-discovery, #8270DB)',
  upcomingBoldBg:'var(--ds-background-discovery-bold, #6E5DC6)',
  upcomingBg:    'var(--ds-background-discovery, #F3F0FF)',
  upcomingText:  'var(--ds-text-discovery, #6E5DC6)',
  // Completed — Jira "Success" (green)
  doneBar:       'var(--ds-icon-success, #22A06B)',
  doneBoldBg:    'var(--ds-background-success-bold, #1F845A)',
  doneBg:        'var(--ds-background-success, #DCFFF1)',
  doneText:      'var(--ds-text-success, #1F845A)',
  // Heavy load — Jira "Removed" (danger red)
  heavyBoldBg:   'var(--ds-background-danger-bold, #AE2A19)',
  heavyBg:       'var(--ds-background-danger, #FFEDEB)',
  heavyText:     'var(--ds-text-danger, #AE2A19)',
  // Warning
  warnBg:        'var(--ds-background-warning, #FFF7D6)',
  warnText:      'var(--ds-text-warning, #974F0C)',
  // Bar track
  track:         'var(--ds-background-neutral, #F1F2F4)',
  // Unknown/neutral bold
  neutralBoldBg: 'var(--ds-background-neutral-bold, #626F86)',
  // Card elevation — matches WidgetWrapper elevation.shadow.raised
  shadow:        'var(--ds-shadow-raised, 0 1px 1px rgba(9,30,66,0.25))',
};

// ─── Types ────────────────────────────────────────────────────────────────────
type SprintStatus = 'active' | 'upcoming' | 'completed' | 'unknown';
type LoadLevel    = 'empty' | 'normal' | 'heavy' | 'unknown';

interface SprintTimelineItem {
  id:         string;
  name:       string;
  startDate:  Date | null;
  endDate:    Date | null;
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
    const startDate = i > 0 ? new Date(sorted[i - 1].releaseDate) : addDays(endDate, -14);
    const status    = deriveStatus(startDate, endDate, today);
    return {
      id: s.id, name: s.name, startDate, endDate, status,
      storyCount: s.storyCount ?? null,
      loadLevel: getLoadLevel(s.storyCount),
      isCurrent: status === 'active', isNext: false, isPast: status === 'completed',
    } satisfies SprintTimelineItem;
  });
  const firstUpcoming = withStatus.find(x => x.status === 'upcoming');
  return withStatus.map(item => ({ ...item, isNext: !!firstUpcoming && firstUpcoming.id === item.id }));
}

function getCadenceHealth(items: SprintTimelineItem[]): CadenceHealth {
  const datable = items.filter(i => i.startDate && i.endDate);
  if (datable.length < 2) return { status: 'unknown', message: 'Cadence unavailable', gapCount: 0, overlapCount: 0 };
  let gaps = 0, overlaps = 0;
  for (let i = 1; i < datable.length; i++) {
    const gap = differenceInDays(datable[i].startDate!, datable[i - 1].endDate!);
    if (gap > 1) gaps++;
    else if (gap < 0) overlaps++;
  }
  if (gaps > 0 && overlaps > 0) return { status: 'partial',    message: `${gaps} gap${gaps > 1 ? 's' : ''}, ${overlaps} overlap${overlaps > 1 ? 's' : ''}`, gapCount: gaps, overlapCount: overlaps };
  if (gaps > 0)                 return { status: 'gap',        message: `${gaps} gap${gaps > 1 ? 's' : ''} detected`,      gapCount: gaps, overlapCount: 0 };
  if (overlaps > 0)             return { status: 'overlap',    message: `${overlaps} overlap${overlaps > 1 ? 's' : ''} detected`, gapCount: 0, overlapCount: overlaps };
  return                               { status: 'continuous', message: 'Continuous',                                       gapCount: 0, overlapCount: 0 };
}

function barPosition(item: SprintTimelineItem, rangeStart: Date, totalDays: number) {
  if (!item.startDate || !item.endDate) return { left: 0, width: 0 };
  const ratio = (d: Date) => Math.max(0, Math.min(1, differenceInDays(startOfDay(d), rangeStart) / totalDays));
  const l = ratio(item.startDate), r = ratio(item.endDate);
  return { left: l * 100, width: Math.max(1, (r - l) * 100) };
}

function statusMeta(status: SprintStatus) {
  switch (status) {
    case 'active':    return { bar: T.activeSolid,  boldBg: T.activeBoldBg,   bg: T.activeBg,   text: T.activeText,   label: 'Active' };
    case 'upcoming':  return { bar: T.upcomingBar,  boldBg: T.upcomingBoldBg, bg: T.upcomingBg, text: T.upcomingText, label: 'Upcoming' };
    case 'completed': return { bar: T.doneBar,      boldBg: T.doneBoldBg,     bg: T.doneBg,     text: T.doneText,     label: 'Done' };
    default:          return { bar: T.subtlest,     boldBg: T.neutralBoldBg,  bg: T.neutral,    text: T.subtle,       label: 'Unknown' };
  }
}

// ─── Lozenge — ADS lozenge colors, sentence case ─────────────────────────────
function Lozenge({ children, bg, color }: { children: React.ReactNode; bg: string; color: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '0 6px', height: 18, borderRadius: 3,
      background: bg, color, fontSize: 11, fontWeight: 500,
      lineHeight: '18px', whiteSpace: 'nowrap', letterSpacing: '0.01em',
    }}>
      {children}
    </span>
  );
}


// ─── Section divider ──────────────────────────────────────────────────────────
function SectionHeader({ title, meta, action }: { title: string; meta?: string; action?: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 16px', height: 32,
      background: T.sunken, borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: T.subtle }}>{title}</span>
        {meta && <span style={{ fontSize: 11, color: T.subtlest, fontWeight: 400, marginLeft: 2 }}>{meta}</span>}
      </div>
      {action}
    </div>
  );
}

// ─── Sprint row ───────────────────────────────────────────────────────────────
function SprintRow({ item, rangeStart, totalDays, todayRatio, onOpen, isLast }: {
  item: SprintTimelineItem; rangeStart: Date; totalDays: number;
  todayRatio: number; onOpen: (item: SprintTimelineItem) => void; isLast?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const sm = statusMeta(item.status);
  const { left, width } = barPosition(item, rangeStart, totalDays);

  const progressPct = item.status === 'active' && item.startDate && item.endDate
    ? Math.max(0, Math.min(100,
        (differenceInDays(startOfDay(new Date()), item.startDate) /
         Math.max(1, differenceInDays(item.endDate, item.startDate))) * 100))
    : item.status === 'completed' ? 100 : 0;

  return (
    <div
      role="button" tabIndex={0}
      aria-label={`Open sprint filter for ${item.name}`}
      onClick={() => onOpen(item)}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(item); } }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(200px, 28%) minmax(0, 1fr)',
        alignItems: 'center', minHeight: 48,
        borderBottom: isLast ? 'none' : `1px solid ${T.borderSub}`,
        cursor: 'pointer',
        background: hovered ? T.sunken : 'transparent',
        transition: 'background 0.1s', outline: 'none',
      }}
    >
      {/* Left — icon + name + date */}
      <div style={{ padding: '8px 8px 8px 16px', display: 'flex', alignItems: 'flex-start', gap: 8, overflow: 'hidden' }}>
        {/* Sprint icon — solid bold-color container with white rocket (vibrant, not pale) */}
        <div style={{
          width: 20, height: 20, borderRadius: 4, flexShrink: 0,
          background: item.isPast ? T.doneBoldBg : sm.boldBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {item.isPast
            ? <Check size={11} color={T.textInverse} strokeWidth={2.5} />
            : <Rocket size={11} color={T.textInverse} strokeWidth={2} />
          }
        </div>
        <div style={{ overflow: 'hidden', flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4, flexWrap: 'nowrap' }}>
            {item.isCurrent && (
              <Lozenge bg={T.activeBg} color={T.activeText}>Current</Lozenge>
            )}
            {item.isNext && (
              <Lozenge bg={T.upcomingBg} color={T.upcomingText}>Next</Lozenge>
            )}
            <span style={{
              fontSize: 13, fontWeight: item.isCurrent ? 600 : 500,
              color: item.isPast ? T.subtle : T.text,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }} title={item.name}>
              {item.name}
            </span>
          </div>
          <span style={{ fontSize: 11, color: T.subtlest }}>
            {formatDateRange(item.startDate, item.endDate)}
            {item.status === 'upcoming' && <span style={{ fontStyle: 'italic' }}> · est. start</span>}
          </span>
        </div>
      </div>

      {/* Center — bar track + fill + today marker */}
      <div style={{ position: 'relative', height: '100%', display: 'flex', alignItems: 'center', padding: '0 8px' }}>
        {[0.25, 0.5, 0.75].map(r => (
          <div key={r} style={{
            position: 'absolute', left: `${r * 100}%`, top: 8, bottom: 8,
            width: 1, background: T.borderSub, pointerEvents: 'none',
          }} />
        ))}
        <div style={{
          position: 'absolute', left: `${todayRatio * 100}%`,
          top: 4, bottom: 4, width: 2, borderRadius: 1,
          background: T.activeSolid, opacity: 0.6, zIndex: 2, pointerEvents: 'none',
        }} />
        {width > 0 && (
          <div style={{
            position: 'absolute',
            left: `${left}%`, width: `${width}%`,
            height: 8, borderRadius: 4,
            background: T.track, overflow: 'hidden', zIndex: 1,
          }}>
            <div style={{
              height: '100%',
              width: `${progressPct}%`,
              background: sm.bar,
              borderRadius: 4,
              transition: 'width 0.3s ease',
            }} />
          </div>
        )}
      </div>

    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────
function TimelineSkeleton() {
  return (
    <div style={{
      background: T.card,
      boxShadow: T.shadow,
      border: `1px solid ${T.border}`,
      borderTop: `3px solid ${T.activeSolid}`,
      borderRadius: 8, overflow: 'hidden',
    }}>
      <div style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}` }}>
        <Skeleton style={{ height: 16, width: 200, marginBottom: 8 }} />
        <Skeleton style={{ height: 12, width: 280 }} />
      </div>
      <Skeleton style={{ height: 32, borderRadius: 0 }} />
      {[1, 2, 3, 4].map(i => (
        <div key={i} style={{
          display: 'grid', gridTemplateColumns: '28% 1fr',
          height: 48, padding: '0 16px', gap: 16, alignItems: 'center',
          borderBottom: `1px solid ${T.borderSub}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Skeleton style={{ width: 20, height: 20, borderRadius: 4 }} />
            <div><Skeleton style={{ height: 13, width: 120, marginBottom: 4 }} /><Skeleton style={{ height: 11, width: 80 }} /></div>
          </div>
          <Skeleton style={{ height: 8, borderRadius: 4 }} />
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
  const [collapsed, setCollapsed] = useState(false);

  if (isLoading) return <TimelineSkeleton />;

  if (!data?.sprints?.length) {
    return (
      <div style={{
        background: T.card,
        boxShadow: T.shadow,
        border: `1px solid ${T.border}`,
        borderTop: `3px solid ${T.activeSolid}`,
        borderRadius: 8, overflow: 'hidden',
      }}>
        <div
          onClick={() => setCollapsed(v => !v)}
          style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', cursor: 'pointer' }}
        >
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>Sprint Execution Timeline</div>
            <div style={{ fontSize: 12, color: T.subtle, marginTop: 4 }}>Sprint / iteration cadence and current execution window</div>
          </div>
          <ChevronDown size={16} color={T.subtlest} style={{ marginTop: 4, flexShrink: 0, transition: 'transform 0.2s', transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }} />
        </div>
        <div style={{ padding: '48px 24px', textAlign: 'center' }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            background: T.activeBoldBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px',
          }}>
            <Rocket size={24} color={T.textInverse} strokeWidth={1.5} />
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 4 }}>No sprint data</div>
          <div style={{ fontSize: 12, color: T.subtle }}>
            Once sprints are linked to this project, the execution timeline will appear here.
          </div>
        </div>
      </div>
    );
  }

  const today     = startOfDay(new Date());
  const items     = buildItems(data.sprints, today);
  const current   = items.filter(i => i.status === 'active');
  const upcoming  = items.filter(i => i.status === 'upcoming');
  const completed = items.filter(i => i.status === 'completed');

  const COMPLETED_LIMIT = 4;
  const shownCompleted = showAllCompleted ? completed : completed.slice(-COMPLETED_LIMIT);

  const rangeItems = [...shownCompleted, ...current, ...upcoming];
  const eff        = rangeItems.length > 0 ? rangeItems : items;
  const rangeStart = addDays(eff[0].startDate ?? addDays(today, -14), -7);
  const rangeEnd   = addDays(eff[eff.length - 1].endDate ?? addDays(today, 14), 14);
  const totalDays  = Math.max(1, differenceInDays(rangeEnd, rangeStart));
  const todayRatio = Math.max(0, Math.min(1, differenceInDays(today, rangeStart) / totalDays));

  const tickInterval = totalDays <= 45 ? 7 : totalDays <= 120 ? 14 : 30;
  const rawTicks: Date[] = [];
  for (let d = rangeStart; differenceInDays(rangeEnd, d) >= 0; d = addDays(d, tickInterval)) rawTicks.push(d);
  const ticks = rawTicks.length > 7 ? rawTicks.filter((_, i) => i % Math.ceil(rawTicks.length / 7) === 0) : rawTicks;

  const cadence     = getCadenceHealth(items);
  const heavyCount  = items.filter(i => i.loadLevel === 'heavy' && !i.isPast).length;
  const nextSprint  = upcoming[0] ?? null;
  const activeSprint = current[0] ?? null;

  const openSprintFilter = (item: SprintTimelineItem) => {
    navigate(`/project-hub/${projectKey}/filters?sprint=${encodeURIComponent(item.name)}`);
  };
  const rowProps = { rangeStart, totalDays, todayRatio, onOpen: openSprintFilter };

  return (
    <div style={{
      background: T.card,
      boxShadow: T.shadow,
      border: `1px solid ${T.border}`,
      borderTop: `3px solid ${T.activeSolid}`,
      borderRadius: 8, overflow: 'hidden',
    }}>

      {/* Title row — click to collapse */}
      <div
        onClick={() => setCollapsed(v => !v)}
        style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' }}
      >
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>Sprint Execution Timeline</div>
          <div style={{ fontSize: 12, color: T.subtle, marginTop: 4 }}>Sprint / iteration cadence and current execution window</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 16 }}>
          <span style={{
            fontSize: 12, fontWeight: 500, color: T.subtle, flexShrink: 0,
            background: T.neutral, borderRadius: 4, padding: '2px 8px',
          }}>
            {format(rangeStart, 'MMM d, yyyy')} – {format(rangeEnd, 'MMM d, yyyy')}
          </span>
          <ChevronDown size={16} color={T.subtle} style={{ flexShrink: 0, transition: 'transform 0.2s', transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }} />
        </div>
      </div>

      {!collapsed && <>{/* Axis header — Sprint/Iteration | [timeline] */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(200px, 28%) minmax(0, 1fr)',
        height: 32, background: T.sunken, borderBottom: `1px solid ${T.border}`,
      }}>
        <div style={{ paddingLeft: 40, display: 'flex', alignItems: 'center' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: T.subtlest }}>Sprint / Iteration</span>
        </div>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', padding: '0 8px' }}>
          {ticks.map((tick, i) => {
            const ratio = Math.max(0, Math.min(1, differenceInDays(tick, rangeStart) / totalDays));
            const isToday = Math.abs(differenceInDays(tick, today)) <= 3;
            return (
              <span key={i} style={{
                position: 'absolute', left: `${ratio * 100}%`, transform: 'translateX(-50%)',
                fontSize: 10, whiteSpace: 'nowrap',
                color: isToday ? T.activeSolid : T.subtlest,
                fontWeight: isToday ? 700 : 400,
              }}>
                {format(tick, 'MMM d')}
              </span>
            );
          })}
          <div style={{
            position: 'absolute', left: `${todayRatio * 100}%`,
            top: 4, bottom: 4, width: 2, borderRadius: 1,
            background: T.activeSolid, opacity: 0.5, pointerEvents: 'none',
          }} />
        </div>
      </div>

      {/* Current section */}
      <SectionHeader title="Current" />
      {current.length > 0
        ? current.map((item, i) => <SprintRow key={item.id} item={item} {...rowProps} isLast={i === current.length - 1} />)
        : (
          <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: T.subtlest, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: T.subtle }}>
              No active sprint.{nextSprint?.startDate ? ` Next sprint starts ${format(nextSprint.startDate, 'MMM d')}.` : ''}
            </span>
          </div>
        )
      }

      {/* Upcoming section */}
      {upcoming.length > 0 && (
        <>
          <SectionHeader title="Upcoming" meta={`${upcoming.length} sprint${upcoming.length > 1 ? 's' : ''}`} />
          {upcoming.slice(0, 3).map((item, i) => (
            <SprintRow key={item.id} item={item} {...rowProps} isLast={i === Math.min(2, upcoming.length - 1)} />
          ))}
          {upcoming.length > 3 && (
            <div style={{ padding: '8px 16px', background: T.sunken, borderTop: `1px solid ${T.borderSub}` }}>
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
            meta={showAllCompleted ? `all ${completed.length}` : `${shownCompleted.length} of ${completed.length}`}
            action={completed.length > COMPLETED_LIMIT
              ? (
                <button onClick={() => setShowAllCompleted(v => !v)} style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  fontSize: 11, color: T.activeSolid, fontFamily: 'inherit', fontWeight: 500,
                }}>
                  {showAllCompleted ? 'Show fewer' : 'Show all'}
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
        background: T.sunken, flexWrap: 'wrap', gap: 8,
      }}>
        <span style={{ fontSize: 10, color: T.subtlest, fontStyle: 'italic' }}>
          Start dates estimated · End dates from Jira · Click any row to filter
        </span>
        <span style={{ fontSize: 10, color: T.subtlest }}>
          {items.length} sprint{items.length !== 1 ? 's' : ''} total
        </span>
      </div>
      </>}
    </div>
  );
}

export default ProjectDashboardTimeline;
