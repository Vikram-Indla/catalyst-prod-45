// =====================================================
// ENHANCED STEP EDITOR HOOKS
// CRUD operations with drag-drop reordering support
// =====================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface TestStep {
  id: string;
  step_number: number;
  step_type: string;
  action: string;
  expected_result: string | null;
  test_data: string | null;
  notes: string | null;
  is_optional: boolean;
  estimated_time_seconds: number | null;
  created_at: string;
  updated_at: string;
}

export interface StepOrder {
  step_id: string;
  new_order: number;
}

// Fetch all steps for a test case
export function useCaseSteps(caseId: string | undefined) {
  return useQuery({
    queryKey: ['case-steps', caseId],
    queryFn: async () => {
      if (!caseId) return [];
      
      const { data, error } = await supabase.rpc('tm_get_case_steps', {
        p_case_id: caseId,
      });

      if (error) throw error;
      return (data || []) as TestStep[];
    },
    enabled: !!caseId,
  });
}

// Reorder steps (for drag-drop)
export function useReorderSteps() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ caseId, stepOrders }: { caseId: string; stepOrders: StepOrder[] }) => {
      const { data, error } = await supabase.rpc('tm_reorder_steps', {
        p_case_id: caseId,
        p_step_orders: JSON.parse(JSON.stringify(stepOrders)),
      });

      if (error) throw error;
      return { success: data as boolean, caseId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['case-steps', data.caseId] });
    },
    onError: (error: Error) => {
      toast({ title: 'Error reordering steps', description: error.message, variant: 'destructive' });
    },
  });
}

// Clone a step
export function useCloneStep() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ stepId, insertAfter, caseId }: { stepId: string; insertAfter?: number; caseId: string }) => {
      const { data, error } = await supabase.rpc('tm_clone_step', {
        p_step_id: stepId,
        p_insert_after: insertAfter ?? null,
      });

      if (error) throw error;
      return { newStepId: data as string, caseId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['case-steps', data.caseId] });
      toast({ title: 'Step cloned' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error cloning step', description: error.message, variant: 'destructive' });
    },
  });
}

// Insert step at position
export function useInsertStep() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      caseId,
      position,
      stepType = 'action',
      action = '',
      expectedResult = '',
      testData,
    }: {
      caseId: string;
      position: number;
      stepType?: string;
      action?: string;
      expectedResult?: string;
      testData?: string;
    }) => {
      const { data, error } = await supabase.rpc('tm_insert_step_at', {
        p_case_id: caseId,
        p_position: position,
        p_step_type: stepType,
        p_action: action,
        p_expected_result: expectedResult,
        p_test_data: testData ?? null,
      });

      if (error) throw error;
      return { newStepId: data as string, caseId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['case-steps', data.caseId] });
      toast({ title: 'Step added' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error adding step', description: error.message, variant: 'destructive' });
    },
  });
}

// Delete step
export function useDeleteStep() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ stepId, caseId }: { stepId: string; caseId: string }) => {
      const { data, error } = await supabase.rpc('tm_delete_step', {
        p_step_id: stepId,
      });

      if (error) throw error;
      return { success: data as boolean, caseId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['case-steps', data.caseId] });
      toast({ title: 'Step deleted' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error deleting step', description: error.message, variant: 'destructive' });
    },
  });
}

// Bulk update steps
export function useBulkUpdateSteps() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ caseId, steps }: { caseId: string; steps: Partial<TestStep>[] }) => {
      const { data, error } = await supabase.rpc('tm_bulk_update_steps', {
        p_case_id: caseId,
        p_steps: steps,
      });

      if (error) throw error;
      return { count: data as number, caseId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['case-steps', data.caseId] });
      toast({ title: `${data.count} steps updated` });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating steps', description: error.message, variant: 'destructive' });
    },
  });
}

// Update single step directly
export function useUpdateStep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ stepId, caseId, updates }: { 
      stepId: string; 
      caseId: string; 
      updates: Partial<Omit<TestStep, 'id' | 'created_at' | 'updated_at'>> 
    }) => {
      const { error } = await supabase
        .from('tm_test_steps')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', stepId);

      if (error) throw error;
      return { stepId, caseId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['case-steps', data.caseId] });
    },
  });
}
