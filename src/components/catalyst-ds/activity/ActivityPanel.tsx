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
import { CommentToolbar } from '../comments/CommentToolbar';
import { CommentEditor, type CommentImproveContext } from '../comments/CommentEditor';
import { CommentNode } from '../comments/CommentNode';
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
  /** Threaded reply — posts a new comment whose parent_comment_id
   *  points at `parentId`. When omitted, replies fall back to
   *  `onAddComment` (no threading). */
  onAddReply?: (parentId: string, content: string) => void | Promise<void>;
  onEditComment?: (id: string, content: string) => void | Promise<void>;
  onDeleteComment?: (id: string) => void | Promise<void>;
  /** Toggle a reaction on a comment. `hasMine` is the current state —
   *  if true, the call should DELETE the row; if false, INSERT. */
  onToggleReaction?: (
    commentId: string,
    emoji: string,
    hasMine: boolean,
  ) => void | Promise<void>;

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

  /** Work item id — threaded into CommentEditor for image uploads. */
  workItemId?: string;

  /** Context for the "Improve writing" wand in the comment composer. */
  improveContext?: CommentImproveContext;

  /**
   * Jira issue key (e.g. "BAU-5510") — used to cache comment translations.
   * When provided, each comment shows a CATY translate affordance.
   * Pass undefined to disable translation (e.g. surfaces without a canonical key).
   */
  issueKey?: string;

  className?: string;
}

function ActivityPanel({
  comments,
  historyItems,
  currentUser,
  mentionableUsers = [],
  onAddComment,
  onAddReply,
  onEditComment,
  onDeleteComment,
  onToggleReaction,
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
  workItemId,
  improveContext,
  issueKey,
  className,
}: ActivityPanelProps) {
  const [activeTab, setActiveTab] = useState<ActivityTabKey>(defaultTab);
  const [sortOrder, setSortOrder] = useState<CdsSortOrder>(defaultSortOrder);
  const [sortOpen, setSortOpen] = useState(false);
  // ID of the comment currently being replied to. When set, an inline
  // CommentEditor renders directly below that comment with a
  // "Replying to <name>" header — same pattern as For You's
  // RecommendedPanel. Submitting creates a new comment on the same
  // work item; it then renders in the comments list with its own
  // toolbar / edit gating / reactions just like any other comment.
  const [replyingToId, setReplyingToId] = useState<string | null>(null);

  /* jira-compare 2026-05-03 — Patch A2 · Worklog tab parity with Jira's
     Activity tabs. Data source (ph_worklogs) is the next-session follow-up;
     this lands the tab UI so parity is visible. */
  const tabs: { key: ActivityTabKey; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'comments', label: 'Comments' },
    { key: 'history', label: 'History' },
    { key: 'worklog', label: 'Work log' },
  ];

  // Build the reply tree client-side: parentId → immediate children,
  // sorted ascending by createdAt so a parent's replies render in the
  // order they were posted regardless of the panel's top-level sort.
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

  const mergedAll = useMemo(() => {
    // Only top-level comments appear as their own row in the merged
    // feed — replies are rendered nested under their parent by
    // CommentNode, not as standalone activity items.
    const topLevel = comments.filter((c) => !c.parentId);
    const commentItems: CdsActivityItem[] = topLevel.map((c) => ({
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

  // Per-comment translation state. Maps commentId → translated plain text.
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

  // Renders a single comment block — Comment + toolbar + (optional)
  // translate bar + (optional) inline edit editor + (optional) inline
  // reply composer. Pulled out so CommentNode can reuse the same
  // rendering for every level of the reply tree on the All tab.
  const renderCommentBlock = useCallback(
    (c: CdsComment) => {
      if (editingId === c.id) {
        return (
          <div className="py-3">
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

      const canEdit =
        !!onEditComment && !!currentUser && c.author.id === currentUser.id;
      const canDelete =
        !!onDeleteComment && !!currentUser && c.author.id === currentUser.id;

      const displayComment: CdsComment = translatedComments[c.id]
        ? { ...c, content: translatedComments[c.id] }
        : c;
      const commentPlainText = commentToPlainText(c.content);

      return (
        <>
          <Comment
            comment={displayComment}
            extras={
              !c.isSystem && commentPlainText.trim() && issueKey ? (
                <DescriptionTranslateBar
                  plainText={commentPlainText}
                  issueKey={issueKey}
                  field={`comment:${c.id}`}
                  isTranslated={!!translatedComments[c.id]}
                  onTranslated={(text) => handleCommentTranslated(c.id, text)}
                  onRevert={() => handleCommentRevert(c.id)}
                  style={{ marginTop: 4, marginBottom: 0 }}
                />
              ) : undefined
            }
            actions={
              !c.isSystem ? (
                <CommentToolbar
                  reactions={c.reactions}
                  onToggleReaction={
                    onToggleReaction
                      ? (emoji, hasMine) =>
                          onToggleReaction(c.id, emoji, hasMine)
                      : undefined
                  }
                  onReply={() => setReplyingToId(c.id)}
                  onEdit={
                    canEdit
                      ? () => {
                          setEditingId(c.id);
                          setEditValue(c.content);
                        }
                      : undefined
                  }
                  onCopyLink={() => {
                    const url = new URL(window.location.href);
                    url.searchParams.set('comment', c.id);
                    void navigator.clipboard?.writeText(url.toString());
                  }}
                  onDelete={
                    canDelete ? () => onDeleteComment!(c.id) : undefined
                  }
                />
              ) : undefined
            }
          />
          {replyingToId === c.id && (
            <div
              style={{
                paddingLeft: 44,
                paddingTop: 8,
                paddingBottom: 8,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: 'var(--ds-text-subtle, #44546F)',
                  marginBottom: 6,
                }}
              >
                Replying to {c.author.name}
              </div>
              <CommentEditor
                currentUser={currentUser}
                mentionableUsers={mentionableUsers}
                autoFocus
                placeholder={`Reply to ${c.author.name}…`}
                onSubmit={async (content) => {
                  if (onAddReply) {
                    await onAddReply(c.id, content);
                  } else {
                    await onAddComment(content);
                  }
                  setReplyingToId(null);
                }}
                onCancel={() => setReplyingToId(null)}
                workItemId={workItemId}
                improveContext={improveContext}
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
      improveContext,
      onEditComment,
      onDeleteComment,
      onToggleReaction,
      onAddReply,
      onAddComment,
      handleCommentTranslated,
      handleCommentRevert,
    ],
  );

  return (
    <div className={cn('flex flex-col', className)}>
      <div className="flex items-center justify-between mb-4">
        {/* jira-compare 2026-05-11 re-probe: canonical 16/653/20px/rgb(41,42,46)
            (live DOM BAU-5814 Story + QA Bug exemplars). Corrects 2026-05-08
            14/600 lesson which measured wrapper levels. */}
        <h2
          className="text-[var(--ds-text,#292A2E)] dark:text-[var(--ds-text,var(--cp-bg-neutral, #EDEDED))]"
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
                /* jira-compare 2026-05-16 (corrected): Jira Activity tabs are 14px/400, NOT 13px/500.
                   TreeWalker probe on BAU-1919: fontSize=14px, fontWeight=400 on all tab elements.
                   Selected tab: borderBottom="0px none" on the tab element itself — active state
                   is conveyed purely by bg=rgb(233,242,254) on parent + color=rgb(24,104,219) on tab.
                   The prior 'border-b border-[#1868DB]' was incorrect — removed. */
                'px-3 py-1.5 rounded text-[14px] font-normal transition-colors duration-150',
                activeTab === tab.key
                  ? 'bg-[#E9F2FE] text-[#1868DB] dark:bg-[#1C3A5C] dark:text-[#4C9AFF]'
                  : 'text-[var(--ds-text-subtle,#505258)] hover:bg-[var(--ds-surface-sunken,var(--cp-bg-sunken, #F4F5F7))] dark:text-[var(--ds-text-subtlest,#A1A1A1)] dark:hover:bg-[var(--ds-surface-overlay,#1F1F1F)]'
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
            className="flex items-center gap-1 text-[14px] text-[var(--ds-text-subtlest,var(--cp-text-secondary, #6B778C))] dark:text-[var(--ds-text-subtlest,#A1A1A1)] hover:text-[var(--ds-text,var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))] dark:hover:text-[var(--ds-text,var(--cp-bg-neutral, #EDEDED))] transition-colors"
          >
            {sortOrder === 'newest' ? 'Newest first' : 'Oldest first'}
            <ChevronDown className="h-3.5 w-3.5" />
          </button>

          {sortOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setSortOpen(false)} />
              <div className="absolute right-0 top-full mt-1 z-50 bg-white dark:bg-[var(--ds-surface-raised,var(--cp-ink-1, #1A1A1A))] border border-[var(--ds-border,var(--cp-lozenge-grey-bg, var(--cp-border-neutral, #DFE1E6)))] dark:border-[var(--ds-border,var(--cp-ink-1, #2E2E2E))] rounded-md shadow-lg py-1 min-w-[140px]">
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
                        : 'text-[var(--ds-text,var(--cp-text-primary, var(--cp-text-inverse, #172B4D)))] dark:text-[var(--ds-text,var(--cp-bg-neutral, #EDEDED))] hover:bg-[var(--ds-surface-sunken,var(--cp-bg-sunken, #F4F5F7))] dark:hover:bg-[var(--ds-surface-overlay,#1F1F1F)]'
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
          onAddReply={onAddReply}
          onEditComment={onEditComment}
          onDeleteComment={onDeleteComment}
          onToggleReaction={onToggleReaction}
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

      {/* jira-compare 2026-05-03 — Patch A2 · Worklog tab. Empty state until
          ph_worklogs data source is wired (Supabase work, next session). */}
      {activeTab === 'worklog' && (
        <div className="text-center py-10">
          <p className="text-[13px] text-[var(--ds-text-subtlest,var(--cp-text-secondary, #6B778C))] dark:text-[var(--ds-text-subtlest,var(--cp-text-secondary, #878787))]">
            No worklog entries yet
          </p>
          <p className="text-[12px] text-[var(--ds-text-subtlest,var(--cp-text-secondary, #6B778C))] dark:text-[var(--ds-text-subtlest,var(--cp-text-secondary, #878787))] mt-2">
            Track time spent on this work item via the Worklog tab. Coming soon.
          </p>
        </div>
      )}

      {activeTab === 'all' && (
        <div className="flex flex-col">
          {/* All tab is read-only — no composer, no toolbar, no reply
              affordance. Comment writes / reactions / replies live on
              the Comments tab. This tab is a placeholder until the
              history feed lands; for now it just shows existing
              comments interleaved with activity events. */}
          <div className="mt-4 divide-y divide-[#EBECF0] dark:divide-[var(--ds-border,var(--cp-ink-1, #2E2E2E))]">
            {(isLoadingComments || isLoadingHistory) ? (
              <div className="text-center py-8">
                <p className="text-[13px] text-[var(--ds-text-subtlest,var(--cp-text-secondary, #6B778C))] dark:text-[var(--ds-text-subtlest,var(--cp-text-secondary, #878787))]">Loading activity...</p>
              </div>
            ) : mergedAll.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-[13px] text-[var(--ds-text-subtlest,var(--cp-text-secondary, #6B778C))] dark:text-[var(--ds-text-subtlest,var(--cp-text-secondary, #878787))]">
                  No activity yet
                </p>
              </div>
            ) : (
              mergedAll.map((item) => {
                if (item.type === 'comment' && item.comment) {
                  return (
                    <div key={item.id}>
                      <Comment comment={item.comment} />
                    </div>
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
