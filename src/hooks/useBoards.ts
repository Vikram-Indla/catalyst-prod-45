// useBoards — fetch board list for a project
import { useQuery } from '@tanstack/react-query';
import type { BoardListItem } from '@/types/board';

export function useBoards(projectId: string | undefined) {
  return useQuery<BoardListItem[]>({
    queryKey: ['boards', projectId],
    queryFn: async () => {
      // TODO: Wire to Supabase in Stage B
      return [];
    },
    enabled: !!projectId,
  });
}
