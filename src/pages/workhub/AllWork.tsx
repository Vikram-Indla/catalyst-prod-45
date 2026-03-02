/**
 * WorkHub "All Work" — Stage D: Fully wired to Supabase
 * ZERO hardcoded data. All reads/writes via workhubService → wh_ tables (with ph_issues fallback).
 */
import { useState, useCallback, useMemo, useEffect } from 'react';
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

type ViewMode = 'grid' | 'split';
type TabKey = 'all-work' | 'board' | 'timeline' | 'calendar' | 'backlog' | 'reports';

const DEFAULT_PAGE_SIZE = 25;

interface Filters {
  types?: string[];
  statuses?: string[];
  priorities?: string[];
  search?: string;
}

export default function AllWork() {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [activeTab, setActiveTab] = useState<TabKey>('all-work');
  const [filters, setFilters] = useState<Filters>({});
  const [pagination, setPagination] = useState({ page: 0, pageSize: DEFAULT_PAGE_SIZE });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedItemKey, setSelectedItemKey] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [sortField, setSortField] = useState<string>('updated_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const { data, isLoading, error, refetch, isFetching } = useAllWorkItems(
    undefined, // projectId
    filters,
    pagination,
    { field: sortField, dir: sortDir },
  );
  const items = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;
  const totalPages = data?.totalPages ?? 0;

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
        const el = document.getElementById('aw-search-input');
        if (el && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
          e.preventDefault();
          el.focus();
        }
      }
      if (e.key === 'Escape') {
        setSelectedItemKey(null);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleFilterChange = useCallback((newFilters: Filters) => {
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
  }, [items, selectedIds]);

  const handleSelectAll = useCallback(() => {
    if (selectAllState === 'all') setSelectedIds(new Set());
    else setSelectedIds(new Set(items.map((i: any) => i.item_key || i.issue_key)));
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
    items.forEach((i: any) => {
      const name = i.assignee_name || i.assignee_display_name;
      if (name) names.add(name);
    });
    return Array.from(names).slice(0, 5);
  }, [items]);

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
          <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'rgba(11,18,14,0.14)' }}>
            <div className="flex items-center gap-4 px-4" style={{ height: 40, backgroundColor: '#f8fafc', borderBottom: '0.56px solid rgba(11,18,14,0.14)' }}>
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-3 rounded" style={{ width: `${40 + i * 12}px` }} />)}
            </div>
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-4" style={{ height: 40, borderBottom: '0.56px solid rgba(11,18,14,0.08)' }}>
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-3.5 w-20 rounded" />
                <Skeleton className="h-3.5 rounded flex-1" />
                <Skeleton className="h-5 w-16 rounded" />
                <Skeleton className="h-5 w-14 rounded" />
                <Skeleton className="h-4 w-4 rounded-full" />
              </div>
            ))}
          </div>
        ) : error ? (
          <AllWorkEmptyState type="error" message={(error as Error).message} onRetry={() => refetch()} />
        ) : items.length === 0 ? (
          filters.search ? (
            <AllWorkEmptyState type="no-results" query={filters.search} onClear={() => handleFilterChange({})} />
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
          totalCount={items.length}
          onSelectAll={handleSelectAll}
          onClear={() => setSelectedIds(new Set())}
          onDone={() => { setSelectedIds(new Set()); refetch(); }}
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
