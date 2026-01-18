/**
 * Hook for managing test case selection state
 * Handles selection, deselection, bulk operations, and computed stats
 */

import { useState, useCallback, useMemo } from 'react';
import { TMTestCase } from '@/types/test-management';
import type { UseTestCaseSelectionReturn } from '../types';

export function useTestCaseSelection(
  existingTestCaseIds: string[],
  allTestCases: TMTestCase[]
): UseTestCaseSelectionReturn {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Memoize existing set for O(1) lookups
  const existingSet = useMemo(
    () => new Set(existingTestCaseIds),
    [existingTestCaseIds]
  );

  const isAlreadyInCycle = useCallback(
    (id: string) => existingSet.has(id),
    [existingSet]
  );

  const isSelected = useCallback(
    (id: string) => selectedIds.has(id),
    [selectedIds]
  );

  const select = useCallback((id: string) => {
    if (existingSet.has(id)) return; // Can't add duplicates
    setSelectedIds(prev => new Set([...prev, id]));
  }, [existingSet]);

  const deselect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const toggle = useCallback((id: string) => {
    if (existingSet.has(id)) return;
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, [existingSet]);

  const selectMultiple = useCallback((ids: string[]) => {
    const validIds = ids.filter(id => !existingSet.has(id));
    setSelectedIds(prev => new Set([...prev, ...validIds]));
  }, [existingSet]);

  const deselectMultiple = useCallback((ids: string[]) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      ids.forEach(id => next.delete(id));
      return next;
    });
  }, []);

  const selectAll = useCallback((ids: string[]) => {
    const validIds = ids.filter(id => !existingSet.has(id));
    setSelectedIds(new Set(validIds));
  }, [existingSet]);

  const selectFolder = useCallback((folderId: string, testCases: TMTestCase[]) => {
    const folderCases = testCases
      .filter(tc => tc.folder_id === folderId && !existingSet.has(tc.id));
    setSelectedIds(prev => new Set([...prev, ...folderCases.map(tc => tc.id)]));
  }, [existingSet]);

  const clear = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // Compute selected test cases
  const selectedTestCases = useMemo(() => {
    return allTestCases.filter(tc => selectedIds.has(tc.id));
  }, [allTestCases, selectedIds]);

  // Compute estimated time
  const estimatedTime = useMemo(() => {
    return selectedTestCases.reduce((sum, tc) => {
      // Assume 15 minutes per test case if no estimate
      return sum + 15;
    }, 0);
  }, [selectedTestCases]);

  // Compute priority breakdown
  const priorityBreakdown = useMemo(() => {
    const breakdown = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    selectedTestCases.forEach(tc => {
      const priorityName = tc.priority?.name?.toLowerCase() || 'medium';
      if (priorityName.includes('critical')) {
        breakdown.critical++;
      } else if (priorityName.includes('high')) {
        breakdown.high++;
      } else if (priorityName.includes('low')) {
        breakdown.low++;
      } else {
        breakdown.medium++;
      }
    });

    return breakdown;
  }, [selectedTestCases]);

  return {
    selectedIds,
    selectedTestCases,
    toggle,
    select,
    deselect,
    selectMultiple,
    deselectMultiple,
    selectAll,
    selectFolder,
    clear,
    count: selectedIds.size,
    estimatedTime,
    priorityBreakdown,
    isSelected,
    isAlreadyInCycle,
  };
}
