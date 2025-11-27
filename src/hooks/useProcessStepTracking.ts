import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ProcessStepHistory {
  id: string;
  epic_id: string;
  process_step_id: string | null;
  entered_at: string;
  exited_at: string | null;
  created_at: string;
}

export function useProcessStepTracking(epicId: string) {
  return useQuery({
    queryKey: ['process-step-tracking', epicId],
    queryFn: async () => {
      // Direct query with type casting to avoid type issues with new table
      const response = await supabase
        .from('epic_process_history' as any)
        .select('*')
        .eq('epic_id', epicId)
        .order('entered_at', { ascending: false });

      if (response.error) {
        console.warn('Process history query failed:', response.error);
        return [];
      }
      return (response.data as unknown) as ProcessStepHistory[];
    },
    enabled: !!epicId,
  });
}

export function useCurrentProcessStepDuration(epicId: string) {
  return useQuery({
    queryKey: ['current-process-step-duration', epicId],
    queryFn: async () => {
      const { data: epic, error: epicError } = await supabase
        .from('epics')
        .select('process_step_entered_at')
        .eq('id', epicId)
        .single();

      if (epicError) throw epicError;

      if (!epic?.process_step_entered_at) {
        return { days: 0, hours: 0 };
      }

      const enteredAt = new Date(epic.process_step_entered_at);
      const now = new Date();
      const diffMs = now.getTime() - enteredAt.getTime();
      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

      return { days, hours };
    },
    enabled: !!epicId,
    refetchInterval: 60000,
  });
}

export function useProcessFlowDuration(epicId: string) {
  return useQuery({
    queryKey: ['process-flow-duration', epicId],
    queryFn: async () => {
      const { data: epic, error: epicError } = await supabase
        .from('epics')
        .select('process_flow_entered_at')
        .eq('id', epicId)
        .single();

      if (epicError) throw epicError;

      if (!epic?.process_flow_entered_at) {
        return { days: 0, hours: 0 };
      }

      const enteredAt = new Date(epic.process_flow_entered_at);
      const now = new Date();
      const diffMs = now.getTime() - enteredAt.getTime();
      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

      return { days, hours };
    },
    enabled: !!epicId,
    refetchInterval: 60000,
  });
}
