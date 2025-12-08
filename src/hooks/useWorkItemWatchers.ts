import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface Watcher {
  id: string;
  work_item_type: string;
  work_item_id: string;
  user_id: string;
  created_at: string;
}

export function useWorkItemWatchers(workItemType: string, workItemId: string) {
  const queryClient = useQueryClient();

  // Fetch current user
  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  // Fetch watchers for this work item
  const { data: watchers, isLoading } = useQuery({
    queryKey: ['work-item-watchers', workItemType, workItemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('work_item_watchers')
        .select('*')
        .eq('work_item_type', workItemType)
        .eq('work_item_id', workItemId);
      if (error) throw error;
      return data as Watcher[];
    },
    enabled: !!workItemId,
  });

  const isWatching = watchers?.some(w => w.user_id === currentUser?.id);

  // Watch mutation
  const watchMutation = useMutation({
    mutationFn: async () => {
      if (!currentUser) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('work_item_watchers')
        .insert({
          work_item_type: workItemType,
          work_item_id: workItemId,
          user_id: currentUser.id,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-item-watchers', workItemType, workItemId] });
      toast.success('You are now watching this item');
    },
    onError: () => {
      toast.error('Failed to watch item');
    },
  });

  // Unwatch mutation
  const unwatchMutation = useMutation({
    mutationFn: async () => {
      if (!currentUser) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('work_item_watchers')
        .delete()
        .eq('work_item_type', workItemType)
        .eq('work_item_id', workItemId)
        .eq('user_id', currentUser.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-item-watchers', workItemType, workItemId] });
      toast.success('You are no longer watching this item');
    },
    onError: () => {
      toast.error('Failed to unwatch item');
    },
  });

  const toggleWatch = () => {
    if (isWatching) {
      unwatchMutation.mutate();
    } else {
      watchMutation.mutate();
    }
  };

  return {
    watchers: watchers || [],
    isLoading,
    isWatching,
    toggleWatch,
    isPending: watchMutation.isPending || unwatchMutation.isPending,
    currentUser,
  };
}
