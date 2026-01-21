/**
 * Module 3B-2: Hook for multi-select functionality
 */

import { useState, useCallback } from 'react';
import type { SelectionState } from '../types/queue-management';

export function useQueueSelection() {
  const [selection, setSelection] = useState<SelectionState>({
    selected: new Set(),
    lastSelected: null,
  });

  const toggle = useCallback((itemId: string) => {
    setSelection(prev => {
      const newSelected = new Set(prev.selected);
      if (newSelected.has(itemId)) {
        newSelected.delete(itemId);
      } else {
        newSelected.add(itemId);
      }
      return { selected: newSelected, lastSelected: itemId };
    });
  }, []);

  const select = useCallback((itemId: string) => {
    setSelection(prev => {
      const newSelected = new Set(prev.selected);
      newSelected.add(itemId);
      return { selected: newSelected, lastSelected: itemId };
    });
  }, []);

  const deselect = useCallback((itemId: string) => {
    setSelection(prev => {
      const newSelected = new Set(prev.selected);
      newSelected.delete(itemId);
      return { selected: newSelected, lastSelected: prev.lastSelected };
    });
  }, []);

  const selectAll = useCallback((itemIds: string[]) => {
    setSelection({
      selected: new Set(itemIds),
      lastSelected: itemIds[itemIds.length - 1] || null,
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelection({ selected: new Set(), lastSelected: null });
  }, []);

  const selectRange = useCallback((itemIds: string[], targetId: string) => {
    const lastId = selection.lastSelected;
    if (!lastId) {
      toggle(targetId);
      return;
    }

    const startIndex = itemIds.indexOf(lastId);
    const endIndex = itemIds.indexOf(targetId);
    
    if (startIndex === -1 || endIndex === -1) {
      toggle(targetId);
      return;
    }

    const [from, to] = startIndex < endIndex ? [startIndex, endIndex] : [endIndex, startIndex];
    const rangeIds = itemIds.slice(from, to + 1);

    setSelection(prev => {
      const newSelected = new Set(prev.selected);
      rangeIds.forEach(id => newSelected.add(id));
      return { selected: newSelected, lastSelected: targetId };
    });
  }, [selection.lastSelected, toggle]);

  const handleClick = useCallback((
    e: React.MouseEvent,
    itemId: string,
    itemIds: string[]
  ) => {
    if (e.shiftKey && selection.lastSelected) {
      selectRange(itemIds, itemId);
    } else if (e.ctrlKey || e.metaKey) {
      toggle(itemId);
    } else {
      // Single click without modifiers - toggle selection
      toggle(itemId);
    }
  }, [selection.lastSelected, selectRange, toggle]);

  return {
    selected: selection.selected,
    selectedCount: selection.selected.size,
    hasSelection: selection.selected.size > 0,
    isSelected: (id: string) => selection.selected.has(id),
    toggle,
    select,
    deselect,
    selectAll,
    clearSelection,
    selectRange,
    handleClick,
    getSelectedIds: () => Array.from(selection.selected),
  };
}
