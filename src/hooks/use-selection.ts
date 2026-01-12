/**
 * useSelection — Generic selection state hook for list/grid items
 */

import { useState, useCallback, useMemo } from 'react';

interface UseSelectionOptions<T> {
  items: T[];
  getId: (item: T) => string;
}

export function useSelection<T>({ items, getId }: UseSelectionOptions<T>) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(items.map(getId)));
  }, [items, getId]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const toggleAll = useCallback((checked: boolean) => {
    if (checked) {
      selectAll();
    } else {
      clearSelection();
    }
  }, [selectAll, clearSelection]);

  const toggle = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const select = useCallback((id: string) => {
    setSelectedIds(prev => new Set(prev).add(id));
  }, []);

  const deselect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const isSelected = useCallback((id: string) => selectedIds.has(id), [selectedIds]);

  const allSelected = useMemo(() => 
    items.length > 0 && items.every(item => selectedIds.has(getId(item))),
    [items, selectedIds, getId]
  );

  const someSelected = useMemo(() => 
    items.some(item => selectedIds.has(getId(item))) && !allSelected,
    [items, selectedIds, getId, allSelected]
  );

  const selectedItems = useMemo(() => 
    items.filter(item => selectedIds.has(getId(item))),
    [items, selectedIds, getId]
  );

  const count = selectedIds.size;

  return {
    selectedIds,
    selectedItems,
    count,
    selectAll,
    clearSelection,
    toggleAll,
    toggle,
    select,
    deselect,
    isSelected,
    allSelected,
    someSelected,
  };
}
