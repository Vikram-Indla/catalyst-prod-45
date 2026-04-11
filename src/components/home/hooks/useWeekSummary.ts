/**
 * useWeekSummary — Fetches personal + team weekly summary.
 * Saudi work week: Sunday through Thursday.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { UserContext } from './useUserContext';

function getSaudiWeekStart(): string {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay()); // Sunday = 0
  weekStart.setHours(0, 0, 0, 0);
  return weekStart.toISOString();
}

export interface WeekSummary {
  myClosed: { total: number; byType: Record<string, number> };
  teamClosed: { total: number; byProject: Record<string, number> };
  agingItems: Array<{ key: string; title: string; days: number }>;
  myOpen: number;
}

export function useWeekSummary(userCtx: UserContext | undefined) {
  return useQuery({
    queryKey: ['week-summary', userCtx?.userId],
    queryFn: async (): Promise<WeekSummary> => {
      if (!userCtx) throw new Error('No user context');
      const weekStart = getSaudiWeekStart();
      const now = new Date();

      // My closed items this week
      const { data: myClosed } = await supabase
        .from('ph_issues')
        .select('issue_type')
        .is('jira_removed_at', null)
        .ilike('assignee_display_name', userCtx.displayName)
        .or('status.ilike.%done%,status.ilike.%closed%,status.ilike.%resolved%,status.ilike.%completed%,status_category.eq.Done')
        .gte('jira_updated_at', weekStart);

      const byType: Record<string, number> = {};
      (myClosed || []).forEach(item => {
        const t = item.issue_type || 'Other';
        byType[t] = (byType[t] || 0) + 1;
      });

      // Team closed this week
      const { data: teamClosed } = await supabase
        .from('ph_issues')
        .select('project_key')
        .is('jira_removed_at', null)
        .in('project_key', userCtx.projectKeys)
        .or('status.ilike.%done%,status.ilike.%closed%,status.ilike.%resolved%,status.ilike.%completed%,status_category.eq.Done')
        .gte('jira_updated_at', weekStart);

      const byProject: Record<string, number> = {};
      (teamClosed || []).forEach(item => {
        const p = item.project_key || 'Unknown';
        byProject[p] = (byProject[p] || 0) + 1;
      });

      // Aging items (>14 days without update)
      const twoWeeksAgo = new Date(now.getTime() - 14 * 86400000).toISOString();
      const { data: aging } = await supabase
        .from('ph_issues')
        .select('issue_key, summary, jira_updated_at')
        .is('jira_removed_at', null)
        .in('project_key', userCtx.projectKeys)
        .lt('jira_updated_at', twoWeeksAgo)
        .not('status', 'ilike', '%done%')
        .not('status', 'ilike', '%closed%')
        .not('status', 'ilike', '%resolved%')
        .order('jira_updated_at', { ascending: true })
        .limit(5);

      // My open items count
      const { count: myOpen } = await supabase
        .from('ph_issues')
        .select('*', { count: 'exact', head: true })
        .is('jira_removed_at', null)
        .ilike('assignee_display_name', userCtx.displayName)
        .not('status', 'ilike', '%done%')
        .not('status', 'ilike', '%closed%')
        .not('status', 'ilike', '%resolved%');

      return {
        myClosed: { total: (myClosed || []).length, byType },
        teamClosed: { total: (teamClosed || []).length, byProject },
        agingItems: (aging || []).map(item => ({
          key: item.issue_key,
          title: item.summary,
          days: Math.ceil((now.getTime() - new Date(item.jira_updated_at || now).getTime()) / 86400000),
        })),
        myOpen: myOpen || 0,
      };
    },
    enabled: !!userCtx,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    refetchInterval: 2 * 60_000,
  });
}
