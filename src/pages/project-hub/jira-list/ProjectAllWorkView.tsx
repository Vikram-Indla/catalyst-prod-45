/**
 * ProjectAllWorkView — All Work split panel (2-column, Jira-parity)
 *
 * 2026-04-18 history:
 *  - WS7: detail rendering delegated to CatalystDetailRouter (the canonical
 *    Atlaskit detail surface also used by /backlog). Replaces 460 lines of
 *    bespoke WorkItemDetailPanel and inherits Jira-correct typography,
 *    tokens, inline-edit fields, and description editor for free.
 *  - Table/Split toggle removed per directive; Ask AI removed from left
 *    toolbar (not used on this surface).
 *  - dbId wiring added to avoid CLAUDE.md §L39 UUID/issue_key silent 400.
 *
 * 2026-04-20 history:
 *  - A4 chokepoint extraction: selection state + URL sync moved to
 *    `useItemSelection` (src/hooks/useItemSelection.ts). This file is
 *    now the canonical caller; any new list-to-detail surface should
 *    reach for the hook rather than re-implementing the pattern.
 *    Behaviour unchanged — the hook encodes the exact prior semantics.
 */
import React, { lazy, Suspense, useState, useCallback, useRef, useEffect, useMemo } from 'react';
// (token import removed — switched to var(--cp-*) for proper dark-mode flip)
import { WorkListPanel } from './components/WorkListPanel';
import { useProjectAllWorkItems } from '@/hooks/useProjectListItems';
import { useItemSelection } from '@/hooks/useItemSelection';
import { ProjectHeaderChip } from '@/components/layout/ProjectHeaderChip';
import { ProjectTabBar } from '@/components/layout/ProjectTabBar';
import {
  AllWorkToolbar,
  EMPTY_FILTERS,
  itemPassesFilters,
  type AllWorkView,
  type FilterState,
} from './components/AllWorkToolbar';

const CatalystDetailRouter = lazy(
  () => import('@/components/catalyst-detail-views/CatalystDetailRouter'),
);

interface Props {
  projectKey: string;
  /** Optional — enables inline-edit mutations that need the project UUID. */
  projectId?: string;
}

/**
 * Below this width the split region cannot host both the 260px list and a
 * legible Jira-parity detail shell. The real lower bound is higher than the
 * raw article width because CatalystDetailRouter itself contains a left body,
 * a splitter, and a right sidebar. Hide the entire detail panel sooner so it
 * never visually crowds or overlaps the list in responsive preview mode.
 * The breakpoint is the split panel's own width, not the window width.
 */
const SPLIT_BREAKPOINT_PX = 1120;

export default function ProjectAllWorkView({ projectKey, projectId }: Props) {
  const { data: items = [] } = useProjectAllWorkItems(projectKey);

  /* jira-compare catalog items 3-9 (2026-05-02): toolbar state.
     2026-05-03 (P2.1): toolbarFilters reshaped from string[] (facet
     names) to per-facet selections so values plumb into the items
     hook below — selecting "Status" and choosing "In QA" now actually
     filters the rail. */
  const [toolbarQuery, setToolbarQuery] = useState('');
  const [toolbarView, setToolbarView] = useState<AllWorkView>('split');
  const [toolbarFilters, setToolbarFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [toolbarAssignees, setToolbarAssignees] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);

  /* Shift+F toggles the filter popup, mirroring Jira's "Press Shift + F
     to open and close" hint at the bottom of the popup. Skipped while
     focus is in an input/textarea/contenteditable so it never steals
     keystrokes from inline-edit fields. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.shiftKey || e.key !== 'F') return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      e.preventDefault();
      setFilterOpen(o => !o);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /* Client-side filter pass — paginated useProjectAllWorkItems already
     fetches the whole project (1000s of rows), so a per-render .filter()
     on the items array is the right scope. Pushing the predicate into
     the SQL would force a refetch on every chip click. */
  const filteredItems = useMemo(
    () => items.filter(i => itemPassesFilters(i, toolbarFilters)),
    [items, toolbarFilters],
  );

  /** In narrow mode the middle panel is hidden — clicking a card opens
   *  StoryDetailModal as a full overlay instead (Jira parity). */
  const [overlayItemId, setOverlayItemId] = useState<string | null>(null);

  const splitRef = useRef<HTMLDivElement>(null);
  const [isNarrow, setIsNarrow] = useState(false);

  useEffect(() => {
    const el = splitRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      setIsNarrow(w > 0 && w < SPLIT_BREAKPOINT_PX);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* A4 chokepoint: dual-shape lookup (id/dbId), URL param hydration
     (`?issue=BAU-5047`), URL param sync, and split-view auto-select-
     first are all inside the hook. See useItemSelection.ts for the
     pattern rationale and CLAUDE.md §L39 for the silent-400 guard.
     2026-05-03: pass filteredItems so the auto-select picks something
     visible in the current filter (matches Jira's behaviour — applying
     a filter that hides the active issue auto-selects the new top). */
  const { activeItem, selectItem } = useItemSelection(filteredItems, {
    urlParam: 'issue',
    autoSelectFirst: true,
  });

  const handleNavigate = useCallback((id: string) => {
    selectItem(id);
  }, [selectItem]);

  return (
    // Outer column — height 100% of the route slot, no scroll here. Both
    // the header and the split region live inside; the SPLIT REGION is
    // the only descendent that flexes to take remaining space, and each
    // inner panel (left list, center/right router) owns its own scroll.
    // Matches Jira's 3-region scroll model (measured 2026-04-18): left
    // panel 256×717 scrolls cards; center body scrolls article; right
    // details scrolls sidebar. Independent, not page-level.
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', background: 'var(--cp-bg-elevated, #FFFFFF)' }}>
      {/* jira-compare catalog item 1 (2026-05-02): the standalone "Project
          work" h2 is replaced by the canonical ProjectHeaderChip — Jira
          renders a 32px horizontal-nav-header strip with project avatar +
          name + Add people / meatball / share / automation / feedback /
          fullscreen actions. The previous solo h2 was a Catalyst-only
          divergence with no parity reference on the Jira side. */}
      <ProjectHeaderChip projectKey={projectKey} />
      {/* ProjectTabBar removed 2026-05-02 per Vikram — Catalyst navigation
          lives in the side menu, the tab strip duplicated those labels. */}
      <AllWorkToolbar
        projectKey={projectKey}
        query={toolbarQuery}
        onQueryChange={setToolbarQuery}
        view={toolbarView}
        onViewChange={setToolbarView}
        items={items}
        selectedFilters={toolbarFilters}
        onSelectedFiltersChange={setToolbarFilters}
        filterOpen={filterOpen}
        onFilterOpenChange={setFilterOpen}
        selectedAssignees={toolbarAssignees}
        onAssigneesChange={setToolbarAssignees}
      />

      {/* Split region — 3-panel responsive model (corrected 2026-04-20):
          • Wide   (≥1120px): [Navigator 260px] [Middle flex] [Right sidebar inside detail]
          • Narrow (<1120px): right sidebar hides (via @container in CatalystViewBase),
                              middle detail panel hides here, navigator takes full width.
          • The navigator (left list) is the LAST panel to collapse, matching
            Jira Cloud's tablet behavior — users still need to browse work items
            even when there's no room for the detail surface. */}
      {/* jira-compare follow-up (2026-05-02): top padding dropped to 0
          so the navigator and right rail "touch the roof" — Jira NIN
          aligns the rail flush against the page-header underline with
          no extra gap. Side / bottom padding kept. */}
      <div ref={splitRef} style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden', gap: 8, padding: '0 8px 8px' }}>
          {/* Navigator (left) — always visible; expands to full width when narrow.
              jira-compare 2026-05-02: bg switched from --cp-bg-sunken
              (slate-100 grey) to white. Vikram probe captured rail bg as
              rgb(241,245,249) which diverges from Jira's white rail. */}
          <div style={{
            width: isNarrow ? '100%' : 260,
            flexShrink: 0,
            background: 'var(--ds-surface, #FFFFFF)',
            borderRight: '1px solid var(--ds-border, #DFE1E6)',
            borderRadius: 0,
            overflow: 'hidden', display: 'flex', flexDirection: 'column',
            padding: '0',
          }}>
            <WorkListPanel
              items={filteredItems}
              selectedKey={activeItem?.id ?? null}
              onSelect={id => {
                selectItem(id);
                // Narrow mode → no middle panel visible; open overlay modal.
                if (isNarrow) setOverlayItemId(id);
              }}
              projectId={projectId}
              /* jira-compare 2026-05-02: AllWorkToolbar owns search — pass
                 toolbarQuery so the inner search hides and the rail filters
                 by the toolbar input. */
              externalQuery={toolbarQuery}
            />
          </div>

          {/* Middle + Right detail surface — hidden in narrow mode. */}
          {!isNarrow && (
            activeItem ? (
              <div style={{
                flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0,
                background: 'var(--cp-bg-elevated, #FFFFFF)',
                borderRadius: '0 10px 10px 0', overflow: 'hidden',
              }}>
                <Suspense fallback={
                  <div style={{ padding: 24, color: 'var(--cp-text-tertiary, #6B778C)', fontSize: 14 }}>
                    Loading…
                  </div>
                }>
                  <CatalystDetailRouter
                    isOpen={true}
                    onClose={() => selectItem(null)}
                    // CatalystDetailRouter queries ph_issues by UUID PK —
                    // WorkItem.id is the issue_key (e.g. "BAU-5500"), NOT a UUID.
                    // Use dbId (ph_issues.id). CLAUDE.md §L39 warns that
                    // passing the issue_key here yields a silent 400 and an
                    // empty issue object → title falls back to "—".
                    itemId={activeItem.id}
                    itemType={activeItem.type}
                    projectId={projectId}
                    projectKey={projectKey}
                    // Subtask clicks come in with the child row's UUID.
                    // selectItem normalises that back to issue_key so the
                    // URL-sync effect writes `?issue=BAU-XXXX` instead of a
                    // UUID (P1-5 + P1-8 fix from 2026-04-20 critique).
                    onOpenItem={(id) => selectItem(id)}
                    panelMode={true}
                    navigationItems={filteredItems.map(i => ({ id: i.id, summary: i.summary, issue_key: i.jiraKey }))}
                    onNavigate={handleNavigate}
                  />
                </Suspense>
              </div>
            ) : (
              <div style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--cp-text-tertiary, #6B778C)', fontSize: 14,
                fontFamily: "'Atlassian Sans', -apple-system, BlinkMacSystemFont, sans-serif",
              }}>
                Select an item to view details
              </div>
            )
          )}
      </div>

      {/* ── Narrow-mode overlay — Catalyst detail router (Patch #9, 2026-04-28).
            Previously routed every type through the V15 StoryDetailModal
            shell; that path is retired. Now the canonical type-aware
            router (same one used in the wide-mode panel above) handles
            all types, so Story / Epic / Feature / Subtask / Task / BR /
            Defect / Incident all render through their own CatalystView*. */}
      {overlayItemId && (() => {
        const overlayItem = items.find(i => i.id === overlayItemId);
        if (!overlayItem) return null;
        return (
          <Suspense fallback={null}>
            <CatalystDetailRouter
              isOpen={true}
              onClose={() => setOverlayItemId(null)}
              itemId={overlayItem.id}
              itemType={overlayItem.type}
              projectId={projectId ?? ''}
              projectKey={projectKey}
              onOpenItem={(id) => setOverlayItemId(id)}
              navigationItems={filteredItems.map(i => ({ id: i.id, summary: i.summary, issue_key: i.jiraKey }))}
              onNavigate={(id) => setOverlayItemId(id)}
            />
          </Suspense>
        );
      })()}
    </div>
  );
}
