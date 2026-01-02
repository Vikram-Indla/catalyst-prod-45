/**
 * Test Case Steps Hook
 * CRUD operations for test_case_steps with reorder, versioning, and audit logging
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { logAuditEntry } from '@/lib/auditLogger';
import { toast } from 'sonner';

export interface TestStep {
  id: string;
  case_id: string;
  case_version: number | null;
  step_number: number;
  step_type: string | null;
  description: string;
  expected_result: string | null;
  test_data: string | null;
  attachment_urls: string[] | null;
  is_bdd: boolean | null;
  bdd_keyword: string | null;
  created_at: string | null;
  updated_at: string | null;
  // For shared step reference
  shared_step_id?: string;
  shared_step?: SharedStep;
}

export interface SharedStep {
  id: string;
  title: string;
  description: string;
  expected_result: string | null;
  created_by: string;
  created_at: string | null;
  updated_at: string | null;
  usage_count: number | null;
}

export interface CreateStepInput {
  case_id: string;
  step_number: number;
  description: string;
  expected_result?: string;
  test_data?: string;
  attachment_urls?: string[];
  step_type?: string;
  is_bdd?: boolean;
  bdd_keyword?: string;
}

export interface UpdateStepInput {
  id: string;
  description?: string;
  expected_result?: string;
  test_data?: string;
  attachment_urls?: string[];
  step_type?: string;
  is_bdd?: boolean;
  bdd_keyword?: string;
}

export interface ReorderStepInput {
  id: string;
  new_step_number: number;
}

// Log to test_case_version_changes
async function logVersionChange(
  caseId: string,
  toVersion: number,
  fieldName: string,
  oldValue: string | null,
  newValue: string | null,
  changeType: string,
  changedBy: string | undefined
) {
  try {
    await supabase.from('test_case_version_changes').insert({
      case_id: caseId,
      from_version: toVersion > 1 ? toVersion - 1 : null,
      to_version: toVersion,
      field_name: fieldName,
      old_value: oldValue,
      new_value: newValue,
      change_type: changeType,
      changed_by: changedBy,
    });
  } catch (err) {
    console.error('Failed to log version change:', err);
  }
}

// Log to test_activity_log
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
      entity_type: 'test_case_step',
      entity_id: entityId,
      entity_title: entityTitle,
      program_id: programId,
      description: description || null,
    });
  } catch (err) {
    console.error('Failed to log test activity:', err);
  }
}

export function useTestSteps(caseId: string | null) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Fetch steps for a test case
  const {
    data: steps,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['test-case-steps', caseId],
    queryFn: async () => {
      if (!caseId) return [];
      
      // Get regular steps
      const { data: regularSteps, error: stepsError } = await supabase
        .from('test_case_steps')
        .select('*')
        .eq('case_id', caseId)
        .order('step_number', { ascending: true });
      
      if (stepsError) throw stepsError;

      // Get shared steps linked to this case
      const { data: sharedLinks, error: sharedError } = await supabase
        .from('test_case_shared_steps')
        .select(`
          id,
          step_order,
          shared_step:shared_test_steps(*)
        `)
        .eq('test_case_id', caseId)
        .order('step_order', { ascending: true });

      if (sharedError) throw sharedError;

      // Merge and sort all steps
      const allSteps: TestStep[] = [
        ...(regularSteps || []).map(s => ({ ...s, shared_step_id: undefined })),
        ...(sharedLinks || []).map((link: any) => ({
          id: link.id,
          case_id: caseId,
          case_version: null,
          step_number: link.step_order,
          step_type: 'shared',
          description: link.shared_step?.description || '',
          expected_result: link.shared_step?.expected_result || null,
          test_data: null,
          attachment_urls: null,
          is_bdd: false,
          bdd_keyword: null,
          created_at: null,
          updated_at: null,
          shared_step_id: link.shared_step?.id,
          shared_step: link.shared_step,
        })),
      ].sort((a, b) => a.step_number - b.step_number);

      return allSteps;
    },
    enabled: !!caseId,
  });

  // Get test case info for versioning
  const getTestCaseVersion = async (caseId: string) => {
    const { data } = await supabase
      .from('test_cases')
      .select('version, program_id, title')
      .eq('id', caseId)
      .single();
    return data;
  };

  // Create step
  const createMutation = useMutation({
    mutationFn: async (input: CreateStepInput) => {
      const { data, error } = await supabase
        .from('test_case_steps')
        .insert({
          case_id: input.case_id,
          step_number: input.step_number,
          description: input.description,
          expected_result: input.expected_result || null,
          test_data: input.test_data || null,
          attachment_urls: input.attachment_urls || null,
          step_type: input.step_type || 'action',
          is_bdd: input.is_bdd || false,
          bdd_keyword: input.bdd_keyword || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Log version change
      const caseInfo = await getTestCaseVersion(input.case_id);
      if (caseInfo) {
        await logVersionChange(
          input.case_id,
          caseInfo.version || 1,
          'steps',
          null,
          `Added step ${input.step_number}: ${input.description.substring(0, 50)}`,
          'step_added',
          user?.id
        );
        await logTestActivity(
          user?.id,
          'step_created',
          data.id,
          `Step ${input.step_number}`,
          caseInfo.program_id,
          `Added step to "${caseInfo.title}"`
        );
      }

      // Also log to activity_logs
      await logAuditEntry({
        entityType: 'test_case_step',
        entityId: data.id,
        action: 'created',
        afterData: data,
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-case-steps', caseId] });
      toast.success('Step added');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to add step');
    },
  });

  // Update step
  const updateMutation = useMutation({
    mutationFn: async (input: UpdateStepInput) => {
      // Get before state
      const { data: beforeData } = await supabase
        .from('test_case_steps')
        .select('*')
        .eq('id', input.id)
        .single();

      const updateData: Record<string, any> = {};
      if (input.description !== undefined) updateData.description = input.description;
      if (input.expected_result !== undefined) updateData.expected_result = input.expected_result;
      if (input.test_data !== undefined) updateData.test_data = input.test_data;
      if (input.attachment_urls !== undefined) updateData.attachment_urls = input.attachment_urls;
      if (input.step_type !== undefined) updateData.step_type = input.step_type;
      if (input.is_bdd !== undefined) updateData.is_bdd = input.is_bdd;
      if (input.bdd_keyword !== undefined) updateData.bdd_keyword = input.bdd_keyword;

      const { data, error } = await supabase
        .from('test_case_steps')
        .update(updateData)
        .eq('id', input.id)
        .select()
        .single();

      if (error) throw error;

      // Log version change
      if (beforeData) {
        const caseInfo = await getTestCaseVersion(beforeData.case_id);
        if (caseInfo) {
          await logVersionChange(
            beforeData.case_id,
            caseInfo.version || 1,
            'steps',
            `Step ${beforeData.step_number}: ${beforeData.description?.substring(0, 30)}`,
            `Step ${data.step_number}: ${data.description?.substring(0, 30)}`,
            'step_updated',
            user?.id
          );
          await logTestActivity(
            user?.id,
            'step_updated',
            data.id,
            `Step ${data.step_number}`,
            caseInfo.program_id,
            `Updated step in "${caseInfo.title}"`
          );
        }

        await logAuditEntry({
          entityType: 'test_case_step',
          entityId: data.id,
          action: 'updated',
          beforeData,
          afterData: data,
        });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-case-steps', caseId] });
      toast.success('Step updated');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update step');
    },
  });

  // Delete step
  const deleteMutation = useMutation({
    mutationFn: async (stepId: string) => {
      // Get before state
      const { data: beforeData } = await supabase
        .from('test_case_steps')
        .select('*')
        .eq('id', stepId)
        .single();

      const { error } = await supabase
        .from('test_case_steps')
        .delete()
        .eq('id', stepId);

      if (error) throw error;

      // Log version change
      if (beforeData) {
        const caseInfo = await getTestCaseVersion(beforeData.case_id);
        if (caseInfo) {
          await logVersionChange(
            beforeData.case_id,
            caseInfo.version || 1,
            'steps',
            `Step ${beforeData.step_number}: ${beforeData.description?.substring(0, 50)}`,
            null,
            'step_deleted',
            user?.id
          );
          await logTestActivity(
            user?.id,
            'step_deleted',
            stepId,
            `Step ${beforeData.step_number}`,
            caseInfo.program_id,
            `Deleted step from "${caseInfo.title}"`
          );
        }

        await logAuditEntry({
          entityType: 'test_case_step',
          entityId: stepId,
          action: 'deleted',
          beforeData,
        });
      }

      return stepId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-case-steps', caseId] });
      toast.success('Step deleted');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to delete step');
    },
  });

  // Reorder steps
  const reorderMutation = useMutation({
    mutationFn: async (reorders: ReorderStepInput[]) => {
      // Update all step numbers
      for (const r of reorders) {
        const { error } = await supabase
          .from('test_case_steps')
          .update({ step_number: r.new_step_number })
          .eq('id', r.id);
        
        if (error) throw error;
      }

      // Log reorder
      if (caseId) {
        const caseInfo = await getTestCaseVersion(caseId);
        if (caseInfo) {
          await logVersionChange(
            caseId,
            caseInfo.version || 1,
            'steps',
            'previous order',
            'new order',
            'steps_reordered',
            user?.id
          );
          await logTestActivity(
            user?.id,
            'steps_reordered',
            caseId,
            caseInfo.title || 'Test Case',
            caseInfo.program_id,
            `Reordered ${reorders.length} steps`
          );
        }
      }

      return reorders;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-case-steps', caseId] });
      toast.success('Steps reordered');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to reorder steps');
    },
  });

  return {
    steps: steps || [],
    isLoading,
    error,
    createStep: createMutation.mutateAsync,
    updateStep: updateMutation.mutateAsync,
    deleteStep: deleteMutation.mutateAsync,
    reorderSteps: reorderMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isReordering: reorderMutation.isPending,
  };
}

// Hook for shared steps
export function useSharedSteps() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const {
    data: sharedSteps,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['shared-test-steps'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shared_test_steps')
        .select('*')
        .order('title', { ascending: true });
      
      if (error) throw error;
      return data as SharedStep[];
    },
  });

  // Create shared step
  const createMutation = useMutation({
    mutationFn: async (input: { title: string; description: string; expected_result?: string }) => {
      const { data, error } = await supabase
        .from('shared_test_steps')
        .insert({
          title: input.title,
          description: input.description,
          expected_result: input.expected_result || null,
          created_by: user?.id,
          usage_count: 0,
        })
        .select()
        .single();

      if (error) throw error;

      await logAuditEntry({
        entityType: 'shared_test_step',
        entityId: data.id,
        action: 'created',
        afterData: data,
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shared-test-steps'] });
      toast.success('Shared step created');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to create shared step');
    },
  });

  // Update shared step
  const updateMutation = useMutation({
    mutationFn: async (input: { id: string; title?: string; description?: string; expected_result?: string }) => {
      const { data: beforeData } = await supabase
        .from('shared_test_steps')
        .select('*')
        .eq('id', input.id)
        .single();

      const updateData: Record<string, any> = {};
      if (input.title !== undefined) updateData.title = input.title;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.expected_result !== undefined) updateData.expected_result = input.expected_result;

      const { data, error } = await supabase
        .from('shared_test_steps')
        .update(updateData)
        .eq('id', input.id)
        .select()
        .single();

      if (error) throw error;

      await logAuditEntry({
        entityType: 'shared_test_step',
        entityId: data.id,
        action: 'updated',
        beforeData,
        afterData: data,
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shared-test-steps'] });
      toast.success('Shared step updated');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update shared step');
    },
  });

  // Delete shared step
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data: beforeData } = await supabase
        .from('shared_test_steps')
        .select('*')
        .eq('id', id)
        .single();

      const { error } = await supabase
        .from('shared_test_steps')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await logAuditEntry({
        entityType: 'shared_test_step',
        entityId: id,
        action: 'deleted',
        beforeData,
      });

      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shared-test-steps'] });
      toast.success('Shared step deleted');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to delete shared step');
    },
  });

  // Link shared step to test case
  const linkToTestCase = useMutation({
    mutationFn: async (input: { testCaseId: string; sharedStepId: string; stepOrder: number }) => {
      const { data, error } = await supabase
        .from('test_case_shared_steps')
        .insert({
          test_case_id: input.testCaseId,
          shared_step_id: input.sharedStepId,
          step_order: input.stepOrder,
        })
        .select()
        .single();

      if (error) throw error;

      // Increment usage count manually
      await supabase
        .from('shared_test_steps')
        .update({ usage_count: (sharedSteps?.find(s => s.id === input.sharedStepId)?.usage_count || 0) + 1 })
        .eq('id', input.sharedStepId);

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['test-case-steps', variables.testCaseId] });
      queryClient.invalidateQueries({ queryKey: ['shared-test-steps'] });
      toast.success('Shared step linked');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to link shared step');
    },
  });

  // Unlink shared step from test case
  const unlinkFromTestCase = useMutation({
    mutationFn: async (input: { linkId: string; testCaseId: string; sharedStepId: string }) => {
      const { error } = await supabase
        .from('test_case_shared_steps')
        .delete()
        .eq('id', input.linkId);

      if (error) throw error;

      // Decrement usage count manually
      const currentCount = sharedSteps?.find(s => s.id === input.sharedStepId)?.usage_count || 1;
      await supabase
        .from('shared_test_steps')
        .update({ usage_count: Math.max(0, currentCount - 1) })
        .eq('id', input.sharedStepId);

      return input.linkId;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['test-case-steps', variables.testCaseId] });
      queryClient.invalidateQueries({ queryKey: ['shared-test-steps'] });
      toast.success('Shared step unlinked');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to unlink shared step');
    },
  });

  return {
    sharedSteps: sharedSteps || [],
    isLoading,
    error,
    createSharedStep: createMutation.mutateAsync,
    updateSharedStep: updateMutation.mutateAsync,
    deleteSharedStep: deleteMutation.mutateAsync,
    linkToTestCase: linkToTestCase.mutateAsync,
    unlinkFromTestCase: unlinkFromTestCase.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
