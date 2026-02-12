/**
 * ProjectHub Jira Projects Hooks — TanStack Query
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { JiraProject, WorkItemFull } from '@/types/workhub.types';

export function useJiraProjects() {
  return useQuery({
    queryKey: ['projecthub', 'jira-projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ph_jira_projects')
        .select('*')
        .order('project_key');
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as JiraProject[];
    },
    staleTime: 30_000,
  });
}

export const useWHJiraProjects = useJiraProjects;

export function useJiraProject(id: string) {
  return useQuery({
    queryKey: ['projecthub', 'jira-project', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ph_jira_projects')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw new Error(error.message);
      return data as unknown as JiraProject;
    },
    enabled: !!id,
  });
}

export function useJiraProjectWorkItems(projectId: string) {
  return useQuery({
    queryKey: ['projecthub', 'jira-project-items', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vw_ph_work_items_full')
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
