// =====================================================
// RELEASE QUALITY GATES HOOKS
// Manage quality gates for release readiness
// =====================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface QualityGate {
  id: string;
  release_id: string;
  gate_name: string;
  gate_type: 'pass_rate' | 'execution_rate' | 'defect_count' | 'blocker_count' | 'coverage' | 'custom';
  threshold_operator: '>=' | '<=' | '=' | '>' | '<';
  threshold_value: number;
  is_blocking: boolean;
  sort_order: number;
  created_at: string;
  created_by: string | null;
}

export interface GateEvaluationResult {
  gate_id: string;
  gate_name: string;
  gate_type: string;
  threshold: string;
  actual_value: number;
  passed: boolean;
  is_blocking: boolean;
}

export interface ReleaseTestSummary {
  release_id: string;
  cycles: Array<{
    cycle_id: string;
    cycle_name: string;
    status: string;
    total_cases: number;
    passed: number;
    failed: number;
    blocked: number;
    not_run: number;
    execution_pct: number;
    pass_pct: number;
  }>;
  totals: {
    total_cases: number;
    passed: number;
    failed: number;
    blocked: number;
    not_run: number;
    execution_pct: number;
    pass_pct: number;
  };
  defects: {
    total: number;
    open: number;
    blockers: number;
    criticals: number;
  };
}

export interface GateEvaluation {
  release_id: string;
  evaluated_at: string;
  gates: GateEvaluationResult[];
  summary: {
    total_gates: number;
    passed_gates: number;
    blocking_passed: number;
    blocking_total: number;
    all_blocking_passed: boolean;
  };
  test_summary: ReleaseTestSummary;
}

// Fetch quality gates for a release
export function useReleaseQualityGates(releaseId: string) {
  return useQuery({
    queryKey: ['release-quality-gates', releaseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tm_release_quality_gates')
        .select('*')
        .eq('release_id', releaseId)
        .order('sort_order');

      if (error) throw error;
      return data as QualityGate[];
    },
    enabled: !!releaseId,
  });
}

// Create quality gate
export function useCreateQualityGate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: Omit<QualityGate, 'id' | 'created_at' | 'created_by'>) => {
      const { data, error } = await supabase
        .from('tm_release_quality_gates')
        .insert(input)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['release-quality-gates', variables.release_id] });
      toast({ title: 'Quality Gate Created' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

// Update quality gate
export function useUpdateQualityGate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<QualityGate> & { id: string }) => {
      const { data, error } = await supabase
        .from('tm_release_quality_gates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['release-quality-gates', data.release_id] });
      toast({ title: 'Quality Gate Updated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

// Delete quality gate
export function useDeleteQualityGate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, releaseId }: { id: string; releaseId: string }) => {
      const { error } = await supabase
        .from('tm_release_quality_gates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { id, releaseId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['release-quality-gates', data.releaseId] });
      toast({ title: 'Quality Gate Deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

// Get release test summary
export function useReleaseTestSummary(releaseId: string) {
  return useQuery({
    queryKey: ['release-test-summary', releaseId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('tm_get_release_test_summary', {
        p_release_id: releaseId,
      });

      if (error) throw error;
      return data as unknown as ReleaseTestSummary;
    },
    enabled: !!releaseId,
  });
}

// Evaluate quality gates
export function useEvaluateQualityGates() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ releaseId, userId }: { releaseId: string; userId?: string }) => {
      const { data, error } = await supabase.rpc('tm_evaluate_release_gates', {
        p_release_id: releaseId,
        p_user_id: userId || null,
      });

      if (error) throw error;
      return data as unknown as GateEvaluation;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['release-test-summary', variables.releaseId] });
      queryClient.invalidateQueries({ queryKey: ['release-readiness', variables.releaseId] });
      toast({ title: 'Quality Gates Evaluated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}
