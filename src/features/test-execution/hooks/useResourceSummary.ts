/**
 * Module 3B-4: Hook for resource summary metrics
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ResourceSummary } from '../types/resource-allocation';

export function useResourceSummary(projectId: string | null) {
  return useQuery({
    queryKey: ['resource-summary', projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const { data, error } = await supabase
        .rpc('get_resource_summary', { p_project_id: projectId });
      if (error) throw error;
      return data as unknown as ResourceSummary;
    },
    enabled: !!projectId,
    refetchInterval: 5000,
  });
}
