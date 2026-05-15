import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface WorkloadRole {
  code: string;
  name: string;
}

export function useDashboardWorkloadRoles() {
  const { user, loading } = useAuth();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['dashboard-workload-roles'],
    enabled: !loading && !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_roles')
        .select('code, name')
        .eq('is_workload_relevant', true)
        .order('name');

      if (error) throw error;
      return (data ?? []) as WorkloadRole[];
    },
  });

  return {
    roles: data ?? [],
    isLoading: loading || isLoading,
    isError,
    error,
  };
}
