import { useMemo } from 'react';
import type { BoardIssue, BoardFilters } from '../types/kanban';

export function useBoardSearch(
  issues: BoardIssue[],
  filters: BoardFilters
): BoardIssue[] {
  return useMemo(() => {
    let result = issues;
    const q = filters.search.trim().toLowerCase();

    if (q) {
      result = result.filter(
        (i) =>
          i.summary.toLowerCase().includes(q) ||
          i.id.toLowerCase().includes(q)
      );
    }
    if (filters.epicId) {
      result = result.filter((i) => i.epicId === filters.epicId);
    }
    if (filters.type) {
      result = result.filter((i) => i.type === filters.type);
    }
    if (filters.assigneeId) {
      result = result.filter((i) => i.assigneeId === filters.assigneeId);
    }
    if (filters.quickFilter === 'unassigned') {
      result = result.filter((i) => !i.assigneeId);
    }

    return result;
  }, [issues, filters]);
}
