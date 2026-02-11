/**
 * WorkHub Jira Projects Hook — TanStack Query
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { JiraProject } from '@/types/workhub.types';

export function useWHJiraProjects() {
  return useQuery({
    queryKey: ['workhub', 'jira-projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wh_jira_projects')
        .select('*')
        .eq('is_active', true)
        .order('project_key');
      if (error) throw error;
      return (data ?? []) as unknown as JiraProject[];
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}
