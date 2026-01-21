// =====================================================
// RELEASE READINESS HOOKS
// Manage release readiness snapshots and approvals
// =====================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ReadinessSnapshot {
  id: string;
  snapshot_at: string;
  overall_status: 'not_ready' | 'at_risk' | 'ready' | 'approved';
  gates_passed: number;
  gates_total: number;
  blocking_gates_passed: number;
  blocking_gates_total: number;
  test_execution_pct: number;
  test_pass_pct: number;
  open_blockers: number;
  open_criticals: number;
  recommendation: string | null;
  created_by_name: string | null;
  approved_by_name: string | null;
  approved_at: string | null;
}

// Fetch readiness history for a release
export function useReleaseReadinessHistory(releaseId: string) {
  return useQuery({
    queryKey: ['release-readiness', releaseId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('tm_get_release_readiness_history', {
        p_release_id: releaseId,
      });

      if (error) throw error;
      return data as ReadinessSnapshot[];
    },
    enabled: !!releaseId,
  });
}

// Get latest readiness status
export function useLatestReadiness(releaseId: string) {
  const { data: history, ...rest } = useReleaseReadinessHistory(releaseId);
  return {
    data: history?.[0] || null,
    ...rest,
  };
}

// Create readiness snapshot
export function useCreateReadinessSnapshot() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      releaseId,
      userId,
      recommendation,
    }: {
      releaseId: string;
      userId?: string;
      recommendation?: string;
    }) => {
      const { data, error } = await supabase.rpc('tm_create_readiness_snapshot', {
        p_release_id: releaseId,
        p_user_id: userId || null,
        p_recommendation: recommendation || null,
      });

      if (error) throw error;
      return { snapshotId: data as string, releaseId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['release-readiness', data.releaseId] });
      toast({ title: 'Readiness Snapshot Created' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

// Approve release readiness
export function useApproveReadiness() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      snapshotId,
      userId,
      releaseId,
    }: {
      snapshotId: string;
      userId: string;
      releaseId: string;
    }) => {
      const { data, error } = await supabase.rpc('tm_approve_release_readiness', {
        p_snapshot_id: snapshotId,
        p_user_id: userId,
      });

      if (error) throw error;
      return { success: data as boolean, releaseId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['release-readiness', data.releaseId] });
      toast({ title: 'Release Approved', description: 'The release has been approved for deployment.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}
