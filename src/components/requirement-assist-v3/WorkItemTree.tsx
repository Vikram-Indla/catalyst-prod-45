// ============================================================
// WORK ITEM TREE COMPONENT
// Hierarchical tree view of generated work items
// ============================================================

import React from 'react';
import { useStore, selectFilteredWorkItems } from '@/stores/requirementAssistStore';
import { TreeItem } from './TreeItem';

export function WorkItemTree() {
  const { 
    workItemsTree, 
    selectedItemId, 
    expandedIds,
    filterType,
    selectItem,
    toggleExpanded,
  } = useStore();
  
  const filteredItems = useStore(selectFilteredWorkItems);

  // If filtering, show flat list; otherwise show tree
  const displayItems = filterType === 'all' ? workItemsTree : filteredItems;
  const isFlat = filterType !== 'all';

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="space-y-0.5">
        {displayItems.map((item) => (
          <TreeItem
            key={item.id}
            item={item}
            level={isFlat ? 0 : item.level}
            isSelected={item.id === selectedItemId}
            isExpanded={expandedIds.has(item.id)}
            onSelect={() => selectItem(item.id)}
            onToggleExpand={() => toggleExpanded(item.id)}
            showChildren={!isFlat}
          />
        ))}
      </div>
    </div>
  );
}
