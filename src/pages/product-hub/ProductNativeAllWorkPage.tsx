/**
 * ProductNativeAllWorkPage — /product-hub/:key/allwork
 *
 * Native product-hub clone of ProjectAllWorkView.
 * Layout, toolbar, pagination, keyboard nav, saved-filter flow are identical.
 * Three things change from the project-hub version:
 *   1. Data source  — business_requests (via useBusinessRequestsByProduct)
 *   2. Statuses     — demand_process_steps (product statuses)
 *   3. Work item types — request_type (feature / gap / integration / data_request)
 *
 * BRs are mapped to WorkItem so WorkListPanel and AllWorkToolbar reuse unchanged.
 * CatalystDetailRouter receives itemType='business_request' (hardcoded).
 */
import React, {
  lazy, Suspense, useState, useCallback, useRef, useEffect, useMemo,
} from 'react';
import Button from '@atlaskit/button/new';
import Select from '@atlaskit/select';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { token } from '@atlaskit/tokens';
import { supabase } from '@/integrations/supabase/client';
import { WorkListPanel } from '@/pages/project-hub/jira-list/components/WorkListPanel';
import { useItemSelection } from '@/hooks/useItemSelection';
import {
  AllWorkToolbar,
  EMPTY_FILTERS,
  itemPassesFilters,
  type AllWorkView,
  type FilterState,
} from '@/pages/project-hub/jira-list/components/AllWorkToolbar';
import { FilterSaveModal } from '@/components/filters/FilterSaveModal';
import { jqlToFilterState } from '@/lib/jql/jqlToFilterState';
import { filterStateToJql } from '@/lib/filters/filterStateToJql';
import {
  useBusinessRequestsByProduct,
} from '@/hooks/useBusinessRequests';
import {
  useActiveDemandProcessSteps,
  stepToLozengeAppearance,
  type DemandProcessStep,
} from '@/hooks/useDemandProcessSteps';
import type { WorkItem, WorkItemType, WorkItemPriority } from '@/types/workItem.types';
import type { BusinessRequest } from '@/types/business-request';

const CatalystDetailRouter = lazy(
  () => import('@/components/catalyst-detail-views/CatalystDetailRouter'),
);

// ─── Product info hook ────────────────────────────────────────────────────────

interface ProductInfo { id: string; name: string; code: string; }

function useProductInfo(key: string | undefined) {
  const [product, setProduct] = useState<ProductInfo | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!key) { setLoading(false); return; }
    (async () => {
      setLoading(true);
      const { data } = await (supabase as any)
        .from('products').select('id, name, code')
        .eq('code', key.toUpperCase()).eq('is_active', true).maybeSingle();
      setProduct(data ?? null);
      setLoading(false);
    })();
  }, [key]);
  return { product, loading };
}

// ─── Profile names hook ───────────────────────────────────────────────────────

function useProfileNames(rows: BusinessRequest[]) {
  const [names, setNames] = useState<Record<string, string>>({});
  useEffect(() => {
    const ids = new Set<string>();
    rows.forEach(r => {
      if ((r as any).project_manager_user_id) ids.add((r as any).project_manager_user_id);
      if ((r as any).po_user_id) ids.add((r as any).po_user_id);
    });
    if (!ids.size) return;
    (async () => {
      const { data } = await supabase.from('profiles').select('id, full_name').in('id', Array.from(ids));
      if (data) {
        const map: Record<string, string> = {};
        data.forEach((p: any) => { map[p.id] = p.full_name || '—'; });
        setNames(map);
      }
    })();
  }, [rows]);
  return names;
}

// ─── BR → WorkItem mapping ────────────────────────────────────────────────────
//
// Icon rule: every business_request row renders the CANONICAL Business Request
// icon (amber lightbulb, iconFile: 'business-request' in jira-issue-type-icons.tsx).
// The request_type field (feature/gap/integration/data_request) is a sub-
// classification displayed elsewhere — it does NOT change the entity icon.
// WorkListPanel reads `rawType || type` → JiraIssueTypeIcon, which fuzzy-matches
// "business request" to the canonical config.

const URGENCY_TO_PRIORITY: Record<string, WorkItemPriority> = {
  high:   'high',
  normal: 'medium',
  low:    'low',
};

function stepAppearanceToCategory(
  appearance: ReturnType<typeof stepToLozengeAppearance>,
): 'todo' | 'in_progress' | 'done' {
  if (appearance === 'success') return 'done';
  if (appearance === 'inprogress' || appearance === 'moved') return 'in_progress';
  return 'todo';
}

function mapBrToWorkItem(
  br: BusinessRequest,
  stepMap: Map<string, DemandProcessStep>,
  profileNames: Record<string, string>,
): WorkItem {
  const processStep  = (br as any).process_step  ?? '';
  const urgency      = (br as any).urgency        ?? 'normal';
  const pmId         = (br as any).project_manager_user_id ?? null;
  const pmName       = pmId ? (profileNames[pmId] ?? null) : null;

  const step        = stepMap.get(processStep);
  const stepLabel   = step?.label
    ?? (processStep ? processStep.replace(/_/g, ' ').replace(/^\w/, (c: string) => c.toUpperCase()) : 'No status');
  const appearance  = step ? stepToLozengeAppearance(step) : 'default';

  return {
    id:             (br as any).request_key ?? (br as any).id,
    dbId:           (br as any).id,
    projectId:      (br as any).product_id ?? '',
    parentId:       null,
    parentKey:      null,
    jiraKey:        (br as any).request_key ?? '',
    // WorkItemType enum doesn't include 'business_request'; 'feature' is the
    // closest existing key. Icon rendering reads rawType FIRST, so this only
    // matters as a fallback if rawType is dropped somewhere.
    type:           'feature' as WorkItemType,
    // CANONICAL: every BR row is a "Business Request" entity → amber lightbulb.
    // JiraIssueTypeIcon's fuzzy resolver matches this exact string to
    // CONFIGS['business request'] (color #FFAB00, iconFile 'business-request').
    rawType:        'Business Request',
    summary:        br.title ?? '',
    status:         'backlog',
    statusName:     stepLabel,
    statusCategory: stepAppearanceToCategory(appearance),
    assigneeId:     pmId,
    assignee: pmId && pmName ? {
      id:        pmId,
      name:      pmName,
      avatarUrl: null,
      initials:  pmName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2),
      color:     'var(--ds-background-accent-blue-subtle, #2684FF)',
    } : undefined,
    reporterId: (br as any).po_user_id ?? null,
    reporter:   (br as any).po_user_id && profileNames[(br as any).po_user_id]
      ? { id: (br as any).po_user_id, name: profileNames[(br as any).po_user_id] }
      : undefined,
    priority:       (URGENCY_TO_PRIORITY[urgency] ?? 'medium') as WorkItemPriority,
    fixVersion:     null,
    commentsCount:  0,
    childCount:     0,
    createdAt:      (br as any).created_at ?? '',
    updatedAt:      (br as any).updated_at ?? '',
    createdBy:      null,
  };
}

// ─── Layout constant (mirrors ProjectAllWorkView) ─────────────────────────────

const SPLIT_BREAKPOINT_PX = 1120;
const DEFAULT_ROWS_PER_PAGE = 50;

// ─── Product chrome band (product header — replaces ProjectHeaderChip) ────────

function ProductChromeBand({ product }: { product: ProductInfo | null }) {
  if (!product) return null;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '8px 12px', borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`,
      background: token('color.elevation.surface', '#FFFFFF'), flexShrink: 0,
    }}>
      <div style={{
        width: 24, height: 24, borderRadius: 4, flexShrink: 0,
        background: token('color.background.brand.bold', '#0052CC'),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 700, color: token('color.text.inverse', '#FFFFFF'),
      }}>
        {product.code.slice(0, 2)}
      </div>
      <span style={{
        fontSize: 14, fontWeight: 500,
        color: token('color.text', '#172B4D'),
        fontFamily: 'var(--cp-font-body)',
      }}>
        {product.name}
      </span>
      <span style={{
        fontSize: 11, color: token('color.text.subtlest', '#626F86'),
        fontFamily: 'var(--cp-font-mono)', marginLeft: 2,
      }}>
        {product.code}
      </span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProductNativeAllWorkPage() {
  const { key } = useParams<{ key: string }>();
  const { product, loading: productLoading } = useProductInfo(key);
  const { data: brRows = [], isLoading: rowsLoading } = useBusinessRequestsByProduct(
    product?.id ?? null,
  );
  const { data: processSteps = [] } = useActiveDemandProcessSteps();
  const profileNames = useProfileNames(brRows as BusinessRequest[]);

  const stepMap = useMemo(
    () => new Map(processSteps.map(s => [s.value, s])),
    [processSteps],
  );

  // Map all BRs → WorkItem once profiles + steps are ready
  const allItems = useMemo(
    () => (brRows as BusinessRequest[]).map(br => mapBrToWorkItem(br, stepMap, profileNames)),
    [brRows, stepMap, profileNames],
  );

  // ── Filter URL params (mirrors ProjectAllWorkView) ──────────────────────────
  const [searchParams, setSearchParams] = useSearchParams();
  const urlFilterId  = searchParams.get('filterId');
  const urlMode      = searchParams.get('mode');
  const isCreateMode = urlMode === 'create-filter';

  const { data: activeFilter } = useQuery({
    queryKey: ['active-filter-banner-product', urlFilterId],
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

  // ── Toolbar state ───────────────────────────────────────────────────────────
  const [toolbarQuery,   setToolbarQuery]   = useState('');
  const [toolbarView,    setToolbarView]    = useState<AllWorkView>('split');
  const [toolbarFilters, setToolbarFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [toolbarAssignees, setToolbarAssignees] = useState<string[]>([]);
  const [filterOpen, setFilterOpen] = useState(isCreateMode);

  // Apply saved filter on load
  const appliedFilterIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (activeFilter && activeFilter.id !== appliedFilterIdRef.current) {
      appliedFilterIdRef.current = activeFilter.id;
      if (activeFilter.jql_query) {
        setToolbarFilters(jqlToFilterState(activeFilter.jql_query));
      }
    }
  }, [activeFilter]);

  // Shift+F toggles filter popup (mirrors project hub)
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

  // ── Client-side filter pass ─────────────────────────────────────────────────
  const filteredItems = useMemo(() => {
    return allItems.filter(i => itemPassesFilters(i, toolbarFilters));
  }, [allItems, toolbarFilters]);

  // ── Client-side pagination ──────────────────────────────────────────────────
  const [pageOffset, setPageOffset]   = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_ROWS_PER_PAGE);

  // Reset page when filters change
  useEffect(() => { setPageOffset(0); }, [toolbarFilters, toolbarQuery]);

  const pagedItems = useMemo(
    () => filteredItems.slice(pageOffset, pageOffset + rowsPerPage),
    [filteredItems, pageOffset, rowsPerPage],
  );
  const hasNextPage = pageOffset + rowsPerPage < filteredItems.length;
  const hasPrevPage = pageOffset > 0;
  const fetchNextPage = useCallback(() => setPageOffset(p => p + rowsPerPage), [rowsPerPage]);
  const fetchPrevPage = useCallback(() => setPageOffset(p => Math.max(0, p - rowsPerPage)), [rowsPerPage]);

  // ── Narrow-mode overlay ─────────────────────────────────────────────────────
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

  // ── Selection (url param 'br' to avoid collision with project ?issue=) ──────
  const { activeItem, selectItem } = useItemSelection(pagedItems, {
    urlParam: 'br',
    autoSelectFirst: true,
  });

  const handleNavigate = useCallback((id: string) => { selectItem(id); }, [selectItem]);

  const handleOverlayNavigate = useCallback((id: string) => {
    setOverlayItemId(id);
    selectItem(id);
  }, [selectItem]);

  const navigationItems = useMemo(
    () => pagedItems.map(i => ({ id: i.id, summary: i.summary, issue_key: i.jiraKey })),
    [pagedItems],
  );

  // BRs have no subtasks/parent links — open handler is a no-op for out-of-list items
  const handleOpenItem = useCallback((id: string) => {
    const inList = pagedItems.find(i => i.id === id || i.dbId === id);
    if (inList) {
      selectItem(inList.id);
    } else {
      setOverlayItemId(id);
    }
  }, [pagedItems, selectItem]);

  // ── Loading / not-found guards ──────────────────────────────────────────────
  if (productLoading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100%', padding: 48,
        color: token('color.text.subtlest', '#626F86'),
        fontFamily: 'var(--cp-font-body)',
      }}>
        Loading product…
      </div>
    );
  }
  if (!product && key) {
    return (
      <div style={{
        padding: 48, textAlign: 'center',
        color: token('color.text.subtlest', '#626F86'),
        fontFamily: 'var(--cp-font-body)',
      }}>
        Product <strong>{key}</strong> not found.{' '}
        <a href="/product-hub/products" style={{ color: token('color.link', '#0052CC') }}>
          ← Back to products
        </a>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0,
      overflow: 'hidden',
      background: 'var(--cp-bg-elevated, #ffffff)',
    }}>
      {/* Product header (replaces ProjectHeaderChip) */}
      <ProductChromeBand product={product} />

      {/* Filter context banner — identical to project hub */}
      {(activeFilter || isCreateMode) && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
          background: 'var(--ds-background-information, #E9F2FF)',
          borderBottom: '1px solid var(--ds-border-information, #CCE0FF)',
          fontSize: 13, color: 'var(--ds-text-information, #0055CC)', flexShrink: 0,
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
                onClick={() => { setToolbarFilters(EMPTY_FILTERS); setSearchParams({}); }}
                style={{
                  marginLeft: 'auto', background: 'none', border: 'none',
                  cursor: 'pointer', fontSize: 12,
                  color: 'var(--ds-text-subtle, #42526E)', padding: '0 4px',
                }}
              >
                Clear filter
              </button>
            </>
          ) : null}
        </div>
      )}

      {/* Toolbar — same component as project hub; derives options from mapped WorkItems */}
      <AllWorkToolbar
        projectKey={key ?? ''}
        query={toolbarQuery}
        onQueryChange={setToolbarQuery}
        view={toolbarView}
        onViewChange={setToolbarView}
        items={allItems}
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

      {/* Save filter modal */}
      {saveModalOpen && (
        <FilterSaveModal
          filter={urlFilterId && activeFilter ? {
            id: activeFilter.id,
            name: activeFilter.name,
            jql_query: filterStateToJql(toolbarFilters, key ?? ''),
          } as any : undefined}
          initialJql={!urlFilterId ? filterStateToJql(toolbarFilters, key ?? '') : undefined}
          hubScope="product"
          onClose={() => setSaveModalOpen(false)}
          onSaved={() => {
            setSaveModalOpen(false);
            if (isCreateMode) setSearchParams({});
          }}
        />
      )}

      {/* Split region — identical layout to ProjectAllWorkView */}
      <div ref={splitRef} style={{
        flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden',
        gap: 8, padding: '0 0 8px 0',
      }}>
        {/* Left navigator panel */}
        <div style={{
          width: isNarrow ? '100%' : 360, flexShrink: 0,
          background: 'var(--cp-bg-elevated, #ffffff)',
          borderRight: '1px solid var(--ds-border, #DFE1E6)',
          borderRadius: 0, overflow: 'hidden',
          display: 'flex', flexDirection: 'column', padding: 0,
        }}>
          <WorkListPanel
            items={pagedItems}
            selectedKey={activeItem?.id ?? null}
            onSelect={id => {
              if (isNarrow) { setOverlayItemId(id); } else { selectItem(id); }
            }}
            onKeyClick={id => {
              if (isNarrow) { setOverlayItemId(id); } else { selectItem(id); }
            }}
            externalQuery={toolbarQuery}
          />

          {/* Pagination footer — identical to project hub */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 8px',
            borderTop: '1px solid var(--ds-border, #DFE1E6)',
            background: 'var(--cp-bg-sunken, #F6F7F8)',
            gap: 8,
            // ads-scanner:ignore-next-line
            fontSize: 12,
            color: 'var(--ds-text-subtle, #6B778C)',
          }}>
            <div style={{ display: 'flex', gap: 4 }}>
              <Button
                appearance="subtle" size="small"
                isDisabled={!hasPrevPage} onClick={fetchPrevPage}
                aria-label="Previous page"
              >
                Previous
              </Button>
              <Button
                appearance="subtle" size="small"
                isDisabled={!hasNextPage} onClick={fetchNextPage}
                aria-label="Next page"
              >
                Next
              </Button>
            </div>
            <span data-testid="allwork-product-pagination-count" style={{
              // ads-scanner:ignore-next-line
              fontSize: 12, color: 'var(--ds-text-subtle, #6B778C)',
              fontFamily: 'var(--cp-font-body)', whiteSpace: 'nowrap', flexShrink: 0,
            }}>
              {pagedItems.length}{hasNextPage ? '+' : ''} items
            </span>
            <Select
              options={[
                { label: '25', value: 25 },
                { label: '50', value: 50 },
                { label: '100', value: 100 },
              ]}
              value={{ label: String(rowsPerPage), value: rowsPerPage }}
              onChange={option => {
                if (option && 'value' in option) { setRowsPerPage(option.value); setPageOffset(0); }
              }}
              isSearchable={false} isClearable={false} isMulti={false}
              styles={{
                control: (base: any) => ({
                  ...base, minHeight: 28,
                  // ads-scanner:ignore-next-line
                  fontSize: 12,
                }),
              }}
              aria-label="Rows per page"
            />
          </div>
        </div>

        {/* Right detail panel — hidden in narrow mode */}
        {!isNarrow && (
          activeItem ? (
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0,
              background: 'var(--cp-bg-elevated, #ffffff)',
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
                  itemId={activeItem.id}
                  // Hardcode 'business_request' — rawType is request_type display name
                  // (used for workType filter), not a CatalystDetailRouter routing signal.
                  itemType="business_request"
                  projectId={product?.id}
                  projectKey={key ?? ''}
                  onOpenItem={handleOpenItem}
                  panelMode={true}
                  navigationItems={navigationItems}
                  onNavigate={handleNavigate}
                />
              </Suspense>
            </div>
          ) : (
            /* Empty state — mirrors project hub */
            <div
              data-testid="allwork-product-empty-state"
              style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 12, padding: '0 32px',
                fontFamily: 'var(--cp-font-body)',
              }}
            >
              <svg width="80" height="80" viewBox="0 0 80 80" fill="none" aria-hidden="true">
                <rect x="8" y="16" width="64" height="48" rx="6"
                  fill="var(--ds-background-neutral, #F7F8F9)"
                  stroke="var(--ds-border, #DFE1E6)" strokeWidth="1.5" />
                <rect x="16" y="28" width="24" height="4" rx="2"
                  fill="var(--ds-background-neutral-pressed, #C1C7D0)" />
                <rect x="16" y="38" width="36" height="4" rx="2"
                  fill="var(--ds-background-neutral-pressed, #C1C7D0)" />
                <rect x="16" y="48" width="20" height="4" rx="2"
                  fill="var(--ds-background-neutral-pressed, #C1C7D0)" />
                <circle cx="56" cy="52" r="14"
                  fill="var(--ds-background-information, #E9F2FF)"
                  stroke="var(--ds-border-information, #CCE0FF)" strokeWidth="1.5" />
                <path d="M56 46v6l4 2" stroke="var(--ds-icon-information, #1868DB)"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div style={{ textAlign: 'center' }}>
                <p style={{
                  margin: '0 0 8px', fontSize: 16, fontWeight: 600,
                  color: 'var(--ds-text, #172B4D)', lineHeight: '20px',
                }}>
                  Select a request
                </p>
                <p data-testid="allwork-product-empty-state-subtitle" style={{
                  margin: 0, fontSize: 14, fontWeight: 400,
                  color: 'var(--ds-text-subtle, #44546F)',
                  lineHeight: '20px', maxWidth: 280,
                }}>
                  Choose a request from the list to view its details, comments, and related work.
                </p>
              </div>
            </div>
          )
        )}
      </div>

      {/* Narrow-mode overlay — full-screen BR detail */}
      {overlayItemId && (
        <Suspense fallback={null}>
          <CatalystDetailRouter
            isOpen={true}
            onClose={() => setOverlayItemId(null)}
            itemId={overlayItemId}
            itemType="business_request"
            projectId={product?.id ?? ''}
            projectKey={key ?? ''}
            onOpenItem={handleOpenItem}
            navigationItems={navigationItems}
            onNavigate={handleOverlayNavigate}
          />
        </Suspense>
      )}
    </div>
  );
}
