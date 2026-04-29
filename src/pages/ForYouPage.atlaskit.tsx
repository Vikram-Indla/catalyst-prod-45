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
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { token } from '@atlaskit/tokens';
import { useForYouData, type TabType, type WorkItem } from '@/hooks/useForYouData';
import RecommendedProjectsStrip from '@/components/for-you/atlaskit/RecommendedProjectsStrip';
import ForYouTabs, { FOR_YOU_TAB_KEY } from '@/components/for-you/atlaskit/ForYouTabs';
import RecommendedPanel from '@/components/for-you/atlaskit/RecommendedPanel';
import AssignedPanel from '@/components/for-you/atlaskit/AssignedPanel';
import StarredPanel from '@/components/for-you/atlaskit/StarredPanel';
// WorkedOnPanel / ViewedPanel removed April 2026 — those tabs were pruned
// from FOR_YOU_TAB_ORDER because they had low real-world use; keeping the
// imports around would just be dead wiring.
import AiThemePanel from '@/components/for-you/atlaskit/AiThemePanel';
import AgeingPanel from '@/components/for-you/atlaskit/AgeingPanel';
import { ForYouDetailPanel } from '@/components/for-you/ForYouDetailPanel';
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
  const data = useForYouData();
  const {
    activeTab, setActiveTab,
    tabCounts,
    workItems,
    user,
    isLoading,
    selectedItem,
    closeDetailPanel,
    toggleStar,
    trackView,
    handleRowClick,
    recommendedMentions,
    recommendedComments,
    allUserProjects,
  } = data;

  // ─── Persist the tab across refreshes ────────────────────────────────────
  // April 2026 — Worked on / Viewed were pruned from the tab strip.
  // Late April 2026 — 'ai-recap' was replaced by 'ai-theme' (same slot).
  // Any stale localStorage value from before either change is migrated
  // to a live tab on mount so the user lands on a real tab instead of
  // staring at an orphaned selection state.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(FOR_YOU_TAB_KEY) as string | null;
      // 'ai-recap' migrates to 'ai-theme' (same slot, successor tab).
      // 'worked' / 'viewed' migrate to 'recommended' (landing default).
      if (stored === 'ai-recap') {
        localStorage.setItem(FOR_YOU_TAB_KEY, 'ai-theme');
        setActiveTab('ai-theme');
      } else if (stored === 'worked' || stored === 'viewed') {
        localStorage.setItem(FOR_YOU_TAB_KEY, 'recommended');
        setActiveTab('recommended');
      } else if (stored && stored !== activeTab) {
        setActiveTab(stored as TabType);
      }
    } catch {
      /* localStorage unavailable (SSR/privacy) — no-op */
    }
    // We only want to run this on mount; activeTab ref won't be stale
    // because setActiveTab is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTabChange = useCallback((tab: TabType) => {
    setActiveTab(tab);
    try { localStorage.setItem(FOR_YOU_TAB_KEY, tab); } catch { /* no-op */ }
    setVisibleCount(PAGE_SIZE); // reset pagination when switching tabs
  }, [setActiveTab]);

  // ─── Row click → canonical detail modal (Jira parity) ───────────────────
  // Route through useGlobalSearchStore.openDetail() — the same entry point
  // notifications, global search, and project sidebars use to surface the
  // canonical StoryDetailModal. ForYouDetailPanel is reserved for BRDs
  // (business_gap / business_request) which have bespoke affordances the
  // canonical modal doesn't yet support.
  const handleSelect = useCallback((item: WorkItem) => {
    trackView(item.id, item.issueType === 'planner_task' ? 'task' : 'ph_issue');
    if (isBusinessRequest(item)) {
      // Legacy drawer — preserves BRD-specific UI (stakeholders, impact, etc.)
      handleRowClick(item.id);
    } else {
      // Canonical path — same modal everywhere else in Catalyst.
      // Prefer phIssueId (the real ph_issues row UUID) when present so the
      // detail modal can resolve the Jira-synced record; fall back to id.
      useGlobalSearchStore.getState().openDetail({
        id: item.phIssueId || item.id,
        itemType: item.issueType,
        projectKey: item.projectKey,
      });
    }
  }, [handleRowClick, trackView]);

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
      case 'recommended': return <RecommendedPanel {...panelProps} mentions={recommendedMentions} comments={recommendedComments} currentUserName={currentUserName} />;
      case 'assigned':    return <AssignedPanel    {...panelProps} />;
      case 'starred':     return <StarredPanel     {...panelProps} />;
      default:            return <RecommendedPanel {...panelProps} mentions={recommendedMentions} comments={recommendedComments} currentUserName={currentUserName} />;
    }
  }, [activeTab, visibleItems, isLoading, handleSelect, toggleStar, recommendedMentions, recommendedComments, currentUserName, allUserProjects]);

  // AI Theme and Ageing render their own vertical lists/grids internally —
  // neither shares the client-side pagination window that the row-feed tabs
  // use. Suppress Load more + sentinel for those tabs to avoid dead chrome.
  const showPagination = activeTab !== 'ai-theme' && activeTab !== 'ageing';

  return (
    <div
      style={{
        minHeight: '100%',
        width: '100%',
        // Phase 12 (2026-04-29): reverted to Atlaskit token() calls. Phase 11
        // unblocked Atlaskit's bundled dark theme — `elevation.surface` /
        // `color.text` resolve correctly via --ds-* in both modes natively.
        background: token('elevation.surface', '#FFFFFF'),
        color: token('color.text', '#292A2E'),
        paddingInline: 'clamp(16px, 3vw, 32px)',
        paddingBlockStart: 24,
        paddingBlockEnd: 48,
        maxWidth: 1280,
        marginInline: 'auto',
        boxSizing: 'border-box',
      }}
    >
      {/* Recommended projects strip — account-scoped, stable across tab
          switches. Jira parity (image ref 2026-04-24): projects strip comes
          FIRST, then the "For you" heading + tab strip share a single row
          directly above the feed. */}
      <RecommendedProjectsStrip projects={allUserProjects} />

      {/* Heading + tabs — single flex row, "For you" left-aligned, tabs
          right-aligned. Jira's DOM ships this as a div with
          `display:flex; justify-content:space-between`. */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          marginBlockStart: 20,
          marginBlockEnd: 16,
          flexWrap: 'wrap',
        }}
      >
        <h1
          style={{
            font: `500 20px/24px "Inter", system-ui, sans-serif`,
            color: token('color.text', '#292A2E'),
            margin: 0,
            letterSpacing: '-0.003em',
          }}
        >
          For you
        </h1>
        <ForYouTabs
          activeTab={activeTab}
          tabCounts={tabCounts}
          onChange={handleTabChange}
        />
      </div>

      {/* Active panel */}
      <div
        role="tabpanel"
        id={`for-you-panel-${activeTab}`}
        aria-labelledby={`for-you-tab-${activeTab}`}
      >
        {panel}
      </div>

      {/* Load more + sentinel */}
      {showPagination && hasMore && (
        <div style={{ display: 'flex', justifyContent: 'center', paddingBlock: 24 }}>
          <button
            type="button"
            onClick={loadMore}
            style={{
              padding: '8px 18px',
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
          <div ref={sentinelRef} style={{ position: 'absolute', width: 1, height: 1, pointerEvents: 'none' }} />
        </div>
      )}

      {/* Detail panel — ONLY for business_gap / business_request items.
          Everything else routes to the canonical StoryDetailModal via
          useGlobalSearchStore.openDetail() (see handleSelect above).
          This gate is what deprecates ForYouDetailPanel for non-BRD work. */}
      {selectedItem && isBusinessRequest(selectedItem) && (
        <ForYouDetailPanel
          item={selectedItem}
          onClose={closeDetailPanel}
        />
      )}
    </div>
  );
}
