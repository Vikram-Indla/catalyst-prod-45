import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

export function useDiscussions(entityType: string, entityId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: discussions = [], isLoading } = useQuery({
    queryKey: ['discussions', entityType, entityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('discussions')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!entityType && !!entityId,
  });

  const addDiscussionMutation = useMutation({
    mutationFn: async ({ message, mentions }: { message: string; mentions?: string[] }) => {
      if (!user) return;
      
      // Insert discussion
      const { data: discussion, error } = await supabase
        .from('discussions')
        .insert({
          entity_type: entityType,
          entity_id: entityId,
          user_id: user.id,
          message,
        })
        .select()
        .single();

      if (error) throw error;

      // Insert mentions if any
      if (mentions && mentions.length > 0 && discussion) {
        const mentionInserts = mentions.map(userId => ({
          discussion_id: discussion.id,
          mentioned_user_id: userId,
        }));

        await supabase.from('discussion_mentions').insert(mentionInserts);
      }

      return discussion;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discussions', entityType, entityId] });
    },
  });

  const deleteDiscussionMutation = useMutation({
    mutationFn: async (discussionId: string) => {
      const { error } = await supabase
        .from('discussions')
        .delete()
        .eq('id', discussionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discussions', entityType, entityId] });
    },
  });

  return {
    discussions,
    isLoading,
    addDiscussion: addDiscussionMutation.mutate,
    deleteDiscussion: deleteDiscussionMutation.mutate,
    isAdding: addDiscussionMutation.isPending,
  };
}
