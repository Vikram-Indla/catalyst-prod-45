/**
 * Module 3B-4: Hook for active allocation list
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ActiveAllocation } from '../types/resource-allocation';

export function useActiveAllocations(projectId: string | null) {
  return useQuery({
    queryKey: ['active-allocations', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .rpc('get_active_allocations', { p_project_id: projectId });
      if (error) throw error;
      return (data as unknown as ActiveAllocation[]) || [];
    },
    enabled: !!projectId,
    refetchInterval: 3000,
  });
}
