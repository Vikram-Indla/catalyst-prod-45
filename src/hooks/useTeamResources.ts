import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TeamResource {
  resourceId: string;
  displayName: string;
}

export function useTeamResources(projectIds: string[]) {
  const query = useQuery<TeamResource[]>({
    queryKey: ['team-resources', projectIds],
    enabled: projectIds.length > 0,
    queryFn: async () => {
      const { data: members, error: membersError } = await supabase
        .from('ph_project_members')
        .select('user_id')
        .in('project_id', projectIds);
      if (membersError) throw membersError;

      const userIds = [...new Set((members ?? []).map((m: { user_id: string }) => m.user_id))];
      if (userIds.length === 0) return [];

      const { data: rows, error: riError } = await supabase
        .from('resource_inventory')
        .select('id, profile_id, profiles!inner(full_name)')
        .in('profile_id', userIds);
      if (riError) throw riError;

      return ((rows ?? []) as Array<{ id: string; profile_id: string; profiles: { full_name: string } }>).map(
        (r) => ({ resourceId: r.id, displayName: r.profiles.full_name }),
      );
    },
  });

  return {
    resources: query.data ?? [],
    isLoading: projectIds.length > 0 && query.isLoading,
    isError: query.isError,
    error: (query.error as Error | null) ?? null,
  };
}
