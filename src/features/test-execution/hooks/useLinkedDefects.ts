/**
 * Module 3A-4: Hook for managing linked defects with real-time updates
 */

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { LinkedDefect } from '../types/defect-linking';

interface LinkedDefectsResponse {
  defects: LinkedDefect[];
  count: number;
}

export function useLinkedDefects(stepResultId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['linked-defects', stepResultId],
    queryFn: async (): Promise<LinkedDefectsResponse> => {
      if (!stepResultId) return { defects: [], count: 0 };

      const { data, error } = await supabase
        .rpc('get_linked_defects_for_step', { p_step_result_id: stepResultId });

      if (error) throw error;

      const response = data as unknown as LinkedDefectsResponse;
      return response;
      return response;
    },
    enabled: !!stepResultId,
    staleTime: 30000,
  });

  // Real-time subscription for link changes
  useEffect(() => {
    if (!stepResultId) return;

    const channel = supabase
      .channel(`defect-links-${stepResultId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tm_defect_links',
          filter: `step_result_id=eq.${stepResultId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['linked-defects', stepResultId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [stepResultId, queryClient]);

  return {
    linkedDefects: query.data?.defects ?? [],
    count: query.data?.count ?? 0,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
