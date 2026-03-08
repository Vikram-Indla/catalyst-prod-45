// useBoardMutations — create, update, delete board
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CreateBoardInput } from '@/types/board';

export function useBoardMutations() {
  const queryClient = useQueryClient();

  const createBoard = useMutation({
    mutationFn: async (_input: CreateBoardInput) => {
      // TODO: Wire to Supabase in Stage B
      return null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boards'] });
    },
  });

  const deleteBoard = useMutation({
    mutationFn: async (_boardId: string) => {
      // TODO: Wire to Supabase in Stage B
      return null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boards'] });
    },
  });

  return { createBoard, deleteBoard };
}
