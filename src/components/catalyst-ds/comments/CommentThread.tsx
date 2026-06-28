import * as React from 'react';
import { useState, useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { MessageSquare } from '@/lib/atlaskit-icons';
import type { CdsComment, CdsSortOrder, CdsUser, CdsQuickReply } from '../types';
import { Comment } from './Comment';
import { CommentToolbar } from './CommentToolbar';
import { CommentEditor } from './CommentEditor';
import { CommentNode } from './CommentNode';
import { DescriptionTranslateBar } from '@/components/shared/title-translate/DescriptionTranslateBar';
import { adfToPlainText } from '@/components/shared/rich-text/atlaskit/adfHelpers';

function commentToPlainText(content: string): string {
  const v = content.trim();
  if (v.startsWith('{')) {
    try {
      const parsed = JSON.parse(v);
      if (parsed?.type === 'doc') return adfToPlainText(parsed);
    } catch { /* fallthrough */ }
  }
  return v;
}

export interface CommentThreadProps {
  comments: CdsComment[];
  currentUser?: CdsUser;
  mentionableUsers?: CdsUser[];
  sortOrder?: CdsSortOrder;
  onSortChange?: (order: CdsSortOrder) => void;
  onAddComment: (content: string) => void | Promise<void>;
  /** Threaded reply — posts a new comment with parent_comment_id set
   *  to `parentId`. Falls back to onAddComment if omitted. */
  onAddReply?: (parentId: string, content: string) => void | Promise<void>;
  onEditComment?: (id: string, content: string) => void | Promise<void>;
  onDeleteComment?: (id: string) => void | Promise<void>;
  /** Same shape as ActivityPanel — toggles a single reaction on the
   *  given comment. Connects to ph_comment_reactions via the parent. */
  onToggleReaction?: (
    commentId: string,
    emoji: string,
    hasMine: boolean,
  ) => void | Promise<void>;
  quickReplies?: CdsQuickReply[];
  isSubmitting?: boolean;
  isLoading?: boolean;
  emptyMessage?: string;
  className?: string;
  workItemId?: string;
  issueKey?: string;
  translatedComments?: Record<string, string>;
  onCommentTranslated?: (id: string, text: string) => void;
  onCommentRevert?: (id: string) => void;
}

function CommentThread({
  comments,
  currentUser,
  mentionableUsers = [],
  sortOrder = 'newest',
  onSortChange,
  onAddComment,
  onAddReply,
  onEditComment,
  onDeleteComment,
  onToggleReaction,
  quickReplies,
  isSubmitting = false,
  isLoading = false,
  emptyMessage = 'No comments yet. Start the conversation.',
  className,
  workItemId,
  issueKey,
  translatedComments = {},
  onCommentTranslated,
  onCommentRevert,
}: CommentThreadProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [quotePrefix, setQuotePrefix] = useState('');
  // ID of the comment being replied to — when set, an inline editor
  // renders directly below that comment (same pattern as the All tab
  // and the For You RecommendedPanel).
  const [replyingToId, setReplyingToId] = useState<string | null>(null);

  // Top-level comments only — replies render nested under their
  // parent via CommentNode. Sort order applies only to top-level rows;
  // children are always rendered oldest-first under each parent.
  const sortedTopLevelComments = useMemo(() => {
    const topLevel = comments.filter((c) => !c.parentId);
    topLevel.sort((a, b) => {
      const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortOrder === 'newest' ? -diff : diff;
    });
    return topLevel;
  }, [comments, sortOrder]);

  const childrenByParentId = useMemo(() => {
    const map: Record<string, CdsComment[]> = {};
    for (const c of comments) {
      if (c.parentId) {
        (map[c.parentId] ??= []).push(c);
      }
    }
    for (const list of Object.values(map)) {
      list.sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
    }
    return map;
  }, [comments]);

  const startEdit = (comment: CdsComment) => {
    setEditingId(comment.id);
    setEditValue(comment.content);
  };

  const handleReply = (commentId: string) => {
    const comment = comments.find(c => c.id === commentId);
    if (!comment) return;
    setQuotePrefix(`@[${comment.author.name}](${comment.author.id}) `);
  };

  // Renders one comment + its toolbar + (optional) edit editor +
  // translate bar + inline reply composer. Shared with CommentNode so
  // every nesting level renders consistently.
  const renderCommentBlock = useCallback(
    (comment: CdsComment) => {
      if (editingId === comment.id) {
        return (
          <div className="py-3">
            <CommentEditor
              currentUser={currentUser}
              mentionableUsers={mentionableUsers}
              defaultValue={comment.content}
              autoFocus
              onSubmit={async (content) => {
                if (!onEditComment) return;
                await onEditComment(comment.id, content);
                setEditingId(null);
              }}
              onCancel={cancelEdit}
              workItemId={workItemId}
            />
          </div>
        );
      }

      const canEdit =
        !!onEditComment && !!currentUser && comment.author.id === currentUser.id;
      const canDelete =
        !!onDeleteComment && !!currentUser && comment.author.id === currentUser.id;

      const displayComment: CdsComment = translatedComments[comment.id]
        ? { ...comment, content: translatedComments[comment.id] }
        : comment;
      const commentPlainText = commentToPlainText(comment.content);

      return (
        <>
          <Comment
            comment={displayComment}
            extras={
              !comment.isSystem &&
              commentPlainText.trim() &&
              issueKey &&
              onCommentTranslated &&
              onCommentRevert ? (
                <DescriptionTranslateBar
                  plainText={commentPlainText}
                  issueKey={issueKey}
                  field={`comment:${comment.id}`}
                  isTranslated={!!translatedComments[comment.id]}
                  onTranslated={(text) => onCommentTranslated(comment.id, text)}
                  onRevert={() => onCommentRevert(comment.id)}
                  style={{ marginTop: 4, marginBottom: 0 }}
                />
              ) : undefined
            }
            actions={
              !comment.isSystem ? (
                <CommentToolbar
                  reactions={comment.reactions}
                  onToggleReaction={
                    onToggleReaction
                      ? (emoji, hasMine) =>
                          onToggleReaction(comment.id, emoji, hasMine)
                      : undefined
                  }
                  onReply={() => setReplyingToId(comment.id)}
                  onEdit={canEdit ? () => startEdit(comment) : undefined}
                  onCopyLink={() => {
                    const url = new URL(window.location.href);
                    url.searchParams.set('comment', comment.id);
                    void navigator.clipboard?.writeText(url.toString());
                  }}
                  onDelete={
                    canDelete ? () => onDeleteComment!(comment.id) : undefined
                  }
                />
              ) : undefined
            }
          />
          {replyingToId === comment.id && (
            <div style={{ paddingLeft: 44, paddingTop: 8, paddingBottom: 8 }}>
              <div
                style={{
                  fontSize: 'var(--ds-font-size-200)',
                  fontWeight: 500,
                  color: 'var(--ds-text-subtle, #44546F)',
                  marginBottom: 6,
                }}
              >
                Replying to {comment.author.name}
              </div>
              <CommentEditor
                currentUser={currentUser}
                mentionableUsers={mentionableUsers}
                autoFocus
                placeholder={`Reply to ${comment.author.name}…`}
                onSubmit={async (content) => {
                  if (onAddReply) {
                    await onAddReply(comment.id, content);
                  } else {
                    await onAddComment(content);
                  }
                  setReplyingToId(null);
                }}
                onCancel={() => setReplyingToId(null)}
                workItemId={workItemId}
              />
            </div>
          )}
        </>
      );
    },
    [
      editingId,
      replyingToId,
      translatedComments,
      currentUser,
      mentionableUsers,
      issueKey,
      workItemId,
      onEditComment,
      onDeleteComment,
      onToggleReaction,
      onAddReply,
      onAddComment,
      onCommentTranslated,
      onCommentRevert,
    ],
  );

  return (
    <div className={cn('flex flex-col', className)}>
      <CommentEditor
        key={quotePrefix}
        currentUser={currentUser}
        mentionableUsers={mentionableUsers}
        onSubmit={(content) => { setQuotePrefix(''); return onAddComment(content); }}
        quickReplies={quickReplies}
        isSubmitting={isSubmitting}
        shortcutHint="Pro tip: press **M** to comment"
        defaultValue={quotePrefix}
        autoFocus={!!quotePrefix}
        workItemId={workItemId}
      />

      <div className="mt-4">
        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-[13px] text-[var(--ds-text-subtlest,#6B778C)] dark:text-[var(--ds-text-subtlest,#878787)]">Loading comments...</p>
          </div>
        ) : sortedTopLevelComments.length === 0 ? (
          <div className="text-center py-10">
            <MessageSquare className="h-10 w-10 mx-auto mb-3 text-[var(--ds-border, #DFE1E6)] dark:text-[var(--ds-border-bold,#454545)]" />
            <p className="text-[13px] text-[var(--ds-text-subtlest,#6B778C)] dark:text-[var(--ds-text-subtlest,#878787)]">{emptyMessage}</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--ds-border, #DFE1E6)] dark:divide-[var(--ds-border,var(--cp-ink-1, #2E2E2E))]">
            {sortedTopLevelComments.map((comment) => (
              <div key={comment.id}>
                <CommentNode
                  comment={comment}
                  childrenByParentId={childrenByParentId}
                  renderComment={renderCommentBlock}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export { CommentThread };
