import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
        .order('created_at', { ascending: false });
      
      if (error) throw error;

      // Enrich with user profiles
      const enrichedComments: Comment[] = [];
      for (const comment of data || []) {
        let userName = 'Unknown User';
        let userEmail = '';
        
        if (comment.user_id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', comment.user_id)
            .single();
          
          if (profile) {
            userName = profile.full_name || profile.email || 'Unknown User';
            userEmail = profile.email || '';
          }
        }

        enrichedComments.push({
          ...comment,
          user_name: userName,
          user_email: userEmail,
        });
      }

      return enrichedComments;
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

// Save mentions to database
async function saveMentions(commentId: string, usernames: string[]) {
  // Look up user IDs by username/email
  for (const username of usernames) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .or(`full_name.ilike.%${username}%,email.ilike.%${username}%`)
      .limit(1)
      .single();
    
    if (profile) {
      await supabase
        .from('comment_mentions')
        .insert({
          comment_id: commentId,
          mentioned_user_id: profile.id,
        })
        .select();
    }
  }
}

// Hook to fetch users for @mention autocomplete
export function useMentionableUsers() {
  return useQuery({
    queryKey: ['mentionable-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .order('full_name');
      
      if (error) throw error;
      return data || [];
    },
  });
}
