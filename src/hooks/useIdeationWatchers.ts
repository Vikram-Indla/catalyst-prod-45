/**
 * Ideation · Watchers — CAT-IDEATION-REBUILD-20260709-001 Phase 3 S4.
 *
 * idn_watchers: PK(idea_id,user_id) — binary watch/unwatch. RLS already
 * correct (select: any approved user; write: your own row only).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { typedQuery } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const ideaWatchersKey = (ideaId: string) => ['ideation', 'idea-watchers', ideaId] as const;

export interface IdeaWatchSummary {
  count: number;
  amWatching: boolean;
}

export function useIdeationWatchers(ideaId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ideaWatchersKey(ideaId ?? ''),
    queryFn: async (): Promise<IdeaWatchSummary> => {
      const { data, error } = await typedQuery('idn_watchers').select('user_id').eq('idea_id', ideaId);
      if (error) throw error;
      const rows = (data ?? []) as Array<{ user_id: string }>;
      return { count: rows.length, amWatching: rows.some((r) => r.user_id === user?.id) };
    },
    enabled: !!ideaId,
    staleTime: 10_000,
  });
}

export function useToggleIdeationWatch(ideaId: string | undefined) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (nextWatching: boolean) => {
      if (!ideaId || !user?.id) throw new Error('Not signed in or no idea to watch');
      if (nextWatching) {
        const { error } = await typedQuery('idn_watchers').upsert(
          { idea_id: ideaId, user_id: user.id, reason: 'manual' },
          { onConflict: 'idea_id,user_id' }
        );
        if (error) throw error;
      } else {
        const { error } = await typedQuery('idn_watchers').delete().eq('idea_id', ideaId).eq('user_id', user.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      if (ideaId) queryClient.invalidateQueries({ queryKey: ideaWatchersKey(ideaId) });
    },
  });
}
