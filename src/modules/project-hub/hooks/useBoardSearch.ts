import type { BoardIssue, BoardFilters } from '../types/kanban';

export const useBoardSearch = (
  _issues: BoardIssue[],
  _filters: BoardFilters
) => ({ filtered: [] as BoardIssue[] });
