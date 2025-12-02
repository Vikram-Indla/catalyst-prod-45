/**
 * CATALYST TESTS - Bulk Selection Hook
 * Manages multi-select state and keyboard shortcuts
 */

import { useState, useCallback, useEffect } from 'react';
import type { BulkSelectionState } from '@/types/bulkOperations';

export function useBulkSelection() {
  const [state, setState] = useState<BulkSelectionState>({
    selectedIds: new Set(),
    selectAll: false,
    excludedIds: new Set(),
    isEditMode: false
  });

  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);

  const toggleEditMode = useCallback(() => {
    setState(prev => ({
      ...prev,
      isEditMode: !prev.isEditMode,
      selectedIds: new Set(),
      selectAll: false,
      excludedIds: new Set()
    }));
  }, []);

  const selectCase = useCallback((id: string) => {
    setState(prev => {
      const newSelected = new Set(prev.selectedIds);
      newSelected.add(id);
      return { ...prev, selectedIds: newSelected };
    });
    setLastSelectedId(id);
  }, []);

  const deselectCase = useCallback((id: string) => {
    setState(prev => {
      const newSelected = new Set(prev.selectedIds);
      newSelected.delete(id);
      return { ...prev, selectedIds: newSelected };
    });
  }, []);

  const toggleCase = useCallback((id: string) => {
    setState(prev => {
      const newSelected = new Set(prev.selectedIds);
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
      return { ...prev, selectedIds: newSelected };
    });
    setLastSelectedId(id);
  }, []);

  const selectAll = useCallback((allIds: string[]) => {
    setState(prev => ({
      ...prev,
      selectedIds: new Set(allIds),
      selectAll: true,
      excludedIds: new Set()
    }));
  }, []);

  const deselectAll = useCallback(() => {
    setState(prev => ({
      ...prev,
      selectedIds: new Set(),
      selectAll: false,
      excludedIds: new Set()
    }));
  }, []);

  const selectRange = useCallback((startId: string, endId: string, allIds: string[]) => {
    const startIndex = allIds.indexOf(startId);
    const endIndex = allIds.indexOf(endId);
    
    if (startIndex === -1 || endIndex === -1) return;
    
    const [min, max] = [Math.min(startIndex, endIndex), Math.max(startIndex, endIndex)];
    const rangeIds = allIds.slice(min, max + 1);
    
    setState(prev => {
      const newSelected = new Set(prev.selectedIds);
      rangeIds.forEach(id => newSelected.add(id));
      return { ...prev, selectedIds: newSelected };
    });
  }, []);

  const isSelected = useCallback((id: string) => {
    return state.selectedIds.has(id);
  }, [state.selectedIds]);

  const getSelectedIds = useCallback(() => {
    return Array.from(state.selectedIds);
  }, [state.selectedIds]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!state.isEditMode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+A: Select all
      if (e.ctrlKey && e.key === 'a') {
        e.preventDefault();
        // This requires access to all IDs, which should be passed from parent
      }
      
      // Escape: Clear selection and exit edit mode
      if (e.key === 'Escape') {
        toggleEditMode();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.isEditMode, toggleEditMode]);

  return {
    ...state,
    selectedCount: state.selectedIds.size,
    lastSelectedId,
    toggleEditMode,
    selectCase,
    deselectCase,
    toggleCase,
    selectAll,
    deselectAll,
    selectRange,
    isSelected,
    getSelectedIds
  };
}
