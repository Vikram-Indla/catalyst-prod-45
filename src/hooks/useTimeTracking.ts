import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface TimeLog {
  id: string;
  work_item_id: string;
  work_item_type: string;
  minutes_logged: number;
  work_date: string;
  description: string | null;
  logged_by: string | null;
  created_at: string;
}

export interface TimeTrackingData {
  original_minutes: number;
  remaining_minutes: number;
  spent_minutes: number;
}

type WorkItemType = 'story' | 'feature' | 'epic';

export function useTimeTracking(workItemId: string, workItemType: WorkItemType) {
  const queryClient = useQueryClient();

  // Fetch time logs for this work item
  const { data: timeLogs = [], isLoading: logsLoading } = useQuery({
    queryKey: ['time-logs', workItemId, workItemType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('work_item_time_logs')
        .select('*')
        .eq('work_item_id', workItemId)
        .eq('work_item_type', workItemType)
        .order('work_date', { ascending: false });

      if (error) throw error;
      return data as TimeLog[];
    },
    enabled: !!workItemId && !!workItemType,
  });

  // Fetch time tracking fields from the work item
  const { data: timeData, isLoading: dataLoading } = useQuery({
    queryKey: ['time-tracking-data', workItemId, workItemType],
    queryFn: async () => {
      let result: TimeTrackingData = { original_minutes: 0, remaining_minutes: 0, spent_minutes: 0 };
      
      if (workItemType === 'story') {
        const { data } = await supabase
          .from('stories')
          .select('original_minutes, remaining_minutes, spent_minutes')
          .eq('id', workItemId)
          .single();
        if (data) result = data as TimeTrackingData;
      } else if (workItemType === 'feature') {
        const { data } = await supabase
          .from('features')
          .select('original_minutes, remaining_minutes, spent_minutes')
          .eq('id', workItemId)
          .single();
        if (data) result = data as TimeTrackingData;
      }
      // Epics don't have time tracking columns yet
      
      return result;
    },
    enabled: !!workItemId && !!workItemType,
  });

  // Add time log entry
  const addTimeLog = useMutation({
    mutationFn: async ({ minutes, description, workDate }: { 
      minutes: number; 
      description?: string; 
      workDate?: string;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('work_item_time_logs')
        .insert({
          work_item_id: workItemId,
          work_item_type: workItemType,
          minutes_logged: minutes,
          description,
          work_date: workDate || new Date().toISOString().split('T')[0],
          logged_by: user?.user?.id,
        });
      
      if (error) throw error;

      // Update spent_minutes on the work item
      const newSpent = (timeData?.spent_minutes || 0) + minutes;
      const newRemaining = Math.max(0, (timeData?.original_minutes || 0) - newSpent);
      
      if (workItemType === 'story') {
        await supabase
          .from('stories')
          .update({ spent_minutes: newSpent, remaining_minutes: newRemaining })
          .eq('id', workItemId);
      } else if (workItemType === 'feature') {
        await supabase
          .from('features')
          .update({ spent_minutes: newSpent, remaining_minutes: newRemaining })
          .eq('id', workItemId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-logs', workItemId, workItemType] });
      queryClient.invalidateQueries({ queryKey: ['time-tracking-data', workItemId, workItemType] });
      toast.success('Time logged');
    },
    onError: () => {
      toast.error('Failed to log time');
    },
  });

  // Update original estimate
  const updateOriginalEstimate = useMutation({
    mutationFn: async (minutes: number) => {
      const newRemaining = Math.max(0, minutes - (timeData?.spent_minutes || 0));
      
      if (workItemType === 'story') {
        const { error } = await supabase
          .from('stories')
          .update({ original_minutes: minutes, remaining_minutes: newRemaining })
          .eq('id', workItemId);
        if (error) throw error;
      } else if (workItemType === 'feature') {
        const { error } = await supabase
          .from('features')
          .update({ original_minutes: minutes, remaining_minutes: newRemaining })
          .eq('id', workItemId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-tracking-data', workItemId, workItemType] });
      toast.success('Estimate updated');
    },
    onError: () => {
      toast.error('Failed to update estimate');
    },
  });

  // Delete time log
  const deleteTimeLog = useMutation({
    mutationFn: async (logId: string) => {
      const log = timeLogs.find(l => l.id === logId);
      if (!log) throw new Error('Log not found');

      const { error } = await supabase
        .from('work_item_time_logs')
        .delete()
        .eq('id', logId);
      
      if (error) throw error;

      // Update spent_minutes on the work item
      const newSpent = Math.max(0, (timeData?.spent_minutes || 0) - log.minutes_logged);
      const newRemaining = Math.max(0, (timeData?.original_minutes || 0) - newSpent);
      
      if (workItemType === 'story') {
        await supabase
          .from('stories')
          .update({ spent_minutes: newSpent, remaining_minutes: newRemaining })
          .eq('id', workItemId);
      } else if (workItemType === 'feature') {
        await supabase
          .from('features')
          .update({ spent_minutes: newSpent, remaining_minutes: newRemaining })
          .eq('id', workItemId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time-logs', workItemId, workItemType] });
      queryClient.invalidateQueries({ queryKey: ['time-tracking-data', workItemId, workItemType] });
      toast.success('Time log deleted');
    },
    onError: () => {
      toast.error('Failed to delete time log');
    },
  });

  const totalLogged = timeLogs.reduce((sum, log) => sum + log.minutes_logged, 0);

  return {
    timeLogs,
    timeData,
    isLoading: logsLoading || dataLoading,
    totalLogged,
    addTimeLog,
    updateOriginalEstimate,
    deleteTimeLog,
  };
}

// Helper to format minutes as hours:minutes
export function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}
