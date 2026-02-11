/**
 * WorkItemsTable — Virtualized hierarchy table with row virtualization
 * Uses @tanstack/react-virtual for smooth scrolling with large datasets
 */

import { useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
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

const ROW_HEIGHT = 44; // matches --wh-row-height

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
  const parentRef = useRef<HTMLDivElement>(null);

  // Build visible items based on expanded ancestry
  const visibleItems = useMemo(() => {
    if (!items.length) return [];
    const result: WorkItemFull[] = [];

    for (const item of items) {
      if (item.depth === 0) {
        result.push(item);
      } else {
        const parentVisible = item.parent_id && expandedIds.has(item.parent_id);
        if (parentVisible) {
          const parentInList = result.some(r => r.id === item.parent_id);
          if (parentInList) {
            result.push(item);
          }
        }
      }
    }
    return result;
  }, [items, expandedIds]);

  // Virtual row rendering
  const virtualizer = useVirtualizer({
    count: visibleItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10, // Render 10 extra rows above/below for smooth scrolling
  });

  if (isLoading) {
    return (
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--wh-border)', backgroundColor: 'var(--wh-surface)' }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="grid items-center px-4 border-b animate-pulse"
            style={{
              gridTemplateColumns: '36px 28px 110px 70px 1fr 100px 140px 130px 100px 80px 100px',
              height: ROW_HEIGHT,
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
        <p className="text-xs" style={{ color: 'var(--wh-text-tertiary)' }}>Try adjusting your filters or run a Jira sync</p>
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

      {/* Virtualized rows */}
      <div
        ref={parentRef}
        style={{ height: Math.min(visibleItems.length * ROW_HEIGHT, 600), overflow: 'auto' }}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map(virtualRow => {
            const item = visibleItems[virtualRow.index];
            return (
              <div
                key={item.id}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <WorkItemRow
                  item={item}
                  isExpanded={expandedIds.has(item.id)}
                  isSelected={selectedIds.has(item.id)}
                  onToggleExpand={() => onToggleExpand(item.id)}
                  onToggleSelect={() => onToggleSelect(item.id)}
                  onOpenDrawer={() => onOpenDrawer(item.id)}
                  onOpenThemeEditor={onOpenThemeEditor}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
