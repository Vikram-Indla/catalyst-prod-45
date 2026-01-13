// ============================================================
// RESULTS TREE ITEM COMPONENT
// Hierarchical work item display with expand/collapse
// ============================================================

import React, { useState } from 'react';
import { ChevronRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStore, type WorkItem } from '@/stores/requirementAssistStore';

interface ResultsTreeItemProps {
  item: WorkItem;
  allItems: WorkItem[];
  programCode: string;
  projectCode: string;
  level?: number;
  onItemClick?: (item: WorkItem) => void;
  style?: React.CSSProperties;
}

const BADGE_COLORS: Record<string, string> = {
  epic: 'bg-violet-100 text-violet-700',
  feature: 'bg-teal-100 text-teal-700',
  story: 'bg-emerald-100 text-emerald-700',
};

export function ResultsTreeItem({ 
  item, 
  allItems, 
  programCode, 
  projectCode, 
  level = 0,
  onItemClick,
  style
}: ResultsTreeItemProps) {
  const [expanded, setExpanded] = useState(level === 0);
  const { toggleItemSelection } = useStore();
  
  const children = allItems.filter(i => i.parentId === item.id);
  
  // Display ID: Use the actual display_id from DB (already sequential)
  const displayId = item.displayId;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded(!expanded);
  };

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleItemSelection(item.id);
  };

  return (
    <div style={style}>
      <div
        className={cn(
          "flex items-center gap-2 py-2 px-3 rounded-lg cursor-pointer transition-colors group",
          item.isSelected ? "bg-blue-50" : "hover:bg-slate-50",
          level > 0 && "ml-6"
        )}
        onClick={(e) => {
          handleSelect(e);
          onItemClick?.(item);
        }}
      >
        {/* Expand/Collapse */}
        {children.length > 0 ? (
          <button
            onClick={handleToggle}
            className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-slate-600"
          >
            <ChevronRight className={cn("w-4 h-4 transition-transform", expanded && "rotate-90")} />
          </button>
        ) : (
          <span className="w-5" />
        )}

        {/* Selection Checkbox */}
        <div
          className={cn(
            "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
            item.isSelected 
              ? "bg-blue-600 border-blue-600" 
              : "border-slate-300 group-hover:border-slate-400"
          )}
        >
          {item.isSelected && <Check className="w-3 h-3 text-white" />}
        </div>

        {/* Type Badge */}
        <span className={cn(
          "px-2 py-0.5 rounded text-xs font-medium capitalize",
          BADGE_COLORS[item.itemType] || 'bg-slate-100 text-slate-700'
        )}>
          {item.itemType}
        </span>

        {/* Display ID */}
        <span className="text-xs font-mono text-slate-400">{displayId}</span>

        {/* Title */}
        <span className="flex-1 text-sm text-slate-900 truncate">{item.title}</span>

        {/* Children Count */}
        {children.length > 0 && (
          <span className="text-xs text-slate-400">
            ({children.length} {item.itemType === 'epic' ? 'features' : 'stories'})
          </span>
        )}

        {/* Confidence Score (for stories) */}
        {item.itemType === 'story' && item.confidenceScore > 0 && (
          <span className={cn(
            "text-xs font-medium",
            item.confidenceScore >= 0.8 ? "text-emerald-600" :
            item.confidenceScore >= 0.5 ? "text-amber-600" : "text-red-600"
          )}>
            ({Math.round(item.confidenceScore * 100)}%)
          </span>
        )}

        {/* Published Badge */}
        {item.isPublished && (
          <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">
            Published
          </span>
        )}
      </div>

      {expanded && children.length > 0 && (
        <div className="border-l border-slate-200 ml-5">
          {children.map(child => (
            <ResultsTreeItem
              key={child.id}
              item={child}
              allItems={allItems}
              programCode={programCode}
              projectCode={projectCode}
              level={level + 1}
              onItemClick={onItemClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}
