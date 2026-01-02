/**
 * Test Cycles Hook
 * CRUD operations for test cycles with permission checks and audit logging
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { usePermission } from '@/hooks/usePermission';
import { logAuditEntry } from '@/lib/auditLogger';
import { toast } from 'sonner';

export interface TestCycle {
  id: string;
  key: string;
  name: string;
  objective: string | null;
  folder_id: string | null;
  program_id: string | null;
  owner_id: string | null;
  status: string | null;
  start_date: string | null;
  end_date: string | null;
  environment: string | null;
  is_adhoc: boolean | null;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  build_version: string | null;
  scope_locked: boolean | null;
  auto_close_on_completion: boolean | null;
  archived: boolean | null;
}

export interface TestCycleWithStats extends TestCycle {
  total_cases: number;
  passed: number;
  failed: number;
  blocked: number;
  not_run: number;
}

export interface CreateTestCycleInput {
  name: string;
  objective?: string;
  folder_id?: string;
  program_id: string;
  status?: string;
  start_date?: string;
  end_date?: string;
  environment?: string;
  source_set_id?: string;
}

export interface UpdateTestCycleInput {
  id: string;
  name?: string;
  objective?: string;
  folder_id?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
  environment?: string;
  owner_id?: string;
  build_version?: string;
  scope_locked?: boolean;
  auto_close_on_completion?: boolean;
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
      entity_type: 'test_cycle',
      entity_id: entityId,
      entity_title: entityTitle,
      program_id: programId,
      description: description || null,
    });
  } catch (err) {
    console.error('Failed to log test activity:', err);
  }
}

export function useTestCycles(programId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Permission checks - cycles require team_lead for create
  const { hasPermission: canCreate } = usePermission('test_cycles', 'create', 'program', programId || undefined);
  const { hasPermission: canEdit } = usePermission('test_cycles', 'edit', 'program', programId || undefined);
  const { hasPermission: canDelete } = usePermission('test_cycles', 'delete', 'program', programId || undefined);

  // Fetch test cycles with execution stats
  const {
    data: testCycles,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['test-cycles', programId],
    queryFn: async () => {
      let query = supabase
        .from('test_cycles')
        .select(`
          *,
          test_cycle_executions(status)
        `)
        .eq('archived', false)
        .order('created_at', { ascending: false });

      if (programId) {
        query = query.eq('program_id', programId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Calculate stats for each cycle
      return (data || []).map((cycle: any) => {
        const executions = cycle.test_cycle_executions || [];
        return {
          ...cycle,
          test_cycle_executions: undefined,
          total_cases: executions.length,
          passed: executions.filter((e: any) => e.status === 'passed').length,
          failed: executions.filter((e: any) => e.status === 'failed').length,
          blocked: executions.filter((e: any) => e.status === 'blocked').length,
          not_run: executions.filter((e: any) => !e.status || e.status === 'not_run').length,
        };
      }) as TestCycleWithStats[];
    },
    enabled: !!user,
  });

  // Create test cycle
  const createMutation = useMutation({
    mutationFn: async (input: CreateTestCycleInput) => {
      if (!user) throw new Error('Not authenticated');
      if (!canCreate) throw new Error('Permission denied: Only team leads can create test cycles');

      // Generate key
      const timestamp = Date.now().toString(36).toUpperCase();
      const key = `CYC-${timestamp}`;

      const { data, error } = await supabase
        .from('test_cycles')
        .insert({
          key,
          name: input.name,
          objective: input.objective || null,
          folder_id: input.folder_id || null,
          program_id: input.program_id,
          status: input.status || 'planned',
          start_date: input.start_date || null,
          end_date: input.end_date || null,
          environment: input.environment || null,
          source_set_id: input.source_set_id || null,
          created_by: user.id,
          archived: false,
        })
        .select()
        .single();

      if (error) throw error;

      // If source_set_id provided, copy cases from set
      if (input.source_set_id) {
        const { data: setCases } = await supabase
          .from('test_set_cases')
          .select('case_id, case_version')
          .eq('set_id', input.source_set_id);

        if (setCases?.length) {
          const executions = setCases.map((sc) => ({
            cycle_id: data.id,
            case_id: sc.case_id,
            case_version: sc.case_version || 1,
            status: 'not_run',
          }));

          await supabase.from('test_cycle_executions').insert(executions);
        }
      }

      // Audit log
      await logAuditEntry({
        entityType: 'test_cycles',
        entityId: data.id,
        action: 'created',
        afterData: data,
      });

      await logTestActivity(
        user.id,
        'created',
        data.id,
        data.name,
        input.program_id,
        `Created test cycle "${data.name}"`
      );

      return data as TestCycle;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-cycles'] });
      toast.success('Test cycle created');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Update test cycle
  const updateMutation = useMutation({
    mutationFn: async (input: UpdateTestCycleInput) => {
      if (!user) throw new Error('Not authenticated');
      if (!canEdit) throw new Error('Permission denied: Cannot edit test cycles');

      // Get current data for audit
      const { data: before } = await supabase
        .from('test_cycles')
        .select('*')
        .eq('id', input.id)
        .single();

      const updateData: Record<string, unknown> = {};
      if (input.name !== undefined) updateData.name = input.name;
      if (input.objective !== undefined) updateData.objective = input.objective;
      if (input.folder_id !== undefined) updateData.folder_id = input.folder_id;
      if (input.status !== undefined) updateData.status = input.status;
      if (input.start_date !== undefined) updateData.start_date = input.start_date;
      if (input.end_date !== undefined) updateData.end_date = input.end_date;
      if (input.environment !== undefined) updateData.environment = input.environment;
      if (input.owner_id !== undefined) updateData.owner_id = input.owner_id;
      if (input.build_version !== undefined) updateData.build_version = input.build_version;
      if (input.scope_locked !== undefined) updateData.scope_locked = input.scope_locked;
      if (input.auto_close_on_completion !== undefined) updateData.auto_close_on_completion = input.auto_close_on_completion;

      const { data, error } = await supabase
        .from('test_cycles')
        .update(updateData)
        .eq('id', input.id)
        .select()
        .single();

      if (error) throw error;

      // Audit log
      await logAuditEntry({
        entityType: 'test_cycles',
        entityId: data.id,
        action: 'updated',
        beforeData: before,
        afterData: data,
      });

      await logTestActivity(
        user.id,
        'updated',
        data.id,
        data.name,
        data.program_id,
        `Updated test cycle "${data.name}"`
      );

      return data as TestCycle;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-cycles'] });
      toast.success('Test cycle updated');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Archive test cycle (soft delete)
  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Not authenticated');
      if (!canDelete) throw new Error('Permission denied: Cannot archive test cycles');

      // Get current data for audit
      const { data: before } = await supabase
        .from('test_cycles')
        .select('*')
        .eq('id', id)
        .single();

      const { error } = await supabase
        .from('test_cycles')
        .update({
          archived: true,
          archived_at: new Date().toISOString(),
          archived_by: user.id,
        })
        .eq('id', id);

      if (error) throw error;

      // Audit log
      await logAuditEntry({
        entityType: 'test_cycles',
        entityId: id,
        action: 'deleted',
        beforeData: before,
      });

      await logTestActivity(
        user.id,
        'archived',
        id,
        before?.name || 'Unknown',
        before?.program_id,
        `Archived test cycle "${before?.name}"`
      );

      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-cycles'] });
      toast.success('Test cycle archived');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return {
    testCycles: testCycles || [],
    isLoading,
    error,
    refetch,
    canCreate,
    canEdit,
    canDelete,
    createTestCycle: createMutation.mutateAsync,
    updateTestCycle: updateMutation.mutateAsync,
    archiveTestCycle: archiveMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isArchiving: archiveMutation.isPending,
  };
}
