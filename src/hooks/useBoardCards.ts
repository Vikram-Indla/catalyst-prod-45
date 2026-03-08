// useBoardCards — fetch cards for a board
import { useQuery } from '@tanstack/react-query';
import type { KanbanCard } from '@/types/board';

export function useBoardCards(boardId: string | undefined) {
  return useQuery<KanbanCard[]>({
    queryKey: ['board-cards', boardId],
    queryFn: async () => {
      // TODO: Wire to Supabase in Stage B
      return [];
    },
    enabled: !!boardId,
  });
}
