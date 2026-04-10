import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Comment {
  id: string;
  entity_id: string;
  entity_type: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  // Joined data
  user_name?: string;
  user_email?: string;
}

export function useWorkItemComments(entityType: string, entityId: string) {
  const queryClient = useQueryClient();

  // Fetch comments for this entity
  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['work-item-comments', entityType, entityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      if (!data || data.length === 0) return [];

      // Batch fetch all user profiles in a single query
      const userIds = [...new Set(data.map(c => c.user_id).filter(Boolean))];
      const profileMap = new Map<string, { full_name: string | null; email: string | null }>();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', userIds);
        for (const p of profiles || []) {
          profileMap.set(p.id, { full_name: p.full_name, email: p.email });
        }
      }

      return data.map(comment => {
        const profile = profileMap.get(comment.user_id);
        return {
          ...comment,
          user_name: profile?.full_name || profile?.email || 'Unknown User',
          user_email: profile?.email || '',
        } as Comment;
      });
    },
    enabled: !!entityId,
  });

  // Create a comment
  const createComment = useMutation({
    mutationFn: async (content: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('comments')
        .insert({
          entity_type: entityType,
          entity_id: entityId,
          user_id: user.id,
          content,
        })
        .select()
        .single();
      
      if (error) throw error;

      // Extract and save mentions
      const mentions = extractMentions(content);
      if (mentions.length > 0) {
        await saveMentions(data.id, mentions);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-item-comments', entityType, entityId] });
      toast.success('Comment added');
    },
    onError: () => {
      toast.error('Failed to add comment');
    },
  });

  // Update a comment
  const updateComment = useMutation({
    mutationFn: async ({ commentId, content }: { commentId: string; content: string }) => {
      const { error } = await supabase
        .from('comments')
        .update({ content, updated_at: new Date().toISOString() })
        .eq('id', commentId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-item-comments', entityType, entityId] });
      toast.success('Comment updated');
    },
    onError: () => {
      toast.error('Failed to update comment');
    },
  });

  // Delete a comment
  const deleteComment = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-item-comments', entityType, entityId] });
      toast.success('Comment deleted');
    },
    onError: () => {
      toast.error('Failed to delete comment');
    },
  });

  return {
    comments,
    isLoading,
    createComment: createComment.mutate,
    updateComment: updateComment.mutate,
    deleteComment: deleteComment.mutate,
    isCreating: createComment.isPending,
  };
}

// Extract @mentions from content
function extractMentions(content: string): string[] {
  const mentionRegex = /@(\w+)/g;
  const matches = content.match(mentionRegex);
  return matches ? matches.map(m => m.slice(1)) : [];
}

// Save mentions to database — batch lookup + batch insert
async function saveMentions(commentId: string, usernames: string[]) {
  if (usernames.length === 0) return;

  // Batch lookup all mentioned users in a single query
  const orConditions = usernames.map(u => `full_name.ilike.%${u}%,email.ilike.%${u}%`).join(',');
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id')
    .or(orConditions);

  if (profiles && profiles.length > 0) {
    const mentions = profiles.map(p => ({
      comment_id: commentId,
      mentioned_user_id: p.id,
    }));
    await typedQuery('comment_mentions')
      .insert(mentions)
      .select();
  }
}

// Hook to fetch users for @mention autocomplete - only APPROVED users
export function useMentionableUsers() {
  return useQuery({
    queryKey: ['mentionable-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('approval_status', 'APPROVED')
        .order('full_name');
      
      if (error) throw error;
      return data || [];
    },
  });
}
