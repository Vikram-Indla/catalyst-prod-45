import type { BoardUserPrefs } from '../types/kanban';

export const useBoardPrefs = (_boardId: string, _userId: string) => ({
  prefs: null as BoardUserPrefs | null,
  savePrefs: async (_p: BoardUserPrefs) => {},
});
