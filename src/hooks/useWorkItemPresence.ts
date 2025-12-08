import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface PresenceUser {
  id: string;
  user_id: string;
  user_email: string | null;
  user_name: string | null;
  status: 'viewing' | 'editing';
  last_seen_at: string;
}

export function useWorkItemPresence(workItemType: string, workItemId: string) {
  const queryClient = useQueryClient();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Get current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id);
    });
  }, []);

  // Fetch presence for this work item
  const { data: presenceUsers = [] } = useQuery({
    queryKey: ['work-item-presence', workItemType, workItemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('work_item_presence')
        .select('*')
        .eq('work_item_type', workItemType)
        .eq('work_item_id', workItemId)
        .gte('last_seen_at', new Date(Date.now() - 2 * 60 * 1000).toISOString());
      
      if (error) throw error;
      return data as PresenceUser[];
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Subscribe to realtime presence changes
  useEffect(() => {
    const channel = supabase
      .channel(`presence-${workItemType}-${workItemId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'work_item_presence',
          filter: `work_item_type=eq.${workItemType}`
        },
        () => {
          queryClient.invalidateQueries({ 
            queryKey: ['work-item-presence', workItemType, workItemId] 
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workItemType, workItemId, queryClient]);

  // Join presence
  const joinMutation = useMutation({
    mutationFn: async (status: 'viewing' | 'editing' = 'viewing') => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      const { error } = await supabase
        .from('work_item_presence')
        .upsert({
          work_item_type: workItemType,
          work_item_id: workItemId,
          user_id: user.id,
          user_email: user.email,
          user_name: profile?.full_name || user.email,
          status,
          last_seen_at: new Date().toISOString(),
        }, {
          onConflict: 'work_item_type,work_item_id,user_id'
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['work-item-presence', workItemType, workItemId] 
      });
    },
  });

  // Leave presence
  const leaveMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('work_item_presence')
        .delete()
        .eq('work_item_type', workItemType)
        .eq('work_item_id', workItemId)
        .eq('user_id', user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['work-item-presence', workItemType, workItemId] 
      });
    },
  });

  // Update status
  const updateStatus = useCallback((status: 'viewing' | 'editing') => {
    joinMutation.mutate(status);
  }, [joinMutation]);

  // Heartbeat to keep presence alive
  useEffect(() => {
    if (!workItemId || !currentUserId) return;

    // Join on mount
    joinMutation.mutate('viewing');

    // Heartbeat every 30 seconds
    const interval = setInterval(() => {
      joinMutation.mutate('viewing');
    }, 30000);

    // Leave on unmount
    return () => {
      clearInterval(interval);
      leaveMutation.mutate();
    };
  }, [workItemId, currentUserId]);

  // Filter out current user from display list
  const otherUsers = presenceUsers.filter(p => p.user_id !== currentUserId);

  return {
    presenceUsers: otherUsers,
    updateStatus,
    isEditing: presenceUsers.some(p => p.user_id !== currentUserId && p.status === 'editing'),
  };
}
