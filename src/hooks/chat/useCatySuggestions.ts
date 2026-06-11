/**
 * useCatySuggestions — rolling "look at this" nudges in the chat dock directory.
 * Derived from the caller's own stale active work items (todo / in-progress),
 * minus anything they've dismissed. Deterministic per day (see buildCatySuggestions).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { buildCatySuggestions, type CatySuggestion, type SuggestionInput } from '@/lib/caty-suggestions';

const db = supabase as unknown as { from: (t: string) => any };

export function useCatySuggestions(): { suggestions: CatySuggestion[]; isLoading: boolean } {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const { data, isLoading } = useQuery({
    queryKey: ['caty-suggestions', userId],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async (): Promise<CatySuggestion[]> => {
      // Resolve the caller's Jira account id (profiles.jira_account_id — the
      // canonical fallback, CLAUDE.md 2026-05-16).
      const { data: prof } = await db
        .from('profiles')
        .select('jira_account_id')
        .eq('id', userId)
        .maybeSingle();
      const jiraId = prof?.jira_account_id as string | undefined;
      if (!jiraId) return [];

      const [{ data: issues }, { data: dism }] = await Promise.all([
        db
          .from('ph_issues')
          .select('issue_key, issue_type, summary, status, status_category, jira_updated_at')
          .eq('assignee_account_id', jiraId)
          .is('deleted_at', null)
          .limit(80),
        db
          .from('caty_suggestion_dismissals')
          .select('suggestion_key')
          .eq('user_id', userId),
      ]);

      const dismissed = new Set<string>((dism ?? []).map((d: { suggestion_key: string }) => d.suggestion_key));
      return buildCatySuggestions((issues ?? []) as SuggestionInput[], Date.now(), dismissed, 5);
    },
  });

  return { suggestions: data ?? [], isLoading: !!userId && isLoading };
}

export function useDismissCatySuggestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (suggestionKey: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { error } = await db
        .from('caty_suggestion_dismissals')
        .upsert(
          { user_id: user.id, suggestion_key: suggestionKey },
          { onConflict: 'user_id,suggestion_key' },
        );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['caty-suggestions'] }),
  });
}
