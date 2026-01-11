// ============================================================
// IDEA COMMENTS SECTION - Wired to useIdeaComments hooks
// ============================================================

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, 
  Trash2, 
  Pin,
  CornerDownRight,
  Send,
} from 'lucide-react';
import { useIdeaComments, useCreateIdeaComment, useDeleteIdeaComment } from '@/hooks/ideas';
import { useAuth } from '@/lib/auth';
import { format } from 'date-fns';

interface IdeaCommentsSectionProps {
  ideaId: string;
}

export function IdeaCommentsSection({ ideaId }: IdeaCommentsSectionProps) {
  const { user } = useAuth();
  const [comment, setComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');

  const { data: comments = [], isLoading } = useIdeaComments(ideaId);
  const createComment = useCreateIdeaComment();
  const deleteComment = useDeleteIdeaComment();

  const handlePostComment = async () => {
    if (!comment.trim()) return;
    await createComment.mutateAsync({
      ideaId,
      content: comment.trim(),
    });
    setComment('');
  };

  const handlePostReply = async (parentId: string) => {
    if (!replyContent.trim()) return;
    await createComment.mutateAsync({
      ideaId,
      content: replyContent.trim(),
      parentId,
    });
    setReplyContent('');
    setReplyingTo(null);
  };

  const handleDelete = async (commentId: string) => {
    await deleteComment.mutateAsync({ commentId, ideaId });
  };

  // Group comments by parent_id
  const parentComments = comments.filter(c => !c.parent_id);
  const replies = comments.filter(c => c.parent_id);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* New Comment Form */}
      <div className="flex gap-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={user?.user_metadata?.avatar_url} />
          <AvatarFallback>
            {user?.email?.charAt(0).toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-2">
          <Textarea
            placeholder="Add a comment..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            className="resize-none"
          />
          <Button 
            size="sm" 
            onClick={handlePostComment}
            disabled={!comment.trim() || createComment.isPending}
            className="gap-2"
          >
            <Send className="h-4 w-4" />
            Post Comment
          </Button>
        </div>
      </div>

      <Separator />

      {/* Comments List */}
      {parentComments.length === 0 ? (
        <div className="text-center py-8">
          <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">
            No comments yet. Be the first to share your thoughts!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {parentComments.map((parentComment) => {
            const commentReplies = replies.filter(r => r.parent_id === parentComment.id);
            
            return (
              <div key={parentComment.id} className="space-y-3">
                {/* Parent Comment */}
                <div className="flex gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={parentComment.user?.avatar_url} />
                    <AvatarFallback>
                      {parentComment.user?.full_name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {parentComment.user?.full_name || 'Unknown User'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(parentComment.created_at), 'MMM dd, yyyy HH:mm')}
                      </span>
                      {parentComment.is_pinned && (
                        <Badge variant="secondary" className="gap-1 text-xs">
                          <Pin className="h-3 w-3" /> Pinned
                        </Badge>
                      )}
                      {parentComment.is_internal && (
                        <Badge variant="outline" className="text-xs">Internal</Badge>
                      )}
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{parentComment.content}</p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setReplyingTo(
                          replyingTo === parentComment.id ? null : parentComment.id
                        )}
                      >
                        <CornerDownRight className="h-3 w-3 mr-1" />
                        Reply
                      </Button>
                      {user?.id === parentComment.user_id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-destructive hover:text-destructive"
                          onClick={() => handleDelete(parentComment.id)}
                          disabled={deleteComment.isPending}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Delete
                        </Button>
                      )}
                    </div>

                    {/* Reply Input */}
                    {replyingTo === parentComment.id && (
                      <div className="flex gap-2 mt-2">
                        <Textarea
                          placeholder="Write a reply..."
                          value={replyContent}
                          onChange={(e) => setReplyContent(e.target.value)}
                          rows={2}
                          className="resize-none text-sm"
                        />
                        <div className="flex flex-col gap-1">
                          <Button
                            size="sm"
                            onClick={() => handlePostReply(parentComment.id)}
                            disabled={!replyContent.trim() || createComment.isPending}
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setReplyingTo(null);
                              setReplyContent('');
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Replies */}
                {commentReplies.length > 0 && (
                  <div className="ml-11 space-y-3 border-l-2 border-muted pl-4">
                    {commentReplies.map((reply) => (
                      <div key={reply.id} className="flex gap-3">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={reply.user?.avatar_url} />
                          <AvatarFallback>
                            {reply.user?.full_name?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">
                              {reply.user?.full_name || 'Unknown User'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(reply.created_at), 'MMM dd, yyyy HH:mm')}
                            </span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{reply.content}</p>
                          {user?.id === reply.user_id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs text-destructive hover:text-destructive"
                              onClick={() => handleDelete(reply.id)}
                              disabled={deleteComment.isPending}
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Delete
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
