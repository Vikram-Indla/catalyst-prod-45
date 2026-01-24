import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import { toast } from 'sonner';

export interface CapacityDepartment {
  id: string;
  department_id: string;
  name: string;
  description: string | null;
  color: string;
  is_active: boolean;
  sort_order: number;
  created_at: string | null;
  updated_at: string | null;
}

export function useCapacityDepartments() {
  const queryClient = useQueryClient();

  const { data: departments = [], isLoading } = useQuery({
    queryKey: ['capacity-departments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('capacity_departments')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      
      if (error) throw error;
      return data as CapacityDepartment[];
    },
  });

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('capacity-departments-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'capacity_departments' }, () => {
        queryClient.invalidateQueries({ queryKey: ['capacity-departments'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const createDepartment = useMutation({
    mutationFn: async (input: { name: string; color?: string }) => {
      const maxOrder = departments.length > 0 ? Math.max(...departments.map(d => d.sort_order)) : 0;
      const { data, error } = await supabase
        .from('capacity_departments')
        .insert({
          name: input.name,
          color: input.color || '#0d9488',
          sort_order: maxOrder + 1,
        } as any)
        .select()
        .single();
      
      if (error) throw error;
      return data as CapacityDepartment;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['capacity-departments'] });
      toast.success(`Department "${data.name}" created`);
    },
    onError: (error) => {
      toast.error(`Failed to create department: ${error.message}`);
    },
  });

  const updateDepartment = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<CapacityDepartment> }) => {
      const { data, error } = await supabase
        .from('capacity_departments')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as CapacityDepartment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['capacity-departments'] });
      toast.success('Department updated');
    },
    onError: (error) => {
      toast.error(`Failed to update department: ${error.message}`);
    },
  });

  const deleteDepartment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('capacity_departments')
        .update({ is_active: false })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['capacity-departments'] });
      toast.success('Department removed');
    },
    onError: (error) => {
      toast.error(`Failed to remove department: ${error.message}`);
    },
  });

  return {
    departments,
    isLoading,
    createDepartment,
    updateDepartment,
    deleteDepartment,
  };
}
