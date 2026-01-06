// Enterprise Roadmap Theme Panel (Left Side)

import { useState } from 'react';
import { ChevronRight, Layers, Target, Hexagon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RoadmapItem, ItemType } from './types';
import { statusColors, itemTypeStyles } from './utils';

interface RoadmapThemePanelProps {
  items: RoadmapItem[];
  expandedIds: Set<string>;
  selectedId: string | null;
  onToggleExpand: (id: string) => void;
  onSelectItem: (item: RoadmapItem) => void;
  searchQuery: string;
}

const typeIcons: Record<ItemType, typeof Layers> = {
  theme: Layers,
  objective: Target,
  epic: Hexagon,
};

interface ThemeRowProps {
  item: RoadmapItem;
  level: number;
  isExpanded: boolean;
  isSelected: boolean;
  onToggle: () => void;
  onSelect: () => void;
}

// Must match ROW_HEIGHT in RoadmapGanttChart.tsx
const ROW_HEIGHT = 60;

function ThemeRow({ item, level, isExpanded, isSelected, onToggle, onSelect }: ThemeRowProps) {
  const hasChildren = item.children && item.children.length > 0;
  const style = itemTypeStyles[item.type];
  const Icon = typeIcons[item.type];
  
  const indentClass = level === 0 ? '' : level === 1 ? 'pl-6' : 'pl-12';

  return (
    <div
      onClick={onSelect}
      style={{ height: ROW_HEIGHT }}
      className={cn(
        "group cursor-pointer transition-colors flex items-center",
        "hover:bg-surface-hover dark:hover:bg-[var(--hover)]",
        isSelected && "bg-[var(--row-selected)] dark:bg-[var(--row-selected)]"
      )}
    >
      <div className={cn("flex items-center gap-3 px-4 w-full", indentClass)}>
        {/* Expand Toggle */}
        {hasChildren ? (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            className="p-0.5 rounded hover:bg-muted"
          >
            <ChevronRight 
              size={14} 
              className={cn(
                "text-muted-foreground transition-transform",
                isExpanded && "rotate-90"
              )} 
            />
          </button>
        ) : (
          <div className="w-5" />
        )}

        {/* Type Icon */}
        <div className={cn("w-6 h-6 rounded flex items-center justify-center flex-shrink-0", style.iconBg)}>
          <Icon size={14} className={style.iconColor} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground font-mono">
            # {item.id.slice(0, 8)}
          </p>
          <p className="text-sm font-medium text-foreground truncate">
            {item.name}
          </p>
          {item.strategy && (
            <p className="text-xs text-muted-foreground truncate">
              {item.strategy}
            </p>
          )}
        </div>

        {/* Status Dot */}
        <div className={cn("w-2.5 h-2.5 rounded-full flex-shrink-0", statusColors[item.status]?.dot || 'bg-muted-foreground')} />
      </div>
    </div>
  );
}

export function RoadmapThemePanel({
  items,
  expandedIds,
  selectedId,
  onToggleExpand,
  onSelectItem,
  searchQuery,
}: RoadmapThemePanelProps) {
  // Filter items by search query
  const filterItems = (items: RoadmapItem[]): RoadmapItem[] => {
    if (!searchQuery) return items;
    
    const query = searchQuery.toLowerCase();
    return items.filter(item => {
      const matches = item.name.toLowerCase().includes(query) ||
        item.strategy?.toLowerCase().includes(query);
      
      // Also check children
      if (item.children) {
        const filteredChildren = filterItems(item.children);
        if (filteredChildren.length > 0) return true;
      }
      
      return matches;
    });
  };

  const filteredItems = filterItems(items);

  // Render items recursively
  const renderItems = (items: RoadmapItem[], level: number = 0) => {
    return items.map(item => {
      const isExpanded = expandedIds.has(item.id);
      const isSelected = selectedId === item.id;
      
      return (
        <div key={item.id}>
          <ThemeRow
            item={item}
            level={level}
            isExpanded={isExpanded}
            isSelected={isSelected}
            onToggle={() => onToggleExpand(item.id)}
            onSelect={() => onSelectItem(item)}
          />
          {isExpanded && item.children && item.children.length > 0 && (
            renderItems(item.children, level + 1)
          )}
        </div>
      );
    });
  };

  return (
    <div className={cn(
      "w-80 flex-shrink-0 overflow-y-auto",
      "bg-card dark:bg-[var(--bg-1)]",
      "border-r border-border"
    )}>
      {/* Header */}
      <div className={cn(
        "sticky top-0 z-10 px-4 py-3",
        "bg-muted dark:bg-[var(--bg-2)]",
        "border-b border-border"
      )}>
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            THEME
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Status
          </span>
        </div>
      </div>

      {/* Theme List - No dividers, fixed height rows handle alignment */}
      <div>
        {filteredItems.length > 0 ? (
          renderItems(filteredItems)
        ) : (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No items found
          </div>
        )}
      </div>
    </div>
  );
}
