/**
 * For You Work Items Table - CATALYST10 v3 spec
 * Enterprise typography, muted mode badges, row hover with inline "Open →"
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Star } from 'lucide-react';
import { JiraIssueTypeIcon } from '@/components/shared/JiraIssueTypeIcon';
import { useProfileAvatarsByName } from '@/hooks/useProfileAvatars';
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

// Priority color map — deep sophisticated tones
const PRIORITY_COLORS: Record<string, string> = {
  Highest: 'hsl(0,72%,51%)',     // red-600 #dc2626
  High: 'hsl(21,90%,48%)',       // amber-600 #d97706
  Medium: 'hsl(217,91%,60%)',    // blue-600 #2563eb
  Low: 'hsl(160,84%,39%)',       // emerald-600 #059669
  Lowest: 'hsl(160,84%,39%)',    // emerald-600
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
  const nameAvatarMap = useProfileAvatarsByName();

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
      <div className="flex flex-col items-center justify-center py-16 border border-[hsl(214,32%,91%)] rounded-lg bg-white">
        <div className="w-14 h-14 bg-[hsl(210,40%,96%)] rounded-xl flex items-center justify-center mb-4">
          <span className="text-2xl">📋</span>
        </div>
        <p className="text-[13px] font-semibold text-[hsl(222,47%,11%)] mb-1">No work items found</p>
        <p className="text-[11px] text-[hsl(215,16%,47%)]">Try adjusting your filters or search</p>
      </div>
    );
  }

  let rowIndex = -1;

  return (
    <div 
      ref={tableRef}
      tabIndex={0}
      className={cn(
        "border border-[hsl(214,32%,91%)] rounded-lg overflow-hidden outline-none",
        "focus-visible:ring-2 focus-visible:ring-[hsl(217,91%,60%)] focus-visible:ring-offset-2"
      )}
    >
      {/* Column Headers — 11px/600 slate-500 uppercase tracking-wide */}
      <div className="grid grid-cols-[40px_120px_1fr_160px_80px_160px] gap-4 px-4 py-3 bg-[hsl(210,40%,98%)] border-b border-[hsl(214,32%,91%)]">
        <div className="flex items-center">
          <Checkbox 
            checked={isAllSelected}
            onCheckedChange={handleSelectAll}
            className={cn(isPartiallySelected && "data-[state=unchecked]:bg-[hsl(217,91%,60%)]/20")}
            aria-label="Select all items"
          />
        </div>
        <span className="text-[11px] font-semibold text-[hsl(215,16%,47%)] uppercase tracking-[0.06em] flex items-center">
          Key
        </span>
        <span className="text-[11px] font-semibold text-[hsl(215,16%,47%)] uppercase tracking-[0.06em] flex items-center">
          Summary
        </span>
        <span className="text-[11px] font-semibold text-[hsl(215,16%,47%)] uppercase tracking-[0.06em] flex items-center">
          Project
        </span>
        <span className="text-[11px] font-semibold text-[hsl(215,16%,47%)] uppercase tracking-[0.06em] flex items-center">
          Updated
        </span>
        <span className="text-[11px] font-semibold text-[hsl(215,16%,47%)] uppercase tracking-[0.06em] flex items-center">
          Assignee
        </span>
      </div>

      {/* Table Body - Grouped */}
      {groups.map((group) => (
        <div key={group}>
          {/* Group Header — 11px/600 slate-500 uppercase, blue left accent */}
          <div className="flex items-center px-4 py-2 bg-[hsl(210,40%,98%)] border-l-[3px] border-[hsl(217,91%,60%)]">
            <span className="text-[11px] font-semibold text-[hsl(215,16%,47%)] uppercase tracking-[0.06em]">
              {GROUP_LABELS[group]}
            </span>
          </div>

          {/* Group Items */}
          {groupedItems[group].map((item, indexInGroup) => {
            rowIndex++;
            const currentRowIndex = rowIndex;
            const isSelected = selectedIds.has(item.id);
            const isFocused = focusedIndex === currentRowIndex;
            const priorityColor = PRIORITY_COLORS[item.level] || PRIORITY_COLORS.Medium;

            return (
              <div
                key={item.id}
                data-index={currentRowIndex}
                onClick={(e) => {
                  setFocusedIndex(currentRowIndex);
                  onRowClick(item.id);
                }}
                className={cn(
                  "relative grid grid-cols-[40px_120px_1fr_160px_80px_160px] gap-4 px-4 py-3 cursor-pointer transition-[background] duration-100 group",
                  "border-b border-[hsl(210,40%,96%)]",
                  indexInGroup === groupedItems[group].length - 1 && "border-b-0",
                  isSelected && "bg-[hsl(217,91%,95%)]",
                  isFocused && "ring-2 ring-inset ring-[hsl(217,91%,60%)]",
                  !isSelected && "hover:bg-[hsl(210,40%,98%)]",
                  isInitialLoad && "animate-fade-in",
                )}
                style={isInitialLoad ? { animationDelay: `${currentRowIndex * 50}ms` } : undefined}
              >
                {/* Checkbox — hidden until hover */}
                <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
                  <Checkbox 
                    checked={isSelected}
                    onCheckedChange={(checked) => handleSelectItem(item.id, !!checked)}
                    className={cn(
                      "w-[15px] h-[15px] rounded border-[1.5px] border-[hsl(214,32%,82%)] transition-opacity duration-100",
                      !isSelected && "opacity-0 group-hover:opacity-100"
                    )}
                    aria-label={`Select ${item.key}`}
                  />
                </div>

                {/* Key with priority square + Jira icon */}
                <div className="flex items-center gap-2">
                  {/* Priority square — 8×8 deep tones */}
                  <div 
                    className="w-2 h-2 rounded-[2px] shrink-0"
                    style={{ backgroundColor: priorityColor }}
                  />
                  <JiraIssueTypeIcon issueType={item.issueType} size={14} />
                  <a 
                    className="text-[13px] font-medium text-[hsl(215,25%,27%)] tabular-nums font-[Inter,monospace] hover:underline cursor-pointer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {item.key}
                  </a>
                </div>

                {/* Summary — 13px/600 slate-900 */}
                <div className="text-[13px] font-semibold text-[hsl(222,47%,11%)] truncate flex items-center">
                  {item.summary}
                </div>

                {/* Project Name */}
                <div className="flex items-center">
                  <span className="text-[12px] font-medium text-[hsl(215,25%,27%)] truncate" title={item.project}>
                    {item.project}
                  </span>
                </div>

                {/* Updated — 13px/500 slate-700 tabular-nums */}
                <div className="flex items-center text-[13px] font-medium text-[hsl(215,25%,27%)] tabular-nums">
                  {item.updatedAt}
                </div>

                {/* Assignee — avatar + name + inline Open → */}
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Avatar — rounded-xl square, profile photo with initials fallback (Capacity Planner style) */}
                    {(() => {
                      const avatarUrl = nameAvatarMap.get(item.assignee.name.toLowerCase());
                      return avatarUrl ? (
                        <img 
                          src={avatarUrl} 
                          alt={item.assignee.name}
                          className="w-7 h-7 rounded-xl object-cover shrink-0 border-2 border-[hsl(213,94%,83%)]"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-xl flex items-center justify-center text-[10px] font-bold shrink-0 bg-[hsl(217,92%,95%)] text-[hsl(217,91%,60%)] border-2 border-[hsl(213,94%,83%)]">
                          {item.assignee.initials}
                        </div>
                      );
                    })()}
                    <span className="text-[13px] font-medium text-[hsl(215,25%,27%)]">
                      {item.assignee.name}
                    </span>
                  </div>

                  {/* Star — visible on hover */}
                  {onStarToggle && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onStarToggle(item.id);
                      }}
                      className={cn(
                        "shrink-0 p-1 rounded hover:bg-[hsl(210,40%,96%)] transition-colors",
                        item.starred ? "opacity-100 text-[hsl(45,93%,47%)]" : "opacity-0 group-hover:opacity-100 text-[hsl(215,16%,47%)]"
                      )}
                      aria-label={item.starred ? "Unstar item" : "Star item"}
                    >
                      <Star className={cn("w-3.5 h-3.5", item.starred && "fill-current")} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
