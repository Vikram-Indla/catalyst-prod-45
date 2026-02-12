/**
 * useResourceJiraWork — Fetches Jira work items for a resource
 * Resolves resource_inventory.id → jira_account_id via ph_user_mapping
 * Groups issues into: This Week, This Month, Last Month
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfWeek, startOfMonth, subMonths, endOfMonth, format } from 'date-fns';

export interface JiraWorkItem {
  issue_key: string;
  summary: string;
  issue_type: string;
  status: string;
  status_category: string;
  priority: string;
  parent_key: string | null;
  parent_summary: string | null;
  project_key: string;
  jira_created_at: string;
  jira_updated_at: string;
  hierarchy_level: number;
  type_icon_url: string | null;
}

export interface GroupedWork {
  thisWeek: JiraWorkItem[];
  thisMonth: JiraWorkItem[];
  lastMonth: JiraWorkItem[];
}

export function useResourceJiraWork(resourceId: string | null) {
  return useQuery({
    queryKey: ['capacity', 'resource-jira-work', resourceId],
    queryFn: async (): Promise<{ resource: { name: string; role: string; jiraAccountId: string | null }; groups: GroupedWork }> => {
      // 1. Get resource_inventory record
      const { data: ri, error: riErr } = await supabase
        .from('resource_inventory')
        .select('id, name, role_name, profile_id')
        .eq('id', resourceId!)
        .maybeSingle();
      if (riErr) throw riErr;
      if (!ri) throw new Error('Resource not found');

      // 2. Resolve jira_account_id
      let jiraAccountId: string | null = null;
      if (ri.profile_id) {
        const { data: mapping } = await supabase
          .from('ph_user_mapping')
          .select('jira_account_id')
          .eq('catalyst_profile_id', ri.profile_id)
          .maybeSingle();
        jiraAccountId = mapping?.jira_account_id ?? null;
      }

      if (!jiraAccountId) {
        return {
          resource: { name: ri.name, role: ri.role_name || 'Team Member', jiraAccountId: null },
          groups: { thisWeek: [], thisMonth: [], lastMonth: [] },
        };
      }

      // 3. Calculate date boundaries
      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const monthStart = startOfMonth(now);
      const lastMonthStart = startOfMonth(subMonths(now, 1));
      const lastMonthEnd = endOfMonth(subMonths(now, 1));
      const lookbackDate = format(lastMonthStart, 'yyyy-MM-dd');

      // 4. Single query: all issues for this resource updated/created since last month start
      // Include stories (hierarchy_level=0) and subtasks (hierarchy_level=1) 
      const { data: issues, error } = await supabase
        .from('ph_issues')
        .select('issue_key, summary, issue_type, status, status_category, priority, parent_key, parent_summary, project_key, jira_created_at, jira_updated_at, hierarchy_level, type_icon_url')
        .eq('assignee_account_id', jiraAccountId)
        .gte('jira_updated_at', lookbackDate)
        .order('jira_updated_at', { ascending: false });

      if (error) throw error;

      const items = (issues ?? []) as JiraWorkItem[];

      // 5. Group by time period based on jira_updated_at
      const thisWeek: JiraWorkItem[] = [];
      const thisMonth: JiraWorkItem[] = [];
      const lastMonth: JiraWorkItem[] = [];

      for (const item of items) {
        const updated = new Date(item.jira_updated_at);
        if (updated >= weekStart) {
          thisWeek.push(item);
        } else if (updated >= monthStart) {
          thisMonth.push(item);
        } else if (updated >= lastMonthStart && updated <= lastMonthEnd) {
          lastMonth.push(item);
        }
      }

      return {
        resource: { name: ri.name, role: ri.role_name || 'Team Member', jiraAccountId },
        groups: { thisWeek, thisMonth, lastMonth },
      };
    },
    enabled: !!resourceId,
    staleTime: 60_000,
  });
}
