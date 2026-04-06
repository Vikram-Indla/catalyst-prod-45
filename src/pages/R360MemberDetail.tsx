/**
 * R360 Member Detail Page
 * Route: /project-hub/resources/:resourceId
 * Contains: Profile Header, Week Nav, Ring/Chronology/Board views, Detail Panel
 *
 * R360 STAGE D WIRING AUDIT — 2026-03-04
 *
 * 1. Member Header:     ✅ WIRED — name, role, dept, avatar from useR360Overview; open/stale computed from workItems
 * 2. Week Strip:         ✅ WIRED — open/stale/done/touched computed from weekItems; day cells from period dates; LIVE/SNAPSHOT from weekOffset
 * 3. Ring View:          ✅ WIRED — cards mapped from filteredWeekItems; slots assigned dynamically; all fields from item records
 * 4. Chronology View:    ✅ WIRED — day groups from item.group_date; carryover filtered by updated_at vs week range; Today from new Date()
 * 5. Board View:         ✅ WIRED — columns from status_category filter on items array; counts computed dynamically
 * 6. Status Mapping:     ✅ WIRED — StatusLozenge + getChronologyStatusLozengeColors handle all known Jira statuses; grey fallback for unknown
 * 7. Age Calculations:   ✅ WIRED — age_days from R360WorkItem (computed server-side); from tags via computeCarriedFromLabel; escalation thresholds applied client-side
 *
 * Violations found: 1
 * Violations fixed: 1
 * Remaining: 0
 *
 * Fixed: Quarter label "Q1-2026" was hardcoded → now computed from current date
 */
import React, { useState, useMemo, useCallback, useEffect, useRef, lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useR360Overview, useR360WorkItems, useR360Siblings } from '@/hooks/useR360';
import { computeCarriedFromLabel } from '@/services/r360Service';
import { R360_DEPT_COLORS, R360_PROJECT_COLORS } from '@/constants/r360';
import { initials, slugify, ageBarPercent, ageBarColor, formatRelativeDate, formatDate } from '@/utils/r360Utils';
import { getJiraIcon } from '@/components/r360/R360JiraIcons';
import { ChevronLeft, ChevronRight, Calendar, X, ChevronDown, ChevronUp, CalendarX2 } from 'lucide-react';
import type { R360WorkItem, R360ViewType, R360Filters } from '@/types/r360';
import { useTheme } from '@/hooks/useTheme';
import '@/styles/r360.css';
import '@/components/resource360/r360-member.css';
import R360ProfileDrawer from '@/components/r360/R360ProfileDrawer';
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
  // Normalize "Unknown" status to "To Do" per platform guardrail
  const displayLabel = label.toLowerCase() === 'unknown' ? 'To Do' : label;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 10px', borderRadius: '4px', fontSize: '11.5px', fontWeight: 600, background: bg, color }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0, background: dot }} />
      {displayLabel}
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

// ── Priority border color for board/ring cards (D-R7) ──
function priorityBorderColor(p: string): string {
  const l = (p || '').toLowerCase();
  if (l === 'highest' || l === 'critical' || l === 'high') return '#DC2626';
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
  selectedDay, onDaySelect,
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
  selectedDay: string | null;
  onDaySelect: (day: string | null) => void;
}) {
  const { isDark } = useTheme();
  const [expanded, setExpanded] = useState(false);
  // selectedDay is lifted from parent — not local

  // Week-scoped stats: recalculate from weekItems for the SELECTED period
  const weekOpenItems = weekItems.filter(i => i.status_category !== 'done');
  const openCount = weekOpenItems.length;
  const staleCount = weekOpenItems.filter(i => (i.age_days || 0) > 14).length;
  const doneCount = counts.done;
  const touchedCount = weekItems.filter(i => i.status_category !== 'to_do').length;
  const totalCount = weekItems.length;
  const isLive = weekOffset === 0;
  const today = new Date();

  const dayCells = useMemo(() => periodType === 'weekly' ? getSaudiWorkDays(period.start) : getWeekCells(period.start), [periodType, period.start]);

  return (
    <div style={{ padding: '10px 0', borderBottom: `1px solid ${isDark ? '#292929' : '#F1F5F9'}` }}>
      {/* Top toolbar: Toggle + Date + Mode Badge + Nav arrows */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' as const }}>
        {/* Prominent Period Toggle */}
        <div className="r3-period-toggle">
          <button className={periodType === 'weekly' ? 'active' : ''} onClick={() => onPeriodTypeChange('weekly')}>Weekly</button>
          <button className={periodType === 'monthly' ? 'active' : ''} onClick={() => onPeriodTypeChange('monthly')}>Monthly</button>
        </div>

        <div style={{ width: '1px', height: '20px', background: isDark ? '#2E2E2E' : '#E2E8F0' }} />
        <span style={{ fontSize: '13px', fontWeight: 700, color: isDark ? '#EDEDED' : '#0F172A' }}>📅 {period.label}</span>
        <span style={{ fontSize: '13px', fontWeight: 500, color: isDark ? '#A1A1A1' : '#334155' }}>{period.range}</span>

        {/* Mode Badge */}
        <span className={`r3-mode-badge ${isLive ? 'live' : 'snapshot'}`}>
          {isLive ? 'LIVE' : 'SNAPSHOT'}
        </span>

        <button style={{ width: '28px', height: '28px', border: `1px solid ${isDark ? '#2E2E2E' : '#E2E8F0'}`, borderRadius: '4px', background: isDark ? '#1A1A1A' : '#FFF', cursor: 'pointer', fontSize: '13px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transition: 'background var(--cp-duration-fast, 0.15s) ease' }} onClick={() => onNavigatePeriod(-1)}
          onMouseEnter={e => { e.currentTarget.style.background = isDark ? '#1F1F1F' : 'rgba(15,23,42,0.04)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = isDark ? '#1A1A1A' : '#FFF'; }}
        >‹</button>
        <button style={{ width: '28px', height: '28px', border: `1px solid ${isDark ? '#2E2E2E' : '#E2E8F0'}`, borderRadius: '4px', background: isDark ? '#1A1A1A' : '#FFF', cursor: 'pointer', fontSize: '13px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transition: 'background var(--cp-duration-fast, 0.15s) ease' }} onClick={() => onNavigatePeriod(1)}
          onMouseEnter={e => { e.currentTarget.style.background = isDark ? '#1F1F1F' : 'rgba(15,23,42,0.04)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = isDark ? '#1A1A1A' : '#FFF'; }}
        >›</button>

        <div style={{ width: '1px', height: '20px', background: isDark ? '#2E2E2E' : '#E2E8F0', margin: '0 4px' }} />
        {/* Status filter tabs */}
        {([
          { key: null, label: `All (${counts.all})` },
          { key: 'to_do', label: `To Do (${counts.to_do})` },
          { key: 'in_progress', label: `In Progress (${counts.in_progress})` },
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
            onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = isDark ? '#1F1F1F' : 'rgba(15,23,42,0.04)'; }}
            onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = isActive ? 'rgba(37,99,235,0.10)' : 'transparent'; }}
            >{f.label}</span>
          );
        })}
        <span style={{ marginLeft: 'auto', fontSize: '12.5px', color: isDark ? '#878787' : '#64748B', fontFamily: "'JetBrains Mono', monospace" }}>{weekItems.length} items</span>
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
            const cellDateStr2 = cell.date.toISOString().slice(0, 10);
            const isSelected = selectedDay === cellDateStr2;
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
                onClick={(e) => { e.stopPropagation(); if (!isFuture) onDaySelect(isSelected ? null : cellDateStr2); }}
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
  const { isDark } = useTheme();
  const { resourceId } = useParams<{ resourceId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialView = (searchParams.get('view') as R360ViewType) || 'ring';
  const [view, setView] = useState<R360ViewType>(initialView);

  // D-19 Nuclear scroll reset on view tab switch
  useEffect(() => {
    // Immediate reset
    window.scrollTo(0, 0);
    const r360Root = document.getElementById('r360-root');
    if (r360Root) r360Root.scrollTop = 0;
    const mainEl = document.querySelector('main');
    if (mainEl) mainEl.scrollTop = 0;

    // Deferred reset after React render
    const raf = requestAnimationFrame(() => {
      window.scrollTo(0, 0);
      if (r360Root) r360Root.scrollTop = 0;
      if (mainEl) mainEl.scrollTop = 0;
      // Walk all scrollable ancestors
      let el: HTMLElement | null = r360Root;
      while (el && el !== document.body) {
        if (el.scrollTop > 0) el.scrollTop = 0;
        el = el.parentElement;
      }
      // Anchor member header into view — guarantees completed bar + content visible
      const memberHeader = document.querySelector('#r360-root .r3-profile');
      if (memberHeader) memberHeader.scrollIntoView({ behavior: 'instant' as ScrollBehavior, block: 'start' });
    });
    return () => cancelAnimationFrame(raf);
  }, [view]);
  const [periodType, setPeriodType] = useState<PeriodType>('weekly');
  const [weekOffset, setWeekOffset] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<R360WorkItem | null>(null);
  const [aiOpen, setAiOpen] = useState(() => searchParams.get('intel') === 'true');
  const [ticketListMode, setTicketListMode] = useState<'open' | 'stale' | null>(null);

  // R360 Profile Drawer removed — intelligence icon now opens AIIntelligencePanel directly

  const { data: overview, isLoading: overviewLoading } = useR360Overview(resourceId || '');

  // Status filter is applied CLIENT-SIDE to avoid changing counts when a filter is active
  const filters: R360Filters = useMemo(() => {
    const f: R360Filters = {};
    if (searchTerm.trim()) f.search = searchTerm;
    return f;
  }, [searchTerm]);

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
  }, [workItems, period.start, period.end, weekOffset]); // eslint-disable-line react-hooks/exhaustive-deps

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
    setSelectedDay(null);
    setWeekOffset(prev => prev + dir);
  }, []);

  const handlePeriodTypeChange = useCallback((type: PeriodType) => {
    const scrollY = window.scrollY;
    setPeriodType(type);
    setWeekOffset(0);
    setSelectedDay(null);
    skipDirection.current = 0;
    skipAttempts.current = 0;
    // Restore scroll position after React re-render to prevent visual jump
    requestAnimationFrame(() => { window.scrollTo(0, scrollY); });
  }, []);

  // Status counts — week-scoped (always from UNFILTERED weekItems)
  const counts = useMemo(() => {
    const c = { all: weekItems.length, to_do: 0, in_progress: 0, in_qa: 0, done: 0, blocked: 0 };
    weekItems.forEach(i => { (c as any)[i.status_category] = ((c as any)[i.status_category] || 0) + 1; });
    return c;
  }, [weekItems]);

  // Client-side status filtering — counts stay stable
  const statusFilteredItems = useMemo(() => {
    if (!statusFilter) return weekItems;
    return weekItems.filter(i => i.status_category === statusFilter);
  }, [weekItems, statusFilter]);

  // Day-level filtering: when a day cell is selected, show only items with activity on that day
  const filteredWeekItems = useMemo(() => {
    if (!selectedDay) return statusFilteredItems;
    return statusFilteredItems.filter(item => {
      const updStr = item.updated_at?.slice(0, 10);
      return updStr === selectedDay;
    });
  }, [statusFilteredItems, selectedDay]);

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
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (aiOpen) setAiOpen(false);
        else setSelectedItem(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [aiOpen]);

  // CSS injection to force full-width layout regardless of drawer state
  useEffect(() => {
    const styleId = 'r360-drawer-layout-fix';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        /* Force R360 page content to always be full width */
        [data-r360-page-content],
        #r360-root {
          width: 100% !important;
          min-width: 0 !important;
          flex-shrink: 0 !important;
          flex-basis: 100% !important;
          max-width: 100% !important;
        }
        /* Ensure CatalystShell main area stays full width */
        [data-catalyst-main] {
          width: 100% !important;
          flex-shrink: 0 !important;
        }
        /* Prevent any parent flex from compressing */
        [data-catalyst-main] > div {
          width: 100% !important;
        }
      `;
      document.head.appendChild(style);
    }
    return () => {
      const el = document.getElementById(styleId);
      if (el) el.remove();
    };
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
    <>
      <div id="r360-root" data-r360-page-content style={{ position: 'relative', width: '100%', minWidth: 0, overflow: 'hidden' }}>
        <div className="r3-page" style={{ background: isDark ? '#1A1A1A' : '#FFFFFF', height: '100%', overflow: 'auto' }}>
          {/* ── Sticky Header: Profile + Week Nav ── */}
          <div style={{ position: 'sticky', top: 0, zIndex: 10, background: isDark ? '#1A1A1A' : '#FFFFFF' }}>
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
                  <div
                    onClick={() => setTicketListMode(bannerOpenCount > 0 ? 'open' : null)}
                    style={{ padding: '12px 16px', borderRadius: '8px', minWidth: '76px', textAlign: 'center' as const, background: isDark ? 'rgba(37,99,235,0.12)' : '#EFF6FF', cursor: bannerOpenCount > 0 ? 'pointer' : 'default', transition: 'all 80ms ease' }}
                    onMouseEnter={e => { if (bannerOpenCount > 0) (e.currentTarget.style.background = 'rgba(37,99,235,0.12)'); }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#EFF6FF'; }}
                  >
                    <div style={{ fontSize: '20px', fontWeight: 700, color: '#2563EB' }}>{bannerOpenCount}</div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#2563EB', textTransform: 'uppercase' as const, letterSpacing: '.03em' }}>OPEN</div>
                  </div>
                  <div
                    onClick={() => setTicketListMode(bannerStaleCount > 0 ? 'stale' : null)}
                    style={{ padding: '12px 16px', borderRadius: '8px', minWidth: '76px', textAlign: 'center' as const, background: '#FEF2F2', cursor: bannerStaleCount > 0 ? 'pointer' : 'default', transition: 'all 80ms ease' }}
                    onMouseEnter={e => { if (bannerStaleCount > 0) (e.currentTarget.style.background = 'rgba(220,38,38,0.12)'); }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#FEF2F2'; }}
                  >
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
                  <button key={v} className={`r3-tab ${view === v ? 'active' : ''}`} onClick={() => setView(v)}>
                    {v.charAt(0).toUpperCase() + v.slice(1)}
                  </button>
                ))}
                <div className="r3-tab-spacer" />
                {/* Back — text button */}
                <button
                  onClick={() => navigate('/project-hub/resources')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'transparent', border: 'none', color: isDark ? '#878787' : '#64748B', fontSize: '13px', fontWeight: 500, cursor: 'pointer', padding: '4px 8px' }}
                  onMouseEnter={e => { e.currentTarget.style.textDecoration = 'underline'; }}
                  onMouseLeave={e => { e.currentTarget.style.textDecoration = 'none'; }}
                >
                  <ChevronLeft size={14} /> Back
                </button>
                {/* Quarter label — computed from current date */}
                <button style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(15,23,42,0.05)', border: 'none', borderRadius: '6px', color: isDark ? '#EDEDED' : '#0F172A', fontSize: '13px', fontWeight: 500, cursor: 'pointer', padding: '5px 12px' }}>
                  <Calendar size={13} /> {`Q${Math.ceil((new Date().getMonth() + 1) / 3)}-${new Date().getFullYear()}`}
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
              selectedDay={selectedDay}
              onDaySelect={setSelectedDay}
            />
          </div>{/* end sticky wrapper */}

          {/* ── Views ── */}
          {itemsLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {Array.from({ length: 5 }).map((_, i) => <div key={i} className="r3-skeleton" style={{ height: 60 }} />)}
            </div>
          ) : filteredWeekItems.length === 0 ? (
            <div>
              <div className="r3-empty">No work items assigned in this period.</div>
              {workItems.length > 0 && lastActivityDate && (
                <div style={{ margin: '16px auto', maxWidth: 560, padding: '16px 24px', borderRadius: '8px', border: '1px solid rgba(15,23,42,0.12)', background: isDark ? '#1A1A1A' : '#FFFFFF', textAlign: 'center' }}>
                  <div style={{ fontSize: '13px', color: isDark ? '#A1A1A1' : '#334155', marginBottom: '10px' }}>
                    <strong style={{ color: isDark ? '#EDEDED' : '#0F172A' }}>{allOpenItems.length} open item{allOpenItems.length !== 1 ? 's' : ''}</strong> across all time
                    {allStaleItems.length > 0 && <span> · {allStaleItems.length} stale</span>}
                  </div>
                  <div style={{ fontSize: '12.5px', color: isDark ? '#878787' : '#64748B', marginBottom: '12px' }}>
                    Last activity: <strong style={{ color: isDark ? '#A1A1A1' : '#334155' }}>{lastActivityDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</strong>
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
              {view === 'ring' && <RingView items={filteredWeekItems} name={overview.name} role={overview.role_name} avatarUrl={overview.avatar_url} onSelect={setSelectedItem} selected={selectedItem} overview={overview} onAvatarClick={() => setAiOpen(true)} />}
              {view === 'chronology' && <ChronologyView items={filteredWeekItems} onSelect={setSelectedItem} weekStart={period.start} weekEnd={period.end} />}
              {view === 'board' && <BoardView items={filteredWeekItems} onSelect={setSelectedItem} />}
            </>
          )}

          {/* ── Detail Panel ── */}
          {selectedItem && (
            <DetailPanel item={selectedItem} onClose={() => setSelectedItem(null)} onSelectItem={setSelectedItem} />
          )}

          {/* ── Ticket List Drawer (OPEN / STALE) ── */}
          {ticketListMode && (
            <TicketListDrawer
              mode={ticketListMode}
              items={ticketListMode === 'open' ? allOpenItems : allStaleItems}
              onClose={() => setTicketListMode(null)}
              onSelectItem={(item) => { setTicketListMode(null); setSelectedItem(item); }}
            />
          )}
        </div>
      </div>

      {/* R360 Profile Drawer — portal to document.body, completely outside DOM tree */}
      {aiOpen && resourceId && createPortal(
        <>
          <div
            onClick={() => setAiOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              top: 48,
              backgroundColor: 'rgba(0, 0, 0, 0.15)',
              zIndex: 300,
            }}
          />
          <div
            style={{
              position: 'fixed',
              top: 48,
              right: 0,
              width: 700,
              height: 'calc(100vh - 48px)',
              backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF',
              zIndex: 301,
              overflowY: 'auto',
              boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.10)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <R360ProfileDrawer resourceId={resourceId} onClose={() => setAiOpen(false)} />
          </div>
        </>,
        document.body
      )}
    </>
  );
}

// ═══════════════════════════════════════════
// RING VIEW — V12 PRECISION
// ═══════════════════════════════════════════
const CARD_W = 228;
const CARD_H = 145;

// V12 StatusLozenge — exactly 3 states, prioritises status_category
function StatusLozenge({ status, statusCategory }: { status: string; statusCategory?: string }) {
  // 1. Prioritise Jira's native status_category (always present)
  const cat = (statusCategory || '').toLowerCase().replace(/[_ ]/g, '');
  if (cat === 'done' || cat === 'completed') {
    return <LozengeSpan bg="#1B7F37" color="#FFFFFF" label="DONE" />;
  }
  if (cat === 'inprogress' || cat === 'indeterminate' || cat === 'started') {
    return <LozengeSpan bg="#0C66E4" color="#FFFFFF" label="IN PROGRESS" />;
  }
  // cat === 'new' | 'todo' | '' → fall through to string matching for refined label

  // 2. Fallback: string-match raw status name for label refinement
  const s = (status || '').toLowerCase();
  // Green — done
  if (['done','approved','completed','resolved','closed','released','verified','ready for production','beta ready','production ready','monitor'].some(k => s === k)) {
    return <LozengeSpan bg="#1B7F37" color="#FFFFFF" label="DONE" />;
  }
  // Blue — in progress
  if (['in progress','in review','active','analysis','in development','under implementation','implementation review',
       'code review','ready for qa','in uat','uat ready','technical validation','in qa','in beta','in production',
       'in entity integration','in design','in requirements','ready for development','in testing','end to end testing',
       'retest','re-open','under review','awaiting approval','ready for review','implementation','deferred for int',
       'awaiting info','ready for production'].some(k => s === k)) {
    // Refine label for review-type statuses
    if (['in review','code review','implementation review','ready for qa','in qa','retest','technical validation','end to end testing'].includes(s)) {
      return <LozengeSpan bg="#0C66E4" color="#FFFFFF" label="IN REVIEW" />;
    }
    return <LozengeSpan bg="#0C66E4" color="#FFFFFF" label="IN PROGRESS" />;
  }
  // Grey — to do / waiting (default)
  let label = 'TO DO';
  if (s === 'on hold' || s === 'hold') label = 'ON HOLD';
  else if (s === 'backlog') label = 'BACKLOG';
  else if (s === 'blocked') label = 'BLOCKED';
  else if (s === 'rejected') label = 'REJECTED';
  return <LozengeSpan bg="#DFE1E6" color="#42526E" label={label} />;
}

function LozengeSpan({ bg, color, label }: { bg: string; color: string; label: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', height: '20px',
      padding: '0 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 700,
      textTransform: 'uppercase' as const, letterSpacing: '0.03em', lineHeight: 1,
      background: bg, color,
    }}>{label}</span>
  );
}

// Fixed 8-slot ring geometry — elliptical placement around center
const RING_CANVAS_H = 620;
// Slot positions as percentages/px for absolute placement (228×145 cards)
const SLOT_POSITIONS: { left: string; top: string }[] = [
  { left: '4%',  top: '5%' },       // Slot 1: top-left
  { left: '36%', top: '2%' },       // Slot 2: top-center
  { left: '62%', top: '5%' },       // Slot 3: top-right
  { left: '68%', top: '33%' },      // Slot 4: mid-right
  { left: '62%', top: '61%' },      // Slot 5: bottom-right
  { left: '36%', top: '65%' },      // Slot 6: bottom-center
  { left: '4%',  top: '61%' },      // Slot 7: bottom-left
  { left: '4%',  top: '33%' },      // Slot 8: mid-left
];

// Compute connector endpoints dynamically from card positions
// Returns card centre in pixel coords
function getCardPixelPos(slotIdx: number, containerW: number): { x: number; y: number } {
  const slot = SLOT_POSITIONS[slotIdx];
  if (!slot) return { x: 0, y: 0 };
  let leftPx: number;
  if (slot.left.endsWith('%')) {
    leftPx = (parseFloat(slot.left) / 100) * containerW;
  } else {
    leftPx = parseFloat(slot.left);
  }
  let topPx: number;
  if (slot.top.endsWith('%')) {
    topPx = (parseFloat(slot.top) / 100) * RING_CANVAS_H;
  } else {
    topPx = parseFloat(slot.top);
  }
  return { x: leftPx + CARD_W / 2, y: topPx + CARD_H / 2 };
}

// Compute spoke endpoints offset from avatar edge → card nearest edge
const AVATAR_R = 28; // half of 56px avatar
function getSpokeEndpoints(cx: number, cy: number, cardCx: number, cardCy: number) {
  const dx = cardCx - cx;
  const dy = cardCy - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist === 0) return { x1: cx, y1: cy, x2: cardCx, y2: cardCy };
  const ux = dx / dist;
  const uy = dy / dist;
  // Start: avatar edge
  const x1 = cx + ux * AVATAR_R;
  const y1 = cy + uy * AVATAR_R;
  // End: card nearest edge (ray-rectangle intersection)
  const halfW = CARD_W / 2;
  const halfH = CARD_H / 2;
  const scaleX = Math.abs(ux) > 0.001 ? halfW / Math.abs(ux) : Infinity;
  const scaleY = Math.abs(uy) > 0.001 ? halfH / Math.abs(uy) : Infinity;
  const edgeDist = Math.min(scaleX, scaleY);
  return {
    x1, y1,
    x2: cardCx - ux * edgeDist,
    y2: cardCy - uy * edgeDist,
  };
}

// From tag age escalation helper — uses age_days directly
function getFromTagClass(ageDays: number): string {
  if (ageDays >= 29) return 'red';
  if (ageDays >= 15) return 'amber';
  return 'neutral';
}

function getFromTagPrefix(ageDays: number): string {
  return ageDays >= 15 ? '⚠ ' : '';
}

// Priority badge helper
function PriorityBadge({ priority }: { priority: string }) {
  const { isDark } = useTheme();
  const p = (priority || '').toLowerCase();
  if (p === 'highest' || p === 'critical') {
    return <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: '#FEF2F2', color: '#DC2626' }}>{priority}</span>;
  }
  if (p === 'high') {
    return <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: '#FEF2F2', color: '#DC2626' }}>{priority}</span>;
  }
  return <span style={{ fontSize: '10.5px', fontWeight: 500, color: isDark ? '#878787' : '#64748B' }}>{priority}</span>;
}

function RingView({ items, name, role, avatarUrl, onSelect, selected, overview, onAvatarClick }: {
  items: R360WorkItem[]; name: string; role: string; avatarUrl?: string | null;
  onSelect: (i: R360WorkItem) => void; selected: R360WorkItem | null;
  overview?: { department?: string } | null;
  onAvatarClick?: () => void;
}) {
  const { isDark } = useTheme();
  const canvasRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(1000);
  const [showDone, setShowDone] = useState(false);
  const [ringPage, setRingPage] = useState(0);

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
  // Reset page when items change
  useEffect(() => { setRingPage(0); }, [items.length]);
  const doneItems = items.filter(i => i.status_category === 'done');
  const doneCount = doneItems.length;
  const totalItems = items.length;
  const PAGE_SIZE = 8;
  const totalPages = Math.max(1, Math.ceil(nonDone.length / PAGE_SIZE));
  const safePage = Math.min(ringPage, totalPages - 1);
  const visible = nonDone.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);
  const showSummaryCard = nonDone.length <= 2;

  const CX = W / 2;
  const CY = RING_CANVAS_H * 0.44;

  const isHighPriority = (p: string) => {
    const l = (p || '').toLowerCase();
    return l === 'high' || l === 'highest' || l === 'critical';
  };
  const isMediumPriority = (p: string) => (p || '').toLowerCase() === 'medium';

  // Compute connector spokes with avatar-edge → card-edge offsets
  const spokes = useMemo(() => {
    return visible.map((_, i) => {
      const cardCenter = getCardPixelPos(i, W);
      return getSpokeEndpoints(CX, CY, cardCenter.x, cardCenter.y);
    });
  }, [visible.length, W, CX, CY]);

  // Stale count for summary card
  const staleItems = nonDone.filter(i => (i.age_days || 0) > 14);

  // ── COMPLETED BADGE (shared between both modes) ──
  const completedBadge = (
    <div ref={doneRef} className="r3-completed-badge"
      tabIndex={0} role="button" aria-label="View completed items"
      data-testid="r360-completed-badge"
      onClick={() => setShowDone(prev => !prev)}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setShowDone(prev => !prev); } }}
    >
      <div className={`r3-completed-circle ${doneCount === 0 ? 'empty' : ''}`}>
        {doneCount > 0 ? doneCount : '—'}
      </div>
      <span className={`r3-completed-text ${doneCount === 0 ? 'empty' : ''}`}>COMPLETED</span>

      {/* COMPLETED PANEL POPOVER */}
      {showDone && doneCount > 0 && (
        <div className="r3-completed-panel" role="dialog" aria-label="Completed items this week" aria-modal="true"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${isDark ? '#292929' : '#F1F5F9'}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '22px', height: '22px', borderRadius: '50%', background: '#1B7F37',
                border: '1.5px solid #16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2.5 6l2.5 2.5 4.5-4.5" stroke="#16A34A" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
              <span style={{ fontSize: '14px', fontWeight: 650, color: isDark ? '#EDEDED' : '#0F172A' }}>Completed This Week</span>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#FFFFFF', background: '#1B7F37', padding: '2px 8px', borderRadius: '12px' }}>{doneCount}</span>
            </div>
            <button onClick={(e) => { e.stopPropagation(); setShowDone(false); }}
              style={{ width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${isDark ? '#2E2E2E' : '#E2E8F0'}`, borderRadius: '4px', background: isDark ? '#1A1A1A' : '#FFF', cursor: 'pointer', color: isDark ? '#878787' : '#64748B', fontSize: '14px' }}
              aria-label="Close completed panel"
            >✕</button>
          </div>
          {/* Throughput */}
          <div style={{ padding: '8px 16px', fontSize: '12px', color: isDark ? '#878787' : '#64748B', borderBottom: `1px solid ${isDark ? '#292929' : '#F1F5F9'}` }}>
            {doneCount} of {totalItems} total resolved ({totalItems > 0 ? Math.round((doneCount / totalItems) * 100) : 0}%)
          </div>
          {/* Item list */}
          <div style={{ maxHeight: '280px', overflowY: 'auto', scrollbarWidth: 'thin' }}>
            {doneItems.map(item => {
              const closedDate = item.resolved_at || item.updated_at;
              const resolvedLabel = closedDate ? new Date(closedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
              return (
                <div key={item.id} onClick={(e) => { e.stopPropagation(); onSelect(item); setShowDone(false); }}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px 16px', cursor: 'pointer', borderBottom: '1px solid #F8FAFC', transition: 'background 80ms' }}
                  onMouseEnter={e => (e.currentTarget.style.background = isDark ? '#1F1F1F' : 'rgba(15,23,42,0.04)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ flexShrink: 0, marginTop: '2px' }}>{getJiraIcon(item.item_type)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#2563EB', fontFamily: "'JetBrains Mono', monospace" }}>{item.item_key}</span>
                      <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: isDark ? '#1A1A1A' : '#F1F5F9', color: isDark ? '#878787' : '#64748B' }}>{item.project_key}</span>
                      <StatusLozenge status="Done" />
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 400, color: isDark ? '#EDEDED' : '#0F172A', lineHeight: '1.35', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
                    <div style={{ fontSize: '11px', color: isDark ? '#878787' : '#64748B', marginTop: '2px', fontStyle: 'italic' }}>Resolved{resolvedLabel ? ` · ${resolvedLabel}` : ''}</div>
                  </div>
                </div>
              );
            })}
          </div>
          {/* Footer */}
          <div style={{ padding: '10px 16px', borderTop: `1px solid ${isDark ? '#292929' : '#F1F5F9'}`, fontSize: '11px', color: isDark ? '#878787' : '#94A3B8', textAlign: 'center', fontStyle: 'italic' }}>
            Click any item to view details
          </div>
        </div>
      )}
    </div>
  );

  // ══════════════════════════════════════════
  // ADAPTIVE EMPTY STATE — Summary Card (≤2 open items)
  // ══════════════════════════════════════════
  if (showSummaryCard) {
    return (
      <div ref={canvasRef} className="r3-ring-canvas" style={{ marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          maxWidth: '520px', width: '100%', padding: '40px 32px',
          background: isDark ? '#1A1A1A' : '#FFFFFF', border: '1px solid rgba(15,23,42,0.08)',
          borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          textAlign: 'center' as const,
        }}>
          {/* Avatar */}
          <div style={{
            width: '72px', height: '72px', borderRadius: '50%', margin: '0 auto 8px',
            overflow: 'hidden',
            background: avatarUrl ? '#FFFFFF' : 'linear-gradient(135deg,#2563EB,#0D9488)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '2px solid #FFFFFF',
            outline: '1px solid rgba(15,23,42,0.08)',
          }}>
            {avatarUrl ? (
              <img src={avatarUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            ) : (
              <span style={{ fontSize: '22px', fontWeight: 700, color: 'white', fontFamily: "'Sora', sans-serif" }}>{initials(name)}</span>
            )}
          </div>

          {/* Name + Role */}
          <div style={{ fontSize: '16px', fontWeight: 650, color: isDark ? '#EDEDED' : '#0F172A', fontFamily: "'Sora', sans-serif" }}>{name}</div>
          <div style={{ fontSize: '13px', color: isDark ? '#878787' : '#64748B', marginBottom: '16px' }}>{role}</div>

          {/* Week Stats Row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', fontSize: '13px' }}>
            <span style={{ fontWeight: 650, color: isDark ? '#A1A1A1' : '#334155' }}>{nonDone.length} open</span>
            <span style={{ color: isDark ? '#878787' : '#94A3B8' }}>·</span>
            <span style={{ fontWeight: 650, color: staleItems.length > 0 ? '#DC2626' : '#334155' }}>{staleItems.length} stale</span>
            <span style={{ color: isDark ? '#878787' : '#94A3B8' }}>·</span>
            <span style={{ fontWeight: 650, color: doneCount > 0 ? '#FFFFFF' : '#334155' }}>{doneCount} done</span>
          </div>

          {/* Divider */}
          <div style={{ height: '1px', background: isDark ? '#1A1A1A' : '#F1F5F9', margin: '20px 0', width: '100%' }} />

          {/* Open Items Section */}
          {nonDone.length > 0 && (
            <div style={{ textAlign: 'left' as const, marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: isDark ? '#878787' : '#64748B', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: '10px' }}>Open Items</div>
              {nonDone.map(item => {
                const hasHighP = isHighPriority(item.priority);
                const hasMedP = isMediumPriority(item.priority);
                const borderColor = hasHighP ? '#DC2626' : hasMedP ? '#D97706' : '#94A3B8';
                const fromClass = getFromTagClass(item.age_days);
                return (
                  <div key={item.id} onClick={() => onSelect(item)} style={{
                    width: '100%', padding: '12px 16px', border: '1px solid rgba(15,23,42,0.08)',
                    borderRadius: '6px', borderInlineStart: `3px solid ${borderColor}`,
                    marginBottom: '8px', cursor: 'pointer', background: isDark ? '#1A1A1A' : '#FFFFFF',
                    transition: 'box-shadow 0.15s ease',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)'; }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; }}
                  >
                    {/* Row 1 */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {getJiraIcon(item.item_type)}
                        <span style={{ fontSize: '11px', fontWeight: 650, textTransform: 'uppercase' as const, color: isDark ? '#A1A1A1' : '#334155' }}>{item.item_type}</span>
                      </div>
                      <span style={{ fontSize: '11px', color: isDark ? '#878787' : '#64748B' }}>{item.priority}</span>
                    </div>
                    {/* Row 2 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '5px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#2563EB', fontFamily: "'JetBrains Mono', monospace" }}>{item.item_key}</span>
                      <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: isDark ? '#1A1A1A' : '#F1F5F9', color: isDark ? '#878787' : '#64748B' }}>{item.project_key}</span>
                      <span style={{ marginLeft: 'auto', fontSize: '10px', fontWeight: 600, padding: '1px 6px', borderRadius: '4px', background: isDark ? '#0A0A0A' : '#F8FAFC', color: item.age_days > 30 ? '#D97706' : '#64748B', fontFamily: "'JetBrains Mono', monospace" }}>{item.age_days}d</span>
                    </div>
                    {/* Row 3 — full title */}
                    <div style={{ fontSize: '12px', fontWeight: 500, color: isDark ? '#EDEDED' : '#0F172A', lineHeight: '1.35', marginBottom: '5px' }}>{item.title}</div>
                    {/* Row 4 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <StatusLozenge status={item.status} statusCategory={item.status_category} />
                      {item.carried_from_label && (
                        <span className={`r3-from-tag ${fromClass}`}>
                          {getFromTagPrefix(item.age_days)}{item.carried_from_label}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Completed Section */}
          {doneItems.length > 0 && (
            <div style={{ textAlign: 'left' as const, borderInlineStart: '3px solid #16A34A', paddingInlineStart: '12px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#FFFFFF', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: '10px' }}>Completed</div>
              {doneItems.map(item => {
                const closedDate = item.resolved_at || item.updated_at;
                const resolvedLabel = closedDate ? new Date(closedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
                return (
                  <div key={item.id} onClick={() => onSelect(item)} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '8px', cursor: 'pointer' }}>
                    <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#1B7F37', border: '1px solid #16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                      <svg width="8" height="8" viewBox="0 0 12 12"><path d="M2.5 6l2.5 2.5 4.5-4.5" stroke="#16A34A" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#2563EB', fontFamily: "'JetBrains Mono', monospace" }}>{item.item_key}</span>
                        <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: isDark ? '#1A1A1A' : '#F1F5F9', color: isDark ? '#878787' : '#64748B' }}>{item.project_key}</span>
                        <StatusLozenge status="Done" />
                      </div>
                      <div style={{ fontSize: '12px', color: isDark ? '#EDEDED' : '#0F172A', marginTop: '2px' }}>{item.title}</div>
                      <div style={{ fontSize: '11px', color: isDark ? '#878787' : '#94A3B8', marginTop: '2px' }}>Resolved{resolvedLabel ? ` · ${resolvedLabel}` : ''}</div>
                    </div>
                  </div>
                );
              })}
              <div style={{ fontSize: '12px', color: isDark ? '#878787' : '#64748B', marginTop: '8px' }}>
                {doneCount} of {totalItems} total resolved ({totalItems > 0 ? Math.round((doneCount / totalItems) * 100) : 0}%)
              </div>
            </div>
          )}

          {/* Zero-Everything State */}
          {nonDone.length === 0 && doneItems.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '20px 0' }}>
              <CalendarX2 size={32} style={{ color: '#D4D4D8' }} />
              <span style={{ fontSize: '13px', color: isDark ? '#878787' : '#94A3B8', fontStyle: 'italic' }}>No activity recorded this week</span>
            </div>
          )}
        </div>

        {/* Completed badge hidden in summary mode — items shown inline */}
      </div>
    );
  }

  // ══════════════════════════════════════════
  // NORMAL RING VIEW (3+ open items)
  // ══════════════════════════════════════════
  return (
    <div ref={canvasRef} className="r3-ring-canvas" style={{ marginTop: '8px', overflow: 'visible', position: 'relative' }}>
      {/* SVG CONNECTORS — 2px solid #CBD5E1, avatar-edge to card-edge */}
      <svg width={W} height={RING_CANVAS_H} style={{ position: 'absolute', top: 0, left: 0, zIndex: 0, pointerEvents: 'none', overflow: 'visible' }}>
        {spokes.map((s, i) => (
          <line key={i} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2}
            stroke="#CBD5E1" strokeWidth={2} opacity={1} />
        ))}
      </svg>

      {/* CENTER AVATAR — 56px, z-index 2 */}
      <div
        onClick={onAvatarClick}
        style={{
        position: 'absolute', left: `${CX}px`, top: `${CY}px`,
        transform: 'translate(-50%,-50%)', zIndex: 2, cursor: onAvatarClick ? 'pointer' : 'default',
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

      {/* ORBITAL CARDS — 8-slot elliptical layout */}
      {visible.map((item, i) => {
        if (i >= SLOT_POSITIONS.length) return null;
        const slotPos = SLOT_POSITIONS[i];
        const isSelected = selected?.id === item.id;
        const isContributor = item.role_on_item === 'Contributor';
        const hasHighPriority = isHighPriority(item.priority);
        const hasMedPriority = isMediumPriority(item.priority);
        const hasCarryover = !!item.carried_from_label;
        const fromClass = getFromTagClass(item.age_days);
        const priorityClass = hasHighPriority ? 'priority-high' : hasMedPriority ? 'priority-medium' : 'priority-low';
        return (
          <div key={item.id} style={{ position: 'absolute', left: slotPos.left, top: slotPos.top }}>
            <div
              className={`r3-ring-card ${priorityClass} ${isSelected ? 'selected' : ''} ${hasCarryover ? 'carryover' : ''}`}
              onClick={() => onSelect(item)}
              tabIndex={0}
              data-testid={`r360-ring-card-${item.item_key}`}
              onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = isDark ? '#1F1F1F' : 'rgba(15,23,42,0.04)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = isDark ? '#1A1A1A' : '#FFFFFF'; }}
            >
              {/* Row 1: type + priority — fixed 18px */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px', flexShrink: 0, height: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {getJiraIcon(item.item_type)}
                  <span style={{ fontSize: '11px', fontWeight: 650, textTransform: 'uppercase' as const, color: isDark ? '#A1A1A1' : '#334155' }}>{item.item_type}</span>
                </div>
                <span style={{ fontSize: '11px', color: isDark ? '#878787' : '#64748B' }}>{item.priority}</span>
              </div>
              {/* Row 2: key + project badge + age — fixed 18px */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '5px', flexShrink: 0, height: '18px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#2563EB', fontFamily: "'JetBrains Mono', monospace" }}>{item.item_key}</span>
                <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: isDark ? '#1A1A1A' : '#F1F5F9', color: isDark ? '#878787' : '#64748B' }}>{item.project_key}</span>
                <span style={{
                  marginLeft: 'auto', fontSize: '10px', fontWeight: 600,
                  padding: '1px 6px', borderRadius: '4px', background: isDark ? '#0A0A0A' : '#F8FAFC',
                  color: item.age_days > 30 ? '#D97706' : '#64748B',
                  fontFamily: "'JetBrains Mono', monospace",
                }}>{item.age_days}d</span>
              </div>
              {/* Row 3: title — 11px, 2-line clamp, flex fills remaining space */}
              <div style={{ fontSize: '11px', fontWeight: 500, color: isDark ? '#EDEDED' : '#0F172A', lineHeight: '1.3', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', textOverflow: 'ellipsis', flex: '1 1 auto', minHeight: 0 } as React.CSSProperties}>{item.title}</div>
              {/* Row 4: status lozenge + from tag — fixed 24px, pinned to bottom */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: 'auto', flexShrink: 0, height: '24px' }}>
                <StatusLozenge status={item.status} statusCategory={item.status_category} />
                {item.carried_from_label && (
                  <span className={`r3-from-tag ${fromClass}`} title="Carried over from an earlier period">
                    {getFromTagPrefix(item.age_days)}{item.carried_from_label}
                  </span>
                )}
                {isContributor && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontWeight: 500, color: isDark ? '#878787' : '#64748B' }}>→ <MiniAvatar name={item.assignee_name} size={16} /> {item.assignee_name}</span>
                )}
              </div>
            </div>
            {/* Updated Xd ago label below card */}
            <div style={{ textAlign: 'center', marginTop: '6px', fontSize: '11px', color: isDark ? '#878787' : '#94A3B8', width: `${CARD_W}px`, pointerEvents: 'none' }}>
              Updated {item.age_days}d ago
            </div>
          </div>
        );
      })}

      {/* SHOWING X OF N INDICATOR */}
      {nonDone.length > PAGE_SIZE && (
        <div style={{
          position: 'absolute', bottom: '8px', left: '50%', transform: 'translateX(-50%)',
          display: 'flex', alignItems: 'center', gap: '8px',
          fontSize: '11px', fontWeight: 600, color: isDark ? '#878787' : '#64748B', background: isDark ? '#0A0A0A' : '#F8FAFC',
          border: `1px solid ${isDark ? '#2E2E2E' : '#E2E8F0'}`, borderRadius: '12px', padding: '3px 8px',
          fontFamily: "'JetBrains Mono', monospace", zIndex: 8,
        }}>
          <button
            onClick={(e) => { e.stopPropagation(); setRingPage(p => Math.max(0, p - 1)); }}
            disabled={safePage === 0}
            style={{
              background: 'none', border: 'none', cursor: safePage === 0 ? 'default' : 'pointer',
              color: safePage === 0 ? '#CBD5E1' : '#2563EB', fontSize: '13px', fontWeight: 700,
              padding: '0 4px', lineHeight: 1,
            }}
            aria-label="Previous page"
          >‹</button>
          <span>
            {safePage * PAGE_SIZE + 1}–{Math.min((safePage + 1) * PAGE_SIZE, nonDone.length)} of {nonDone.length}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); setRingPage(p => Math.min(totalPages - 1, p + 1)); }}
            disabled={safePage >= totalPages - 1}
            style={{
              background: 'none', border: 'none', cursor: safePage >= totalPages - 1 ? 'default' : 'pointer',
              color: safePage >= totalPages - 1 ? '#CBD5E1' : '#2563EB', fontSize: '13px', fontWeight: 700,
              padding: '0 4px', lineHeight: 1,
            }}
            aria-label="Next page"
          >›</button>
        </div>
      )}

      {/* COMPLETED BADGE — always shown */}
      {completedBadge}

      {/* EMPTY STATE */}
      {items.length === 0 && (
        <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center', color: isDark ? '#878787' : '#64748B', fontSize: '14px' }}>
          No work items found for this week
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// GREEN COMPLETED SUMMARY BAR — shared by Chronology & Board
// ═══════════════════════════════════════════
function CompletedSummaryBar({ items, testId, onViewClick }: { items: R360WorkItem[]; testId: string; onViewClick: () => void }) {
  const completedItems = items.filter(i => i.status_category === 'done');
  if (completedItems.length === 0) return null;
  const firstDone = completedItems[0];
  const resolvedDate = firstDone?.resolved_at || firstDone?.updated_at;
  const resolvedLabel = resolvedDate ? new Date(resolvedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
  return (
    <div data-testid={testId} style={{
      width: '100%', background: '#1B7F37', borderRadius: '6px',
      padding: '8px 14px', margin: '12px 0 8px',
      display: 'flex', alignItems: 'center', gap: '8px',
      cursor: 'pointer', transition: 'all 0.15s',
    }}
    onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)'; }}
    onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; }}
    tabIndex={0}
    role="button">
      <span style={{ fontSize: '14px', color: '#FFFFFF', fontWeight: 700 }}>✓</span>
      <span style={{ fontSize: '12px', fontWeight: 650, color: '#FFFFFF' }}>{completedItems.length} completed this week</span>
      <span style={{ color: '#047857' }}>·</span>
      <span style={{ fontSize: '12px', color: '#047857' }}>{firstDone?.item_key} Done {resolvedLabel}</span>
      <button
        onClick={onViewClick}
        style={{
          marginLeft: 'auto', fontSize: '11px', fontWeight: 650, color: '#FFFFFF',
          border: '1px solid rgba(0,100,68,0.2)', borderRadius: '4px',
          padding: '2px 8px', cursor: 'pointer', background: 'transparent',
          transition: 'background 80ms',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,100,68,0.06)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
      >View</button>
    </div>
  );
}

// ═══════════════════════════════════════════
// CHRONOLOGY VIEW
// ═══════════════════════════════════════════
function ChronologyView({ items, onSelect, weekStart, weekEnd }: { items: R360WorkItem[]; onSelect: (i: R360WorkItem) => void; weekStart: Date; weekEnd: Date }) {
  const { isDark } = useTheme();
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const groupRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const carryoverRef = useRef<HTMLDivElement | null>(null);

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const y = new Date(today); y.setDate(y.getDate() - 1);
  const yesterdayStr = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`;
  const todayLabel = `Today, ${today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

  // Separate items with activity vs carryover (no activity this week)
  const weekStartStr = weekStart.toISOString().slice(0, 10);
  const weekEndStr = weekEnd.toISOString().slice(0, 10);
  const carryoverItems = useMemo(() => {
    return items.filter(item => {
      if (item.status_category === 'done') return false;
      const updStr = item.updated_at?.slice(0, 10) || '';
      return updStr < weekStartStr || updStr > weekEndStr;
    });
  }, [items, weekStartStr, weekEndStr]);

  const activeItems = useMemo(() => {
    const carryoverIds = new Set(carryoverItems.map(i => i.id));
    return items.filter(i => !carryoverIds.has(i.id));
  }, [items, carryoverItems]);

  const groups = useMemo(() => {
    const map = new Map<string, { label: string; items: R360WorkItem[] }>();
    activeItems.forEach(item => {
      if (!map.has(item.group_date)) map.set(item.group_date, { label: item.date_label, items: [] });
      map.get(item.group_date)!.items.push(item);
    });
    return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a));
  }, [activeItems]);

  // Split out Today's group from the rest — memoized
  const todayGroup = useMemo(() => groups.find(([k]) => k === todayStr), [groups, todayStr]);
  const otherGroups = useMemo(() => groups.filter(([k]) => k !== todayStr), [groups, todayStr]);

  // D-19: No auto-scroll — Chronology renders Today first at the top.
  // The tab-switch handler already scrolls to top on view change.

  const accentColor = (cat: string) => cat === 'in_progress' ? '#2563EB' : cat === 'in_qa' ? '#0D9488' : cat === 'blocked' ? '#EF4444' : cat === 'done' ? '#16A34A' : '#D97706';

  const getChronologyStatusLozengeColors = (status: string, statusCategory?: string): { background: string; color: string } => {
    // 1. Prioritise status_category
    const cat = (statusCategory || '').toLowerCase().replace(/[_ ]/g, '');
    if (cat === 'done' || cat === 'completed') return { background: '#1B7F37', color: '#FFFFFF' };
    if (cat === 'inprogress' || cat === 'indeterminate' || cat === 'started') return { background: '#0C66E4', color: '#FFFFFF' };
    if (cat === 'new' || cat === 'todo') return { background: '#DFE1E6', color: '#42526E' };

    // 2. Fallback: string match
    const s = (status || '').toUpperCase().trim();

    // GREEN: work is finished
    const greenStatuses = ['DONE', 'COMPLETED', 'APPROVED', 'RESOLVED', 'CLOSED', 'RELEASED', 'VERIFIED',
      'READY FOR PRODUCTION', 'BETA READY', 'PRODUCTION READY', 'MONITOR'];
    if (greenStatuses.includes(s)) return { background: '#1B7F37', color: '#FFFFFF' };

    // BLUE: work is actively happening
    const blueStatuses = [
      'IN PROGRESS', 'IN REVIEW', 'IN DEVELOPMENT', 'IN TESTING',
      'UNDER IMPLEMENTATION', 'UNDER REVIEW', 'ACTIVE', 'CODE REVIEW',
      'QA', 'UAT', 'AWAITING APPROVAL', 'READY FOR QA', 'READY FOR REVIEW',
      'IMPLEMENTATION', 'IN QA', 'IN UAT', 'UAT READY', 'RETEST', 'RE-OPEN',
      'IN BETA', 'IN PRODUCTION', 'IN DESIGN', 'IN REQUIREMENTS',
      'READY FOR DEVELOPMENT', 'IN ENTITY INTEGRATION', 'TECHNICAL VALIDATION',
      'END TO END TESTING', 'DEFERRED FOR INT', 'AWAITING INFO',
    ];
    if (blueStatuses.includes(s)) return { background: '#0C66E4', color: '#FFFFFF' };

    // GREY (default — never "Unknown")
    return { background: '#DFE1E6', color: '#42526E' };
  };

  // Render a single chronology card
  const renderChronoCard = (item: R360WorkItem) => {
    const fromClass = getFromTagClass(item.age_days);
    const statusText = (item.status || '').toUpperCase().trim();
    const { background, color } = getChronologyStatusLozengeColors(item.status || '', item.status_category);

    return (
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
            {item.carried_from_label && (
              <span className={`r3-from-tag ${fromClass}`} style={{ fontSize: '10px' }}>
                {getFromTagPrefix(item.age_days)}{item.carried_from_label}
              </span>
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
            {item.role_on_item === 'Contributor' && (
              <span style={{ fontSize: 12.5, color: isDark ? '#A1A1A1' : '#334155', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <span style={{ color: isDark ? '#878787' : '#64748B' }}>→</span> <MiniAvatar name={item.assignee_name} size={18} /> {item.assignee_name}
              </span>
            )}
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                height: '20px',
                padding: '0 8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.03em',
                whiteSpace: 'nowrap',
                background,
                color,
              }}
            >
              {statusText || 'TO DO'}
            </span>
          </div>
          <AgeBadge days={item.age_days} ageClass={item.age_class} />
        </div>
      </div>
    );
  };

  // Render a day group header + items
  const renderDayGroup = (dateKey: string, group: { label: string; items: R360WorkItem[] }) => {
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
            {group.items.map(renderChronoCard)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="r3-chrono">
      {/* D-13: Green completed summary bar */}
      <CompletedSummaryBar
        items={items}
        testId="r360-chrono-completed-bar"
        onViewClick={() => {
          const doneItem = items.find(i => i.status_category === 'done');
          if (doneItem) {
            onSelect(doneItem);
          }
        }}
      />

      <div className="r3-chrono-line" />

      {/* D-11: Today Anchor — always first */}
      <div data-testid="r360-chrono-today" ref={el => { groupRefs.current[todayStr] = el; }} className="r3-date-group">
        <div className="r3-date-header" onClick={() => setCollapsed(prev => { const n = new Set(prev); n.has('__today__') ? n.delete('__today__') : n.add('__today__'); return n; })}>
          <span className="r3-date-dot r3-date-dot--today" />
          <span className="r3-date-label" style={{ fontWeight: 650, fontSize: '13px' }}>{todayLabel}</span>
          <span className="r3-date-count">{todayGroup ? todayGroup[1].items.length : 0} items</span>
          {todayGroup && (() => {
            const total = todayGroup[1].items.length;
            const sd = { done: 0, in_progress: 0, to_do: 0, blocked: 0 };
            todayGroup[1].items.forEach(i => {
              if (i.status_category === 'done') sd.done++;
              else if (i.status_category === 'in_progress' || i.status_category === 'in_qa') sd.in_progress++;
              else if (i.status_category === 'blocked') sd.blocked++;
              else sd.to_do++;
            });
            return (
              <div className="r3-minibar">
                {sd.done > 0 && <div style={{ width: `${sd.done / total * 100}%`, background: '#16A34A' }} />}
                {sd.in_progress > 0 && <div style={{ width: `${sd.in_progress / total * 100}%`, background: '#2563EB' }} />}
                {sd.to_do > 0 && <div style={{ width: `${sd.to_do / total * 100}%`, background: '#D97706' }} />}
                {sd.blocked > 0 && <div style={{ width: `${sd.blocked / total * 100}%`, background: '#EF4444' }} />}
              </div>
            );
          })()}
          <ChevronDown size={16} className={`r3-date-chevron ${collapsed.has('__today__') ? 'r3-date-chevron--collapsed' : ''}`} />
        </div>
        {!collapsed.has('__today__') && (
          todayGroup ? (
            <div className="r3-chrono-items">
              {todayGroup[1].items.map(renderChronoCard)}
            </div>
          ) : (
            <div style={{ paddingLeft: '28px', fontSize: '12px', fontStyle: 'italic', color: isDark ? '#878787' : '#94A3B8', padding: '8px 0 8px 28px' }}>
              No activity yet today
            </div>
          )
        )}
      </div>

      {/* Other day groups in reverse chronological order */}
      {otherGroups.map(([dateKey, group]) => renderDayGroup(dateKey, group))}

      {/* D-12: Carried Over section at the bottom */}
      {carryoverItems.length > 0 && (
        <div data-testid="r360-chrono-carryover" ref={carryoverRef} className="r3-date-group">
          <div className="r3-date-header" onClick={() => setCollapsed(prev => { const n = new Set(prev); n.has('__carryover__') ? n.delete('__carryover__') : n.add('__carryover__'); return n; })}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', border: '2px solid #D97706', background: 'transparent', flexShrink: 0 }} />
            <span className="r3-date-label" style={{ fontWeight: 650, fontSize: '13px' }}>Carried Over</span>
            <span className="r3-date-count">{carryoverItems.length} items</span>
            <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: isDark ? '#1A1A1A' : '#F1F5F9', color: isDark ? '#878787' : '#64748B' }}>No activity this week</span>
            <ChevronDown size={16} className={`r3-date-chevron ${collapsed.has('__carryover__') ? 'r3-date-chevron--collapsed' : ''}`} />
          </div>
          {!collapsed.has('__carryover__') && (
            <div className="r3-chrono-items">
              {carryoverItems.map(renderChronoCard)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════
// BOARD VIEW
// ═══════════════════════════════════════════
function BoardView({ items, onSelect }: { items: R360WorkItem[]; onSelect: (i: R360WorkItem) => void }) {
  const { isDark } = useTheme();
  const doneColRef = useRef<HTMLDivElement>(null);
  const columns = useMemo(() => [
    { key: 'to_do', label: 'TO DO', color: '#D97706', items: items.filter(i => i.status_category === 'to_do' || i.status_category === 'blocked') },
    { key: 'in_progress', label: 'IN PROGRESS', color: '#2563EB', items: items.filter(i => i.status_category === 'in_progress' || i.status_category === 'in_qa') },
    { key: 'done', label: 'DONE', color: '#16A34A', items: items.filter(i => i.status_category === 'done') },
  ], [items]);

  const accentColor = (cat: string) => cat === 'in_progress' ? '#2563EB' : cat === 'in_qa' ? '#0D9488' : cat === 'blocked' ? '#EF4444' : cat === 'done' ? '#16A34A' : '#D97706';

  return (
    <div>
      {/* D-13: Green completed summary bar */}
      <CompletedSummaryBar
        items={items}
        testId="r360-board-completed-bar"
        onViewClick={() => {
          const doneItem = items.find(i => i.status_category === 'done');
          if (doneItem) onSelect(doneItem);
        }}
      />
      <div className="r3-board">
        {columns.map(col => (
          <div key={col.key} ref={col.key === 'done' ? doneColRef : undefined}>
            <div className="r3-board-col-header" style={{ borderBottom: `2px solid ${col.color}` }}>
              <span className="r3-board-col-dot" style={{ background: col.color }} />
              <span className="r3-board-col-title">{col.label}</span>
              <span className="r3-board-col-count" style={{ background: col.color }}>{col.items.length}</span>
            </div>
            <div className="r3-board-cards">
              {col.items.map(item => {
                const fromClass = getFromTagClass(item.age_days);
                return (
                  <div key={item.id} className="r3-board-card" onClick={() => onSelect(item)}>
                    <div style={{ position: 'absolute', left: 0, top: 8, bottom: 8, width: 3, borderRadius: '0 2px 2px 0', background: item.role_on_item === 'Contributor' ? '#7C3AED' : priorityBorderColor(item.priority) }} />
                    {/* Row 1: Type icon + key + project badge + age */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      {getJiraIcon(item.item_type)}
                      <span className="r3-card-key">{item.item_key}</span>
                      <ProjTag projectKey={item.project_key} />
                      {item.role_on_item === 'Contributor' && (
                        <MiniAvatar name={item.assignee_name} size={18} />
                      )}
                      <span style={{ marginLeft: 'auto' }}><AgeBadge days={item.age_days} ageClass={item.age_class} /></span>
                    </div>
                    {/* Row 2: Title */}
                    <div className="r3-card-title" style={{ fontSize: 13.5, marginBottom: 8 }}>{item.title}</div>
                    {/* Row 3: Priority + StatusLozenge + From tag */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span className="r3-priority-dot" style={{ background: priorityDotColor(item.priority) }} />
                        <span style={{ fontSize: 12, fontWeight: 500, color: isDark ? '#A1A1A1' : '#334155' }}>{item.priority}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <StatusLozenge status={item.status} statusCategory={item.status_category} />
                        {item.carried_from_label && (
                          <span className={`r3-from-tag ${fromClass}`} style={{ fontSize: '10px' }}>
                            {getFromTagPrefix(item.age_days)}{item.carried_from_label}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
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
  const { isDark } = useTheme();
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
            <span style={{ fontSize: 10.5, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: isDark ? '#1A1A1A' : '#F1F5F9', color: isDark ? '#A1A1A1' : '#334155' }}>{item.priority}</span>
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
              <div style={{ fontSize: 11, color: isDark ? '#A1A1A1' : '#334155' }}>{formatDate(item.created_at)}</div>
            </div>
            <div className="r3-meta-cell">
              <div className="r3-meta-label">Days Sitting</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className={`r3-age r3-age--${item.age_class}`} style={{ fontSize: 13, fontWeight: 600 }}>{item.age_days}</span>
                <div style={{ width: 60, height: 4, borderRadius: 4, background: isDark ? '#1A1A1A' : '#F1F5F9', overflow: 'hidden' }}>
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
                <span style={{ fontSize: 12, color: isDark ? '#A1A1A1' : '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.parent_title}</span>
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

// ═══════════════════════════════════════════
// TICKET LIST DRAWER (OPEN / STALE)
// ═══════════════════════════════════════════
function TicketListDrawer({ mode, items, onClose, onSelectItem }: {
  mode: 'open' | 'stale';
  items: R360WorkItem[];
  onClose: () => void;
  onSelectItem: (item: R360WorkItem) => void;
}) {
  const isStale = mode === 'stale';
  const title = isStale ? 'Stale Items' : 'Open Items';
  const { isDark } = useTheme();
  const accentColor = isStale ? '#DC2626' : '#2563EB';
  const accentBg = isStale ? '#FEF2F2' : '#EFF6FF';

  return (
    <>
      <div className="r3-overlay" onClick={onClose} />
      <div className="r3-panel r3-panel--open" style={{ maxWidth: 480 }}>
        {/* Header */}
        <div className="r3-panel-header" style={{ borderBottom: '1px solid rgba(15,23,42,0.08)', paddingBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 6, background: accentBg, color: accentColor, fontSize: 14, fontWeight: 700 }}>
                {items.length}
              </span>
              <span style={{ fontSize: 15, fontWeight: 700, color: isDark ? '#EDEDED' : '#0F172A' }}>{title}</span>
            </div>
            <button className="r3-panel-close" onClick={onClose}><X size={14} /></button>
          </div>
          <div style={{ fontSize: 12, color: isDark ? '#878787' : '#64748B' }}>
            {isStale ? 'Items with no activity for 14+ days' : 'All currently open items across all periods'}
          </div>
        </div>

        {/* List */}
        <div className="r3-panel-body" style={{ padding: 0 }}>
          {items.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: isDark ? '#878787' : '#94A3B8', fontSize: 13 }}>
              No {mode} items
            </div>
          ) : (
            items.map(item => (
              <div
                key={item.id}
                onClick={() => onSelectItem(item)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px',
                  cursor: 'pointer', transition: 'background 80ms ease',
                  borderBottom: '1px solid rgba(15,23,42,0.05)',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = isDark ? '#1F1F1F' : 'rgba(15,23,42,0.04)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                {/* Type icon */}
                <span style={{ flexShrink: 0, width: 18 }}>{getJiraIcon(item.item_type)}</span>
                {/* Key */}
                <span className="r3-card-key r3-card-key--sm" style={{ flexShrink: 0, width: 80 }}>{item.item_key}</span>
                {/* Title */}
                <span style={{ fontSize: 12, color: isDark ? '#EDEDED' : '#0F172A', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.title}
                </span>
                {/* Status */}
                <StatusPill label={item.status_label} color={item.status_color} bg={item.status_bg} dot={item.status_dot} />
                {/* Age */}
                <AgeBadge days={item.age_days} ageClass={item.age_class} />
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
