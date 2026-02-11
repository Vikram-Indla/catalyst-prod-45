/**
 * WorkHub Jira Projects Hooks — TanStack Query
 * Phase 3: Full CRUD + project work items
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { JiraProject, WorkItemFull } from '@/types/workhub.types';

/** Hook A — All active Jira projects */
export function useJiraProjects() {
  return useQuery({
    queryKey: ['workhub', 'jira-projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wh_jira_projects')
        .select('*')
        .order('project_key');
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as JiraProject[];
    },
    staleTime: 30_000,
  });
}

/** Legacy alias */
export const useWHJiraProjects = useJiraProjects;

/** Hook B — Single Jira project */
export function useJiraProject(id: string) {
  return useQuery({
    queryKey: ['workhub', 'jira-project', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wh_jira_projects')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw new Error(error.message);
      return data as unknown as JiraProject;
    },
    enabled: !!id,
  });
}

/** Hook C — Work items for a specific project */
export function useJiraProjectWorkItems(projectId: string) {
  return useQuery({
    queryKey: ['workhub', 'jira-project-items', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vw_wh_work_items_full')
        .select('*')
        .eq('jira_project_id', projectId)
        .order('depth')
        .order('item_key');
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as WorkItemFull[];
    },
    enabled: !!projectId,
  });
}
