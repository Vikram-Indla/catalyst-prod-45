/**
 * useCatalystWatchers — read + toggle watcher state on a ph_issues row.
 *
 * Backed by ph_issue_watchers (issue_key text PK + user_id UUID).
 * The legacy ph_watchers and issue_watchers tables reference retired
 * ancestors (ph_work_items, catalyst_issues) and are not used here.
 *
 * 2026-04-28 — added in Cycle 3 of jira-compare audit, scoped to Catalyst
 * standalone (no Jira data sync).
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface WatcherSummary {
  count: number;
  isWatching: boolean;
}

export function useCatalystWatchers(issueKey: string | null | undefined) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['cv-watchers', issueKey],
    enabled: !!issueKey,
    queryFn: async (): Promise<WatcherSummary> => {
      if (!issueKey) return { count: 0, isWatching: false };
      const { data: { user } } = await supabase.auth.getUser();
      // ph_issue_watchers added by Cycle-3 migration; not yet in generated types
      const { data, error } = await (supabase as any)
        .from('ph_issue_watchers')
        .select('user_id')
        .eq('issue_key', issueKey);
      if (error) {
        // Table may not yet exist on this env — degrade silently rather than blow up the detail panel.
        return { count: 0, isWatching: false };
      }
      const rows = (data ?? []) as Array<{ user_id: string }>;
      return {
        count: rows.length,
        isWatching: !!user && rows.some(r => r.user_id === user.id),
      };
    },
    staleTime: 15_000,
  });

  const toggle = useMutation({
    mutationFn: async () => {
      if (!issueKey) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const isWatching = query.data?.isWatching ?? false;
      if (isWatching) {
        await (supabase as any).from('ph_issue_watchers').delete()
          .eq('issue_key', issueKey).eq('user_id', user.id);
      } else {
        await (supabase as any).from('ph_issue_watchers').insert({ issue_key: issueKey, user_id: user.id });
      }
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['cv-watchers', issueKey] }),
  });

  return { ...query, toggle };
}
