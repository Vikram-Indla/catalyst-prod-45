/**
 * useApplyTemplate Hook - Apply template to create new cycle
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { ApplyTemplateInput } from '@/types/template.types';

export function useApplyTemplate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (input: ApplyTemplateInput) => {
      // TODO: Replace with actual Supabase RPC call
      // const { data, error } = await supabase
      //   .rpc('apply_template', {
      //     p_template_id: input.templateId,
      //     p_cycle_name: input.cycleName,
      //     p_start_date: input.startDate.toISOString().split('T')[0],
      //     p_created_by: (await supabase.auth.getUser()).data.user?.id
      //   });
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Return mock cycle ID
      const cycleId = `cycle-${Date.now()}`;
      
      // If smart assignment requested, run it
      if (input.options?.runSmartAssignment) {
        // await supabase.rpc('smart_assign_tests', { p_cycle_id: cycleId });
        console.log('Running smart assignment for cycle:', cycleId);
      }
      
      // If notification requested
      if (input.options?.notifyTeam) {
        console.log('Sending team notifications for cycle:', cycleId);
      }
      
      return {
        cycleId,
        cycleName: input.cycleName,
        startDate: input.startDate,
        endDate: input.endDate,
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      queryClient.invalidateQueries({ queryKey: ['cycles'] });
      toast.success(`Cycle "${data.cycleName}" created successfully`);
    },
    onError: (error) => {
      toast.error('Failed to create cycle from template');
      console.error('Apply template error:', error);
    },
  });
}
