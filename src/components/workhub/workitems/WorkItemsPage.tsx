/**
 * WorkItemsPage — Full page reading from wh_issues (real Jira data)
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { FileStack, RefreshCw, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useWorkItems } from '@/hooks/workhub/useWorkItems';
import type { WorkItemFilterConfig, PaginationConfig, JiraIssue } from '@/hooks/workhub/useWorkItems';
import { WorkItemFilters } from './WorkItemFilters';
import { WorkItemsTable } from './WorkItemsTable';
import { BulkEditBar } from './BulkEditBar';
import { WorkItemDrawer } from './WorkItemDrawer';

const PAGE_SIZE = 50;

export function WorkItemsPage() {
  const [filters, setFilters] = useState<Partial<WorkItemFilterConfig>>({});
  const [pagination, setPagination] = useState<PaginationConfig>({ page: 0, pageSize: PAGE_SIZE });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [drawerItem, setDrawerItem] = useState<JiraIssue | null>(null);

  // Reset page when filters change
  const handleFilterChange = useCallback((newFilters: Partial<WorkItemFilterConfig>) => {
    setFilters(newFilters);
    setPagination(prev => ({ ...prev, page: 0 }));
    setSelectedIds(new Set());
  }, []);

  const { data, isLoading, error, refetch, isFetching } = useWorkItems(filters, pagination);

  const items = Array.isArray(data?.items) ? data.items : [];
  const totalCount = typeof data?.totalCount === 'number' ? data.totalCount : 0;
  const totalPages = typeof data?.totalPages === 'number' ? data.totalPages : 0;
  const currentPage = pagination.page;

  const uniqueProjects = useMemo(() => {
    if (!Array.isArray(items)) return 0;
    return new Set(items.map(i => i.project_key).filter(Boolean)).size;
  }, [items]);

  const toggleSelect = useCallback((key: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const selectAllState = useMemo((): 'none' | 'some' | 'all' => {
    if (selectedIds.size === 0) return 'none';
    if (selectedIds.size === items.length) return 'all';
    return 'some';
  }, [items, selectedIds]);

  const handleSelectAll = useCallback(() => {
    if (selectAllState === 'all') {
      setSelectedIds(new Set());
    } else if (Array.isArray(items)) {
      setSelectedIds(new Set(items.map(i => i.issue_key)));
    }
  }, [items, selectAllState]);

  const goToPage = (page: number) => {
    setPagination(prev => ({ ...prev, page }));
    setSelectedIds(new Set());
  };

  const pageStart = currentPage * PAGE_SIZE + 1;
  const pageEnd = Math.min((currentPage + 1) * PAGE_SIZE, totalCount);

  return (
    <div style={{ fontFamily: 'var(--wh-font-sans)', overflow: 'hidden' }}>
      {/* Page Header */}
      <header className="flex flex-col sm:flex-row items-start justify-between mb-6 gap-3">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: '#dbeafe' }}>
            <FileStack className="w-5 h-5" style={{ color: 'var(--wh-primary, #2563eb)' }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--wh-font-display)', color: 'var(--wh-text-primary, #0f172a)' }}>
              Work Items
            </h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--wh-text-secondary, #64748b)' }}>
              Jira-synced issues — {totalCount.toLocaleString()} items across {uniqueProjects} projects
              {isFetching && !isLoading && (
                <span className="ml-2 inline-flex items-center gap-1 text-xs" style={{ color: 'var(--wh-primary, #2563eb)' }}>
                  <Loader2 className="w-3 h-3 animate-spin" /> updating...
                </span>
              )}
            </p>
          </div>
        </div>

        <button
          onClick={() => refetch()}
          className="px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5"
          style={{ borderColor: 'var(--wh-primary, #2563eb)', color: 'var(--wh-primary, #2563eb)' }}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </header>

      {/* Filters */}
      <div className="mb-4">
        <WorkItemFilters filters={filters} onChange={handleFilterChange} />
      </div>

      {/* Bulk Edit Bar */}
      {selectedIds.size > 0 && (
        <div className="mb-3">
          <BulkEditBar
            selectedCount={selectedIds.size}
            selectedIds={Array.from(selectedIds)}
            onClear={() => setSelectedIds(new Set())}
          />
        </div>
      )}

      {/* Table */}
      <WorkItemsTable
        items={items}
        isLoading={isLoading}
        error={error as Error | null}
        selectedIds={selectedIds}
        onToggleSelect={toggleSelect}
        onSelectAll={handleSelectAll}
        selectAllState={selectAllState}
        onOpenDrawer={(key) => {
          const found = items.find(i => i.issue_key === key);
          if (found) setDrawerItem(found);
        }}
        onRetry={() => refetch()}
      />

      {/* Pagination Controls */}
      {totalCount > PAGE_SIZE && (
        <div
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-3 px-4 py-2.5 rounded-lg border gap-2"
          style={{ backgroundColor: 'var(--wh-surface, #fff)', borderColor: 'var(--wh-border, #e2e8f0)' }}
        >
          <span className="text-xs" style={{ color: 'var(--wh-text-tertiary, #94a3b8)' }}>
            Showing <b style={{ color: 'var(--wh-text-primary, #0f172a)' }}>{pageStart}–{pageEnd}</b> of{' '}
            <b style={{ color: 'var(--wh-text-primary, #0f172a)' }}>{totalCount.toLocaleString()}</b> items
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 0}
              className="p-1.5 rounded-md border disabled:opacity-30 transition-colors"
              style={{ borderColor: 'var(--wh-border, #e2e8f0)' }}
            >
              <ChevronLeft className="w-3.5 h-3.5" style={{ color: 'var(--wh-text-secondary, #64748b)' }} />
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => {
              let pageNum: number;
              if (totalPages <= 7) pageNum = i;
              else if (currentPage < 3) pageNum = i;
              else if (currentPage > totalPages - 4) pageNum = totalPages - 7 + i;
              else pageNum = currentPage - 3 + i;
              return (
                <button
                  key={pageNum}
                  onClick={() => goToPage(pageNum)}
                  className="w-7 h-7 rounded-md text-xs font-medium transition-colors"
                  style={{
                    backgroundColor: pageNum === currentPage ? 'var(--wh-primary, #2563eb)' : 'transparent',
                    color: pageNum === currentPage ? 'white' : 'var(--wh-text-secondary, #64748b)',
                  }}
                >
                  {pageNum + 1}
                </button>
              );
            })}
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage >= totalPages - 1}
              className="p-1.5 rounded-md border disabled:opacity-30 transition-colors"
              style={{ borderColor: 'var(--wh-border, #e2e8f0)' }}
            >
              <ChevronRight className="w-3.5 h-3.5" style={{ color: 'var(--wh-text-secondary, #64748b)' }} />
            </button>
          </div>
        </div>
      )}

      {/* Drawer */}
      <WorkItemDrawer item={drawerItem} onClose={() => setDrawerItem(null)} />
    </div>
  );
}
