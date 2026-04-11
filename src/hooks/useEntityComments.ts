import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface EntityComment {
  id: string;
  entity_type: string;
  entity_id: string;
  author_id: string;
  content: string;
  created_at: string;
  author?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

export function useEntityComments(entityType: string, entityId: string | undefined) {
  return useQuery({
    queryKey: ['comments', entityType, entityId],
    enabled: !!entityId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('tm_comments')
        .select(`
          id,
          entity_type,
          entity_id,
          author_id,
          content,
          created_at,
          author:profiles(full_name, avatar_url)
        `)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as EntityComment[];
    },
  });
}

export function useAddEntityComment(entityType: string, entityId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (content: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !entityId) throw new Error('Not authenticated or missing entity');
      const { error } = await (supabase as any).from('tm_comments').insert({
        entity_type: entityType,
        entity_id: entityId,
        author_id: user.id,
        content,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', entityType, entityId] });
    },
  });
}

export function useDeleteEntityComment(entityType: string, entityId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await (supabase as any)
        .from('tm_comments')
        .delete()
        .eq('id', commentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', entityType, entityId] });
    },
  });
}
