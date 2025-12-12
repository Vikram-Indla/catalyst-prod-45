import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Trash2, Edit, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { usePermission } from '@/hooks/usePermission';
import { useAuth } from '@/lib/auth';

interface CommentsSectionProps {
  entityId: string;
  entityType: string;
}

export function CommentsSection({ entityId, entityType }: CommentsSectionProps) {
  const [newComment, setNewComment] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { hasPermission: canEdit } = usePermission(entityType, 'edit');
  const { hasPermission: canDelete } = usePermission(entityType, 'delete');

  const { data: comments, isLoading } = useQuery({
    queryKey: ['comments', entityId, entityType],
    queryFn: async () => {
      // Fetch comments without join (no FK relationship to profiles)
      const { data: commentsData, error } = await supabase
        .from('comments')
        .select('*')
        .eq('entity_id', entityId)
        .eq('entity_type', entityType)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      if (!commentsData || commentsData.length === 0) return [];

      // Fetch profiles for comment authors
      const userIds = [...new Set(commentsData.map(c => c.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      // Map profiles to comments
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      return commentsData.map(comment => ({
        ...comment,
        profiles: profileMap.get(comment.user_id) || null,
      }));
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('comments').insert({
        entity_id: entityId,
        entity_type: entityType,
        user_id: user.id,
        content,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', entityId, entityType] });
      setNewComment('');
      toast({ title: 'Comment added' });
    },
    onError: () => {
      toast({ title: 'Failed to add comment', variant: 'destructive' });
    },
  });

  const updateCommentMutation = useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      const { error } = await supabase
        .from('comments')
        .update({ content })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', entityId, entityType] });
      setEditingId(null);
      toast({ title: 'Comment updated' });
    },
    onError: () => {
      toast({ title: 'Failed to update comment', variant: 'destructive' });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('comments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', entityId, entityType] });
      toast({ title: 'Comment deleted' });
    },
    onError: () => {
      toast({ title: 'Failed to delete comment', variant: 'destructive' });
    },
  });

  const handleSubmit = () => {
    if (!newComment.trim()) return;
    addCommentMutation.mutate(newComment);
  };

  const handleUpdate = (id: string) => {
    if (!editContent.trim()) return;
    updateCommentMutation.mutate({ id, content: editContent });
  };

  const startEdit = (comment: any) => {
    setEditingId(comment.id);
    setEditContent(comment.content);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditContent('');
  };

  return (
    <div className="space-y-4">
      {/* Add comment */}
      {canEdit && (
        <div className="space-y-2">
          <Textarea
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="min-h-[80px]"
          />
          <Button 
            onClick={handleSubmit} 
            disabled={!newComment.trim() || addCommentMutation.isPending}
            size="sm"
          >
            <Send className="h-4 w-4 mr-2" />
            Post Comment
          </Button>
        </div>
      )}

      {/* Comments list */}
      <div className="space-y-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading comments...</p>
        ) : comments && comments.length > 0 ? (
          comments.map((comment: any) => (
            <div key={comment.id} className="flex gap-3 p-3 bg-muted/50 rounded-lg">
              <Avatar className="h-8 w-8">
                <AvatarFallback>
                  {comment.profiles?.full_name?.charAt(0) || comment.profiles?.email?.charAt(0) || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium">
                      {comment.profiles?.full_name || comment.profiles?.email || 'Unknown'}
                    </span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  {(comment.user_id === user?.id || canDelete) && (
                    <div className="flex gap-1">
                      {comment.user_id === user?.id && canEdit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEdit(comment)}
                          className="h-7 w-7 p-0"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      )}
                      {(comment.user_id === user?.id || canDelete) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteCommentMutation.mutate(comment.id)}
                          className="h-7 w-7 p-0"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
                
                {editingId === comment.id ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="min-h-[60px]"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleUpdate(comment.id)}>
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={cancelEdit}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                )}
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">No comments yet</p>
        )}
      </div>
    </div>
  );
}
