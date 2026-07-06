import * as React from 'react';
import { useState, useMemo, useCallback } from 'react';
import { MessageSquare } from '@/lib/atlaskit-icons';
import FlagFilledIcon from '@atlaskit/icon/core/flag-filled';
import { token } from '@atlaskit/tokens';
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
  };
  const cancelEdit = () => {
    setEditingId(null);
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
        const seed = seedFlagContent(comment);
        return (
          <div className="py-3">
            <CommentEditor
              currentUser={currentUser}
              mentionableUsers={mentionableUsers}
              defaultValue={seed}
              autoFocus
              onSubmit={async (content) => {
                if (!onEditComment) return;
                await onEditComment(comment.id, stripFlagPrefix(content, comment.commentType));
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
            <div style={{ paddingLeft: 40, paddingTop: 8, paddingBottom: 8 }}>
              <div
                style={{
                  fontSize: 'var(--ds-font-size-200)',
                  fontWeight: 500,
                  color: 'var(--ds-text-subtle)',
                  marginBottom: 4,
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
    <div style={{ display: 'flex', flexDirection: 'column' }} className={className}>
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

      <div style={{ marginTop: 16 }}>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <p style={{ fontSize: 13, color: 'var(--ds-text-subtlest)' }}>Loading comments...</p>
          </div>
        ) : sortedTopLevelComments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <MessageSquare style={{ width: 40, height: 40, margin: '0 auto 12px', color: 'var(--ds-icon-subtle)' }} />
            <p style={{ fontSize: 13, color: 'var(--ds-text-subtlest)' }}>{emptyMessage}</p>
          </div>
        ) : (
          <div>
            {sortedTopLevelComments.map((comment) => (
              <div key={comment.id} style={{ borderTop: '1px solid var(--ds-border)' }}>
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

/** Editor seed / save-time stripper for flag audit comments. Builds
 *  an ADF doc whose first paragraph is `[emoji :flag_on:] Flag added`
 *  so the editor renders the identical Atlassian flag glyph the
 *  read-only comment shows. See ActivityPanel.tsx for full docs — this
 *  is a local copy so the Comments tab renders the same way without
 *  cross-file coupling. */
function seedFlagContent(c: CdsComment): string {
  const variant = c.commentType;
  const body = c.content ?? '';
  if (variant !== 'flag_added' && variant !== 'flag_removed') return body;
  const isAdded = variant === 'flag_added';
  const emojiChar = isAdded ? '🚩' : '🏳️';
  const label = isAdded ? 'Flag added' : 'Flag removed';
  return body.length > 0
    ? `${emojiChar} ${label}\n${body}`
    : `${emojiChar} ${label}`;
}
function stripFlagPrefix(content: string, variant?: string): string {
  if (variant !== 'flag_added' && variant !== 'flag_removed') return content;
  const label = variant === 'flag_added' ? 'Flag added' : 'Flag removed';
  const emojiChar = variant === 'flag_added' ? '🚩' : '🏳️';
  const shortName = variant === 'flag_added' ? ':flag_on:' : ':flag_off:';
  const trimmed = content.trim();
  if (trimmed.startsWith('{')) {
    try {
      const doc = JSON.parse(trimmed);
      if (doc?.type === 'doc' && Array.isArray(doc.content) && doc.content.length > 0) {
        const first = doc.content[0];
        const firstNodes = first?.content ?? [];
        const isFlagPara = firstNodes.some(
          (n: any) =>
            (n?.type === 'emoji' && (n.attrs?.shortName === shortName || n.attrs?.text === emojiChar)) ||
            (n?.type === 'text' && typeof n.text === 'string' && n.text.includes(label)),
        );
        if (isFlagPara) {
          const remaining = doc.content.slice(1);
          if (remaining.length === 0) return '';
          return JSON.stringify({ ...doc, content: remaining });
        }
      }
    } catch {
      // fall through
    }
  }
  return content
    .replace(new RegExp(`^\\s*${emojiChar}\\s*${label}\\s*(\\n|$)`), '')
    .replace(new RegExp(`^\\s*${shortName}\\s*${label}\\s*(\\n|$)`), '')
    .trimStart();
}

export { CommentThread };
