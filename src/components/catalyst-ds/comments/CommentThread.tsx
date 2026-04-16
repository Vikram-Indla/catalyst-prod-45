import * as React from 'react';
import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { MessageSquare } from 'lucide-react';
import type { CdsComment, CdsSortOrder, CdsUser, CdsQuickReply } from '../types';
import { Comment } from './Comment';
import { CommentAction } from './CommentAction';
import { CommentEditor } from './CommentEditor';

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
}: CommentThreadProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

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
        currentUser={currentUser}
        mentionableUsers={mentionableUsers}
        onSubmit={onAddComment}
        quickReplies={quickReplies}
        isSubmitting={isSubmitting}
        shortcutHint="Pro tip: press **M** to comment"
      />

      <div className="mt-4">
        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-[13px] text-[#6B778C] dark:text-[#878787]">Loading comments...</p>
          </div>
        ) : sortedComments.length === 0 ? (
          <div className="text-center py-10">
            <MessageSquare className="h-10 w-10 mx-auto mb-3 text-[#C1C7D0] dark:text-[#454545]" />
            <p className="text-[13px] text-[#6B778C] dark:text-[#878787]">{emptyMessage}</p>
          </div>
        ) : (
          <div className="divide-y divide-[#EBECF0] dark:divide-[#2E2E2E]">
            {sortedComments.map((comment) => {
              if (editingId === comment.id) {
                return (
                  <div key={comment.id} className="py-3">
                    <div className="rounded-md border border-[#4C9AFF] dark:border-[#4C9AFF] p-3">
                      <textarea
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className={cn(
                          'w-full resize-none border-0 bg-transparent',
                          'text-[13px] text-[#172B4D] dark:text-[#EDEDED]',
                          'focus:outline-none focus:ring-0',
                          'min-h-[60px]'
                        )}
                        autoFocus
                        onKeyDown={(e) => {
                          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') confirmEdit();
                          if (e.key === 'Escape') cancelEdit();
                        }}
                      />
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          type="button"
                          onClick={confirmEdit}
                          className="text-[12px] font-medium text-[#2563EB] hover:underline"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="text-[12px] font-medium text-[#6B778C] hover:text-[#172B4D] dark:text-[#A1A1A1] dark:hover:text-[#EDEDED]"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }

              const canEdit = onEditComment && currentUser && comment.author.id === currentUser.id;
              const canDelete = onDeleteComment && currentUser && comment.author.id === currentUser.id;

              return (
                <Comment
                  key={comment.id}
                  comment={comment}
                  actions={
                    (canEdit || canDelete) && !comment.isSystem ? (
                      <>
                        {canEdit && (
                          <CommentAction onClick={() => startEdit(comment)}>Edit</CommentAction>
                        )}
                        {canDelete && (
                          <CommentAction onClick={() => onDeleteComment!(comment.id)}>
                            Delete
                          </CommentAction>
                        )}
                      </>
                    ) : undefined
                  }
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export { CommentThread };
