/**
 * Roadmap Objectives Panel - Left objectives list
 * Responsive: hidden on mobile with hamburger toggle
 */

import React from 'react';
import { ChevronDown, GripVertical, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RoadmapGroup, ObjectiveStatus } from '@/types/roadmap';
import { STATUS_COLORS, LAYOUT } from '@/types/roadmap';

interface RoadmapObjectivesPanelProps {
  groups: RoadmapGroup[];
  collapsed: Set<string>;
  selected: string | null;
  filteredCount: number;
  totalCount: number;
  onToggleCollapse: (id: string) => void;
  onSelect: (id: string | null) => void;
  // Mobile responsive props
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function RoadmapObjectivesPanel({
  groups,
  collapsed,
  selected,
  filteredCount,
  totalCount,
  onToggleCollapse,
  onSelect,
  isMobileOpen = false,
  onMobileClose,
}: RoadmapObjectivesPanelProps) {
  return (
    <>
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onMobileClose}
        />
      )}
      
      {/* Panel */}
      <div 
        className={cn(
          "bg-surface-0 border-r border-border flex flex-col",
          // Desktop: always visible, fixed width
          "hidden lg:flex lg:shrink-0",
          // Mobile: slide-in overlay
          isMobileOpen && "!flex fixed inset-y-0 left-0 z-50 shadow-2xl lg:relative lg:shadow-none"
        )}
        style={{ width: LAYOUT.panelWidth }}
      >
        {/* Header */}
        <div 
          className="px-4 flex items-end pb-2.5 border-b border-border shrink-0"
          style={{ height: LAYOUT.headerHeight }}
        >
          <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wide">
            Objectives
          </span>
          <span className="ml-auto text-[10px] text-text-muted">
            {filteredCount} of {totalCount}
          </span>
          {/* Mobile close button */}
          {onMobileClose && (
            <button
              onClick={onMobileClose}
              className="ml-3 lg:hidden h-6 w-6 flex items-center justify-center rounded hover:bg-surface-1 text-text-muted hover:text-text-primary transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {groups.map((group) => (
            <div key={group.id} className="border-b border-border">
              {/* Theme Header */}
              <div
                onClick={() => onToggleCollapse(group.id)}
                className="flex items-center gap-2 px-4 py-2 cursor-pointer hover:bg-surface-1 transition-colors select-none"
              >
                <GripVertical className="w-3 h-3 text-text-muted opacity-40 hover:opacity-100 cursor-grab" />
                <ChevronDown 
                  className={cn(
                    "w-3.5 h-3.5 text-text-muted transition-transform duration-200",
                    collapsed.has(group.id) ? "-rotate-90" : "rotate-0"
                  )}
                />
                <div 
                  className="w-[3px] h-[18px] rounded-sm"
                  style={{ backgroundColor: group.color }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-text-primary truncate">
                    {group.name}
                  </div>
                  <div className="text-[10px] text-text-muted">
                    {group.objs.length} objective{group.objs.length !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>

              {/* Objectives */}
              {!collapsed.has(group.id) && (
                <div>
                  {group.objs.map((obj) => (
                    <div
                      key={obj.id}
                      onClick={() => {
                        onSelect(selected === obj.id ? null : obj.id);
                        // Close mobile panel when selecting on mobile
                        if (onMobileClose && window.innerWidth < 1024) {
                          onMobileClose();
                        }
                      }}
                      className={cn(
                        "flex items-center h-11 px-4 pl-10 cursor-pointer transition-colors",
                        selected === obj.id 
                          ? "bg-brand-primary/10" 
                          : "hover:bg-surface-1"
                      )}
                    >
                      <span 
                        className="w-1.5 h-1.5 rounded-full mr-2 shrink-0"
                        style={{ backgroundColor: STATUS_COLORS[obj.status] }}
                      />
                      <span 
                        className={cn(
                          "text-xs truncate",
                          selected === obj.id 
                            ? "text-text-primary font-medium" 
                            : "text-text-secondary"
                        )}
                      >
                        {obj.name}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {groups.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <div className="w-14 h-14 bg-surface-1 rounded-xl flex items-center justify-center mb-4">
                <span className="text-2xl">📊</span>
              </div>
              <p className="text-sm font-medium text-text-primary mb-1">No objectives found</p>
              <p className="text-xs text-text-muted">Try adjusting your filters</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
