// useBoard — fetch single board + columns
import { useQuery } from '@tanstack/react-query';
import type { Board, BoardColumn } from '@/types/board';

export function useBoard(boardId: string | undefined) {
  return useQuery<{ board: Board; columns: BoardColumn[] } | null>({
    queryKey: ['board', boardId],
    queryFn: async () => {
      // TODO: Wire to Supabase in Stage B
      return null;
    },
    enabled: !!boardId,
  });
}
