import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Resource360Sibling } from '@/types/resource360';

/**
 * Fetches sibling work items (same parent) for a given work item.
 * Powers the context modal's right panel — showing parent's children list.
 */
export function useResource360Siblings(workItemId: string | null) {
  return useQuery({
    queryKey: ['resource360-siblings', workItemId],
    queryFn: async (): Promise<Resource360Sibling[]> => {
      if (!workItemId) return [];

      const { data, error } = await supabase
        .rpc('fn_resource_360_siblings' as any, {
          p_work_item_id: workItemId,
        });

      if (error) {
        console.error('[Resource360] Failed to fetch siblings:', error.message);
        throw error;
      }

      return (data ?? []) as unknown as Resource360Sibling[];
    },
    enabled: !!workItemId,
    staleTime: 30_000,
  });
}
