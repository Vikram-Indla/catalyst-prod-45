/**
 * Description Comments
 * 
 * Threaded comments on descriptions.
 * Features:
 * - Top-level comments
 * - Replies (threaded)
 * - Reactions (emoji)
 * - Mentions
 * - Resolved/unresolved status
 * 
 * Persisted to Supabase: `description_comments` table
 * Real-time updates via TanStack Query
 * 
 * DYNAMITE Stage D:
 * - User clicks "Add comment" → POST to comments table → Query invalidated → New comment appears
 */

import React, { useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { token } from '@atlaskit/tokens';
import Button from '@atlaskit/button';
import Textfield from '@atlaskit/textfield';
import Avatar from '@atlaskit/avatar';
import Badge from '@atlaskit/badge';

import type { UUID } from './description.types';

// ============================================================================
// TYPES
// ============================================================================

export interface DescriptionComment {
  id: UUID;
  description_id: UUID;
  parent_comment_id?: UUID; // For replies
  author_id: UUID;
  author_name: string;
  author_avatar?: string;
  content: string;
  created_at: string;
  updated_at: string;
  reactions: CommentReaction[];
  is_resolved: boolean;
  resolved_at?: string;
  resolved_by?: UUID;
}

export interface CommentReaction {
  emoji: string;
  users: UUID[];
  count: number;
}

// ============================================================================
// API CLIENT
// ============================================================================

const supabase = (() => {
  const { createClient } = require('@supabase/supabase-js');
  return createClient(
    process.env.REACT_APP_SUPABASE_URL!,
    process.env.REACT_APP_SUPABASE_ANON_KEY!
  );
})();

export const commentsApi = {
  /**
   * Fetch comments for a description
   */
  async getComments(descriptionId: UUID): Promise<DescriptionComment[]> {
    const { data, error } = await supabase
      .from('description_comments')
      .select('*')
      .eq('description_id', descriptionId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true });

    if (error) throw new Error(`Failed to fetch comments: ${error.message}`);
    return data || [];
  },

  /**
   * Create a comment
   */
  async createComment(
    descriptionId: UUID,
    content: string,
    authorId: UUID,
    authorName: string,
    parentCommentId?: UUID
  ): Promise<DescriptionComment> {
    const { data, error } = await supabase
      .from('description_comments')
      .insert({
        description_id: descriptionId,
        parent_comment_id: parentCommentId,
        author_id: authorId,
        author_name: authorName,
        content,
        reactions: [],
        is_resolved: false,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create comment: ${error.message}`);
    return data;
  },

  /**
   * Update a comment
   */
  async updateComment(
    commentId: UUID,
    content: string
  ): Promise<DescriptionComment> {
    const { data, error } = await supabase
      .from('description_comments')
      .update({ content, updated_at: new Date().toISOString() })
      .eq('id', commentId)
      .select()
      .single();

    if (error) throw new Error(`Failed to update comment: ${error.message}`);
    return data;
  },

  /**
   * Add reaction to comment
   */
  async addReaction(
    commentId: UUID,
    emoji: string,
    userId: UUID
  ): Promise<void> {
    const { data: comment } = await supabase
      .from('description_comments')
      .select('reactions')
      .eq('id', commentId)
      .single();

    if (!comment) throw new Error('Comment not found');

    const reactions = comment.reactions || [];
    let found = false;

    for (const reaction of reactions) {
      if (reaction.emoji === emoji) {
        if (!reaction.users.includes(userId)) {
          reaction.users.push(userId);
        }
        found = true;
        break;
      }
    }

    if (!found) {
      reactions.push({ emoji, users: [userId], count: 1 });
    }

    const { error } = await supabase
      .from('description_comments')
      .update({ reactions })
      .eq('id', commentId);

    if (error) throw new Error(`Failed to add reaction: ${error.message}`);
  },

  /**
   * Mark comment as resolved
   */
  async resolveComment(
    commentId: UUID,
    resolvedBy: UUID
  ): Promise<DescriptionComment> {
    const { data, error } = await supabase
      .from('description_comments')
      .update({
        is_resolved: true,
        resolved_at: new Date().toISOString(),
        resolved_by: resolvedBy,
      })
      .eq('id', commentId)
      .select()
      .single();

    if (error) throw new Error(`Failed to resolve comment: ${error.message}`);
    return data;
  },

  /**
   * Soft-delete comment
   */
  async deleteComment(commentId: UUID): Promise<void> {
    const { error } = await supabase
      .from('description_comments')
      .update({ is_deleted: true })
      .eq('id', commentId);

    if (error) throw new Error(`Failed to delete comment: ${error.message}`);
  },
};

// ============================================================================
// HOOKS
// ============================================================================

function useComments(descriptionId: UUID) {
  const queryClient = useQueryClient();

  // Load comments
  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['description-comments', descriptionId],
    queryFn: () => commentsApi.getComments(descriptionId),
    staleTime: 30 * 1000, // 30s
  });

  // Create comment
  const {
    mutateAsync: createComment,
    isPending: isCreating,
  } = useMutation({
    mutationFn: (args: {
      content: string;
      authorId: UUID;
      authorName: string;
      parentCommentId?: UUID;
    }) =>
      commentsApi.createComment(
        descriptionId,
        args.content,
        args.authorId,
        args.authorName,
        args.parentCommentId
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['description-comments', descriptionId],
      });
    },
  });

  // Resolve comment
  const {
    mutateAsync: resolveComment,
    isPending: isResolving,
  } = useMutation({
    mutationFn: (args: { commentId: UUID; resolvedBy: UUID }) =>
      commentsApi.resolveComment(args.commentId, args.resolvedBy),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['description-comments', descriptionId],
      });
    },
  });

  return {
    comments,
    isLoading,
    createComment,
    isCreating,
    resolveComment,
    isResolving,
  };
}

// ============================================================================
// COMPONENTS
// ============================================================================

interface CommentProps {
  comment: DescriptionComment;
  currentUserId: UUID;
  onReply?: (parentId: UUID) => void;
  onResolve?: (commentId: UUID) => void;
  replies?: DescriptionComment[];
}

const Comment: React.FC<CommentProps> = ({
  comment,
  currentUserId,
  onReply,
  onResolve,
  replies = [],
}) => {
  const isAuthor = comment.author_id === currentUserId;

  return (
    <div
      style={{
        padding: token('space.150'),
        borderLeft: comment.is_resolved
          ? `3px solid ${token('color.border.success')}`
          : `3px solid ${token('color.border')}`,
        backgroundColor: comment.is_resolved
          ? token('color.background.success')
          : token('color.background.neutral'),
        borderRadius: token('border.radius.050'),
        marginBottom: token('space.100'),
      }}
    >
      {/* ============================================================ */}
      {/* HEADER */}
      {/* ============================================================ */}

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: token('space.050'),
        }}
      >
        <div style={{ display: 'flex', gap: token('space.050'), alignItems: 'center' }}>
          <Avatar name={comment.author_name} src={comment.author_avatar} size="small" />
          <div>
            <strong style={{ fontSize: '13px' }}>{comment.author_name}</strong>
            {isAuthor && (
              <Badge appearance="primary" style={{ marginLeft: token('space.050') }}>
                You
              </Badge>
            )}
            {comment.is_resolved && (
              <Badge appearance="success" style={{ marginLeft: token('space.050') }}>
                Resolved
              </Badge>
            )}
            <p
              style={{
                margin: 0,
                fontSize: '11px',
                color: token('color.text.subtlest'),
              }}
            >
              {new Date(comment.created_at).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* CONTENT */}
      {/* ============================================================ */}

      <p
        style={{
          margin: 0,
          marginBottom: token('space.100'),
          fontSize: '13px',
          color: token('color.text'),
          whiteSpace: 'pre-wrap',
        }}
      >
        {comment.content}
      </p>

      {/* ============================================================ */}
      {/* ACTIONS */}
      {/* ============================================================ */}

      <div style={{ display: 'flex', gap: token('space.050') }}>
        {onReply && !comment.is_resolved && (
          <Button appearance="subtle" size="small" onClick={() => onReply(comment.id)}>
            Reply
          </Button>
        )}
        {onResolve && !comment.is_resolved && (
          <Button
            appearance="subtle"
            size="small"
            onClick={() => onResolve(comment.id)}
          >
            Resolve
          </Button>
        )}
      </div>

      {/* ============================================================ */}
      {/* REPLIES */}
      {/* ============================================================ */}

      {replies.length > 0 && (
        <div
          style={{
            marginTop: token('space.150'),
            paddingLeft: token('space.200'),
            borderLeft: `2px solid ${token('color.border')}`,
          }}
        >
          {replies.map((reply) => (
            <Comment
              key={reply.id}
              comment={reply}
              currentUserId={currentUserId}
              onReply={onReply}
              onResolve={onResolve}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// COMMENTS THREAD
// ============================================================================

export interface CommentThreadProps {
  descriptionId: UUID;
  currentUserId: UUID;
  currentUserName: string;
}

/**
 * Full comments thread UI
 * 
 * DYNAMITE Stage D:
 * - Load comments from DB → Display thread → User adds comment → DB INSERT → Query refetch → New comment appears
 */
export const CommentThread: React.FC<CommentThreadProps> = ({
  descriptionId,
  currentUserId,
  currentUserName,
}) => {
  const [newCommentText, setNewCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<UUID | null>(null);

  const { comments, isLoading, createComment, isCreating, resolveComment } =
    useComments(descriptionId);

  const handleAddComment = async () => {
    if (!newCommentText.trim()) return;

    try {
      await createComment({
        content: newCommentText,
        authorId: currentUserId,
        authorName: currentUserName,
        parentCommentId: replyingTo || undefined,
      });

      setNewCommentText('');
      setReplyingTo(null);
    } catch (err) {
      console.error('Failed to add comment:', err);
    }
  };

  const handleResolve = async (commentId: UUID) => {
    try {
      await resolveComment({
        commentId,
        resolvedBy: currentUserId,
      });
    } catch (err) {
      console.error('Failed to resolve comment:', err);
    }
  };

  // Organize comments (top-level + replies)
  const topLevelComments = comments.filter((c) => !c.parent_comment_id);
  const getCommentReplies = (commentId: UUID) =>
    comments.filter((c) => c.parent_comment_id === commentId);

  return (
    <div
      style={{
        padding: token('space.200'),
        backgroundColor: token('color.background'),
      }}
    >
      <h4
        style={{
          margin: 0,
          marginBottom: token('space.150'),
          color: token('color.text'),
        }}
      >
        Comments ({comments.length})
      </h4>

      {/* ============================================================ */}
      {/* COMMENTS LIST */}
      {/* ============================================================ */}

      {isLoading ? (
        <p style={{ color: token('color.text.subtlest') }}>Loading comments...</p>
      ) : comments.length === 0 ? (
        <p style={{ color: token('color.text.subtlest') }}>No comments yet</p>
      ) : (
        topLevelComments.map((comment) => (
          <Comment
            key={comment.id}
            comment={comment}
            currentUserId={currentUserId}
            onReply={setReplyingTo}
            onResolve={handleResolve}
            replies={getCommentReplies(comment.id)}
          />
        ))
      )}

      {/* ============================================================ */}
      {/* NEW COMMENT INPUT */}
      {/* ============================================================ */}

      <div
        style={{
          marginTop: token('space.200'),
          padding: token('space.150'),
          backgroundColor: token('color.background.neutral'),
          borderRadius: token('border.radius.100'),
        }}
      >
        {replyingTo && (
          <p
            style={{
              margin: 0,
              marginBottom: token('space.050'),
              fontSize: '12px',
              color: token('color.text.subtlest'),
            }}
          >
            Replying to comment...
            <Button
              appearance="subtle"
              size="small"
              onClick={() => setReplyingTo(null)}
              style={{ marginLeft: token('space.050') }}
            >
              Cancel
            </Button>
          </p>
        )}

        <Textfield
          placeholder="Add a comment..."
          value={newCommentText}
          onChange={(e) => setNewCommentText((e.target as any).value)}
          multiline
          minimumRows={2}
        />

        <Button
          appearance="primary"
          onClick={handleAddComment}
          isDisabled={!newCommentText.trim() || isCreating}
          isLoading={isCreating}
          style={{ marginTop: token('space.100') }}
        >
          Post Comment
        </Button>
      </div>
    </div>
  );
};
