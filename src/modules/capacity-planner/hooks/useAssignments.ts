import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { CapacityAssignment } from '../types';

type CreateAssignmentInput = Omit<CapacityAssignment, 'id' | 'created_at' | 'updated_at' | 'profiles' | 'projects' | 'user' | 'project'>;
type UpdateAssignmentInput = Partial<CreateAssignmentInput> & { id: string };

export function useAssignments() {
  const queryClient = useQueryClient();

  const createAssignment = useMutation({
    mutationFn: async (assignment: CreateAssignmentInput) => {
      const { data, error } = await supabase
        .from('assignments')
        .insert(assignment)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['capacity-planner-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['capacity-planner-resources'] });
      toast.success('Assignment created successfully');
    },
    onError: (error) => {
      toast.error(`Failed to create assignment: ${error.message}`);
    },
  });

  const updateAssignment = useMutation({
    mutationFn: async ({ id, ...updates }: UpdateAssignmentInput) => {
      const { data, error } = await supabase
        .from('assignments')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['capacity-planner-assignments'] });
      toast.success('Assignment updated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to update assignment: ${error.message}`);
    },
  });

  const deleteAssignment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('assignments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['capacity-planner-assignments'] });
      toast.success('Assignment deleted successfully');
    },
    onError: (error) => {
      toast.error(`Failed to delete assignment: ${error.message}`);
    },
  });

  return {
    createAssignment,
    updateAssignment,
    deleteAssignment,
  };
}
