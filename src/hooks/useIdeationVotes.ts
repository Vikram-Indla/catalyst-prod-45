/**
 * Ideation · Votes — CAT-IDEATION-REBUILD-20260709-001 Phase 3 S2.
 *
 * idn_votes: 1 vote/user (UNIQUE idea_id,user_id), importance 1-4
 * (critical/important/nice/none per D3). RLS already enforces the
 * one-vote invariant and blocks voting on locked (converted/merged)
 * ideas — this hook surfaces server errors, it doesn't re-implement them.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { typedQuery } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { VoteImportance } from '@/modules/ideation/types';

export const ideaVotesKey = (ideaId: string) => ['ideation', 'idea-votes', ideaId] as const;

const IMPORTANCE_TO_LEVEL: Record<number, VoteImportance> = {
  4: 'critical',
  3: 'important',
  2: 'nice',
  1: 'none',
};
const LEVEL_TO_IMPORTANCE: Record<VoteImportance, number> = {
  critical: 4,
  important: 3,
  nice: 2,
  none: 1,
};

export interface IdeaVoteSummary {
  total: number;
  byImportance: Record<VoteImportance, number>;
  /** null when the signed-in user hasn't voted on this idea. */
  myVote: VoteImportance | null;
}

export function useIdeationVotes(ideaId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ideaVotesKey(ideaId ?? ''),
    queryFn: async (): Promise<IdeaVoteSummary> => {
      const { data, error } = await typedQuery('idn_votes')
        .select('user_id, importance')
        .eq('idea_id', ideaId);
      if (error) throw error;
      const rows = (data ?? []) as Array<{ user_id: string; importance: number }>;

      const byImportance: Record<VoteImportance, number> = { critical: 0, important: 0, nice: 0, none: 0 };
      for (const row of rows) {
        const level = IMPORTANCE_TO_LEVEL[row.importance];
        if (level) byImportance[level] += 1;
      }
      const mine = rows.find((r) => r.user_id === user?.id);
      return {
        total: rows.length,
        byImportance,
        myVote: mine ? IMPORTANCE_TO_LEVEL[mine.importance] ?? null : null,
      };
    },
    enabled: !!ideaId,
    staleTime: 10_000,
  });
}

/** Cast, change, or remove the signed-in user's vote. Passing the level the
 *  user already has removes the vote (toggle-off), matching how importance
 *  pickers read to users — reselecting your own choice clears it. */
export function useCastIdeaVote(ideaId: string | undefined) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (level: VoteImportance | 'remove') => {
      if (!ideaId || !user?.id) throw new Error('Not signed in or no idea to vote on');
      if (level === 'remove') {
        const { error } = await typedQuery('idn_votes').delete().eq('idea_id', ideaId).eq('user_id', user.id);
        if (error) throw error;
        return;
      }
      const { error } = await typedQuery('idn_votes').upsert(
        { idea_id: ideaId, user_id: user.id, importance: LEVEL_TO_IMPORTANCE[level] },
        { onConflict: 'idea_id,user_id' }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      if (ideaId) queryClient.invalidateQueries({ queryKey: ideaVotesKey(ideaId) });
    },
  });
}
