import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Issue, StatusCategory } from '../types';

function mapStatusCategory(statusId: string): StatusCategory {
  const done = ['done', 'closed', 'resolved'];
  const todo = ['backlog', 'open', 'to-do', 'to_do'];
  if (done.some(s => statusId?.toLowerCase().includes(s))) return 'done';
  if (todo.some(s => statusId?.toLowerCase().includes(s))) return 'to-do';
  return 'in-progress';
}

export function useInJiraIssues(projectId: string) {
  return useQuery({
    queryKey: ['injira-issues', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('injira_issues')
        .select('*')
        .eq('project_id', projectId)
        .order('rank_lexo', { ascending: true });

      if (error) throw error;
      return (data || []).map(issue => ({
        id: issue.id,
        key: issue.key,
        summary: issue.summary,
        description: issue.description
          ? (typeof issue.description === 'string' ? issue.description : JSON.stringify(issue.description))
          : undefined,
        type: (issue.issue_type_id || 'story') as Issue['type'],
        status: issue.status_id || 'backlog',
        statusCategory: mapStatusCategory(issue.status_id || ''),
        priority: (issue.priority || 'medium') as Issue['priority'],
        assigneeId: issue.assignee_id ?? undefined,
        reporterId: issue.reporter_id ?? undefined,
        storyPoints: issue.story_points ?? undefined,
        sprintId: issue.sprint_id ?? undefined,
        createdAt: issue.created_at || '',
        updatedAt: issue.updated_at || '',
        parentId: issue.parent_id ?? undefined,
        labels: [],
        components: [],
      })) as Issue[];
    },
    enabled: !!projectId,
  });
}
