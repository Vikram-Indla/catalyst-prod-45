// ============================================================
// MY TASKS REALTIME HOOK
// Planner V9: Live task updates via Supabase subscriptions
// ============================================================

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { myTasksKeys } from './useMyTasks';

export function useMyTasksRealtime() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;

    // Subscribe to task changes for current user
    const taskChannel = supabase
      .channel('my-tasks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'planner_tasks',
          filter: `assignee_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[MyTasks] Task change:', payload.eventType);
          // Invalidate all my-tasks queries
          queryClient.invalidateQueries({ queryKey: myTasksKeys.all });
        }
      )
      .subscribe();

    // Subscribe to activity log for live feed
    const activityChannel = supabase
      .channel('my-tasks-activity')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'planner_activity_log',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: myTasksKeys.activity() });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(taskChannel);
      supabase.removeChannel(activityChannel);
    };
  }, [user?.id, queryClient]);
}
