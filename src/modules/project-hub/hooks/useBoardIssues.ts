import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { boardApi } from '../api/boardApi';
import { STALE_TIME_MS } from '../constants/kanban';
import type { BoardIssue } from '../types/kanban';

export function useBoardIssues(boardId: string, currentUserId?: string) {
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

          // UC-090: soft-delete — remove from cache directly, no re-fetch
          if (updated?.deleted_at) {
            queryClient.setQueryData<BoardIssue[]>(
              ['board-issues', boardId],
              (prev) => (prev ?? []).filter((i) => i.id !== updated.id)
            );
            return;
          }

          // CHECK 10: Self-notification suppression — skip invalidation
          // for changes made by the current user (optimistic update already applied)
          if (currentUserId && updated?.updated_by === currentUserId) {
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
  }, [boardId, queryClient, currentUserId]);

  return query;
}
