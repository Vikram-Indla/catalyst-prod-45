import * as React from 'react';
import { useState, useMemo, useCallback } from 'react';
import { ChevronDown } from '@/lib/atlaskit-icons';
import UtilityChevronDown from '@atlaskit/icon/utility/chevron-down';
import UtilityChevronRight from '@atlaskit/icon/utility/chevron-right';
import type {
  CdsComment,
  CdsActivityItem,
  CdsSortOrder,
  CdsUser,
  CdsQuickReply,
} from '../types';
import type { JiraUserMap } from '../utils/jiraContent';
import FlagFilledIcon from '@atlaskit/icon/core/flag-filled';
import { token } from '@atlaskit/tokens';
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
  const [sectionExpanded, setSectionExpanded] = useState(true);
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
    <div style={{ display: 'flex', flexDirection: 'column' }} className={className}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
        <button
          type="button"
          onClick={() => setSectionExpanded((v) => !v)}
          aria-expanded={sectionExpanded}
          aria-label={sectionExpanded ? 'Collapse Activity' : 'Expand Activity'}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 20,
            height: 20,
            padding: 0,
            border: 'none',
            borderRadius: 3,
            background: 'transparent',
            color: 'var(--ds-text-subtle)',
            cursor: 'pointer',
          }}
        >
          {sectionExpanded ? <UtilityChevronDown label="" color="currentColor" /> : <UtilityChevronRight label="" color="currentColor" />}
        </button>
        <h2
          onClick={() => setSectionExpanded((v) => !v)}
          style={{ margin: 0, fontSize: 16, fontWeight: 600, lineHeight: '20px', fontFamily: 'var(--cp-font-body)', color: 'var(--ds-text)', cursor: 'pointer' }}
        >
          Activity
        </h2>
      </div>

      {!sectionExpanded ? null : (
      <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: '6px 12px',
                borderRadius: 3,
                fontSize: 14,
                fontWeight: 400,
                border: 'none',
                cursor: 'pointer',
                background: activeTab === tab.key ? 'var(--ds-background-selected)' : 'transparent',
                color: activeTab === tab.key ? 'var(--ds-link)' : 'var(--ds-text-subtle)',
              }}
            >
              {tab.label}
            </button>
          ))}
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
        <div style={{ marginTop: 8 }}>
          <WorkLogPanel workItemId={workItemId ?? undefined} />
        </div>
      )}

      {activeTab === 'all' && (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <AllTabFeed
            mergedAll={mergedAll}
            isLoadingComments={isLoadingComments}
            isLoadingHistory={isLoadingHistory}
            workItemId={workItemId}
            currentUser={currentUser}
            onEditComment={onEditComment}
            onDeleteComment={onDeleteComment}
            onToggleReaction={onToggleReaction}
          />

          {hasMoreHistory && (
            <div style={{ padding: '12px 0', textAlign: 'center' }}>
              <button
                type="button"
                onClick={onLoadMoreHistory}
                disabled={isLoadingMoreHistory}
                style={{ fontSize: 14, fontWeight: 500, color: 'var(--ds-link)', background: 'none', border: 'none', cursor: 'pointer', opacity: isLoadingMoreHistory ? 0.5 : 1 }}
              >
                {isLoadingMoreHistory ? 'Loading...' : 'Load more activity'}
              </button>
            </div>
          )}
        </div>
      )}
      </>
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
  currentUser,
  onEditComment,
  onDeleteComment,
  onToggleReaction,
}: {
  mergedAll: CdsActivityItem[];
  isLoadingComments: boolean;
  isLoadingHistory: boolean;
  workItemId?: string;
  currentUser?: CdsUser;
  onEditComment?: (id: string, content: string) => void | Promise<void>;
  onDeleteComment?: (id: string) => void | Promise<void>;
  onToggleReaction?: (commentId: string, emoji: string, hasMine: boolean) => void | Promise<void>;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
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
      <div style={{ marginTop: 16, textAlign: 'center', padding: '32px 0' }}>
        <p style={{ fontSize: 13, color: 'var(--ds-text-subtlest)' }}>
          Loading activity...
        </p>
      </div>
    );
  }
  if (mergedAll.length === 0) {
    return (
      <div style={{ marginTop: 16, textAlign: 'center', padding: '40px 0' }}>
        <p style={{ fontSize: 13, color: 'var(--ds-text-subtlest)' }}>
          No activity yet
        </p>
        <p style={{ marginTop: 4, fontSize: 12, color: 'var(--ds-text-subtlest)' }}>
          Comments and updates will show up here. Switch to the Comments tab to start the conversation.
        </p>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 16 }}>
      {stream.map((s) => {
        if (s.kind === 'worklog') {
          const isAuthor = user?.id === s.entry.author_id;
          return (
            <div key={s.key} style={{ borderTop: '1px solid var(--ds-border)' }}>
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
          const c = item.comment;
          // Fall back to the raw auth.uid() when the profile-lookup that
          // populates `currentUser` hasn't resolved yet. The comment's
          // author.id is always the profile UUID = auth.uid(), so this
          // matches on the first render instead of blocking until the
          // profile query returns.
          const meId = currentUser?.id ?? user?.id ?? null;
          const canEdit = !!onEditComment && !!meId && c.author.id === meId;
          const canDelete = !!onDeleteComment && !!meId && c.author.id === meId;
          if (editingId === c.id) {
            const editSeed = seedFlagContent(c);
            return (
              <div key={item.id} style={{ borderTop: '1px solid var(--ds-border)', paddingTop: 8, paddingBottom: 8 }}>
                <CommentEditor
                  currentUser={currentUser}
                  defaultValue={editSeed}
                  autoFocus
                  onSubmit={async (content) => {
                    if (!onEditComment) return;
                    await onEditComment(c.id, stripFlagPrefix(content, c.commentType));
                    setEditingId(null);
                  }}
                  onCancel={() => setEditingId(null)}
                  workItemId={workItemId}
                />
              </div>
            );
          }
          return (
            <div key={item.id} style={{ borderTop: '1px solid var(--ds-border)', paddingTop: 4, paddingBottom: 4 }}>
              <Comment
                comment={c}
                extras={<div style={{ marginTop: 0, marginBottom: 8 }}><HistoryPill label="COMMENTS" /></div>}
                actions={
                  <CommentToolbar
                    reactions={c.reactions}
                    onToggleReaction={
                      onToggleReaction
                        ? (emoji, hasMine) => onToggleReaction(c.id, emoji, hasMine)
                        : undefined
                    }
                    onEdit={canEdit ? () => setEditingId(c.id) : undefined}
                    onCopyLink={() => {
                      const url = new URL(window.location.href);
                      url.searchParams.set('comment', c.id);
                      void navigator.clipboard?.writeText(url.toString());
                    }}
                    onDelete={canDelete ? () => onDeleteComment!(c.id) : undefined}
                  />
                }
              />
            </div>
          );
        }
        // Use the existing ActivityItem with its built-in HISTORY
        // lozenge (showTypeBadge) — known-good path. Field rendering
        // (status / priority / assignee diff widgets) already lives
        // inside ActivityItem, so we get all of it for free.
        return (
          <div key={item.id} style={{ borderTop: '1px solid var(--ds-border)' }}>
            <ActivityItem
              item={item}
              jiraUserMap={undefined}
              showTypeBadge
            />
          </div>
        );
      })}
    </div>
  );
}

/**
 * Build the editor's `defaultValue` as an ADF doc for a flag audit
 * comment. First paragraph contains the same Atlassian flag emoji
 * shortcode the icon renders from (`:flag_on:` / `:flag_off:`) so the
 * editor draws the identical branded flag glyph as the read-only
 * FlagCommentBody. Second paragraph carries the optional reason.
 * Non-flag comments pass through unchanged.
 */
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

/**
 * Strip the seeded flag paragraph on save so the stored body is just
 * the reason text. Handles both ADF (editor returns JSON) and the
 * plain-text markdown-lite the editor's `.getMarkdown()` path emits.
 */
function stripFlagPrefix(content: string, variant?: string): string {
  if (variant !== 'flag_added' && variant !== 'flag_removed') return content;
  const label = variant === 'flag_added' ? 'Flag added' : 'Flag removed';
  const emojiChar = variant === 'flag_added' ? '🚩' : '🏳️';
  const shortName = variant === 'flag_added' ? ':flag_on:' : ':flag_off:';
  // ADF path — parse and drop the first paragraph if it looks like the
  // seeded flag header.
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
      // fall through to plain-text stripping
    }
  }
  // Plain-text path.
  return content
    .replace(new RegExp(`^\\s*${emojiChar}\\s*${label}\\s*(\\n|$)`), '')
    .replace(new RegExp(`^\\s*${shortName}\\s*${label}\\s*(\\n|$)`), '')
    .trimStart();
}

export { ActivityPanel };
