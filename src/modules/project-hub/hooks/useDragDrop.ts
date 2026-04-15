import { useState, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { moveIssueToColumn, revertIssueMove } from '../api/moveIssue';
import type { DragState, BoardIssue, MoveResult, PhBoard } from '../types/kanban';

export function useDragDrop(boardId: string, userId: string) {
  const [dragState, setDragState] = useState<DragState>({
    draggingId:     null,
    sourceColumnId: null,
    sourceEpicId:   null,
    targetColumnId: null,
  });

  // FIX 4: useRef so value persists across renders (plain object resets)
  const originalIndexRef = useRef(-1);
  const queryClient = useQueryClient();

  const onDragStart = useCallback(
    (issueId: string, sourceColumnId: string) => {
      const issues = queryClient.getQueryData<BoardIssue[]>([
        'board-issues',
        boardId,
      ]);
      originalIndexRef.current =
        issues?.findIndex((i) => i.id === issueId) ?? -1;

      setDragState({
        draggingId:     issueId,
        sourceColumnId,
        targetColumnId: null,
      });
    },
    [boardId, queryClient]
  );

  const onDragEnd = useCallback(() => {
    setDragState({
      draggingId:     null,
      sourceColumnId: null,
      targetColumnId: null,
    });
  }, []);

  const onDrop = useCallback(
    async (
      targetColumnId: string,
      targetEpicId?: string
    ): Promise<MoveResult> => {
      const { draggingId, sourceColumnId } = dragState;

      if (!draggingId || !sourceColumnId) {
        return { success: false };
      }
      if (sourceColumnId === targetColumnId) {
        setDragState((p) => ({ ...p, draggingId: null, sourceColumnId: null }));
        return { success: false };
      }

      const issues = queryClient.getQueryData<BoardIssue[]>([
        'board-issues',
        boardId,
      ]);
      const issue = issues?.find((i) => i.id === draggingId);

      // UC-038: block cross-epic drops
      if (targetEpicId && issue?.epicId && issue.epicId !== targetEpicId) {
        toast.error('Cannot move between epics', {
          description: 'Cards must stay within their epic swimlane.',
        });
        setDragState((p) => ({ ...p, draggingId: null, sourceColumnId: null }));
        return { success: false };
      }

      // CHECK 14: WIP limit enforcement
      const boardConfig = queryClient.getQueryData<PhBoard>(['board-config', boardId]);
      const targetCol = boardConfig?.columnConfig?.find((c) => c.id === targetColumnId);
      if (targetCol?.wipLimit) {
        const currentCount = (issues ?? []).filter(
          (i) => i.boardColumnId === targetColumnId
        ).length;
        if (currentCount >= targetCol.wipLimit) {
          toast.error('Column limit reached', {
            description: `"${targetCol.name}" has a WIP limit of ${targetCol.wipLimit}. Remove an issue first.`,
          });
          setDragState((p) => ({ ...p, draggingId: null, sourceColumnId: null }));
          return { success: false };
        }
      }

      // Optimistic update
      queryClient.setQueryData<BoardIssue[]>(
        ['board-issues', boardId],
        (prev) =>
          (prev ?? []).map((i) =>
            i.id === draggingId
              ? { ...i, boardColumnId: targetColumnId }
              : i
          )
      );

      setDragState({
        draggingId:     null,
        sourceColumnId: null,
        targetColumnId: null,
      });

      try {
        await moveIssueToColumn(draggingId, targetColumnId, userId);
        return { success: true };
      } catch (err) {
        await revertIssueMove(draggingId, sourceColumnId, userId);
        queryClient.setQueryData<BoardIssue[]>(
          ['board-issues', boardId],
          (prev) => {
            if (!prev) return prev;
            const next = prev.filter((i) => i.id !== draggingId);
            if (issue && originalIndexRef.current >= 0) {
              next.splice(originalIndexRef.current, 0, {
                ...issue,
                boardColumnId: sourceColumnId,
              });
            }
            return next;
          }
        );
        toast.error('Move failed', {
          description: 'Issue reverted to its original column.',
        });
        return { success: false, error: String(err) };
      }
    },
    [dragState, boardId, userId, queryClient]
  );

  return { dragState, onDragStart, onDragEnd, onDrop };
}
