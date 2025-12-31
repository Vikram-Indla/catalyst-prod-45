/**
 * For You Work Items Table - Grouped data table with selection & keyboard nav
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Star } from 'lucide-react';
import type { WorkItem, WorkGroup } from '@/hooks/useForYouData';

interface ForYouTableProps {
  groupedItems: Record<WorkGroup, WorkItem[]>;
  onRowClick: (itemId: string) => void;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
  onStarToggle?: (itemId: string) => void;
  isInitialLoad?: boolean;
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

export function ForYouTable({ 
  groupedItems, 
  onRowClick,
  selectedIds = new Set(),
  onSelectionChange,
  onStarToggle,
  isInitialLoad = false,
}: ForYouTableProps) {
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const tableRef = useRef<HTMLDivElement>(null);

  // Flatten items for keyboard navigation
  const flatItems = React.useMemo(() => {
    const groups: WorkGroup[] = ['YESTERDAY', 'THIS_WEEK', 'EARLIER'];
    const items: WorkItem[] = [];
    groups.forEach(group => {
      groupedItems[group].forEach(item => items.push(item));
    });
    return items;
  }, [groupedItems]);

  const groups = (['YESTERDAY', 'THIS_WEEK', 'EARLIER'] as const).filter(
    group => groupedItems[group].length > 0
  );

  // Handle select all
  const handleSelectAll = useCallback((checked: boolean) => {
    if (!onSelectionChange) return;
    if (checked) {
      onSelectionChange(new Set(flatItems.map(item => item.id)));
    } else {
      onSelectionChange(new Set());
    }
  }, [flatItems, onSelectionChange]);

  // Handle individual selection
  const handleSelectItem = useCallback((itemId: string, checked: boolean) => {
    if (!onSelectionChange) return;
    const newSelection = new Set(selectedIds);
    if (checked) {
      newSelection.add(itemId);
    } else {
      newSelection.delete(itemId);
    }
    onSelectionChange(newSelection);
  }, [selectedIds, onSelectionChange]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!tableRef.current?.contains(document.activeElement) && 
          document.activeElement !== tableRef.current) {
        return;
      }

      switch (e.key) {
        case 'j':
        case 'ArrowDown':
          e.preventDefault();
          setFocusedIndex(prev => Math.min(prev + 1, flatItems.length - 1));
          break;
        case 'k':
        case 'ArrowUp':
          e.preventDefault();
          setFocusedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (focusedIndex >= 0 && focusedIndex < flatItems.length) {
            onRowClick(flatItems[focusedIndex].id);
          }
          break;
        case 'x':
          e.preventDefault();
          if (focusedIndex >= 0 && focusedIndex < flatItems.length && onSelectionChange) {
            const item = flatItems[focusedIndex];
            handleSelectItem(item.id, !selectedIds.has(item.id));
          }
          break;
        case 's':
          e.preventDefault();
          if (focusedIndex >= 0 && focusedIndex < flatItems.length && onStarToggle) {
            onStarToggle(flatItems[focusedIndex].id);
          }
          break;
        case 'Escape':
          e.preventDefault();
          if (onSelectionChange) {
            onSelectionChange(new Set());
          }
          setFocusedIndex(-1);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [flatItems, focusedIndex, onRowClick, selectedIds, onSelectionChange, onStarToggle, handleSelectItem]);

  const isAllSelected = flatItems.length > 0 && flatItems.every(item => selectedIds.has(item.id));
  const isPartiallySelected = flatItems.some(item => selectedIds.has(item.id)) && !isAllSelected;

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

  let rowIndex = -1;

  return (
    <div 
      ref={tableRef}
      tabIndex={0}
      className={cn(
        "border border-border rounded-lg overflow-hidden outline-none",
        "focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
      )}
    >
      {/* Table Header */}
      <div className="grid grid-cols-[40px_100px_1fr_80px_90px_90px_160px] gap-4 px-4 py-3 bg-surface-1 border-b border-border">
        <div className="flex items-center">
          <Checkbox 
            checked={isAllSelected}
            onCheckedChange={handleSelectAll}
            className={cn(isPartiallySelected && "data-[state=unchecked]:bg-brand-primary/20")}
            aria-label="Select all items"
          />
        </div>
        <span className="text-xs font-semibold text-text-muted uppercase tracking-wide whitespace-nowrap flex items-center">
          Key
        </span>
        <span className="text-xs font-semibold text-text-muted uppercase tracking-wide whitespace-nowrap flex items-center">
          Summary
        </span>
        <span className="text-xs font-semibold text-text-muted uppercase tracking-wide whitespace-nowrap flex items-center">
          Mode
        </span>
        <span className="text-xs font-semibold text-text-muted uppercase tracking-wide whitespace-nowrap flex items-center">
          Level
        </span>
        <span className="text-xs font-semibold text-text-muted uppercase tracking-wide whitespace-nowrap flex items-center">
          Updated
        </span>
        <span className="text-xs font-semibold text-text-muted uppercase tracking-wide whitespace-nowrap flex items-center">
          Assignee
        </span>
      </div>

      {/* Table Body - Grouped */}
      {groups.map((group) => (
        <div key={group}>
          {/* Group Header */}
          <div className="px-4 py-2.5 text-xs font-bold text-brand-primary uppercase tracking-wide bg-surface-0 border-l-[3px] border-brand-primary">
            {GROUP_LABELS[group]}
          </div>

          {/* Group Items */}
          {groupedItems[group].map((item, indexInGroup) => {
            rowIndex++;
            const currentRowIndex = rowIndex;
            const isSelected = selectedIds.has(item.id);
            const isFocused = focusedIndex === currentRowIndex;

            return (
              <div
                key={item.id}
                data-index={currentRowIndex}
                onClick={(e) => {
                  setFocusedIndex(currentRowIndex);
                  onRowClick(item.id);
                }}
                className={cn(
                  "grid grid-cols-[40px_100px_1fr_80px_90px_90px_160px] gap-4 px-4 py-3 cursor-pointer transition-colors group",
                  "border-b border-border-subtle",
                  indexInGroup === groupedItems[group].length - 1 && "border-b-0",
                  isSelected && "bg-[hsl(var(--surface-active))]",
                  isFocused && "ring-2 ring-inset ring-brand-primary",
                  !isSelected && "hover:bg-surface-hover",
                  isInitialLoad && "animate-fade-in",
                )}
                style={isInitialLoad ? { animationDelay: `${currentRowIndex * 50}ms` } : undefined}
              >
                {/* Checkbox */}
                <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
                  <Checkbox 
                    checked={isSelected}
                    onCheckedChange={(checked) => handleSelectItem(item.id, !!checked)}
                    aria-label={`Select ${item.key}`}
                  />
                </div>

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

                {/* Assignee with actions */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div 
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0"
                      style={{ backgroundColor: item.assignee.avatarColor }}
                    >
                      {item.assignee.initials}
                    </div>
                    <span className="text-[13px] text-text-secondary truncate">
                      {item.assignee.name}
                    </span>
                  </div>
                  
                  {/* Row actions - visible on hover */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {onStarToggle && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onStarToggle(item.id);
                        }}
                        className={cn(
                          "p-1 rounded hover:bg-surface-hover transition-colors",
                          item.starred ? "text-status-warning" : "text-text-muted"
                        )}
                        aria-label={item.starred ? "Unstar item" : "Star item"}
                      >
                        <Star className={cn("w-4 h-4", item.starred && "fill-current")} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
