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
  description: string | null;
  current_value: number | null;
  status: 'pending' | 'passed' | 'failed' | 'waived' | null;
  last_evaluated_at: string | null;
  waived_at: string | null;
  waived_by: string | null;
  waiver_reason: string | null;
  waiver_expires_at: string | null;
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

export interface GateHistoryEntry {
  id: string;
  previous_status: string | null;
  new_status: string;
  metric_value: number;
  threshold_value: number;
  evaluation_type: string;
  notes: string | null;
  created_at: string;
  evaluated_by_name: string | null;
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

      if (error) throw new Error(error.message);
      return data as unknown as QualityGate[];
    },
    enabled: !!releaseId,
  });
}

// Create quality gate
export function useCreateQualityGate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: Omit<QualityGate, 'id' | 'created_at' | 'created_by' | 'current_value' | 'status' | 'last_evaluated_at' | 'waived_at' | 'waived_by' | 'waiver_reason' | 'waiver_expires_at'>) => {
      const { data, error } = await supabase
        .from('tm_release_quality_gates')
        .insert(input as any)
        .select()
        .single();

      if (error) throw new Error(error.message);
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
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (data: any) => {
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

      if (error) throw new Error(error.message);
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

      if (error) throw new Error(error.message);
      return data as unknown as ReleaseTestSummary;
    },
    enabled: !!releaseId,
  });
}

// Evaluate quality gates (auto-evaluate using RPC)
export function useEvaluateQualityGates() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ releaseId }: { releaseId: string; userId?: string }) => {
      const { data, error } = await supabase.rpc('tm_evaluate_quality_gates', {
        p_release_id: releaseId,
      });

      if (error) throw new Error(error.message);
      return data as any;
    },
    onSuccess: (data) => {
      const releaseId = data?.release_id;
      if (releaseId) {
        queryClient.invalidateQueries({ queryKey: ['release-quality-gates', releaseId] });
        queryClient.invalidateQueries({ queryKey: ['release-test-summary', releaseId] });
        queryClient.invalidateQueries({ queryKey: ['release-readiness', releaseId] });
      }
      toast({ title: 'Quality Gates Evaluated', description: `${data?.passed_gates || 0} of ${data?.total_gates || 0} gates passed` });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

// Waive a quality gate
export function useWaiveQualityGate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      gateId,
      userId,
      reason,
      expiresAt,
      releaseId,
    }: {
      gateId: string;
      userId: string;
      reason: string;
      expiresAt?: string;
      releaseId: string;
    }) => {
      const { data, error } = await supabase.rpc('tm_waive_quality_gate', {
        p_gate_id: gateId,
        p_user_id: userId,
        p_reason: reason,
        p_expires_at: expiresAt || null,
      });

      if (error) throw new Error(error.message);
      return { success: data, releaseId, gateId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['release-quality-gates', data.releaseId] });
      queryClient.invalidateQueries({ queryKey: ['gate-history', data.gateId] });
      toast({ title: 'Gate Waived', description: 'The quality gate has been waived.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}

// Fetch gate evaluation history
export function useGateHistory(gateId: string | null) {
  return useQuery({
    queryKey: ['gate-history', gateId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('tm_get_gate_history', {
        p_gate_id: gateId!,
      });

      if (error) throw new Error(error.message);
      return (data as unknown as GateHistoryEntry[]) || [];
    },
    enabled: !!gateId,
  });
}

// Fetch gate templates
export function useGateTemplates() {
  return useQuery({
    queryKey: ['gate-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tm_gate_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);
      return data as any[];
    },
  });
}

// Apply template to release
export function useApplyGateTemplate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ templateId, releaseId }: { templateId: string; releaseId: string }) => {
      // Fetch template
      const { data: template, error: fetchError } = await supabase
        .from('tm_gate_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (fetchError) throw new Error(fetchError.message);

      // Get current gate count for sort_order
      const { count } = await supabase
        .from('tm_release_quality_gates')
        .select('*', { count: 'exact', head: true })
        .eq('release_id', releaseId);

      // Create gate from template
      const { error: insertError } = await supabase
        .from('tm_release_quality_gates')
        .insert({
          release_id: releaseId,
          gate_name: template.name,
          description: template.description,
          gate_type: template.gate_type,
          threshold_operator: template.threshold_operator,
          threshold_value: template.threshold_value,
          is_blocking: template.is_blocking,
          sort_order: (count || 0),
        } as any);

      if (insertError) throw new Error(insertError.message);
      return { releaseId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['release-quality-gates', data.releaseId] });
      toast({ title: 'Template Applied' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });
}
