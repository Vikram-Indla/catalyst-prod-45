/**
 * R360 Member Detail Page
 * Route: /project-hub/resources/:resourceId
 * Contains: Profile Header, Week Nav, Ring/Chronology/Board views, Detail Panel
 */
import React, { useState, useMemo, useCallback, useEffect, useRef, lazy, Suspense } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useR360Overview, useR360WorkItems, useR360Siblings } from '@/hooks/useR360';
import { computeCarriedFromLabel } from '@/services/r360Service';
import { R360_DEPT_COLORS, R360_PROJECT_COLORS } from '@/constants/r360';
import { initials, slugify, ageBarPercent, ageBarColor, formatRelativeDate, formatDate } from '@/utils/r360Utils';
import { getJiraIcon } from '@/components/r360/R360JiraIcons';
import { ChevronLeft, ChevronRight, Calendar, X, ChevronDown, ChevronUp } from 'lucide-react';
import type { R360WorkItem, R360ViewType, R360Filters } from '@/types/r360';
import '@/styles/r360.css';
import '@/components/resource360/r360-member.css';
import AIIntelligencePanel from '@/components/resources/AIIntelligencePanel';
import { AIIntelligenceButton } from '@/components/ui/AIIntelligenceButton';

// ── Period helpers ──
type PeriodType = 'weekly' | 'monthly';

function getWeekRange(offset: number) {
  const now = new Date();
  const day = now.getDay();
  const sun = new Date(now);
  sun.setDate(now.getDate() - day + offset * 7);
  sun.setHours(0, 0, 0, 0);
  // Saudi work week: Sunday–Thursday (5 days)
  const thu = new Date(sun);
  thu.setDate(sun.getDate() + 4);
  thu.setHours(23, 59, 59, 999);
  const M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const label = offset === 0 ? 'This Week' : offset === -1 ? 'Last Week' : offset === 1 ? 'Next Week' : `Week ${offset > 0 ? '+' : ''}${offset}`;
  const range = `${M[sun.getMonth()]} ${sun.getDate()} – ${M[thu.getMonth()]} ${thu.getDate()}, ${thu.getFullYear()}`;
  return { start: sun, end: thu, label, range };
}

function getMonthRange(offset: number) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0);
  end.setHours(23, 59, 59, 999);
  const M = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const label = offset === 0 ? 'This Month' : `${M[start.getMonth()]} ${start.getFullYear()}`;
  const range = `${M[start.getMonth()]} 1 – ${start.getDate() === 1 ? end.getDate() : end.getDate()}, ${end.getFullYear()}`;
  return { start, end, label, range };
}

// ── Status pill component ──
function StatusPill({ label, color, bg, dot }: { label: string; color: string; bg: string; dot: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 10px', borderRadius: '4px', fontSize: '11.5px', fontWeight: 600, background: bg, color }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0, background: dot }} />
      {label}
    </span>
  );
}

// ── Project tag ──
function ProjTag({ projectKey }: { projectKey: string }) {
  const bg = R360_PROJECT_COLORS[projectKey] || '#64748B';
  return <span className="r3-proj-tag" style={{ background: bg }}>{projectKey}</span>;
}

// ── Age badge ──
function AgeBadge({ days, ageClass }: { days: number; ageClass: string }) {
  return <span className={`r3-age r3-age--${ageClass}`} style={{ fontSize: 12 }}>{days}d</span>;
}

// ── Priority dot color ──
function priorityDotColor(p: string) {
  const l = p?.toLowerCase();
  if (l === 'highest' || l === 'critical') return '#EF4444';
  if (l === 'high') return '#F97316';
  if (l === 'medium') return '#D97706';
  return '#94A3B8';
}

// ── Mini Avatar for assignee on contributed items ──
const AVATAR_COLORS = ['#2563EB', '#0D9488', '#D97706'];
function hashColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function MiniAvatar({ name, size = 20 }: { name: string; size?: number }) {
  if (!name) return null;
  const ini = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const bg = hashColor(name);
  return (
    <span title={name} style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: size, height: size, borderRadius: '50%', background: bg,
      color: '#FFF', fontSize: size * 0.48, fontWeight: 700, flexShrink: 0,
      cursor: 'default', lineHeight: 1,
    }}>{ini}</span>
  );
}

// ═══════════════════════════════════════════
// COLLAPSIBLE WEEK STRIP — V12 Redesign
// ═══════════════════════════════════════════
function getSaudiWorkDays(periodStart: Date): { name: string; date: Date }[] {
  // Saudi work week: Sun–Thu
  const days: { name: string; date: Date }[] = [];
  const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU'];
  const d = new Date(periodStart);
  // Find Sunday
  while (d.getDay() !== 0) d.setDate(d.getDate() + 1);
  for (let i = 0; i < 5; i++) {
    days.push({ name: dayNames[i], date: new Date(d) });
    d.setDate(d.getDate() + 1);
  }
  return days;
}

function getWeekCells(periodStart: Date): { label: string; weekNum: number; date: Date }[] {
  const cells: { label: string; weekNum: number; date: Date }[] = [];
  const d = new Date(periodStart);
  for (let i = 0; i < 5; i++) {
    const weekOfYear = Math.ceil((((d.getTime() - new Date(d.getFullYear(), 0, 1).getTime()) / 86400000) + 1) / 7);
    cells.push({ label: `W${weekOfYear}`, weekNum: weekOfYear, date: new Date(d) });
    d.setDate(d.getDate() + 7);
  }
  return cells;
}

function WeekStripCollapsible({
  periodType, onPeriodTypeChange, weekOffset, onNavigatePeriod, period,
  weekItems, allOpenItems, allStaleItems, counts, statusFilter, setStatusFilter,
}: {
  periodType: PeriodType;
  onPeriodTypeChange: (t: PeriodType) => void;
  weekOffset: number;
  onNavigatePeriod: (dir: -1 | 1) => void;
  period: { start: Date; end: Date; label: string; range: string };
  weekItems: R360WorkItem[];
  allOpenItems: R360WorkItem[];
  allStaleItems: R360WorkItem[];
  counts: { all: number; to_do: number; in_progress: number; in_qa: number; done: number; blocked: number };
  statusFilter: string | null;
  setStatusFilter: (s: string | null) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const openCount = allOpenItems.length;
  const staleCount = allStaleItems.length;
  const doneCount = counts.done;
  const touchedCount = weekItems.filter(i => i.status_category !== 'to_do').length;
  const totalCount = weekItems.length;
  const isLive = weekOffset === 0;
  const today = new Date();

  const dayCells = useMemo(() => periodType === 'weekly' ? getSaudiWorkDays(period.start) : getWeekCells(period.start), [periodType, period.start]);

  return (
    <div style={{ padding: '10px 0', borderBottom: '1px solid #F1F5F9' }}>
      {/* Top toolbar: Toggle + Date + Mode Badge + Nav arrows */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' as const }}>
        {/* Prominent Period Toggle */}
        <div className="r3-period-toggle">
          <button className={periodType === 'weekly' ? 'active' : ''} onClick={() => onPeriodTypeChange('weekly')}>Weekly</button>
          <button className={periodType === 'monthly' ? 'active' : ''} onClick={() => onPeriodTypeChange('monthly')}>Monthly</button>
        </div>

        <div style={{ width: '1px', height: '20px', background: '#E2E8F0' }} />
        <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>📅 {period.label}</span>
        <span style={{ fontSize: '13px', fontWeight: 500, color: '#334155' }}>{period.range}</span>

        {/* Mode Badge */}
        <span className={`r3-mode-badge ${isLive ? 'live' : 'snapshot'}`}>
          {isLive ? 'LIVE' : 'SNAPSHOT'}
        </span>

        <button style={{ width: '28px', height: '28px', border: '1px solid #E2E8F0', borderRadius: '4px', background: '#FFF', cursor: 'pointer', fontSize: '13px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transition: 'background var(--cp-duration-fast, 0.15s) ease' }} onClick={() => onNavigatePeriod(-1)}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(15,23,42,0.04)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#FFF'; }}
        >‹</button>
        <button style={{ width: '28px', height: '28px', border: '1px solid #E2E8F0', borderRadius: '4px', background: '#FFF', cursor: 'pointer', fontSize: '13px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transition: 'background var(--cp-duration-fast, 0.15s) ease' }} onClick={() => onNavigatePeriod(1)}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(15,23,42,0.04)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#FFF'; }}
        >›</button>

        <div style={{ width: '1px', height: '20px', background: '#E2E8F0', margin: '0 4px' }} />
        {/* Status filter tabs */}
        {([
          { key: null, label: `All (${counts.all})` },
          { key: 'to_do', label: `To Do (${counts.to_do})` },
          { key: 'in_progress', label: `In Prog (${counts.in_progress})` },
        ] as const).map(f => {
          const isActive = statusFilter === f.key || (f.key === null && !statusFilter);
          return (
            <span key={f.key ?? 'all'} onClick={() => setStatusFilter(statusFilter === f.key ? null : f.key)} style={{
              padding: '5px 14px', fontSize: '12.5px', fontWeight: isActive ? 600 : 500,
              borderRadius: '6px', cursor: 'pointer', transition: 'all var(--cp-duration-fast, 0.15s) ease',
              background: isActive ? 'rgba(37,99,235,0.10)' : 'transparent',
              color: isActive ? '#2563EB' : '#64748B',
              border: 'none',
            }}
            onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(15,23,42,0.04)'; }}
            onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = isActive ? 'rgba(37,99,235,0.10)' : 'transparent'; }}
            >{f.label}</span>
          );
        })}
        <span style={{ marginLeft: 'auto', fontSize: '12.5px', color: '#64748B', fontFamily: "'JetBrains Mono', monospace" }}>{weekItems.length} items</span>
      </div>

      {/* Collapsible Week Strip */}
      <div className="r3-week-strip">
        {/* Summary bar — 44px collapsed */}
        <div className="r3-week-strip-summary" onClick={() => setExpanded(!expanded)}>
          <span className="r3-week-strip-left">
            {openCount} open · {staleCount} stale · {doneCount} done
          </span>
          <div className="r3-week-strip-center">
            <div className="r3-week-strip-bar-track">
              <div className="r3-week-strip-bar-fill" style={{ width: `${totalCount > 0 ? (touchedCount / totalCount) * 100 : 0}%` }} />
            </div>
            <span className="r3-week-strip-label">{touchedCount} of {totalCount} touched</span>
          </div>
          <div className={`r3-week-strip-chevron ${expanded ? 'open' : ''}`}>
            <ChevronDown size={16} />
          </div>
        </div>

        {/* Expandable grid */}
        <div className={`r3-week-strip-grid ${expanded ? 'open' : ''} ${periodType}`}>
          {dayCells.map((cell, i) => {
            const isToday = periodType === 'weekly' && cell.date.toDateString() === today.toDateString();
            const isFuture = cell.date > today;
            const isSelected = selectedDay === i;
            const dateStr = cell.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            // Y = total open items for the member (constant across all days)
            const openItems = weekItems.filter(it => it.status_category !== 'done');
            const dayY = openItems.length;
            // X = items that had activity (updated_at) on this specific day
            const cellDateStr = cell.date.toISOString().slice(0, 10);
            const dayX = isFuture ? 0 : weekItems.filter(it => {
              const updStr = it.updated_at?.slice(0, 10);
              return updStr === cellDateStr;
            }).length;
            return (
              <div
                key={i}
                className={`r3-day-cell ${isToday ? 'today' : ''} ${isFuture ? 'future' : ''} ${isSelected ? 'selected' : ''}`}
                onClick={(e) => { e.stopPropagation(); setSelectedDay(isSelected ? null : i); }}
              >
                <div>
                  <div className="r3-day-cell-name">{periodType === 'weekly' ? cell.name : (cell as any).label}</div>
                  <div className="r3-day-cell-date">{dateStr}</div>
                </div>
                <div className="r3-day-cell-right">
                  {isFuture ? (
                    <span className="r3-day-cell-count">—</span>
                  ) : (
                    <>
                      <div className="r3-day-cell-minibar">
                        <div className="r3-day-cell-minibar-fill" style={{ width: `${dayY > 0 ? (dayX / dayY) * 100 : 0}%` }} />
                      </div>
                      <span className="r3-day-cell-count">{dayX}/{dayY}</span>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════
export default function R360MemberDetail() {
  const { resourceId } = useParams<{ resourceId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialView = (searchParams.get('view') as R360ViewType) || 'ring';
  const [view, setView] = useState<R360ViewType>(initialView);
  const [periodType, setPeriodType] = useState<PeriodType>('weekly');
  const [weekOffset, setWeekOffset] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<R360WorkItem | null>(null);
  const [aiOpen, setAiOpen] = useState(false);

  const { data: overview, isLoading: overviewLoading } = useR360Overview(resourceId || '');

  const filters: R360Filters = useMemo(() => {
    const f: R360Filters = {};
    if (statusFilter) f.status_categories = [statusFilter];
    if (searchTerm.trim()) f.search = searchTerm;
    return f;
  }, [statusFilter, searchTerm]);

  const { data: workItems = [], isLoading: itemsLoading } = useR360WorkItems(resourceId || '', filters);

  const period = useMemo(() => 
    periodType === 'weekly' ? getWeekRange(weekOffset) : getMonthRange(weekOffset),
    [periodType, weekOffset]
  );

  // Period filtering:
  // - Current period (offset 0): Show ALL open items (including carry-overs as source of truth) + done items resolved in this period
  // - Past/future periods: Show ONLY tickets assigned during that specific period (assigned_at within range)
  const weekItems = useMemo(() => {
    const isCurrentPeriod = weekOffset === 0;
    const items = workItems.filter(item => {
      const assignedDate = new Date(item.assigned_at);
      if (isCurrentPeriod) {
        // Current period: all open items always visible (carry-overs included) + done items resolved in this period
        if (item.status_category !== 'done') return true;
        const resolvedDate = new Date(item.resolved_at || item.updated_at);
        return resolvedDate >= period.start && resolvedDate <= period.end;
      } else {
        // Past/future period: ONLY show tickets whose assigned_at falls within this specific period
        return assignedDate >= period.start && assignedDate <= period.end;
      }
    });
    // Compute carry-over labels — only meaningful for current period
    return items.map(item => ({
      ...item,
      carried_from_label: isCurrentPeriod ? computeCarriedFromLabel(item.assigned_at, period.start) : null,
    }));
  }, [workItems, period.start, period.end, weekOffset]);

  // All-time open items (for persistent banner KPIs)
  const allOpenItems = useMemo(() => workItems.filter(i => i.status_category !== 'done'), [workItems]);
  const allStaleItems = useMemo(() => allOpenItems.filter(i => (i.age_days || 0) > 14), [allOpenItems]);

  // Most recent activity date across all items
  const lastActivityDate = useMemo(() => {
    if (!workItems.length) return null;
    let latest = new Date(0);
    workItems.forEach(item => {
      const d = new Date(item.updated_at);
      if (d > latest) latest = d;
    });
    return latest;
  }, [workItems]);

  // Jump to the period containing the most recent activity
  const jumpToLastActivity = useCallback(() => {
    if (!lastActivityDate) return;
    const now = new Date();
    if (periodType === 'weekly') {
      const diffMs = lastActivityDate.getTime() - now.getTime();
      const diffWeeks = Math.floor(diffMs / (7 * 86400000));
      setWeekOffset(diffWeeks);
    } else {
      const diffMonths = (lastActivityDate.getFullYear() - now.getFullYear()) * 12 + (lastActivityDate.getMonth() - now.getMonth());
      setWeekOffset(diffMonths);
    }
    skipDirection.current = 0;
    skipAttempts.current = 0;
  }, [lastActivityDate, periodType]);

  // Auto-skip empty periods
  const skipDirection = useRef<-1 | 1 | 0>(0);
  const skipAttempts = useRef(0);
  const MAX_SKIP = periodType === 'weekly' ? 12 : 6;

  useEffect(() => {
    if (itemsLoading || !workItems.length) return;
    if (skipDirection.current === 0) return;

    if (weekItems.length === 0 && skipAttempts.current < MAX_SKIP) {
      skipAttempts.current += 1;
      setWeekOffset(prev => prev + skipDirection.current);
    } else {
      skipDirection.current = 0;
      skipAttempts.current = 0;
    }
  }, [weekItems.length, itemsLoading, workItems.length, weekOffset]);

  const navigatePeriod = useCallback((dir: -1 | 1) => {
    skipDirection.current = dir;
    skipAttempts.current = 0;
    setWeekOffset(prev => prev + dir);
  }, []);

  const handlePeriodTypeChange = useCallback((type: PeriodType) => {
    setPeriodType(type);
    setWeekOffset(0);
    skipDirection.current = 0;
    skipAttempts.current = 0;
  }, []);

  // Status counts — week-scoped
  const counts = useMemo(() => {
    const c = { all: weekItems.length, to_do: 0, in_progress: 0, in_qa: 0, done: 0, blocked: 0 };
    weekItems.forEach(i => { (c as any)[i.status_category] = ((c as any)[i.status_category] || 0) + 1; });
    return c;
  }, [weekItems]);

  // All-time KPIs for banner — always reflect total workload health
  const bannerOpenCount = allOpenItems.length;
  const bannerStaleCount = allStaleItems.length;

  // Avg age of open items
  const avgAge = useMemo(() => {
    const openItems = workItems.filter(i => i.status_category !== 'done');
    if (openItems.length === 0) return 0;
    return Math.round(openItems.reduce((s, i) => s + (i.age_days || 0), 0) / openItems.length);
  }, [workItems]);

  // Close panel on ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelectedItem(null); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Stale alert: compute oldest age (must be before early returns)
  const oldestAge = useMemo(() => {
    if (!allStaleItems.length) return 0;
    return Math.max(...allStaleItems.map(i => i.age_days || 0));
  }, [allStaleItems]);
  const allStale = allOpenItems.length > 0 && allStaleItems.length === allOpenItems.length;

  if (overviewLoading) {
    return (
      <div id="r360-root">
        <div className="r3-page">
          <div className="r3-skeleton" style={{ height: 120, marginBottom: 20 }} />
          <div className="r3-skeleton" style={{ height: 400 }} />
        </div>
      </div>
    );
  }

  if (!overview) {
    return (
      <div id="r360-root">
        <div className="r3-page"><div className="r3-empty">Resource not found.</div></div>
      </div>
    );
  }

  const deptColor = R360_DEPT_COLORS[overview.department] || '#64748B';

  return (
    <div id="r360-root">
      <div className="r3-page" style={{ background: '#FFFFFF' }}>
        {/* ── Sticky Header: Profile + Week Nav ── */}
        <div style={{ position: 'sticky', top: 0, zIndex: 50, background: '#FFFFFF' }}>
        {/* ── Profile Header ── */}
        <div className="r3-profile">
          <div className="r3-profile-top">
            <div className="r3-profile-avatar" style={{ background: `linear-gradient(135deg, ${deptColor}, #0D9488)` }}>
              {overview.avatar_url ? (
                <img src={overview.avatar_url} alt={overview.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              ) : null}
              <span style={{ position: 'absolute', pointerEvents: 'none', ...(overview.avatar_url ? { display: 'none' } : {}) }}>{initials(overview.name)}</span>
            </div>
            <div>
              <div className="r3-profile-name">{overview.name}</div>
              <div className="r3-profile-role">{overview.role_name} · {overview.department}</div>
            </div>
            {/* §9 — OPEN (blue) + STALE (danger red) */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ padding: '12px 16px', borderRadius: '8px', minWidth: '76px', textAlign: 'center' as const, background: '#EFF6FF' }}>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#2563EB' }}>{bannerOpenCount}</div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#2563EB', textTransform: 'uppercase' as const, letterSpacing: '.03em' }}>OPEN</div>
              </div>
              <div style={{ padding: '12px 16px', borderRadius: '8px', minWidth: '76px', textAlign: 'center' as const, background: '#FEF2F2' }}>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#DC2626' }}>{bannerStaleCount}</div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#DC2626', textTransform: 'uppercase' as const, letterSpacing: '.03em' }}>STALE</div>
              </div>
            </div>
          </div>

          {/* §3 — Stale warning banner */}
          {allStale && allOpenItems.length > 0 && (
            <div style={{ margin: '8px 0 0', padding: '8px 12px', background: '#FFFBEB', borderLeft: '3px solid #D97706', borderRadius: '0 4px 4px 0', fontSize: '13px', color: '#92400E' }}>
              ⚠️ All assigned items are stale. Oldest: {oldestAge} days.
            </div>
          )}

          {/* ── Tabs + Actions — §10 toolbar buttons ── */}
          <div className="r3-tabs">
            {(['ring', 'chronology', 'board'] as R360ViewType[]).map(v => (
              <button key={v} className={`r3-tab ${view === v ? 'r3-tab--active' : ''}`} onClick={() => setView(v)}>
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
            <div className="r3-tab-spacer" />
            {/* Back — text button */}
            <button
              onClick={() => navigate('/project-hub/resources')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'transparent', border: 'none', color: '#64748B', fontSize: '13px', fontWeight: 500, cursor: 'pointer', padding: '4px 8px' }}
              onMouseEnter={e => { e.currentTarget.style.textDecoration = 'underline'; }}
              onMouseLeave={e => { e.currentTarget.style.textDecoration = 'none'; }}
            >
              <ChevronLeft size={14} /> Back
            </button>
            {/* Q1-2026 — neutral chip */}
            <button style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(15,23,42,0.05)', border: 'none', borderRadius: '6px', color: '#0F172A', fontSize: '13px', fontWeight: 500, cursor: 'pointer', padding: '5px 12px' }}>
              <Calendar size={13} /> Q1-2026
            </button>
            {/* Intelligence — brand blue standard */}
            <AIIntelligenceButton
              label="Intelligence"
              onClick={() => setAiOpen(true)}
            />
          </div>
        </div>

        {/* ── Period Navigation — V12 Redesign ── */}
        <WeekStripCollapsible
          periodType={periodType}
          onPeriodTypeChange={handlePeriodTypeChange}
          weekOffset={weekOffset}
          onNavigatePeriod={navigatePeriod}
          period={period}
          weekItems={weekItems}
          allOpenItems={allOpenItems}
          allStaleItems={allStaleItems}
          counts={counts}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
        />
        </div>{/* end sticky wrapper */}

        {/* ── Views ── */}
        {itemsLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="r3-skeleton" style={{ height: 60 }} />)}
          </div>
        ) : weekItems.length === 0 ? (
          <div>
            <div className="r3-empty">No work items assigned in this period.</div>
            {workItems.length > 0 && lastActivityDate && (
              <div style={{ margin: '16px auto', maxWidth: 560, padding: '16px 24px', borderRadius: '8px', border: '1px solid rgba(15,23,42,0.12)', background: '#FFFFFF', textAlign: 'center' }}>
                <div style={{ fontSize: '13px', color: '#334155', marginBottom: '10px' }}>
                  <strong style={{ color: '#0F172A' }}>{allOpenItems.length} open item{allOpenItems.length !== 1 ? 's' : ''}</strong> across all time
                  {allStaleItems.length > 0 && <span> · {allStaleItems.length} stale</span>}
                </div>
                <div style={{ fontSize: '12.5px', color: '#64748B', marginBottom: '12px' }}>
                  Last activity: <strong style={{ color: '#334155' }}>{lastActivityDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</strong>
                </div>
                <button
                  onClick={jumpToLastActivity}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    padding: '7px 18px', borderRadius: '6px', fontSize: '12.5px', fontWeight: 600,
                    border: 'none', background: 'rgba(37,99,235,0.10)', color: '#2563EB',
                    cursor: 'pointer', transition: 'all 80ms ease',
                  }}
                  onMouseOver={e => { (e.target as HTMLButtonElement).style.background = 'rgba(37,99,235,0.16)'; }}
                  onMouseOut={e => { (e.target as HTMLButtonElement).style.background = 'rgba(37,99,235,0.10)'; }}
                >
                  <Calendar size={13} />
                  Jump to last activity
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            {view === 'ring' && <RingView items={weekItems} name={overview.name} role={overview.role_name} avatarUrl={overview.avatar_url} onSelect={setSelectedItem} selected={selectedItem} />}
            {view === 'chronology' && <ChronologyView items={weekItems} onSelect={setSelectedItem} weekStart={period.start} weekEnd={period.end} />}
            {view === 'board' && <BoardView items={weekItems} onSelect={setSelectedItem} />}
          </>
        )}

        {/* ── Detail Panel ── */}
        {selectedItem && (
          <DetailPanel item={selectedItem} onClose={() => setSelectedItem(null)} onSelectItem={setSelectedItem} />
        )}
      </div>

      {/* AI Intelligence Panel */}
      {aiOpen && resourceId && (
        <AIIntelligencePanel
          resourceId={resourceId}
          onClose={() => setAiOpen(false)}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// RING VIEW — V12 PRECISION
// ═══════════════════════════════════════════
const CARD_W = 230;
const CARD_H = 150;

// V12 StatusLozenge — exactly 3 states
function StatusLozenge({ status }: { status: string }) {
  const s = (status || '').toLowerCase();
  let bg = '#DFE1E6', color = '#253858', label = 'TO DO'; // Grey default
  if (['in progress','in review','active','analysis','in development','under implementation','implementation review','code review','ready for qa','in uat','technical validation','in qa'].includes(s)) {
    bg = '#DEEBFF'; color = '#0747A6'; label = s === 'in review' || s === 'code review' || s === 'implementation review' || s === 'ready for qa' ? 'IN REVIEW' : 'IN PROGRESS';
  } else if (['done','approved','completed','resolved','closed'].includes(s)) {
    bg = '#E3FCEF'; color = '#006644'; label = 'DONE';
  } else {
    // Grey: To Do, Backlog, On Hold, Waiting, Unknown, any unmapped
    label = s === 'on hold' || s === 'hold' ? 'ON HOLD' : s === 'backlog' ? 'BACKLOG' : 'TO DO';
  }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', height: '20px',
      padding: '0 6px', borderRadius: '3px', fontSize: '11px', fontWeight: 700,
      textTransform: 'uppercase' as const, letterSpacing: '0.03em', lineHeight: 1,
      background: bg, color,
    }}>{label}</span>
  );
}

// Fixed 8-slot ring geometry — absolute positioning
const RING_CANVAS_H = 620;
const SLOT_POSITIONS: { left: string; top: string }[] = [
  { left: '16px', top: '16px' },
  { left: 'calc(50% - 114px)', top: '2px' },
  { left: 'calc(100% - 280px)', top: '16px' },
  { left: '16px', top: '232px' },
  { left: 'calc(100% - 280px)', top: '232px' },
  { left: '16px', top: `${RING_CANVAS_H - CARD_H - 20}px` },
  { left: 'calc(50% - 114px)', top: `${RING_CANVAS_H - CARD_H - 2}px` },
  { left: 'calc(100% - 280px)', top: `${RING_CANVAS_H - CARD_H - 20}px` },
];

function computeRingGeometry(W: number, count: number, ages: number[]) {
  const CX = W / 2;
  const CY = RING_CANVAS_H * 0.44;
  const n = Math.min(count, 8);
  const slots: { left: number; top: number }[] = [];
  const spokes: { x1: number; y1: number; x2: number; y2: number }[] = [];
  const labelData: { x: number; y: number; age: number }[] = [];
  // We still compute numeric positions for spokes/labels
  for (let i = 0; i < n; i++) {
    // Approximate pixel positions from the CSS for spokes
    const angle = (Math.PI * 2 * i / n) - Math.PI / 2;
    const baseR = n <= 3 ? 160 : n <= 5 ? 200 : n <= 6 ? 230 : 260;
    const cx = CX + baseR * Math.cos(angle);
    const cy = CY + baseR * Math.sin(angle);
    slots.push({ left: Math.max(4, Math.min(cx - CARD_W / 2, W - CARD_W - 4)), top: Math.max(4, cy - CARD_H / 2) });
    const ccx = slots[i].left + CARD_W / 2;
    const ccy = slots[i].top + CARD_H / 2;
    spokes.push({ x1: CX, y1: CY, x2: ccx, y2: ccy });
    labelData.push({ x: (CX + ccx) / 2, y: (CY + ccy) / 2, age: ages[i] || 0 });
  }
  return { slots, spokes, labels: labelData, center: { x: CX, y: CY }, canvasH: RING_CANVAS_H };
}

// Priority badge helper
function PriorityBadge({ priority }: { priority: string }) {
  const p = (priority || '').toLowerCase();
  if (p === 'highest' || p === 'critical') {
    return <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 6px', borderRadius: '3px', background: '#FEF2F2', color: '#DC2626' }}>{priority}</span>;
  }
  if (p === 'high') {
    return <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 6px', borderRadius: '3px', background: '#FEF2F2', color: '#DC2626' }}>{priority}</span>;
  }
  return <span style={{ fontSize: '10.5px', fontWeight: 500, color: '#64748B' }}>{priority}</span>;
}

function RingView({ items, name, role, avatarUrl, onSelect, selected }: {
  items: R360WorkItem[]; name: string; role: string; avatarUrl?: string | null;
  onSelect: (i: R360WorkItem) => void; selected: R360WorkItem | null;
}) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(1000);
  const [showDone, setShowDone] = useState(false);

  const measure = useCallback(() => {
    if (canvasRef.current) setW(canvasRef.current.offsetWidth);
  }, []);

  useEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure]);

  useEffect(() => {
    if (!showDone) return;
    const handler = (e: MouseEvent) => {
      if (doneRef.current && !doneRef.current.contains(e.target as Node)) setShowDone(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showDone]);

  useEffect(() => {
    if (!showDone) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowDone(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [showDone]);

  const nonDone = items.filter(i => i.status_category !== 'done');
  const doneItems = items.filter(i => i.status_category === 'done');
  const doneCount = doneItems.length;
  const visible = nonDone.slice(0, 8);
  const ages = visible.map(i => i.age_days);
  const { slots, spokes, labels, center, canvasH } = computeRingGeometry(W, visible.length, ages);

  const isHighPriority = (p: string) => {
    const l = (p || '').toLowerCase();
    return l === 'high' || l === 'highest' || l === 'critical';
  };

  return (
    <div ref={canvasRef} style={{
      position: 'relative', width: '100%', minWidth: '1100px', height: `${canvasH}px`,
      overflow: 'visible', boxSizing: 'border-box' as const, marginTop: '8px',
    }}>
      {/* SVG SPOKES — solid, subtle */}
      <svg width={W} height={canvasH} style={{ position: 'absolute', top: 0, left: 0, zIndex: 1, pointerEvents: 'none' }}>
        {spokes.map((s, i) => (
          <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2}
            stroke="rgba(15,23,42,0.08)" strokeWidth={1} />
        ))}
      </svg>

      {/* SPOKE LABELS */}
      {labels.map((l, i) => (
        <div key={`label-${i}`} style={{
          position: 'absolute', left: `${l.x}px`, top: `${l.y}px`,
          transform: 'translate(-50%,-50%)', zIndex: 4, pointerEvents: 'none',
          fontSize: '10px', fontWeight: 600, color: '#64748B',
          background: '#FFFFFF', padding: '2px 8px', borderRadius: '10px',
          border: '1px solid rgba(15,23,42,0.08)',
          whiteSpace: 'nowrap', fontFamily: "'JetBrains Mono', monospace",
          fontVariantNumeric: 'tabular-nums',
        }}>{`Updated ${l.age}d ago`}</div>
      ))}

      {/* CENTER AVATAR — 56px, no dashed ring, no name/role */}
      <div style={{
        position: 'absolute', left: `${center.x}px`, top: `${center.y}px`,
        transform: 'translate(-50%,-50%)', zIndex: 5,
      }}>
        <div style={{
          width: '56px', height: '56px', borderRadius: '50%',
          overflow: 'hidden',
          background: avatarUrl ? '#FFFFFF' : 'linear-gradient(135deg,#2563EB,#0D9488)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          border: '2px solid #FFFFFF',
          outline: '1px solid rgba(15,23,42,0.08)',
        }}>
          {avatarUrl ? (
            <img src={avatarUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          ) : (
            <span style={{ fontSize: '18px', fontWeight: 700, color: 'white' }}>{initials(name)}</span>
          )}
        </div>
      </div>

      {/* ORBITAL CARDS — V12 fixed 8-slot layout */}
      {visible.map((item, i) => {
        if (i >= SLOT_POSITIONS.length) return null;
        const slotPos = SLOT_POSITIONS[i];
        const isSelected = selected?.id === item.id;
        const isContributor = item.role_on_item === 'Contributor';
        const hasHighPriority = isHighPriority(item.priority);
        return (
          <div key={item.id} onClick={() => onSelect(item)} style={{
            position: 'absolute', left: slotPos.left, top: slotPos.top,
            width: `${CARD_W}px`, height: `${CARD_H}px`, background: '#FFFFFF',
            border: isSelected ? '1px solid #2563EB' : '1px solid rgba(15,23,42,0.12)',
            borderLeft: hasHighPriority ? '3px solid #DC2626' : isSelected ? '1px solid #2563EB' : '1px solid rgba(15,23,42,0.12)',
            borderRadius: '6px', padding: '10px 12px',
            cursor: 'pointer', zIndex: 3,
            boxShadow: isSelected ? '0 0 0 2px rgba(37,99,235,.15)' : '0 1px 2px 0 rgba(0,0,0,0.04)',
            transition: 'background 80ms ease',
          }}
          onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(15,23,42,0.04)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#FFFFFF'; }}
          >
            {/* Row 1: type + priority */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {getJiraIcon(item.item_type)}
                <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' as const, color: '#334155' }}>{item.item_type}</span>
              </div>
              <PriorityBadge priority={item.priority} />
            </div>
            {/* Row 2: key + project badge + age */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '5px' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#2563EB', fontFamily: "'JetBrains Mono', monospace" }}>{item.item_key}</span>
              <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '3px', background: '#F1F5F9', border: '1px solid #D4D4D8', color: '#3F3F46' }}>{item.project_key}</span>
              <span style={{
                marginLeft: 'auto', fontSize: '12px', fontWeight: 600,
                color: item.age_days > 30 ? '#D97706' : '#64748B',
                fontVariantNumeric: 'tabular-nums', fontFamily: "'JetBrains Mono', monospace",
              }} title="Days since assigned to this person">{item.age_days}d</span>
            </div>
            {/* Row 3: title */}
            <div style={{ fontSize: '13px', fontWeight: 400, color: '#0F172A', lineHeight: '1.35', marginBottom: '5px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' } as React.CSSProperties}>{item.title}</div>
            {/* Row 4: status lozenge + carry-over */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <StatusLozenge status={item.status} />
              {item.carried_from_label && (
                <span style={{ fontSize: '9.5px', fontWeight: 600, padding: '2px 7px', borderRadius: '3px', background: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A', whiteSpace: 'nowrap' }} title="Carried over from an earlier period">
                  {item.carried_from_label}
                </span>
              )}
              {isContributor && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontWeight: 500, color: '#64748B' }}>→ <MiniAvatar name={item.assignee_name} size={16} /> {item.assignee_name}</span>
              )}
            </div>
          </div>
        );
      })}

      {/* SHOWING X OF N INDICATOR */}
      {nonDone.length > 8 && (
        <div style={{
          position: 'absolute', bottom: '8px', left: '50%', transform: 'translateX(-50%)',
          fontSize: '11px', fontWeight: 600, color: '#64748B', background: '#F8FAFC',
          border: '1px solid #E2E8F0', borderRadius: '10px', padding: '3px 12px',
          fontFamily: "'JetBrains Mono', monospace", zIndex: 8,
        }}>Showing 8 of {nonDone.length}</div>
      )}

      {/* COMPLETED BADGE */}
      {doneCount > 0 && (
        <div ref={doneRef} style={{ position: 'absolute', right: '16px', top: `${center.y}px`, transform: 'translateY(-50%)', zIndex: 10 }}>
          <div
            onClick={() => setShowDone(prev => !prev)}
            title="Click to view completed items"
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
              cursor: 'pointer', transition: 'transform 80ms',
              transform: showDone ? 'scale(1.05)' : 'scale(1)',
            }}
          >
            <div style={{
              width: '44px', height: '44px', borderRadius: '50%', background: '#16A34A', color: '#FFF',
              fontSize: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: showDone
                ? '0 0 0 3px rgba(22,163,74,.25), 0 2px 8px rgba(22,163,74,.3)'
                : '0 2px 8px rgba(22,163,74,.3)',
              transition: 'box-shadow 80ms', fontVariantNumeric: 'tabular-nums',
            }}>{doneCount}</div>
            <span style={{ fontSize: '9px', fontWeight: 700, color: '#14532D', textTransform: 'uppercase' as const, letterSpacing: '.06em', writingMode: 'vertical-rl' } as React.CSSProperties}>COMPLETED</span>
          </div>

          {/* POPOVER DROPDOWN */}
          {showDone && (
            <div style={{
              position: 'absolute', right: '64px', top: '50%', transform: 'translateY(-50%)',
              width: '360px', maxHeight: '420px', background: '#FFFFFF',
              border: '1px solid rgba(15,23,42,0.12)', borderRadius: '8px',
              boxShadow: '0 8px 30px rgba(15,23,42,.12), 0 2px 8px rgba(15,23,42,.06)',
              overflow: 'hidden', zIndex: 11,
            }}>
              <div style={{
                padding: '14px 16px', borderBottom: '1px solid #F1F5F9',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '22px', height: '22px', borderRadius: '50%', background: '#E3FCEF',
                    border: '1.5px solid #16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2.5 6l2.5 2.5 4.5-4.5" stroke="#16A34A" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </div>
                  <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#0F172A' }}>Completed This Week</span>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#006644', background: '#E3FCEF', padding: '2px 10px', borderRadius: '10px' }}>{doneCount}</span>
              </div>
              <div style={{ maxHeight: '340px', overflowY: 'auto', scrollbarWidth: 'thin', padding: '4px 0' }}>
                {doneItems.map(item => {
                  const closedDate = item.resolved_at || item.updated_at;
                  const resolvedLabel = closedDate ? new Date(closedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
                  return (
                    <div key={item.id} onClick={(e) => { e.stopPropagation(); onSelect(item); setShowDone(false); }}
                      style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px 16px', cursor: 'pointer', borderBottom: '1px solid #F8FAFC', transition: 'background 80ms' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(15,23,42,0.04)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#E3FCEF', border: '1.5px solid #16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>
                        <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2.5 6l2.5 2.5 4.5-4.5" stroke="#16A34A" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                          <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#2563EB', fontFamily: "'JetBrains Mono', monospace" }}>{item.item_key}</span>
                          <StatusLozenge status="Done" />
                        </div>
                        <div style={{ fontSize: '12.5px', fontWeight: 400, color: '#0F172A', lineHeight: '1.35', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
                        <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>Resolved{resolvedLabel ? ` · ${resolvedLabel}` : ''}</div>
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: '#006644', flexShrink: 0, fontFamily: "'JetBrains Mono', monospace" }}>{item.age_days}d</span>
                    </div>
                  );
                })}
              </div>
              <div style={{ padding: '10px 16px', borderTop: '1px solid #F1F5F9', fontSize: '11px', color: '#64748B', textAlign: 'center' }}>
                Click any item to view details
              </div>
            </div>
          )}
        </div>
      )}

      {/* EMPTY STATE */}
      {items.length === 0 && (
        <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center', color: '#64748B', fontSize: '14px' }}>
          No work items found for this week
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// CHRONOLOGY VIEW
// ═══════════════════════════════════════════
function ChronologyView({ items, onSelect, weekStart, weekEnd }: { items: R360WorkItem[]; onSelect: (i: R360WorkItem) => void; weekStart: Date; weekEnd: Date }) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const groupRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const groups = useMemo(() => {
    const map = new Map<string, { label: string; items: R360WorkItem[] }>();
    items.forEach(item => {
      if (!map.has(item.group_date)) map.set(item.group_date, { label: item.date_label, items: [] });
      map.get(item.group_date)!.items.push(item);
    });
    return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a));
  }, [items]);

  // Auto-scroll to the first date group that falls within the selected week
  useEffect(() => {
    if (!groups.length) return;
    const targetGroup = groups.find(([dateKey]) => {
      const d = new Date(dateKey + 'T00:00:00');
      return d >= weekStart && d <= weekEnd;
    });
    const key = targetGroup?.[0] || groups[0]?.[0];
    if (key && groupRefs.current[key]) {
      groupRefs.current[key]!.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [weekStart, weekEnd, groups]);

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const y = new Date(today); y.setDate(y.getDate() - 1);
  const yesterdayStr = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`;

  const accentColor = (cat: string) => cat === 'in_progress' ? '#2563EB' : cat === 'in_qa' ? '#0D9488' : cat === 'blocked' ? '#EF4444' : cat === 'done' ? '#16A34A' : '#D97706';

  return (
    <div className="r3-chrono">
      <div className="r3-chrono-line" />
      {groups.map(([dateKey, group]) => {
        const isCollapsed = collapsed.has(dateKey);
        const dotClass = dateKey === todayStr ? 'r3-date-dot--today' : dateKey === yesterdayStr ? 'r3-date-dot--yesterday' : 'r3-date-dot--other';
        const statusDist = { done: 0, in_progress: 0, to_do: 0, blocked: 0 };
        group.items.forEach(i => {
          if (i.status_category === 'done') statusDist.done++;
          else if (i.status_category === 'in_progress' || i.status_category === 'in_qa') statusDist.in_progress++;
          else if (i.status_category === 'blocked') statusDist.blocked++;
          else statusDist.to_do++;
        });
        const total = group.items.length;

        return (
          <div key={dateKey} ref={el => { groupRefs.current[dateKey] = el; }} className="r3-date-group">
            <div className="r3-date-header" onClick={() => setCollapsed(prev => { const n = new Set(prev); n.has(dateKey) ? n.delete(dateKey) : n.add(dateKey); return n; })}>
              <span className={`r3-date-dot ${dotClass}`} />
              <span className="r3-date-label">{group.label}</span>
              <span className="r3-date-count">{total} items</span>
              <div className="r3-minibar">
                {statusDist.done > 0 && <div style={{ width: `${statusDist.done / total * 100}%`, background: '#16A34A' }} />}
                {statusDist.in_progress > 0 && <div style={{ width: `${statusDist.in_progress / total * 100}%`, background: '#2563EB' }} />}
                {statusDist.to_do > 0 && <div style={{ width: `${statusDist.to_do / total * 100}%`, background: '#D97706' }} />}
                {statusDist.blocked > 0 && <div style={{ width: `${statusDist.blocked / total * 100}%`, background: '#EF4444' }} />}
              </div>
              <ChevronDown size={16} className={`r3-date-chevron ${isCollapsed ? 'r3-date-chevron--collapsed' : ''}`} />
            </div>
            {!isCollapsed && (
              <div className="r3-chrono-items">
                {group.items.map(item => (
                  <div key={item.id} className="r3-chrono-card" onClick={() => onSelect(item)}>
                    <div style={{ position: 'absolute', left: 0, top: 8, bottom: 8, width: 3, borderRadius: '0 2px 2px 0', background: item.role_on_item === 'Contributor' ? '#7C3AED' : accentColor(item.status_category) }} />
                    <div style={{ width: 24, display: 'flex', alignItems: 'center', flexShrink: 0 }}>{getJiraIcon(item.item_type)}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <span className="r3-card-key">{item.item_key}</span>
                        <ProjTag projectKey={item.project_key} />
                        {item.role_on_item === 'Contributor' && (
                          <MiniAvatar name={item.assignee_name} size={18} />
                        )}
                      </div>
                      <div className="r3-card-title r3-card-title--lg">{item.title}</div>
                      {item.parent_key && (
                        <div className="r3-parent-ref" style={{ marginTop: 4 }}>
                          ↳ <span className="r3-parent-key">{item.parent_key}</span> {item.parent_title}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 12.5, color: '#334155', display: 'inline-flex', alignItems: 'center', gap: 4 }}>{item.role_on_item === 'Contributor' ? <><span style={{ color: '#64748B' }}>→</span> <MiniAvatar name={item.assignee_name} size={18} /> {item.assignee_name}</> : item.assignee_name}</span>
                        <StatusPill label={item.status_label} color={item.status_color} bg={item.status_bg} dot={item.status_dot} />
                      </div>
                      <AgeBadge days={item.age_days} ageClass={item.age_class} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════
// BOARD VIEW
// ═══════════════════════════════════════════
function BoardView({ items, onSelect }: { items: R360WorkItem[]; onSelect: (i: R360WorkItem) => void }) {
  const columns = [
    { key: 'to_do', label: 'TO DO', color: '#D97706', items: items.filter(i => i.status_category === 'to_do' || i.status_category === 'blocked') },
    { key: 'in_progress', label: 'IN PROGRESS', color: '#2563EB', items: items.filter(i => i.status_category === 'in_progress' || i.status_category === 'in_qa') },
    { key: 'done', label: 'DONE', color: '#16A34A', items: items.filter(i => i.status_category === 'done') },
  ];

  const accentColor = (cat: string) => cat === 'in_progress' ? '#2563EB' : cat === 'in_qa' ? '#0D9488' : cat === 'blocked' ? '#EF4444' : cat === 'done' ? '#16A34A' : '#D97706';

  return (
    <div className="r3-board">
      {columns.map(col => (
        <div key={col.key}>
          <div className="r3-board-col-header" style={{ borderBottom: `2px solid ${col.color}` }}>
            <span className="r3-board-col-dot" style={{ background: col.color }} />
            <span className="r3-board-col-title">{col.label}</span>
            <span className="r3-board-col-count" style={{ background: col.color }}>{col.items.length}</span>
          </div>
          <div className="r3-board-cards">
            {col.items.map(item => (
              <div key={item.id} className="r3-board-card" onClick={() => onSelect(item)}>
                <div style={{ position: 'absolute', left: 0, top: 8, bottom: 8, width: 3, borderRadius: '0 2px 2px 0', background: item.role_on_item === 'Contributor' ? '#7C3AED' : accentColor(item.status_category) }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <span className="r3-card-key">{item.item_key}</span>
                  <ProjTag projectKey={item.project_key} />
                  {item.role_on_item === 'Contributor' && (
                    <MiniAvatar name={item.assignee_name} size={18} />
                  )}
                  <span style={{ marginLeft: 'auto' }}><AgeBadge days={item.age_days} ageClass={item.age_class} /></span>
                </div>
                <div className="r3-card-title" style={{ fontSize: 13.5, marginBottom: 8 }}>{item.title}</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span className="r3-priority-dot" style={{ background: priorityDotColor(item.priority) }} />
                    <span style={{ fontSize: 12, fontWeight: 500, color: '#334155' }}>{item.priority}</span>
                  </div>
                  <span style={{ fontSize: 12.5, color: '#334155', display: 'inline-flex', alignItems: 'center', gap: 4 }}>{item.role_on_item === 'Contributor' ? <><span style={{ color: '#64748B' }}>→</span> <MiniAvatar name={item.assignee_name} size={18} /> {item.assignee_name}</> : item.assignee_name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════
// DETAIL PANEL
// ═══════════════════════════════════════════
function DetailPanel({ item, onClose, onSelectItem }: {
  item: R360WorkItem; onClose: () => void; onSelectItem: (i: R360WorkItem) => void;
}) {
  // Siblings are only valid when the parent is a Story.
  // In Jira hierarchy this maps to current item being a Sub-task.
  const normalizedItemType = (item.item_type || '').toLowerCase().replace(/[-_\s]/g, '');
  const canHaveStoryParent = normalizedItemType === 'subtask';

  const { data: siblings = [] } = useR360Siblings(canHaveStoryParent ? item.parent_key : null);
  const doneCount = siblings.filter((s: any) => s.status_category === 'done').length;

  return (
    <>
      <div className="r3-overlay" onClick={onClose} />
      <div className="r3-panel r3-panel--open">
        {/* Header */}
        <div className="r3-panel-header">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span className="r3-card-key" style={{ fontSize: 14 }}>{item.item_key}</span>
            <button className="r3-panel-close" onClick={onClose}><X size={14} /></button>
          </div>
          <div className="r3-panel-pills">
            <StatusPill label={item.status_label} color={item.status_color} bg={item.status_bg} dot={item.status_dot} />
            <span style={{ fontSize: 10.5, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: '#F1F5F9', color: '#334155' }}>{item.priority}</span>
            <span className="r3-type-badge">{getJiraIcon(item.item_type)} {item.item_type}</span>
            <ProjTag projectKey={item.project_key} />
            {item.role_on_item === 'Contributor' && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: '#F5F3FF', color: '#7C3AED', border: '1px solid #DDD6FE' }}>
                CONTRIBUTED TO <MiniAvatar name={item.assignee_name} size={16} />
              </span>
            )}
          </div>
          <div className="r3-panel-title">{item.title}</div>
        </div>

        {/* Body */}
        <div className="r3-panel-body">
          {/* Meta Grid */}
          <div className="r3-meta">
            <div className="r3-meta-cell">
              <div className="r3-meta-label">Project</div>
              <div className="r3-meta-value">{item.project_name}</div>
            </div>
            <div className="r3-meta-cell">
              <div className="r3-meta-label">{item.role_on_item === 'Contributor' ? 'Assigned To' : 'Assigner'}</div>
              <div className="r3-meta-value" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {item.role_on_item === 'Contributor' && <MiniAvatar name={item.assignee_name} size={18} />}
                {item.role_on_item === 'Contributor' ? (item.assignee_name || '—') : (item.reporter_name || '—')}
              </div>
            </div>
            <div className="r3-meta-cell">
              <div className="r3-meta-label">Assigned</div>
              <div className="r3-meta-value">{formatRelativeDate(item.created_at)}</div>
              <div style={{ fontSize: 11, color: '#334155' }}>{formatDate(item.created_at)}</div>
            </div>
            <div className="r3-meta-cell">
              <div className="r3-meta-label">Days Sitting</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className={`r3-age r3-age--${item.age_class}`} style={{ fontSize: 13, fontWeight: 600 }}>{item.age_days}</span>
                <div style={{ width: 60, height: 4, borderRadius: 2, background: '#F1F5F9', overflow: 'hidden' }}>
                  <div style={{ width: `${ageBarPercent(item.age_days)}%`, height: '100%', background: ageBarColor(item.age_days), borderRadius: 2 }} />
                </div>
              </div>
            </div>
            <div className="r3-meta-cell">
              <div className="r3-meta-label">Release</div>
              <div className="r3-meta-value">
                {item.fix_version ? item.fix_version
                  : item.item_type === 'Sub-task' && item.parent_key ? <span style={{ color: '#2563EB', fontSize: 12 }}>Inherited from {item.parent_key}</span>
                  : '—'}
              </div>
            </div>
            <div className="r3-meta-cell">
              <div className="r3-meta-label">Due</div>
              <div className="r3-meta-value">
                {item.due_date ? formatDate(item.due_date)
                  : item.item_type === 'Sub-task' && item.parent_key ? <span style={{ color: '#2563EB', fontSize: 12 }}>Inherited from {item.parent_key}</span>
                  : '—'}
              </div>
            </div>
          </div>

          {/* Hierarchy */}
          {item.parent_key && (
            <div className="r3-hierarchy">
              <div className="r3-hierarchy-title">Hierarchy</div>
              <div className="r3-hier-item" style={{ padding: '6px 8px' }}>
                {getJiraIcon('Epic')}
                <span className="r3-card-key r3-card-key--sm">{item.parent_key}</span>
                <span style={{ fontSize: 12, color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.parent_title}</span>
              </div>
              <div className="r3-hier-connector">↳</div>
              <div className="r3-hier-item r3-hier-item--current">
                {getJiraIcon(item.item_type)}
                <span className="r3-card-key r3-card-key--sm">{item.item_key}</span>
                <span style={{ fontSize: 12, color: '#020617', fontWeight: 500 }}>{item.title}</span>
              </div>
            </div>
          )}

          {/* Siblings */}
          {canHaveStoryParent && item.parent_key && siblings.length > 0 && (
            <div className="r3-siblings">
              <div className="r3-siblings-header">
                <span className="r3-siblings-title">Siblings</span>
                <span className="r3-siblings-count">{doneCount}/{siblings.length} done</span>
              </div>

              {siblings.map((s: any) => (
                <div
                  key={s.id}
                  className={`r3-sibling-row ${s.item_key === item.item_key ? 'r3-sibling-row--current' : ''}`}
                  onClick={() => {
                    if (s.item_key !== item.item_key) {
                      // Create a minimal work item for navigation
                      onSelectItem({
                        ...item,
                        id: s.id,
                        item_key: s.item_key,
                        title: s.title,
                        status_label: s.status_label,
                        status_color: s.status_color,
                        status_bg: s.status_bg,
                        status_dot: s.status_dot,
                        status_category: s.status_category,
                        age_days: s.age_days,
                        age_class: s.age_class,
                      });
                    }
                  }}
                >
                  <span className="r3-card-key r3-card-key--sm" style={{ width: 72, flexShrink: 0 }}>{s.item_key}</span>
                  <StatusPill label={s.status_label} color={s.status_color} bg={s.status_bg} dot={s.status_dot} />
                  <span style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{s.title}</span>
                  <AgeBadge days={s.age_days} ageClass={s.age_class} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
