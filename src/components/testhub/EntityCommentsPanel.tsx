import React, { useState } from 'react';
import { MessageSquare, Send, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useEntityComments, useAddEntityComment, useDeleteEntityComment } from '@/hooks/useEntityComments';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface EntityCommentsPanelProps {
  entityType: string;
  entityId: string | undefined;
  title?: string;
}

export function EntityCommentsPanel({
  entityType,
  entityId,
  title = 'Comments',
}: EntityCommentsPanelProps) {
  const [content, setContent] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { data: comments = [], isLoading } = useEntityComments(entityType, entityId);
  const addComment = useAddEntityComment(entityType, entityId);
  const deleteComment = useDeleteEntityComment(entityType, entityId);

  React.useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null);
    });
  }, []);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    try {
      await addComment.mutateAsync(content.trim());
      setContent('');
    } catch {
      toast.error('Failed to add comment');
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      await deleteComment.mutateAsync(commentId);
    } catch {
      toast.error('Failed to delete comment');
    }
  };

  if (!entityId) return null;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <MessageSquare size={18} style={{ color: '#6B778C' }} />
        <span style={{ fontSize: 15, fontWeight: 600, color: 'inherit' }}>{title}</span>
        <span style={{ fontSize: 13, color: '#6B778C' }}>({comments.length})</span>
      </div>

      {isLoading ? (
        <p style={{ fontSize: 13, color: '#6B778C', padding: '12px 0' }}>Loading comments...</p>
      ) : comments.length === 0 ? (
        <p style={{ fontSize: 13, color: '#94A3B8', padding: '12px 0', textAlign: 'center' }}>
          No comments yet. Be the first to comment.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 16 }}>
          {comments.map((comment) => (
            <div key={comment.id} className="group" style={{ display: 'flex', gap: 10 }}>
              <Avatar className="h-7 w-7 flex-shrink-0">
                <AvatarImage src={comment.author?.avatar_url ?? undefined} />
                <AvatarFallback className="text-[10px]">
                  {comment.author?.full_name?.[0] ?? '?'}
                </AvatarFallback>
              </Avatar>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>
                    {comment.author?.full_name ?? 'Unknown'}
                  </span>
                  <span style={{ fontSize: 11, color: '#94A3B8' }}>
                    {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                  </span>
                  {currentUserId === comment.author_id && (
                    <button
                      onClick={() => handleDelete(comment.id)}
                      className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 2 }}
                      title="Delete comment"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
                <p style={{ fontSize: 13, lineHeight: 1.5, margin: '4px 0 0', color: 'inherit', whiteSpace: 'pre-wrap' }}>
                  {comment.content}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Add a comment..."
          className="min-h-[72px] text-sm resize-none"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: '#94A3B8' }}>⌘+Enter to submit</span>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!content.trim() || addComment.isPending}
            style={{ backgroundColor: '#2563EB' }}
          >
            <Send className="h-3 w-3 mr-1" /> Send
          </Button>
        </div>
      </div>
    </div>
  );
}
