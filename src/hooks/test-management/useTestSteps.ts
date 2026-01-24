/**
 * Hook for managing test steps
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/lib/catalystToast';

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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tm-case', variables.test_case_id] });
      queryClient.invalidateQueries({ queryKey: ['tm-case-steps', variables.test_case_id] });
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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tm-case', data.test_case_id] });
      queryClient.invalidateQueries({ queryKey: ['tm-case-steps', data.test_case_id] });
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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tm-case', data.test_case_id] });
      queryClient.invalidateQueries({ queryKey: ['tm-case-steps', data.test_case_id] });
      catalystToast.success('Step deleted');
    },
    onError: (error: Error) => {
      catalystToast.error('Failed to delete step', error.message);
    },
  });
}
