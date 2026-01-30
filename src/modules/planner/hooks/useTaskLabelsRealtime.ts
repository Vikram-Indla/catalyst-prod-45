// ============================================================================
// HOOK: useTaskLabelsRealtime — Realtime subscription for task labels changes
// ============================================================================

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Subscribes to planner_task_labels changes and invalidates the task-labels-map query.
 * This ensures the Task List labels column updates in realtime when labels are assigned/unassigned.
 */
export function useTaskLabelsRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channelName = 'planner-task-labels-realtime';

    // Debounce invalidations to avoid UI flicker during rapid updates
    let invalidateTimer: number | null = null;
    const scheduleInvalidate = () => {
      if (invalidateTimer) return;
      invalidateTimer = window.setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['task-labels-map'] });
        invalidateTimer = null;
      }, 100);
    };

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'planner_task_labels',
        },
        () => {
          scheduleInvalidate();
        }
      )
      .subscribe();

    // Cleanup on unmount
    return () => {
      if (invalidateTimer) window.clearTimeout(invalidateTimer);
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

export default useTaskLabelsRealtime;
