import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface LeadProject {
  id: string;
  key: string;
}

export function useMyLeadProjects() {
  const { user, loading: authLoading } = useAuth();

  const query = useQuery<LeadProject[]>({
    queryKey: ['my-lead-projects', user?.id ?? null],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ph_project_members')
        .select('ph_projects!inner(id, key)')
        .eq('user_id', user!.id)
        .eq('role', 'lead');
      if (error) throw error;
      return ((data ?? []) as Array<{ ph_projects: LeadProject }>).map((r) => r.ph_projects);
    },
  });

  return {
    projects: query.data ?? [],
    isLoading: authLoading || (!!user?.id && query.isLoading),
    isError: query.isError,
    error: (query.error as Error | null) ?? null,
  };
}
