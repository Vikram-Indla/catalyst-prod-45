import { describe, it, expect } from 'vitest';
import { DEFAULT_BOARD_FILTERS, BOARD_COLUMN_WIDTH, SEARCH_DEBOUNCE_MS, STALE_TIME_MS, CARD_SKELETON_H, PREFS_DEBOUNCE_MS } from '../constants/kanban';
import type { PhBoard, PhBoardColumn, BoardIssue, DragState, BoardFilters, Swimlane } from '../types/kanban';

describe('Kanban constants', () => {
  it('BOARD_COLUMN_WIDTH is 272', () => {
    expect(BOARD_COLUMN_WIDTH).toBe(272);
  });

  it('SEARCH_DEBOUNCE_MS is 250', () => {
    expect(SEARCH_DEBOUNCE_MS).toBe(250);
  });

  it('STALE_TIME_MS is 30000', () => {
    expect(STALE_TIME_MS).toBe(30_000);
  });

  it('CARD_SKELETON_H is 88', () => {
    expect(CARD_SKELETON_H).toBe(88);
  });

  it('PREFS_DEBOUNCE_MS is 1000', () => {
    expect(PREFS_DEBOUNCE_MS).toBe(1000);
  });

  it('DEFAULT_BOARD_FILTERS has correct shape', () => {
    expect(DEFAULT_BOARD_FILTERS).toEqual({
      search: '',
      epicId: null,
      type: null,
      assigneeId: null,
      quickFilter: null,
    });
  });
});

describe('Kanban types compile correctly', () => {
  it('DragState includes sourceEpicId', () => {
    const ds: DragState = {
      draggingId: null,
      sourceColumnId: null,
      sourceEpicId: null,
      targetColumnId: null,
    };
    expect(ds.sourceEpicId).toBeNull();
  });

  it('BoardIssue type supports all work item types', () => {
    const types: BoardIssue['type'][] = ['Story', 'Task', 'Bug', 'Epic', 'Improvement', 'New Feature', 'Subtask'];
    expect(types).toHaveLength(7);
  });

  it('BoardIssue type supports all priorities', () => {
    const priorities: BoardIssue['priority'][] = ['Highest', 'High', 'Medium', 'Low', 'Lowest'];
    expect(priorities).toHaveLength(5);
  });

  it('BoardFilters quickFilter allows mine, unassigned, recently_updated', () => {
    const filters: BoardFilters[] = [
      { ...DEFAULT_BOARD_FILTERS, quickFilter: 'mine' },
      { ...DEFAULT_BOARD_FILTERS, quickFilter: 'unassigned' },
      { ...DEFAULT_BOARD_FILTERS, quickFilter: 'recently_updated' },
      { ...DEFAULT_BOARD_FILTERS, quickFilter: null },
    ];
    expect(filters).toHaveLength(4);
  });

  it('PhBoardColumn has wipLimit and isDoneColumn', () => {
    const col: PhBoardColumn = {
      id: 'col-1',
      boardId: 'board-1',
      name: 'In Progress',
      statusMapping: ['in-progress'],
      position: 1,
      wipLimit: 5,
      isDoneColumn: false,
    };
    expect(col.wipLimit).toBe(5);
    expect(col.isDoneColumn).toBe(false);
  });
});
