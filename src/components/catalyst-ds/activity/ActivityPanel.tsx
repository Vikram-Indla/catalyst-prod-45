import * as React from 'react';
import { useState, useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from '@/lib/atlaskit-icons';
import type {
  CdsComment,
  CdsActivityItem,
  CdsSortOrder,
  CdsUser,
  CdsQuickReply,
} from '../types';
import type { JiraUserMap } from '../utils/jiraContent';
import { CommentThread } from '../comments/CommentThread';
import { ActivityFeed } from './ActivityFeed';
import { Comment } from '../comments/Comment';
import { CommentEditor, type CommentImproveContext } from '../comments/CommentEditor';
import { ActivityItem } from './ActivityItem';
import { DescriptionTranslateBar } from '@/components/shared/title-translate/DescriptionTranslateBar';
import { adfToPlainText } from '@/components/shared/rich-text/atlaskit/adfHelpers';

/** Extract translatable plain text from a comment body (ADF JSON or plain text). */
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

export type ActivityTabKey = 'all' | 'comments' | 'history' | 'worklog';

export interface ActivityPanelProps {
  comments: CdsComment[];
  historyItems: CdsActivityItem[];
  currentUser?: CdsUser;
  mentionableUsers?: CdsUser[];

  onAddComment: (content: string) => void | Promise<void>;
  onEditComment?: (id: string, content: string) => void | Promise<void>;
  onDeleteComment?: (id: string) => void | Promise<void>;
  onToggleReaction?: (commentId: string, emoji: string) => void;
  onCopyCommentLink?: (commentId: string) => void;

  isSubmitting?: boolean;
  isLoadingComments?: boolean;
  isLoadingHistory?: boolean;
  hasMoreHistory?: boolean;
  onLoadMoreHistory?: () => void;
  isLoadingMoreHistory?: boolean;

  quickReplies?: CdsQuickReply[];
  defaultTab?: ActivityTabKey;
  defaultSortOrder?: CdsSortOrder;

  jiraUserMap?: JiraUserMap;
  workItemId?: string;
  improveContext?: CommentImproveContext;
  issueKey?: string;

  className?: string;
}

function ActivityPanel({
  comments,
  historyItems,
  currentUser,
  mentionableUsers = [],
  onAddComment,
  onEditComment,
  onDeleteComment,
  onToggleReaction,
  onCopyCommentLink,
  isSubmitting = false,
  isLoadingComments = false,
  isLoadingHistory = false,
  hasMoreHistory = false,
  onLoadMoreHistory,
  isLoadingMoreHistory = false,
  quickReplies,
  defaultTab = 'all',
  defaultSortOrder = 'oldest',
  jiraUserMap,
  workItemId,
  improveContext,
  issueKey,
  className,
}: ActivityPanelProps) {
  const [activeTab, setActiveTab] = useState<ActivityTabKey>(defaultTab);
  const [sortOrder, setSortOrder] = useState<CdsSortOrder>(defaultSortOrder);
  const [sortOpen, setSortOpen] = useState(false);

  const tabs: { key: ActivityTabKey; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'comments', label: 'Comments' },
    { key: 'history', label: 'History' },
    { key: 'worklog', label: 'Work log' },
  ];

  const mergedAll = useMemo(() => {
    const commentItems: CdsActivityItem[] = comments.map((c) => ({
      id: `comment-${c.id}`,
      type: 'comment' as const,
      actor: c.author,
      timestamp: c.createdAt,
      comment: c,
    }));

    const all = [...commentItems, ...historyItems];
    all.sort((a, b) => {
      const diff = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      return sortOrder === 'newest' ? -diff : diff;
    });

    return all;
  }, [comments, historyItems, sortOrder]);

  const [editingId, setEditingId] = useState<string | null>(null);

  const [translatedComments, setTranslatedComments] = useState<Record<string, string>>({});
  const handleCommentTranslated = useCallback((id: string, text: string) => {
    setTranslatedComments(prev => ({ ...prev, [id]: text }));
  }, []);
  const handleCommentRevert = useCallback((id: string) => {
    setTranslatedComments(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const handleReply = useCallback((commentId: string) => {
    const comment = comments.find(c => c.id === commentId);
    if (!comment) return;
    // Scroll to the composer and pre-fill with @mention
    const editorEl = document.querySelector('[data-activity-composer]');
    editorEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [comments]);

  return (
    <div className={cn('flex flex-col', className)}>
      <div className="flex items-center justify-between mb-4">
        <h2
          className="text-[var(--ds-text,#292A2E)] dark:text-[var(--ds-text,#EDEDED)]"
          style={{ margin: 0, fontSize: 16, fontWeight: 653, lineHeight: '20px', fontFamily: 'var(--cp-font-body)' }}
        >
          Activity
        </h2>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'px-3 py-1.5 rounded text-[14px] font-normal transition-colors duration-150',
                activeTab === tab.key
                  ? 'bg-[#E9F2FE] text-[#1868DB] dark:bg-[#1C3A5C] dark:text-[#4C9AFF]'
                  : 'text-[var(--ds-text-subtle,#505258)] hover:bg-[var(--ds-surface-sunken,#F4F5F7)] dark:text-[var(--ds-text-subtlest,#A1A1A1)] dark:hover:bg-[var(--ds-surface-overlay,#1F1F1F)]'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setSortOpen(!sortOpen)}
            className="flex items-center gap-1 text-[14px] text-[var(--ds-text-subtlest,#6B778C)] dark:text-[var(--ds-text-subtlest,#A1A1A1)] hover:text-[var(--ds-text,#172B4D)] dark:hover:text-[var(--ds-text,#EDEDED)] transition-colors"
          >
            {sortOrder === 'newest' ? 'Newest first' : 'Oldest first'}
            <ChevronDown className="h-3.5 w-3.5" />
          </button>

          {sortOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setSortOpen(false)} />
              <div className="absolute right-0 top-full mt-1 z-50 bg-white dark:bg-[var(--ds-surface-raised,#1A1A1A)] border border-[var(--ds-border,#DFE1E6)] dark:border-[var(--ds-border,#2E2E2E)] rounded-md shadow-lg py-1 min-w-[140px]">
                {(['newest', 'oldest'] as CdsSortOrder[]).map((order) => (
                  <button
                    key={order}
                    type="button"
                    onClick={() => {
                      setSortOrder(order);
                      setSortOpen(false);
                    }}
                    className={cn(
                      'w-full text-left px-3 py-1.5 text-[14px] transition-colors',
                      order === sortOrder
                        ? 'bg-[#E9F2FE] text-[#1868DB] dark:bg-[#1C3A5C] dark:text-[#4C9AFF]'
                        : 'text-[var(--ds-text,#172B4D)] dark:text-[var(--ds-text,#EDEDED)] hover:bg-[var(--ds-surface-sunken,#F4F5F7)] dark:hover:bg-[var(--ds-surface-overlay,#1F1F1F)]'
                    )}
                  >
                    {order === 'newest' ? 'Newest first' : 'Oldest first'}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {activeTab === 'comments' && (
        <CommentThread
          comments={comments}
          currentUser={currentUser}
          mentionableUsers={mentionableUsers}
          sortOrder={sortOrder}
          onAddComment={onAddComment}
          onEditComment={onEditComment}
          onDeleteComment={onDeleteComment}
          onToggleReaction={onToggleReaction}
          onCopyLink={onCopyCommentLink}
          quickReplies={quickReplies}
          isSubmitting={isSubmitting}
          isLoading={isLoadingComments}
          workItemId={workItemId}
          issueKey={issueKey}
          translatedComments={translatedComments}
          onCommentTranslated={handleCommentTranslated}
          onCommentRevert={handleCommentRevert}
        />
      )}

      {activeTab === 'history' && (
        <ActivityFeed
          items={historyItems}
          sortOrder={sortOrder}
          isLoading={isLoadingHistory}
          hasMore={hasMoreHistory}
          onLoadMore={onLoadMoreHistory}
          isLoadingMore={isLoadingMoreHistory}
          jiraUserMap={jiraUserMap}
        />
      )}

      {activeTab === 'worklog' && (
        <div className="text-center py-10">
          <p className="text-[13px] text-[var(--ds-text-subtlest,#6B778C)] dark:text-[var(--ds-text-subtlest,#878787)]">
            No worklog entries yet
          </p>
          <p className="text-[12px] text-[var(--ds-text-subtlest,#6B778C)] dark:text-[var(--ds-text-subtlest,#878787)] mt-2">
            Track time spent on this work item via the Worklog tab. Coming soon.
          </p>
        </div>
      )}

      {activeTab === 'all' && (
        <div className="flex flex-col">
          <div data-activity-composer>
            <CommentEditor
              currentUser={currentUser}
              mentionableUsers={mentionableUsers}
              onSubmit={onAddComment}
              quickReplies={quickReplies}
              isSubmitting={isSubmitting}
              shortcutHint="Pro tip: press **M** to comment"
              workItemId={workItemId}
              improveContext={improveContext}
            />
          </div>

          <div className="mt-4 divide-y divide-[#EBECF0] dark:divide-[var(--ds-border,#2E2E2E)]">
            {(isLoadingComments || isLoadingHistory) ? (
              <div className="text-center py-8">
                <p className="text-[13px] text-[var(--ds-text-subtlest,#6B778C)] dark:text-[var(--ds-text-subtlest,#878787)]">Loading activity...</p>
              </div>
            ) : mergedAll.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-[13px] text-[var(--ds-text-subtlest,#6B778C)] dark:text-[var(--ds-text-subtlest,#878787)]">
                  No activity yet
                </p>
              </div>
            ) : (
              mergedAll.map((item) => {
                if (item.type === 'comment' && item.comment) {
                  const c = item.comment;

                  if (editingId === c.id) {
                    return (
                      <div key={item.id} className="py-3">
                        <CommentEditor
                          currentUser={currentUser}
                          mentionableUsers={mentionableUsers}
                          defaultValue={c.content}
                          autoFocus
                          onSubmit={async (content) => {
                            if (!onEditComment) return;
                            await onEditComment(c.id, content);
                            setEditingId(null);
                          }}
                          onCancel={() => setEditingId(null)}
                          workItemId={workItemId}
                          improveContext={improveContext}
                        />
                      </div>
                    );
                  }

                  const displayComment: CdsComment = translatedComments[c.id]
                    ? { ...c, content: translatedComments[c.id] }
                    : c;
                  const commentPlainText = commentToPlainText(c.content);

                  return (
                    <div key={item.id}>
                      <Comment
                        comment={displayComment}
                        currentUser={currentUser}
                        onReply={handleReply}
                        onEdit={onEditComment ? (id) => setEditingId(id) : undefined}
                        onDelete={onDeleteComment}
                        onToggleReaction={onToggleReaction}
                        onCopyLink={onCopyCommentLink}
                      />
                      {!c.isSystem && commentPlainText.trim() && issueKey && (
                        <DescriptionTranslateBar
                          plainText={commentPlainText}
                          issueKey={issueKey}
                          field={`comment:${c.id}`}
                          isTranslated={!!translatedComments[c.id]}
                          onTranslated={(text) => handleCommentTranslated(c.id, text)}
                          onRevert={() => handleCommentRevert(c.id)}
                          style={{ paddingLeft: 44, marginTop: 0, marginBottom: 4 }}
                        />
                      )}
                    </div>
                  );
                }

                return <ActivityItem key={item.id} item={item} jiraUserMap={jiraUserMap} showTypeBadge />;
              })
            )}
          </div>

          {hasMoreHistory && (
            <div className="py-3 text-center">
              <button
                type="button"
                onClick={onLoadMoreHistory}
                disabled={isLoadingMoreHistory}
                className="text-[14px] font-medium text-[#1868DB] dark:text-[#4C9AFF] hover:underline disabled:opacity-50"
              >
                {isLoadingMoreHistory ? 'Loading...' : 'Load more activity'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export { ActivityPanel };
