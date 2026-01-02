/**
 * Test Executions Hook
 * CRUD operations for test cycle executions with permission checks and audit logging
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { usePermission } from '@/hooks/usePermission';
import { logAuditEntry } from '@/lib/auditLogger';
import { toast } from 'sonner';

export type ExecutionStatus = 'not_run' | 'passed' | 'failed' | 'blocked' | 'in_progress';

export interface TestExecution {
  id: string;
  cycle_id: string;
  case_id: string;
  case_version: number | null;
  assigned_to: string | null;
  status: ExecutionStatus | null;
  executed_at: string | null;
  executed_by: string | null;
  effort_minutes: number | null;
  comments: string | null;
  created_at: string;
  effort_estimated: number | null;
  effort_actual: number | null;
}

export interface TestExecutionWithCase extends TestExecution {
  test_case: {
    id: string;
    title: string;
    priority: string;
    test_type: string;
  } | null;
  assignee: {
    id: string;
    full_name: string;
  } | null;
}

export interface UpdateExecutionInput {
  id: string;
  status?: ExecutionStatus;
  comments?: string;
  effort_actual?: number;
  assigned_to?: string;
}

async function logTestActivity(
  userId: string | undefined,
  activityType: string,
  entityId: string,
  entityTitle: string,
  programId: string | null,
  description?: string
) {
  try {
    await supabase.from('test_activity_log').insert({
      user_id: userId,
      activity_type: activityType,
      entity_type: 'test_execution',
      entity_id: entityId,
      entity_title: entityTitle,
      program_id: programId,
      description: description || null,
    });
  } catch (err) {
    console.error('Failed to log test activity:', err);
  }
}

export function useTestExecutions(cycleId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Permission checks
  const { hasPermission: canEdit } = usePermission('test_executions', 'edit', 'global');
  const { hasPermission: canDelete } = usePermission('test_executions', 'delete', 'global');

  // Fetch executions for a cycle
  const {
    data: executions,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['test-executions', cycleId],
    queryFn: async () => {
      if (!cycleId) return [];

      const { data, error } = await supabase
        .from('test_cycle_executions')
        .select(`
          *,
          test_case:test_cases(id, title, priority, test_type)
        `)
        .eq('cycle_id', cycleId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data || []).map((d: any) => ({ ...d, assignee: null })) as TestExecutionWithCase[];
    },
    enabled: !!user && !!cycleId,
  });

  // Update execution status
  const updateStatusMutation = useMutation({
    mutationFn: async (input: UpdateExecutionInput) => {
      if (!user) throw new Error('Not authenticated');
      if (!canEdit) throw new Error('Permission denied: Cannot update executions');

      // Get current data for audit
      const { data: before } = await supabase
        .from('test_cycle_executions')
        .select('*, test_case:test_cases(title)')
        .eq('id', input.id)
        .single();

      const updateData: Record<string, unknown> = {};
      if (input.status !== undefined) {
        updateData.status = input.status;
        if (input.status !== 'not_run' && input.status !== 'in_progress') {
          updateData.executed_at = new Date().toISOString();
          updateData.executed_by = user.id;
        }
      }
      if (input.comments !== undefined) updateData.comments = input.comments;
      if (input.effort_actual !== undefined) updateData.effort_actual = input.effort_actual;
      if (input.assigned_to !== undefined) updateData.assigned_to = input.assigned_to;

      const { data, error } = await supabase
        .from('test_cycle_executions')
        .update(updateData)
        .eq('id', input.id)
        .select()
        .single();

      if (error) throw error;

      // Audit log
      await logAuditEntry({
        entityType: 'test_executions',
        entityId: data.id,
        action: input.status ? 'status_changed' : 'updated',
        beforeData: before,
        afterData: data,
      });

      // Log to test activity
      if (input.status) {
        await logTestActivity(
          user.id,
          `execution_${input.status}`,
          data.id,
          before?.test_case?.title || 'Unknown',
          null,
          `Marked test as ${input.status}`
        );
      }

      return data as TestExecution;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['test-executions'] });
      queryClient.invalidateQueries({ queryKey: ['test-cycles'] });
      if (data.status) {
        toast.success(`Test marked as ${data.status}`);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Bulk assign executions
  const bulkAssignMutation = useMutation({
    mutationFn: async ({ executionIds, assigneeId }: { executionIds: string[]; assigneeId: string }) => {
      if (!user) throw new Error('Not authenticated');
      if (!canEdit) throw new Error('Permission denied');

      const { error } = await supabase
        .from('test_cycle_executions')
        .update({ assigned_to: assigneeId })
        .in('id', executionIds);

      if (error) throw error;

      await logTestActivity(
        user.id,
        'bulk_assign',
        executionIds[0],
        `${executionIds.length} executions`,
        null,
        `Assigned ${executionIds.length} test executions`
      );

      return executionIds;
    },
    onSuccess: (ids) => {
      queryClient.invalidateQueries({ queryKey: ['test-executions'] });
      toast.success(`${ids.length} tests assigned`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Get execution step results
  const getStepResults = async (executionId: string) => {
    const { data, error } = await supabase
      .from('test_execution_step_results')
      .select('*')
      .eq('execution_id', executionId)
      .order('step_number', { ascending: true });

    if (error) throw error;
    return data;
  };

  // Update step result
  const updateStepResultMutation = useMutation({
    mutationFn: async ({
      executionId,
      stepNumber,
      status,
      actualResult,
      comments,
    }: {
      executionId: string;
      stepNumber: number;
      status: string;
      actualResult?: string;
      comments?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('test_execution_step_results')
        .upsert([{
          execution_id: executionId,
          step_order: stepNumber,
          step_description: '',
          status,
          actual_result: actualResult || null,
          comments: comments || null,
          executed_at: new Date().toISOString(),
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-executions'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Link defect to execution
  const linkDefectMutation = useMutation({
    mutationFn: async ({
      executionId,
      defectId,
    }: {
      executionId: string;
      defectId: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('test_execution_defects')
        .insert([{
          execution_id: executionId,
          defect_work_item_id: defectId,
          linked_by: user.id,
        }])
        .select()
        .single();

      if (error) throw error;

      await logTestActivity(
        user.id,
        'defect_linked',
        executionId,
        defectId,
        null,
        `Linked defect ${defectId} to execution`
      );

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-executions'] });
      toast.success('Defect linked');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return {
    executions: executions || [],
    isLoading,
    error,
    refetch,
    canEdit,
    canDelete,
    updateStatus: updateStatusMutation.mutateAsync,
    bulkAssign: bulkAssignMutation.mutateAsync,
    getStepResults,
    updateStepResult: updateStepResultMutation.mutateAsync,
    linkDefect: linkDefectMutation.mutateAsync,
    isUpdating: updateStatusMutation.isPending,
  };
}

// Hook to get execution stats for a cycle
export function useExecutionStats(cycleId: string | null) {
  return useQuery({
    queryKey: ['execution-stats', cycleId],
    queryFn: async () => {
      if (!cycleId) return null;

      const { data, error } = await supabase
        .from('test_cycle_executions')
        .select('status')
        .eq('cycle_id', cycleId);

      if (error) throw error;

      const stats = {
        total: data.length,
        passed: data.filter(e => e.status === 'passed').length,
        failed: data.filter(e => e.status === 'failed').length,
        blocked: data.filter(e => e.status === 'blocked').length,
        in_progress: data.filter(e => e.status === 'in_progress').length,
        not_run: data.filter(e => !e.status || e.status === 'not_run').length,
      };

      return {
        ...stats,
        pass_rate: stats.total > 0 ? Math.round((stats.passed / stats.total) * 100) : 0,
        completion_rate: stats.total > 0 
          ? Math.round(((stats.passed + stats.failed + stats.blocked) / stats.total) * 100) 
          : 0,
      };
    },
    enabled: !!cycleId,
  });
}
