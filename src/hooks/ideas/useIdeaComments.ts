// ============================================================
// IMPROVEMENT IDEAS - COMMENTS HOOKS
// ============================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { fromTable } from '@/lib/supabase-utils';
import type { IdeaComment } from '@/types/improvement-ideas';
import { toast } from 'sonner';

// Transform DB row to IdeaComment
function toIdeaComment(row: Record<string, unknown>): IdeaComment {
  return {
    id: row.id as string,
    idea_id: row.idea_id as string,
    parent_id: row.parent_id as string | undefined,
    user_id: row.user_id as string,
    content: row.content as string,
    is_internal: row.is_internal as boolean,
    is_pinned: (row.is_pinned as boolean) || false,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    user: row.user as { full_name: string; avatar_url?: string } | undefined,
  };
}

export function useIdeaComments(ideaId: string | undefined) {
  return useQuery({
    queryKey: ['idea-comments', ideaId],
    queryFn: async () => {
      if (!ideaId) return [];
      
      const { data, error } = await fromTable('idea_comments')
        .select(`
          *,
          user:profiles(full_name, avatar_url)
        `)
        .eq('idea_id', ideaId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return (data || []).map(row => toIdeaComment(row as unknown as Record<string, unknown>));
    },
    enabled: !!ideaId,
  });
}

export function useCreateIdeaComment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      ideaId, 
      content, 
      parentId,
      isInternal = false 
    }: { 
      ideaId: string; 
      content: string; 
      parentId?: string;
      isInternal?: boolean;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await fromTable('idea_comments')
        .insert({
          idea_id: ideaId,
          user_id: user.id,
          content,
          parent_id: parentId,
          is_internal: isInternal,
        })
        .select(`
          *,
          user:profiles(full_name, avatar_url)
        `)
        .single();
      
      if (error) throw error;
      return toIdeaComment(data as unknown as Record<string, unknown>);
    },
    onSuccess: (_, { ideaId }) => {
      queryClient.invalidateQueries({ queryKey: ['idea-comments', ideaId] });
      queryClient.invalidateQueries({ queryKey: ['improvement-idea', ideaId] });
      toast.success('Comment posted');
    },
    onError: (error) => {
      toast.error('Failed to post comment', {
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    },
  });
}

export function useDeleteIdeaComment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ commentId, ideaId }: { commentId: string; ideaId: string }) => {
      const { error } = await fromTable('idea_comments')
        .delete()
        .eq('id', commentId);
      
      if (error) throw error;
      return { commentId, ideaId };
    },
    onSuccess: ({ ideaId }) => {
      queryClient.invalidateQueries({ queryKey: ['idea-comments', ideaId] });
      toast.success('Comment deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete comment', {
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    },
  });
}

export function useIdeaCommentsCount(ideaId: string | undefined) {
  return useQuery({
    queryKey: ['idea-comments-count', ideaId],
    queryFn: async () => {
      if (!ideaId) return 0;
      
      const { count, error } = await fromTable('idea_comments')
        .select('*', { count: 'exact', head: true })
        .eq('idea_id', ideaId)
        .is('deleted_at', null);
      
      if (error) throw error;
      return count || 0;
    },
    enabled: !!ideaId,
  });
}
