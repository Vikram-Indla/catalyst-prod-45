// ============================================================
// CALENDAR TASKS REALTIME HOOK
// Supabase subscription for real-time calendar updates
// ============================================================

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface UseCalendarRealtimeOptions {
  startDate: Date;
  endDate: Date;
}

export function useCalendarTasksRealtime({ startDate, endDate }: UseCalendarRealtimeOptions) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('calendar-tasks-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'planner_tasks',
        },
        (payload) => {
          // Invalidate planner tasks to trigger refetch
          queryClient.invalidateQueries({ queryKey: ['planner-tasks'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [startDate, endDate, queryClient]);
}
