/**
 * WorkItemsPage — Full page orchestration (Tasks 2 + 8)
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { FileStack, RefreshCw } from 'lucide-react';
import { useWorkItems } from '@/hooks/workhub/useWorkItems';
import type { WorkItemFilterConfig } from '@/hooks/workhub/useWorkItems';
import type { WorkItemFull } from '@/types/workhub.types';
import { WorkItemFilters } from './WorkItemFilters';
import { WorkItemsTable } from './WorkItemsTable';
import { BulkEditBar } from './BulkEditBar';
import { WorkItemDrawer } from './WorkItemDrawer';
import { InlineThemeEditor } from './InlineThemeEditor';
import { formatDistanceToNow } from 'date-fns';

export function WorkItemsPage() {
  const [filters, setFilters] = useState<Partial<WorkItemFilterConfig>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [drawerItemId, setDrawerItemId] = useState<string | null>(null);
  const [themeEditorTarget, setThemeEditorTarget] = useState<{ itemId: string; anchorEl: HTMLElement } | null>(null);
  const [initExpanded, setInitExpanded] = useState(false);

  const { data: items, isLoading, error, refetch } = useWorkItems(filters);

  // Init: expand all Epics on first load
  useEffect(() => {
    if (items && items.length > 0 && !initExpanded) {
      setExpandedIds(new Set(items.filter(i => i.item_type === 'Epic').map(i => i.id)));
      setInitExpanded(true);
    }
  }, [items, initExpanded]);

  const uniqueProjects = useMemo(() => {
    if (!items) return 0;
    return new Set(items.map(i => i.jira_project_id).filter(Boolean)).size;
  }, [items]);

  const lastSync = useMemo(() => {
    if (!items || items.length === 0) return null;
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
    if (!items || selectedIds.size === 0) return 'none';
    if (selectedIds.size === items.length) return 'all';
    return 'some';
  }, [items, selectedIds]);

  const handleSelectAll = useCallback(() => {
    if (!items) return;
    if (selectAllState === 'all') {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map(i => i.id)));
    }
  }, [items, selectAllState]);

  // Get current theme_id for inline editor
  const themeEditorItem = useMemo(() => {
    if (!themeEditorTarget || !items) return null;
    return items.find(i => i.id === themeEditorTarget.itemId) || null;
  }, [themeEditorTarget, items]);

  return (
    <div style={{ fontFamily: 'var(--wh-font-sans)' }}>
      {/* Page Header (Task 2) */}
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
              Jira-synced hierarchy — {items?.length ?? 0} items across {uniqueProjects} projects
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {lastSync && (
            <span className="flex items-center gap-1.5 text-[12px]" style={{ color: 'var(--wh-text-tertiary)' }}>
              <RefreshCw className="w-3.5 h-3.5" />
              Last sync: {formatDistanceToNow(lastSync, { addSuffix: true })}
            </span>
          )}
          <button
            disabled
            className="px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors disabled:opacity-40"
            style={{ borderColor: 'var(--wh-border)', color: 'var(--wh-text-secondary)' }}
          >
            Re-sync Jira
          </button>
        </div>
      </header>

      {/* Filters (Task 3) */}
      <div className="mb-4">
        <WorkItemFilters filters={filters} onChange={setFilters} />
      </div>

      {/* Bulk Edit Bar (Task 5) */}
      {selectedIds.size > 0 && (
        <div className="mb-3">
          <BulkEditBar
            selectedCount={selectedIds.size}
            selectedIds={Array.from(selectedIds)}
            onClear={() => setSelectedIds(new Set())}
          />
        </div>
      )}

      {/* Table (Task 4) */}
      <WorkItemsTable
        items={items ?? []}
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

      {/* Inline Theme Editor (Task 7) */}
      {themeEditorTarget && themeEditorItem && (
        <InlineThemeEditor
          itemId={themeEditorTarget.itemId}
          currentThemeId={themeEditorItem.theme_id || null}
          anchorEl={themeEditorTarget.anchorEl}
          onClose={() => setThemeEditorTarget(null)}
        />
      )}

      {/* Drawer (Task 6) */}
      <WorkItemDrawer
        itemId={drawerItemId}
        onClose={() => setDrawerItemId(null)}
        onNavigate={setDrawerItemId}
      />
    </div>
  );
}
