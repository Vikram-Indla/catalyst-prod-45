// ============================================================
// TREE ITEM COMPONENT - ENHANCED
// Gradient badges, connector lines, hover confidence
// ============================================================

import React from 'react';
import { useStore, type WorkItem } from '@/stores/requirementAssistStore';
import { ChevronRight, ChevronDown, Square, CheckSquare, Check } from 'lucide-react';
import { formatConfidencePercent, getConfidenceColor, isPublishable } from '@/utils/requirementAssistDisplayId';

interface TreeItemProps {
  item: WorkItem;
  level: number;
  isSelected: boolean;
  isExpanded: boolean;
  onSelect: () => void;
  onToggleExpand: () => void;
  showChildren?: boolean;
}

// Gradient badge configuration
const badgeConfig = {
  prd: {
    gradient: 'bg-gradient-to-r from-slate-500 to-slate-600',
    shadow: 'shadow-sm',
  },
  epic: {
    gradient: 'bg-gradient-to-r from-violet-500 to-purple-600',
    shadow: 'shadow-ra-badge-epic',
  },
  feature: {
    gradient: 'bg-gradient-to-r from-teal-500 to-teal-600',
    shadow: 'shadow-ra-badge-feature',
  },
  story: {
    gradient: 'bg-gradient-to-r from-emerald-500 to-green-600',
    shadow: 'shadow-ra-badge-story',
  },
};

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
  const badge = badgeConfig[item.itemType as keyof typeof badgeConfig] || badgeConfig.story;

  // FIX #1: Use utility function for correct confidence display
  const confidencePercent = formatConfidencePercent(item.confidenceScore);
  const confidenceColor = getConfidenceColor(confidencePercent);
  
  // FIX #3 & #4: Check if item is publishable and published state
  const canPublish = isPublishable(item);
  const isPRD = item.itemType === 'prd';

  // If item is published, show as disabled with green badge
  if (item.isPublished) {
    return (
      <div
        className="group relative flex items-center gap-2 px-3 py-2.5 rounded-xl opacity-60 cursor-default"
        style={{ marginLeft: `${level * 24}px` }}
      >
        {/* Expand placeholder for alignment */}
        <div className="w-6" />
        
        {/* Published checkmark */}
        <div className="p-0.5 rounded">
          <Check className="w-4 h-4 text-emerald-500" />
        </div>

        {/* Badge with permanent ID */}
        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide text-white bg-emerald-500 shadow-sm">
          {item.displayId}
        </span>

        {/* Title */}
        <span className="flex-1 text-sm text-slate-500 truncate line-through">
          {item.title}
        </span>

        {/* Published badge */}
        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded">
          Published
        </span>
      </div>
    );
  }

  return (
    <>
      <div
        className={`
          group relative flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer
          transition-all duration-150 ease-out
          ${isSelected 
            ? 'bg-blue-50 ring-2 ring-blue-200 shadow-sm' 
            : 'hover:bg-slate-50 hover:shadow-sm'
          }
          ${isPRD ? 'opacity-75' : ''}
        `}
        style={{ marginLeft: `${level * 24}px` }}
        onClick={onSelect}
      >
        {/* Connector Line */}
        {level > 0 && (
          <>
            <div 
              className="absolute left-0 top-1/2 w-4 h-px bg-slate-200"
              style={{ left: `-12px` }}
            />
            <div 
              className="absolute left-0 top-0 w-px h-1/2 bg-slate-200"
              style={{ left: `-12px` }}
            />
          </>
        )}

        {/* Expand/Collapse */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand();
          }}
          className={`
            p-1 rounded-md transition-colors
            ${canExpand ? 'hover:bg-slate-200 visible' : 'invisible'}
          `}
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {/* Checkbox - Only show for publishable items */}
        {canPublish ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleItemSelection(item.id);
            }}
            className="p-0.5 rounded transition-colors hover:bg-slate-200"
          >
            {item.isSelected ? (
              <CheckSquare className="w-4 h-4 text-blue-600" />
            ) : (
              <Square className="w-4 h-4 text-slate-300 group-hover:text-slate-400" />
            )}
          </button>
        ) : (
          <div className="w-5" /> // Placeholder for alignment
        )}

        {/* Badge with Gradient */}
        <span className={`
          px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide
          text-white ${badge.gradient} ${badge.shadow}
        `}>
          {item.displayId}
        </span>

        {/* Title */}
        <span className={`
          flex-1 text-sm truncate
          ${isSelected ? 'text-slate-900 font-medium' : 'text-slate-700'}
        `}>
          {item.title}
        </span>

        {/* PRD indicator */}
        {isPRD && (
          <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-xs font-medium rounded">
            Source
          </span>
        )}

        {/* Confidence (on hover) - not for PRD */}
        {!isPRD && (
          <span className={`
            px-2 py-0.5 rounded-full text-xs font-semibold
            opacity-0 group-hover:opacity-100 transition-opacity
            ${confidenceColor}
          `}>
            {confidencePercent}%
          </span>
        )}

        {/* Children Count */}
        {hasChildren && (
          <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-xs font-medium">
            {item.children!.length}
          </span>
        )}
      </div>

      {/* Children */}
      {canExpand && isExpanded && (
        <div className="relative">
          {/* Vertical connector */}
          <div 
            className="absolute w-px bg-slate-200"
            style={{ 
              left: `${(level * 24) + 14}px`,
              top: 0,
              bottom: 12,
            }}
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
