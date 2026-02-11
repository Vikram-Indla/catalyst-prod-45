/**
 * WorkItemsTable — Virtualized table for wh_issues (real Jira data)
 */

import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { WorkItemRow } from './WorkItemRow';
import type { JiraIssue } from '@/hooks/workhub/useWorkItems';
import { AlertCircle, FileStack } from 'lucide-react';

interface WorkItemsTableProps {
  items: JiraIssue[];
  isLoading: boolean;
  error: Error | null;
  selectedIds: Set<string>;
  onToggleSelect: (key: string) => void;
  onSelectAll: () => void;
  selectAllState: 'none' | 'some' | 'all';
  onOpenDrawer: (key: string) => void;
  onRetry?: () => void;
}

const ROW_HEIGHT = 44;

export function WorkItemsTable({
  items,
  isLoading,
  error,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  selectAllState,
  onOpenDrawer,
  onRetry,
}: WorkItemsTableProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 15,
  });

  if (isLoading) {
    return (
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--wh-border, #e2e8f0)', backgroundColor: 'var(--wh-surface, #fff)' }}>
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="grid items-center px-4 border-b animate-pulse"
            style={{
              gridTemplateColumns: '36px 100px 90px 1fr 120px 100px 120px 80px 90px',
              height: ROW_HEIGHT,
              borderColor: '#f1f5f9',
            }}
          >
            {Array.from({ length: 9 }).map((_, j) => (
              <div key={j} className="h-3 bg-slate-100 rounded" style={{ width: `${40 + Math.random() * 50}%` }} />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border p-12 text-center" style={{ borderColor: 'var(--wh-border, #e2e8f0)', backgroundColor: 'var(--wh-surface, #fff)' }}>
        <AlertCircle className="w-8 h-8 mx-auto mb-3" style={{ color: '#dc2626' }} />
        <p className="text-sm font-medium mb-2" style={{ color: 'var(--wh-text-primary, #0f172a)' }}>Failed to load work items</p>
        <p className="text-xs mb-4" style={{ color: 'var(--wh-text-tertiary, #94a3b8)' }}>{error.message}</p>
        {onRetry && (
          <button onClick={onRetry} className="px-4 py-1.5 text-xs font-medium rounded-lg text-white" style={{ backgroundColor: 'var(--wh-primary, #2563eb)' }}>
            Retry
          </button>
        )}
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="rounded-xl border p-12 text-center" style={{ borderColor: 'var(--wh-border, #e2e8f0)', backgroundColor: 'var(--wh-surface, #fff)' }}>
        <FileStack className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--wh-text-tertiary, #94a3b8)' }} />
        <p className="text-sm font-medium mb-1" style={{ color: 'var(--wh-text-primary, #0f172a)' }}>No work items found</p>
        <p className="text-xs" style={{ color: 'var(--wh-text-tertiary, #94a3b8)' }}>Try adjusting your filters or run a Jira sync</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--wh-border, #e2e8f0)', backgroundColor: 'var(--wh-surface, #fff)' }}>
      {/* Header */}
      <div
        className="grid items-center border-b sticky top-0"
        style={{
          gridTemplateColumns: '36px 100px 90px 1fr 120px 100px 120px 80px 90px',
          height: '36px',
          backgroundColor: '#f8fafc',
          borderColor: 'var(--wh-border, #e2e8f0)',
          zIndex: 10,
        }}
      >
        <div className="flex justify-center">
          <input
            type="checkbox"
            checked={selectAllState === 'all'}
            ref={el => { if (el) el.indeterminate = selectAllState === 'some'; }}
            onChange={onSelectAll}
            className="w-4 h-4 rounded cursor-pointer"
            style={{ accentColor: 'var(--wh-primary, #2563eb)' }}
          />
        </div>
        {['Key', 'Type', 'Summary', 'Status', 'Project', 'Assignee', 'Priority', 'Synced'].map(col => (
          <span key={col} className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--wh-text-tertiary, #94a3b8)' }}>
            {col}
          </span>
        ))}
      </div>

      {/* Virtualized rows */}
      <div ref={parentRef} style={{ height: Math.min(items.length * ROW_HEIGHT, 600), overflow: 'auto' }}>
        <div style={{ height: `${virtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
          {virtualizer.getVirtualItems().map(virtualRow => {
            const item = items[virtualRow.index];
            return (
              <div
                key={item.issue_key}
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
                  isSelected={selectedIds.has(item.issue_key)}
                  onToggleSelect={() => onToggleSelect(item.issue_key)}
                  onOpenDrawer={() => onOpenDrawer(item.issue_key)}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
