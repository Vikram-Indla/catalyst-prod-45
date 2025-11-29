import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useTeamSprints(teamId?: string) {
  return useQuery({
    queryKey: ['team-sprints', teamId],
    queryFn: async () => {
      if (!teamId) return [];

      const { data, error } = await supabase
        .from('iterations')
        .select('*')
        .eq('team_id', teamId)
        .order('start_date', { ascending: false });

      if (error) {
        console.error('Error fetching team sprints:', error);
        throw error;
      }

      return data;
    },
    enabled: !!teamId,
  });
}

export function useSprintStories(sprintId?: string) {
  return useQuery({
    queryKey: ['sprint-stories', sprintId],
    queryFn: async () => {
      if (!sprintId) return [];

      const { data, error } = await supabase
        .from('stories')
        .select('*')
        .eq('sprint_id', sprintId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching sprint stories:', error);
        throw error;
      }

      return data;
    },
    enabled: !!sprintId,
  });
}

export function useTeamDependencies(teamId?: string) {
  return useQuery({
    queryKey: ['team-dependencies', teamId],
    queryFn: async () => {
      if (!teamId) return [];

      const { data, error } = await supabase
        .from('dependencies')
        .select('*')
        .or(`requesting_team_id.eq.${teamId},depends_on_team_id.eq.${teamId}`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching team dependencies:', error);
        throw error;
      }

      return data;
    },
    enabled: !!teamId,
  });
}
