/**
 * Hook for managing multi-select state in Add Tests to Cycle workflow
 */

import { useState, useCallback, useMemo } from 'react';
import type { TestCase } from '@/types/add-tests.types';

export function useTestSelection() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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

  const selectAll = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids));
  }, []);

  const selectMultiple = useCallback((ids: string[]) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      ids.forEach(id => next.add(id));
      return next;
    });
  }, []);

  const deselectAll = useCallback((ids: string[]) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      ids.forEach(id => next.delete(id));
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const isSelected = useCallback((id: string) => selectedIds.has(id), [selectedIds]);

  const getSelectionStats = useCallback((testCases: TestCase[]) => {
    const selected = testCases.filter(tc => selectedIds.has(tc.id));
    
    const totalDuration = selected.reduce((sum, tc) => 
      sum + (tc.estimated_duration_minutes || 0), 0);
    
    const byPriority = {
      critical: selected.filter(tc => tc.priority === 'critical').length,
      high: selected.filter(tc => tc.priority === 'high').length,
      medium: selected.filter(tc => tc.priority === 'medium').length,
      low: selected.filter(tc => tc.priority === 'low').length,
    };

    const byType = {
      functional: selected.filter(tc => tc.test_type === 'functional').length,
      integration: selected.filter(tc => tc.test_type === 'integration').length,
      e2e: selected.filter(tc => tc.test_type === 'e2e').length,
      performance: selected.filter(tc => tc.test_type === 'performance').length,
    };

    return {
      totalDuration,
      byPriority,
      byType,
      selected,
    };
  }, [selectedIds]);

  return {
    selectedIds,
    toggle,
    selectAll,
    selectMultiple,
    deselectAll,
    clear,
    isSelected,
    count: selectedIds.size,
    getSelectionStats,
  };
}
