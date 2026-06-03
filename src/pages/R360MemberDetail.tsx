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
import { token } from '@atlaskit/tokens';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useR360Overview, useR360WorkItems } from '@/hooks/useR360';
import { computeCarriedFromLabel } from '@/services/r360Service';
import { R360_DEPT_COLORS } from '@/constants/r360';
import { initials } from '@/utils/r360Utils';
import { ChevronLeft, Calendar } from '@/lib/atlaskit-icons';
import { Pencil, Check, X } from 'lucide-react';
import { useR360Reporting } from '@/hooks/useR360Reporting';
import type { R360WorkItem, R360ViewType, R360Filters } from '@/types/r360';
import { useTheme } from '@/hooks/useTheme';
import '@/styles/r360.css';
import '@/components/resource360/r360-member.css';
import R360ProfileDrawer from '@/components/r360/R360ProfileDrawer';
import R360SummarizeDrawer from '@/components/r360/R360SummarizeDrawer';
import { AIIntelligenceButton } from '@/components/ui/AIIntelligenceButton';
import { useGlobalSearchStore } from '@/store/globalSearchStore';

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
interface R360MemberDetailProps {
  resourceId?: string;
  projectScope?: string[];
  /** When true: renders inside the For You R360 tab. Hides the Back button. */
  embedded?: boolean;
  /** When set, locks the view to this mode and hides the Ring/Chronology/Board sub-tab switcher. */
  forceView?: R360ViewType;
  /** Presence state of the member being viewed — used to render OOO overlay on the ring. */
  effectiveState?: string | null;
  /** ISO date string — shown in the OOO overlay badge ("Back Jun 15"). */
  backOn?: string | null;
}

export default function R360MemberDetail({ resourceId: resourceIdProp, projectScope, embedded = false, forceView, effectiveState, backOn }: R360MemberDetailProps = {}) {
  const { isDark } = useTheme();
  const { resourceId: resourceIdFromParams } = useParams<{ resourceId: string }>();
  const resourceId = resourceIdProp ?? resourceIdFromParams;
  const navigate = useNavigate();
  const location = useLocation();
  const backPath = projectScope != null && projectScope.length > 0
    ? '/my-team'
    : location.pathname.startsWith('/my-team')
    ? '/my-team'
    : location.pathname.startsWith('/admin/resources')
    ? '/admin/resources'
    : '/project-hub/resources';
  const [searchParams] = useSearchParams();
  const initialView = forceView ?? (embedded ? 'ring' : (searchParams.get('view') as R360ViewType) || 'ring');
  const [view, setView] = useState<R360ViewType>(initialView);

  useEffect(() => {
    if (forceView) setView(forceView);
  }, [forceView]);

  // D-19 Nuclear scroll reset on view tab switch
  useEffect(() => {
    // When embedded inside the For You tab, do NOT reset scroll — the parent
    // page owns scroll position and must not be disrupted by view changes.
    if (embedded) return;
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
  const [summarizeOpen, setSummarizeOpen] = useState(false);
  const [ticketListMode, setTicketListMode] = useState<'open' | 'stale' | null>(null);

  // R360 Profile Drawer removed — intelligence icon now opens AIIntelligencePanel directly

  const { data: overview, isLoading: overviewLoading } = useR360Overview(resourceId || '');

  // Reporting structure — "Reports to" row with inline edit
  const profileId = (overview as any)?.profile_id ?? null;
  const { managerName, options: managerOptions, updateManager, isUpdating } = useR360Reporting(profileId);
  const [editingManager, setEditingManager] = useState(false);
  const [pendingManagerId, setPendingManagerId] = useState<string>('');

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
        else if (ticketListMode) setTicketListMode(null);
        else setSelectedItem(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [aiOpen, ticketListMode]);

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

  const deptColor = R360_DEPT_COLORS[overview.department] || 'var(--ds-text-subtlest, var(--cp-ink-3, var(--cp-text-secondary, #64748B)))';

  return (
    <>
      <div id="r360-root" data-r360-page-content style={{ position: 'relative', width: '100%', minWidth: 0, overflow: 'hidden', background: token('elevation.surface', '#FFFFFF'), flex: 1 }}>
        <div className="r3-page" style={{ background: token('elevation.surface', '#FFFFFF'), height: '100%', overflow: 'auto', paddingTop: '8px' }}>
          {/* ── Sticky Header: Profile + Week Nav ── */}
          <div style={{ position: 'sticky', top: 0, zIndex: 10, background: token('elevation.surface', '#FFFFFF') }}>
            {!embedded && (<>
            {/* ── Profile Header ── */}
            <div className="r3-profile">
              <div className="r3-profile-top">
                <div className="r3-profile-avatar" style={{ background: `linear-gradient(135deg, ${deptColor}, ${token('color.icon.accent.teal', '#1D9AAA')})` }}>
                  {overview.avatar_url ? (
                    <img src={overview.avatar_url} alt={overview.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  ) : null}
                  <span style={{ position: 'absolute', pointerEvents: 'none', ...(overview.avatar_url ? { display: 'none' } : {}) }}>{initials(overview.name)}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <div className="r3-profile-name">{overview.name}</div>
                  <div className="r3-profile-role">{overview.role_name} · {(overview as any).department}</div>
                  {/* Country flag + location badge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
                    {(overview as any).country && (
                      <span
                        data-testid="r360-country"
                        style={{
                          fontSize: 12,
                          color: token('color.text.subtle', '#626F86'),
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        {(overview as any).country_flag_svg_url ? (
                          <img
                            src={(overview as any).country_flag_svg_url}
                            alt={(overview as any).country_code ?? ''}
                            style={{ width: 16, height: 11, borderRadius: 2, objectFit: 'cover' }}
                          />
                        ) : (overview as any).country_code ? (
                          <span style={{ fontSize: 14, lineHeight: 1 }}>
                            {/* Convert ISO code to flag emoji */}
                            {String.fromCodePoint(
                              ...((overview as any).country_code as string)
                                .toUpperCase()
                                .split('')
                                .map((c: string) => 0x1F1E6 + c.charCodeAt(0) - 65)
                            )}
                          </span>
                        ) : null}
                        {(overview as any).country}
                      </span>
                    )}
                    {(overview as any).location && (
                      <span
                        data-testid="r360-location"
                        style={{
                          fontSize: 11,
                          fontWeight: 500,
                          padding: '1px 6px',
                          borderRadius: 3,
                          background: token('color.background.neutral', '#F1F2F4'),
                          color: token('color.text.subtle', '#626F86'),
                          whiteSpace: 'nowrap' as const,
                        }}
                      >
                        {(overview as any).location}
                      </span>
                    )}
                  </div>
                  {/* Reports to row — only render when manager is set or actively editing */}
                  {(managerName || editingManager) && <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <span style={{ fontSize: 11, color: token('color.text.subtlest', '#8590A2'), fontWeight: 500 }}>
                      Reports to:
                    </span>
                    {editingManager ? (
                      <>
                        <select
                          data-testid="r360-manager-select"
                          value={pendingManagerId}
                          onChange={e => setPendingManagerId(e.target.value)}
                          style={{
                            fontSize: 11, padding: '1px 4px', borderRadius: 3,
                            border: `1px solid ${token('color.border.focused', '#388BFF')}`,
                            color: token('color.text', 'var(--cp-text-primary, var(--cp-text-inverse, #172B4D))'),
                            background: token('elevation.surface', '#FFFFFF'),
                            outline: 'none', maxWidth: 180,
                          }}
                        >
                          <option value="">— None —</option>
                          {managerOptions.map(o => (
                            <option key={o.id} value={o.id}>{o.name}</option>
                          ))}
                        </select>
                        <button
                          onClick={async () => {
                            await updateManager(pendingManagerId || null);
                            setEditingManager(false);
                          }}
                          disabled={isUpdating}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: token('color.text.success', '#216E4E') }}
                          title="Save"
                        >
                          <Check size={12} />
                        </button>
                        <button
                          onClick={() => setEditingManager(false)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: token('color.text.subtle', '#626F86') }}
                          title="Cancel"
                        >
                          <X size={12} />
                        </button>
                      </>
                    ) : (
                      <>
                        <span
                          data-testid="r360-manager-name"
                          style={{ fontSize: 11, color: token('color.text.subtle', '#626F86') }}
                        >
                          {managerName ?? '—'}
                        </span>
                        <button
                          data-testid="r360-manager-edit"
                          onClick={() => {
                            const currentOpt = managerOptions.find(o => o.name === managerName);
                            setPendingManagerId(currentOpt?.id ?? '');
                            setEditingManager(true);
                          }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: token('color.text.subtlest', '#8590A2'), display: 'inline-flex', alignItems: 'center' }}
                          title="Edit reporting manager"
                        >
                          <Pencil size={10} />
                        </button>
                      </>
                    )}
                  </div>}
                </div>
                {/* §9 — Backlog health chip: single ADS chip, stale as subsidiary indicator */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                  {/* Main count — active backlog total.
                      Treatment is NEUTRAL regardless of stale subcount —
                      "active" is informational, not alarming. The "38 stale"
                      sub-row below carries the warning treatment when
                      relevant. Earlier the whole badge flipped to ADS
                      danger styling whenever stale > 0, which signalled
                      DANGER for what is actually just "your open work"
                      (design-critique 2026-05-17, H2/H4 P0).  */}
                  <div
                    onClick={() => setTicketListMode(bannerOpenCount > 0 ? 'open' : null)}
                    title={`${bannerOpenCount} items in your active backlog (not yet done)`}
                    style={{
                      display: 'inline-flex', flexDirection: 'column', alignItems: 'center',
                      padding: '6px 14px', borderRadius: 6, gap: 1,
                      background: token('color.background.neutral.subtle', '#F7F8F9'),
                      border: `1px solid ${token('color.border', '#091E4224')}`,
                      cursor: bannerOpenCount > 0 ? 'pointer' : 'default',
                      transition: 'background 80ms ease',
                    }}
                    onMouseEnter={e => {
                      if (bannerOpenCount > 0) {
                        (e.currentTarget as HTMLElement).style.background = token('color.background.neutral.subtle.hovered', '#F1F2F4');
                      }
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.background = token('color.background.neutral.subtle', '#F7F8F9');
                    }}
                  >
                    <div style={{ fontSize: 22, fontWeight: 700, lineHeight: '26px', fontVariantNumeric: 'tabular-nums', color: token('color.text', 'var(--cp-text-primary, var(--cp-text-inverse, #172B4D))') }}>
                      {bannerOpenCount}
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 600, lineHeight: '13px', letterSpacing: '0.04em', color: token('color.text.subtle', 'var(--cp-text-secondary, var(--cp-text-secondary, #44546F))') }}>
                      active
                    </div>
                  </div>
                  {/* Stale sub-indicator — only when > 0, communicates it's a subset of active */}
                  {bannerStaleCount > 0 && (
                    <div
                      onClick={() => setTicketListMode('stale')}
                      title={`${bannerStaleCount} of ${bannerOpenCount} items untouched for >14 days`}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 3,
                        fontSize: 11, fontWeight: 500, cursor: 'pointer',
                        color: token('color.text.warning', '#974F0C'),
                        padding: '1px 4px', borderRadius: 3,
                      }}
                    >
                      ⚠ {bannerStaleCount} stale
                    </div>
                  )}
                </div>
              </div>

              {/* §3 — Stale warning banner */}
              {allStale && allOpenItems.length > 0 && (
                <div style={{ margin: '8px 0 0', padding: '8px 12px', background: token('color.background.warning', '#FFF7D6'), borderLeft: `3px solid ${token('color.border.warning', 'var(--cp-warning, #D97706)')}`, borderRadius: '0 4px 4px 0', fontSize: '13px', color: token('color.text.warning', '#974F0C') }}>
                  ⚠️ All assigned items are stale. Oldest: {oldestAge} days.
                </div>
              )}

              {/* ── Tabs + Actions — §10 toolbar buttons ── */}
              <div className="r3-tabs">
                {!forceView && !embedded && (['ring', 'chronology', 'board'] as R360ViewType[]).map(v => (
                  <button key={v} className={`r3-tab ${view === v ? 'active' : ''}`} onClick={() => setView(v)}>
                    {v.charAt(0).toUpperCase() + v.slice(1)}
                  </button>
                ))}
                <div className="r3-tab-spacer" />
                {/* Back — hidden when embedded in For You tab */}
                {!embedded && (
                  <button
                    onClick={() => navigate(backPath)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'transparent', border: 'none', color: token('color.text.subtle', '#626F86'), fontSize: '13px', fontWeight: 500, cursor: 'pointer', padding: '4px 8px' }}
                    onMouseEnter={e => { e.currentTarget.style.textDecoration = 'underline'; }}
                    onMouseLeave={e => { e.currentTarget.style.textDecoration = 'none'; }}
                  >
                    <ChevronLeft size={14} /> Back
                  </button>
                )}
                {/* Quarter label — computed from current date */}
                <button style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: token('color.background.neutral', '#F1F2F4'), border: 'none', borderRadius: '6px', color: token('color.text', 'var(--cp-text-primary, var(--cp-text-inverse, #172B4D))'), fontSize: '13px', fontWeight: 500, cursor: 'pointer', padding: '5px 12px' }}>
                  <Calendar size={13} /> {`Q${Math.ceil((new Date().getMonth() + 1) / 3)}-${new Date().getFullYear()}`}
                </button>
                {/* Ask Caty - Profile — opens R360 profile drawer.
                    Label verb-qualified ("- Profile") so users know this CTA
                    opens the profile/intelligence panel, not a generic AI chat. */}
                <AIIntelligenceButton
                  label="Ask Caty - Profile"
                  onClick={() => setAiOpen(true)}
                  tooltip="Ask Caty about this profile"
                />
                <AIIntelligenceButton
                  label="Ask Caty - Summarize"
                  onClick={() => setSummarizeOpen(true)}
                  tooltip="Summarize all work for this resource"
                />
              </div>
            </div>
            </>)}

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
                <div style={{ margin: '16px auto', maxWidth: 560, padding: '16px 24px', borderRadius: '8px', border: `1px solid ${token('color.border', '#091E4224')}`, background: token('elevation.surface', '#FFFFFF'), textAlign: 'center' }}>
                  <div style={{ fontSize: '13px', color: token('color.text.subtle', '#626F86'), marginBottom: '10px' }}>
                    <strong style={{ color: token('color.text', 'var(--cp-text-primary, var(--cp-text-inverse, #172B4D))') }}>{allOpenItems.length} open item{allOpenItems.length !== 1 ? 's' : ''}</strong> across all time
                    {allStaleItems.length > 0 && <span> · {allStaleItems.length} stale</span>}
                  </div>
                  <div style={{ fontSize: '12.5px', color: token('color.text.subtlest', '#8590A2'), marginBottom: '12px' }}>
                    Last activity: <strong style={{ color: token('color.text.subtle', '#626F86') }}>{lastActivityDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</strong>
                  </div>
                  <button
                    onClick={jumpToLastActivity}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '6px',
                      padding: '7px 18px', borderRadius: '6px', fontSize: '12.5px', fontWeight: 600,
                      border: 'none', background: token('color.background.brand.subtlest', '#E9F2FF'), color: token('color.text.brand', 'var(--cp-primary-60, #0052CC)'),
                      cursor: 'pointer', transition: 'all 80ms ease',
                    }}
                    onMouseOver={e => { (e.target as HTMLButtonElement).style.background = token('color.background.brand.subtlest.hovered', '#CCE0FF'); }}
                    onMouseOut={e => { (e.target as HTMLButtonElement).style.background = token('color.background.brand.subtlest', '#E9F2FF'); }}
                  >
                    <Calendar size={13} />
                    Jump to last activity
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              {view === 'ring' && (
                <div style={{ position: 'relative' }}>
                  <div style={effectiveState === 'on_leave' ? { opacity: 0.45, filter: 'grayscale(25%)', pointerEvents: 'none', userSelect: 'none' } : undefined}>
                    <RingView items={filteredWeekItems} name={overview.name} role={overview.role_name} avatarUrl={overview.avatar_url} onSelect={embedded ? (item) => useGlobalSearchStore.getState().openDetail({ id: item.item_key }) : setSelectedItem} selected={selectedItem} overview={overview} onAvatarClick={() => setAiOpen(true)} presenceState={(effectiveState ?? 'away') as any} />
                  </div>
                  {effectiveState === 'on_leave' && (
                    <div style={{
                      position: 'absolute',
                      top: 12,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '4px 12px',
                      borderRadius: 999,
                      background: token('color.background.information', '#E9F2FE'),
                      color: token('color.text.information', '#0052CC'),
                      fontSize: 12,
                      fontWeight: 500,
                      fontFamily: 'var(--ds-font-family-body, "Inter"), system-ui, sans-serif',
                      boxShadow: token('elevation.shadow.raised', '0 1px 1px rgba(9,30,66,0.12)'),
                      pointerEvents: 'none',
                      whiteSpace: 'nowrap',
                    }}>
                      On leave
                      {backOn && ` · Back ${new Date(backOn).toLocaleDateString('en', { month: 'short', day: 'numeric' })}`}
                    </div>
                  )}
                </div>
              )}
              {view === 'chronology' && <ChronologyView items={filteredWeekItems} onSelect={embedded ? (item) => useGlobalSearchStore.getState().openDetail({ id: item.item_key }) : setSelectedItem} weekStart={period.start} weekEnd={period.end} />}
              {view === 'board' && <BoardView items={filteredWeekItems} onSelect={embedded ? (item) => useGlobalSearchStore.getState().openDetail({ id: item.item_key }) : setSelectedItem} quarterLabel={embedded ? `Q${Math.ceil((new Date().getMonth() + 1) / 3)}-${new Date().getFullYear()}` : undefined} />}
            </>
          )}

          {/* ── Detail Panel — hidden when embedded (uses canonical CatalystDetailRouter instead) ── */}
          {selectedItem && !embedded && (
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
              backgroundColor: token('elevation.surface.overlay', '#FFFFFF'),
              zIndex: 301,
              overflowY: 'auto',
              boxShadow: token('elevation.shadow.overlay', 'none'),
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <R360ProfileDrawer resourceId={resourceId} onClose={() => setAiOpen(false)} />
          </div>
        </>,
        document.body
      )}

      {/* Ask Caty — Summarize Drawer */}
      {summarizeOpen && resourceId && createPortal(
        <>
          <div
            onClick={() => setSummarizeOpen(false)}
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
              backgroundColor: token('elevation.surface.overlay', '#FFFFFF'),
              zIndex: 301,
              overflowY: 'auto',
              boxShadow: token('elevation.shadow.overlay', 'none'),
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <R360SummarizeDrawer resourceId={resourceId} onClose={() => setSummarizeOpen(false)} />
          </div>
        </>,
        document.body
      )}
    </>
  );
}
