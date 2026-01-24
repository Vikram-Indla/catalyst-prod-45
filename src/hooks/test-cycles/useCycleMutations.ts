/**
 * Cycle Mutations Hook
 * Real Supabase mutations for status transitions with validation
 * Extended Lifecycle: draft → planned → active → paused → completed → archived
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  type CycleStatus,
  isValidStatusTransition,
  getTransitionErrorMessage,
  getAllowedNextStatuses,
} from '@/features/test-cycles/types/cycle-config';

interface UseCycleMutationsOptions {
  onSuccess?: () => void;
}

interface TransitionResult {
  success: boolean;
  error?: string;
}

export function useCycleMutations(cycleId: string, options?: UseCycleMutationsOptions) {
  const queryClient = useQueryClient();

  const invalidateQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['cycle-details', cycleId] });
    queryClient.invalidateQueries({ queryKey: ['test-cycles'] });
    queryClient.invalidateQueries({ queryKey: ['tm-cycles-enhanced'] });
    queryClient.invalidateQueries({ queryKey: ['tm-cycles'] });
    options?.onSuccess?.();
  };

  /**
   * Generic status transition mutation with validation
   */
  const transitionStatus = useMutation({
    mutationFn: async ({ 
      fromStatus, 
      toStatus 
    }: { 
      fromStatus: CycleStatus; 
      toStatus: CycleStatus;
    }): Promise<TransitionResult> => {
      // Validate transition
      if (!isValidStatusTransition(fromStatus, toStatus)) {
        const errorMsg = getTransitionErrorMessage(fromStatus, toStatus);
        throw new Error(errorMsg);
      }

      const updatePayload: Record<string, any> = {
        status: toStatus as any,
        updated_at: new Date().toISOString(),
      };

      // Set actual_start when transitioning to active
      if (toStatus === 'active' && (fromStatus === 'planned' || fromStatus === 'draft')) {
        updatePayload.actual_start = new Date().toISOString();
      }

      // Set actual_end when transitioning to completed
      if (toStatus === 'completed') {
        updatePayload.actual_end = new Date().toISOString();
      }

      const { error } = await supabase
        .from('tm_test_cycles')
        .update(updatePayload)
        .eq('id', cycleId);

      if (error) {
        // Surface the actual DB error
        throw new Error(error.message);
      }

      return { success: true };
    },
    onSuccess: (_, variables) => {
      const statusLabels: Record<CycleStatus, string> = {
        draft: 'Draft',
        planned: 'Planned',
        active: 'Active',
        paused: 'Paused',
        in_progress: 'In Progress',
        completed: 'Completed',
        archived: 'Archived',
      };
      toast.success(`Cycle status changed to ${statusLabels[variables.toStatus]}`);
      invalidateQueries();
    },
    onError: (error: Error) => {
      toast.error('Failed to change status', { description: error.message });
    },
  });

  // Convenience mutations for common transitions
  const startCycle = useMutation({
    mutationFn: async (currentStatus: CycleStatus) => {
      return transitionStatus.mutateAsync({ fromStatus: currentStatus, toStatus: 'active' });
    },
    onSuccess: () => {
      toast.success('Cycle started');
      invalidateQueries();
    },
    onError: (error: Error) => {
      toast.error('Failed to start cycle', { description: error.message });
    },
  });

  const pauseCycle = useMutation({
    mutationFn: async (currentStatus: CycleStatus) => {
      return transitionStatus.mutateAsync({ fromStatus: currentStatus, toStatus: 'paused' });
    },
    onSuccess: () => {
      toast.success('Cycle paused');
      invalidateQueries();
    },
    onError: (error: Error) => {
      toast.error('Failed to pause cycle', { description: error.message });
    },
  });

  const resumeCycle = useMutation({
    mutationFn: async (currentStatus: CycleStatus) => {
      return transitionStatus.mutateAsync({ fromStatus: currentStatus, toStatus: 'active' });
    },
    onSuccess: () => {
      toast.success('Cycle resumed');
      invalidateQueries();
    },
    onError: (error: Error) => {
      toast.error('Failed to resume cycle', { description: error.message });
    },
  });

  const completeCycle = useMutation({
    mutationFn: async (currentStatus: CycleStatus) => {
      return transitionStatus.mutateAsync({ fromStatus: currentStatus, toStatus: 'completed' });
    },
    onSuccess: () => {
      toast.success('Cycle marked as complete');
      invalidateQueries();
    },
    onError: (error: Error) => {
      toast.error('Failed to complete cycle', { description: error.message });
    },
  });

  const archiveCycle = useMutation({
    mutationFn: async (currentStatus: CycleStatus) => {
      return transitionStatus.mutateAsync({ fromStatus: currentStatus, toStatus: 'archived' });
    },
    onSuccess: () => {
      toast.info('Cycle archived');
      invalidateQueries();
    },
    onError: (error: Error) => {
      toast.error('Failed to archive cycle', { description: error.message });
    },
  });

  const promoteToPlan = useMutation({
    mutationFn: async (currentStatus: CycleStatus) => {
      return transitionStatus.mutateAsync({ fromStatus: currentStatus, toStatus: 'planned' });
    },
    onSuccess: () => {
      toast.success('Cycle promoted to planned');
      invalidateQueries();
    },
    onError: (error: Error) => {
      toast.error('Failed to promote cycle', { description: error.message });
    },
  });

  return {
    // Core transition mutation
    transitionStatus,
    
    // Convenience mutations
    startCycle,
    pauseCycle,
    resumeCycle,
    completeCycle,
    archiveCycle,
    promoteToPlan,
    
    // Loading states
    isTransitioning: transitionStatus.isPending,
    isStarting: startCycle.isPending,
    isPausing: pauseCycle.isPending,
    isResuming: resumeCycle.isPending,
    isCompleting: completeCycle.isPending,
    isArchiving: archiveCycle.isPending,
    isPromoting: promoteToPlan.isPending,
    
    // Utility functions
    getAllowedNextStatuses,
    isValidStatusTransition,
  };
}
