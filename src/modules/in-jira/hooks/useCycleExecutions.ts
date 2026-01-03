/**
 * Use Cycle Executions Hook
 * Manages test cycle executions with assignments, status updates, and locking
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase as supabaseClient } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { usePermission } from '@/hooks/usePermission';
import { logAuditEntry } from '@/lib/auditLogger';
import { toast } from 'sonner';
import { TestCycle, TestCycleWithStats } from './useTestCycles';

const supabase = supabaseClient as any;

export type ExecutionStatus = 'not_run' | 'passed' | 'failed' | 'blocked' | 'skipped';

export interface CycleExecution {
  id: string;
  cycle_id: string;
  case_id: string;
  case_version: number | null;
  assigned_to: string | null;
  status: ExecutionStatus;
  executed_at: string | null;
  executed_by: string | null;
  effort_minutes: number | null;
  comments: string | null;
  created_at: string;
  test_case?: {
    id: string;
    title: string;
    priority: string;
    status: string;
    test_type: string;
  };
  assignee?: {
    id: string;
    full_name: string;
    email: string;
  };
}

export interface ExecutionsByStatus {
  not_run: CycleExecution[];
  passed: CycleExecution[];
  failed: CycleExecution[];
  blocked: CycleExecution[];
  skipped: CycleExecution[];
}

export interface WorkloadByUser {
  userId: string;
  userName: string;
  total: number;
  notRun: number;
  passed: number;
  failed: number;
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
      entity_type: 'test_cycle_execution',
      entity_id: entityId,
      entity_title: entityTitle,
      program_id: programId,
      description: description || null,
    });
  } catch (err) {
    console.error('Failed to log test activity:', err);
  }
}

export function useCycleExecutions(cycleId: string | null, programId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { hasPermission: canEdit } = usePermission('test_executions', 'edit', 'program', programId || undefined);
  const { hasPermission: canDelete } = usePermission('test_executions', 'delete', 'program', programId || undefined);
  const { hasPermission: isTeamLead } = usePermission('test_cycles', 'create', 'program', programId || undefined);

  // Fetch cycle details
  const { data: cycle } = useQuery({
    queryKey: ['test-cycle', cycleId],
    queryFn: async () => {
      if (!cycleId) return null;
      const { data, error } = await supabase
        .from('test_cycles')
        .select('*')
        .eq('id', cycleId)
        .single();
      if (error) throw error;
      return data as TestCycle;
    },
    enabled: !!cycleId,
  });

  // Fetch executions with test case and assignee info
  const {
    data: executions,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['cycle-executions', cycleId],
    queryFn: async () => {
      if (!cycleId) return [];
      const { data, error } = await supabase
        .from('test_cycle_executions')
        .select(`
          *,
          test_case:test_cases(id, title, priority, status, test_type),
          assignee:profiles!test_cycle_executions_assigned_to_fkey(id, full_name, email)
        `)
        .eq('cycle_id', cycleId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []).map((e: any) => ({
        ...e,
        status: e.status || 'not_run',
      })) as CycleExecution[];
    },
    enabled: !!cycleId && !!user,
  });

  // Group executions by status
  const executionsByStatus: ExecutionsByStatus = {
    not_run: executions?.filter(e => e.status === 'not_run') || [],
    passed: executions?.filter(e => e.status === 'passed') || [],
    failed: executions?.filter(e => e.status === 'failed') || [],
    blocked: executions?.filter(e => e.status === 'blocked') || [],
    skipped: executions?.filter(e => e.status === 'skipped') || [],
  };

  // Calculate workload by user
  const workloadByUser: WorkloadByUser[] = [];
  const userMap = new Map<string, WorkloadByUser>();
  
  executions?.forEach(e => {
    if (e.assigned_to) {
      if (!userMap.has(e.assigned_to)) {
        userMap.set(e.assigned_to, {
          userId: e.assigned_to,
          userName: e.assignee?.full_name || 'Unknown',
          total: 0,
          notRun: 0,
          passed: 0,
          failed: 0,
        });
      }
      const u = userMap.get(e.assigned_to)!;
      u.total++;
      if (e.status === 'not_run') u.notRun++;
      else if (e.status === 'passed') u.passed++;
      else if (e.status === 'failed') u.failed++;
    }
  });
  userMap.forEach(v => workloadByUser.push(v));

  // Update execution status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ executionId, status }: { executionId: string; status: ExecutionStatus }) => {
      if (!user) throw new Error('Not authenticated');
      if (!canEdit) throw new Error('Permission denied');

      const { data: before } = await supabase
        .from('test_cycle_executions')
        .select('*')
        .eq('id', executionId)
        .single();

      const { data, error } = await supabase
        .from('test_cycle_executions')
        .update({
          status,
          executed_at: status !== 'not_run' ? new Date().toISOString() : null,
          executed_by: status !== 'not_run' ? user.id : null,
        })
        .eq('id', executionId)
        .select()
        .single();

      if (error) throw error;

      await logTestActivity(
        user.id,
        'status_changed',
        executionId,
        `Execution ${executionId}`,
        programId,
        `Changed status from ${before?.status || 'not_run'} to ${status}`
      );

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cycle-executions', cycleId] });
      queryClient.invalidateQueries({ queryKey: ['test-cycles'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Assign executor
  const assignMutation = useMutation({
    mutationFn: async ({ executionId, userId }: { executionId: string; userId: string | null }) => {
      if (!user) throw new Error('Not authenticated');
      if (!canEdit) throw new Error('Permission denied');

      const { data, error } = await supabase
        .from('test_cycle_executions')
        .update({ assigned_to: userId })
        .eq('id', executionId)
        .select()
        .single();

      if (error) throw error;

      await logTestActivity(
        user.id,
        'assigned',
        executionId,
        `Execution ${executionId}`,
        programId,
        `Assigned to user ${userId || 'unassigned'}`
      );

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cycle-executions', cycleId] });
      toast.success('Assignment updated');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Bulk assign
  const bulkAssignMutation = useMutation({
    mutationFn: async ({ executionIds, userId }: { executionIds: string[]; userId: string | null }) => {
      if (!user) throw new Error('Not authenticated');
      if (!canEdit) throw new Error('Permission denied');

      const { error } = await supabase
        .from('test_cycle_executions')
        .update({ assigned_to: userId })
        .in('id', executionIds);

      if (error) throw error;

      await logTestActivity(
        user.id,
        'bulk_assigned',
        cycleId || '',
        `${executionIds.length} executions`,
        programId,
        `Bulk assigned ${executionIds.length} executions to ${userId || 'unassigned'}`
      );

      return executionIds;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['cycle-executions', cycleId] });
      toast.success(`${vars.executionIds.length} executions assigned`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Lock/unlock scope
  const toggleLockMutation = useMutation({
    mutationFn: async (lock: boolean) => {
      if (!user) throw new Error('Not authenticated');
      if (!isTeamLead) throw new Error('Only team leads can lock/unlock cycle scope');
      if (!cycleId) throw new Error('No cycle selected');

      const { data: before } = await supabase
        .from('test_cycles')
        .select('*')
        .eq('id', cycleId)
        .single();

      const { data, error } = await supabase
        .from('test_cycles')
        .update({
          scope_locked: lock,
          scope_locked_at: lock ? new Date().toISOString() : null,
          scope_locked_by: lock ? user.id : null,
        })
        .eq('id', cycleId)
        .select()
        .single();

      if (error) throw error;

      await logAuditEntry({
        entityType: 'test_cycles',
        entityId: cycleId,
        action: 'updated',
        beforeData: before,
        afterData: data,
      });

      await logTestActivity(
        user.id,
        lock ? 'scope_locked' : 'scope_unlocked',
        cycleId,
        data.name,
        programId,
        `${lock ? 'Locked' : 'Unlocked'} cycle scope`
      );

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['test-cycle', cycleId] });
      queryClient.invalidateQueries({ queryKey: ['test-cycles'] });
      toast.success(`Cycle scope ${data.scope_locked ? 'locked' : 'unlocked'}`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Add case to cycle (if not locked)
  const addCaseMutation = useMutation({
    mutationFn: async (caseId: string) => {
      if (!user) throw new Error('Not authenticated');
      if (!canEdit) throw new Error('Permission denied');
      if (cycle?.scope_locked) throw new Error('Cycle scope is locked');

      const { data, error } = await supabase
        .from('test_cycle_executions')
        .insert({
          cycle_id: cycleId,
          case_id: caseId,
          status: 'not_run',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cycle-executions', cycleId] });
      queryClient.invalidateQueries({ queryKey: ['test-cycles'] });
      toast.success('Case added to cycle');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Remove case from cycle (if not locked)
  const removeCaseMutation = useMutation({
    mutationFn: async (executionId: string) => {
      if (!user) throw new Error('Not authenticated');
      if (!canDelete) throw new Error('Permission denied');
      if (cycle?.scope_locked) throw new Error('Cycle scope is locked');

      const { error } = await supabase
        .from('test_cycle_executions')
        .delete()
        .eq('id', executionId);

      if (error) throw error;
      return executionId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cycle-executions', cycleId] });
      queryClient.invalidateQueries({ queryKey: ['test-cycles'] });
      toast.success('Case removed from cycle');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return {
    cycle,
    executions: executions || [],
    executionsByStatus,
    workloadByUser,
    isLoading,
    error,
    refetch,
    canEdit,
    canDelete,
    isTeamLead,
    isScopeLocked: cycle?.scope_locked || false,
    updateStatus: updateStatusMutation.mutateAsync,
    assignExecution: assignMutation.mutateAsync,
    bulkAssign: bulkAssignMutation.mutateAsync,
    toggleLock: toggleLockMutation.mutateAsync,
    addCase: addCaseMutation.mutateAsync,
    removeCase: removeCaseMutation.mutateAsync,
    isUpdating: updateStatusMutation.isPending || assignMutation.isPending,
  };
}
