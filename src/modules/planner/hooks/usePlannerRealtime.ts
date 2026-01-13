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
    // Create a unique channel name
    const channelName = `planner-tasks-${teamId || 'all'}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'stories',
          ...(teamId ? { filter: `team_id=eq.${teamId}` } : {}),
        },
        (payload) => {
          console.log('Realtime update:', payload.eventType, payload);
          
          // Invalidate and refetch on any change
          queryClient.invalidateQueries({ queryKey: ['planner-tasks', teamId] });
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });

    // Cleanup on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [teamId, queryClient]);
}

export default usePlannerRealtime;
