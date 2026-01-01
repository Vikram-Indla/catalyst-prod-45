import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CapacityAssignmentType {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export function useCapacityAssignmentTypes() {
  return useQuery({
    queryKey: ['capacity-assignment-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('capacity_assignment_types')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as CapacityAssignmentType[];
    },
  });
}

export function useActiveCapacityAssignmentTypes() {
  return useQuery({
    queryKey: ['capacity-assignment-types', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('capacity_assignment_types')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as CapacityAssignmentType[];
    },
  });
}

export function useCapacityAssignmentTypesMutations() {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      // Get max sort_order
      const { data: existing } = await supabase
        .from('capacity_assignment_types')
        .select('sort_order')
        .order('sort_order', { ascending: false })
        .limit(1);
      
      const nextOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 1;

      const { data: result, error } = await supabase
        .from('capacity_assignment_types')
        .insert({ ...data, sort_order: nextOrder })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['capacity-assignment-types'] });
      toast.success('Assignment type created');
    },
    onError: () => {
      toast.error('Failed to create assignment type');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name?: string; description?: string; is_active?: boolean }) => {
      const { data: result, error } = await supabase
        .from('capacity_assignment_types')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['capacity-assignment-types'] });
      toast.success('Assignment type updated');
    },
    onError: () => {
      toast.error('Failed to update assignment type');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('capacity_assignment_types')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['capacity-assignment-types'] });
      toast.success('Assignment type deleted');
    },
    onError: () => {
      toast.error('Failed to delete assignment type');
    },
  });

  return {
    create: createMutation,
    update: updateMutation,
    delete: deleteMutation,
  };
}
