/**
 * ForYouPage (Atlaskit) — Jira-parity For You surface.
 *
 * Surface spec
 * ────────────
 *   ┌────────────────────────────────────────────────┐
 *   │ Greeting                                       │
 *   │                                                │
 *   │ Recommended spaces                View all  →  │
 *   │ [card][card][card][card][card][card]           │
 *   │                                                │
 *   │ Recommended · Assigned to me (99) · …          │
 *   │ ┌──────────────────────────────────────────┐   │
 *   │ │ panel for the active tab                 │   │
 *   │ │ grouped rows with hover-reveal star      │   │
 *   │ └──────────────────────────────────────────┘   │
 *   └────────────────────────────────────────────────┘
 *
 * Loose infinite-scroll model (Jira parity)
 * ─────────────────────────────────────────
 * Jira's For You paginates client-side: render 20 rows, show "Load more"
 * at the bottom, fetch the next 20 on click OR when an IntersectionObserver
 * sentinel comes into view. We implement both — sentinel auto-advances, the
 * explicit button is a keyboard-accessible fallback.
 *
 * Data
 * ────
 * useForYouData() is the single source of truth. It already exposes the
 * five tab collections + tabCounts. We only decide which collection to
 * hand to the active panel and own the client-side pagination window.
 *
 * Interactions
 * ────────────
 * - Row click → open detail panel (handleRowClick) AND trackView (Viewed tab)
 * - Star click → toggleStar (optimistic in the hook)
 * - Tab switch → updates activeTab + persists to localStorage
 * - View all projects → /projects route
 */
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { token } from '@atlaskit/tokens';
import { useAuth } from '@/lib/auth';
import { useForYouData, type TabType, type WorkItem } from '@/hooks/useForYouData';
import RecommendedProjectsStrip from '@/components/for-you/atlaskit/RecommendedProjectsStrip';
import ForYouTabs, { FOR_YOU_TAB_KEY, FOR_YOU_TAB_ORDER, type ForYouTabDefinition } from '@/components/for-you/atlaskit/ForYouTabs';
import RecommendedPanel from '@/components/for-you/atlaskit/RecommendedPanel';
import AssignedPanel from '@/components/for-you/atlaskit/AssignedPanel';
import StarredPanel from '@/components/for-you/atlaskit/StarredPanel';
// WorkedOnPanel / ViewedPanel removed April 2026 — those tabs were pruned
// from FOR_YOU_TAB_ORDER because they had low real-world use; keeping the
// imports around would just be dead wiring.
import AiThemePanel from '@/components/for-you/atlaskit/AiThemePanel';
import AgeingPanel from '@/components/for-you/atlaskit/AgeingPanel';
import R360Panel from '@/components/for-you/atlaskit/R360Panel';
import BoardPanel from '@/components/for-you/atlaskit/BoardPanel';
import TimelinePanel from '@/components/for-you/atlaskit/TimelinePanel';

import { useGlobalSearchStore } from '@/store/globalSearchStore';

const PAGE_SIZE = 20;

/**
 * Business-request routing
 * ────────────────────────
 * The canonical Catalyst detail modal (StoryDetailModal via
 * useGlobalSearchStore.openDetail) is the surface we use everywhere for
 * Jira-synced work items — notifications, global search, project sidebar,
 * hub row clicks. For You now follows the same convention.
 *
 * EXCEPTION: business_gap / business_request items still open the legacy
 * ForYouDetailPanel drawer because that panel has bespoke BRD affordances
 * (stakeholder list, gap status workflow, impact assessment) that the
 * canonical modal doesn't surface. Migration of BRDs to the canonical
 * modal is tracked separately; until then, keep the divergence here.
 */
const BUSINESS_REQUEST_TYPES = new Set([
  'business_gap',
  'Business Gap',
  'business_request',
  'Business Request',
]);

function isBusinessRequest(item: WorkItem | null | undefined): boolean {
  if (!item) return false;
  return BUSINESS_REQUEST_TYPES.has(String(item.issueType || '').trim());
}



export default function ForYouPageAtlaskit() {
  const { user: authUser, loading: authLoading } = useAuth();
  // Don't start data fetching until auth is fully established
  const data = useForYouData(authLoading);
  const {
    activeTab, setActiveTab,
    tabCounts,
    workItems,
    user,
    isLoading,
    toggleStar,
    trackView,
    recommendedMentions,
    recommendedComments,
    allUserProjects,
  } = data;

  // ─── Restore tab from localStorage SYNCHRONOUSLY on first render ─────────
  // Previously this ran in `useEffect` AFTER the first paint, causing a
  // visible flash from `recommended` → user's actual stored tab. The hook's
  // default `activeTab` initial value is `'recommended'`, so the effect
  // approach was always one paint behind reality.
  //
  // Now we read localStorage synchronously the first time this component
  // renders and push the migrated value back into useForYouData via
  // setActiveTab during a layout effect — before paint. The flash is gone.
  //
  // Migrations preserved from the previous effect:
  //   - 'ai-recap'        → 'ai-theme' (same slot, successor tab)
  //   - 'worked'|'viewed' → 'recommended' (those tabs were pruned April 2026)
  const initialStoredTabRef = useRef<TabType | null>(null);
  if (initialStoredTabRef.current === null) {
    try {
      const stored = localStorage.getItem(FOR_YOU_TAB_KEY) as string | null;
      if (stored === 'ai-recap') {
        initialStoredTabRef.current = 'ai-theme';
        localStorage.setItem(FOR_YOU_TAB_KEY, 'ai-theme');
      } else if (stored === 'worked' || stored === 'viewed') {
        initialStoredTabRef.current = 'recommended';
        localStorage.setItem(FOR_YOU_TAB_KEY, 'recommended');
      } else if (stored) {
        initialStoredTabRef.current = stored as TabType;
      } else {
        // Sentinel value so we don't re-enter this branch — `recommended` is
        // already the hook default, no setActiveTab needed.
        initialStoredTabRef.current = 'recommended';
      }
    } catch {
      initialStoredTabRef.current = 'recommended';
    }
  }
  const { tab: urlTab } = useParams<{ tab?: string }>();
  const navigate = useNavigate();

  // Build the visible tab strip — Team Pulse appended for leads/admins only.
  const visibleTabs = useMemo<ForYouTabDefinition[]>(
    () => FOR_YOU_TAB_ORDER,
    [],
  );

  const VALID_TABS: Set<string> = useMemo(
    () => new Set(['ai-theme', 'recommended', 'assigned', 'starred', 'r360', 'ageing', 'board', 'timeline']),
    [],
  );

  // useLayoutEffect runs before paint — applies the stored tab to the hook
  // state before the user sees any UI. URL param takes precedence over localStorage.
  useLayoutEffect(() => {
    if (urlTab && VALID_TABS.has(urlTab)) {
      setActiveTab(urlTab as TabType);
    } else if (initialStoredTabRef.current && initialStoredTabRef.current !== activeTab) {
      setActiveTab(initialStoredTabRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTabChange = useCallback((tab: TabType) => {
    setActiveTab(tab);
    try { localStorage.setItem(FOR_YOU_TAB_KEY, tab); } catch { /* no-op */ }
    navigate(`/for-you/${tab}`, { replace: true });
    setVisibleCount(PAGE_SIZE); // reset pagination when switching tabs
  }, [setActiveTab, navigate]);

  // ─── Row click → canonical detail modal (Jira parity) ───────────────────
  // Single path for every type, including BRDs (business_request /
  // business_gap). Routes through useGlobalSearchStore.openDetail() — same
  // entry point notifications, global search, and project sidebars use.
  // CatalystShell mounts CatalystDetailRouter for the pending item; the
  // router resolves business_request → CatalystViewBusinessRequest.
  //
  // History: ForYouDetailPanel (929 lines) used to handle BRDs separately
  // for "bespoke affordances (stakeholders, impact, etc.)". Sweep
  // 2026-05-11 confirmed that path was a parallel bespoke detail surface
  // duplicating canonical functionality. Routed through canonical instead;
  // when v2 BR view's cycle 4 lands (the formal swap of legacy BR mount
  // sites), the canonical chain will pick it up automatically.
  const handleSelect = useCallback((item: WorkItem) => {
    trackView(item.id, item.issueType === 'planner_task' ? 'task' : 'ph_issue');
    useGlobalSearchStore.getState().openDetail({
      id: item.id,
      itemType: item.issueType,
      projectKey: item.projectKey,
    });
  }, [trackView]);

  // ─── Ask Caty - Themify trigger (replaces former Caty Focus tab) ─────────
  // The AI Themify functionality used to live as a top-level tab. 2026-05-31:
  // moved to a contextual rainbow CTA on the Assigned panel that navigates
  // to the same AiThemePanel surface via handleTabChange('ai-theme').
  // (Modal-wrap pattern attempted first; reverted to navigation because the
  // modal silently failed to render — guaranteed-working path now.)

  // ─── Client-side pagination ─────────────────────────────────────────────
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const visibleItems = useMemo(() => workItems.slice(0, visibleCount), [workItems, visibleCount]);
  const hasMore = visibleItems.length < workItems.length;

  // IntersectionObserver sentinel — auto-loads the next page on scroll.
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!hasMore || !sentinelRef.current) return;
    const el = sentinelRef.current;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some(e => e.isIntersecting)) {
        setVisibleCount(c => Math.min(c + PAGE_SIZE, workItems.length));
      }
    }, { rootMargin: '200px' });
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, workItems.length]);

  const loadMore = useCallback(() => {
    setVisibleCount(c => Math.min(c + PAGE_SIZE, workItems.length));
  }, [workItems.length]);

  // ─── Panel selection ─────────────────────────────────────────────────────
  // Compose a display-name for the reply composer avatar in the Recommended
  // panel. `user` is sourced from useForYouData (firstName + lastName is
  // resolved from the `profiles` row) so we get the same name the rest of
  // the app does — routed through the single resolveAvatarUrl chokepoint.
  const currentUserName = useMemo(() => {
    const parts = [user?.firstName, user?.lastName].filter(Boolean);
    return parts.join(' ').trim() || undefined;
  }, [user?.firstName, user?.lastName]);

  const panel = useMemo(() => {
    const panelProps = {
      items: visibleItems,
      isLoading,
      onSelect: handleSelect,
      onToggleStar: toggleStar,
    };
    // `onSwitchTab` lets empty states route the user to a tab with content
    // (design-critique 2026-05-17 — Cooper goal-directed: empty states must
    // provide a recovery path, not be dead ends).
    const onSwitchTab = handleTabChange;
    switch (activeTab) {
      // AI Theme and Ageing own their own data pipelines — the generic
      // {items, onSelect, onToggleStar} row-feed props don't apply. Their
      // wrappers are framed with the same Atlaskit chrome as the other
      // panels so they slot in visually without bleeding internals.
      //
      // AiThemePanel receives allUserProjects as a prop rather than calling
      // useForYouData itself — see note in AiThemePanel.tsx for rationale.
      case 'ai-theme':    return <AiThemePanel allUserProjects={allUserProjects} />;
      case 'ageing':      return <AgeingPanel />;
      case 'r360':        return <R360Panel />;
      case 'board':       return <BoardPanel />;
      case 'timeline':    return <TimelinePanel />;
      case 'recommended': return <RecommendedPanel {...panelProps} mentions={recommendedMentions} comments={recommendedComments} currentUserName={currentUserName} onSwitchTab={onSwitchTab} />;
      case 'assigned':    return <AssignedPanel    {...panelProps} onAskCatyThemify={() => handleTabChange('ai-theme')} />;
      case 'starred':     return <StarredPanel     {...panelProps} onSwitchTab={onSwitchTab} />;
      default:            return <RecommendedPanel {...panelProps} mentions={recommendedMentions} comments={recommendedComments} currentUserName={currentUserName} onSwitchTab={onSwitchTab} />;
    }
  }, [activeTab, visibleItems, isLoading, handleSelect, toggleStar, recommendedMentions, recommendedComments, currentUserName, allUserProjects, handleTabChange]);

  // AI Theme and Ageing render their own vertical lists/grids internally —
  // neither shares the client-side pagination window that the row-feed tabs
  // use. Suppress Load more + sentinel for those tabs to avoid dead chrome.
  const showPagination = activeTab !== 'ai-theme' && activeTab !== 'ageing' && activeTab !== 'r360' && activeTab !== 'board' && activeTab !== 'timeline';
  const isR360Active = activeTab === 'r360' || activeTab === 'board' || activeTab === 'timeline';

  return (
    <div
      data-r360-fullscreen={isR360Active ? 'true' : undefined}
      style={{
        minHeight: '100%',
        width: '100%',
        // Phase 12 (2026-04-29): reverted to Atlaskit token() calls. Phase 11
        // unblocked Atlaskit's bundled dark theme — `elevation.surface` /
        // `color.text` resolve correctly via --ds-* in both modes natively.
        background: token('elevation.surface', '#FFFFFF'),
        color: token('color.text', '#292A2E'),
        paddingInline: isR360Active ? 0 : 'clamp(16px, 3vw, 32px)',
        paddingBlockStart: isR360Active ? 0 : 24,
        paddingBlockEnd: isR360Active ? 0 : 48,
        maxWidth: isR360Active ? 'none' : 1280,
        marginInline: isR360Active ? 0 : 'auto',
        boxSizing: 'border-box',
      }}
    >
      <div style={isR360Active ? { paddingInline: 'clamp(16px, 3vw, 32px)' } : undefined}>
        <RecommendedProjectsStrip projects={allUserProjects} />
      </div>

      {/* Heading + tabs — heading is hidden in R360 full-screen mode; tabs stay
          visible so the user can switch back to other tabs. */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: isR360Active ? 'flex-end' : 'space-between',
          gap: 16,
          marginBlockStart: isR360Active ? 8 : 20,
          marginBlockEnd: 12,
          flexWrap: 'wrap',
        }}
      >
        {!isR360Active && (
          <h1
            style={{
              // 2026-05-17 jira-compare re-probe: Jira /jira/for-you H1 is
              // 24px/28px 600 (semibold). Earlier this rendered at weight
              // 500 — visibly lighter than the Jira reference. Probe of the
              // Catalyst H1 confirmed `inline-style font-weight: 500` was
              // landing on the rendered DOM. Fixed to 600.
              font: `653 24px/28px var(--ds-font-family-body, "Inter"), system-ui, sans-serif`,
              color: token('color.text', '#292A2E'),
              margin: 0,
              letterSpacing: 0,
            }}
          >
            For you
          </h1>
        )}
        <ForYouTabs
          activeTab={activeTab}
          tabCounts={tabCounts}
          onChange={handleTabChange}
          tabs={visibleTabs}
        />
      </div>

      {/* Active panel — R360 gets min-height to fill viewport below the navbar */}
      <div
        role="tabpanel"
        id={`for-you-panel-${activeTab}`}
        aria-labelledby={`for-you-tab-${activeTab}`}
        style={isR360Active ? { minHeight: 'calc(100vh - 110px)' } : undefined}
      >
        {panel}
      </div>

      {/* Load more + sentinel.
          Sentinel must sit inside a `position: relative` container so its
          own `position: absolute` resolves against a real ancestor. Without
          that, the 1×1 div anchors to the page root and the
          IntersectionObserver rootMargin firing was unpredictable. */}
      {showPagination && hasMore && (
        <div
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            paddingBlock: 24,
            gap: 8,
          }}
        >
          {/* Sentinel placed BEFORE the button so IntersectionObserver fires
              as soon as the user nears the bottom of the visible feed — the
              button is the fallback affordance, not the trigger. */}
          <div
            ref={sentinelRef}
            aria-hidden="true"
            style={{ position: 'absolute', top: -200, left: 0, width: 1, height: 1, pointerEvents: 'none' }}
          />
          <button
            type="button"
            onClick={loadMore}
            style={{
              padding: `${token('space.100', '8px')} ${token('space.200', '16px')}`,
              background: token('color.background.neutral', '#F1F2F4'),
              color: token('color.text', '#292A2E'),
              border: 'none',
              borderRadius: 3,
              cursor: 'pointer',
              font: `500 14px/20px "Inter", system-ui, sans-serif`,
            }}
          >
            Load more
          </button>
        </div>
      )}

      {/* Detail rendering: CatalystShell mounts CatalystDetailRouter
          for the pending item set by handleSelect → openDetail().
          (Bespoke ForYouDetailPanel deleted 2026-05-11.) */}

      {/* Modal pattern for Ask Caty - Themify was tried (commit bdf8c6584)
          but failed to render — see commit message + AssignedPanel JSDoc.
          Navigation path (handleTabChange('ai-theme')) is now used instead. */}
    </div>
  );
}
