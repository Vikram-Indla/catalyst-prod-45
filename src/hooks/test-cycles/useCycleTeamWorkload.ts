/**
 * Hook for real-time team workload data in a test cycle
 * Module 4A-3: Cycle Execution Tracker
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TeamMemberWorkload {
  userId: string;
  userName: string;
  userInitials: string;
  avatarUrl: string | null;
  totalTests: number;
  passed: number;
  failed: number;
  blocked: number;
  inProgress: number;
  notStarted: number;
  workloadStatus: 'normal' | 'high' | 'overloaded';
  completionRate: number;
}

export function useCycleTeamWorkload(cycleId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['cycle-team-workload', cycleId],
    queryFn: async (): Promise<TeamMemberWorkload[]> => {
      if (!cycleId) return [];

      const { data, error } = await supabase
        .rpc('tm_get_cycle_team_workload', { p_cycle_id: cycleId });

      if (error) throw error;

      return ((data as unknown as any[]) || []).map(row => ({
        userId: row.user_id,
        userName: row.user_name,
        userInitials: row.user_initials,
        avatarUrl: row.avatar_url,
        totalTests: Number(row.total_tests) || 0,
        passed: Number(row.passed) || 0,
        failed: Number(row.failed) || 0,
        blocked: Number(row.blocked) || 0,
        inProgress: Number(row.in_progress) || 0,
        notStarted: Number(row.not_started) || 0,
        workloadStatus: row.workload_status as 'normal' | 'high' | 'overloaded',
        completionRate: Number(row.avg_completion_rate) || 0,
      }));
    },
    enabled: !!cycleId,
    staleTime: 30000,
  });

  // Real-time subscription for scope changes
  useEffect(() => {
    if (!cycleId) return;

    const channel = supabase
      .channel(`cycle-workload-${cycleId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tm_cycle_scope',
          filter: `cycle_id=eq.${cycleId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['cycle-team-workload', cycleId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [cycleId, queryClient]);

  return {
    teamMembers: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
