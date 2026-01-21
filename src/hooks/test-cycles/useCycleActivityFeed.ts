/**
 * Hook for real-time activity feed in a test cycle
 * Module 4A-3: Cycle Execution Tracker
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CycleActivity {
  id: string;
  actionType: 'status_changed' | 'assigned' | 'unassigned' | 'defect_created' | 
              'defect_linked' | 'comment_added' | 'evidence_uploaded' | 
              'retested' | 'bulk_update' | 'execution_started' | 'execution_completed';
  actorId: string | null;
  actorName: string;
  actorInitials: string;
  testCaseKey: string | null;
  testCaseTitle: string | null;
  fromStatus: string | null;
  toStatus: string | null;
  defectKey: string | null;
  metadata: Record<string, any>;
  createdAt: string;
  timeAgo: string;
  isLive?: boolean;
}

export function useCycleActivityFeed(cycleId: string | null, limit: number = 20) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['cycle-activity-feed', cycleId, limit],
    queryFn: async (): Promise<CycleActivity[]> => {
      if (!cycleId) return [];

      const { data, error } = await supabase
        .rpc('tm_get_cycle_activity_feed', { p_cycle_id: cycleId, p_limit: limit });

      if (error) throw error;

      return ((data as unknown as any[]) || []).map((row, index) => ({
        id: row.id,
        actionType: row.action_type,
        actorId: row.actor_id,
        actorName: row.actor_name,
        actorInitials: row.actor_initials,
        testCaseKey: row.test_case_key,
        testCaseTitle: row.test_case_title,
        fromStatus: row.from_status,
        toStatus: row.to_status,
        defectKey: row.defect_key,
        metadata: row.metadata || {},
        createdAt: row.created_at,
        timeAgo: row.time_ago,
        // Mark the first 2 items as "live" for visual effect
        isLive: index < 2 && row.time_ago === 'just now',
      }));
    },
    enabled: !!cycleId,
    staleTime: 10000,
    refetchInterval: 30000, // Refetch every 30s for near real-time
  });

  // Real-time subscription for new audit events
  useEffect(() => {
    if (!cycleId) return;

    const channel = supabase
      .channel(`cycle-activity-${cycleId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tm_cycle_execution_audit',
          filter: `cycle_id=eq.${cycleId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['cycle-activity-feed', cycleId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [cycleId, queryClient]);

  return {
    activities: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
