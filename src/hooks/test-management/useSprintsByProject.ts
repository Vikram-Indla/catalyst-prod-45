import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SprintOption {
  id: string;
  name: string;
  status: string;
  start_date: string | null;
  target_date: string | null;
}

export function useSprintsByProject(projectId: string | undefined) {
  return useQuery({
    queryKey: ['sprints-by-project', projectId],
    queryFn: async (): Promise<SprintOption[]> => {
      if (!projectId) return [];

      const { data, error } = await supabase
        .from('ph_jira_sprints')
        .select('id, name, status, start_date, target_date')
        .eq('project_id', projectId)
        .order('target_date', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error fetching sprints:', error);
        throw error;
      }

      return (data || []).map(s => ({
        id: s.id,
        name: s.name,
        status: s.status || 'planning',
        start_date: s.start_date,
        target_date: s.target_date,
      }));
    },
    enabled: !!projectId,
    staleTime: 60000,
  });
}
