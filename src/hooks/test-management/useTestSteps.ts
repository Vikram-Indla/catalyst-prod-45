/**
 * Hook for managing test steps
 * Auto-versions on step changes
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/lib/catalystToast';
import { createVersionSnapshot } from './useAutoVersioning';

interface AddStepInput {
  test_case_id: string;
  step_number: number;
  action: string;
  expected_result: string;
  test_data?: string;
}

export function useAddTestStep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: AddStepInput) => {
      const { data, error } = await supabase
        .from('tm_test_steps')
        .insert({
          test_case_id: input.test_case_id,
          step_number: input.step_number,
          action: input.action,
          expected_result: input.expected_result,
          test_data: input.test_data || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async (_, variables) => {
      // Create version snapshot
      await createVersionSnapshot({ testCaseId: variables.test_case_id, changeSummary: `Added step ${variables.step_number}` });
      queryClient.invalidateQueries({ queryKey: ['tm-case', variables.test_case_id] });
      queryClient.invalidateQueries({ queryKey: ['tm-case-steps', variables.test_case_id] });
      queryClient.invalidateQueries({ queryKey: ['tm-case-versions', variables.test_case_id] });
      queryClient.invalidateQueries({ queryKey: ['tm-case-versions-count', variables.test_case_id] });
    },
    onError: (error: Error) => {
      catalystToast.error('Failed to add step', error.message);
    },
  });
}

export function useUpdateTestStep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { id: string; test_case_id: string; action?: string; expected_result?: string; test_data?: string }) => {
      const { id, test_case_id, ...updates } = input;
      const { data, error } = await supabase
        .from('tm_test_steps')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { ...data, test_case_id };
    },
    onSuccess: async (data) => {
      // Create version snapshot
      await createVersionSnapshot({ testCaseId: data.test_case_id, changeSummary: 'Step updated' });
      queryClient.invalidateQueries({ queryKey: ['tm-case', data.test_case_id] });
      queryClient.invalidateQueries({ queryKey: ['tm-case-steps', data.test_case_id] });
      queryClient.invalidateQueries({ queryKey: ['tm-case-versions', data.test_case_id] });
      queryClient.invalidateQueries({ queryKey: ['tm-case-versions-count', data.test_case_id] });
    },
    onError: (error: Error) => {
      catalystToast.error('Failed to update step', error.message);
    },
  });
}

export function useDeleteTestStep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { id: string; test_case_id: string }) => {
      const { error } = await supabase
        .from('tm_test_steps')
        .delete()
        .eq('id', input.id);

      if (error) throw error;
      return input;
    },
    onSuccess: async (data) => {
      // Create version snapshot
      await createVersionSnapshot({ testCaseId: data.test_case_id, changeSummary: 'Step deleted' });
      queryClient.invalidateQueries({ queryKey: ['tm-case', data.test_case_id] });
      queryClient.invalidateQueries({ queryKey: ['tm-case-steps', data.test_case_id] });
      queryClient.invalidateQueries({ queryKey: ['tm-case-versions', data.test_case_id] });
      queryClient.invalidateQueries({ queryKey: ['tm-case-versions-count', data.test_case_id] });
      catalystToast.success('Step deleted');
    },
    onError: (error: Error) => {
      catalystToast.error('Failed to delete step', error.message);
    },
  });
}

/**
 * Reorder steps - updates step_number for all affected steps
 */
export function useReorderTestSteps() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { test_case_id: string; stepIds: string[] }) => {
      // Update each step's step_number based on position in array
      const updates = input.stepIds.map((id, index) => 
        supabase
          .from('tm_test_steps')
          .update({ step_number: index + 1 })
          .eq('id', id)
      );

      const results = await Promise.all(updates);
      
      // Check for errors
      const errors = results.filter(r => r.error);
      if (errors.length > 0) {
        throw new Error(errors[0].error?.message || 'Failed to reorder steps');
      }

      return input;
    },
    onSuccess: async (data) => {
      // Create version snapshot
      await createVersionSnapshot({ testCaseId: data.test_case_id, changeSummary: 'Steps reordered' });
      queryClient.invalidateQueries({ queryKey: ['tm-case', data.test_case_id] });
      queryClient.invalidateQueries({ queryKey: ['tm-case-steps', data.test_case_id] });
      queryClient.invalidateQueries({ queryKey: ['tm-case-versions', data.test_case_id] });
      queryClient.invalidateQueries({ queryKey: ['tm-case-versions-count', data.test_case_id] });
      catalystToast.success('Steps reordered');
    },
    onError: (error: Error) => {
      catalystToast.error('Failed to reorder steps', error.message);
    },
  });
}

/**
 * Duplicate a step - creates a copy with incremented step_number
 */
export function useDuplicateTestStep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { stepId: string; test_case_id: string }) => {
      // First, get the step to duplicate
      const { data: originalStep, error: fetchError } = await supabase
        .from('tm_test_steps')
        .select('*')
        .eq('id', input.stepId)
        .single();

      if (fetchError) throw fetchError;

      // Get all steps to find the max step_number
      const { data: allSteps, error: stepsError } = await supabase
        .from('tm_test_steps')
        .select('step_number')
        .eq('test_case_id', input.test_case_id)
        .order('step_number', { ascending: false })
        .limit(1);

      if (stepsError) throw stepsError;

      const maxStepNumber = allSteps?.[0]?.step_number || 0;

      // Insert the duplicate
      const { data: newStep, error: insertError } = await supabase
        .from('tm_test_steps')
        .insert({
          test_case_id: input.test_case_id,
          step_number: maxStepNumber + 1,
          action: originalStep.action,
          expected_result: originalStep.expected_result,
          test_data: originalStep.test_data,
          notes: originalStep.notes,
          is_optional: originalStep.is_optional,
        })
        .select()
        .single();

      if (insertError) throw insertError;
      return { ...newStep, test_case_id: input.test_case_id };
    },
    onSuccess: async (data) => {
      // Create version snapshot
      await createVersionSnapshot({ testCaseId: data.test_case_id, changeSummary: 'Step duplicated' });
      queryClient.invalidateQueries({ queryKey: ['tm-case', data.test_case_id] });
      queryClient.invalidateQueries({ queryKey: ['tm-case-steps', data.test_case_id] });
      queryClient.invalidateQueries({ queryKey: ['tm-case-versions', data.test_case_id] });
      queryClient.invalidateQueries({ queryKey: ['tm-case-versions-count', data.test_case_id] });
      catalystToast.success('Step duplicated');
    },
    onError: (error: Error) => {
      catalystToast.error('Failed to duplicate step', error.message);
    },
  });
}
