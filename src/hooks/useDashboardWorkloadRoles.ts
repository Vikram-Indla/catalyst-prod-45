import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface DashboardWorkloadRole {
  code: string;
  name: string;
}

/**
 * Dynamic role labels for the "Who's carrying what" dashboard widget.
 * Replaces hardcoded "Delivery Managers" / "Product Owners" labels with
 * whatever roles are actually flagged workload-relevant in product_roles.
 */
export function useDashboardWorkloadRoles() {
  const { isAuthenticated, loading: authLoading } = useAuth();

  const { data, isLoading: queryLoading, isError, error } = useQuery<DashboardWorkloadRole[]>({
    queryKey: ['dashboardWorkloadRoles'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('product_roles')
        .select('code, name')
        .eq('is_workload_relevant', true)
        .order('name');
      if (error) throw error;
      return (data ?? []) as DashboardWorkloadRole[];
    },
    enabled: isAuthenticated,
  });

  return {
    roles: isAuthenticated ? data ?? [] : [],
    isLoading: authLoading || (isAuthenticated && queryLoading),
    isError,
    error,
  };
}
