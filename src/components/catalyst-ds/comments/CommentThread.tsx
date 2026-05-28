import * as React from 'react';
import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { MessageSquare, Edit, Trash2, Quote } from '@/lib/atlaskit-icons';
import type { CdsComment, CdsSortOrder, CdsUser, CdsQuickReply } from '../types';
import { Comment } from './Comment';
import { CommentAction } from './CommentAction';
import { CommentEditor } from './CommentEditor';
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
  onEditComment?: (id: string, content: string) => void | Promise<void>;
  onDeleteComment?: (id: string) => void | Promise<void>;
  quickReplies?: CdsQuickReply[];
  isSubmitting?: boolean;
  isLoading?: boolean;
  emptyMessage?: string;
  className?: string;
  workItemId?: string;
  /** Jira issue key for comment translation caching. Omit to disable translate bars. */
  issueKey?: string;
  /** Shared translation state from parent (ActivityPanel). commentId → translated text. */
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
  onEditComment,
  onDeleteComment,
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
  const [editValue, setEditValue] = useState('');
  // E3: quote reply — pre-fills the editor with a blockquote prefix
  const [quotePrefix, setQuotePrefix] = useState('');

  const sortedComments = useMemo(() => {
    const sorted = [...comments];
    sorted.sort((a, b) => {
      const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortOrder === 'newest' ? -diff : diff;
    });
    return sorted;
  }, [comments, sortOrder]);

  const startEdit = (comment: CdsComment) => {
    setEditingId(comment.id);
    setEditValue(comment.content);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  const confirmEdit = async () => {
    if (!editingId || !onEditComment) return;
    await onEditComment(editingId, editValue);
    setEditingId(null);
    setEditValue('');
  };

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
            <p className="text-[13px] text-[var(--ds-text-subtlest,var(--cp-text-secondary, #6B778C))] dark:text-[var(--ds-text-subtlest,var(--cp-text-secondary, #878787))]">Loading comments...</p>
          </div>
        ) : sortedComments.length === 0 ? (
          <div className="text-center py-10">
            <MessageSquare className="h-10 w-10 mx-auto mb-3 text-[#C1C7D0] dark:text-[var(--ds-border-bold,#454545)]" />
            <p className="text-[13px] text-[var(--ds-text-subtlest,var(--cp-text-secondary, #6B778C))] dark:text-[var(--ds-text-subtlest,var(--cp-text-secondary, #878787))]">{emptyMessage}</p>
          </div>
        ) : (
          <div className="divide-y divide-[#EBECF0] dark:divide-[var(--ds-border,var(--cp-ink-1, #2E2E2E))]">
            {sortedComments.map((comment) => {
              if (editingId === comment.id) {
                return (
                  <div key={comment.id} className="py-3">
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

              const canEdit = onEditComment && currentUser && comment.author.id === currentUser.id;
              const canDelete = onDeleteComment && currentUser && comment.author.id === currentUser.id;

              const handleQuote = () => {
                // E3: pre-fill editor with blockquote of this comment's text
                const lines = comment.content.split('\n').map((l: string) => `> ${l}`).join('\n');
                setQuotePrefix(`${lines}\n\n`);
                // Scroll the editor into view
                setTimeout(() => {
                  const textarea = document.querySelector<HTMLTextAreaElement>('.cat-comment-editor textarea');
                  textarea?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 50);
              };

              const displayComment: CdsComment = translatedComments[comment.id]
                ? { ...comment, content: translatedComments[comment.id] }
                : comment;
              const commentPlainText = commentToPlainText(comment.content);

              return (
                <div key={comment.id}>
                  <Comment
                    comment={displayComment}
                    actions={
                      !comment.isSystem ? (
                        <>
                          <CommentAction
                            onClick={handleQuote}
                            icon={<Quote />}
                            aria-label="Quote reply"
                            title="Quote reply"
                          />
                          {canEdit && (
                            <CommentAction
                              onClick={() => startEdit(comment)}
                              icon={<Edit />}
                              aria-label="Edit comment"
                              title="Edit comment"
                            />
                          )}
                          {canDelete && (
                            <CommentAction
                              onClick={() => onDeleteComment!(comment.id)}
                              icon={<Trash2 />}
                              aria-label="Delete comment"
                              title="Delete comment"
                            />
                          )}
                        </>
                      ) : undefined
                    }
                  />
                  {!comment.isSystem && commentPlainText.trim() && issueKey && onCommentTranslated && onCommentRevert && (
                    <DescriptionTranslateBar
                      plainText={commentPlainText}
                      issueKey={issueKey}
                      field={`comment:${comment.id}`}
                      isTranslated={!!translatedComments[comment.id]}
                      onTranslated={(text) => onCommentTranslated(comment.id, text)}
                      onRevert={() => onCommentRevert(comment.id)}
                      style={{ paddingLeft: 44, marginTop: 0, marginBottom: 4 }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export { CommentThread };
