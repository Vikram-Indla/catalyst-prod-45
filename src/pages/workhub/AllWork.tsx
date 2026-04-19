/**
 * @deprecated 2026-04-19 — DO NOT EDIT. Superseded by
 *   src/pages/project-hub/jira-list/ProjectAllWorkView.tsx, which is the
 *   canonical "All Work" surface at /project-hub/:key/allwork.
 *
 * This file is still wired to the legacy /workhub/all-work route but is
 * a dead-end: bugs, UX copy, dark-mode, and Jira-parity fixes should land
 * in ProjectAllWorkView (left list: WorkListPanel; detail: CatalystDetailRouter
 * → StoryDetailModal). Remove this file + its route when the legacy
 * /workhub/all-work URL is retired.
 *
 * WorkHub "All Work" — Stage E: QA & Polish (GOD-TIER)
 * Full Supabase wiring, design-system compliant, all edge cases handled.
 */
import { useState, useCallback, useMemo, useEffect, memo } from 'react';
import { useAllWorkItems } from '@/hooks/workhub/useAllWork';
import { AllWorkHeader } from '@/components/workhub/allwork/AllWorkHeader';
import { AllWorkToolbar } from '@/components/workhub/allwork/AllWorkToolbar';
import { AllWorkTable } from '@/components/workhub/allwork/AllWorkTable';
import { AllWorkSplitView } from '@/components/workhub/allwork/AllWorkSplitView';
import { AllWorkPagination } from '@/components/workhub/allwork/AllWorkPagination';
import { AllWorkBulkBar } from '@/components/workhub/allwork/AllWorkBulkBar';
import { AllWorkCreateModal } from '@/components/workhub/allwork/modals/AllWorkCreateModal';
import { AllWorkEmptyState } from '@/components/workhub/allwork/AllWorkEmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { normalizeWorkItem } from '@/types/allwork.types';

type ViewMode = 'grid' | 'split';
type TabKey = 'all-work' | 'board' | 'timeline' | 'calendar' | 'backlog' | 'reports';

const DEFAULT_PAGE_SIZE = 25;

export interface AllWorkFilters {
  types?: string[];
  statuses?: string[];
  priorities?: string[];
  search?: string;
}

export default function AllWork() {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [activeTab, setActiveTab] = useState<TabKey>('all-work');
  const [filters, setFilters] = useState<AllWorkFilters>({});
  const [pagination, setPagination] = useState({ page: 0, pageSize: DEFAULT_PAGE_SIZE });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedItemKey, setSelectedItemKey] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [sortField, setSortField] = useState<string>('updated_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const { data, isLoading, error, refetch, isFetching } = useAllWorkItems(
    undefined,
    filters,
    pagination,
    { field: sortField, dir: sortDir },
  );
  const items = useMemo(() => (data?.items ?? []).map(normalizeWorkItem), [data?.items]);
  const totalCount = data?.totalCount ?? 0;
  const totalPages = data?.totalPages ?? 0;

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
        const active = document.activeElement;
        if (active?.tagName !== 'INPUT' && active?.tagName !== 'TEXTAREA') {
          e.preventDefault();
          document.getElementById('aw-search-input')?.focus();
        }
      }
      if (e.key === 'Escape') {
        setSelectedItemKey(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleFilterChange = useCallback((newFilters: AllWorkFilters) => {
    setFilters(newFilters);
    setPagination(prev => ({ ...prev, page: 0 }));
    setSelectedIds(new Set());
  }, []);

  const handleSearch = useCallback((q: string) => {
    setFilters(prev => ({ ...prev, search: q || undefined }));
    setPagination(prev => ({ ...prev, page: 0 }));
  }, []);

  const toggleSelect = useCallback((key: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }, []);

  const selectAllState = useMemo((): 'none' | 'some' | 'all' => {
    if (selectedIds.size === 0) return 'none';
    if (selectedIds.size === items.length) return 'all';
    return 'some';
  }, [items.length, selectedIds.size]);

  const handleSelectAll = useCallback(() => {
    if (selectAllState === 'all') setSelectedIds(new Set());
    else setSelectedIds(new Set(items.map(i => i.issue_key)));
  }, [items, selectAllState]);

  const goToPage = useCallback((page: number) => {
    setPagination(prev => ({ ...prev, page }));
    setSelectedIds(new Set());
  }, []);

  const handlePageSize = useCallback((size: number) => {
    setPagination({ page: 0, pageSize: size });
    setSelectedIds(new Set());
  }, []);

  const uniqueAssignees = useMemo(() => {
    const names = new Set<string>();
    items.forEach(i => { if (i.assignee_display_name) names.add(i.assignee_display_name); });
    return Array.from(names).slice(0, 5);
  }, [items]);

  const hasActiveFilters = !!(filters.types?.length || filters.statuses?.length || filters.priorities?.length);

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <AllWorkHeader
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onCreateClick={() => setShowCreateModal(true)}
      />

      <AllWorkToolbar
        filters={filters}
        onFilterChange={handleFilterChange}
        onSearch={handleSearch}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        totalCount={totalCount}
        isFetching={isFetching}
        uniqueAssignees={uniqueAssignees}
      />

      <div className="flex-1 min-h-0 px-8 pb-4">
        {isLoading ? (
          <TableSkeleton />
        ) : error ? (
          <AllWorkEmptyState type="error" message={(error as Error).message} onRetry={() => refetch()} />
        ) : items.length === 0 ? (
          filters.search ? (
            <AllWorkEmptyState type="no-results" query={filters.search} onClear={() => handleFilterChange({})} />
          ) : hasActiveFilters ? (
            <AllWorkEmptyState type="no-filters" onClear={() => handleFilterChange({})} />
          ) : (
            <AllWorkEmptyState type="no-items" onAction={() => setShowCreateModal(true)} />
          )
        ) : viewMode === 'grid' ? (
          <AllWorkTable
            items={items}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onSelectAll={handleSelectAll}
            selectAllState={selectAllState}
            onOpenItem={setSelectedItemKey}
            sortField={sortField}
            sortDir={sortDir}
            onSort={(f) => {
              if (f === sortField) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
              else { setSortField(f); setSortDir('desc'); }
            }}
          />
        ) : (
          <AllWorkSplitView
            items={items}
            selectedItemKey={selectedItemKey}
            onSelectItem={setSelectedItemKey}
            sortField={sortField}
            sortDir={sortDir}
            onSort={(f) => {
              if (f === sortField) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
              else { setSortField(f); setSortDir('desc'); }
            }}
          />
        )}
      </div>

      {totalCount > 0 && !isLoading && (
        <AllWorkPagination
          currentPage={pagination.page}
          totalPages={totalPages}
          totalCount={totalCount}
          pageSize={pagination.pageSize}
          onPageChange={goToPage}
          onPageSizeChange={handlePageSize}
        />
      )}

      {selectedIds.size > 0 && (
        <AllWorkBulkBar
          selectedIds={Array.from(selectedIds)}
          items={items}
          totalCount={items.length}
          onSelectAll={handleSelectAll}
          onClear={() => setSelectedIds(new Set())}
          onDone={() => { setSelectedIds(new Set()); refetch(); }}
          onEdit={(ids) => {
            const firstKey = ids[0];
            const item = items.find(i => i.id === firstKey || i.issue_key === firstKey);
            if (item) setSelectedItemKey(item.issue_key);
          }}
        />
      )}

      {showCreateModal && (
        <AllWorkCreateModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => { refetch(); }}
        />
      )}
    </div>
  );
}

/** 12-row skeleton matching 44px row height */
const TableSkeleton = memo(function TableSkeleton() {
  return (
    <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'rgba(15,23,42,0.12)' }}>
      <div
        className="flex items-center gap-4 px-4"
        style={{ height: 44, backgroundColor: 'var(--bg-1)', borderBottom: '1px solid rgba(15,23,42,0.08)' }}
      >
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-3 rounded" style={{ width: `${40 + i * 14}px` }} />
        ))}
      </div>
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-4"
          style={{ height: 44, borderBottom: '1px solid rgba(15,23,42,0.06)' }}
        >
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-3.5 w-20 rounded" />
          <Skeleton className="h-3.5 rounded flex-1" />
          <Skeleton className="h-5 w-16 rounded-sm" />
          <Skeleton className="h-3.5 w-20 rounded" />
          <Skeleton className="h-5 w-14 rounded-sm" />
          <Skeleton className="h-3 w-10 rounded" />
          <Skeleton className="h-3 w-16 rounded" />
          <Skeleton className="h-5 w-5 rounded-full" />
        </div>
      ))}
    </div>
  );
});
