import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Resource360Summary } from '@/types/resource360';

/**
 * Fetches aggregated summary stats for a resource.
 * resourceId here is the short `rid` (e.g. "038") from the URL.
 */
export function useResource360Summary(resourceId: string | undefined) {
  return useQuery({
    queryKey: ['resource360-summary', resourceId],
    queryFn: async (): Promise<Resource360Summary | null> => {
      if (!resourceId) return null;

      const { data, error } = await supabase
        .from('vw_wh_resource_360_summary' as any)
        .select('*')
        .eq('resource_id', resourceId)
        .single();

      if (error) {
        // If no rows found, return null gracefully
        if (error.code === 'PGRST116') return null;
        console.error('[Resource360] Failed to fetch summary:', error.message);
        throw error;
      }

      return data as unknown as Resource360Summary;
    },
    enabled: !!resourceId,
    staleTime: 60_000,
  });
}
