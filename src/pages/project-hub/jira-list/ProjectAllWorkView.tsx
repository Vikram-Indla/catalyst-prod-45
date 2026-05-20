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
import Button from '@atlaskit/button';
import Select from '@atlaskit/select';
import { WorkListPanel } from './components/WorkListPanel';
import { useProjectAllWorkItems } from '@/hooks/useProjectListItems';
import { useItemSelection } from '@/hooks/useItemSelection';
import { makeOpenItemHandler } from './openItemDispatch';
import { ProjectHeaderChip } from '@/components/layout/ProjectHeaderChip';
import { ProjectTabBar } from '@/components/layout/ProjectTabBar';
import {
  AllWorkToolbar,
  EMPTY_FILTERS,
  itemPassesFilters,
  type AllWorkView,
  type FilterState,
} from './components/AllWorkToolbar';
import { useCatySearch } from '@/components/caty/catySearchStore';
import { applyCatyFilter } from '@/components/caty/applyCatyFilter';
import type { WorkItem } from '@/types/workItem.types';

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
  // PERF: useProjectAllWorkItems now returns paginated results with keyset cursor
  const {
    items = [],
    rowsPerPage,
    setRowsPerPage,
    hasNextPage,
    hasPrevPage,
    fetchNextPage,
    fetchPrevPage,
  } = useProjectAllWorkItems(projectKey);

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

  /* Caty AI search filter — when the user has run an Ask Caty query
     for THIS project AND it's resolved successfully, replace the
     toolbar-driven filter pass with the AI-derived spec. Toolbar
     selections are deliberately ignored while Caty is active so the
     results match exactly what the user asked for; clearing the Caty
     filter (via the chip below the bar or running a new project)
     restores manual filtering. */
  const catyStatus = useCatySearch((s) => s.status);
  const catyFilter = useCatySearch((s) => s.filter);
  const catyStoreProjectKey = useCatySearch((s) => s.projectKey);
  const catySecondaryQuery = useCatySearch((s) => s.secondaryQuery);
  const catyActive =
    catyStatus === 'ready' &&
    catyStoreProjectKey === projectKey &&
    catyFilter !== null;

  /* Client-side filter pass — paginated useProjectAllWorkItems already
     fetches the whole project (1000s of rows), so a per-render .filter()
     on the items array is the right scope. Pushing the predicate into
     the SQL would force a refetch on every chip click.

     When Caty is active, we additionally apply the in-result "Search
     work" substring filter (matched against summary AND issue key) so
     the user can drill into a large AI-narrowed list. */
  const filteredItems = useMemo(() => {
    let next: WorkItem[];
    if (catyActive && catyFilter) {
      next = applyCatyFilter(items, catyFilter);
      const q = catySecondaryQuery.trim().toLowerCase();
      if (q.length > 0) {
        next = next.filter((i) => {
          const sum = i.summary?.toLowerCase() ?? '';
          const key = i.jiraKey?.toLowerCase() ?? '';
          return sum.includes(q) || key.includes(q);
        });
      }
    } else {
      next = items.filter((i) => itemPassesFilters(i, toolbarFilters));
    }
    return next;
  }, [items, toolbarFilters, catyActive, catyFilter, catySecondaryQuery]);

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

  /* Caty auto-open — when an Ask Caty result just landed (status flips
     to 'ready' with a new filter), force-select the top match.
     The hook's autoSelectFirst path bails out when the URL still has
     the pre-Caty `?issue=` param (deep-link guard treats it as
     pending), which would leave the detail rail empty. Explicitly
     calling selectItem rewires URL + activeItem in one shot.

     IMPORTANT: WorkListPanel transforms the items it receives —
     drops subtask types and sorts by created_date desc — so the
     DOM-visible "first row" is NOT filteredItems[0]. We have to
     replicate the same transformation here, otherwise auto-open
     selects the array head while the user sees a different row at
     the top of the rail. If WorkListPanel's sort/filter ever
     changes, this needs to track. */
  const lastCatyFilterRef = useRef<unknown>(null);
  useEffect(() => {
    if (
      catyActive &&
      catyFilter !== null &&
      catyFilter !== lastCatyFilterRef.current
    ) {
      lastCatyFilterRef.current = catyFilter;
      // Mirror WorkListPanel.tsx: subtask filter + created-date desc sort
      const SUBTASK_TYPE_RE = /^(sub-?task|backend|frontend|figma|entity figma|integration)$/i;
      const topLevel = filteredItems.filter((i) => {
        const t = (i.type ?? '').toLowerCase();
        const rawType = (i.rawType ?? '').toLowerCase();
        return !SUBTASK_TYPE_RE.test(t) && !SUBTASK_TYPE_RE.test(rawType);
      });
      const sorted = [...topLevel].sort((a, b) => {
        const av = (a as { jira_created_at?: string }).jira_created_at
          ?? a.createdAt ?? a.id ?? '';
        const bv = (b as { jira_created_at?: string }).jira_created_at
          ?? b.createdAt ?? b.id ?? '';
        const cmp = String(av) < String(bv) ? -1 : String(av) > String(bv) ? 1 : 0;
        return -cmp; // desc, matches the panel's default sortDir
      });
      const top = sorted[0];
      if (top) selectItem(top.id);
    }
    if (catyStatus !== 'ready') {
      lastCatyFilterRef.current = null;
    }
  }, [catyActive, catyFilter, catyStatus, filteredItems, selectItem]);

  const handleNavigate = useCallback((id: string) => {
    selectItem(id);
  }, [selectItem]);

  /* Memoize navigationItems so CatalystDetailRouter doesn't re-render on
     every toolbar state change (new array reference would break React.memo). */
  const navigationItems = useMemo(
    () => filteredItems.map(i => ({ id: i.id, summary: i.summary, issue_key: i.jiraKey })),
    [filteredItems],
  );

  /* Stable handler — recreating on every render forces CatalystDetailRouter
     to reconcile even when neither items nor the dispatch logic changed. */
  const handleOpenItem = useCallback(
    makeOpenItemHandler(items, selectItem, setOverlayItemId),
    [items, selectItem],
  );

  return (
    // Outer column — height 100% of the route slot, no scroll here. Both
    // the header and the split region live inside; the SPLIT REGION is
    // the only descendent that flexes to take remaining space, and each
    // inner panel (left list, center/right router) owns its own scroll.
    // Matches Jira's 3-region scroll model (measured 2026-04-18): left
    // panel 256×717 scrolls cards; center body scrolls article; right
    // details scrolls sidebar. Independent, not page-level.
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))' }}>
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
          no extra gap.
          jira-compare 2026-05-05 cycle 2 — D-4 fix · LEFT padding dropped
          from 8px to 0 so the navigator sits flush against the global
          left rail's vertical divider. Vikram complaint (image 6):
          "left side padding issue empty space left for the navigator
          railing by the vertical divider". Right + bottom padding kept. */}
      <div ref={splitRef} style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden', gap: 8, padding: '0 8px 8px 0' }}>
          {/* Navigator (left) — always visible; expands to full width when narrow.
              jira-compare 2026-05-02: bg switched from --cp-bg-sunken
              (slate-100 grey) to white. Vikram probe captured rail bg as
              rgb(241,245,249) which diverges from Jira's white rail. */}
          <div style={{
            width: isNarrow ? '100%' : 260,
            flexShrink: 0,
            background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))',
            borderRight: '1px solid var(--ds-border, var(--cp-lozenge-grey-bg, var(--cp-border-neutral, #DFE1E6)))',
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
              onKeyClick={id => setOverlayItemId(id)}
              projectId={projectId}
              /* jira-compare 2026-05-02: AllWorkToolbar owns search — pass
                 toolbarQuery so the inner search hides and the rail filters
                 by the toolbar input. */
              externalQuery={toolbarQuery}
            />

            {/* Pagination footer — keyset pagination controls. */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 8px',
              borderTop: '1px solid var(--ds-border, var(--cp-lozenge-grey-bg, var(--cp-border-neutral, #DFE1E6)))',
              background: 'var(--cp-bg-sunken, var(--cp-bg-sunken, #F6F7F8))',
              gap: '8px',
              fontSize: '12px',
              color: 'var(--cp-text-secondary, var(--cp-text-tertiary, #6B778C))',
            }}>
              {/* Pagination buttons */}
              <div style={{ display: 'flex', gap: '4px' }}>
                <Button
                  appearance="subtle"
                  size="small"
                  isDisabled={!hasPrevPage}
                  onClick={fetchPrevPage}
                  aria-label="Previous page"
                >
                  Previous
                </Button>
                <Button
                  appearance="subtle"
                  size="small"
                  isDisabled={!hasNextPage}
                  onClick={fetchNextPage}
                  aria-label="Next page"
                >
                  Next
                </Button>
              </div>

              {/* Rows per page dropdown */}
              <Select
                options={[
                  { label: '25', value: 25 },
                  { label: '50', value: 50 },
                  { label: '100', value: 100 },
                ]}
                value={{ label: String(rowsPerPage), value: rowsPerPage }}
                onChange={(option) => {
                  if (option && 'value' in option) {
                    setRowsPerPage(option.value);
                  }
                }}
                isSearchable={false}
                isClearable={false}
                isMulti={false}
                styles={{
                  control: (base: any) => ({
                    ...base,
                    minHeight: '28px',
                    fontSize: '12px',
                  }),
                }}
                aria-label="Rows per page"
              />
            </div>
          </div>

          {/* Middle + Right detail surface — hidden in narrow mode. */}
          {!isNarrow && (
            activeItem ? (
              <div style={{
                flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0,
                background: 'var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))',
                borderRadius: '0 10px 10px 0', overflow: 'hidden',
              }}>
                <Suspense fallback={
                  <div style={{ padding: 24, color: 'var(--cp-text-tertiary, var(--cp-text-secondary, #6B778C))', fontSize: 14 }}>
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
                    // Use rawType (the DB's issue_type string) so CatalystDetailRouter's
                    // resolveItemType gets "Production Incident" / "Business Gap" / etc.
                    // instead of the collapsed WorkItemType 'task'. Fixes wrong view
                    // rendering for incident/change-request/business-gap types.
                    itemType={activeItem.rawType || activeItem.type}
                    projectId={projectId}
                    projectKey={projectKey}
                    // Subtask clicks come in with the child row's UUID.
                    // selectItem normalises that back to issue_key so the
                    // URL-sync effect writes `?issue=BAU-XXXX` instead of a
                    // UUID (P1-5 + P1-8 fix from 2026-04-20 critique).
                    // jira-compare 2026-05-10 — N1: parent crumb (often an
                    // Epic) is NOT in the AllWork items list. Dispatch via
                    // makeOpenItemHandler so out-of-list targets fall
                    // through to the overlay router.
                    onOpenItem={handleOpenItem}
                    panelMode={true}
                    navigationItems={navigationItems}
                    onNavigate={handleNavigate}
                  />
                </Suspense>
              </div>
            ) : (
              <div style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--cp-text-tertiary, var(--cp-text-secondary, #6B778C))', fontSize: 14,
                fontFamily: 'var(--cp-font-body)',
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
      {overlayItemId && (
        /* jira-compare 2026-05-10 — N1: items.find guard removed. The
           overlay must open any key, including parents (typically Epics)
           that AllWork filters out of `items`. CatalystDetailRouter does
           its own ph_issues lookup by issue_key when itemType is omitted
           (router.tsx:65-78), so we pass overlayItemId straight through. */
        <Suspense fallback={null}>
          <CatalystDetailRouter
            isOpen={true}
            onClose={() => setOverlayItemId(null)}
            itemId={overlayItemId}
            projectId={projectId ?? ''}
            projectKey={projectKey}
            onOpenItem={handleOpenItem}
            navigationItems={navigationItems}
            onNavigate={handleNavigate}
          />
        </Suspense>
      )}
    </div>
  );
}
