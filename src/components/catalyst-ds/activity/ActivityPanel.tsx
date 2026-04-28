import * as React from 'react';
import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';
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
import { CommentAction } from '../comments/CommentAction';
import { CommentEditor } from '../comments/CommentEditor';
import { ActivityItem } from './ActivityItem';

export type ActivityTabKey = 'all' | 'comments' | 'history';

export interface ActivityPanelProps {
  comments: CdsComment[];
  historyItems: CdsActivityItem[];
  currentUser?: CdsUser;
  mentionableUsers?: CdsUser[];

  onAddComment: (content: string) => void | Promise<void>;
  onEditComment?: (id: string, content: string) => void | Promise<void>;
  onDeleteComment?: (id: string) => void | Promise<void>;

  isSubmitting?: boolean;
  isLoadingComments?: boolean;
  isLoadingHistory?: boolean;
  hasMoreHistory?: boolean;
  onLoadMoreHistory?: () => void;
  isLoadingMoreHistory?: boolean;

  quickReplies?: CdsQuickReply[];
  defaultTab?: ActivityTabKey;
  defaultSortOrder?: CdsSortOrder;

  /** Maps Jira accountId -> display name for resolving [~accountid:xxx] mentions. */
  jiraUserMap?: JiraUserMap;

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
  isSubmitting = false,
  isLoadingComments = false,
  isLoadingHistory = false,
  hasMoreHistory = false,
  onLoadMoreHistory,
  isLoadingMoreHistory = false,
  quickReplies,
  defaultTab = 'all',
  defaultSortOrder = 'oldest', // jira-compare S-50: Jira's default is Oldest first
  jiraUserMap,
  className,
}: ActivityPanelProps) {
  const [activeTab, setActiveTab] = useState<ActivityTabKey>(defaultTab);
  const [sortOrder, setSortOrder] = useState<CdsSortOrder>(defaultSortOrder);
  const [sortOpen, setSortOpen] = useState(false);

  const tabs: { key: ActivityTabKey; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'comments', label: 'Comments' },
    { key: 'history', label: 'History' },
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
  const [editValue, setEditValue] = useState('');

  return (
    <div className={cn('flex flex-col', className)}>
      <div className="flex items-center justify-between mb-4">
        <h3
          className="text-[16px] font-semibold text-[#172B4D] dark:text-[#EDEDED]"
          style={{ fontFamily: '"Atlassian Sans", ui-sans-serif, -apple-system, "system-ui", "Segoe UI", Ubuntu, "Helvetica Neue", sans-serif' }}
        >
          Activity
        </h3>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'px-3 py-1.5 rounded text-[13px] font-medium transition-colors duration-150',
                activeTab === tab.key
                  ? 'bg-[#DEEBFF] text-[#0747A6] dark:bg-[#1C3A5C] dark:text-[#4C9AFF]'
                  : 'text-[#6B778C] hover:bg-[#F4F5F7] dark:text-[#A1A1A1] dark:hover:bg-[#1F1F1F]'
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
            className="flex items-center gap-1 text-[13px] text-[#6B778C] dark:text-[#A1A1A1] hover:text-[#172B4D] dark:hover:text-[#EDEDED] transition-colors"
          >
            {sortOrder === 'newest' ? 'Newest first' : 'Oldest first'}
            <ChevronDown className="h-3.5 w-3.5" />
          </button>

          {sortOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setSortOpen(false)} />
              <div className="absolute right-0 top-full mt-1 z-50 bg-white dark:bg-[#1A1A1A] border border-[#DFE1E6] dark:border-[#2E2E2E] rounded-md shadow-lg py-1 min-w-[140px]">
                {(['newest', 'oldest'] as CdsSortOrder[]).map((order) => (
                  <button
                    key={order}
                    type="button"
                    onClick={() => {
                      setSortOrder(order);
                      setSortOpen(false);
                    }}
                    className={cn(
                      'w-full text-left px-3 py-1.5 text-[13px] transition-colors',
                      order === sortOrder
                        ? 'bg-[#DEEBFF] text-[#0747A6] dark:bg-[#1C3A5C] dark:text-[#4C9AFF]'
                        : 'text-[#172B4D] dark:text-[#EDEDED] hover:bg-[#F4F5F7] dark:hover:bg-[#1F1F1F]'
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
          quickReplies={quickReplies}
          isSubmitting={isSubmitting}
          isLoading={isLoadingComments}
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

      {activeTab === 'all' && (
        <div className="flex flex-col">
          <CommentEditor
            currentUser={currentUser}
            mentionableUsers={mentionableUsers}
            onSubmit={onAddComment}
            quickReplies={quickReplies}
            isSubmitting={isSubmitting}
            shortcutHint="Pro tip: press **M** to comment"
          />

          <div className="mt-4 divide-y divide-[#EBECF0] dark:divide-[#2E2E2E]">
            {(isLoadingComments || isLoadingHistory) ? (
              <div className="text-center py-8">
                <p className="text-[13px] text-[#6B778C] dark:text-[#878787]">Loading activity...</p>
              </div>
            ) : mergedAll.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-[13px] text-[#6B778C] dark:text-[#878787]">
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
                        <div className="rounded-md border border-[#4C9AFF] dark:border-[#4C9AFF] p-3">
                          <textarea
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="w-full resize-none border-0 bg-transparent text-[13px] text-[#172B4D] dark:text-[#EDEDED] focus:outline-none focus:ring-0 min-h-[60px]"
                            autoFocus
                            onKeyDown={(e) => {
                              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                                if (onEditComment) {
                                  onEditComment(c.id, editValue);
                                  setEditingId(null);
                                }
                              }
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                          />
                          <div className="flex items-center gap-2 mt-2">
                            <button
                              type="button"
                              onClick={() => {
                                if (onEditComment) {
                                  onEditComment(c.id, editValue);
                                  setEditingId(null);
                                }
                              }}
                              className="text-[12px] font-medium text-[#2563EB] hover:underline"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="text-[12px] font-medium text-[#6B778C] hover:text-[#172B4D] dark:text-[#A1A1A1] dark:hover:text-[#EDEDED]"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  const canEdit = onEditComment && currentUser && c.author.id === currentUser.id;
                  const canDelete = onDeleteComment && currentUser && c.author.id === currentUser.id;

                  return (
                    <Comment
                      key={item.id}
                      comment={c}
                      actions={
                        (canEdit || canDelete) && !c.isSystem ? (
                          <>
                            {canEdit && (
                              <CommentAction
                                onClick={() => {
                                  setEditingId(c.id);
                                  setEditValue(c.content);
                                }}
                              >
                                Edit
                              </CommentAction>
                            )}
                            {canDelete && (
                              <CommentAction onClick={() => onDeleteComment!(c.id)}>
                                Delete
                              </CommentAction>
                            )}
                          </>
                        ) : undefined
                      }
                    />
                  );
                }

                return <ActivityItem key={item.id} item={item} jiraUserMap={jiraUserMap} />;
              })
            )}
          </div>

          {hasMoreHistory && (
            <div className="py-3 text-center">
              <button
                type="button"
                onClick={onLoadMoreHistory}
                disabled={isLoadingMoreHistory}
                className="text-[13px] font-medium text-[#0747A6] dark:text-[#4C9AFF] hover:underline disabled:opacity-50"
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
