import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface JiraBacklogIssue {
  issue_key: string;
  project_key: string;
  issue_type: string;
  summary: string;
  status: string;
  status_category: string;
  priority: string;
  assignee_display_name: string | null;
  parent_key: string | null;
  parent_summary: string | null;
  story_points: number | null;
  due_date: string | null;
  sprint_name: string | null;
  labels: string[];
  jira_created_at: string;
  jira_updated_at: string;
  type_icon_url: string | null;
}

export type BacklogLevel = 'epic' | 'story' | 'feature';

export function useJiraBacklogIssues(projectKey: string | undefined, level: BacklogLevel) {
  return useQuery({
    queryKey: ['jira-backlog', projectKey, level],
    queryFn: async () => {
      if (!projectKey) return [];

      // Feature type doesn't exist in Jira — return empty until features are created in ProjectHub
      if (level === 'feature') return [] as JiraBacklogIssue[];

      let query = supabase
        .from('ph_issues')
        .select('issue_key, project_key, issue_type, summary, status, status_category, priority, assignee_display_name, parent_key, parent_summary, story_points, due_date, sprint_name, labels, jira_created_at, jira_updated_at, type_icon_url')
        .eq('project_key', projectKey.toUpperCase())
        .order('jira_updated_at', { ascending: false });

      if (level === 'epic') {
        query = query.eq('issue_type', 'Epic');
      } else if (level === 'story') {
        query = query.eq('issue_type', 'Story');
      }

      const { data, error } = await query.limit(500);
      if (error) throw error;
      return (data || []) as JiraBacklogIssue[];
    },
    enabled: !!projectKey,
    staleTime: 2 * 60_000,
  });
}
