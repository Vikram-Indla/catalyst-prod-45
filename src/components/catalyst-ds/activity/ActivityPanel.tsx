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
import { JiraActivityRow, useActivityLookups, HistoryPill } from './JiraActivityRow';
import { WorkLogPanel, WorkLogEntry } from './worklog/WorkLogPanel';
import { useWorkLogs } from './worklog/useWorkLogs';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
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
  /** Optional list of tabs to hide from the tab strip — useful for
   *  surfaces that don't back the underlying feature. e.g. BR detail
   *  passes `['worklog']` because business_requests has no work-log
   *  model. Empty/undefined renders all four tabs. */
  hiddenTabs?: ActivityTabKey[];

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
  defaultSortOrder = 'oldest',
  hiddenTabs,
  jiraUserMap,
  workItemId,
  improveContext,
  issueKey,
  className,
}: ActivityPanelProps) {
  const hiddenTabSet = useMemo(
    () => new Set(hiddenTabs ?? []),
    [hiddenTabs],
  );
  const initialTab: ActivityTabKey = hiddenTabSet.has(defaultTab)
    ? 'all'
    : defaultTab;
  const [activeTab, setActiveTab] = useState<ActivityTabKey>(initialTab);
  const [sortOrder, setSortOrder] = useState<CdsSortOrder>(defaultSortOrder);
  const [sortOpen, setSortOpen] = useState(false);
  // ID of the comment currently being replied to. When set, an inline
  // CommentEditor renders directly below that comment with a
  // "Replying to <name>" header — same pattern as For You's
  // RecommendedPanel. Submitting creates a new comment on the same
  // work item; it then renders in the comments list with its own
  // toolbar / edit gating / reactions just like any other comment.
  const [replyingToId, setReplyingToId] = useState<string | null>(null);

  const tabs: { key: ActivityTabKey; label: string }[] = (
    [
      { key: 'all', label: 'All' },
      { key: 'comments', label: 'Comments' },
      { key: 'history', label: 'History' },
      { key: 'worklog', label: 'Work log' },
    ] as { key: ActivityTabKey; label: string }[]
  ).filter((t) => !hiddenTabSet.has(t.key));

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
                paddingLeft: 40,
                paddingTop: 8,
                paddingBottom: 8,
              }}
            >
              <div
                style={{
                  fontSize: 'var(--ds-font-size-200)',
                  fontWeight: 500,
                  color: 'var(--ds-text-subtle)',
                  marginBottom: 4,
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
        <h2
          className="text-[var(--ds-text)] dark:text-[var(--ds-text)]"
          style={{ margin: 0, fontSize: 'var(--ds-font-size-400)', fontWeight: 600, lineHeight: '20px', fontFamily: 'var(--cp-font-body)' }}
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
                  ? 'bg-[var(--ds-background-selected)] text-[var(--ds-link)] dark:bg-[var(--ds-background-information)] dark:text-[var(--ds-background-information-bold)]'
                  : 'text-[var(--ds-text-subtle)] hover:bg-[var(--ds-surface-sunken)] dark:text-[var(--ds-text-subtlest)] dark:hover:bg-[var(--ds-surface-overlay)]'
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
            className="flex items-center gap-1 text-[14px] text-[var(--ds-text-subtlest)] dark:text-[var(--ds-text-subtlest)] hover:text-[var(--ds-text)] dark:hover:text-[var(--ds-text)] transition-colors"
          >
            {sortOrder === 'newest' ? 'Newest first' : 'Oldest first'}
            <ChevronDown className="h-3.5 w-3.5" />
          </button>

          {sortOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setSortOpen(false)} />
              <div className="absolute right-0 top-full mt-1 z-50 bg-white dark:bg-[var(--ds-surface-raised)] border border-[var(--ds-border)] dark:border-[var(--ds-border)] rounded-md shadow-lg py-1 min-w-[140px]">
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
                        ? 'bg-[var(--ds-background-selected)] text-[var(--ds-link)] dark:bg-[var(--ds-background-information)] dark:text-[var(--ds-background-information-bold)]'
                        : 'text-[var(--ds-text)] dark:text-[var(--ds-text)] hover:bg-[var(--ds-surface-sunken)] dark:hover:bg-[var(--ds-surface-overlay)]'
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

      {activeTab === 'worklog' && (
        <div className="mt-2">
          <WorkLogPanel workItemId={workItemId ?? undefined} />
        </div>
      )}

      {activeTab === 'all' && (
        <div className="flex flex-col">
          <AllTabFeed
            mergedAll={mergedAll}
            isLoadingComments={isLoadingComments}
            isLoadingHistory={isLoadingHistory}
            workItemId={workItemId}
          />

          {hasMoreHistory && (
            <div className="py-3 text-center">
              <button
                type="button"
                onClick={onLoadMoreHistory}
                disabled={isLoadingMoreHistory}
                className="text-[14px] font-medium text-[var(--ds-link)] dark:text-[var(--ds-background-information-bold)] hover:underline disabled:opacity-50"
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

// ─── All tab — Jira-parity merged feed ─────────────────────────────
//
// Comments + history events in one stream. Each row renders with a
// HISTORY (or COMMENT) pill so the type is obvious. History rows use
// JiraActivityRow (field-type dispatcher → StatusPill / Avatar /
// plain text / side-by-side description diff). Comment rows use the
// read-only <Comment> we landed last step.
function AllTabFeed({
  mergedAll,
  isLoadingComments,
  isLoadingHistory,
  workItemId,
}: {
  mergedAll: CdsActivityItem[];
  isLoadingComments: boolean;
  isLoadingHistory: boolean;
  workItemId?: string;
}) {
  const historyOnly = useMemo(
    () => mergedAll.filter((i) => i.type !== 'comment'),
    [mergedAll],
  );
  const { statusByNames, userByNames } = useActivityLookups(historyOnly);
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const { entries: workLogs, updateEntry, deleteEntry } = useWorkLogs(workItemId);

  // Build a single chronological stream of comments + history +
  // worklogs. Each kind keeps its rendering and pill on the All tab.
  type StreamItem =
    | { kind: 'event'; ts: number; key: string; item: CdsActivityItem }
    | { kind: 'worklog'; ts: number; key: string; entry: typeof workLogs[number] };

  const stream: StreamItem[] = [];
  for (const it of mergedAll) {
    stream.push({ kind: 'event', ts: new Date(it.timestamp).getTime(), key: it.id, item: it });
  }
  for (const w of workLogs) {
    stream.push({ kind: 'worklog', ts: new Date(w.created_at).getTime(), key: `wl-${w.id}`, entry: w });
  }
  stream.sort((a, b) => b.ts - a.ts);

  if (isLoadingComments || isLoadingHistory) {
    return (
      <div className="mt-4 text-center py-8">
        <p className="text-[13px] text-[var(--ds-text-subtlest)] dark:text-[var(--ds-text-subtlest)]">
          Loading activity...
        </p>
      </div>
    );
  }
  if (mergedAll.length === 0) {
    return (
      <div className="mt-4 text-center py-10">
        <p className="text-[13px] text-[var(--ds-text-subtlest)] dark:text-[var(--ds-text-subtlest)]">
          No activity yet
        </p>
        <p className="mt-1 text-[12px] text-[var(--ds-text-subtlest)] dark:text-[var(--ds-text-subtlest)]">
          Comments and updates will show up here. Switch to the Comments tab to start the conversation.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 divide-y divide-[var(--ds-border)] dark:divide-[var(--ds-border,var(--cp-ink-1))]">
      {stream.map((s) => {
        if (s.kind === 'worklog') {
          const isAuthor = user?.id === s.entry.author_id;
          return (
            <div key={s.key}>
              <WorkLogEntry
                entry={s.entry}
                canEdit={isAuthor || isAdmin}
                canDelete={isAuthor || isAdmin}
                onSaveEdit={(input) => updateEntry.mutateAsync(input)}
                onDelete={(id) => deleteEntry.mutateAsync(id)}
                showPill
              />
            </div>
          );
        }
        const item = s.item;
        if (item.type === 'comment' && item.comment) {
          return (
            <div key={item.id} style={{ paddingTop: 4, paddingBottom: 4 }}>
              <Comment
                comment={item.comment}
                extras={<div style={{ marginTop: 4 }}><HistoryPill label="COMMENT" /></div>}
              />
            </div>
          );
        }
        // Use the existing ActivityItem with its built-in HISTORY
        // lozenge (showTypeBadge) — known-good path. Field rendering
        // (status / priority / assignee diff widgets) already lives
        // inside ActivityItem, so we get all of it for free.
        return (
          <ActivityItem
            key={item.id}
            item={item}
            jiraUserMap={undefined}
            showTypeBadge
          />
        );
      })}
    </div>
  );
}

export { ActivityPanel };
