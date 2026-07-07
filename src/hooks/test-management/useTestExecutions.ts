/**
 * Test Executions — lab containers for test cycles (CAT-TESTHUB-V2 slice B9).
 *
 * V2 model: Execution = lab tied to sprint/release/project/product/BR/custom
 * scope; Cycles are dated attempts inside an execution (tm_test_cycles.execution_id).
 * Table tm_test_executions is newer than the generated types (regen blocked on
 * Supabase CLI login), hence typedQuery.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { typedQuery } from '@/integrations/supabase/client';

export type ExecutionScopeType =
  | 'sprint'
  | 'release'
  | 'project'
  | 'product'
  | 'business_request'
  | 'custom';

export type ExecutionStatus = 'draft' | 'active' | 'completed' | 'archived';

export interface TmTestExecution {
  id: string;
  project_id: string;
  execution_key: string;
  name: string;
  description: string | null;
  lab_scope_type: ExecutionScopeType;
  sprint_id: string | null;
  release_id: string | null;
  business_request_id: string | null;
  custom_scope_label: string | null;
  status: ExecutionStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateExecutionInput {
  project_id: string;
  name: string;
  description?: string;
  lab_scope_type: ExecutionScopeType;
  sprint_id?: string | null;
  release_id?: string | null;
  business_request_id?: string | null;
  custom_scope_label?: string | null;
}

export function useTestExecutions(projectId: string | undefined, filters?: { status?: ExecutionStatus; scopeType?: ExecutionScopeType }) {
  return useQuery({
    queryKey: ['tm-executions', projectId, filters ?? null],
    queryFn: async (): Promise<TmTestExecution[]> => {
      if (!projectId) return [];
      let q = typedQuery('tm_test_executions')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      if (filters?.status) q = q.eq('status', filters.status);
      if (filters?.scopeType) q = q.eq('lab_scope_type', filters.scopeType);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as TmTestExecution[];
    },
    enabled: !!projectId,
  });
}

export function useTestExecutionByKey(projectId: string | undefined, executionKey: string | undefined) {
  return useQuery({
    queryKey: ['tm-execution', projectId, executionKey],
    queryFn: async (): Promise<TmTestExecution | null> => {
      if (!projectId || !executionKey) return null;
      const { data, error } = await typedQuery('tm_test_executions')
        .select('*')
        .eq('project_id', projectId)
        .eq('execution_key', executionKey)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as TmTestExecution | null;
    },
    enabled: !!projectId && !!executionKey,
  });
}

export function useCreateTestExecution() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateExecutionInput): Promise<TmTestExecution> => {
      const { data, error } = await typedQuery('tm_test_executions')
        .insert(input)
        .select('*')
        .single();
      if (error) throw error;
      return data as TmTestExecution;
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['tm-executions', created.project_id] });
    },
  });
}

export function useDeleteTestExecution() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }): Promise<void> => {
      // Guard: an execution that already contains cycles must not be deletable —
      // cycles carry runs/results; deleting the container would orphan evidence.
      const { count, error: countError } = await typedQuery('tm_test_cycles')
        .select('id', { count: 'exact', head: true })
        .eq('execution_id', id);
      if (countError) throw countError;
      if ((count ?? 0) > 0) {
        throw new Error(`This execution has ${count} cycle${count === 1 ? '' : 's'}. Delete or move its cycles first.`);
      }
      const { error } = await typedQuery('tm_test_executions').delete().eq('id', id);
      if (error) throw error;
      void projectId;
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ['tm-executions', vars.projectId] });
    },
  });
}

export function useUpdateTestExecution() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<TmTestExecution> & { id: string }): Promise<TmTestExecution> => {
      const { data, error } = await typedQuery('tm_test_executions')
        .update(patch)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return data as TmTestExecution;
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['tm-executions', updated.project_id] });
      queryClient.invalidateQueries({ queryKey: ['tm-execution', updated.project_id, updated.execution_key] });
    },
  });
}
