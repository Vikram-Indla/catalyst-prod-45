/**
 * RecommendedPanel — the default For You tab.
 *
 * Jira parity (from /jira-compare 2026-04-24 DOM probe against
 * digital-transformation.atlassian.net/jira/for-you):
 *
 * The Recommended tab stacks TWO card sections:
 *
 *   Section A — "Reply to mentions"
 *   ────────────────────────────────
 *   H4 header (Atlassian Sans 600 16/20) + one-line subtitle.
 *   For each mention, a card row with:
 *     • 32px circular avatar of the mentioner
 *     • Row 1 headline: "<Mentioner> mentioned you on <Issue Title>"
 *     • Row 2 meta:     "<Project> · <ISSUE-KEY> · <relative time>"
 *     • Row 3 comment:  full comment body with @-chips rendered inline
 *     • Row 4 footer:   "Leave a reply / Suggest a reply" input (bordered,
 *                        radius 6, subtle neutral border — 0.56px solid
 *                        rgba(11,18,14,0.14) per Jira computed style).
 *
 *   Section B — "Reply to comments"
 *   ────────────────────────────────
 *   Same card structure as A, but headline format is
 *   "<Author> commented on <Issue Title>". Populated from
 *   useForYouData.recommendedComments — recent comments on the user's
 *   watched work that do NOT explicitly @-mention them.
 *
 * House divergences from Jira (accepted, see CLAUDE.md):
 *   • No emoji reactions (Catalyst doesn't track reactions).
 *   • Reply input is decorative for now — it jumps to the detail modal on
 *     focus rather than posting inline. Inline reply ships in a follow-up.
 *
 * @-mention chip rendering
 * ────────────────────────
 * Jira renders the ADF mention node as an Atlaskit pill:
 *   bg:   rgba(5, 21, 36, 0.06)
 *   color:rgb(80, 82, 88)
 *   radius: 20px
 *   padding: 0 3px 2px 4px
 * We replicate that treatment client-side by scanning the synced plain-text
 * body for "@<First Last>" tokens (as produced by our adfToPlainText fix)
 * and wrapping them in a styled <span>.
 */
import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { token } from '@atlaskit/tokens';
import Avatar from '@atlaskit/avatar';
import { StatusPill } from '@/components/shared/JiraTable/cells';
import { statusToLozenge } from '@/modules/project-work-hub/utils/statusToLozenge';
import Spinner from '@atlaskit/spinner';
import { CatyHead } from './CatyButton';

import Tooltip from '@atlaskit/tooltip';
import TextArea from '@atlaskit/textarea';
import EmojiAddIcon from '@atlaskit/icon/glyph/emoji-add';
import CrossIcon from '@atlaskit/icon/glyph/cross';
import ForYouRow from './ForYouRow';
import { SummarizeDigestModal, type DigestMention } from './SummarizeDigestModal';
import { ForYouEmptyState, GroupHeading, groupByRecency, MentionSparkleArt } from './helpers';
import WorkItemIcon, { normalizeIconType } from '@/components/shared/WorkItemIcon';
import { TicketLinkCard } from '@/components/shared/TicketLinkCard';
import { renderContent as renderCommentContent } from '@/components/catalyst-ds/comments/Comment';
import { Comment } from '@/components/catalyst-ds/comments/Comment';
import { CommentToolbar } from '@/components/catalyst-ds/comments/CommentToolbar';
import { CommentEditor } from '@/components/catalyst-ds/comments/CommentEditor';
import {
  CommentNode,
  TRUNK_X,
  LINE_COLOR,
  LINE_WIDTH,
  BRANCH_WIDTH,
  BRANCH_HEIGHT,
  REPLY_INDENT,
} from '@/components/catalyst-ds/comments/CommentNode';
import type { CdsComment, CdsCommentReaction, CdsUser } from '@/components/catalyst-ds/types';
import { useAuth } from '@/hooks/useAuth';
import { useChatPeople } from '@/hooks/chat/useChatPeople';
import { parseMentions, type MentionRosterEntry } from '@/lib/mentions/parseMentions';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLayoutEffect } from 'react';
import { resolveAvatarUrl } from '@/lib/avatars';
import { useWorkItemComments } from '@/hooks/useWorkItemComments';
import { useCommentReactions } from '@/hooks/useCommentReactions';
import { useGlobalSearchStore } from '@/store/globalSearchStore';
import { fetchFunction } from '@/integrations/supabase/functionsRouter';
import { supabase } from '@/integrations/supabase/client';
import type { WorkItem, RecommendedMention, RecommendedComment, TabType } from '@/hooks/useForYouData';
import catyAiBg from '@/assets/caty-ai-bg.svg';
import '@/pages/project-hub/jira-list/components/ask-caty-input.css';

interface RecommendedPanelProps {
  items: WorkItem[];
  mentions: RecommendedMention[];
  comments: RecommendedComment[];
  isLoading: boolean;
  onSelect: (item: WorkItem) => void;
  onToggleStar: (id: string) => void;
  /**
   * Current user's display name ("First Last"). Used to render the viewer
   * avatar in the Jira-parity reply composer. Resolved through the same
   * `resolveAvatarUrl()` chokepoint as every other avatar in the app.
   */
  currentUserName?: string;
  /**
   * Lets the empty state route the user to a tab with content. Without this
   * the Recommended empty state is a dead end (Cooper goal-directed P0,
   * design-critique 2026-05-17). Optional so existing tests that mount
   * RecommendedPanel directly don't need to pass it.
   */
  onSwitchTab?: (tab: TabType) => void;
}

// ─── Dismiss persistence ────────────────────────────────────────────────────
// Jira's For You "Reply to mentions" / "Reply to comments" cards each expose
// an X button (top-right of every row) that removes that item from the feed
// until a new event replaces it. We mirror the behaviour client-side with
// localStorage so a refresh keeps the card dismissed.
const DISMISS_STORAGE_KEY = 'catalyst.forYou.dismissedIds.v1';

function loadDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(DISMISS_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set<string>(parsed) : new Set();
  } catch {
    return new Set();
  }
}

function persistDismissed(set: Set<string>) {
  try {
    localStorage.setItem(DISMISS_STORAGE_KEY, JSON.stringify([...set]));
  } catch { /* SSR / privacy — no-op */ }
}

// ─── Skeleton (H1 fix: replaces plain "Loading…" text) ──────────────────────
// Mirrors the shape of a FeedSection card so the user knows what's loading.
// Uses CSS animation via a data-attribute so no extra dependency is needed.
function SkeletonLine({ width = '100%', height = 12 }: { width?: string | number; height?: number }) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: 4,
        background: `linear-gradient(90deg, ${token('color.background.neutral', '#F1F2F4')} 25%, ${token('color.background.neutral.subtle', '#F7F8F9')} 50%, ${token('color.background.neutral', '#F1F2F4')} 75%)`,
        backgroundSize: '200% 100%',
        animation: 'catalyst-shimmer 1.4s infinite',
      }}
    />
  );
}

function RecommendedPanelSkeleton() {
  return (
    <>
      <style>{`
        @keyframes catalyst-shimmer {
          0%   { background-position: 200% 0 }
          100% { background-position: -200% 0 }
        }
      `}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {[0, 1].map(i => (
          <div
            key={i}
            style={{
              border: `1px solid ${token('color.border', 'rgba(11,18,14,0.14)')}`,
              borderRadius: 8,
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            {/* Header row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: 6, background: token('color.background.neutral', '#F1F2F4'), flexShrink: 0 }} />
              <SkeletonLine width={160} height={14} />
            </div>
            <SkeletonLine width="70%" height={11} />
            {/* Two card rows */}
            {[0, 1].map(j => (
              <div key={j} style={{ display: 'flex', gap: 12, paddingTop: 4 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: token('color.background.neutral', '#F1F2F4'), flexShrink: 0 }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <SkeletonLine width="85%" height={12} />
                  <SkeletonLine width="45%" height={10} />
                  <SkeletonLine width="95%" height={11} />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}

export default function RecommendedPanel({
  items,
  mentions,
  comments,
  isLoading,
  onSelect,
  onToggleStar,
  currentUserName,
  onSwitchTab,
}: RecommendedPanelProps) {
  // Index items by issueKey so a mention / comment card can hand back the
  // same WorkItem object when opening the detail panel.
  const itemByKey = useMemo(() => {
    const m = new Map<string, WorkItem>();
    items.forEach(i => m.set(i.key, i));
    return m;
  }, [items]);

  /**
   * Open the detail modal for a mentioned/commented issue.
   *
   * Primary path: look the issue up in the paginated `items` window. When the
   * issue lives in the visible page, we hand the full WorkItem to `onSelect`
   * so the page-level handler can also record a view + use rich item context.
   *
   * Fallback path: items is paginated (PAGE_SIZE = 20 in ForYouPage). When a
   * mention's issueKey isn't in the first page the lookup silently no-ops —
   * which manifests as "clicking the mention does nothing". We instead open
   * the canonical detail modal directly via globalSearchStore using the
   * mention/comment row's own metadata. Same code path the rest of the app
   * uses (notifications, global search, project sidebar).
   */
  const resolveSelect = (issueKey: string, fallback?: { issueId: string; issueType: string; projectKey: string }) => {
    const target = itemByKey.get(issueKey);
    if (target) {
      onSelect(target);
      return;
    }
    if (fallback) {
      useGlobalSearchStore.getState().openDetail({
        id: issueKey, // Detail router resolves by issue_key (CLAUDE.md 2026-05-10)
        itemType: fallback.issueType,
        projectKey: fallback.projectKey,
      });
    }
  };

  // Dismiss mechanism (Jira parity — X on every row).
  const [dismissed, setDismissed] = useState<Set<string>>(() => loadDismissed());
  const handleDismiss = (id: string) => {
    setDismissed(prev => {
      const next = new Set(prev);
      next.add(id);
      persistDismissed(next);
      return next;
    });
  };

  const visibleMentions = useMemo(
    () => mentions.filter(m => !dismissed.has(m.commentId)),
    [mentions, dismissed]
  );
  const visibleComments = useMemo(
    () => comments.filter(c => !dismissed.has(c.commentId)),
    [comments, dismissed]
  );

  // ─── Caty's Digest — panel-level "Ask Caty" CTA (outlier feature) ──────────
  // Council decision 2026-05-31: per-card sparkle = "this one". Panel-header
  // digest = "all of these, triaged with inline actions". Two complementary
  // entry points to the same AI affordance.
  const [digestOpen, setDigestOpen] = useState<'mentions' | 'comments' | null>(null);
  const digestRows = useMemo((): DigestMention[] => {
    const src = digestOpen === 'mentions' ? visibleMentions
              : digestOpen === 'comments' ? visibleComments
              : [];
    return src.map(m => ({
      commentId: m.commentId,
      mentionerName: 'mentionerName' in m ? m.mentionerName : m.authorName,
      mentionerAvatarUrl: 'mentionerAvatarUrl' in m ? m.mentionerAvatarUrl : m.authorAvatarUrl,
      issueKey: m.issueKey,
      issueSummary: m.issueSummary,
      commentBody: m.commentBody,
    }));
  }, [digestOpen, visibleMentions, visibleComments]);

  if (isLoading) {
    return <RecommendedPanelSkeleton />;
  }

  const hasMentions = visibleMentions.length > 0;
  const hasComments = visibleComments.length > 0;

  if (items.length === 0 && !hasMentions && !hasComments) {
    return (
      <ForYouEmptyState
        title="Nothing recommended yet"
        description="When teammates mention you or comment on your work, recommendations will show here."
        renderImage={() => <MentionSparkleArt />}
        // Send the user to Assigned where they always have work — gives them
        // a path out of the dead end (design-critique 2026-05-17, Cooper P0).
        primaryActionText={onSwitchTab ? 'See assigned work' : undefined}
        onPrimaryAction={onSwitchTab ? () => onSwitchTab('assigned') : undefined}
      />
    );
  }

  // Jira parity (screenshot 2026-04-24): when either feed has content we
  // render the two-card layout. No recency-list fallback beneath — that's
  // what "Assigned to me" is for. We only fall through to the recency list
  // when BOTH feeds are empty (so the tab never looks broken).
  if (hasMentions || hasComments) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {hasMentions && (
          <FeedSection
            label="Reply to mentions"
            intro="You were mentioned in a comment. See if you need to reply or action something."
            sectionType="mentions"
            currentUserName={currentUserName}
            rows={visibleMentions.map(m => ({
              commentId: m.commentId,
              phCommentId: m.phCommentId,
              headline: (
                <>
                  {/* Author name carries weight 600 — Jira screenshot shows it
                      visibly bolder than the "mentioned you on" connector. */}
                  <span style={{ color: token('color.text', '#292A2E'), fontWeight: 600 }}>{m.mentionerName}</span>
                  <span style={{ color: token('color.text.subtle', 'var(--cp-text-secondary, var(--cp-text-secondary, #44546F))'), fontWeight: 400 }}>{' '}mentioned you on{' '}</span>
                  <TicketLinkCard issueKey={m.issueKey} />
                </>
              ),
              authorName: m.mentionerName,
              authorAvatarUrl: m.mentionerAvatarUrl,
              projectName: m.projectName,
              issueKey: m.issueKey,
              issueId: m.issueId,
              issueType: m.issueType,
              issueSummary: m.issueSummary,
              issueStatus: m.issueStatus,
              projectKey: m.projectKey,
              commentBody: m.commentBody,
              commentCreatedAt: m.commentCreatedAt,
              // View thread shows only when there's actually a thread to
              // navigate to: the issue must exist in ph_issues (issueId is
              // a UUID, not a Jira-key fallback) AND the comment must be
              // synced (`phCommentId` non-null). Either check missing
              // means clicking View thread would land on an empty or
              // un-openable detail surface.
              showViewThread:
                UUID_RE_FY.test(m.issueId) && m.phCommentId !== null,
            }))}
            onOpen={resolveSelect}
            onDismiss={handleDismiss}
            onOpenDigest={visibleMentions.length >= 2 ? () => setDigestOpen('mentions') : undefined}
          />
        )}
        {hasComments && (
          <FeedSection
            label="Reply to comments"
            intro="Comments on work you care about. Follow up, reply, or acknowledge."
            sectionType="comments"
            currentUserName={currentUserName}
            rows={visibleComments.map(c => ({
              commentId: c.commentId,
              phCommentId: c.phCommentId,
              headline: (
                <>
                  <span style={{ color: token('color.text', '#292A2E'), fontWeight: 600 }}>{c.authorName}</span>
                  <span style={{ color: token('color.text.subtle', 'var(--cp-text-secondary, var(--cp-text-secondary, #44546F))'), fontWeight: 400 }}>{' '}commented on{' '}</span>
                  <TicketLinkCard issueKey={c.issueKey} />
                </>
              ),
              authorName: c.authorName,
              authorAvatarUrl: c.authorAvatarUrl,
              projectName: c.projectName,
              issueKey: c.issueKey,
              issueId: c.issueId,
              issueType: c.issueType,
              issueSummary: c.issueSummary,
              issueStatus: c.issueStatus,
              projectKey: c.projectKey,
              commentBody: c.commentBody,
              commentCreatedAt: c.commentCreatedAt,
              // Same gate as mention rows — hide when the detail surface
              // can't be opened (issue not in ph_issues) or there's no
              // comment to land on (phCommentId not synced yet).
              showViewThread:
                UUID_RE_FY.test(c.issueId) && c.phCommentId !== null,
            }))}
            onOpen={resolveSelect}
            onDismiss={handleDismiss}
            onOpenDigest={visibleComments.length >= 2 ? () => setDigestOpen('comments') : undefined}
          />
        )}
        <SummarizeDigestModal
          open={digestOpen !== null}
          onClose={() => setDigestOpen(null)}
          mentions={digestRows}
          onReply={(commentId) => {
            // Reply happens in the original feed card. Modal just closes and
            // scrolls user back to the card so the existing composer takes over.
            const el = document.querySelector(`[data-comment-id="${commentId}"]`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }}
          onDismiss={handleDismiss}
          onOpenTicket={(issueKey) => resolveSelect(issueKey)}
        />
      </div>
    );
  }

  // Fallback: recency-grouped list of assigned work (both feeds empty).
  const groups = groupByRecency(items, ['TODAY', 'YESTERDAY', 'LAST_WEEK', 'LAST_MONTH', 'EARLIER']);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {groups.map(({ bucket, items: groupItems }) => (
        <div key={bucket}>
          <GroupHeading bucket={bucket} />
          {groupItems.map(item => (
            <ForYouRow
              key={item.id}
              item={item}
              onSelect={onSelect}
              onToggleStar={onToggleStar}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── Section shell (reused by both "mentions" and "comments") ───────────────

interface FeedRow {
  commentId: string;
  /** ph_comments.id UUID, used by useCommentReactions FK. Null when no row exists yet. */
  phCommentId: string | null;
  headline: React.ReactNode;
  authorName: string;
  authorAvatarUrl?: string;
  projectName: string;
  issueKey: string;
  issueId: string;
  issueType: string;
  issueSummary: string;
  issueStatus?: string;
  projectKey: string;
  commentBody: string;
  commentCreatedAt: string;
  /** When true, renders a "View thread" button below the meta row.
   *  Jira parity: only "Reply to comments" rows carry this affordance. */
  showViewThread?: boolean;
}

function FeedSection({
  label,
  intro,
  sectionType = 'mentions',
  rows,
  onOpen,
  onDismiss,
  currentUserName,
  onOpenDigest,
}: {
  label: string;
  intro: string;
  sectionType?: 'mentions' | 'comments';
  rows: FeedRow[];
  onOpen: (issueKey: string, fallback?: { issueId: string; issueType: string; projectKey: string }) => void;
  onDismiss: (commentId: string) => void;
  currentUserName?: string;
  /** When provided, renders the rainbow "Ask Caty" digest CTA in the section header. */
  onOpenDigest?: () => void;
}) {
  return (
    <section
      aria-label={label}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        // Jira parity: `home-recommended-tab.ui.category.hover-container`
        // 0.555px hairline, 8px radius, 8px padding.
        border: `1px solid ${token('color.border', 'rgba(11, 18, 14, 0.14)')}`,
        borderRadius: 8,
        padding: 8,
        background: token('elevation.surface', '#FFFFFF'),
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Category tile — color variant per section type for visual differentiation.
              Mentions: purple (Jira parity DOM probe 2026-04-24).
              Comments: orange for visual distinction. */}
          {sectionType === 'mentions' ? <PurpleCategoryTile /> : <OrangeCategoryTile />}
          <h4
            style={{
              // CLAUDE.md 2026-05-12 — Jira section headers measure 16/20.
              // DOM probe 2026-05-29 confirmed fontWeight 653 (not 600).
              fontSize: 16,
              lineHeight: '20px',
              fontFamily: 'var(--ds-font-family-body, "Atlassian Sans"), ui-sans-serif, sans-serif',
              fontWeight: 653,
              color: token('color.text', '#292A2E'),
              margin: 0,
              letterSpacing: 'normal',
            }}
          >
            {label}
          </h4>
        </div>
        {/* Summarize digest CTA — icon-only ghost cat in header.
            Matches ReplyComposer pattern: minimal visual noise,
            solidifies on hover. Title reveals "Summarize {N} items". */}
        {onOpenDigest && (
          <button
            type="button"
            onClick={onOpenDigest}
            title={`Summarize ${rows.length} item${rows.length !== 1 ? 's' : ''}`}
            aria-label={`Summarize ${rows.length} item${rows.length !== 1 ? 's' : ''}`}
            style={{
              background: 'none',
              border: 'none',
              padding: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0.15,
              transition: 'opacity 150ms',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '0.15';
            }}
          >
            <CatyHead size={16} />
          </button>
        )}
      </div>
      <p
        style={{
          font: `400 14px/20px var(--ds-font-family-body, "Atlassian Sans"), ui-sans-serif, sans-serif`,
          color: token('color.text.subtle', 'var(--cp-text-secondary, var(--cp-text-secondary, #44546F))'),
          margin: 0,
          marginBlockEnd: 4,
        }}
      >
        {intro}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows.map(row => (
          <FeedCard
            key={row.commentId}
            row={row}
            currentUserName={currentUserName}
            onOpen={() => onOpen(row.issueKey, {
              issueId: row.issueId,
              issueType: row.issueType,
              projectKey: row.projectKey,
            })}
            onDismiss={() => onDismiss(row.commentId)}
          />
        ))}
      </div>
    </section>
  );
}

// ─── Purple category tile (matches Jira's home-recommended-tab icon) ────────
//
// DOM probe 2026-04-24 against digital-transformation.atlassian.net/jira/for-you
// returned:
//   container: 32×32 div, background rgb(201,124,244), border-radius 6,
//              display flex, align-items center, justify-content center.
//   inner SVG: 16×16, viewBox "0 0 16 16", fill="currentColor",
//              color rgb(41,42,46).
//
// The path below is the speech-bubble-with-2-lines glyph Jira ships inline
// (not an Atlaskit icon component). Rendering it inline keeps the tile
// stroke-free and avoids the discovery-purple icon being re-tinted by any
// cascade.
function PurpleCategoryTile() {
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 32,
        height: 32,
        borderRadius: 6,
        // Route through ADS tokens so the tile adapts to dark mode. The
        // earlier `rgb(201,124,244)` literal stayed bright purple in dark
        // mode, blowing out next to a dark surface. `color.background.accent.purple.subtler`
        // is the closest ADS token to Jira's home-recommended tile in light
        // mode and flips automatically in dark.
        background: token('color.background.accent.purple.subtle', '#C97CF4'),
        flexShrink: 0,
        color: token('color.icon.accent.purple', 'rgb(41, 42, 46)'),
      }}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M0 3.125A2.625 2.625 0 0 1 2.625.5h10.75A2.625 2.625 0 0 1 16 3.125v8.25A2.625 2.625 0 0 1 13.375 14H4.449l-3.327 1.901A.75.75 0 0 1 0 15.25zM2.625 2C2.004 2 1.5 2.504 1.5 3.125v10.833L4.05 12.5h9.325c.621 0 1.125-.504 1.125-1.125v-8.25C14.5 2.504 13.996 2 13.375 2zM12 6.5H4V5h8zm-3 3H4V8h5z" />
      </svg>
    </span>
  );
}

// Orange category tile for comments section (visual differentiation)
function OrangeCategoryTile() {
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 32,
        height: 32,
        borderRadius: 6,
        background: token('color.background.accent.orange.subtle', '#F5CD47'),
        flexShrink: 0,
        color: token('color.icon.accent.orange', 'rgb(41, 42, 46)'),
      }}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 0C3.58 0 0 3.13 0 7c0 1.85.79 3.54 2.15 4.81-.13 1.85-.57 3.69-1.15 4.84.88-.63 1.93-1.5 2.97-2.54 1.53.37 3.16.59 4.85.59 4.42 0 8-3.13 8-7s-3.58-7-8-7zm0 12c-1.34 0-2.59-.27-3.66-.77.5-1.06.97-2.33 1.19-3.54.31.05.64.08.97.08 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3v1c0 1.66-1.34 3-3 3-.58 0-1.13-.17-1.6-.45.5-1.12.94-2.35 1.12-3.65C1.5 5.08 1 6 1 7c0 3.86 3.13 7 7 7z"/>
      </svg>
    </span>
  );
}

// ─── The card (mention or comment) ──────────────────────────────────────────
//
//   ┌───────────────────────────────────────────────────────────────────┐
//   │ [32 avatar]  <Mentioner> mentioned you on <icon> <title>          │
//   │              <Project> · KEY · <relative time>                    │
//   │                                                                   │
//   │              <comment body with @-chips rendered inline>          │
//   │                                                                   │
//   │              ┌─ Leave a reply ──────── Suggest a reply ─┐          │
//   │              └───────────────────────────────────────────┘          │
//   └───────────────────────────────────────────────────────────────────┘

function FeedCard({
  row,
  currentUserName,
  onOpen,
  onDismiss,
}: {
  row: FeedRow;
  currentUserName?: string;
  onOpen: () => void;
  onDismiss: () => void;
}) {
  const [hover, setHover] = React.useState(false);
  const [dismissFocused, setDismissFocused] = React.useState(false);
  // Roster + viewer identity feed the canonical mention parser so the
  // comment body renders `@vikram indla`, `@Maria Garcia Lopez`, and the
  // current user's own name as a single canonical mention chip — same
  // contract as Description and Comments.
  const { user } = useAuth();
  const currentUserId = user?.id ?? null;
  const { groups: peopleGroups } = useChatPeople();
  const roster = React.useMemo<MentionRosterEntry[]>(() => {
    // Base roster — the Catalyst people directory (resource_inventory
    // with a profile_id). Plus the parent comment author, ALWAYS
    // included so multi-word Jira-only authors like "Imran Aslam"
    // longest-match as one pill even when they have no Catalyst
    // profile row. parseMentions dedupes by lowercased name so adding
    // the author here is a no-op when they already appear in the
    // directory.
    const base = peopleGroups.flatMap((g) =>
      g.people.map((p) => ({ name: p.name, userId: p.profileId })),
    );
    if (row.authorName) {
      base.push({ name: row.authorName, userId: null });
    }
    return base;
  }, [peopleGroups, row.authorName]);
  // Per-card "Ask Caty" summarize button REMOVED 2026-05-31 — duplicated the
  // panel-header digest CTA at the wrong granularity level. Users get one
  // canonical AI affordance per section ("Ask Caty — summarize N") that
  // opens the interactive triage modal. The summaryPhase state and
  // handleSummarize handler that powered the removed button are removed
  // alongside (see git blame for the original implementation).
  // Local avatar files only — Jira/Gravatar CDN URLs are banned (CLAUDE.md §19)
  // and fail to load due to CORS. Priority: local slug match → Atlaskit initials fallback.
  const avatarSrc = resolveAvatarUrl(row.authorName) || undefined;
  const relative = formatRelativeTimestamp(row.commentCreatedAt);
  // G-04 — Absolute timestamp shown as title attribute (Jira parity: "May 17, 2026 at 3:43 PM").
  const absolute = formatAbsoluteTimestamp(row.commentCreatedAt);

  return (
    <div
      data-fy-feedcard
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '8px 4px',
        borderRadius: 4,
        backgroundColor: hover
          ? token('elevation.surface.hovered', '#F0F1F2')
          : 'transparent',
        transition: 'background-color 150ms ease',
        position: 'relative',
      }}
    >
      {/* 32px circular avatar of the author — data attribute lets the
          reply tree's trunk locate this element so it can extend the
          curved-tree line up from the avatar bottom through the body. */}
      <Tooltip content={row.authorName}>
        <span data-fy-avatar style={{ flexShrink: 0, paddingBlockStart: 2 }}>
          <Avatar size="medium" name={row.authorName} src={avatarSrc} />
        </span>
      </Tooltip>

      {/* Per-card Ask Caty summarize pill REMOVED 2026-05-31.
          The panel-header "Ask Caty — summarize N" digest CTA covers the
          summarize affordance at the right granularity (whole-feed, not
          per-row noise). Dismiss (X) is now the only top-right action. */}

      {/* Dismiss (X) — G-01 Jira parity: always visible (opacity:1), top-right of every feed row.
          DOM probe 2026-05-29: Jira renders dismiss at opacity:1 at all times — no hover gate.
          24×24 subtle icon button that clears the row and persists dismissal to localStorage. */}
      <Tooltip content="Dismiss">
        <button
          type="button"
          aria-label="Dismiss"
          onClick={e => {
            e.stopPropagation();
            onDismiss();
          }}
          onFocus={() => setDismissFocused(true)}
          onBlur={() => setDismissFocused(false)}
          style={{
            position: 'absolute',
            top: 8,
            right: 4,
            width: 24,
            height: 24,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            background: 'transparent',
            borderRadius: 3,
            cursor: 'pointer',
            color: token('color.text.subtle', '#626F86'),
            opacity: 1,
            transition: 'background-color 120ms ease, box-shadow 120ms ease',
            padding: 0,
            outline: 'none',
            boxShadow: dismissFocused
              ? `0 0 0 2px ${token('color.border.focused', '#388BFF')}`
              : 'none',
          }}
          onMouseDown={e => e.preventDefault()}
        >
          <CrossIcon label="" size="small" primaryColor="currentColor" />
        </button>
      </Tooltip>

      {/* Text column takes the full remaining width.
          paddingInlineEnd: 56 = dismiss (24) + summarize (24) + 4px gap each */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2, paddingInlineEnd: 56 }}>
        {/* Clickable headline: opens the detail modal. */}
        <button
          type="button"
          onClick={onOpen}
          style={{
            all: 'unset',
            display: 'block',
            width: '100%',
            cursor: 'pointer',
            font: `400 14px/20px var(--ds-font-family-body, "Atlassian Sans"), ui-sans-serif, sans-serif`,
            color: token('color.text', '#292A2E'),
            textAlign: 'start',
          }}
        >
          {row.headline}
        </button>

        {/* Meta row: Project · KEY · timestamp — all 12/16/400 subtle
            (Jira parity: flat weight, color-only hierarchy). */}
        <div
          style={{
            font: `400 12px/16px var(--ds-font-family-body, "Atlassian Sans"), ui-sans-serif, sans-serif`,
            color: token('color.text.subtle', 'var(--cp-text-secondary, var(--cp-text-secondary, #44546F))'),
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            flexWrap: 'wrap',
            letterSpacing: 0,
          }}
        >
          {row.projectName ? <span>{row.projectName}</span> : null}
          {row.projectName ? <span aria-hidden="true">·</span> : null}
          <span>{row.issueKey}</span>
          <span aria-hidden="true">·</span>
          {/* G-04: full relative text ("4 days ago") + absolute tooltip ("May 17, 2026 at 3:43 PM"). */}
          <span title={absolute}>{relative}</span>
        </div>

        {/* "View thread" link moved into ForYouCardFooter (above the
            reactions toolbar, Phase 1 dashboard layout). */}

        {/* Comment body — left accent bar separates "what was said" from card chrome.
            borderLeft uses color.link token (same blue as @mention chips). */}
        <div
          style={{
            borderLeft: `3px solid ${token('color.link', '#0052CC')}`,
            paddingLeft: 8,
            marginBlockStart: 4,
          }}
        >
          <div
            style={{
              font: `400 14px/20px var(--ds-font-family-body, "Atlassian Sans"), ui-sans-serif, sans-serif`,
              color: token('color.text.subtle', 'var(--cp-text-secondary, #44546F)'),
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {renderCommentContent(row.commentBody, { roster, currentUserId })}
          </div>
        </div>

        {/* Footer zone — Phase 1 dashboard layout: NO top divider.
            The "View thread" link inside ForYouCardFooter sits in the
            space the divider previously occupied. */}
        <div style={{
          marginBlockStart: 8,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}>
          <ForYouCardFooter row={row} currentUserName={currentUserName} />
        </div>
      </div>
    </div>
  );
}

// ─── Reply composer (wired) ─────────────────────────────────────────────────
//
// Wires the "Leave a reply" textbox to the real Supabase `comments` table
// via useWorkItemComments. entity_type is 'ph_issue' because mentions/
// comments in the Recommended feed are always Jira-synced issues — the
// same entity type used across Catalyst's canonical comment sidecar.
//
// Layout matches Jira's DOM (probe 2026-04-24):
//   outer:  flex row, gap 4, align-items flex-start
//   avatar: 32×32 round (Atlaskit Avatar, size="medium")
//   wrap:   flex:1, border 0.556px solid rgba(11,18,14,0.14), radius 6
//   inner:  textarea + Reply button (inline-end)
// The "Suggest a reply" button sits BELOW the bordered wrapper, not inside.
type SuggestionPhase = 'idle' | 'loading' | 'done' | 'error';

function ReplyComposer({
  issueId,
  currentUserName,
  commentBody,
  issueSummary,
  issueType,
  commenterName,
}: {
  issueId: string;
  currentUserName?: string;
  commentBody: string;
  issueSummary: string;
  issueType: string;
  /** Name of the person whose comment we are replying to — shown in "Replying to …" header (Jira parity). */
  commenterName?: string;
}) {
  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);
  const [suggestionPhase, setSuggestionPhase] = useState<SuggestionPhase>('idle');
  const abortRef = useRef<AbortController | null>(null);

  // comments.entity_id is a UUID column — a Jira-key fallback like "MWR-947"
  // would cause a Postgres parse error. Mirror ReactionStrip's guard so we
  // disable the Reply button (and skip the insert) when the id isn't a UUID.
  const isIssueUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(issueId);

  const { createCommentAsync, isCreating } = useWorkItemComments('ph_issue', issueId);

  const handleSuggestReply = async () => {
    if (suggestionPhase === 'loading') return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setSuggestionPhase('loading');
    setValue('');
    try {
      const res = await fetchFunction('ai-improve-comment', {
        method: 'POST',
        body: JSON.stringify({
          improve_type: 'suggest_reply',
          parent_comment: commentBody,
          issue_summary: issueSummary,
          issue_type: issueType,
        }),
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        let userMsg = 'Could not generate a suggestion. Try again.';
        try {
          const errJson = await res.clone().json() as { error?: string; message?: string };
          if (errJson.error === 'rate_limited') userMsg = 'Rate limit reached — please wait a moment and try again.';
          else if (errJson.message) userMsg = errJson.message;
        } catch { /* non-JSON body — keep generic message */ }
        setSuggestionPhase('error');
        toast.error(userMsg);
        return;
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buffer = '';
      let accum = '';
      while (true) {
        const { value: chunk, done } = await reader.read();
        if (done) break;
        buffer += dec.decode(chunk, { stream: true });
        let nl;
        while ((nl = buffer.indexOf('\n')) !== -1) {
          const line = buffer.slice(0, nl).trim();
          buffer = buffer.slice(nl + 1);
          if (!line) continue;
          try {
            const ev = JSON.parse(line);
            if (ev.type === 'text' && typeof ev.delta === 'string') {
              accum += ev.delta;
              setValue(accum);
            } else if (ev.type === 'done') {
              setSuggestionPhase('done');
            } else if (ev.type === 'error') {
              setSuggestionPhase('error');
              toast.error('AI suggestion failed. Try again.');
            }
          } catch { /* skip malformed line */ }
        }
      }
      if (accum.length > 0) {
        setSuggestionPhase('done');
        setFocused(true);
      }
    } catch (err) {
      if ((err as DOMException)?.name !== 'AbortError') {
        setSuggestionPhase('error');
        toast.error('AI suggestion failed. Try again.');
      }
    }
  };

  const userAvatarSrc =
    currentUserName ? resolveAvatarUrl(currentUserName) || undefined : undefined;
  const userDisplayName = currentUserName || 'You';

  // isIssueUuid guards against Postgres UUID parse errors when issueId is a
  // Jira-key fallback. useWorkItemComments.onError already shows a toast on
  // failure; handleSubmit only logs so there's no double-toast.
  const canSubmit = value.trim().length > 0 && !isCreating && isIssueUuid;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    const draft = value.trim();
    try {
      await createCommentAsync(draft);
      setValue('');
      setFocused(false);
    } catch (err) {
      // Keep draft + focus so the user can retry.
      // useWorkItemComments.onError already shows "Failed to add comment" toast;
      // we only log here to avoid a duplicate toast.
      console.warn('[RecommendedPanel] reply submit failed', err);
    }
  };

  // Derived states
  const isAiActive = suggestionPhase === 'loading' || suggestionPhase === 'done';

  // Gradient ring colours — ADS tokens so they flip with the theme.
  const gradientColors = [
    token('color.background.discovery.bold', '#8270DB'),
    token('color.background.information.bold', '#1D7AFC'),
    token('color.background.warning.bold', '#E2B203'),
    token('color.background.discovery.bold', '#8270DB'),
  ].join(', ');

  return (
    <div style={{ marginBlockStart: 8 }}>

      {/* ── "Replying to [Name]" header (Jira parity) ──────────────────────
          Appears in loading + done states only. Located above the composer
          row, aligned with the right of the user avatar (marginInlineStart=36).
          Font: 12/16/400 color.text.subtle per Jira DOM probe 2026-05-28. */}
      {isAiActive && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginBlockEnd: 4,
            marginInlineStart: 36,
          }}
        >
          <span
            style={{
              font: `400 12px/16px var(--ds-font-family-body, "Atlassian Sans"), ui-sans-serif, sans-serif`,
              color: token('color.text.subtle', '#505258'),
            }}
          >
            Replying to {commenterName || 'comment'}
          </span>
        </div>
      )}

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 4,
        }}
      >
        {/* Viewer avatar — 32px round. */}
        <Tooltip content={userDisplayName}>
          <span style={{ flexShrink: 0, paddingBlockStart: 2 }}>
            <Avatar size="medium" name={userDisplayName} src={userAvatarSrc} />
          </span>
        </Tooltip>

        {/* ── LOADING state — animated rotating gradient border ────────────
            Outer div clips the oversized rotating child.
            Technique: child is inset:-100% + rotates via .catalyst-ai-gradient-spinner.
            Parent overflow:hidden + border-radius clips it to the pill shape.
            Inner div is the white surface with radius 6 (outer 8 - padding 2). */}
        {suggestionPhase === 'loading' && (
          /* Animated gradient ring — outer div clips; child rotates continuously.
             Jira parity: the coloured border spins while AI is generating. */
          <div
            style={{
              position: 'relative',
              flex: 1,
              minWidth: 0,
              borderRadius: 8,
              overflow: 'hidden',
            }}
          >
            {/* Rotating gradient — oversized so corners are always covered */}
            <div
              className="catalyst-ai-gradient-spinner"
              style={{
                position: 'absolute',
                inset: '-100%',
                background: `conic-gradient(${gradientColors})`,
              }}
            />
            {/* White inner surface — sits above the spinner via z-index */}
            <div
              style={{
                position: 'relative',
                // DOM-probed Jira 2026-05-28: gradient ring gap = 4px (CLAUDE.md lesson).
                // 2→4 also satisfies the 4px spacing grid.
                margin: 4,
                background: token('elevation.surface', '#FFFFFF'),
                borderRadius: 6,
                zIndex: 1,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <TextArea
                appearance="none"
                value={value}
                onChange={e => setValue((e.target as HTMLTextAreaElement).value)}
                placeholder="Leave a reply"
                minimumRows={3}
                maxHeight="240px"
                resize="vertical"
                isDisabled
              />
              {/* Loading action row: animated dots + Cancel */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  alignItems: 'center',
                  gap: 8,
                  padding: '4px 8px 8px',
                  borderBlockStart: `1px solid ${token('color.border', '#DFE1E6')}`,
                }}
              >
                {/* Animated ellipsis + "Generating" label — Jira parity */}
                <span
                  style={{
                    flex: 1,
                    font: `400 14px/20px var(--ds-font-family-body, "Atlassian Sans"), ui-sans-serif, sans-serif`,
                    color: token('color.text.subtlest', '#6B778C'),
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <span className="catalyst-ai-dot">·</span>
                  <span className="catalyst-ai-dot">·</span>
                  <span className="catalyst-ai-dot">·</span>
                  <span style={{ marginInlineStart: 4 }}>Generating</span>
                </span>
                <button
                  type="button"
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => {
                    abortRef.current?.abort();
                    setSuggestionPhase('idle');
                    setValue('');
                    setFocused(false);
                  }}
                  style={{
                    all: 'unset',
                    cursor: 'pointer',
                    padding: '4px 8px',
                    borderRadius: 3,
                    font: `500 14px/20px var(--ds-font-family-body, "Atlassian Sans"), ui-sans-serif, sans-serif`,
                    color: token('color.text.subtle', '#505258'),
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── IDLE + DONE state — standard bordered composer ───────────────
            In the DONE state, labels change: Cancel→Discard, Reply→Insert.
            The BETA footer only appears in the DONE state. */}
        {(suggestionPhase === 'idle' || suggestionPhase === 'done' || suggestionPhase === 'error') && (
          <div
            style={{
              flex: 1,
              minWidth: 0,
              border: `1px solid ${
                focused
                  ? token('color.border.focused', '#388BFF')
                  : token('color.border', 'rgba(11, 18, 14, 0.14)')
              }`,
              borderRadius: 6,
              background: token('elevation.surface', '#FFFFFF'),
              transition: 'border-color 150ms ease',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <TextArea
              appearance="none"
              value={value}
              onChange={e => setValue((e.target as HTMLTextAreaElement).value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onKeyDown={e => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder="Leave a reply"
              minimumRows={focused || value.length > 0 ? 3 : 1}
              maxHeight="240px"
              resize="vertical"
            />

            {/* Button row — visible when focused or has text */}
            {(focused || value.length > 0) && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 8,
                  padding: '4px 8px 8px 8px',
                  borderBlockStart: `1px solid ${token('color.border', '#DFE1E6')}`,
                }}
              >
                {/* Cancel (idle) / Discard (done) */}
                <button
                  type="button"
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => {
                    setValue('');
                    setFocused(false);
                    setSuggestionPhase('idle');
                  }}
                  style={{
                    all: 'unset',
                    cursor: 'pointer',
                    padding: '4px 8px',
                    borderRadius: 3,
                    font: `500 14px/20px var(--ds-font-family-body, "Atlassian Sans"), ui-sans-serif, sans-serif`,
                    color: token('color.text.subtle', '#505258'),
                  }}
                >
                  {suggestionPhase === 'done' ? 'Discard' : 'Cancel'}
                </button>

                {/* Reply (idle) / Insert (done) */}
                {suggestionPhase === 'done' ? (
                  // "Insert" — collapses the AI result view; user reviews text and hits Reply
                  <button
                    type="button"
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => setSuggestionPhase('idle')}
                    style={{
                      all: 'unset',
                      cursor: 'pointer',
                      padding: '4px 12px',
                      borderRadius: 3,
                      font: `500 14px/20px var(--ds-font-family-body, "Atlassian Sans"), ui-sans-serif, sans-serif`,
                      color: token('color.text.inverse', '#FFFFFF'),
                      background: token('color.background.brand.bold', '#0C66E4'),
                    }}
                  >
                    Insert
                  </button>
                ) : (
                  <button
                    type="button"
                    onMouseDown={e => e.preventDefault()}
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                    style={{
                      all: 'unset',
                      cursor: canSubmit ? 'pointer' : 'not-allowed',
                      padding: '4px 12px',
                      borderRadius: 3,
                      font: `500 14px/20px var(--ds-font-family-body, "Atlassian Sans"), ui-sans-serif, sans-serif`,
                      color: canSubmit
                        ? token('color.text.inverse', '#FFFFFF')
                        : token('color.text.disabled', '#B3B9C4'),
                      background: canSubmit
                        ? token('color.background.brand.bold', '#0C66E4')
                        : token('color.background.disabled', '#F1F2F4'),
                    }}
                  >
                    {isCreating ? 'Posting…' : 'Reply'}
                  </button>
                )}
              </div>
            )}

            {/* ── BETA disclaimer footer (done state only) ─────────────────
                Jira parity: border-top separator + flex row with:
                  Left:  [BETA] pill · ℹ︎ icon · "Uses AI. Verify results."
                  Right: Caty logo + "Caty" text (replaces Rovo branding)
                Font/color/padding from Jira DOM probe 2026-05-28:
                  footer border-top: 0.556px solid rgba(11,18,14,0.14)
                  footer padding:    4px 12px  ·  height: ~40px
                  text color:        rgb(41,42,46)  14px/400 */}
            {suggestionPhase === 'done' && (
              <div
                style={{
                  borderBlockStart: `1px solid ${token('color.border', 'rgba(11,18,14,0.14)')}`,
                  padding: '4px 12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  minHeight: 32,
                }}
              >
                {/* Left: BETA pill + info icon + disclaimer */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span
                    style={{
                      font: `500 11px/14px var(--ds-font-family-body, "Atlassian Sans"), ui-sans-serif, sans-serif`,
                      color: token('color.text', '#292A2E'),
                      border: `1px solid ${token('color.border', '#DFE1E6')}`,
                      borderRadius: 2,
                      padding: '0 4px',
                      letterSpacing: '0.04em',
                    }}
                  >
                    BETA
                  </span>
                  {/* ℹ︎ info icon — inline SVG, no external dep */}
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <circle cx="8" cy="8" r="7.5" stroke={token('color.text.subtlest', '#6B778C')} />
                    <path d="M8 7v5" stroke={token('color.text.subtlest', '#6B778C')} strokeWidth="1.5" strokeLinecap="round" />
                    <circle cx="8" cy="5" r="0.75" fill={token('color.text.subtlest', '#6B778C')} />
                  </svg>
                  <span
                    style={{
                      font: `400 13px/20px var(--ds-font-family-body, "Atlassian Sans"), ui-sans-serif, sans-serif`,
                      color: token('color.text.subtle', '#505258'),
                    }}
                  >
                    Uses AI. Verify results.
                  </span>
                </div>

                {/* Right: Caty branding (replaces Rovo per mandate) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span
                    style={{
                      font: `500 13px/20px var(--ds-font-family-body, "Atlassian Sans"), ui-sans-serif, sans-serif`,
                      color: token('color.text.subtle', '#505258'),
                    }}
                  >
                    Caty
                  </span>
                  {/* Caty logo — dark background + white C mark.
                      Source: /public/caty.svg (512×512 dark rounded rect + white C path). */}
                  <img
                    src="/caty.svg"
                    alt="Caty"
                    width="18"
                    height="18"
                    style={{ borderRadius: 4, verticalAlign: 'middle', flexShrink: 0 }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── "Suggest a reply" tile — HIDDEN in loading/done states ──────────
          Jira parity: tile disappears once the AI flow is active.
          Only shown in idle (and error) states.
          2026-05-31: pass phase down so the tile can render an INLINE error
          message when Gemini is rate-limited (was: silent toast that users
          missed → "nothing happens" UX bug). */}
      {(suggestionPhase === 'idle' || suggestionPhase === 'error' || suggestionPhase === 'loading') && (
        <SuggestReplyTile phase={suggestionPhase as 'idle' | 'error' | 'loading'} onSuggest={handleSuggestReply} />
      )}
    </div>
  );
}

// Ask Caty hover tile — Jira parity measurements (DOM probe 2026-05-28):
//   Button padding snapped to grid: 4px 12px (Jira raw was off-grid, nearest = 4px)
//   Button gap: 8px (nearest on-grid to Jira's 6px raw)
//   Tile padding: 8px (on-grid, nearest to Jira's raw 6px)
//   On hover tile bg: color.background.neutral.subtle.hovered
//   2026-05-31: Renamed from "Suggest a reply" → "Ask Caty" and wrapped in
//   the static rainbow border (CLAUDE.md ENTERPRISE UI GUARDRAIL carve-out).
const ASK_CATY_RAINBOW = `conic-gradient(
  from 0deg,
  #FF3CAC 0deg,
  #784BA0 60deg,
  #2B86C5 120deg,
  #00C9FF 180deg,
  #92FE9D 240deg,
  #FFD700 300deg,
  #FF3CAC 360deg
)`;

function SuggestReplyTile({ phase, onSuggest }: { phase: 'idle' | 'error' | 'loading'; onSuggest: () => void }) {
  // Hover state drives `filter: brightness(1.08)` on the rainbow wrapper
  // — the ADS-canonical hover affordance allowed by the CLAUDE.md
  // ENTERPRISE UI GUARDRAIL carve-out (2026-05-31). No motion, no
  // animation, no rotation — the gradient stays static.
  const [hover, setHover] = useState(false);
  return (
    <div
      style={{
        marginBlockStart: 8,
        marginInlineStart: 34, /* 32 avatar + 2 nudge */
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 6,
        alignSelf: 'flex-start',
      }}
    >
      {phase === 'error' && (
        // Inline error state — visible explanation when Gemini is rate-limited
        // or otherwise unavailable. Replaces reliance on the transient toast.
        // Click the button below to retry.
        <div
          role="status"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            font: `500 12px/16px var(--ds-font-family-body, "Atlassian Sans"), ui-sans-serif, sans-serif`,
            color: token('color.text.warning-inverse', '#7F5F01'),
            background: token('color.background.warning', '#FFF7D6'),
            border: `1px solid ${token('color.border.warning', '#B38600')}`,
            borderRadius: 4,
            padding: '4px 8px',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM7.25 4.75a.75.75 0 0 1 1.5 0v3.5a.75.75 0 0 1-1.5 0v-3.5zM8 11.5a.9.9 0 1 1 0-1.8.9.9 0 0 1 0 1.8z" />
          </svg>
          Caty is busy — please wait a moment and click again.
        </div>
      )}
      {/* Static rainbow border wrapper — AI affordance signifier.
          See CLAUDE.md ENTERPRISE UI GUARDRAIL carve-out (2026-05-31).
          Hover affordance: `filter: brightness(1.08)` only — no motion. */}
      <CatyButton
        label="Suggest?"
        onClick={onSuggest}
        loading={phase === 'loading'}
        disabled={phase === 'loading'}
      />
    </div>
  );
}

// ─── Emoji picker data ───────────────────────────────────────────────────────

const EMOJI_CATALOG: { key: string; label: string; emojis: { key: string; char: string }[] }[] = [
  {
    key: 'smileys', label: 'Smileys',
    emojis: [
      { key: 'grinning', char: '😀' }, { key: 'joy', char: '😂' },
      { key: 'rofl', char: '🤣' }, { key: 'slightly_smiling', char: '🙂' },
      { key: 'smile', char: '😊' }, { key: 'heart_eyes', char: '😍' },
      { key: 'kissing_heart', char: '😘' }, { key: 'sunglasses', char: '😎' },
      { key: 'thinking', char: '🤔' }, { key: 'hugging', char: '🤗' },
      { key: 'star_struck', char: '🤩' }, { key: 'partying', char: '🥳' },
      { key: 'cry', char: '😢' }, { key: 'sob', char: '😭' },
      { key: 'angry', char: '😡' }, { key: 'sleeping', char: '😴' },
      { key: 'smirk', char: '😏' }, { key: 'grimacing', char: '😬' },
    ],
  },
  {
    key: 'gestures', label: 'Gestures',
    emojis: [
      { key: 'wave', char: '👋' }, { key: 'clap', char: '👏' },
      { key: 'raised_hands', char: '🙌' }, { key: 'thumb', char: '👍' },
      { key: 'thumbsdown', char: '👎' }, { key: 'ok', char: '👌' },
      { key: 'v', char: '✌️' }, { key: 'crossed_fingers', char: '🤞' },
      { key: 'muscle', char: '💪' }, { key: 'pray', char: '🙏' },
      { key: 'point_right', char: '👉' }, { key: 'point_left', char: '👈' },
    ],
  },
  {
    key: 'nature', label: 'Nature',
    emojis: [
      { key: 'fire', char: '🔥' }, { key: 'sparkles', char: '✨' },
      { key: 'sun', char: '☀️' }, { key: 'moon', char: '🌙' },
      { key: 'star', char: '⭐' }, { key: 'rainbow', char: '🌈' },
      { key: 'zap', char: '⚡' }, { key: 'snowflake', char: '❄️' },
      { key: 'ocean', char: '🌊' }, { key: 'leaves', char: '🍃' },
      { key: 'clover', char: '🍀' }, { key: 'rose', char: '🌹' },
    ],
  },
  {
    key: 'activities', label: 'Activities',
    emojis: [
      { key: 'trophy', char: '🏆' }, { key: 'medal', char: '🥇' },
      { key: 'tada', char: '🎉' }, { key: 'confetti', char: '🎊' },
      { key: 'gift', char: '🎁' }, { key: 'rocket', char: '🚀' },
      { key: 'dart', char: '🎯' }, { key: 'boom', char: '💥' },
      { key: 'musical_note', char: '🎵' }, { key: 'headphones', char: '🎧' },
      { key: 'video_game', char: '🎮' }, { key: 'art', char: '🎨' },
    ],
  },
  {
    key: 'symbols', label: 'Symbols',
    emojis: [
      { key: 'heart', char: '❤️' }, { key: 'orange_heart', char: '🧡' },
      { key: 'yellow_heart', char: '💛' }, { key: 'green_heart', char: '💚' },
      { key: 'blue_heart', char: '💙' }, { key: 'purple_heart', char: '💜' },
      { key: 'hundred', char: '💯' }, { key: 'check', char: '✅' },
      { key: 'x', char: '❌' }, { key: 'exclamation', char: '❗' },
      { key: 'question', char: '❓' }, { key: 'eyes', char: '👀' },
    ],
  },
];

const ALL_EMOJIS = EMOJI_CATALOG.flatMap(c => c.emojis);

// ─── Emoji picker popover ────────────────────────────────────────────────────
//
// Self-rolled portal popup (createPortal to document.body, position:fixed).
// @atlaskit/popup v4.16 has an empty-portal bug on overflow:hidden parents
// (CLAUDE.md 2026-05-08) so we use the same pattern as AllProjectsTable.
// Category tab bar + search + 9-column emoji grid, matching Jira DOM probe.

function EmojiPickerPopover({
  anchorRef,
  onSelect,
  onClose,
}: {
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  onSelect: (key: string) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('smileys');
  const portalRef = useRef<HTMLDivElement>(null);

  // Position the picker relative to the trigger button.
  // Strategy: always prefer opening BELOW the trigger so the picker is visually
  // adjacent to the button that opened it. Only fall back to "above" when there
  // is genuinely insufficient space below. Never clip through the tab-nav bar.
  const [pos, setPos] = useState<{ top: number; left: number; maxHeight: number } | null>(null);
  useEffect(() => {
    if (!anchorRef.current) return;
    const r = anchorRef.current.getBoundingClientRect();
    const PICKER_W = 320;
    const PICKER_H_IDEAL = 340; // cap; grid is already overflowY:auto
    const PICKER_H_MIN = 160;   // below this the picker is too cramped to be useful

    const navEl = document.querySelector('[role="tablist"]');
    const navFloor = navEl ? navEl.getBoundingClientRect().bottom + 8 : 80;

    const spaceBelow = window.innerHeight - r.bottom - 8;
    const spaceAbove = r.top - navFloor - 4;

    let top: number;
    let maxHeight: number;

    if (spaceBelow >= PICKER_H_MIN) {
      // Open below — always prefer; keeps picker anchored to the trigger
      top = r.bottom + 4;
      maxHeight = Math.min(PICKER_H_IDEAL, spaceBelow);
    } else if (spaceAbove >= PICKER_H_MIN) {
      // Above mode — only when below has too little room
      maxHeight = Math.min(PICKER_H_IDEAL, spaceAbove);
      top = r.top - maxHeight - 4;
    } else {
      // Last resort: anchor below nav, fill remaining viewport space
      top = navFloor;
      maxHeight = window.innerHeight - navFloor - 16;
    }

    const left = Math.min(r.left, window.innerWidth - PICKER_W - 8);
    setPos({ top, left, maxHeight });
  }, [anchorRef]);

  // Close on Escape (capture phase beats parent modal's bubble handler).
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); }
    };
    document.addEventListener('keydown', handler, true);
    return () => document.removeEventListener('keydown', handler, true);
  }, [onClose]);

  // Close on mousedown outside.
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const t = e.target as Element;
      if (
        portalRef.current && !portalRef.current.contains(t) &&
        !(t as Element).closest?.('[data-emoji-portal="true"]')
      ) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const filtered = search.trim()
    ? ALL_EMOJIS.filter(e => e.key.includes(search.toLowerCase().replace(/\s+/g, '_')))
    : null;
  const visibleEmojis = filtered ??
    (EMOJI_CATALOG.find(c => c.key === activeCategory)?.emojis ?? EMOJI_CATALOG[0].emojis);

  if (!pos) return null;

  return createPortal(
    <div
      ref={portalRef}
      data-emoji-portal="true"
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        zIndex: 10000,
        width: 320,
        maxHeight: pos.maxHeight,
        background: token('elevation.surface.overlay', '#FFFFFF'),
        border: `1px solid ${token('color.border', '#DFE1E6')}`,
        borderRadius: 8,
        boxShadow: 'var(--ds-shadow-overlay, 0 8px 12px rgba(9,30,66,0.15), 0 0 1px rgba(9,30,66,0.31))',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Category tab bar */}
      <div
        style={{
          display: 'flex',
          borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`,
          padding: '4px 4px 0',
          gap: 0,
          flexShrink: 0,
        }}
      >
        {EMOJI_CATALOG.map(cat => (
          <button
            key={cat.key}
            type="button"
            title={cat.label}
            onClick={() => { setActiveCategory(cat.key); setSearch(''); }}
            style={{
              all: 'unset',
              flex: 1,
              display: 'flex',
              justifyContent: 'center',
              padding: '4px 0 8px',
              fontSize: 16,
              cursor: 'pointer',
              borderBottom: `2px solid ${activeCategory === cat.key && !search
                ? token('color.border.brand', '#0C66E4')
                : 'transparent'}`,
              transition: 'border-color 120ms ease',
            }}
          >
            {cat.emojis[0].char}
          </button>
        ))}
      </div>

      {/* Search row */}
      <div style={{ padding: '8px 8px', flexShrink: 0, display: 'flex', gap: 4 }}>
        <input
          autoFocus
          type="text"
          placeholder="Search..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: 1,
            border: `1px solid ${token('color.border.input', '#8590A2')}`,
            borderRadius: 4,
            padding: '4px 8px',
            fontSize: 13,
            outline: 'none',
            fontFamily: 'inherit',
            color: token('color.text', '#172B4D'),
            background: token('elevation.surface', '#FFFFFF'),
          }}
          onFocus={e => (e.target.style.borderColor = token('color.border.focused', '#388BFF'))}
          onBlur={e => (e.target.style.borderColor = token('color.border.input', '#8590A2'))}
        />
      </div>

      {/* Category header */}
      {!search && (
        <div
          style={{
            padding: '4px 8px',
            fontSize: 11,
            fontWeight: 700,
            color: token('color.text.subtlest', '#6B778C'),
            letterSpacing: '0.5px',
            flexShrink: 0,
          }}
        >
          {EMOJI_CATALOG.find(c => c.key === activeCategory)?.label}
        </div>
      )}

      {/* Emoji grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(9, 1fr)',
          padding: '0 4px 4px',
          overflowY: 'auto',
          flex: 1,
        }}
      >
        {visibleEmojis.length === 0 ? (
          <div
            style={{
              gridColumn: '1 / -1',
              padding: '16px 8px',
              textAlign: 'center',
              fontSize: 13,
              color: token('color.text.subtlest', '#6B778C'),
            }}
          >
            No results
          </div>
        ) : visibleEmojis.map(em => (
          <button
            key={em.key}
            type="button"
            title={em.key.replace(/_/g, ' ')}
            onClick={() => { onSelect(em.key); onClose(); }}
            style={{
              all: 'unset',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              fontSize: 20,
              borderRadius: 4,
              cursor: 'pointer',
              transition: 'background 100ms ease',
              fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif',
            }}
            onMouseEnter={e => ((e.target as HTMLElement).style.background = token('color.background.neutral.hovered', 'rgba(9,30,66,0.06)'))}
            onMouseLeave={e => ((e.target as HTMLElement).style.background = 'transparent')}
          >
            {em.char}
          </button>
        ))}
      </div>
    </div>,
    document.body
  );
}

// ─── Reaction strip ─────────────────────────────────────────────────────────
//
// Jira renders a toolbar of emoji chips (data-testid="render-reactions")
// between the comment body and the reply composer. Each chip:
//   37×24, border 0.556px solid rgba(11,18,14,0.14), radius 4, padding 0,
//   background transparent, font-size 13.3px. Jira uses the pf-emoji-service
//   CDN to render PNG glyphs; for now we render Unicode emoji inline —
//   visually similar at 13–16px and works without external image hosting.
//
// Jira's For You cards always render this fixed five-chip starter strip
// (🔥 ❤️ 👏 👍 😀) even before any reactions exist, so the affordance is
// always reachable. The key is the emoji shortcode we store in
// `ph_comment_reactions.emoji`; the char is what we render.
const DEFAULT_REACTIONS: { key: string; char: string; label: string }[] = [
  { key: 'fire',   char: '🔥',  label: 'Fire' },
  { key: 'heart',  char: '❤️', label: 'Love' },
  { key: 'clap',   char: '👏', label: 'Clap' },
  { key: 'thumb',  char: '👍', label: 'Thumbs up' },
  { key: 'smile',  char: '😀', label: 'Smile' },
];

// Which char to render for a given emoji key — covers every emoji in the
// full EMOJI_CATALOG (66+ entries) so picker selections always render as
// the actual unicode character, not the raw shortcode key.
// DEFAULT_REACTIONS entries are spread last so they can override catalog
// entries for the five starter emojis (no-op in practice, but defensive).
const EMOJI_CHAR: Record<string, string> = Object.fromEntries([
  ...ALL_EMOJIS.map(e => [e.key, e.char]),
  ...DEFAULT_REACTIONS.map(r => [r.key, r.char]),
]);

// ─── ForYouReplyTree — nested replies under a For You card ───────────
//
// Fetches every reply (descendant) of a top-level For You comment from
// ph_comments (filtered to the parent's work_item, descendants of the
// parent's resolved id) and renders the tree using our shared
// CommentNode — continuous vertical trunk with a single quadratic
// Bezier branch to each child's avatar.
//
// The trunk for the IMMEDIATE children of the For You comment is drawn
// here (since the For You card uses its own avatar layout, not our
// standard <Comment>). Nested grand-children get their own trunks
// drawn by their parent CommentNodes — Jira parity.

interface ReplyRow {
  id: string;
  body: string;
  author_id: string | null;
  parent_comment_id: string | null;
  created_at: string;
  updated_at: string | null;
}

function ForYouReplyTree({
  parentResolvedId,
  issueUuid,
  ensurePhComment,
  onSubmitReplyTo,
}: {
  parentResolvedId: string | null;
  issueUuid: string | null;
  ensurePhComment: () => Promise<string | null>;
  onSubmitReplyTo: (parentId: string, content: string) => Promise<void>;
}) {
  const { user } = useAuth();
  const mentionableUsers = useMentionableUsersFY();
  const queryClient = useQueryClient();
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  // Per-reply Ask Caty state. `suggestPhaseByReply` tracks which
  // reply's tile is busy / errored; `suggestDefaultByReply` holds
  // the AI text we want the inline composer to mount with so the
  // user can edit before posting.
  const [suggestPhaseByReply, setSuggestPhaseByReply] =
    useState<Record<string, 'idle' | 'loading' | 'done' | 'error'>>({});
  const [suggestDefaultByReply, setSuggestDefaultByReply] =
    useState<Record<string, string>>({});
  const [composerKeyByReply, setComposerKeyByReply] =
    useState<Record<string, number>>({});

  const handleSuggestReplyTo = async (replyId: string, parentBody: string) => {
    setSuggestPhaseByReply((p) => ({ ...p, [replyId]: 'loading' }));
    try {
      const res = await fetchFunction('ai-improve-comment', {
        method: 'POST',
        body: JSON.stringify({
          improve_type: 'suggest_reply',
          parent_comment: parentBody,
          issue_summary: '',
          issue_type: '',
        }),
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok || !res.body) {
        // Inline error — per-reply suggest phase drives the
        // SuggestReplyTile error state on the nested reply's tile.
        setSuggestPhaseByReply((p) => ({ ...p, [replyId]: 'error' }));
        return;
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buffer = '';
      let accum = '';
      while (true) {
        const { value: chunk, done } = await reader.read();
        if (done) break;
        buffer += dec.decode(chunk, { stream: true });
        let nl;
        while ((nl = buffer.indexOf('\n')) !== -1) {
          const line = buffer.slice(0, nl).trim();
          buffer = buffer.slice(nl + 1);
          if (!line) continue;
          try {
            const ev = JSON.parse(line);
            if (ev.type === 'text' && typeof ev.delta === 'string') accum += ev.delta;
          } catch { /* skip */ }
        }
      }
      if (accum.length > 0) {
        setSuggestDefaultByReply((d) => ({ ...d, [replyId]: accum }));
        setComposerKeyByReply((k) => ({ ...k, [replyId]: (k[replyId] ?? 0) + 1 }));
        setReplyingToId(replyId);
        setSuggestPhaseByReply((p) => ({ ...p, [replyId]: 'done' }));
      } else {
        setSuggestPhaseByReply((p) => ({ ...p, [replyId]: 'error' }));
      }
    } catch {
      setSuggestPhaseByReply((p) => ({ ...p, [replyId]: 'error' }));
    }
  };

  // Fetch every reply on this work item — we filter to descendants of
  // parentResolvedId client-side. Keyed on issueUuid so a card shares
  // its query across re-renders.
  const { data: replyComments = [] } = useQuery<CdsComment[]>({
    queryKey: ['fy-reply-tree', issueUuid],
    enabled: !!issueUuid,
    staleTime: 30 * 1000,
    queryFn: async () => {
      if (!issueUuid) return [];
      const { data } = await supabase
        .from('ph_comments')
        .select('id, body, author_id, parent_comment_id, created_at, updated_at')
        .eq('work_item_id', issueUuid)
        .not('parent_comment_id', 'is', null)
        .order('created_at', { ascending: true });
      const rows = (data ?? []) as ReplyRow[];
      if (rows.length === 0) return [];
      const authorIds = [...new Set(rows.map((c) => c.author_id).filter((v): v is string => !!v))];
      const profileMap = new Map<string, { full_name: string | null; avatar_url: string | null; email: string | null }>();
      if (authorIds.length) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, email')
          .in('id', authorIds);
        for (const p of (profiles ?? [])) profileMap.set(p.id, p);
      }
      return rows.map<CdsComment>((c) => {
        const p = c.author_id ? profileMap.get(c.author_id) : null;
        return {
          id: c.id,
          author: {
            id: c.author_id ?? 'unknown',
            name: p?.full_name || p?.email || 'Unknown',
            avatarUrl: resolveAvatarUrl(p?.full_name ?? undefined) || p?.avatar_url || null,
            email: p?.email ?? undefined,
          },
          content: c.body || '',
          createdAt: c.created_at,
          updatedAt: c.updated_at ?? undefined,
          isEdited: !!c.updated_at && c.updated_at !== c.created_at,
          parentId: c.parent_comment_id,
        };
      });
    },
  });

  // Group by parent id and find immediate children of parentResolvedId.
  const childrenByParentId = useMemo(() => {
    const map: Record<string, CdsComment[]> = {};
    for (const c of replyComments) {
      if (c.parentId) (map[c.parentId] ??= []).push(c);
    }
    return map;
  }, [replyComments]);

  const immediateChildren = parentResolvedId
    ? childrenByParentId[parentResolvedId] ?? []
    : [];

  // The trunk needs to start at the For You parent's AVATAR bottom
  // and end at the last reply's branch corner — both measured at
  // runtime since they live in different DOM subtrees (the For You
  // avatar sits in FeedCard's outer flex row, the trunk lives here
  // inside the content column).
  const containerRef = useRef<HTMLDivElement>(null);
  const lastChildRef = useRef<HTMLDivElement>(null);
  const [trunkTop, setTrunkTop] = useState(0);
  const [trunkBottom, setTrunkBottom] = useState(40);
  // The horizontal shift to apply to the reply tree container so
  // each child's Bezier branch (drawn at x=TRUNK_X of the child
  // wrapper) lands exactly at the For You avatar's horizontal
  // CENTER. Measured at runtime instead of hardcoded — neither the
  // FeedCard's padding nor the avatar's width are stable enough to
  // assume.
  const [marginLeft, setMarginLeft] = useState(0);

  useLayoutEffect(() => {
    if (immediateChildren.length === 0) return;
    const update = () => {
      const wrapper = containerRef.current;
      const lastChild = lastChildRef.current;
      if (!wrapper || !lastChild) return;
      const parent = wrapper.parentElement;
      const feedCard = wrapper.closest('[data-fy-feedcard]');
      const avatar = feedCard?.querySelector('[data-fy-avatar]') as HTMLElement | null;

      // Horizontal alignment — shift the container so its left edge
      // sits TRUNK_X (12) pixels to the LEFT of the avatar's center.
      // That way the trunk drawn at left:TRUNK_X of the container
      // and each child's branch drawn at left:TRUNK_X of the child
      // wrapper both align on the avatar's center x.
      if (parent && avatar) {
        const aRect = avatar.getBoundingClientRect();
        const pRect = parent.getBoundingClientRect();
        const avatarCenterX = aRect.left + aRect.width / 2;
        const desiredMargin = avatarCenterX - pRect.left - TRUNK_X;
        setMarginLeft(desiredMargin);
      }

      // Re-measure with the shift applied so the trunk math below
      // uses the post-layout rect.
      const wRect = wrapper.getBoundingClientRect();
      const cRect = lastChild.getBoundingClientRect();
      // Trunk bottom — stops at the last reply's branch corner (top
      // of the last child wrapper).
      const bottomDistance = wRect.bottom - cRect.top;
      setTrunkBottom(bottomDistance > 0 ? bottomDistance : 0);

      // Trunk top — extends UP from our container so the line
      // emerges from BELOW the For You parent's avatar (avatar
      // bottom y). The line visually passes through the parent's
      // body / toolbar / composer area.
      if (avatar) {
        const aRect = avatar.getBoundingClientRect();
        const upDistance = wRect.top - aRect.bottom;
        setTrunkTop(-Math.max(0, upDistance));
      } else {
        setTrunkTop(0);
      }
    };
    update();
    const ro = new ResizeObserver(update);
    if (containerRef.current) ro.observe(containerRef.current);
    const feedCard = containerRef.current?.closest('[data-fy-feedcard]');
    if (feedCard) ro.observe(feedCard);
    window.addEventListener('resize', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [immediateChildren.length, replyComments.length]);

  const currentUser: CdsUser | undefined = user
    ? {
        id: user.id,
        name: user.email || 'You',
        email: user.email ?? undefined,
      }
    : undefined;

  // Per-reply toolbar + inline composer renderer. Shared with
  // CommentNode so every nesting level renders consistently.
  const renderReply = (c: CdsComment) => {
    const canEdit = !!user && c.author.id === user.id;
    const phase = suggestPhaseByReply[c.id] ?? 'idle';
    const defaultText = suggestDefaultByReply[c.id] ?? '';
    const composerKey = composerKeyByReply[c.id] ?? 0;
    return (
      <>
        <Comment
          comment={c}
          actions={
            <CommentToolbar
              onReply={() => setReplyingToId(c.id)}
              onEdit={canEdit ? () => { /* edit reply — same modal/flow TODO */ } : undefined}
              onCopyLink={() => {
                const u = new URL(window.location.origin + `/browse/`);
                void navigator.clipboard?.writeText(u.toString() + c.id);
              }}
            />
          }
        />
        {/* Per-reply Ask Caty tile — same rainbow border + hover bg
            + inline error state used at the top-level For You card. */}
        {phase !== 'loading' ? (
          <SuggestReplyTile
            phase={phase === 'error' ? 'error' : 'idle'}
            onSuggest={() => handleSuggestReplyTo(c.id, c.content || '')}
          />
        ) : (
          <div
            style={{
              marginBlockStart: 8,
              marginInlineStart: 34,
              font: `500 12px/16px var(--ds-font-family-body, "Atlassian Sans"), ui-sans-serif, sans-serif`,
              color: token('color.text.subtle', '#505258'),
            }}
          >
            Ask Caty…
          </div>
        )}
        {replyingToId === c.id && (
          <div style={{ paddingLeft: 44, paddingTop: 8 }}>
            <div style={{
              fontSize: 12, fontWeight: 500,
              color: 'var(--ds-text-subtle, #44546F)',
              marginBottom: 6,
            }}>Replying to {c.author.name}</div>
            <CommentEditor
              key={`fy-nested-reply-${c.id}-${composerKey}`}
              currentUser={currentUser}
              mentionableUsers={mentionableUsers}
              defaultValue={defaultText}
              autoFocus
              placeholder={`Reply to ${c.author.name}…`}
              onSubmit={async (content) => {
                await onSubmitReplyTo(c.id, content);
                setReplyingToId(null);
                setSuggestDefaultByReply((d) => {
                  const next = { ...d };
                  delete next[c.id];
                  return next;
                });
                queryClient.invalidateQueries({ queryKey: ['fy-reply-tree', issueUuid] });
              }}
              onCancel={() => setReplyingToId(null)}
              workItemId={issueUuid ?? undefined}
            />
          </div>
        )}
      </>
    );
  };

  if (!parentResolvedId || immediateChildren.length === 0) return null;

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        marginBlockStart: 8,
        // Measured shift so the trunk drawn at left:TRUNK_X of this
        // container, AND each child's Bezier branch (also at left:
        // TRUNK_X of the child wrapper), both align on the For You
        // avatar's horizontal center. See useLayoutEffect above.
        marginInlineStart: marginLeft,
        paddingInlineStart: 0,
      }}
    >
      {/* Single trunk for the IMMEDIATE children — extends UP to the
          For You parent's avatar bottom (via negative top measured at
          runtime) and DOWN to the last child's branch corner. Each
          child draws its own Bezier branch hooking onto this trunk. */}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          left: TRUNK_X,
          top: trunkTop,
          bottom: trunkBottom,
          width: 0,
          borderLeft: `${LINE_WIDTH}px solid ${LINE_COLOR}`,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      {immediateChildren.map((child, idx) => (
        <div
          key={child.id}
          ref={idx === immediateChildren.length - 1 ? lastChildRef : undefined}
        >
          <CommentNode
            comment={child}
            childrenByParentId={childrenByParentId}
            renderComment={renderReply}
            isReply
          />
        </div>
      ))}
    </div>
  );
}

// ─── ForYouCardFooter — unified toolbar + reply composer ─────────────
//
// Replaces the legacy ReactionStrip + ReplyComposer pair with our
// shared CommentToolbar + CommentEditor. Reactions hit ph_comment_reactions
// directly (with on-demand ph_comments upsert for Jira-synced comments
// that haven't been mirrored yet). Replies insert a new ph_comments
// row with parent_comment_id pointing at this comment.
//
// Ask Caty stays as a small button below the editor — clicking it
// generates a suggestion via ai-improve-comment and remounts the
// editor with the suggestion pre-filled (`composerKey` bump).
const UUID_RE_FY =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function useMentionableUsersFY(): CdsUser[] {
  const { data = [] } = useQuery({
    queryKey: ['fy-mentionable-users'],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .eq('approval_status', 'APPROVED')
        .order('full_name');
      return (data ?? []).map((p: { id: string; full_name: string | null; email: string | null; avatar_url: string | null }) => ({
        id: p.id,
        name: p.full_name || p.email || 'Unknown',
        avatarUrl: p.avatar_url ?? undefined,
        email: p.email ?? undefined,
      }));
    },
  });
  return data;
}

function ForYouCardFooter({
  row,
  currentUserName,
}: {
  row: FeedRow;
  currentUserName?: string;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const mentionableUsers = useMentionableUsersFY();
  // Catalyst people directory (resource_inventory with profile_id) —
  // used as additional roster signal alongside `mentionableUsers` so
  // multi-word names that exist in either source resolve to a single
  // pill via parseMentions's longest-match.
  const { groups: peopleGroupsForFooter } = useChatPeople();
  const [resolvedId, setResolvedId] = useState<string | null>(row.phCommentId);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerKey, setComposerKey] = useState(0);
  const [composerDefault, setComposerDefault] = useState('');
  const [suggestPhase, setSuggestPhase] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  // Inline reply feedback — no corner toasts or Atlassian Flags. Success
  // flashes a brief "Reply sent" indicator inside LeaveAReplyBox for 2s
  // and then reverts; error keeps the composer open with an inline
  // error banner so the user can fix and retry without losing context.
  const [replyJustSent, setReplyJustSent] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);
  useEffect(() => {
    if (!replyJustSent) return;
    const t = window.setTimeout(() => setReplyJustSent(false), 2000);
    return () => window.clearTimeout(t);
  }, [replyJustSent]);

  // Sync if a refetch surfaces a non-null phCommentId after first paint.
  useEffect(() => {
    if (row.phCommentId && !resolvedId) setResolvedId(row.phCommentId);
  }, [row.phCommentId, resolvedId]);

  const issueUuid = UUID_RE_FY.test(row.issueId) ? row.issueId : null;
  const { reactions, toggleReaction } = useCommentReactions(resolvedId);
  const pendingEmojiRef = useRef<string | null>(null);

  // Once resolvedId arrives via the upsert below, fire any queued emoji.
  useEffect(() => {
    if (resolvedId && pendingEmojiRef.current) {
      const emoji = pendingEmojiRef.current;
      pendingEmojiRef.current = null;
      toggleReaction(emoji);
    }
  }, [resolvedId, toggleReaction]);

  const ensurePhComment = useCallback(async (): Promise<string | null> => {
    if (resolvedId) return resolvedId;
    if (!issueUuid || !user?.id) return null;
    try {
      const { data: existing } = await (supabase as unknown as { from: (t: string) => { select: (s: string) => { eq: (k: string, v: string) => { maybeSingle: () => Promise<{ data: { id: string } | null }> } } } })
        .from('ph_comments')
        .select('id')
        .eq('jira_comment_id', row.commentId)
        .maybeSingle();
      if (existing?.id) {
        setResolvedId(existing.id);
        return existing.id;
      }
      const { data, error } = await supabase
        .from('ph_comments')
        .insert({
          work_item_id: issueUuid,
          body: row.commentBody || '',
          jira_comment_id: row.commentId,
          author_id: user.id,
        })
        .select('id')
        .single();
      if (error) throw error;
      setResolvedId(data.id);
      return data.id;
    } catch (err) {
      console.warn('[ForYouCardFooter] ensurePhComment failed', err);
      return null;
    }
  }, [resolvedId, issueUuid, user?.id, row.commentId, row.commentBody]);

  // Map useCommentReactions's CommentReactionAggregate → CdsCommentReaction.
  const cdsReactions: CdsCommentReaction[] = reactions.map((r) => ({
    emoji: r.emoji,
    count: r.count,
    hasMine: r.reactedByMe,
  }));

  const handleToggleReaction = useCallback(
    async (emoji: string) => {
      if (!resolvedId) {
        pendingEmojiRef.current = emoji;
        await ensurePhComment();
        return;
      }
      toggleReaction(emoji);
    },
    [resolvedId, ensurePhComment, toggleReaction],
  );

  const currentUser: CdsUser | undefined = user
    ? {
        id: user.id,
        name: currentUserName || user.email || 'You',
        avatarUrl: resolveAvatarUrl(currentUserName) || undefined,
        email: user.email ?? undefined,
      }
    : undefined;

  // AbortController for the active Ask Caty stream — lets the user
  // cancel mid-stream from the CatyGeneratingPanel. The ref is set the
  // moment the request starts and cleared when it finishes / aborts.
  const suggestAbortRef = useRef<AbortController | null>(null);

  const handleCancelSuggest = useCallback(() => {
    suggestAbortRef.current?.abort();
    suggestAbortRef.current = null;
    setSuggestPhase('idle');
  }, []);

  const handleSuggestReply = async () => {
    if (suggestPhase === 'loading') return;
    setSuggestPhase('loading');
    const controller = new AbortController();
    suggestAbortRef.current = controller;
    try {
      const res = await fetchFunction('ai-improve-comment', {
        method: 'POST',
        body: JSON.stringify({
          improve_type: 'suggest_reply',
          parent_comment: row.commentBody,
          parent_author: row.authorName,
          issue_summary: row.issueSummary,
          issue_type: row.issueType,
        }),
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        // setSuggestPhase('error') drives the inline error UI on the
        // LeaveAReplyBox (SuggestReplyTile's error state — "Caty is busy
        // — please wait a moment and click again"). No corner toast.
        setSuggestPhase('error');
        return;
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buffer = '';
      let accum = '';
      while (true) {
        const { value: chunk, done } = await reader.read();
        if (done) break;
        buffer += dec.decode(chunk, { stream: true });
        let nl;
        while ((nl = buffer.indexOf('\n')) !== -1) {
          const line = buffer.slice(0, nl).trim();
          buffer = buffer.slice(nl + 1);
          if (!line) continue;
          try {
            const ev = JSON.parse(line);
            if (ev.type === 'text' && typeof ev.delta === 'string') accum += ev.delta;
          } catch { /* skip */ }
        }
      }
      if (accum.length > 0) {
        // Convert plain-text @Name tokens into structured ADF mention
        // nodes so the editor renders them as pills instead of raw text.
        // CommentEditor.toInitialContent detects ADF via looksLikeAdf
        // (JSON-stringified doc with type:'doc') and parses it directly,
        // skipping markdownToAdf which would emit plain text nodes.
        //
        // Roster combines THREE sources so multi-word names always
        // longest-match (avoids the "first-word-only pill" regression):
        //   1. mentionableUsers — APPROVED profiles
        //   2. peopleGroupsForFooter — resource_inventory directory
        //   3. row.authorName — the parent comment's author, ALWAYS
        //      included so Jira-only authors like "Imran Aslam" who
        //      have no Catalyst row still resolve as a single pill.
        const mentionRoster: MentionRosterEntry[] = [
          ...mentionableUsers.map((u) => ({ name: u.name, userId: u.id })),
          ...peopleGroupsForFooter.flatMap((g) =>
            g.people.map((p) => ({ name: p.name, userId: p.profileId })),
          ),
        ];
        if (row.authorName) {
          mentionRoster.push({ name: row.authorName, userId: null });
        }
        const adfDoc = aiTextToAdfWithMentions(accum, mentionRoster);
        setComposerDefault(JSON.stringify(adfDoc));
        setComposerKey((k) => k + 1);
        setComposerOpen(true);
        setSuggestPhase('done');
      } else {
        setSuggestPhase('error');
      }
    } catch (err) {
      // AbortError is the user clicking Cancel — keep state at 'idle'
      // (already set by handleCancelSuggest) and stay silent.
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setSuggestPhase('error');
    } finally {
      if (suggestAbortRef.current === controller) {
        suggestAbortRef.current = null;
      }
    }
  };

  const handleSubmitReply = async (content: string) => {
    setReplyError(null);
    if (!user?.id) {
      setReplyError('You must be signed in to reply.');
      return;
    }
    // Issue UUID lookup — `row.issueId` is set to `issue?.id || issue_key`
    // upstream, so for issues we haven't fully cached in ph_issues yet it
    // arrives as a Jira key like "BAU-1234". The previous code returned
    // silently when that happened, leaving the Save button looking
    // broken. Resolve the UUID by issue_key here as a fallback before we
    // bail.
    let workItemId = issueUuid;
    if (!workItemId && row.issueKey) {
      try {
        const { data } = await (supabase as unknown as {
          from: (t: string) => {
            select: (s: string) => {
              eq: (k: string, v: string) => {
                maybeSingle: () => Promise<{ data: { id: string } | null }>;
              };
            };
          };
        })
          .from('ph_issues')
          .select('id')
          .eq('issue_key', row.issueKey)
          .maybeSingle();
        if (data?.id) workItemId = data.id;
      } catch {
        /* fall through to the visible error below */
      }
    }
    if (!workItemId) {
      setReplyError('This issue is not yet synced to Catalyst.');
      return;
    }
    try {
      const parentId = await ensurePhComment();
      const { error } = await supabase.from('ph_comments').insert({
        work_item_id: workItemId,
        body: content,
        author_id: user.id,
        parent_comment_id: parentId ?? null,
      });
      if (error) throw error;
      // Success — close the composer and flash an inline "Reply sent"
      // indicator in the LeaveAReplyBox for ~2s. No corner notification.
      setComposerOpen(false);
      setComposerDefault('');
      setReplyJustSent(true);
      queryClient.invalidateQueries({ queryKey: ['fy-reply-tree', workItemId] });
    } catch (err) {
      console.warn('[ForYouCardFooter] reply insert failed', err);
      // Error — keep the composer open with an inline error banner so
      // the user can correct and retry without losing their typed text.
      setReplyError('Could not save reply. Try again in a moment.');
    }
  };

  // Used by ForYouReplyTree when the user replies to a nested reply.
  // Inserts directly with the given parent (no on-demand upsert
  // needed — the nested replies already exist in ph_comments).
  const handleSubmitReplyTo = async (parentId: string, content: string) => {
    if (!user?.id || !issueUuid) return;
    await supabase.from('ph_comments').insert({
      work_item_id: issueUuid,
      body: content,
      author_id: user.id,
      parent_comment_id: parentId,
    });
    // Success feedback is the reply itself appearing in the tree via
    // the query invalidation below — no corner notification.
    queryClient.invalidateQueries({ queryKey: ['fy-reply-tree', issueUuid] });
  };

  // Phase 1 dashboard layout:
  //   • "View thread" link sits above the reactions toolbar — only when
  //     the row actually carries a thread to view. Clickable placeholder;
  //     the trigger is wired in a later phase.
  //   • CommentToolbar shows reactions only — Reply icon and ⋯ More menu
  //     are intentionally hidden by NOT passing `onReply` / `onCopyLink`.
  //   • Nested reply tree (<ForYouReplyTree>) is NOT rendered on the
  //     dashboard. The "Leave a reply" rest-state box replaces both the
  //     standalone SuggestReplyTile and the reply list.
  return (
    <>
      {row.showViewThread && (
        <ViewThreadLink
          onActivate={() => {
            // Drop the viewer directly onto the Comments tab of the
            // issue's detail view, rendered as the right-side panel
            // (same affordance the project-hub backlog uses) — not the
            // default centred modal.
            useGlobalSearchStore.getState().setFocusSection('comments');
            useGlobalSearchStore.getState().openDetail({
              id: row.issueKey,
              itemType: row.issueType,
              projectKey: row.projectKey,
              panelMode: true,
            });
          }}
        />
      )}
      <CommentToolbar
        reactions={cdsReactions}
        onToggleReaction={handleToggleReaction}
      />
      <LeaveAReplyBox
        currentUser={currentUser}
        composerOpen={composerOpen}
        suggestLoading={suggestPhase === 'loading'}
        suggestError={suggestPhase === 'error'}
        replyJustSent={replyJustSent}
        replyError={replyError}
        onDismissError={() => setReplyError(null)}
        onOpen={() => {
          setComposerDefault('');
          setComposerKey((k) => k + 1);
          setComposerOpen(true);
        }}
        onSuggest={handleSuggestReply}
        onCancelSuggest={handleCancelSuggest}
        editor={
          <CommentEditor
            key={composerKey}
            currentUser={currentUser}
            mentionableUsers={mentionableUsers}
            defaultValue={composerDefault}
            autoFocus
            placeholder={`Reply to ${row.authorName}…`}
            onSubmit={handleSubmitReply}
            onCancel={() => setComposerOpen(false)}
            workItemId={issueUuid ?? undefined}
            improveContext={{
              issueKey: row.issueKey,
              issueType: row.issueType,
              issueSummary: row.issueSummary,
            }}
          />
        }
      />
    </>
  );
}

/**
 * LeaveAReplyBox — rest-state composer surface used on the For You
 * dashboard. Renders a tree-line connector + current-user avatar + a
 * bordered "Leave a reply" container with the Ask Caty button inside it.
 *
 * Click anywhere in the container (except the Ask Caty button) → opens
 * the real CommentEditor in place. Click Ask Caty → triggers the AI
 * suggestion stream (handled by the parent). When `composerOpen` is
 * true the bordered placeholder is swapped for the `editor` slot so the
 * tree-line + avatar layout stays put — no jump.
 */
function LeaveAReplyBox({
  currentUser,
  composerOpen,
  suggestLoading,
  suggestError,
  replyJustSent,
  replyError,
  onDismissError,
  onOpen,
  onSuggest,
  onCancelSuggest,
  editor,
}: {
  currentUser?: CdsUser;
  composerOpen: boolean;
  suggestLoading: boolean;
  suggestError: boolean;
  /** Brief inline success state — flashes ~2s right after a successful submit. */
  replyJustSent: boolean;
  /** Inline error string surfaced when a submit fails. Null when clear. */
  replyError: string | null;
  onDismissError: () => void;
  onOpen: () => void;
  onSuggest: () => void;
  onCancelSuggest: () => void;
  editor: React.ReactNode;
}) {
  const placeholder = replyJustSent
    ? 'Reply sent'
    : suggestError
    ? 'Could not generate a suggestion. Try again.'
    : 'Leave a reply';

  // Trunk anchoring — same pattern ForYouReplyTree uses so the vertical
  // line emerges from BELOW the FeedCard's parent avatar (in the outer
  // flex column), passes DOWN through the comment body / reactions /
  // "View thread" link, and curves into the reply avatar here.
  //   • marginLeft shifts this container so its `left: TRUNK_X` aligns
  //     with the parent avatar's horizontal CENTER.
  //   • trunkTop is a NEGATIVE offset measured up from this container's
  //     top to the parent avatar's bottom — that's how high the trunk
  //     extends above us into the parent's body area.
  // Both are measured at runtime because neither the FeedCard padding
  // nor the avatar's box are stable enough to hard-code.
  const containerRef = useRef<HTMLDivElement>(null);
  const [marginLeft, setMarginLeft] = useState(0);
  const [trunkTop, setTrunkTop] = useState(0);

  useLayoutEffect(() => {
    const wrapper = containerRef.current;
    if (!wrapper) return;
    const update = () => {
      const parent = wrapper.parentElement;
      const feedCard = wrapper.closest('[data-fy-feedcard]');
      const avatar = feedCard?.querySelector('[data-fy-avatar]') as HTMLElement | null;
      if (!parent || !avatar) return;

      const aRect = avatar.getBoundingClientRect();
      const pRect = parent.getBoundingClientRect();
      const avatarCenterX = aRect.left + aRect.width / 2;
      setMarginLeft(avatarCenterX - pRect.left - TRUNK_X);

      const wRect = wrapper.getBoundingClientRect();
      const upDistance = wRect.top - aRect.bottom;
      setTrunkTop(-Math.max(0, upDistance));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(wrapper);
    const feedCard = wrapper.closest('[data-fy-feedcard]');
    if (feedCard) ro.observe(feedCard);
    window.addEventListener('resize', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [composerOpen, suggestLoading, suggestError]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        paddingLeft: REPLY_INDENT,
        marginBlockStart: 8,
        marginLeft,
      }}
    >
      {/* Vertical trunk — extends UP from our top (top: trunkTop, a
          negative value) so it visually emerges from BELOW the parent
          FeedCard's avatar and passes through the comment body / view
          thread / reactions area. */}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          left: TRUNK_X,
          top: trunkTop,
          height: -trunkTop,
          width: 0,
          borderLeft: `${LINE_WIDTH}px solid ${LINE_COLOR}`,
          pointerEvents: 'none',
        }}
      />

      {/* Curved branch — picks up where the trunk ends (top: 0) and
          curves into the current-user avatar at its VERTICAL MIDDLE.
          CommentNode's BRANCH_HEIGHT (24) was tuned for a 24px avatar
          inside a padded row landing at y=24; here the avatar is the
          first flex child (no top padding) and Atlaskit's `medium`
          size is 32px, so the true vertical middle sits at y=16. */}
      {(() => {
        const branchEndY = 16;
        return (
          <svg
            aria-hidden
            width={BRANCH_WIDTH}
            height={branchEndY}
            viewBox={`0 0 ${BRANCH_WIDTH} ${branchEndY}`}
            style={{
              position: 'absolute',
              left: TRUNK_X,
              top: 0,
              overflow: 'visible',
              pointerEvents: 'none',
            }}
          >
            <path
              d={`M 0 0 Q 0 ${branchEndY} ${BRANCH_WIDTH} ${branchEndY}`}
              fill="none"
              stroke={LINE_COLOR}
              strokeWidth={LINE_WIDTH}
            />
          </svg>
        );
      })()}

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        {/* Avatar rendered ONLY in the rest state — CommentEditor draws
            its own author avatar, so showing one here too would stack
            two side-by-side when the editor opens. */}
        {!composerOpen && (
          <span style={{ flexShrink: 0, marginInlineStart: -16 }}>
            <Avatar
              size="medium"
              name={currentUser?.name ?? 'You'}
              src={currentUser?.avatarUrl}
            />
          </span>
        )}

        {composerOpen ? (
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Inline error banner — sits ABOVE the editor when a submit
                fails so the user can correct and retry without losing
                context. Dismissable; no corner overlay. */}
            {replyError && (
              <div
                role="alert"
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                  padding: '8px 10px',
                  borderRadius: 4,
                  background: 'var(--ds-background-danger, #FFEDEB)',
                  border: '1px solid var(--ds-border-danger, #F2A19A)',
                  color: 'var(--ds-text-danger, #AE2A19)',
                  font: `400 13px/18px var(--ds-font-family-body, "Atlassian Sans"), ui-sans-serif, sans-serif`,
                }}
              >
                <span style={{ flex: 1, minWidth: 0 }}>{replyError}</span>
                <button
                  type="button"
                  aria-label="Dismiss error"
                  onClick={onDismissError}
                  style={{
                    all: 'unset',
                    cursor: 'pointer',
                    color: 'var(--ds-text-danger, #AE2A19)',
                    fontWeight: 600,
                    padding: '0 4px',
                  }}
                >
                  ×
                </button>
              </div>
            )}
            {editor}
          </div>
        ) : suggestLoading ? (
          // While Caty is generating, the bordered placeholder is replaced
          // by the animated rainbow-frame panel. Hides the Ask Caty button
          // so the user can't fire the request multiple times in parallel.
          <div style={{ flex: 1, minWidth: 0 }}>
            <CatyGeneratingPanel onCancel={onCancelSuggest} />
          </div>
        ) : (
          <div
            role="button"
            tabIndex={0}
            onClick={onOpen}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onOpen();
              }
            }}
            style={{
              flex: 1,
              minWidth: 0,
              cursor: 'text',
              border: `1px solid ${
                replyJustSent
                  ? 'var(--ds-border-success, #6A9A7B)'
                  : token('color.border', 'rgba(11,18,14,0.14)')
              }`,
              borderRadius: 6,
              padding: '10px 12px',
              background: 'var(--ds-surface, #FFFFFF)',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              transition: 'border-color 240ms ease',
            }}
          >
            {/* Inline success indicator — green check + "Reply sent" for
                ~2s after a successful submit, then quietly reverts to the
                default placeholder. No corner notification, no overlay. */}
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                font: `400 14px/20px var(--ds-font-family-body, "Atlassian Sans"), ui-sans-serif, sans-serif`,
                color: replyJustSent
                  ? 'var(--ds-text-success, #1F845A)'
                  : token('color.text.subtlest', '#6B778C'),
                transition: 'color 240ms ease',
              }}
            >
              {replyJustSent && (
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path
                    d="M3 8l3.5 3.5L13 5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
              {placeholder}
            </span>
            {/* Stop propagation so clicking the Ask Caty button does
                NOT also trigger the outer "open editor" handler on the
                bordered box. */}
            <span onClick={(e) => e.stopPropagation()}>
              <SuggestReplyTile
                phase={suggestError ? 'error' : 'idle'}
                onSuggest={onSuggest}
              />
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Convert the AI's plain-text reply into an ADF doc that includes
 * structured mention nodes for every roster-matched `@Name`. The
 * CommentEditor's `toInitialContent` detects ADF input (JSON with
 * `type: 'doc'`) and loads it verbatim, so mentions arrive as proper
 * pills instead of plain `@Imran Aslam` text.
 *
 * Roster-aware longest-match (via parseMentions) so multi-word names
 * like "@Maria Garcia Lopez" land as a single mention, and unknown
 * `@handles` fall back to plain text rather than empty-id mentions.
 */
function aiTextToAdfWithMentions(
  text: string,
  roster: readonly MentionRosterEntry[],
): unknown {
  const lines = text.trim().split('\n');
  const paragraphs: unknown[] = [];
  let inline: unknown[] = [];

  const flushParagraph = () => {
    if (inline.length > 0) {
      paragraphs.push({ type: 'paragraph', content: inline });
      inline = [];
    }
  };

  for (const line of lines) {
    if (!line.trim()) {
      flushParagraph();
      continue;
    }
    if (inline.length > 0) inline.push({ type: 'hardBreak' });
    for (const part of parseMentions(line, roster)) {
      if (part.type === 'mention') {
        // The ADF→Tiptap adapter in this repo copies `attrs.text` into
        // the Tiptap node's `label`, and Mention.ts's `renderHTML`
        // always prepends `@`. So we store `text` WITHOUT the `@` —
        // emitting `@Name` would render as `@@Name`.
        //
        // We emit the mention node UNCONDITIONALLY (even when `userId`
        // is null — e.g. Jira-only authors without a Catalyst profile)
        // so the chip still paints as a pill. The canonical mentionStyles
        // CSS keys on attribute PRESENCE (`span[data-mention-id]`),
        // not value; an empty id still triggers the gray pill. Only the
        // self-paint (brand-bold blue) requires a real id match.
        const name = part.name.replace(/^@/, '');
        inline.push({
          type: 'mention',
          attrs: {
            id: part.userId ?? '',
            text: name,
            userType: 'DEFAULT',
          },
        });
      } else if (part.value) {
        inline.push({ type: 'text', text: part.value });
      }
    }
  }
  flushParagraph();

  if (paragraphs.length === 0) paragraphs.push({ type: 'paragraph' });
  return { type: 'doc', version: 1, content: paragraphs };
}

/**
 * ViewThreadLink — small blue link rendered above the reactions toolbar
 * on every For You card.
 *
 *   • Idle:  link-blue, no underline.
 *   • Hover: text-information-bold (darker blue) + matching underline.
 *
 * No layout shift on hover — the underline appears via `text-decoration`
 * on the same line so neighbouring elements don't move.
 */
function ViewThreadLink({ onActivate }: { onActivate: () => void }) {
  const [hover, setHover] = useState(false);
  const idleColor = token('color.link', '#1868DB');
  const hoverColor = token('color.text.information.bolder', '#0055CC');
  return (
    <button
      type="button"
      onClick={onActivate}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      style={{
        all: 'unset',
        cursor: 'pointer',
        display: 'inline-block',
        // ForYouCardFooter wraps its children in a flex column. Flex items
        // default to align-items: stretch, which stretches inline-block
        // buttons to the full column width — that made the entire row
        // clickable instead of just the text. `alignSelf: 'flex-start'`
        // + `width: 'fit-content'` pins the button's hit area to its
        // text content only.
        alignSelf: 'flex-start',
        width: 'fit-content',
        font: `500 13px/16px var(--ds-font-family-body, "Atlassian Sans"), ui-sans-serif, sans-serif`,
        color: hover ? hoverColor : idleColor,
        textDecoration: hover ? 'underline' : 'none',
        textDecorationColor: hover ? hoverColor : 'transparent',
        textUnderlineOffset: 2,
        transition: 'color 120ms ease',
      }}
    >
      View thread
    </button>
  );
}

/**
 * CatyGeneratingPanel — loading-state UI shown while Ask Caty streams a
 * reply suggestion. Reuses the `ask-caty-frame` rotating rainbow CSS so
 * the border anti-rotates while the request is in flight (matches Jira's
 * Rovo "Generating" panel).
 *
 *   ┌── animated rainbow border ──┐
 *   │ … Generating         Cancel │
 *   │ ─────────────────────────── │
 *   │                  [icon] Caty│
 *   └─────────────────────────────┘
 *
 * Cancel triggers an `AbortController.abort()` on the parent — the
 * request bails immediately and the rest-state box reappears.
 */
function CatyGeneratingPanel({ onCancel }: { onCancel: () => void }) {
  return (
    <div className="ask-caty-frame is-loading" style={{ borderRadius: 6 }}>
      {/* Three-dot bounce keyframes scoped to this panel so the dots
          travel up/down independently with a 160ms stagger. */}
      <style>{`
        @keyframes cgp-dot-bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-3px); opacity: 1; }
        }
        .cgp-dots { display: inline-flex; align-items: center; gap: 3px; }
        .cgp-dot {
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: var(--ds-text-information, #1868DB);
          animation: cgp-dot-bounce 1.2s ease-in-out infinite;
        }
        .cgp-dot:nth-child(2) { animation-delay: 0.16s; }
        .cgp-dot:nth-child(3) { animation-delay: 0.32s; }
      `}</style>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--ds-surface, #FFFFFF)',
          borderRadius: 4.5,
          padding: '12px 14px',
        }}
      >
        {/* Top section — minHeight reserves at least 3 text rows of
            breathing room (3 × 20px line-height = 60px) so the panel
            never feels cramped while the model streams in. Mirrors the
            Rovo "Generating" panel layout in Jira's For You. */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            minHeight: 60,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="cgp-dots" aria-hidden="true">
              <span className="cgp-dot" />
              <span className="cgp-dot" />
              <span className="cgp-dot" />
            </span>
            <span
              style={{
                font: `400 14px/20px var(--ds-font-family-body, "Atlassian Sans"), ui-sans-serif, sans-serif`,
                color: token('color.text.subtle', '#44546F'),
              }}
            >
              Generating
            </span>
            <span style={{ flex: 1 }} />
            <button
              type="button"
              onClick={onCancel}
              style={{
                all: 'unset',
                cursor: 'pointer',
                font: `400 14px/20px var(--ds-font-family-body, "Atlassian Sans"), ui-sans-serif, sans-serif`,
                color: token('color.text', '#172B4D'),
              }}
            >
              Cancel
            </button>
          </div>
        </div>

        {/* Divider */}
        <div
          style={{
            height: 1,
            background: 'var(--ds-border, #DFE1E6)',
            margin: '10px 0',
          }}
        />

        {/* Bottom row: spacer + Caty label + Caty icon */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ flex: 1 }} />
          <span
            style={{
              font: `400 13px/16px var(--ds-font-family-body, "Atlassian Sans"), ui-sans-serif, sans-serif`,
              color: token('color.text.subtle', '#44546F'),
            }}
          >
            Caty
          </span>
          <img
            src={catyAiBg}
            alt=""
            aria-hidden="true"
            width={16}
            height={16}
            style={{ display: 'block', borderRadius: 3 }}
          />
        </div>
      </div>
    </div>
  );
}

function ReactionStrip({
  phCommentId,
  jiraCommentId,
  issueId,
  commentBody,
}: {
  phCommentId: string | null;
  /** Jira-side comment ID (text). Used to upsert ph_comments on first reaction. */
  jiraCommentId: string;
  /** ph_issues.id UUID — required for ph_comments.work_item_id FK. */
  issueId: string;
  /** Comment body — stored in ph_comments.body on upsert. */
  commentBody: string;
}) {
  // UUID regex — issueId is sometimes a Jira key fallback (e.g. "BAU-123");
  // only attempt ph_comments upsert when we have a real UUID.
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const issueUuid = UUID_RE.test(issueId) ? issueId : null;

  // resolvedId starts from the pre-fetched phCommentId (may be null when
  // ph_comments has no row yet). We set it after on-demand upsert.
  const [resolvedId, setResolvedId] = useState<string | null>(phCommentId);

  // H1: show a spinner in the strip while the on-demand upsert is in-flight
  // so the user knows their click was registered (P1 from design-critique 2026-05-29).
  const [isUpserting, setIsUpserting] = useState(false);

  // Emoji picker state
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerTriggerRef = useRef<HTMLButtonElement | null>(null);
  const handlePickerClose = useCallback(() => setPickerOpen(false), []);

  // If phCommentId arrives non-null on a later render (e.g. after a refetch
  // that found the row), sync it in so we don't create a duplicate.
  React.useEffect(() => {
    if (phCommentId && !resolvedId) setResolvedId(phCommentId);
  }, [phCommentId, resolvedId]);

  const { reactions, toggleReaction } = useCommentReactions(resolvedId);

  // After resolvedId is set (on-demand upsert complete), fire any queued emoji.
  const pendingEmojiRef = useRef<string | null>(null);
  React.useEffect(() => {
    if (resolvedId && pendingEmojiRef.current) {
      const emoji = pendingEmojiRef.current;
      pendingEmojiRef.current = null;
      toggleReaction(emoji);
    }
  }, [resolvedId, toggleReaction]);

  // Chips are interactive when issueId is a valid UUID. Also blocked while
  // the on-demand upsert is in-flight (isUpserting) to prevent double-fires.
  const isAvailable = issueUuid !== null && !isUpserting;

  /** Ensure a ph_comments row exists, returning its UUID. */
  const ensurePhComment = async (): Promise<string | null> => {
    if (resolvedId) return resolvedId;
    if (!issueUuid) return null;
    setIsUpserting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // SELECT first — avoids the partial-index upsert issue and is safe
      // against concurrent inserts (the unique index prevents duplicates).
      const { data: existing } = await (supabase as any)
        .from('ph_comments')
        .select('id')
        .eq('jira_comment_id', jiraCommentId)
        .maybeSingle();

      if (existing?.id) {
        setResolvedId(existing.id as string);
        return existing.id as string;
      }

      // Row does not exist yet — create it. author_id is required by the
      // "Members can create comments" RLS policy (WITH CHECK (author_id = auth.uid())).
      const { data, error } = await (supabase as any)
        .from('ph_comments')
        .insert({ work_item_id: issueUuid, body: commentBody || '', jira_comment_id: jiraCommentId, author_id: user.id })
        .select('id')
        .single();
      if (error) throw error;
      setResolvedId(data.id as string);
      return data.id as string;
    } catch (err) {
      console.warn('[ReactionStrip] ensurePhComment failed', err);
      toast.error('Could not save reaction');
      return null;
    } finally {
      setIsUpserting(false);
    }
  };

  /** Toggle a reaction, creating the ph_comments row first if needed. */
  const handleReact = async (key: string) => {
    if (resolvedId) {
      toggleReaction(key);
      return;
    }
    // Queue the emoji and trigger on-demand ph_comments creation.
    // The pendingEmojiRef useEffect fires the toggle after resolvedId is set.
    pendingEmojiRef.current = key;
    await ensurePhComment();
  };

  // Build a lookup map so we can decorate each default chip with its live
  // count + self-reacted state. Extra emojis in `reactions` (outside the
  // default five) get appended after the starter strip.
  const byEmoji = new Map<string, typeof reactions[number]>(
    reactions.map(r => [r.emoji, r] as const)
  );
  const extras = reactions.filter(r => !DEFAULT_REACTIONS.some(d => d.key === r.emoji));

  // Jira parity (DOM probe 2026-04-24, data-testid="render-reactions"):
  //   chip size:     37.1 × 24 (grows when the count is > 0)
  //   chip border:   0.556px solid rgba(11,18,14,0.14)  (1px on our DPR)
  //   chip radius:   4
  //   chip bg:       transparent (rest), `color.background.selected` when self-reacted
  //   trigger chip:  32 × 24 with emoji-add glyph (NOT a bare "+")
  //   gap:           4
  const chipBorder = token('color.border', 'rgba(11, 18, 14, 0.14)');

  return (
    <div
      role="toolbar"
      aria-label="Reactions"
      data-testid="reply-reactions"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        marginBlockStart: 4,
        flexWrap: 'wrap',
      }}
    >
      {DEFAULT_REACTIONS.map(r => {
        const live = byEmoji.get(r.key);
        const count = live?.count ?? 0;
        const isActive = !!live?.reactedByMe;
        return (
          <ReactionChip
            key={r.key}
            char={r.char}
            label={r.label}
            count={count}
            isActive={isActive}
            disabled={!isAvailable}
            onClick={() => handleReact(r.key)}
            chipBorder={chipBorder}
          />
        );
      })}
      {/* Any non-default emojis that showed up through the hook (e.g. another
          user reacted with :rocket:) render after the starter strip. */}
      {extras.map(r => (
        <ReactionChip
          key={r.emoji}
          char={EMOJI_CHAR[r.emoji] ?? r.emoji}
          label={r.emoji}
          count={r.count}
          isActive={r.reactedByMe}
          disabled={!isAvailable}
          onClick={() => handleReact(r.emoji)}
          chipBorder={chipBorder}
        />
      ))}
      {/* H1: inline spinner while the first-click ph_comments upsert is in-flight */}
      {isUpserting && (
        <span style={{ display: 'inline-flex', alignItems: 'center', width: 24, height: 24 }}>
          <Spinner size="small" />
        </span>
      )}
      {/* Trigger chip — Jira parity: 32×24 with emoji-add glyph.
          Opens the emoji picker popover (CLAUDE.md: self-rolled portal,
          @atlaskit/popup v4.16 has empty-portal bug). */}
      <button
        ref={pickerTriggerRef}
        type="button"
        aria-label="Add reaction"
        aria-expanded={pickerOpen}
        onClick={() => isAvailable && setPickerOpen(p => !p)}
        disabled={!isAvailable}
        data-emoji-portal="true"
        style={{
          all: 'unset',
          cursor: isAvailable ? 'pointer' : 'not-allowed',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 32,
          height: 24,
          border: `1px solid ${pickerOpen ? token('color.border.focused', '#388BFF') : chipBorder}`,
          borderRadius: 4,
          color: token('color.text.subtle', '#626F86'),
          background: pickerOpen ? token('color.background.selected', 'rgba(28,85,170,0.06)') : 'transparent',
          transition: 'background-color 120ms ease, border-color 120ms ease',
          opacity: 1,
        }}
      >
        <EmojiAddIcon label="" size="small" primaryColor="currentColor" />
      </button>

      {pickerOpen && (
        <EmojiPickerPopover
          anchorRef={pickerTriggerRef}
          onSelect={(key) => handleReact(key)}
          onClose={handlePickerClose}
        />
      )}
    </div>
  );
}

// Individual reaction chip — when count>0 the chip shows the numeric count
// next to the emoji (Jira parity: "🔥 2").
function ReactionChip({
  char, label, count, isActive, onClick, chipBorder, disabled = false,
}: {
  char: string;
  label: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
  chipBorder: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={isActive}
      // Jira pattern: "React with fire emoji" (more descriptive than bare "Fire")
      aria-label={disabled ? `${label} (unavailable)` : `React with ${label.toLowerCase()} emoji`}
      style={{
        all: 'unset',
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        // Chip grows from 37 → ~50 when a count is displayed — matches Jira.
        minWidth: count > 0 ? 40 : 37,
        height: 24,
        padding: count > 0 ? '0 6px' : 0,
        border: `1px solid ${isActive ? token('color.border.selected', '#0C66E4') : chipBorder}`,
        // Route selected bg through ADS `color.background.selected` so dark
        // mode flips correctly. The previous `rgba(28,85,170,0.06)` literal
        // was tuned for light surfaces only.
        background: isActive
          ? token('color.background.selected', 'rgba(28, 85, 170, 0.06)')
          : 'transparent',
        borderRadius: 4,
        fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif',
        // DOM-probed Jira 2026-05-29: emoji chip font-size = 13.3px (≈13). 16 was Catalyst opinion.
        fontSize: 13,
        lineHeight: 1,
        // DOM-probed Jira 2026-05-29: idle chips are opacity:1 — dimming to 0.6 when
        // count===0 made chips look disabled. Only truly-disabled chips get 0.4.
        opacity: disabled ? 0.4 : 1,
        transition: 'background-color 120ms ease, border-color 120ms ease, opacity 120ms ease',
      }}
    >
      <span aria-hidden="true">{char}</span>
      {count > 0 && (
        <span
          aria-hidden="true"
          style={{
            fontFamily: 'var(--cp-font-body)',
            fontSize: 12,
            fontWeight: 400,
            color: isActive
              ? token('color.text.selected', '#0C66E4')
              : token('color.text.subtle', '#505258'),
            letterSpacing: 0,
          }}
        >
          {count}
        </span>
      )}
    </button>
  );
}

// ─── Headline helpers ───────────────────────────────────────────────────────

// Status chip uses StatusPill (JiraTable/cells) + statusToLozenge for Jira-parity colors.
// Handles both DB variants: "Done" / "In Progress" / "To Do" (wh-jira-sync names)
// and "done" / "indeterminate" / "new" (jira-bau-reload keys).

function HeadlineIssueTitle({
  issueType,
  issueSummary,
  issueKey,
  issueStatus,
  issueStatusCategory,
}: {
  issueType: string;
  issueSummary: string;
  issueKey?: string;
  issueStatus?: string;
  /** Jira status category key: 'done' | 'new' | 'indeterminate' */
  issueStatusCategory?: string;
}) {
  return (
    // Jira parity: issue reference renders as an Atlaskit `inline-card-resolved-view`
    // DOM probe 2026-05-29 on digital-transformation.atlassian.net/jira/for-you:
    //   hairline border (color.border token), borderRadius 4, white surface bg.
    // The bordered pill is the "grey border on the ticket" the user sees in Jira.
    <span style={{
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      overflow: 'hidden',
      marginBlockStart: 2,
      border: `1px solid ${token('color.border', 'rgba(11, 18, 14, 0.14)')}`,
      borderRadius: 4,
      backgroundColor: token('elevation.surface', '#FFFFFF'),
      padding: '4px 8px',
    }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
        <WorkItemIcon type={normalizeIconType(issueType)} size={16} />
      </span>
      {/* KEY is bold and always visible; title truncates so the status pill stays in view. */}
      <span style={{ fontWeight: 600, color: token('color.link', '#0052CC'), whiteSpace: 'nowrap', flexShrink: 0 }}>
        {issueKey}
      </span>
      {issueSummary && (
        <span style={{
          fontWeight: 400,
          color: token('color.link', '#0052CC'),
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          minWidth: 0,
        }}>
          {issueSummary}
        </span>
      )}
      {/* Jira parity: status chip after entity title.
          Uses StatusPill (same component as JiraTable backlog) for exact
          Jira-probed colors: done → #B3DF72, inprogress → #8FB8F6,
          default → #DDDEE1. 11px/653/uppercase matching backlog/Jira list.
          jira-compare 2026-05-29: ADS subtle Lozenge resolved to #EFFFD6
          (too pale, wrong appearance) — replaced with StatusPill. */}
      {issueStatus && (
        <StatusPill appearance={statusToLozenge(issueStatus, issueStatusCategory)}>
          {issueStatus}
        </StatusPill>
      )}
    </span>
  );
}

// ─── Comment body rendering ─────────────────────────────────────────────────
// Comment bodies are rendered via the shared `renderContent()` from
// catalyst-ds/comments/Comment.tsx, fed with the live people roster + the
// viewer's profile id. That delegates @mention parsing to parseMentions
// (longest-match against the roster) and emits the canonical
// <CatalystMention> chip — same DOM contract as Description / Comments.
// No bespoke regex / MentionChip lives in this file any more.

// ─── Utilities ──────────────────────────────────────────────────────────────

/**
 * Full relative-time formatter — G-04 Jira parity (DOM probe 2026-05-29).
 * Jira shows "4 days ago", "2 hours ago" etc., NOT the abbreviated "4d"/"2h".
 * "yesterday" is kept as Jira renders it that way for the day-1 bucket.
 * Returns "earlier" on any parse failure — never throws in the render path.
 */
function formatRelativeTimestamp(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 'earlier';
  const diffMs = Date.now() - then;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'just now';
  if (diffMin === 1) return '1 minute ago';
  if (diffMin < 60) return `${diffMin} minutes ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH === 1) return '1 hour ago';
  if (diffH < 24) return `${diffH} hours ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return 'yesterday';
  if (diffD < 7) return `${diffD} days ago`;
  const diffW = Math.floor(diffD / 7);
  if (diffW === 1) return '1 week ago';
  if (diffW < 5) return `${diffW} weeks ago`;
  const diffMo = Math.floor(diffD / 30);
  if (diffMo === 1) return '1 month ago';
  if (diffMo < 12) return `${diffMo} months ago`;
  const diffY = Math.floor(diffD / 365);
  return diffY === 1 ? '1 year ago' : `${diffY} years ago`;
}

/**
 * Absolute timestamp for the meta row `title` attribute.
 * Jira parity: "May 17, 2026 at 3:43 PM" (hover tooltip on the relative time).
 */
function formatAbsoluteTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '';
  }
}
