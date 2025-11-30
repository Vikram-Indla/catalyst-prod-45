// Story Discussions - commenting and collaboration
// Citation: Catalyst_Stories_PRD_v2.pdf
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { Send, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface StoryDiscussionsProps {
  storyId: string;
}

export function StoryDiscussions({ storyId }: StoryDiscussionsProps) {
  const [newComment, setNewComment] = useState('');
  const queryClient = useQueryClient();

  const { data: discussions, isLoading } = useQuery({
    queryKey: ['story-discussions', storyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('discussions')
        .select('*, profiles(full_name, email)')
        .eq('entity_type', 'stories')
        .eq('entity_id', storyId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: async (message: string) => {
      if (!currentUser) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('discussions')
        .insert({
          entity_type: 'stories',
          entity_id: storyId,
          user_id: currentUser.id,
          message,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['story-discussions', storyId] });
      setNewComment('');
      toast.success('Comment added');
    },
    onError: () => {
      toast.error('Failed to add comment');
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (discussionId: string) => {
      const { error } = await supabase
        .from('discussions')
        .delete()
        .eq('id', discussionId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['story-discussions', storyId] });
      toast.success('Comment deleted');
    },
    onError: () => {
      toast.error('Failed to delete comment');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.trim()) {
      addCommentMutation.mutate(newComment);
    }
  };

  return (
    <div className="space-y-4">
      {/* Add Comment Form */}
      <form onSubmit={handleSubmit} className="space-y-2">
        <Textarea
          placeholder="Add a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          rows={3}
          className="resize-none"
        />
        <div className="flex justify-end">
          <Button
            type="submit"
            size="sm"
            disabled={!newComment.trim() || addCommentMutation.isPending}
          >
            <Send className="h-4 w-4 mr-2" />
            {addCommentMutation.isPending ? 'Posting...' : 'Post Comment'}
          </Button>
        </div>
      </form>

      {/* Comments List */}
      <div className="space-y-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-4">Loading discussions...</p>
        ) : discussions && discussions.length > 0 ? (
          discussions.map((discussion: any) => (
            <div key={discussion.id} className="flex gap-3 p-3 rounded-lg border bg-card">
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarFallback className="text-xs">
                  {discussion.profiles?.full_name?.charAt(0) || discussion.profiles?.email?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {discussion.profiles?.full_name || discussion.profiles?.email || 'Unknown User'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(discussion.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  
                  {currentUser?.id === discussion.user_id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteCommentMutation.mutate(discussion.id)}
                      className="h-7 w-7 p-0"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                
                <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap break-words">
                  {discussion.message}
                </p>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No discussions yet. Be the first to comment!
          </p>
        )}
      </div>
    </div>
  );
}
