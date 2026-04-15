import { useQuery } from '@tanstack/react-query';
import { boardApi } from '../api/boardApi';
import { STALE_TIME_MS } from '../constants/kanban';

export function useBoardConfig(boardId: string) {
  return useQuery({
    queryKey:  ['board-config', boardId],
    queryFn:   () => boardApi.fetchBoardConfig(boardId),
    staleTime: STALE_TIME_MS * 2,
    enabled:   !!boardId,
  });
}
