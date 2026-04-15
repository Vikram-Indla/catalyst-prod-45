import type { PhBoard } from '../types/kanban';

export const useBoardConfig = (_boardId: string) => ({
  data: undefined as PhBoard | undefined,
  isLoading: true,
  error: null as Error | null,
});
