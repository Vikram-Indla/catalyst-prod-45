import type { BoardFilters } from '../types/kanban';

export const BOARD_COLUMN_WIDTH = 272;
export const SEARCH_DEBOUNCE_MS = 250;
export const PREFS_DEBOUNCE_MS = 1000;
export const STALE_TIME_MS = 30_000;
export const CARD_SKELETON_H = 88;
export const DRAWER_WIDTH = 560;

export const DEFAULT_BOARD_FILTERS: BoardFilters = {
  search: '',
  epicId: null,
  type: null,
  assigneeId: null,
  quickFilter: null,
};
