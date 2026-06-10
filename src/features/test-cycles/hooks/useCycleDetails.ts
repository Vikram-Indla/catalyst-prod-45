// ============================================================================
// HOOK: useCycleDetails - Fetch full cycle with milestones and assignments
// ============================================================================

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { CycleWithDetails, CycleDetail, CycleMilestone, CycleAssignment } from '../types/cycle-config';

interface RpcResponse {
  success: boolean;
  cycle?: CycleDetail;
  milestones?: CycleMilestone[];
  assignments?: CycleAssignment[];
  error?: string;
}

export function useCycleDetails(cycleId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['cycle-details', cycleId],
    queryFn: async (): Promise<CycleWithDetails | null> => {
      if (!cycleId) return null;

      const { data, error } = await supabase.rpc('tm_get_cycle_details', {
        p_cycle_id: cycleId,
      });

      if (error) {
        console.error('Error fetching cycle details:', error);
        throw error;
      }

      const response = data as unknown as RpcResponse;
      
      if (!response?.success || !response.cycle) {
        return null;
      }

      return {
        cycle: response.cycle,
        milestones: response.milestones || [],
        assignments: response.assignments || [],
      };
    },
    enabled: !!cycleId,
    staleTime: 30000,
  });

  // Real-time subscription for cycle changes
  useEffect(() => {
    if (!cycleId) return;

    const channel = supabase
      .channel(`cycle-details-${cycleId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tm_test_cycles',
          filter: `id=eq.${cycleId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['cycle-details', cycleId] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tm_cycle_milestones',
          filter: `cycle_id=eq.${cycleId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['cycle-details', cycleId] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tm_cycle_assignments',
          filter: `cycle_id=eq.${cycleId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['cycle-details', cycleId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [cycleId, queryClient]);

  return {
    data: query.data,
    cycle: query.data?.cycle,
    milestones: query.data?.milestones || [],
    assignments: query.data?.assignments || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
