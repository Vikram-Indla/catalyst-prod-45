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
import Select from '@atlaskit/select';
import Pagination from '@atlaskit/pagination';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { WorkListPanel } from './components/WorkListPanel';
import { useProjectAllWorkItems } from '@/hooks/useProjectListItems';
import { useItemSelection } from '@/hooks/useItemSelection';
import { makeOpenItemHandler } from './openItemDispatch';
import { ProjectHeaderChip } from '@/components/layout/ProjectHeaderChip';
import { ProjectTabBar } from '@/components/layout/ProjectTabBar';
import {
  AllWorkToolbar,
  EMPTY_FILTERS,
  type AllWorkView,
  type FilterState,
} from './components/AllWorkToolbar';
import { useCatySearch } from '@/components/caty/catySearchStore';
import { applyCatyFilter } from '@/components/caty/applyCatyFilter';
import type { WorkItem } from '@/types/workItem.types';
import { jqlToFilterState } from '@/lib/jql/jqlToFilterState';
import { filterStateToJql } from '@/lib/filters/filterStateToJql';
import { FilterSaveModal } from '@/components/filters/FilterSaveModal';

const CatalystDetailRouter = lazy(
  () => import('@/components/catalyst-detail-views/CatalystDetailRouter'),
);

interface Props {
  projectKey: string;
  /** Optional — enables inline-edit mutations that need the project UUID. */
  projectId?: string;
}

/** Split container widths for 3-state responsive layout:
 *  wide   (≥1120px): list 360px + full detail (body + sidebar)
 *  medium (≥480px):  list 260px + detail (CatalystViewBase container query hides its sidebar)
 *  narrow (<480px):  list 100%, detail hidden (click → overlay)
 */
const WIDE_BP = 1120;
const NARROW_BP = 480;

export default function ProjectAllWorkView({ projectKey, projectId }: Props) {
  // PERF: useProjectAllWorkItems now returns paginated results with keyset cursor.
  // toolbarFilters is forwarded so server-side predicates are applied before LIMIT,
  // ensuring page 1 = first 25 of ALL matching rows, not 25 random rows filtered client-side.
  // We declare toolbarFilters before the hook call so the hook can depend on it.
  // (The useState initialisation below sets it to EMPTY_FILTERS so both decls are safe.)
  const [toolbarFilters, setToolbarFilters] = useState<FilterState>(EMPTY_FILTERS);

  // Hook call moved here so toolbarFilters is in scope.
  // Server-side filter predicates are applied before LIMIT 25, so page 1 =
  // first 25 matching rows for the active filter, not 25 unfiltered rows.
  const {
    items = [],
    rowsPerPage,
    setRowsPerPage,
    totalCount,
    page,
    setPage,
    pageCount,
  } = useProjectAllWorkItems(projectKey, toolbarFilters);

  /* ── Filter URL params ────────────────────────────────────────────────────
     ?filterId=<uuid>    — navigated here by clicking a saved filter name
     ?mode=create-filter — navigated here by clicking "Create filter"
     These implement the correct Jira flow:
       • Filters list → click filter → AllWork with items filtered by JQL
       • Filters list → Create filter → AllWork with filter builder active + Save button
  */
  const [searchParams, setSearchParams] = useSearchParams();
  const urlFilterId   = searchParams.get('filterId');
  const urlMode       = searchParams.get('mode');
  const isCreateMode  = urlMode === 'create-filter';

  // Load the saved filter when ?filterId is present
  const { data: activeFilter } = useQuery({
    queryKey: ['active-filter-banner', urlFilterId],
    queryFn: async () => {
      if (!urlFilterId) return null;
      const { data, error } = await supabase
        .from('ph_saved_filters')
        .select('id, name, jql_query')
        .eq('id', urlFilterId)
        .single();
      if (error) return null;
      return data as { id: string; name: string; jql_query: string | null };
    },
    enabled: !!urlFilterId,
    staleTime: 60_000,
  });

  // Save filter modal state — opened from "Save filter" toolbar button
  const [saveModalOpen, setSaveModalOpen] = useState(false);

  /* jira-compare catalog items 3-9 (2026-05-02): toolbar state.
     2026-05-03 (P2.1): toolbarFilters reshaped from string[] (facet
     names) to per-facet selections so values plumb into the items
     hook below — selecting "Status" and choosing "In QA" now actually
     filters the rail. */
  const [toolbarQuery, setToolbarQuery] = useState('');
  const [toolbarView, setToolbarView] = useState<AllWorkView>('split');
  // toolbarFilters declared above the hook call (before the URL params block)
  const [toolbarAssignees, setToolbarAssignees] = useState<string[]>([]);
  // Open the filter panel by default when entering create-filter mode
  const [filterOpen, setFilterOpen] = useState(isCreateMode);

  // When a saved filter loads, apply its JQL as the initial toolbar filter state.
  // We use a ref so this only fires once per filterId change, not on every re-render.
  const appliedFilterIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (activeFilter && activeFilter.id !== appliedFilterIdRef.current) {
      appliedFilterIdRef.current = activeFilter.id;
      if (activeFilter.jql_query) {
        setToolbarFilters(jqlToFilterState(activeFilter.jql_query));
      }
    }
  }, [activeFilter]);

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

  /* Filter pass — toolbar filters are now applied server-side in useProjectAllWorkItems,
     so `items` already contains only matching rows for the current page.
     We keep the client-side pass only for the Caty AI filter path (which has no
     server-side equivalent) and the secondary text search within Caty results.

     When Caty is inactive, filteredItems === items (server already filtered). */
  const filteredItems = useMemo(() => {
    if (catyActive && catyFilter) {
      let next = applyCatyFilter(items, catyFilter);
      const q = catySecondaryQuery.trim().toLowerCase();
      if (q.length > 0) {
        next = next.filter((i) => {
          const sum = i.summary?.toLowerCase() ?? '';
          const key = i.jiraKey?.toLowerCase() ?? '';
          return sum.includes(q) || key.includes(q);
        });
      }
      return next;
    }
    // Server-side filter already applied; return items as-is.
    return items;
  }, [items, catyActive, catyFilter, catySecondaryQuery]);

  /** In narrow mode the middle panel is hidden — clicking a card opens
   *  StoryDetailModal as a full overlay instead (Jira parity). */
  const [overlayItemId, setOverlayItemId] = useState<string | null>(null);

  const splitRef = useRef<HTMLDivElement>(null);
  type PanelLayout = 'wide' | 'medium' | 'narrow';
  const [panelLayout, setPanelLayout] = useState<PanelLayout>('wide');
  const isNarrow = panelLayout === 'narrow';

  useEffect(() => {
    const el = splitRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      if (w <= 0) return;
      if (w < NARROW_BP) setPanelLayout('narrow');
      else if (w < WIDE_BP) setPanelLayout('medium');
      else setPanelLayout('wide');
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

  // Overlay-specific navigate: chevrons inside the modal must update the
  // modal's displayed issue, not just the background list selection.
  const handleOverlayNavigate = useCallback((id: string) => {
    setOverlayItemId(id);
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
      {/* Filter context banner — shown when viewing a saved filter or in create-filter mode.
          Matches Jira's "Filter by: [name]" breadcrumb strip above the issue list. */}
      {(activeFilter || isCreateMode) && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          background: 'var(--ds-background-information, #E9F2FF)',
          borderBottom: '1px solid var(--ds-border-information, #CCE0FF)',
          fontSize: 13,
          color: 'var(--ds-text-information, #0055CC)',
          flexShrink: 0,
        }}>
          {isCreateMode ? (
            <>
              <span style={{ fontWeight: 500 }}>Creating filter</span>
              <span style={{ color: 'var(--ds-text-subtle, #42526E)' }}>
                — set your filters below, then click Save filter
              </span>
            </>
          ) : activeFilter ? (
            <>
              <span>Filter:</span>
              <span style={{ fontWeight: 500 }}>{activeFilter.name}</span>
              <button
                onClick={() => {
                  setToolbarFilters(EMPTY_FILTERS);
                  setSearchParams({});
                }}
                style={{
                  marginLeft: 'auto',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 12,
                  color: 'var(--ds-text-subtle, #42526E)',
                  padding: '0 4px',
                }}
              >
                Clear filter
              </button>
            </>
          ) : null}
        </div>
      )}
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
        onSaveFilter={
          (isCreateMode || !!urlFilterId)
            ? () => setSaveModalOpen(true)
            : undefined
        }
        saveFilterLabel={urlFilterId ? 'Update filter' : 'Save filter'}
      />

      {/* Save filter modal — opened from toolbar's Save filter button.
          Initialises with the JQL derived from current toolbar filter state. */}
      {saveModalOpen && (
        <FilterSaveModal
          filter={urlFilterId && activeFilter ? {
            id: activeFilter.id,
            name: activeFilter.name,
            jql_query: filterStateToJql(toolbarFilters, projectKey),
          } as any : undefined}
          initialJql={!urlFilterId ? filterStateToJql(toolbarFilters, projectKey) : undefined}
          hubScope="project"
          onClose={() => setSaveModalOpen(false)}
          onSaved={() => {
            setSaveModalOpen(false);
            // After saving, clear the create-filter mode
            if (isCreateMode) setSearchParams({});
          }}
        />
      )}

      {/* Split region — 3-state responsive model:
          • wide   (≥1120px): [List 360px] [Detail body + sidebar]
          • medium (≥480px):  [List 260px] [Detail body only — CatalystViewBase @container hides its sidebar]
          • narrow (<480px):  [List 100%] — detail hidden; click opens overlay
          At any viewport, ≥2 panels are visible (list always present). */}
      {/* jira-compare follow-up (2026-05-02): top padding dropped to 0
          so the navigator and right rail "touch the roof" — Jira NIN
          aligns the rail flush against the page-header underline with
          no extra gap.
          jira-compare 2026-05-05 cycle 2 — D-4 fix · LEFT padding dropped
          from 8px to 0 so the navigator sits flush against the global
          left rail's vertical divider. Vikram complaint (image 6):
          "left side padding issue empty space left for the navigator
          railing by the vertical divider". Right + bottom padding kept. */}
      <div ref={splitRef} style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden', gap: 8, padding: '0 0 8px 0' }}>
          {/* Navigator (left) — always visible; expands to full width when narrow.
              jira-compare 2026-05-02: bg switched from --cp-bg-sunken
              (slate-100 grey) to white. Vikram probe captured rail bg as
              rgb(241,245,249) which diverges from Jira's white rail. */}
          <div style={{
            width: isNarrow ? '100%' : panelLayout === 'medium' ? 260 : 360,
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
                if (isNarrow) {
                  setOverlayItemId(id);
                } else {
                  selectItem(id);
                }
              }}
              onKeyClick={id => {
                if (isNarrow) {
                  setOverlayItemId(id);
                } else {
                  selectItem(id);
                }
              }}
              projectId={projectId}
              /* jira-compare 2026-05-02: AllWorkToolbar owns search — pass
                 toolbarQuery so the inner search hides and the rail filters
                 by the toolbar input. */
              externalQuery={toolbarQuery}
              /* 2026-06-02: AllWork owns the canonical @atlaskit/pagination
                 footer — suppress WorkListPanel's competing "N of M" count. */
              hideFooter
            />

            {/* Pagination footer — offset/range pagination (2026-06-02).
                Single source of truth: @atlaskit/pagination numbered pages
                driven by page/setPage/pageCount + a Jira-style range label.
                Replaced the broken keyset Previous/Next (cursor never advanced)
                and removed the competing WorkListPanel "N of M" footer. */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 8px',
              borderTop: '1px solid var(--ds-border, var(--cp-lozenge-grey-bg, var(--cp-border-neutral, #DFE1E6)))',
              background: 'var(--cp-bg-sunken, var(--cp-bg-sunken, #F6F7F8))',
              gap: '8px',
              // ads-scanner:ignore-next-line
              fontSize: '12px',
              color: 'var(--cp-text-secondary, var(--cp-text-tertiary, #6B778C))',
            }}>
              {/* Jira-style range label: "1–25 of 656" */}
              <span
                data-testid="allwork-pagination-count"
                style={{
                  fontSize: 12,
                  color: 'var(--ds-text-subtle, var(--cp-text-tertiary, #6B778C))',
                  fontFamily: 'var(--cp-font-body)',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                {totalCount != null && totalCount > 0
                  ? `${(page - 1) * rowsPerPage + 1}–${Math.min(page * rowsPerPage, totalCount)} of ${totalCount}`
                  : `${filteredItems.length} items`}
              </span>

              {/* @atlaskit/pagination — numbered pages with built-in truncation
                  (1 … 5 6 7 … N). selectedIndex is 0-based; onChange yields the
                  1-based page value. Only rendered when there's more than 1 page. */}
              {pageCount > 1 && (
                <Pagination
                  pages={Array.from({ length: pageCount }, (_, i) => i + 1)}
                  selectedIndex={page - 1}
                  onChange={(_e, newPage) => setPage(newPage as number)}
                  label="Page"
                />
              )}

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
                    // ads-scanner:ignore-next-line
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
                    hideSidebar={panelLayout === 'medium'}
                  />
                </Suspense>
              </div>
            ) : (
              /* design-critique 2026-05-21 — H10 P1: bare "Select an item" text
                 upgraded to a proper Jira-parity empty state panel. */
              <div
                data-testid="allwork-empty-state"
                style={{
                  flex: 1, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  gap: 12, padding: '0 32px',
                  fontFamily: 'var(--cp-font-body)',
                }}
              >
                {/* Illustration — list-with-cursor SVG inline (no external asset dep) */}
                <svg width="80" height="80" viewBox="0 0 80 80" fill="none" aria-hidden="true">
                  <rect x="8" y="16" width="64" height="48" rx="6" fill="var(--ds-background-neutral, #F7F8F9)" stroke="var(--ds-border, #DFE1E6)" strokeWidth="1.5"/>
                  <rect x="16" y="28" width="24" height="4" rx="2" fill="var(--ds-background-neutral-pressed, #C1C7D0)"/>
                  <rect x="16" y="38" width="36" height="4" rx="2" fill="var(--ds-background-neutral-pressed, #C1C7D0)"/>
                  <rect x="16" y="48" width="20" height="4" rx="2" fill="var(--ds-background-neutral-pressed, #C1C7D0)"/>
                  <circle cx="56" cy="52" r="14" fill="var(--ds-background-information, #E9F2FF)" stroke="var(--ds-border-information, #CCE0FF)" strokeWidth="1.5"/>
                  <path d="M56 46v6l4 2" stroke="var(--ds-icon-information, #1868DB)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>

                <div style={{ textAlign: 'center' }}>
                  <p style={{
                    margin: '0 0 8px',
                    fontSize: 16, fontWeight: 600,
                    color: 'var(--ds-text, var(--cp-text-primary, #172B4D))',
                    lineHeight: '20px',
                  }}>
                    Select a work item
                  </p>
                  <p
                    data-testid="allwork-empty-state-subtitle"
                    style={{
                      margin: 0,
                      fontSize: 14, fontWeight: 400,
                      color: 'var(--ds-text-subtle, var(--cp-text-secondary, #44546F))',
                      lineHeight: '20px', maxWidth: 280,
                    }}
                  >
                    Choose an item from the list to view its details, comments, and related work.
                  </p>
                </div>
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
            onNavigate={handleOverlayNavigate}
          />
        </Suspense>
      )}
    </div>
  );
}
