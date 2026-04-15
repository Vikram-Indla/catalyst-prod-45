import type { BoardIssue } from '../types/kanban';

export const useBoardIssues = (_boardId: string) => ({
  data: [] as BoardIssue[],
  isLoading: true,
  error: null as Error | null,
});
