// ============================================================
// TREE ITEM COMPONENT
// Individual item in the work item tree
// ============================================================

import React from 'react';
import { useStore, type WorkItem } from '@/stores/requirementAssistStore';
import { ChevronRight, ChevronDown, Square, CheckSquare } from 'lucide-react';

interface TreeItemProps {
  item: WorkItem;
  level: number;
  isSelected: boolean;
  isExpanded: boolean;
  onSelect: () => void;
  onToggleExpand: () => void;
  showChildren?: boolean;
}

export function TreeItem({ 
  item, 
  level, 
  isSelected, 
  isExpanded, 
  onSelect, 
  onToggleExpand,
  showChildren = true,
}: TreeItemProps) {
  const { expandedIds, selectItem, toggleExpanded, toggleItemSelection } = useStore();
  
  const hasChildren = item.children && item.children.length > 0;
  const canExpand = hasChildren && showChildren;

  // Badge colors
  const badgeConfig: Record<string, { bg: string; text: string; border: string }> = {
    epic: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
    feature: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    story: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  };

  const badge = badgeConfig[item.itemType] || { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200' };

  // Confidence color
  const confidenceColor = 
    item.confidenceScore >= 0.9 ? 'text-green-600' :
    item.confidenceScore >= 0.8 ? 'text-amber-600' :
    'text-red-600';

  return (
    <>
      <div
        className={`
          group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer
          transition-colors duration-100
          ${isSelected 
            ? 'bg-primary/5 border border-primary/20' 
            : 'hover:bg-slate-100 border border-transparent'
          }
        `}
        style={{ marginLeft: `${level * 20}px` }}
        onClick={onSelect}
      >
        {/* Expand/Collapse Toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand();
          }}
          className={`p-0.5 rounded hover:bg-slate-200 ${canExpand ? 'visible' : 'invisible'}`}
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {/* Selection Checkbox */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleItemSelection(item.id);
          }}
          className="p-0.5 rounded hover:bg-slate-200"
        >
          {item.isSelected ? (
            <CheckSquare className="w-4 h-4 text-primary" />
          ) : (
            <Square className="w-4 h-4 text-slate-300" />
          )}
        </button>

        {/* Type Badge */}
        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase border ${badge.bg} ${badge.text} ${badge.border}`}>
          {item.displayId}
        </span>

        {/* Title */}
        <span className={`flex-1 text-sm truncate ${isSelected ? 'text-slate-900 font-medium' : 'text-slate-700'}`}>
          {item.title}
        </span>

        {/* Confidence Score */}
        <span className={`text-xs font-medium ${confidenceColor} opacity-0 group-hover:opacity-100 transition-opacity`}>
          {Math.round(item.confidenceScore * 100)}%
        </span>

        {/* Children Count */}
        {hasChildren && (
          <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
            {item.children!.length}
          </span>
        )}
      </div>

      {/* Render Children */}
      {canExpand && isExpanded && (
        <div className="relative">
          {/* Connector Line */}
          <div 
            className="absolute left-[26px] top-0 bottom-0 w-px bg-slate-200"
            style={{ marginLeft: `${level * 20}px` }}
          />
          
          {item.children!.map((child) => (
            <TreeItem
              key={child.id}
              item={child}
              level={level + 1}
              isSelected={child.id === useStore.getState().selectedItemId}
              isExpanded={expandedIds.has(child.id)}
              onSelect={() => selectItem(child.id)}
              onToggleExpand={() => toggleExpanded(child.id)}
              showChildren={showChildren}
            />
          ))}
        </div>
      )}
    </>
  );
}
