/**
 * Left panel containing the list of demands
 */

import React from 'react';
import { RoadmapListRow } from './RoadmapListRow';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { RoadmapDemand, RoadmapGroup } from '../types/roadmap';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface RoadmapListPanelProps {
  items: RoadmapDemand[];
  groups?: RoadmapGroup[];
  focusedIndex: number;
  selectedItemId: string | null;
  onItemClick: (id: string) => void;
  onToggleGroup?: (groupKey: string) => void;
  listWidth?: number;
}

export function RoadmapListPanel({
  items,
  groups,
  focusedIndex,
  selectedItemId,
  onItemClick,
  onToggleGroup,
  listWidth = 360,
}: RoadmapListPanelProps) {
  // If groups are provided, render grouped view
  if (groups && groups.length > 0) {
    return (
      <div 
        className="border-r border-border bg-card flex-shrink-0 flex flex-col"
        style={{ width: listWidth }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Demands
          </span>
          <span className="text-xs text-muted-foreground">
            {items.length} items
          </span>
        </div>

        <ScrollArea className="flex-1">
          <div role="table" data-roadmap-container>
            {groups.map((group) => (
              <div key={group.key} className="border-b border-border last:border-b-0">
                {/* Group header */}
                <button
                  onClick={() => onToggleGroup?.(group.key)}
                  className="w-full flex items-center gap-2 px-3 py-2 bg-muted/50 hover:bg-muted transition-colors"
                >
                  {group.isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  )}
                  {group.color && (
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: group.color }}
                    />
                  )}
                  <span className="text-sm font-medium text-foreground">
                    {group.label}
                  </span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {group.items.length}
                  </span>
                </button>

                {/* Group items */}
                {group.isExpanded && (
                  <div>
                    {group.items.map((item, idx) => {
                      const globalIndex = items.findIndex(i => i.id === item.id);
                      return (
                        <RoadmapListRow
                          key={item.id}
                          item={item}
                          index={globalIndex}
                          isFocused={focusedIndex === globalIndex}
                          isSelected={selectedItemId === item.id}
                          onClick={() => onItemClick(item.id)}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    );
  }

  // Flat list view
  return (
    <div 
      className="border-r border-border bg-card flex-shrink-0 flex flex-col"
      style={{ width: listWidth }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Demands
        </span>
        <span className="text-xs text-muted-foreground">
          {items.length} items
        </span>
      </div>

      <ScrollArea className="flex-1">
        <div role="table" data-roadmap-container>
          {items.map((item, index) => (
            <RoadmapListRow
              key={item.id}
              item={item}
              index={index}
              isFocused={focusedIndex === index}
              isSelected={selectedItemId === item.id}
              onClick={() => onItemClick(item.id)}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
