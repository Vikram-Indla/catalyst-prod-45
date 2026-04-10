// useBoardMutations — create, update, delete, star board
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, typedQuery, typedQuery, typedQuery } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { CreateBoardInput, BoardVisibility, SwimlaneType } from '@/types/board';

export function useCreateBoard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateBoardInput) => {
      const { data, error } = await typedRpc('create_board', {
        p_name: input.name,
        p_project_id: input.projectId ?? null,
        p_is_personal: input.isPersonal ?? false,
        p_visibility: input.visibility ?? 'project',
        p_swimlane_type: input.swimlaneType ?? 'none',
        p_color: input.color ?? '#2563EB',
        p_columns: input.columns ? JSON.stringify(input.columns) : null,
        p_user_id: null,
      });
      if (error) throw error;
      return { boardId: data as string, name: input.name, projectId: input.projectId };
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['boards', result.projectId] });
      toast.success(`"${result.name}" board created`);
    },
    onError: (err: Error) => {
      toast.error(`Failed to create board: ${err.message}`);
    },
  });
}

export function useUpdateBoard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ boardId, projectId, ...fields }: {
      boardId: string;
      projectId?: string;
      name?: string;
      description?: string | null;
      color?: string;
      visibility?: BoardVisibility;
      swimlane_type?: SwimlaneType;
      show_swimlanes?: boolean;
    }) => {
      const update: Record<string, any> = { updated_at: new Date().toISOString() };
      if (fields.name !== undefined) update.name = fields.name;
      if (fields.description !== undefined) update.description = fields.description;
      if (fields.color !== undefined) update.color = fields.color;
      if (fields.visibility !== undefined) update.visibility = fields.visibility;
      if (fields.swimlane_type !== undefined) update.swimlane_type = fields.swimlane_type;
      if (fields.show_swimlanes !== undefined) update.show_swimlanes = fields.show_swimlanes;

      const { error } = await typedQuery('boards')
        .update(update)
        .eq('id', boardId);
      if (error) throw error;
      return { boardId, projectId };
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['board', result.boardId] });
      if (result.projectId) qc.invalidateQueries({ queryKey: ['boards', result.projectId] });
      toast.success('Board settings saved');
    },
    onError: (err: Error) => {
      toast.error(`Failed to save: ${err.message}`);
    },
  });
}

export function useDeleteBoard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ boardId, projectId }: { boardId: string; projectId: string }) => {
      const { error } = await typedQuery('boards')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', boardId);
      if (error) throw error;
      return { projectId };
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['boards', vars.projectId] });
      toast.success('Board deleted');
    },
    onError: (err: Error) => {
      toast.error(`Failed to delete board: ${err.message}`);
    },
  });
}

export function useToggleBoardStar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ boardId, projectId, isStarred }: { boardId: string; projectId: string; isStarred: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Upsert board_members row
      const { error } = await typedQuery('board_members')
        .upsert({
          board_id: boardId,
          user_id: user.id,
          is_starred: isStarred,
          role: 'viewer',
        }, { onConflict: 'board_id,user_id' });
      if (error) throw error;
      return { projectId };
    },
    onMutate: async ({ boardId, projectId, isStarred }) => {
      await qc.cancelQueries({ queryKey: ['boards', projectId] });
      const prev = qc.getQueryData(['boards', projectId]);
      qc.setQueryData(['boards', projectId], (old: any) => {
        if (!Array.isArray(old)) return old;
        return old.map((b: any) => b.id === boardId ? { ...b, isStarred } : b);
      });
      return { prev, projectId };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(['boards', ctx.projectId], ctx.prev);
      toast.error('Failed to update star');
    },
    onSettled: (_d, _e, vars) => {
      qc.invalidateQueries({ queryKey: ['boards', vars.projectId] });
    },
  });
}

export function useUpdateBoardLastViewed() {
  return useMutation({
    mutationFn: async (boardId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      // Update board_members last_viewed_at
      await typedQuery('board_members')
        .upsert({
          board_id: boardId,
          user_id: user.id,
          last_viewed_at: new Date().toISOString(),
          role: 'viewer',
        }, { onConflict: 'board_id,user_id' });
      // Also update boards.last_viewed_at
      await typedQuery('boards')
        .update({ last_viewed_at: new Date().toISOString() })
        .eq('id', boardId);
    },
  });
}

// Column mutations
export function useAddColumn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ boardId, name, position }: { boardId: string; name: string; position: number }) => {
      const { error } = await typedQuery('board_columns')
        .insert({ board_id: boardId, name, position, status_ids: [] });
      if (error) throw error;
      return { boardId };
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['board', r.boardId] });
      toast.success('Column added');
    },
    onError: (err: Error) => toast.error(`Failed to add column: ${err.message}`),
  });
}

export function useUpdateColumn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ columnId, boardId, ...fields }: {
      columnId: string; boardId: string;
      name?: string; position?: number; status_ids?: string[];
    }) => {
      const update: Record<string, any> = { updated_at: new Date().toISOString() };
      if (fields.name !== undefined) update.name = fields.name;
      if (fields.position !== undefined) update.position = fields.position;
      if (fields.status_ids !== undefined) update.status_ids = fields.status_ids;
      const { error } = await typedQuery('board_columns')
        .update(update)
        .eq('id', columnId);
      if (error) throw error;
      return { boardId };
    },
    onSuccess: (r) => qc.invalidateQueries({ queryKey: ['board', r.boardId] }),
    onError: (err: Error) => toast.error(`Failed to update column: ${err.message}`),
  });
}

export function useDeleteColumn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ columnId, boardId }: { columnId: string; boardId: string }) => {
      const { error } = await typedQuery('board_columns')
        .delete()
        .eq('id', columnId);
      if (error) throw error;
      return { boardId };
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['board', r.boardId] });
      toast.success('Column removed');
    },
    onError: (err: Error) => toast.error(`Failed to remove column: ${err.message}`),
  });
}

// Card rank mutation for DnD
export function useUpdateCardRank() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ boardId, workItemId, columnId, rankValue }: {
      boardId: string; workItemId: string; columnId: string; rankValue: string;
    }) => {
      const { error } = await typedQuery('board_issue_rank')
        .upsert({
          board_id: boardId,
          work_item_id: workItemId,
          column_id: columnId,
          rank_value: rankValue,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'board_id,work_item_id' });
      if (error) throw error;
      return { boardId };
    },
    onSettled: (r) => {
      if (r?.boardId) {
        setTimeout(() => qc.invalidateQueries({ queryKey: ['board-cards', r.boardId] }), 300);
      }
    },
    onError: (err: Error) => toast.error(`Failed to update card position: ${err.message}`),
  });
}

export function useBoardMutations() {
  const createBoard = useCreateBoard();
  const deleteBoard = useDeleteBoard();
  return { createBoard, deleteBoard };
}
