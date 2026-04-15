import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { boardApi } from '../api/boardApi';
import { STALE_TIME_MS } from '../constants/kanban';
import type { BoardIssue } from '../types/kanban';

export function useBoardIssues(boardId: string) {
  const queryClient = useQueryClient();
  const channelRef  = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const query = useQuery({
    queryKey:  ['board-issues', boardId],
    queryFn:   () => boardApi.fetchBoardIssues(boardId),
    staleTime: STALE_TIME_MS,
    enabled:   !!boardId,
  });

  useEffect(() => {
    if (!boardId) return;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const ch = supabase
      .channel(`board-issues-${boardId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ph_issues' },
        (payload) => {
          const updated = payload.new as Record<string, unknown>;

          if (updated?.deleted_at) {
            queryClient.setQueryData<BoardIssue[]>(
              ['board-issues', boardId],
              (prev) => (prev ?? []).filter((i) => i.id !== updated.id)
            );
            return;
          }

          queryClient.invalidateQueries({
            queryKey: ['board-issues', boardId],
          });
        }
      )
      .subscribe();

    channelRef.current = ch;

    return () => {
      supabase.removeChannel(ch);
      channelRef.current = null;
    };
  }, [boardId, queryClient]);

  return query;
}
