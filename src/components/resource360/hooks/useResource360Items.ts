import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Resource360Item } from '@/types/resource360';

/**
 * Fetches all work items assigned to a resource via vw_wh_resource_360.
 * resourceId here is the short `rid` (e.g. "038") from the URL.
 */
export function useResource360Items(resourceId: string | undefined) {
  return useQuery({
    queryKey: ['resource360', resourceId],
    queryFn: async (): Promise<Resource360Item[]> => {
      if (!resourceId) return [];

      const { data, error } = await supabase
        .from('vw_wh_resource_360' as any)
        .select('*')
        .eq('resource_id', resourceId)
        .order('assigned_at', { ascending: false });

      if (error) {
        console.error('[Resource360] Failed to fetch items:', error.message);
        throw error;
      }

      // Normalize status_transitions from jsonb to array
      return ((data ?? []) as unknown as Resource360Item[]).map((item) => ({
        ...item,
        status_transitions: Array.isArray(item.status_transitions)
          ? item.status_transitions
          : [],
      }));
    },
    enabled: !!resourceId,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}
