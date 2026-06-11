/**
 * useCatySuggestions — trending work-item nudges in the chat dock.
 *
 * Sources: ph_issues assigned OR reported by the user (active only).
 * Enrichment: last ph_comment timestamp per issue (activity signal).
 * Algorithm: buildCatySuggestions 10-rule signal scorer (see caty-suggestions.ts).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { buildCatySuggestions, type CatySuggestion, type SuggestionInput } from '@/lib/caty-suggestions';

const db = supabase as unknown as { from: (t: string) => any };

const ISSUE_SELECT = 'id, issue_key, issue_type, summary, status, status_category, priority, jira_created_at, jira_updated_at, effective_due_date';

export function useCatySuggestions(): { suggestions: CatySuggestion[]; isLoading: boolean } {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const { data, isLoading } = useQuery({
    queryKey: ['caty-suggestions', userId],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async (): Promise<CatySuggestion[]> => {
      // Resolve caller's Jira account id (profiles.jira_account_id canonical fallback).
      const { data: prof } = await db
        .from('profiles')
        .select('jira_account_id')
        .eq('id', userId)
        .maybeSingle();
      const jiraId = prof?.jira_account_id as string | undefined;
      if (!jiraId) return [];

      // Fetch assigned + reported issues + dismissals in parallel.
      const [{ data: assigned }, { data: reported }, { data: dism }] = await Promise.all([
        db
          .from('ph_issues')
          .select(ISSUE_SELECT)
          .eq('assignee_account_id', jiraId)
          .is('deleted_at', null)
          .limit(60),
        db
          .from('ph_issues')
          .select(ISSUE_SELECT)
          .eq('reporter_account_id', jiraId)
          .neq('assignee_account_id', jiraId)   // avoid duplicates with assigned set
          .is('deleted_at', null)
          .limit(40),
        db
          .from('caty_suggestion_dismissals')
          .select('suggestion_key')
          .eq('user_id', userId),
      ]);

      type RawIssue = {
        id: string;
        issue_key: string;
        issue_type: string | null;
        summary: string | null;
        status: string | null;
        status_category: string | null;
        priority: string | null;
        jira_created_at: string | null;
        jira_updated_at: string | null;
        effective_due_date: string | null;
      };

      const assignedRows: RawIssue[] = assigned ?? [];
      const reportedRows: RawIssue[] = reported ?? [];
      const allRows = [...assignedRows, ...reportedRows];
      const issueIds = allRows.map((r) => r.id).filter(Boolean);

      // Last comment per issue — most recent only (ORDER BY created_at DESC).
      type CommentRow = { work_item_id: string; created_at: string };
      const commentMap: Record<string, string> = {};

      if (issueIds.length > 0) {
        const { data: comments } = await db
          .from('ph_comments')
          .select('work_item_id, created_at')
          .in('work_item_id', issueIds)
          .order('created_at', { ascending: false })
          .limit(200);

        for (const c of (comments as CommentRow[] ?? [])) {
          if (!commentMap[c.work_item_id]) {
            commentMap[c.work_item_id] = c.created_at;
          }
        }
      }

      const inputs: SuggestionInput[] = [
        ...assignedRows.map((r): SuggestionInput => ({
          issue_key: r.issue_key,
          issue_type: r.issue_type,
          summary: r.summary,
          status: r.status,
          status_category: r.status_category,
          priority: r.priority,
          jira_created_at: r.jira_created_at,
          jira_updated_at: r.jira_updated_at,
          effective_due_date: r.effective_due_date,
          last_comment_at: commentMap[r.id] ?? null,
          is_assignee: true,
        })),
        ...reportedRows.map((r): SuggestionInput => ({
          issue_key: r.issue_key,
          issue_type: r.issue_type,
          summary: r.summary,
          status: r.status,
          status_category: r.status_category,
          priority: r.priority,
          jira_created_at: r.jira_created_at,
          jira_updated_at: r.jira_updated_at,
          effective_due_date: r.effective_due_date,
          last_comment_at: commentMap[r.id] ?? null,
          is_assignee: false,
        })),
      ];

      const dismissed = new Set<string>((dism ?? []).map((d: { suggestion_key: string }) => d.suggestion_key));
      return buildCatySuggestions(inputs, Date.now(), dismissed, 5);
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
