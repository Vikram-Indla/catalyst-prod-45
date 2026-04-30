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
 *
 * Refactored: Sub-components extracted to src/pages/r360-member/
 */
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useR360Overview, useR360WorkItems } from '@/hooks/useR360';
import { computeCarriedFromLabel } from '@/services/r360Service';
import { R360_DEPT_COLORS } from '@/constants/r360';
import { initials } from '@/utils/r360Utils';
import { ChevronLeft, Calendar } from 'lucide-react';
import type { R360WorkItem, R360ViewType, R360Filters } from '@/types/r360';
import { useTheme } from '@/hooks/useTheme';
import '@/styles/r360.css';
import '@/components/resource360/r360-member.css';
import R360ProfileDrawer from '@/components/r360/R360ProfileDrawer';
import { AIIntelligenceButton } from '@/components/ui/AIIntelligenceButton';

// Extracted sub-components
import {
  getWeekRange,
  getMonthRange,
  WeekStripCollapsible,
  RingView,
  ChronologyView,
  BoardView,
  DetailPanel,
  TicketListDrawer,
} from './r360-member';
import type { PeriodType } from './r360-member';


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
        <div className="r3-page" style={{ background: 'var(--cp-bg-elevated, #FFFFFF)', height: '100%', overflow: 'auto', paddingTop: '8px' }}>
          {/* ── Sticky Header: Profile + Week Nav ── */}
          <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--cp-bg-elevated, #FFFFFF)' }}>
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
                    style={{ padding: '12px 16px', borderRadius: '8px', minWidth: '76px', textAlign: 'center' as const, background: 'var(--cp-primary-light, #EFF6FF)', border: isDark ? '1px solid #2E2E2E' : 'none', cursor: bannerOpenCount > 0 ? 'pointer' : 'default', transition: 'all 80ms ease' }}
                    onMouseEnter={e => { if (bannerOpenCount > 0) (e.currentTarget.style.background = isDark ? '#1F1F1F' : 'rgba(37,99,235,0.12)'); }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'var(--cp-primary-light, #EFF6FF)'; }}
                  >
                    <div style={{ fontSize: '20px', fontWeight: 700, color: '#2563EB' }}>{bannerOpenCount}</div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#2563EB', textTransform: 'uppercase' as const, letterSpacing: '.03em' }}>OPEN</div>
                  </div>
                  <div
                    onClick={() => setTicketListMode(bannerStaleCount > 0 ? 'stale' : null)}
                    style={{ padding: '12px 16px', borderRadius: '8px', minWidth: '76px', textAlign: 'center' as const, background: 'var(--cp-danger-light, #FEF2F2)', border: isDark ? '1px solid #2E2E2E' : 'none', cursor: bannerStaleCount > 0 ? 'pointer' : 'default', transition: 'all 80ms ease' }}
                    onMouseEnter={e => { if (bannerStaleCount > 0) (e.currentTarget.style.background = isDark ? '#1F1F1F' : 'rgba(220,38,38,0.12)'); }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'var(--cp-danger-light, #FEF2F2)'; }}
                  >
                    <div style={{ fontSize: '20px', fontWeight: 700, color: '#DC2626' }}>{bannerStaleCount}</div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: '#DC2626', textTransform: 'uppercase' as const, letterSpacing: '.03em' }}>STALE</div>
                  </div>
                </div>
              </div>

              {/* §3 — Stale warning banner */}
              {allStale && allOpenItems.length > 0 && (
                <div style={{ margin: '8px 0 0', padding: '8px 12px', background: 'var(--cp-warning-light, #FFFBEB)', borderLeft: `3px solid #D97706`, borderRadius: '0 4px 4px 0', fontSize: '13px', color: 'var(--cp-warning-text, #92400E)' }}>
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
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'transparent', border: 'none', color: 'var(--cp-text-tertiary, #64748B)', fontSize: '13px', fontWeight: 500, cursor: 'pointer', padding: '4px 8px' }}
                  onMouseEnter={e => { e.currentTarget.style.textDecoration = 'underline'; }}
                  onMouseLeave={e => { e.currentTarget.style.textDecoration = 'none'; }}
                >
                  <ChevronLeft size={14} /> Back
                </button>
                {/* Quarter label — computed from current date */}
                <button style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: isDark ? 'var(--cp-bg-surface, #242528)' : 'rgba(15,23,42,0.05)', border: isDark ? '1px solid #2E2E2E' : 'none', borderRadius: '6px', color: 'var(--cp-text-primary, #0F172A)', fontSize: '13px', fontWeight: 500, cursor: 'pointer', padding: '5px 12px' }}>
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
                <div style={{ margin: '16px auto', maxWidth: 560, padding: '16px 24px', borderRadius: '8px', border: '1px solid rgba(15,23,42,0.12)', background: 'var(--cp-bg-elevated, #FFFFFF)', textAlign: 'center' }}>
                  <div style={{ fontSize: '13px', color: 'var(--cp-text-secondary, #334155)', marginBottom: '10px' }}>
                    <strong style={{ color: 'var(--cp-text-primary, #0F172A)' }}>{allOpenItems.length} open item{allOpenItems.length !== 1 ? 's' : ''}</strong> across all time
                    {allStaleItems.length > 0 && <span> · {allStaleItems.length} stale</span>}
                  </div>
                  <div style={{ fontSize: '12.5px', color: 'var(--cp-text-tertiary, #64748B)', marginBottom: '12px' }}>
                    Last activity: <strong style={{ color: 'var(--cp-text-secondary, #334155)' }}>{lastActivityDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</strong>
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
              backgroundColor: 'var(--cp-bg-elevated, #FFFFFF)',
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
