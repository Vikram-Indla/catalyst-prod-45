/**
 * WorkItemsPage — Full page orchestration
 * Server-side pagination + virtualized table + project filters
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { FileStack, RefreshCw, Loader2, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useWorkItems } from '@/hooks/workhub/useWorkItems';
import type { WorkItemFilterConfig, PaginationConfig } from '@/hooks/workhub/useWorkItems';
import type { WorkItemFull } from '@/types/workhub.types';
import { WorkItemFilters } from './WorkItemFilters';
import { WorkItemsTable } from './WorkItemsTable';
import { BulkEditBar } from './BulkEditBar';
import { WorkItemDrawer } from './WorkItemDrawer';
import { InlineThemeEditor } from './InlineThemeEditor';
import { useJiraProjects } from '@/hooks/workhub/useJiraProjects';
import { useTriggerSync } from '@/hooks/workhub/useSyncLog';
import { SyncBadge } from '../shared/SyncBadge';
import { toast } from 'sonner';

const PAGE_SIZE = 50;

export function WorkItemsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const projectFilter = searchParams.get('project');

  const [filters, setFilters] = useState<Partial<WorkItemFilterConfig>>({});
  const [pagination, setPagination] = useState<PaginationConfig>({ page: 0, pageSize: PAGE_SIZE });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [drawerItemId, setDrawerItemId] = useState<string | null>(null);
  const [themeEditorTarget, setThemeEditorTarget] = useState<{ itemId: string; anchorEl: HTMLElement } | null>(null);
  const [initExpanded, setInitExpanded] = useState(false);

  // Sync state
  const [showSyncPicker, setShowSyncPicker] = useState(false);
  const [syncSelectedProjects, setSyncSelectedProjects] = useState<Set<string>>(new Set());
  const [syncRunning, setSyncRunning] = useState(false);
  const syncBtnRef = useRef<HTMLButtonElement>(null);

  const { data: jiraProjects = [] } = useJiraProjects();
  const triggerSync = useTriggerSync();

  // Apply project filter from URL
  useEffect(() => {
    if (projectFilter) {
      setFilters(prev => ({ ...prev, project_ids: [projectFilter] }));
    }
  }, [projectFilter]);

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

  // Init: expand all Epics on first load
  useEffect(() => {
    if (items.length > 0 && !initExpanded) {
      setExpandedIds(new Set(items.filter(i => i.item_type === 'Epic').map(i => i.id)));
      setInitExpanded(true);
    }
  }, [items, initExpanded]);

  // Init sync picker with all projects selected
  useEffect(() => {
    if (jiraProjects.length > 0 && syncSelectedProjects.size === 0) {
      setSyncSelectedProjects(new Set(jiraProjects.map(p => p.id)));
    }
  }, [jiraProjects]);

  const uniqueProjects = useMemo(() => {
    if (!Array.isArray(items)) return 0;
    return new Set(items.map(i => i.jira_project_id).filter(Boolean)).size;
  }, [items]);

  const lastSync = useMemo(() => {
    if (!Array.isArray(items) || items.length === 0) return null;
    const synced = items.filter(i => i.last_synced_at).map(i => new Date(i.last_synced_at!).getTime());
    if (!synced.length) return null;
    return new Date(Math.max(...synced));
  }, [items]);

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
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
    } else {
      if (Array.isArray(items)) setSelectedIds(new Set(items.map(i => i.id)));
    }
  }, [items, selectAllState]);

  const handleSyncSelected = async () => {
    setSyncRunning(true);
    const selected = Array.from(syncSelectedProjects);
    try {
      for (const projectId of selected) {
        await triggerSync.mutateAsync({ projectId, syncType: 'manual' });
      }
      toast.success(`Sync complete — ${selected.length} project(s) refreshed`);
    } catch (err: any) {
      toast.error(`Sync failed: ${err.message}`);
    } finally {
      setSyncRunning(false);
      setShowSyncPicker(false);
    }
  };

  const toggleSyncProject = (id: string) => {
    setSyncSelectedProjects(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const themeEditorItem = useMemo(() => {
    if (!themeEditorTarget) return null;
    return items.find(i => i.id === themeEditorTarget.itemId) || null;
  }, [themeEditorTarget, items]);

  // Pagination helpers
  const goToPage = (page: number) => {
    setPagination(prev => ({ ...prev, page }));
    setSelectedIds(new Set());
  };

  const pageStart = currentPage * PAGE_SIZE + 1;
  const pageEnd = Math.min((currentPage + 1) * PAGE_SIZE, totalCount);

  return (
    <div style={{ fontFamily: 'var(--wh-font-sans)' }}>
      {/* Page Header */}
      <header className="flex items-start justify-between mb-6" data-print-hide="true">
        <div className="flex items-start gap-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: '#dbeafe' }}
          >
            <FileStack className="w-5 h-5" style={{ color: 'var(--wh-primary)' }} />
          </div>
          <div>
            <h1
              className="text-2xl font-bold"
              style={{ fontFamily: 'var(--wh-font-display)', color: 'var(--wh-text-primary)' }}
            >
              Work Items
            </h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--wh-text-secondary)' }}>
              Jira-synced hierarchy — {totalCount} items across {uniqueProjects} projects
              {isFetching && !isLoading && (
                <span className="ml-2 inline-flex items-center gap-1 text-xs" style={{ color: 'var(--wh-primary)' }}>
                  <Loader2 className="w-3 h-3 animate-spin" /> updating...
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {lastSync && (
            <SyncBadge lastSyncedAt={lastSync.toISOString()} />
          )}
          <button
            onClick={() => navigate('/workhub/jira-projects')}
            className="text-xs font-medium flex items-center gap-1 hover:underline"
            style={{ color: 'var(--wh-primary)' }}
          >
            View Jira Projects <ExternalLink className="w-3 h-3" />
          </button>
          <div className="relative">
            <button
              ref={syncBtnRef}
              onClick={() => setShowSyncPicker(!showSyncPicker)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5"
              style={{ borderColor: 'var(--wh-primary)', color: 'var(--wh-primary)' }}
            >
              {syncRunning ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              Re-sync Jira
            </button>

            {showSyncPicker && (
              <div
                className="absolute right-0 top-full mt-1 w-64 rounded-lg border shadow-lg z-50 p-3"
                style={{ background: 'var(--wh-surface)', borderColor: 'var(--wh-border)' }}
              >
                <div className="text-xs font-semibold mb-2" style={{ color: 'var(--wh-text-primary)' }}>
                  Select projects to sync
                </div>
                <div className="space-y-1.5 mb-3">
                  {jiraProjects.map(p => (
                    <label
                      key={p.id}
                      className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-xs"
                      style={{ color: 'var(--wh-text-secondary)' }}
                    >
                      <input
                        type="checkbox"
                        checked={syncSelectedProjects.has(p.id)}
                        onChange={() => toggleSyncProject(p.id)}
                        className="rounded border-gray-300"
                      />
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: p.color }}
                      />
                      <span className="font-medium" style={{ color: 'var(--wh-text-primary)' }}>
                        {p.project_key}
                      </span>
                      <span>{p.name}</span>
                    </label>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSyncSelected}
                    disabled={syncRunning || syncSelectedProjects.size === 0}
                    className="flex-1 px-3 py-1.5 text-xs font-medium rounded-md text-white disabled:opacity-50"
                    style={{ backgroundColor: 'var(--wh-primary)' }}
                  >
                    {syncRunning ? 'Syncing...' : `Sync Selected (${syncSelectedProjects.size})`}
                  </button>
                  <button
                    onClick={() => setShowSyncPicker(false)}
                    className="px-3 py-1.5 text-xs font-medium rounded-md"
                    style={{ color: 'var(--wh-text-secondary)' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
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
        expandedIds={expandedIds}
        selectedIds={selectedIds}
        onToggleExpand={toggleExpand}
        onToggleSelect={toggleSelect}
        onSelectAll={handleSelectAll}
        selectAllState={selectAllState}
        onOpenDrawer={setDrawerItemId}
        onOpenThemeEditor={(itemId, anchorEl) => setThemeEditorTarget({ itemId, anchorEl })}
        onRetry={() => refetch()}
      />

      {/* Pagination Controls */}
      {totalCount > PAGE_SIZE && (
        <div
          className="flex items-center justify-between mt-3 px-4 py-2.5 rounded-lg border"
          style={{
            backgroundColor: 'var(--wh-surface)',
            borderColor: 'var(--wh-border)',
          }}
        >
          <span className="text-xs" style={{ color: 'var(--wh-text-tertiary)' }}>
            Showing <b style={{ color: 'var(--wh-text-primary)' }}>{pageStart}–{pageEnd}</b> of{' '}
            <b style={{ color: 'var(--wh-text-primary)' }}>{totalCount}</b> items
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 0}
              className="p-1.5 rounded-md border disabled:opacity-30 transition-colors"
              style={{ borderColor: 'var(--wh-border)' }}
              aria-label="Previous page"
            >
              <ChevronLeft className="w-3.5 h-3.5" style={{ color: 'var(--wh-text-secondary)' }} />
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => {
              let pageNum: number;
              if (totalPages <= 7) {
                pageNum = i;
              } else if (currentPage < 3) {
                pageNum = i;
              } else if (currentPage > totalPages - 4) {
                pageNum = totalPages - 7 + i;
              } else {
                pageNum = currentPage - 3 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => goToPage(pageNum)}
                  className="w-7 h-7 rounded-md text-xs font-medium transition-colors"
                  style={{
                    backgroundColor: pageNum === currentPage ? 'var(--wh-primary)' : 'transparent',
                    color: pageNum === currentPage ? 'white' : 'var(--wh-text-secondary)',
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
              style={{ borderColor: 'var(--wh-border)' }}
              aria-label="Next page"
            >
              <ChevronRight className="w-3.5 h-3.5" style={{ color: 'var(--wh-text-secondary)' }} />
            </button>
          </div>
        </div>
      )}

      {/* Inline Theme Editor */}
      {themeEditorTarget && themeEditorItem && (
        <InlineThemeEditor
          itemId={themeEditorTarget.itemId}
          currentThemeId={themeEditorItem.theme_id || null}
          anchorEl={themeEditorTarget.anchorEl}
          onClose={() => setThemeEditorTarget(null)}
        />
      )}

      {/* Drawer */}
      <WorkItemDrawer
        itemId={drawerItemId}
        onClose={() => setDrawerItemId(null)}
        onNavigate={setDrawerItemId}
      />
    </div>
  );
}
