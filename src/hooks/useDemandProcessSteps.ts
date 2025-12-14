import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface DemandProcessStep {
  id: string;
  value: string;
  label: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Fetch all process steps (including inactive for admin)
export function useDemandProcessSteps() {
  return useQuery({
    queryKey: ['demand-process-steps'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('demand_process_steps')
        .select('*')
        .order('sort_order');

      if (error) throw error;
      return data as DemandProcessStep[];
    },
  });
}

// Fetch only active process steps (for dropdowns)
export function useActiveDemandProcessSteps() {
  return useQuery({
    queryKey: ['demand-process-steps', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('demand_process_steps')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      return data as DemandProcessStep[];
    },
  });
}

// Get process step options for dropdowns (compatible with existing PROCESS_STEPS format)
export function useDemandProcessStepOptions() {
  const { data: steps = [], isLoading } = useActiveDemandProcessSteps();
  
  const options = steps.map(step => ({
    value: step.value,
    label: step.label,
  }));

  return { options, isLoading };
}

// Get process step info helper (replacement for getProcessStepInfo)
export function useGetProcessStepInfo() {
  const { data: steps = [] } = useActiveDemandProcessSteps();
  
  return (value: string | null | undefined) => {
    if (!value) return { label: 'Unknown' };
    const normalized = value.toLowerCase();
    const step = steps.find(s => s.value.toLowerCase() === normalized);
    return step 
      ? { label: step.label }
      : { label: value.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase()) };
  };
}

// Create process step
export function useCreateDemandProcessStep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { value: string; label: string; sort_order?: number }) => {
      const { data: result, error } = await supabase
        .from('demand_process_steps')
        .insert({
          value: data.value.toLowerCase().replace(/\s+/g, '_'),
          label: data.label,
          sort_order: data.sort_order ?? 0,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['demand-process-steps'] });
      toast.success('Process step added');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add process step: ${error.message}`);
    },
  });
}

// Update process step
export function useUpdateDemandProcessStep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<DemandProcessStep> & { id: string }) => {
      const { error } = await supabase
        .from('demand_process_steps')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['demand-process-steps'] });
      toast.success('Process step updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update process step: ${error.message}`);
    },
  });
}

// Toggle active status
export function useToggleDemandProcessStep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('demand_process_steps')
        .update({ is_active: !is_active })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['demand-process-steps'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to update status: ${error.message}`);
    },
  });
}
