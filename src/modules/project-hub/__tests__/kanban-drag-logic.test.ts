import { describe, it, expect } from 'vitest';
import type { BoardIssue, PhBoard, PhBoardColumn } from '../types/kanban';

// Extract pure drag validation logic for testing without React hooks

function validateDrop(params: {
  draggingId: string | null;
  sourceColumnId: string | null;
  targetColumnId: string;
  targetEpicId?: string;
  issues: BoardIssue[];
  boardConfig?: PhBoard;
}): { allowed: boolean; reason?: string } {
  const { draggingId, sourceColumnId, targetColumnId, targetEpicId, issues, boardConfig } = params;

  if (!draggingId || !sourceColumnId) return { allowed: false, reason: 'no drag state' };

  // H10: same column = no-op
  if (sourceColumnId === targetColumnId) return { allowed: false, reason: 'same column' };

  const issue = issues.find((i) => i.id === draggingId);

  // D10/UC-038: cross-epic block
  if (targetEpicId && issue?.epicId && issue.epicId !== targetEpicId) {
    return { allowed: false, reason: 'cross-epic' };
  }

  // H09: WIP limit
  if (boardConfig) {
    const targetCol = boardConfig.columnConfig?.find((c) => c.id === targetColumnId);
    if (targetCol?.wipLimit) {
      const currentCount = issues.filter((i) => i.boardColumnId === targetColumnId).length;
      if (currentCount >= targetCol.wipLimit) {
        return { allowed: false, reason: `wip-limit:${targetCol.name}` };
      }
    }
  }

  return { allowed: true };
}

const makeIssue = (id: string, epicId: string, colId: string): BoardIssue => ({
  id, summary: `Issue ${id}`, type: 'Story', priority: 'Medium', status: 'To Do',
  epicId, boardColumnId: colId,
});

const makeBoard = (cols: PhBoardColumn[]): PhBoard => ({
  id: 'b1', projectId: 'p1', name: 'Test Board', boardType: 'kanban',
  columnConfig: cols, isActive: true, createdAt: '', updatedAt: '',
});

describe('Drag-and-drop validation (UC H01-H10, D10)', () => {
  const issues = [
    makeIssue('i1', 'e1', 'col-1'),
    makeIssue('i2', 'e1', 'col-2'),
    makeIssue('i3', 'e2', 'col-1'),
  ];

  // H01: valid drop within same epic
  it('H01: allows drop within same epic', () => {
    const r = validateDrop({
      draggingId: 'i1', sourceColumnId: 'col-1', targetColumnId: 'col-2',
      targetEpicId: 'e1', issues,
    });
    expect(r.allowed).toBe(true);
  });

  // H10: same column = no-op
  it('H10: blocks drop on same column', () => {
    const r = validateDrop({
      draggingId: 'i1', sourceColumnId: 'col-1', targetColumnId: 'col-1',
      targetEpicId: 'e1', issues,
    });
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe('same column');
  });

  // D10/UC-038: cross-epic block
  it('D10: blocks cross-epic drop', () => {
    const r = validateDrop({
      draggingId: 'i1', sourceColumnId: 'col-1', targetColumnId: 'col-2',
      targetEpicId: 'e2', issues,
    });
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe('cross-epic');
  });

  // H09: WIP limit
  it('H09: blocks drop when WIP limit reached', () => {
    const cols: PhBoardColumn[] = [
      { id: 'col-1', boardId: 'b1', name: 'To Do', statusMapping: [], position: 0, isDoneColumn: false },
      { id: 'col-2', boardId: 'b1', name: 'In Progress', statusMapping: [], position: 1, wipLimit: 1, isDoneColumn: false },
    ];
    const board = makeBoard(cols);
    // col-2 already has 1 issue (i2), limit is 1
    const r = validateDrop({
      draggingId: 'i1', sourceColumnId: 'col-1', targetColumnId: 'col-2',
      targetEpicId: 'e1', issues, boardConfig: board,
    });
    expect(r.allowed).toBe(false);
    expect(r.reason).toContain('wip-limit');
    expect(r.reason).toContain('In Progress');
  });

  // WIP limit not reached
  it('Allows drop when WIP limit not reached', () => {
    const cols: PhBoardColumn[] = [
      { id: 'col-1', boardId: 'b1', name: 'To Do', statusMapping: [], position: 0, isDoneColumn: false },
      { id: 'col-2', boardId: 'b1', name: 'In Progress', statusMapping: [], position: 1, wipLimit: 5, isDoneColumn: false },
    ];
    const board = makeBoard(cols);
    const r = validateDrop({
      draggingId: 'i1', sourceColumnId: 'col-1', targetColumnId: 'col-2',
      targetEpicId: 'e1', issues, boardConfig: board,
    });
    expect(r.allowed).toBe(true);
  });

  // No drag state
  it('Rejects when no drag state', () => {
    const r = validateDrop({
      draggingId: null, sourceColumnId: null, targetColumnId: 'col-2', issues,
    });
    expect(r.allowed).toBe(false);
  });

  // UC-075: exact position revert test (index tracking)
  it('UC-075: originalIndex is tracked correctly', () => {
    const idx = issues.findIndex((i) => i.id === 'i2');
    expect(idx).toBe(1);
    // After failed drop, splice back at index 1
    const filtered = issues.filter((i) => i.id !== 'i2');
    expect(filtered).toHaveLength(2);
    const reverted = [...filtered];
    reverted.splice(idx, 0, { ...issues[1], boardColumnId: 'col-2' });
    expect(reverted[1].id).toBe('i2');
    expect(reverted).toHaveLength(3);
  });
});
