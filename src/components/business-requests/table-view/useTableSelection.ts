import { useState, useCallback, useMemo } from 'react';

export function useTableSelection<T extends { id: string }>(items: T[] = []) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelection = useCallback((id: string) => {
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

  const toggleAll = useCallback(() => {
    setSelectedIds(prev => {
      if (prev.size === items.length) {
        return new Set();
      }
      return new Set(items.map(item => item.id));
    });
  }, [items]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const isAllSelected = useMemo(() => 
    items.length > 0 && selectedIds.size === items.length,
    [items.length, selectedIds.size]
  );

  const isIndeterminate = useMemo(() => 
    selectedIds.size > 0 && selectedIds.size < items.length,
    [selectedIds.size, items.length]
  );

  return {
    selectedIds,
    isAllSelected,
    isIndeterminate,
    toggleSelection,
    toggleAll,
    clearSelection,
    selectedCount: selectedIds.size
  };
}
