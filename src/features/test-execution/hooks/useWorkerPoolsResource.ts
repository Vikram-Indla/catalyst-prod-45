/**
 * Module 3B-4: Hook for worker pool list
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { WorkerPool } from '../types/resource-allocation';

export function useWorkerPoolsResource(projectId: string | null) {
  return useQuery({
    queryKey: ['worker-pools-resource', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .rpc('get_worker_pools', { p_project_id: projectId });
      if (error) throw error;
      return (data as unknown as WorkerPool[]) || [];
    },
    enabled: !!projectId,
    refetchInterval: 5000,
  });
}
