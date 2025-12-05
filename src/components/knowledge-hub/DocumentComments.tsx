/**
 * Document Comments Component
 * Source: https://support.atlassian.com/confluence-cloud/docs/collaborate-on-content/
 * - Comments allow collaboration on pages
 * - Users can mention others (@mentions)
 * - Comments can be resolved
 */
import { useState } from 'react';
import { MessageCircle, Send, Check, MoreVertical, Trash2, Reply } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MentionInput, CommentContent } from './MentionInput';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface DocumentCommentsProps {
  documentId: string;
}

interface Comment {
  id: string;
  document_id: string;
  parent_comment_id: string | null;
  content: string;
  author_id: string;
  created_at: string;
  updated_at: string;
  resolved: boolean;
}

export function DocumentComments({ documentId }: DocumentCommentsProps) {
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');

  // Fetch comments
  const { data: comments, isLoading } = useQuery({
    queryKey: ['kb-comments', documentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('kb_document_comments')
        .select('*')
        .eq('document_id', documentId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as Comment[];
    },
  });

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async ({ content, parentId }: { content: string; parentId?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('kb_document_comments')
        .insert({
          document_id: documentId,
          content,
          author_id: user.id,
          parent_comment_id: parentId || null,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb-comments', documentId] });
      setNewComment('');
      setReplyContent('');
      setReplyingTo(null);
      toast.success('Comment added');
    },
    onError: () => {
      toast.error('Failed to add comment');
    },
  });

  // Resolve comment mutation
  const resolveCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase
        .from('kb_document_comments')
        .update({ resolved: true })
        .eq('id', commentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb-comments', documentId] });
      toast.success('Comment resolved');
    },
  });

  // Delete comment mutation
  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase
        .from('kb_document_comments')
        .delete()
        .eq('id', commentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb-comments', documentId] });
      toast.success('Comment deleted');
    },
  });

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    addCommentMutation.mutate({ content: newComment });
  };

  const handleAddReply = (parentId: string) => {
    if (!replyContent.trim()) return;
    addCommentMutation.mutate({ content: replyContent, parentId });
  };

  // Organize comments into threads
  const rootComments = comments?.filter(c => !c.parent_comment_id) || [];
  const getReplies = (parentId: string) => 
    comments?.filter(c => c.parent_comment_id === parentId) || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageCircle className="h-5 w-5 text-brand-gold" />
        <h3 className="font-semibold">Comments</h3>
        {comments && comments.length > 0 && (
          <Badge variant="secondary">{comments.length}</Badge>
        )}
      </div>

      {/* Add new comment */}
      <div className="space-y-2">
        <MentionInput
          value={newComment}
          onChange={setNewComment}
          placeholder="Add a comment... Use @ to mention someone"
          minHeight="80px"
        />
        <div className="flex justify-end">
          <Button 
            onClick={handleAddComment}
            disabled={!newComment.trim() || addCommentMutation.isPending}
            size="sm"
          >
            <Send className="h-4 w-4 mr-2" />
            Comment
          </Button>
        </div>
      </div>

      {/* Comments list */}
      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading comments...</div>
      ) : rootComments.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-4">
          No comments yet. Be the first to comment!
        </div>
      ) : (
        <div className="space-y-4">
          {rootComments.map((comment) => (
            <CommentThread
              key={comment.id}
              comment={comment}
              replies={getReplies(comment.id)}
              onResolve={() => resolveCommentMutation.mutate(comment.id)}
              onDelete={() => deleteCommentMutation.mutate(comment.id)}
              onReply={() => setReplyingTo(comment.id)}
              replyingTo={replyingTo}
              replyContent={replyContent}
              setReplyContent={setReplyContent}
              onSubmitReply={() => handleAddReply(comment.id)}
              onCancelReply={() => {
                setReplyingTo(null);
                setReplyContent('');
              }}
              isPending={addCommentMutation.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface CommentThreadProps {
  comment: Comment;
  replies: Comment[];
  onResolve: () => void;
  onDelete: () => void;
  onReply: () => void;
  replyingTo: string | null;
  replyContent: string;
  setReplyContent: (content: string) => void;
  onSubmitReply: () => void;
  onCancelReply: () => void;
  isPending: boolean;
}

function CommentThread({
  comment,
  replies,
  onResolve,
  onDelete,
  onReply,
  replyingTo,
  replyContent,
  setReplyContent,
  onSubmitReply,
  onCancelReply,
  isPending,
}: CommentThreadProps) {
  return (
    <Card className={`p-4 ${comment.resolved ? 'opacity-60' : ''}`}>
      <div className="flex gap-3">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-brand-gold/20 text-brand-gold text-xs">
            U
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">User</span>
              <span className="text-xs text-muted-foreground">
                {new Date(comment.created_at).toLocaleDateString()}
              </span>
              {comment.resolved && (
                <Badge variant="secondary" className="text-xs">
                  <Check className="h-3 w-3 mr-1" />
                  Resolved
                </Badge>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {!comment.resolved && (
                  <DropdownMenuItem onClick={onResolve}>
                    <Check className="h-4 w-4 mr-2" />
                    Resolve
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={onDelete} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <p className="text-sm mt-1"><CommentContent content={comment.content} /></p>
          
          {!comment.resolved && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="mt-2 h-7 text-xs"
              onClick={onReply}
            >
              <Reply className="h-3 w-3 mr-1" />
              Reply
            </Button>
          )}

          {/* Replies */}
          {replies.length > 0 && (
            <div className="mt-3 pl-4 border-l-2 border-muted space-y-3">
              {replies.map((reply) => (
                <div key={reply.id} className="flex gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="bg-muted text-xs">U</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-xs">User</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(reply.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm"><CommentContent content={reply.content} /></p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Reply input */}
          {replyingTo === comment.id && (
            <div className="mt-3 space-y-2">
              <MentionInput
                value={replyContent}
                onChange={setReplyContent}
                placeholder="Write a reply... Use @ to mention someone"
                minHeight="60px"
                className="text-sm"
              />
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={onCancelReply}>
                  Cancel
                </Button>
                <Button 
                  size="sm" 
                  onClick={onSubmitReply}
                  disabled={!replyContent.trim() || isPending}
                >
                  Reply
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
