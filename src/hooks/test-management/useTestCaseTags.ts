/**
 * Hook for managing test case tags/labels
 * Uses tm_case_labels junction table + tm_labels for tag definitions
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/lib/catalystToast';

export interface TestCaseLabel {
  id: string;
  name: string;
  color?: string;
}

/**
 * Fetch labels for a test case
 */
export function useTestCaseLabels(testCaseId: string | undefined) {
  return useQuery({
    queryKey: ['tm-case-labels', testCaseId],
    queryFn: async (): Promise<TestCaseLabel[]> => {
      if (!testCaseId) return [];

      const { data, error } = await (supabase as any)
        .from('tm_case_labels')
        .select(`
          id,
          label:tm_labels(id, name, color)
        `)
        .eq('test_case_id', testCaseId);

      if (error) throw error;

      return (data || [])
        .filter((d: any) => d.label)
        .map((d: any) => ({
          id: d.label.id,
          name: d.label.name,
          color: d.label.color,
        }));
    },
    enabled: !!testCaseId,
  });
}

/**
 * Fetch all available labels for the project
 */
export function useAvailableLabels(projectId: string | undefined) {
  return useQuery({
    queryKey: ['tm-labels', projectId],
    queryFn: async (): Promise<TestCaseLabel[]> => {
      if (!projectId) return [];

      const { data, error } = await (supabase as any)
        .from('tm_labels')
        .select('id, name, color')
        .eq('project_id', projectId)
        .order('name');

      if (error) throw error;
      return data || [];
    },
    enabled: !!projectId,
  });
}

/**
 * Add a label to a test case
 */
export function useAddTestCaseLabel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { testCaseId: string; labelId: string }) => {
      const { data, error } = await (supabase as any)
        .from('tm_case_labels')
        .insert({
          test_case_id: input.testCaseId,
          label_id: input.labelId,
        })
        .select()
        .single();

      if (error) throw error;
      return { ...data, testCaseId: input.testCaseId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tm-case-labels', data.testCaseId] });
      queryClient.invalidateQueries({ queryKey: ['tm-case', data.testCaseId] });
    },
    onError: (error: Error) => {
      catalystToast.error('Failed to add label', error.message);
    },
  });
}

/**
 * Remove a label from a test case
 */
export function useRemoveTestCaseLabel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { testCaseId: string; labelId: string }) => {
      const { error } = await (supabase as any)
        .from('tm_case_labels')
        .delete()
        .eq('test_case_id', input.testCaseId)
        .eq('label_id', input.labelId);

      if (error) throw error;
      return input;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tm-case-labels', data.testCaseId] });
      queryClient.invalidateQueries({ queryKey: ['tm-case', data.testCaseId] });
    },
    onError: (error: Error) => {
      catalystToast.error('Failed to remove label', error.message);
    },
  });
}

/**
 * Create a new label and optionally attach to a test case
 */
export function useCreateLabel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { projectId: string; name: string; color?: string; testCaseId?: string }) => {
      // First create the label
      const { data: label, error: labelError } = await (supabase as any)
        .from('tm_labels')
        .insert({
          project_id: input.projectId,
          name: input.name,
          color: input.color || '#6B7280',
        })
        .select()
        .single();

      if (labelError) throw labelError;

      // If testCaseId provided, attach it
      if (input.testCaseId) {
        const { error: linkError } = await (supabase as any)
          .from('tm_case_labels')
          .insert({
            test_case_id: input.testCaseId,
            label_id: label.id,
          });

        if (linkError) throw linkError;
      }

      return { label, testCaseId: input.testCaseId };
    },
    onSuccess: (data) => {
      if (data.testCaseId) {
        queryClient.invalidateQueries({ queryKey: ['tm-case-labels', data.testCaseId] });
        queryClient.invalidateQueries({ queryKey: ['tm-case', data.testCaseId] });
      }
      queryClient.invalidateQueries({ queryKey: ['tm-labels'] });
      catalystToast.success('Label created');
    },
    onError: (error: Error) => {
      catalystToast.error('Failed to create label', error.message);
    },
  });
}
