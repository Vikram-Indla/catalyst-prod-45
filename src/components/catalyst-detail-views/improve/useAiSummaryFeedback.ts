/**
 * useAiSummaryFeedback — loads the current user's 👍 / 👎 vote on an
 * AI-generated summary for a given issue and surface, and records new
 * votes (insert / update / re-vote).
 *
 * Backed by `ai_summary_feedback` (migration 20260521120000). Unique on
 * (issue_key, user_id, surface) so a user has at most one vote per
 * issue+surface — re-voting updates the existing row.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export type FeedbackVote = 'up' | 'down';

interface UseAiSummaryFeedbackOptions {
  issueKey: string | null | undefined;
  /** Which AI summary surface this vote is for. Default: comments. */
  surface?: string;
}

export function useAiSummaryFeedback({
  issueKey,
  surface = 'comments_summary',
}: UseAiSummaryFeedbackOptions) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const enabled = !!issueKey && !!user?.id;

  const { data: vote = null } = useQuery({
    queryKey: ['ai-summary-feedback', surface, issueKey, user?.id],
    enabled,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<FeedbackVote | null> => {
      const { data, error } = await supabase
        .from('ai_summary_feedback')
        .select('vote')
        .eq('issue_key', issueKey!)
        .eq('user_id', user!.id)
        .eq('surface', surface)
        .maybeSingle();
      if (error) return null;
      const v = (data as { vote?: string } | null)?.vote;
      return v === 'up' || v === 'down' ? v : null;
    },
  });

  const recordMutation = useMutation({
    mutationFn: async ({
      vote: nextVote,
      summaryText,
    }: {
      vote: FeedbackVote;
      summaryText: string;
    }) => {
      if (!issueKey || !user?.id) throw new Error('Not authenticated');
      // Upsert by the unique (issue_key, user_id, surface) constraint —
      // re-voting just flips the `vote` column.
      const { error } = await supabase
        .from('ai_summary_feedback')
        .upsert(
          {
            issue_key: issueKey,
            user_id: user.id,
            surface,
            vote: nextVote,
            summary_text: summaryText,
          } as never,
          { onConflict: 'issue_key,user_id,surface' },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['ai-summary-feedback', surface, issueKey, user?.id],
      });
      toast.success('Thanks for the feedback');
    },
    onError: (err: unknown) => {
      toast.error(
        err instanceof Error ? err.message : 'Could not record feedback',
      );
    },
  });

  return {
    vote,
    recordVote: (nextVote: FeedbackVote, summaryText: string) =>
      recordMutation.mutate({ vote: nextVote, summaryText }),
    isRecording: recordMutation.isPending,
  };
}
