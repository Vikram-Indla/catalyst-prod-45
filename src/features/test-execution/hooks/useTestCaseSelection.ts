/**
 * Selection Context Hook
 * Manages test case selection state for bulk operations
 */

import { useState, useCallback, useMemo } from 'react';

interface UseSelectionOptions {
  maxSelection?: number;
}

export function useTestCaseSelection(options: UseSelectionOptions = {}) {
  const { maxSelection } = options;
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const select = useCallback((id: string) => {
    setSelectedIds((prev) => {
      if (maxSelection && prev.size >= maxSelection && !prev.has(id)) {
        return prev;
      }
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, [maxSelection]);

  const deselect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const toggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (maxSelection && next.size >= maxSelection) {
          return prev;
        }
        next.add(id);
      }
      return next;
    });
  }, [maxSelection]);

  const selectAll = useCallback((ids: string[]) => {
    setSelectedIds((prev) => {
      const toAdd = maxSelection 
        ? ids.slice(0, maxSelection - prev.size)
        : ids;
      const next = new Set(prev);
      toAdd.forEach((id) => next.add(id));
      return next;
    });
  }, [maxSelection]);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const selectOnly = useCallback((ids: string[]) => {
    const toSelect = maxSelection ? ids.slice(0, maxSelection) : ids;
    setSelectedIds(new Set(toSelect));
  }, [maxSelection]);

  const isSelected = useCallback((id: string) => {
    return selectedIds.has(id);
  }, [selectedIds]);

  const toggleAll = useCallback((ids: string[]) => {
    setSelectedIds((prev) => {
      const allSelected = ids.every((id) => prev.has(id));
      if (allSelected) {
        // Deselect all provided ids
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      } else {
        // Select all provided ids
        const next = new Set(prev);
        ids.forEach((id) => {
          if (maxSelection && next.size >= maxSelection) return;
          next.add(id);
        });
        return next;
      }
    });
  }, [maxSelection]);

  const selectedArray = useMemo(() => Array.from(selectedIds), [selectedIds]);
  const count = selectedIds.size;

  return {
    selectedIds: selectedArray,
    selectedSet: selectedIds,
    count,
    select,
    deselect,
    toggle,
    selectAll,
    deselectAll,
    selectOnly,
    isSelected,
    toggleAll,
    hasSelection: count > 0,
  };
}

export type SelectionContext = ReturnType<typeof useTestCaseSelection>;
