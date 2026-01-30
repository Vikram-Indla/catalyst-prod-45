// ============================================================================
// HOOK: useTaskRealtime — Real-time subscription for task updates
// Syncs task changes from other users/tabs in real-time
// ============================================================================

import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface UseTaskRealtimeOptions {
  taskId: string | null;
  enabled?: boolean;
  onUpdate?: (payload: any) => void;
}

export const useTaskRealtime = ({ 
  taskId, 
  enabled = true,
  onUpdate 
}: UseTaskRealtimeOptions) => {
  const queryClient = useQueryClient();

  const handleRealtimeUpdate = useCallback((payload: any) => {
    console.log('[TaskRealtime] Received update:', payload);
    
    if (payload.eventType === 'UPDATE' && payload.new) {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['planner-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['kanban-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['planner-task-list'] });
      queryClient.invalidateQueries({ queryKey: ['timeline-tasks-v2'] });
      queryClient.invalidateQueries({ queryKey: ['planner-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['board-tasks'] });
      
      if (taskId) {
        queryClient.invalidateQueries({ queryKey: ['task-detail', taskId] });
      }
      
      onUpdate?.(payload);
    }
  }, [queryClient, taskId, onUpdate]);

  useEffect(() => {
    if (!enabled || !taskId) return;

    // Subscribe to changes on this specific task
    const channel = supabase
      .channel(`task-${taskId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'planner_tasks',
          filter: `id=eq.${taskId}`
        },
        handleRealtimeUpdate
      )
      .subscribe((status) => {
        console.log('[TaskRealtime] Subscription status:', status);
      });

    return () => {
      console.log('[TaskRealtime] Unsubscribing from task:', taskId);
      supabase.removeChannel(channel);
    };
  }, [taskId, enabled, handleRealtimeUpdate]);
};

export default useTaskRealtime;
