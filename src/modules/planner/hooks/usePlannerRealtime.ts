// ============================================================
// PLANNER REALTIME HOOK
// Subscribes to real-time updates for planner tasks
// ============================================================

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function usePlannerRealtime(teamId?: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Create a unique channel name (scoped by workstream/team filter)
    const channelName = `planner-tasks-${teamId || 'all'}`;

    // Debounce invalidations to avoid UI flicker during rapid updates
    let invalidateTimer: number | null = null;
    const scheduleInvalidate = () => {
      if (invalidateTimer) return;
      invalidateTimer = window.setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['planner-tasks', teamId] });
        queryClient.invalidateQueries({ queryKey: ['kanban-tasks'] });
        invalidateTimer = null;
      }, 150);
    };

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'planner_tasks',
          ...(teamId ? { filter: `workstream_id=eq.${teamId}` } : {}),
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
  }, [teamId, queryClient]);
}

export default usePlannerRealtime;
