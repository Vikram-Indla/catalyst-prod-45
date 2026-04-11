import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface LinkedTicket {
  id: string;
  request_key: string;
  title: string;
}

// Fetch tickets linked to a specific process step
export function useLinkedTickets(processStepValue: string | null) {
  return useQuery({
    queryKey: ['linked-tickets', processStepValue],
    queryFn: async () => {
      if (!processStepValue) return { tickets: [], count: 0 };
      
      const { data, error, count } = await typedQuery('business_requests')
        .select('id, request_key, title', { count: 'exact' })
        .eq('process_step', processStepValue)
        .is('deleted_at', null)
        .order('request_key', { ascending: false })
        .limit(50);

      if (error) throw error;
      return { 
        tickets: (data || []) as LinkedTicket[], 
        count: count || 0 
      };
    },
    enabled: !!processStepValue,
  });
}

// Reassign tickets from one process step to another
export function useReassignTickets() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      fromProcessStep, 
      toProcessStep 
    }: { 
      fromProcessStep: string; 
      toProcessStep: string;
    }) => {
      const { error, count } = await typedQuery('business_requests')
        .update({ process_step: toProcessStep })
        .eq('process_step', fromProcessStep)
        .is('deleted_at', null);

      if (error) throw error;
      return count;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['linked-tickets', variables.fromProcessStep] });
      queryClient.invalidateQueries({ queryKey: ['business-requests'] });
      queryClient.invalidateQueries({ queryKey: ['demand-process-steps'] });
      toast.success('Tickets reassigned successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to reassign tickets: ${error.message}`);
    },
  });
}

// Delete a process step (only if no tickets are linked)
export function useDeleteProcessStep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (processStepId: string) => {
      const { error } = await supabase
        .from('demand_process_steps')
        .delete()
        .eq('id', processStepId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['demand-process-steps'] });
      toast.success('Process step deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete process step: ${error.message}`);
    },
  });
}
