// useBoardMutations — create, update, delete board
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { CreateBoardInput } from '@/types/board';

export function useCreateBoard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateBoardInput) => {
      const { data, error } = await (supabase as any).rpc('create_board', {
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
      return data as string;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['boards', vars.projectId] });
    },
  });
}

export function useDeleteBoard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ boardId, projectId }: { boardId: string; projectId: string }) => {
      const { error } = await (supabase as any)
        .from('boards')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', boardId);
      if (error) throw error;
      return { projectId };
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['boards', vars.projectId] });
    },
  });
}

export function useBoardMutations() {
  const createBoard = useCreateBoard();
  const deleteBoard = useDeleteBoard();
  return { createBoard, deleteBoard };
}
