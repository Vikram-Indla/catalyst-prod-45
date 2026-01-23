import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ResourceAssignment {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  assignment_type: string | null;
  created_at: string;
  updated_at: string;
}

export function useResourceAssignments() {
  const queryClient = useQueryClient();

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ['resource-assignments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resource_assignments')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as ResourceAssignment[];
    },
  });

  const { data: allAssignments = [], isLoading: isLoadingAll } = useQuery({
    queryKey: ['resource-assignments-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resource_assignments')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as ResourceAssignment[];
    },
  });

  const createAssignment = useMutation({
    mutationFn: async (input: { name: string; description?: string; assignment_type?: string | null }) => {
      // Get max sort order
      const { data: maxData } = await supabase
        .from('resource_assignments')
        .select('sort_order')
        .order('sort_order', { ascending: false })
        .limit(1)
        .single();

      const nextOrder = (maxData?.sort_order || 0) + 1;

      const { data, error } = await supabase
        .from('resource_assignments')
        .insert({
          name: input.name,
          description: input.description || null,
          assignment_type: input.assignment_type || null,
          sort_order: nextOrder,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['resource-assignments-all'] });
      toast.success('Assignment created successfully');
    },
    onError: (error) => {
      toast.error(`Failed to create assignment: ${error.message}`);
    },
  });

  const updateAssignment = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ResourceAssignment> }) => {
      const { data, error } = await supabase
        .from('resource_assignments')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['resource-assignments-all'] });
      toast.success('Assignment updated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to update assignment: ${error.message}`);
    },
  });

  const deleteAssignment = useMutation({
    mutationFn: async (id: string) => {
      // Soft delete by setting is_active to false
      const { error } = await supabase
        .from('resource_assignments')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['resource-assignments-all'] });
      toast.success('Assignment deleted successfully');
    },
    onError: (error) => {
      toast.error(`Failed to delete assignment: ${error.message}`);
    },
  });

  return {
    assignments,
    allAssignments,
    isLoading,
    isLoadingAll,
    createAssignment,
    updateAssignment,
    deleteAssignment,
  };
}
