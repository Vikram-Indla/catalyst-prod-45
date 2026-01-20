/**
 * Module 3A-4: Hook for link/unlink/create defect operations
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { LinkDefectInput, QuickCreateDefectInput } from '../types/defect-linking';

interface RpcResponse {
  success?: boolean;
  error?: string;
  defect_key?: string;
  defect_id?: string;
  link_id?: string;
}

export function useDefectMutations(stepResultId: string) {
  const queryClient = useQueryClient();

  const linkDefect = useMutation({
    mutationFn: async (input: LinkDefectInput): Promise<RpcResponse> => {
      const { data, error } = await supabase
        .rpc('link_defect_to_step_v2', {
          p_defect_id: input.defect_id,
          p_step_result_id: input.step_result_id,
          p_run_id: input.run_id || null,
          p_link_type: input.link_type || 'manual',
        });

      if (error) throw error;
      const response = data as RpcResponse;
      if (response?.error) throw new Error(response.error);

      return response;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['linked-defects', stepResultId] });
      toast.success(`${data.defect_key} has been linked to this step.`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const unlinkDefect = useMutation({
    mutationFn: async (defectId: string): Promise<RpcResponse> => {
      const { data, error } = await supabase
        .rpc('unlink_defect_from_step_v2', {
          p_defect_id: defectId,
          p_step_result_id: stepResultId,
        });

      if (error) throw error;
      const response = data as RpcResponse;
      if (response?.error) throw new Error(response.error);

      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['linked-defects', stepResultId] });
      toast.success('The defect has been unlinked from this step.');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const createDefect = useMutation({
    mutationFn: async (input: QuickCreateDefectInput): Promise<RpcResponse> => {
      const { data, error } = await supabase
        .rpc('quick_create_defect_v2', {
          p_project_id: input.project_id,
          p_step_result_id: input.step_result_id,
          p_run_id: input.run_id || null,
          p_title: input.title,
          p_description: input.description || null,
          p_severity: input.severity || 'major',
          p_assigned_to: input.assigned_to || null,
        });

      if (error) throw error;
      const response = data as RpcResponse;
      if (response?.error) throw new Error(response.error);

      return response;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['linked-defects', stepResultId] });
      queryClient.invalidateQueries({ queryKey: ['defect-search'] });
      toast.success(`${data.defect_key} has been created and linked.`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return {
    linkDefect,
    unlinkDefect,
    createDefect,
    isLinking: linkDefect.isPending,
    isUnlinking: unlinkDefect.isPending,
    isCreating: createDefect.isPending,
  };
}
