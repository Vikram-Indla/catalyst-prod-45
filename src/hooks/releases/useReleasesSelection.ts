// =====================================================
// USE RELEASES SELECTION HOOK
// Manages selection state with shift-click range support
// =====================================================

import { useState, useCallback } from 'react';

export function useReleasesSelection(allIds: string[]) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number>(-1);
  
  const toggle = useCallback((id: string, index: number, shiftKey: boolean) => {
    setSelected(prev => {
      const next = new Set(prev);
      
      if (shiftKey && lastSelectedIndex !== -1) {
        // Range selection
        const start = Math.min(lastSelectedIndex, index);
        const end = Math.max(lastSelectedIndex, index);
        for (let i = start; i <= end; i++) {
          if (allIds[i]) {
            next.add(allIds[i]);
          }
        }
      } else {
        // Toggle single
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
      }
      
      return next;
    });
    setLastSelectedIndex(index);
  }, [allIds, lastSelectedIndex]);
  
  const toggleAll = useCallback(() => {
    setSelected(prev => {
      if (prev.size === allIds.length) {
        return new Set();
      }
      return new Set(allIds);
    });
  }, [allIds]);
  
  const clear = useCallback(() => {
    setSelected(new Set());
    setLastSelectedIndex(-1);
  }, []);
  
  const selectAllState: 'none' | 'some' | 'all' = 
    selected.size === 0 ? 'none' :
    selected.size === allIds.length ? 'all' : 'some';
  
  return {
    selected,
    toggle,
    toggleAll,
    clear,
    selectAllState,
  };
}
