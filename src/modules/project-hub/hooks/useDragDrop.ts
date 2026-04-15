import type { DragState, MoveResult } from '../types/kanban';

export const useDragDrop = (_boardId: string, _userId: string) => ({
  dragState: {
    draggingId: null,
    sourceColumnId: null,
    targetColumnId: null,
  } as DragState,
  onDragStart: (_issueId: string, _colId: string) => {},
  onDragEnd: () => {},
  onDrop: async (_colId: string): Promise<MoveResult> => ({ success: false }),
});
