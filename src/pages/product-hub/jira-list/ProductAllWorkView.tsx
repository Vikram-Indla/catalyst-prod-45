/**
 * ProductAllWorkView — Product Hub All Work split panel.
 *
 * Structural clone of ProjectAllWorkView (src/pages/project-hub/jira-list/ProjectAllWorkView.tsx).
 * Differences from the original:
 *  1. Data source: business_requests (MDT project, NOT ph_issues)
 *  2. Business requests mapped to WorkItem shape for reuse of WorkListPanel, AllWorkToolbar,
 *     useItemSelection, makeOpenItemHandler — all identical to the project version.
 *  3. Left panel: BrListPanel (clone of WorkListPanel, display-only avatar)
 *  4. Header: product chip (name + code) instead of ProjectHeaderChip
 *  5. CatalystDetailRouter: itemType='business_request', itemId=request_key
 *  6. productCode passed as projectKey to AllWorkToolbar (toolbar reused unchanged)
 *  7. No keyset cursor pagination (flat fetch; add later if needed)
 *
 * Layout: identical 3-panel model — toolbar | left navigator | right detail
 * Keyboard nav, group-by, sort, infinite scroll, Shift+F filter toggle,
 * Ask Caty, saved filters — all inherited from the original.
 */
import React, {
  lazy, Suspense, useState, useCallback, useRef, useEffect, useMemo,
} from 'react';
import { ProjectPageHeader } from '@/components/layout/ProjectPageHeader';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  AllWorkToolbar,
  EMPTY_FILTERS,
  itemPassesFilters,
  type AllWorkView,
  type FilterState,
} from '@/pages/project-hub/jira-list/components/AllWorkToolbar';
import { WorkListPanel } from '@/pages/project-hub/jira-list/components/WorkListPanel';
import { makeOpenItemHandler } from '@/pages/project-hub/jira-list/openItemDispatch';
import { useItemSelection } from '@/hooks/useItemSelection';
import { useBusinessRequestsByProduct } from '@/hooks/useBusinessRequests';
import { useTypeWorkflow } from '@/hooks/useTypeWorkflow';
import { FilterSaveModal } from '@/components/filters/FilterSaveModal';
import { jqlToFilterState } from '@/lib/jql/jqlToFilterState';
import { filterStateToJql } from '@/lib/filters/filterStateToJql';
import type { WorkItem } from '@/types/workItem.types';
import type { BusinessRequest } from '@/types/business-request';

const CatalystDetailRouter = lazy(
  () => import('@/components/catalyst-detail-views/CatalystDetailRouter'),
);

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  productCode: string;
  productId?: string;
  productName?: string;
}

const SPLIT_BREAKPOINT_PX = 1120;

// ── Profile lookup ─────────────────────────────────────────────────────────────

interface ProfileRow { id: string; full_name: string | null; avatar_url: string | null; }

function useProfileMap(brs: BusinessRequest[]) {
  return useQuery({
    queryKey: ['product-allwork-profiles-map', brs.length],
    enabled: brs.length > 0,
    queryFn: async () => {
      const ids = new Set<string>();
      brs.forEach(r => {
        if ((r as any).project_manager_user_id) ids.add((r as any).project_manager_user_id);
        if ((r as any).po_user_id) ids.add((r as any).po_user_id);
      });
      if (!ids.size) return new Map<string, ProfileRow>();
      const { data } = await supabase.from('profiles').select('id, full_name, avatar_url').in('id', Array.from(ids));
      const map = new Map<string, ProfileRow>();
      (data ?? []).forEach(p => map.set(p.id, p as ProfileRow));
      return map;
    },
    staleTime: 60_000,
  });
}

// ── BR → WorkItem mapping ─────────────────────────────────────────────────────
// Maps a BusinessRequest row to the WorkItem shape consumed by:
//   AllWorkToolbar (filter options derived from items list)
//   BrListPanel (card renderer)
//   useItemSelection (id, jiraKey, summary)
//   CatalystDetailRouter (id = request_key, rawType = 'business_request')

// Category now derived from ph_workflow_statuses via useTypeWorkflow — no hardcoding.

function initials(name: string | null | undefined): string {
  if (!name) return '??';
  return name.split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase();
}

function mapBrToWorkItem(
  r: BusinessRequest,
  profileMap: Map<string, ProfileRow>,
  statusLabel: string,
  statusCategoryMap: Map<string, 'todo' | 'in_progress' | 'done'>,
): WorkItem {
  const dm = (r as any).project_manager_user_id ? profileMap.get((r as any).project_manager_user_id) : null;
  const po = (r as any).po_user_id ? profileMap.get((r as any).po_user_id) : null;
  const rKey = (r as any).request_key as string;
  const quarter = (r as any).planned_quarter;
  const processStep = (r as any).process_step as string | null | undefined;

  return {
    id: rKey,                           // request_key — used for URL sync + itemId in CatalystDetailRouter
    dbId: (r as any).id ?? null,        // UUID — for future write operations
    projectId: (r as any).product_id ?? '',
    parentId: null,
    parentKey: null,
    jiraKey: rKey,
    type: 'task' as any,
    rawType: 'Business Request',        // for JiraIssueTypeIcon + workType filter chip
    summary: r.title ?? '(Untitled)',
    status: 'in_progress' as any,
    statusName: statusLabel,
    statusCategory: statusCategoryMap.get(processStep ?? '') ?? 'todo',
    assigneeId: (r as any).project_manager_user_id ?? null,
    assignee: dm ? {
      id: (r as any).project_manager_user_id,
      name: dm.full_name ?? 'Unknown',
      avatarUrl: dm.avatar_url ?? null,
      initials: initials(dm.full_name),
      color: 'var(--ds-background-accent-purple-subtle, #6554C0)',
    } : undefined,
    reporterId: (r as any).po_user_id ?? null,
    reporter: po ? { id: (r as any).po_user_id, name: po.full_name ?? 'Unknown' } : undefined,
    priority: ((r as any).urgency ?? 'medium') as any,
    // sprintRelease drives the Sprint/Releases facet chip — map first quarter value
    // so the chip has useful distinct options for product work items.
    sprintRelease: Array.isArray(quarter) ? (quarter[0] ?? null) : (quarter ?? null),
    fixVersion: Array.isArray(quarter) ? (quarter[0] ?? null) : (quarter ?? null),
    commentsCount: 0,
    childCount: 0,
    createdAt: (r as any).created_at ?? '',
    updatedAt: (r as any).updated_at ?? '',
    createdBy: null,
    severity: null,
    // Map request_type as labels so the Labels chip surfaces BR subtypes
    // (feature / gap / integration / data_request) as filterable values.
    labels: (r as any).request_type ? [(r as any).request_type] : [],
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ProductAllWorkView({ productCode, productId, productName }: Props) {
  const { data: brs = [], isLoading: brsLoading } = useBusinessRequestsByProduct(productId ?? null);
  const { data: brWorkflow } = useTypeWorkflow('BAU', 'Business Request');
  const { data: profileMap = new Map<string, ProfileRow>() } = useProfileMap(brs as BusinessRequest[]);

  // Build category + label lookup from ph_workflow_statuses — single source of truth.
  const statusCategoryMap = useMemo(
    () => new Map<string, 'todo' | 'in_progress' | 'done'>(
      (brWorkflow?.statuses ?? []).map(s => [s.name, s.category as 'todo' | 'in_progress' | 'done']),
    ),
    [brWorkflow?.statuses],
  );

  const workItems: WorkItem[] = useMemo(
    () => (brs as BusinessRequest[]).map(r => {
      const processStep = (r as any).process_step as string | null | undefined;
      const label = processStep ?? '';
      return mapBrToWorkItem(r, profileMap, label, statusCategoryMap);
    }),
    [brs, profileMap, statusCategoryMap],
  );

  // ── Filter URL params (mirrors ProjectAllWorkView) ─────────────────────────
  const [searchParams, setSearchParams] = useSearchParams();
  const urlFilterId  = searchParams.get('filterId');
  const urlMode      = searchParams.get('mode');
  const isCreateMode = urlMode === 'create-filter';

  const { data: activeFilter } = useQuery({
    queryKey: ['product-active-filter-banner', urlFilterId],
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

  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [toolbarQuery, setToolbarQuery] = useState('');
  const [toolbarView, setToolbarView] = useState<AllWorkView>('split');
  const [toolbarFilters, setToolbarFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [toolbarAssignees, setToolbarAssignees] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(isCreateMode);

  const appliedFilterIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (activeFilter && activeFilter.id !== appliedFilterIdRef.current) {
      appliedFilterIdRef.current = activeFilter.id;
      if (activeFilter.jql_query) setToolbarFilters(jqlToFilterState(activeFilter.jql_query));
    }
  }, [activeFilter]);

  // Shift+F toggles filter popup
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

  // Client-side filter pass
  const filteredItems = useMemo(
    () => workItems.filter(i => itemPassesFilters(i, toolbarFilters)),
    [workItems, toolbarFilters],
  );

  const [overlayItemId, setOverlayItemId] = useState<string | null>(null);
  const splitRef = useRef<HTMLDivElement>(null);
  const [isNarrow, setIsNarrow] = useState(false);

  useEffect(() => {
    const el = splitRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width ?? 0;
      setIsNarrow(w > 0 && w < SPLIT_BREAKPOINT_PX);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { activeItem, selectItem } = useItemSelection(filteredItems, {
    urlParam: 'issue',
    autoSelectFirst: true,
  });

  const handleNavigate = useCallback((id: string) => { selectItem(id); }, [selectItem]);
  const handleOverlayNavigate = useCallback((id: string) => { setOverlayItemId(id); selectItem(id); }, [selectItem]);

  const navigationItems = useMemo(
    () => filteredItems.map(i => ({ id: i.id, summary: i.summary, issue_key: i.jiraKey })),
    [filteredItems],
  );

  const handleOpenItem = useCallback(
    makeOpenItemHandler(filteredItems, selectItem, setOverlayItemId),
    [filteredItems, selectItem],
  );

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden',
      background: 'var(--cp-bg-elevated, #ffffff)',
    }}>
      <ProjectPageHeader projectKey={productCode} hubType="product" />

      {/* Filter context banner */}
      {(activeFilter || isCreateMode) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--ds-background-information, #E9F2FF)', borderBottom: '1px solid var(--ds-border-information, #CCE0FF)', fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text-information, #0055CC)', flexShrink: 0 }}>
          {isCreateMode ? (
            <>
              <span style={{ fontWeight: 500 }}>Creating filter</span>
              <span style={{ color: 'var(--ds-text-subtle, #42526E)' }}>— set your filters below, then click Save filter</span>
            </>
          ) : activeFilter ? (
            <>
              <span>Filter:</span>
              <span style={{ fontWeight: 500 }}>{activeFilter.name}</span>
              <button onClick={() => { setToolbarFilters(EMPTY_FILTERS); setSearchParams({}); }} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtle, var(--ds-text-subtle, #42526E))', padding: '0 4px' }}>Clear filter</button>
            </>
          ) : null}
        </div>
      )}

      {/* Toolbar — reused directly from AllWorkToolbar, productCode as projectKey.
          facetOptionItems bypasses the ph_issues query so dropdown options are
          derived from the already-fetched business_requests instead. */}
      <AllWorkToolbar
        projectKey={productCode}
        query={toolbarQuery}
        onQueryChange={setToolbarQuery}
        view={toolbarView}
        onViewChange={setToolbarView}
        items={workItems}
        facetOptionItems={workItems}
        selectedFilters={toolbarFilters}
        onSelectedFiltersChange={setToolbarFilters}
        filterOpen={filterOpen}
        onFilterOpenChange={setFilterOpen}
        selectedAssignees={toolbarAssignees}
        onAssigneesChange={setToolbarAssignees}
        onSaveFilter={
          (isCreateMode || !!urlFilterId) ? () => setSaveModalOpen(true) : undefined
        }
        saveFilterLabel={urlFilterId ? 'Update filter' : 'Save filter'}
      />

      {saveModalOpen && (
        <FilterSaveModal
          filter={urlFilterId && activeFilter ? { id: activeFilter.id, name: activeFilter.name, jql_query: filterStateToJql(toolbarFilters, productCode) } as any : undefined}
          initialJql={!urlFilterId ? filterStateToJql(toolbarFilters, productCode) : undefined}
          hubScope="product"
          productKey={productCode}
          onClose={() => setSaveModalOpen(false)}
          onSaved={() => { setSaveModalOpen(false); if (isCreateMode) setSearchParams({}); }}
        />
      )}

      {/* Split region — mirrors ProjectAllWorkView 3-panel model */}
      <div ref={splitRef} style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden', gap: 8, padding: '0 0 8px 0' }}>
        {/* Left: navigator panel */}
        <div style={{
          width: isNarrow ? '100%' : 360, flexShrink: 0,
          background: 'var(--cp-bg-elevated, #ffffff)',
          borderRight: '1px solid var(--ds-border, #DFE1E6)',
          overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: 0,
        }}>
          <WorkListPanel
            items={filteredItems}
            selectedKey={activeItem?.id ?? null}
            onSelect={id => {
              if (isNarrow) setOverlayItemId(id);
              else selectItem(id);
            }}
            onKeyClick={id => {
              if (isNarrow) setOverlayItemId(id);
              else selectItem(id);
            }}
            externalQuery={toolbarQuery}
            disableAssigneePicker
          />
          {/* Footer count (mirrors ProjectAllWorkView pagination footer) */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 8px', borderTop: '1px solid var(--ds-border, #DFE1E6)',
            background: 'var(--cp-bg-sunken, #F6F7F8)', gap: 8, fontSize: 'var(--ds-font-size-200)',
            color: 'var(--cp-text-secondary, #6B778C)', flexShrink: 0,
          }}>
            <span data-testid="product-allwork-count">
              {filteredItems.length}{filteredItems.length >= 1000 ? '+' : ''} items
            </span>
            {brsLoading && <span style={{ color: 'var(--ds-text-subtlest, #626F86)' }}>Loading…</span>}
          </div>
        </div>

        {/* Right: detail panel */}
        {!isNarrow && (
          activeItem ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, background: 'var(--cp-bg-elevated, #ffffff)', borderRadius: '0 10px 10px 0', overflow: 'hidden' }}>
              <Suspense fallback={<div style={{ padding: 24, color: 'var(--cp-text-tertiary, #6B778C)', fontSize: 'var(--ds-font-size-400)' }}>Loading…</div>}>
                <CatalystDetailRouter
                  isOpen={true}
                  onClose={() => selectItem(null)}
                  itemId={activeItem.id}                          // request_key e.g. "MDT-740"
                  itemType={activeItem.rawType || activeItem.type} // 'Business Request' → resolves to 'business_request'
                  projectId={productId}
                  projectKey={productCode}
                  onOpenItem={handleOpenItem}
                  panelMode={true}
                  navigationItems={navigationItems}
                  onNavigate={handleNavigate}
                />
              </Suspense>
            </div>
          ) : (
            <div data-testid="product-allwork-empty-state" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '0 32px', fontFamily: 'var(--cp-font-body)' }}>
              <svg width="80" height="80" viewBox="0 0 80 80" fill="none" aria-hidden="true">
                <rect x="8" y="16" width="64" height="48" rx="6" fill="var(--ds-background-neutral, #F7F8F9)" stroke="var(--ds-border, #DFE1E6)" strokeWidth="1.5"/>
                <rect x="16" y="28" width="24" height="4" rx="2" fill="var(--ds-background-neutral-pressed, #C1C7D0)"/>
                <rect x="16" y="38" width="36" height="4" rx="2" fill="var(--ds-background-neutral-pressed, #C1C7D0)"/>
                <rect x="16" y="48" width="20" height="4" rx="2" fill="var(--ds-background-neutral-pressed, #C1C7D0)"/>
                <circle cx="56" cy="52" r="14" fill="var(--ds-background-information, #E9F2FF)" stroke="var(--ds-border-information, #CCE0FF)" strokeWidth="1.5"/>
                <path d="M56 46v6l4 2" stroke="var(--ds-icon-information, #1868DB)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <div style={{ textAlign: 'center' }}>
                <p style={{ margin: '0 0 8px', fontSize: 'var(--ds-font-size-500)', fontWeight: 600, color: 'var(--ds-text, #172B4D)', lineHeight: '20px' }}>Select a business request</p>
                <p style={{ margin: 0, fontSize: 'var(--ds-font-size-400)', fontWeight: 400, color: 'var(--ds-text-subtle, #44546F)', lineHeight: '20px', maxWidth: 280 }}>Choose a request from the list to view its details, comments, and related work.</p>
              </div>
            </div>
          )
        )}
      </div>

      {/* Narrow-mode overlay */}
      {overlayItemId && (
        <Suspense fallback={null}>
          <CatalystDetailRouter
            isOpen={true}
            onClose={() => setOverlayItemId(null)}
            itemId={overlayItemId}
            itemType="business_request"
            projectId={productId ?? ''}
            projectKey={productCode}
            onOpenItem={handleOpenItem}
            navigationItems={navigationItems}
            onNavigate={handleOverlayNavigate}
          />
        </Suspense>
      )}
    </div>
  );
}
