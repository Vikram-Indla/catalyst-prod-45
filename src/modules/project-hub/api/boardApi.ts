import type { PhBoard, BoardIssue, BoardUserPrefs, BoardAnalyticsEvent } from '../types/kanban';

export const boardApi = {
  fetchBoardConfig: async (_boardId: string): Promise<PhBoard> => {
    throw new Error('not implemented');
  },

  fetchBoardIssues: async (_boardId: string): Promise<BoardIssue[]> => {
    throw new Error('not implemented');
  },

  fetchBoardUserPrefs: async (
    _boardId: string,
    _userId: string
  ): Promise<BoardUserPrefs | null> => null,

  saveBoardUserPrefs: async (
    _boardId: string,
    _userId: string,
    _prefs: BoardUserPrefs
  ): Promise<void> => {},

  trackBoardEvent: async (_event: BoardAnalyticsEvent): Promise<void> => {},
};
