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
import WorkedOnPanel from '@/components/for-you/atlaskit/WorkedOnPanel';
import ViewedPanel from '@/components/for-you/atlaskit/ViewedPanel';
import { ForYouDetailPanel } from '@/components/for-you/ForYouDetailPanel';

const PAGE_SIZE = 20;

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
  } = data;

  // ─── Persist the tab across refreshes ────────────────────────────────────
  useEffect(() => {
    try {
      const stored = localStorage.getItem(FOR_YOU_TAB_KEY) as TabType | null;
      if (stored && stored !== activeTab) setActiveTab(stored);
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

  // ─── Row click → detail panel AND view tracking ─────────────────────────
  const handleSelect = useCallback((item: WorkItem) => {
    handleRowClick(item.id);
    trackView(item.id, item.issueType === 'planner_task' ? 'task' : 'ph_issue');
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
  const panel = useMemo(() => {
    const panelProps = {
      items: visibleItems,
      isLoading,
      onSelect: handleSelect,
      onToggleStar: toggleStar,
    };
    switch (activeTab) {
      case 'recommended': return <RecommendedPanel {...panelProps} mentions={recommendedMentions} />;
      case 'assigned':    return <AssignedPanel    {...panelProps} />;
      case 'starred':     return <StarredPanel     {...panelProps} />;
      case 'worked':      return <WorkedOnPanel    {...panelProps} />;
      case 'viewed':      return <ViewedPanel      {...panelProps} />;
      default:            return <RecommendedPanel {...panelProps} mentions={recommendedMentions} />;
    }
  }, [activeTab, visibleItems, isLoading, handleSelect, toggleStar, recommendedMentions]);

  return (
    <div
      style={{
        minHeight: '100%',
        width: '100%',
        background: token('elevation.surface', '#FFFFFF'),
        color: token('color.text', '#172B4D'),
        paddingInline: 'clamp(16px, 3vw, 32px)',
        paddingBlockStart: 24,
        paddingBlockEnd: 48,
        maxWidth: 1280,
        marginInline: 'auto',
        boxSizing: 'border-box',
      }}
    >
      {/* Greeting — Jira's version personalises on first name. */}
      <h1
        style={{
          font: `700 24px/32px "Sora", system-ui, sans-serif`,
          color: token('color.text', '#172B4D'),
          margin: 0,
          marginBlockEnd: 20,
        }}
      >
        Good to see you, {user.firstName}
      </h1>

      {/* Recommended projects strip — derived from everything we know */}
      <RecommendedProjectsStrip items={workItems} />

      {/* Tab strip */}
      <ForYouTabs
        activeTab={activeTab}
        tabCounts={tabCounts}
        onChange={handleTabChange}
      />

      {/* Active panel */}
      <div
        role="tabpanel"
        id={`for-you-panel-${activeTab}`}
        aria-labelledby={`for-you-tab-${activeTab}`}
      >
        {panel}
      </div>

      {/* Load more + sentinel */}
      {hasMore && (
        <div style={{ display: 'flex', justifyContent: 'center', paddingBlock: 24 }}>
          <button
            type="button"
            onClick={loadMore}
            style={{
              padding: '8px 18px',
              background: token('color.background.neutral', '#F1F2F4'),
              color: token('color.text', '#172B4D'),
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

      {/* Detail panel (reuses existing legacy panel — no Atlaskit equivalent yet).
          ForYouDetailPanel is a NAMED export and takes only { item, onClose } —
          visibility is controlled by mount/unmount, no `isOpen` prop. */}
      {selectedItem && (
        <ForYouDetailPanel
          item={selectedItem}
          onClose={closeDetailPanel}
        />
      )}
    </div>
  );
}
