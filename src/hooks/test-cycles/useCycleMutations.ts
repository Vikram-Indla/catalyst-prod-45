/**
 * Cycle Mutations Hook
 * Real Supabase mutations for pause/complete/cancel cycle operations
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UseCycleMutationsOptions {
  onSuccess?: () => void;
}

export function useCycleMutations(cycleId: string, options?: UseCycleMutationsOptions) {
  const queryClient = useQueryClient();

  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['cycle-details', cycleId] });
    queryClient.invalidateQueries({ queryKey: ['test-cycles'] });
    options?.onSuccess?.();
  };

  const pauseCycle = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('tm_test_cycles')
        .update({ 
          status: 'paused' as any,
          updated_at: new Date().toISOString()
        })
        .eq('id', cycleId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Cycle paused successfully');
      invalidateQueries();
    },
    onError: (error: any) => {
      toast.error('Failed to pause cycle', { description: error.message });
    },
  });

  const resumeCycle = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('tm_test_cycles')
        .update({ 
          status: 'in_progress' as any,
          updated_at: new Date().toISOString()
        })
        .eq('id', cycleId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Cycle resumed');
      invalidateQueries();
    },
    onError: (error: any) => {
      toast.error('Failed to resume cycle', { description: error.message });
    },
  });

  const completeCycle = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('tm_test_cycles')
        .update({ 
          status: 'completed' as any,
          actual_end: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', cycleId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Cycle marked as complete');
      invalidateQueries();
    },
    onError: (error: any) => {
      toast.error('Failed to complete cycle', { description: error.message });
    },
  });

  const cancelCycle = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('tm_test_cycles')
        .update({ 
          status: 'cancelled' as any,
          actual_end: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', cycleId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.info('Cycle cancelled');
      invalidateQueries();
    },
    onError: (error: any) => {
      toast.error('Failed to cancel cycle', { description: error.message });
    },
  });

  return {
    pauseCycle,
    resumeCycle,
    completeCycle,
    cancelCycle,
    isPausing: pauseCycle.isPending,
    isResuming: resumeCycle.isPending,
    isCompleting: completeCycle.isPending,
    isCancelling: cancelCycle.isPending,
  };
}
