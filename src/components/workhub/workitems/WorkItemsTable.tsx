/**
 * WorkItemsTable — Hierarchy table with 11 columns
 */

import { useMemo } from 'react';
import { WorkItemRow } from './WorkItemRow';
import type { WorkItemFull } from '@/types/workhub.types';
import { Loader2, AlertCircle, FileStack } from 'lucide-react';

interface WorkItemsTableProps {
  items: WorkItemFull[];
  isLoading: boolean;
  error: Error | null;
  expandedIds: Set<string>;
  selectedIds: Set<string>;
  onToggleExpand: (id: string) => void;
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  selectAllState: 'none' | 'some' | 'all';
  onOpenDrawer: (id: string) => void;
  onOpenThemeEditor: (itemId: string, anchorEl: HTMLElement) => void;
  onRetry?: () => void;
}

export function WorkItemsTable({
  items,
  isLoading,
  error,
  expandedIds,
  selectedIds,
  onToggleExpand,
  onToggleSelect,
  onSelectAll,
  selectAllState,
  onOpenDrawer,
  onOpenThemeEditor,
  onRetry,
}: WorkItemsTableProps) {
  // Build visible items based on expanded ancestry
  const visibleItems = useMemo(() => {
    if (!items.length) return [];
    const result: WorkItemFull[] = [];
    const parentExpanded = new Map<string | undefined, boolean>();
    // Root items are always visible
    parentExpanded.set(undefined, true);

    for (const item of items) {
      // An item is visible if its parent is expanded (or it's root)
      const parentVisible = !item.parent_id || expandedIds.has(item.parent_id);
      // Also check that all ancestors are expanded
      if (item.depth === 0) {
        result.push(item);
      } else if (parentVisible) {
        // Check parent is in visible list
        const parentInList = result.some(r => r.id === item.parent_id);
        if (parentInList) {
          result.push(item);
        }
      }
    }
    return result;
  }, [items, expandedIds]);

  if (isLoading) {
    return (
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--wh-border)', backgroundColor: 'var(--wh-surface)' }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="grid items-center px-4 border-b animate-pulse"
            style={{
              gridTemplateColumns: '36px 28px 110px 70px 1fr 100px 140px 130px 100px 80px 100px',
              height: 'var(--wh-row-height)',
              borderColor: '#f1f5f9',
            }}
          >
            {Array.from({ length: 11 }).map((_, j) => (
              <div key={j} className="h-3 bg-slate-100 rounded" style={{ width: `${50 + Math.random() * 40}%` }} />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="rounded-xl border p-12 text-center"
        style={{ borderColor: 'var(--wh-border)', backgroundColor: 'var(--wh-surface)' }}
      >
        <AlertCircle className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--wh-danger)' }} />
        <p className="text-sm font-medium mb-2" style={{ color: 'var(--wh-text-primary)' }}>Failed to load work items</p>
        <p className="text-xs mb-4" style={{ color: 'var(--wh-text-tertiary)' }}>{error.message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-1.5 text-xs font-medium rounded-lg text-white transition-colors"
            style={{ backgroundColor: 'var(--wh-primary)' }}
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  if (!items.length) {
    return (
      <div
        className="rounded-xl border p-12 text-center"
        style={{ borderColor: 'var(--wh-border)', backgroundColor: 'var(--wh-surface)' }}
      >
        <FileStack className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--wh-text-tertiary)' }} />
        <p className="text-sm font-medium mb-1" style={{ color: 'var(--wh-text-primary)' }}>No work items found</p>
        <p className="text-xs" style={{ color: 'var(--wh-text-tertiary)' }}>Try adjusting your filters</p>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ borderColor: 'var(--wh-border)', backgroundColor: 'var(--wh-surface)' }}
    >
      {/* Header */}
      <div
        className="grid items-center border-b sticky top-0"
        style={{
          gridTemplateColumns: '36px 28px 110px 70px 1fr 100px 140px 130px 100px 80px 100px',
          height: 'var(--wh-header-height)',
          backgroundColor: '#f8fafc',
          borderColor: 'var(--wh-border)',
          zIndex: 'var(--wh-z-sticky)',
        }}
      >
        <div className="flex justify-center">
          <input
            type="checkbox"
            checked={selectAllState === 'all'}
            ref={el => { if (el) el.indeterminate = selectAllState === 'some'; }}
            onChange={onSelectAll}
            className="w-4 h-4 rounded cursor-pointer"
            style={{ accentColor: 'var(--wh-primary)' }}
            aria-label="Select all"
          />
        </div>
        <div /> {/* Expand spacer */}
        {['Key', 'Type', 'Summary', 'Status', 'Assignee', 'Theme', 'Release', 'Project', 'Synced'].map(col => (
          <span
            key={col}
            className="text-[11px] font-semibold uppercase tracking-wider"
            style={{ color: 'var(--wh-text-tertiary)' }}
          >
            {col}
          </span>
        ))}
      </div>

      {/* Rows */}
      {visibleItems.map(item => (
        <WorkItemRow
          key={item.id}
          item={item}
          isExpanded={expandedIds.has(item.id)}
          isSelected={selectedIds.has(item.id)}
          onToggleExpand={() => onToggleExpand(item.id)}
          onToggleSelect={() => onToggleSelect(item.id)}
          onOpenDrawer={() => onOpenDrawer(item.id)}
          onOpenThemeEditor={onOpenThemeEditor}
        />
      ))}
    </div>
  );
}
