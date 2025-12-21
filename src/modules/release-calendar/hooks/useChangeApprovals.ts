import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ChangeApproval, ApprovalStepStatus } from '../types';
import { changeCardKeys } from './useChangeCards';

export const changeApprovalKeys = {
  all: ['change-approvals'] as const,
  byChange: (changeCardId: string) => [...changeApprovalKeys.all, 'change', changeCardId] as const,
};

export function useChangeApprovals(changeCardId: string) {
  return useQuery({
    queryKey: changeApprovalKeys.byChange(changeCardId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('change_approvals')
        .select('*')
        .eq('change_card_id', changeCardId)
        .order('step_order', { ascending: true });

      if (error) throw error;
      return data as ChangeApproval[];
    },
    enabled: !!changeCardId,
  });
}

export function useUpdateApprovalStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      status, 
      comments 
    }: { 
      id: string; 
      status: ApprovalStepStatus; 
      comments?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('change_approvals')
        .update({
          status,
          comments,
          decision_by_user_id: user.id,
          decided_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as ChangeApproval;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: changeApprovalKeys.byChange(data.change_card_id) });
      queryClient.invalidateQueries({ queryKey: changeCardKeys.detail(data.change_card_id) });
    },
  });
}

export function useCreateApprovalSteps() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      changeCardId, 
      steps 
    }: { 
      changeCardId: string; 
      steps: Array<{ step_type: string; step_order: number; assigned_role?: string }>;
    }) => {
      const { data, error } = await supabase
        .from('change_approvals')
        .insert(
          steps.map(step => ({
            change_card_id: changeCardId,
            step_type: step.step_type,
            step_order: step.step_order,
            assigned_role: step.assigned_role,
            status: 'pending',
          }))
        )
        .select();

      if (error) throw error;
      return data as ChangeApproval[];
    },
    onSuccess: (_, { changeCardId }) => {
      queryClient.invalidateQueries({ queryKey: changeApprovalKeys.byChange(changeCardId) });
    },
  });
}
