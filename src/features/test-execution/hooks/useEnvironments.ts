/**
 * Module 3B-4: Hook for environment list
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Environment } from '../types/resource-allocation';

export function useEnvironments(projectId: string | null) {
  return useQuery({
    queryKey: ['environments', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .rpc('get_environments', { p_project_id: projectId });
      if (error) throw error;
      return (data as unknown as Environment[]) || [];
    },
    enabled: !!projectId,
    refetchInterval: 5000,
  });
}
