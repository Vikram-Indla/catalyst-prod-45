import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

export function useSubscriptions(entityType?: string, entityId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: subscriptions = [], isLoading } = useQuery({
    queryKey: ['subscriptions', user?.id, entityType, entityId],
    queryFn: async () => {
      if (!user) return [];
      
      let query = supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id);

      if (entityType) query = query.eq('entity_type', entityType);
      if (entityId) query = query.eq('entity_id', entityId);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const subscribeMutation = useMutation({
    mutationFn: async ({ entityType, entityId }: { entityType: string; entityId: string }) => {
      if (!user) return;
      
      const { error } = await supabase
        .from('subscriptions')
        .insert({
          user_id: user.id,
          entity_type: entityType,
          entity_id: entityId,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions', user?.id] });
    },
  });

  const unsubscribeMutation = useMutation({
    mutationFn: async ({ entityType, entityId }: { entityType: string; entityId: string }) => {
      if (!user) return;
      
      const { error } = await supabase
        .from('subscriptions')
        .delete()
        .eq('user_id', user.id)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions', user?.id] });
    },
  });

  const isSubscribed = (checkEntityType: string, checkEntityId: string) => {
    return subscriptions.some(
      sub => sub.entity_type === checkEntityType && sub.entity_id === checkEntityId
    );
  };

  return {
    subscriptions,
    isLoading,
    subscribe: subscribeMutation.mutate,
    unsubscribe: unsubscribeMutation.mutate,
    isSubscribed,
  };
}
