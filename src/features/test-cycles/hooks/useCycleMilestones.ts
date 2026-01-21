// ============================================================================
// HOOK: useCycleMilestones - Milestone CRUD operations
// ============================================================================

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { CreateMilestoneInput, UpdateMilestoneInput } from '../types/cycle-config';

interface RpcResponse {
  success: boolean;
  milestone_id?: string;
  error?: string;
}

export function useCycleMilestones(cycleId: string | undefined) {
  const queryClient = useQueryClient();

  const invalidate = () => {
    if (cycleId) {
      queryClient.invalidateQueries({ queryKey: ['cycle-details', cycleId] });
    }
  };

  const createMilestone = useMutation({
    mutationFn: async (input: Omit<CreateMilestoneInput, 'cycle_id'>) => {
      if (!cycleId) throw new Error('No cycle ID');

      const { data, error } = await supabase.rpc('tm_create_cycle_milestone', {
        p_cycle_id: cycleId,
        p_name: input.name,
        p_target_date: input.target_date,
        p_description: input.description || null,
      });

      if (error) throw error;
      
      const response = data as unknown as RpcResponse;
      if (!response?.success) {
        throw new Error(response?.error || 'Failed to create milestone');
      }

      return response.milestone_id;
    },
    onSuccess: () => {
      invalidate();
      toast.success('Milestone created');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create milestone: ${error.message}`);
    },
  });

  const updateMilestone = useMutation({
    mutationFn: async (input: UpdateMilestoneInput) => {
      const { data, error } = await supabase.rpc('tm_update_cycle_milestone', {
        p_milestone_id: input.milestone_id,
        p_name: input.name || null,
        p_target_date: input.target_date || null,
        p_description: input.description || null,
        p_is_completed: input.is_completed ?? null,
      });

      if (error) throw error;
      
      const response = data as unknown as RpcResponse;
      if (!response?.success) {
        throw new Error(response?.error || 'Failed to update milestone');
      }
    },
    onSuccess: () => {
      invalidate();
      toast.success('Milestone updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update milestone: ${error.message}`);
    },
  });

  const deleteMilestone = useMutation({
    mutationFn: async (milestoneId: string) => {
      const { data, error } = await supabase.rpc('tm_delete_cycle_milestone', {
        p_milestone_id: milestoneId,
      });

      if (error) throw error;
      
      const response = data as unknown as RpcResponse;
      if (!response?.success) {
        throw new Error(response?.error || 'Failed to delete milestone');
      }
    },
    onSuccess: () => {
      invalidate();
      toast.success('Milestone deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete milestone: ${error.message}`);
    },
  });

  const toggleMilestone = useMutation({
    mutationFn: async ({ milestoneId, isCompleted }: { milestoneId: string; isCompleted: boolean }) => {
      const { data, error } = await supabase.rpc('tm_update_cycle_milestone', {
        p_milestone_id: milestoneId,
        p_is_completed: isCompleted,
      });

      if (error) throw error;
      
      const response = data as unknown as RpcResponse;
      if (!response?.success) {
        throw new Error(response?.error || 'Failed to toggle milestone');
      }
    },
    onSuccess: (_, variables) => {
      invalidate();
      toast.success(variables.isCompleted ? 'Milestone completed' : 'Milestone reopened');
    },
    onError: (error: Error) => {
      toast.error(`Failed to toggle milestone: ${error.message}`);
    },
  });

  return {
    createMilestone,
    updateMilestone,
    deleteMilestone,
    toggleMilestone,
    isLoading:
      createMilestone.isPending ||
      updateMilestone.isPending ||
      deleteMilestone.isPending ||
      toggleMilestone.isPending,
  };
}
