import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { catalystToast } from '@/lib/catalystToast';
import type { CapacityAssignment } from '../types';

type CreateAssignmentInput = Omit<CapacityAssignment, 'id' | 'created_at' | 'updated_at' | 'profiles' | 'projects' | 'user' | 'project'>;
type UpdateAssignmentInput = Partial<CreateAssignmentInput> & { id: string };

export function useAssignments() {
  const queryClient = useQueryClient();

  const createAssignment = useMutation({
    mutationFn: async (assignment: CreateAssignmentInput) => {
      const { data, error } = await typedQuery('assignments')
        .insert(assignment)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['capacity-planner-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['capacity-planner-resources'] });
      catalystToast.success('Assignment created successfully');
    },
    onError: (error) => {
      catalystToast.error(`Failed to create assignment: ${error.message}`);
    },
  });

  const updateAssignment = useMutation({
    mutationFn: async ({ id, ...updates }: UpdateAssignmentInput) => {
      const { data, error } = await typedQuery('assignments')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['capacity-planner-assignments'] });
      catalystToast.success('Assignment updated successfully');
    },
    onError: (error) => {
      catalystToast.error(`Failed to update assignment: ${error.message}`);
    },
  });

  const deleteAssignment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await typedQuery('assignments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['capacity-planner-assignments'] });
      catalystToast.success('Assignment deleted successfully');
    },
    onError: (error) => {
      catalystToast.error(`Failed to delete assignment: ${error.message}`);
    },
  });

  return {
    createAssignment,
    updateAssignment,
    deleteAssignment,
  };
}
