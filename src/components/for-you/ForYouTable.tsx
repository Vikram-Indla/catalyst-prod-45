/**
 * For You Work Items Table - Grouped data table
 */

import React from 'react';
import { cn } from '@/lib/utils';
import type { WorkItem, WorkGroup } from '@/hooks/useForYouData';

interface ForYouTableProps {
  groupedItems: Record<WorkGroup, WorkItem[]>;
  onRowClick: (itemId: string) => void;
}

const GROUP_LABELS: Record<WorkGroup, string> = {
  YESTERDAY: 'Yesterday',
  THIS_WEEK: 'This Week',
  EARLIER: 'Earlier',
};

const MODE_STYLES: Record<string, { bg: string; text: string }> = {
  OPS: { bg: 'bg-status-danger/10', text: 'text-status-danger' },
  DEL: { bg: 'bg-status-warning/10', text: 'text-status-warning' },
  PLN: { bg: 'bg-purple-500/10', text: 'text-purple-600' },
};

const INDICATOR_STYLES: Record<string, string> = {
  OPS: 'bg-status-danger',
  DEL: 'bg-status-warning',
  PLN: 'bg-purple-600',
};

export function ForYouTable({ groupedItems, onRowClick }: ForYouTableProps) {
  const groups = (['YESTERDAY', 'THIS_WEEK', 'EARLIER'] as const).filter(
    group => groupedItems[group].length > 0
  );

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 border border-border rounded-lg bg-surface-0">
        <div className="w-14 h-14 bg-surface-1 rounded-xl flex items-center justify-center mb-4">
          <span className="text-2xl">📋</span>
        </div>
        <p className="text-sm font-medium text-text-primary mb-1">No work items found</p>
        <p className="text-xs text-text-muted">Try adjusting your filters or search</p>
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Table Header */}
      <div className="grid grid-cols-[100px_1fr_80px_90px_90px_160px] gap-4 px-4 py-3 bg-surface-1 border-b border-border">
        <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">Key</span>
        <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">Summary</span>
        <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">Mode</span>
        <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">Level</span>
        <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">Updated</span>
        <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">Assignee</span>
      </div>

      {/* Table Body - Grouped */}
      {groups.map((group) => (
        <div key={group}>
          {/* Group Header */}
          <div className="px-4 py-2.5 text-xs font-bold text-brand-primary uppercase tracking-wide bg-surface-0 border-l-[3px] border-brand-primary">
            {GROUP_LABELS[group]}
          </div>

          {/* Group Items */}
          {groupedItems[group].map((item, index) => (
            <div
              key={item.id}
              onClick={() => onRowClick(item.id)}
              className={cn(
                "grid grid-cols-[100px_1fr_80px_90px_90px_160px] gap-4 px-4 py-3 cursor-pointer transition-colors",
                "border-b border-border-subtle hover:bg-surface-hover",
                index === groupedItems[group].length - 1 && "border-b-0"
              )}
            >
              {/* Key with indicator */}
              <div className="flex items-center gap-2.5">
                <span className={cn("w-2 h-2 rounded-full shrink-0", INDICATOR_STYLES[item.mode])} />
                <a 
                  className="font-mono text-[13px] font-medium text-brand-primary hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {item.key}
                </a>
              </div>

              {/* Summary */}
              <div className="text-sm font-medium text-text-primary truncate">
                {item.summary}
              </div>

              {/* Mode Badge */}
              <div className="flex items-center">
                <span className={cn(
                  "inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase",
                  MODE_STYLES[item.mode].bg,
                  MODE_STYLES[item.mode].text
                )}>
                  {item.mode}
                </span>
              </div>

              {/* Level */}
              <div className="flex items-center text-sm font-medium text-brand-primary">
                {item.level}
              </div>

              {/* Updated */}
              <div className="flex items-center text-[13px] text-text-muted">
                {item.updatedAt}
              </div>

              {/* Assignee */}
              <div className="flex items-center gap-2.5">
                <div 
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white"
                  style={{ backgroundColor: item.assignee.avatarColor }}
                >
                  {item.assignee.initials}
                </div>
                <span className="text-[13px] text-text-secondary truncate">
                  {item.assignee.name}
                </span>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
