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
 *   • Fonts: Inter / Sora instead of Atlassian Sans.
 *   • No emoji reactions or Dismiss affordance (Catalyst doesn't track
 *     reactions, and Dismiss is a cross-surface pattern we'll land later).
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
import React, { useMemo, useRef, useState } from 'react';
import { token } from '@atlaskit/tokens';
import Avatar from '@atlaskit/avatar';
import Lozenge from '@atlaskit/lozenge';
import Spinner from '@atlaskit/spinner';

import Tooltip from '@atlaskit/tooltip';
import TextArea from '@atlaskit/textarea';
import EditIcon from '@atlaskit/icon/glyph/edit';
import EmojiAddIcon from '@atlaskit/icon/glyph/emoji-add';
import CrossIcon from '@atlaskit/icon/glyph/cross';
import { toast } from 'sonner';
import ForYouRow from './ForYouRow';
import { ForYouEmptyState, GroupHeading, groupByRecency, MentionSparkleArt } from './helpers';
import WorkItemIcon, { normalizeIconType } from '@/components/shared/WorkItemIcon';
import { resolveAvatarUrl } from '@/lib/avatars';
import { useWorkItemComments } from '@/hooks/useWorkItemComments';
import { useCommentReactions } from '@/hooks/useCommentReactions';
import { useGlobalSearchStore } from '@/store/globalSearchStore';
import { fetchFunction } from '@/integrations/supabase/functionsRouter';
import { supabase } from '@/integrations/supabase/client';
import type { WorkItem, RecommendedMention, RecommendedComment, TabType } from '@/hooks/useForYouData';

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
                  <HeadlineIssueTitle issueType={m.issueType} issueSummary={m.issueSummary} issueKey={m.issueKey} issueStatus={m.issueStatus} />
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
            }))}
            onOpen={resolveSelect}
            onDismiss={handleDismiss}
          />
        )}
        {hasComments && (
          <FeedSection
            label="Reply to comments"
            intro="Comments on work you care about. Follow up, reply, or acknowledge."
            currentUserName={currentUserName}
            rows={visibleComments.map(c => ({
              commentId: c.commentId,
              phCommentId: c.phCommentId,
              headline: (
                <>
                  <span style={{ color: token('color.text', '#292A2E'), fontWeight: 600 }}>{c.authorName}</span>
                  <span style={{ color: token('color.text.subtle', 'var(--cp-text-secondary, var(--cp-text-secondary, #44546F))'), fontWeight: 400 }}>{' '}commented on{' '}</span>
                  <HeadlineIssueTitle issueType={c.issueType} issueSummary={c.issueSummary} issueKey={c.issueKey} issueStatus={c.issueStatus} />
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
            }))}
            onOpen={resolveSelect}
            onDismiss={handleDismiss}
          />
        )}
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
}

function FeedSection({
  label,
  intro,
  rows,
  onOpen,
  onDismiss,
  currentUserName,
}: {
  label: string;
  intro: string;
  rows: FeedRow[];
  onOpen: (issueKey: string, fallback?: { issueId: string; issueType: string; projectKey: string }) => void;
  onDismiss: (commentId: string) => void;
  currentUserName?: string;
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
        padding: 16,
        background: token('elevation.surface', '#FFFFFF'),
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Category tile — Jira parity (DOM probe 2026-04-24):
            32×32 filled purple tile, radius 6, with a 16×16 inline
            speech-bubble icon (Atlassian SVG path) in near-black.
            Catalyst previously used an outlined @atlaskit/icon/glyph/comment
            in discovery purple, which read as a thin stroke rather than
            Jira's solid badge. This matches Jira's home-recommended-tab
            category-icon tile pixel-for-pixel. */}
        <PurpleCategoryTile />
        <h4
          style={{
            // CLAUDE.md 2026-05-12 — Jira section headers measure 16/20 with
            // weight 600 and `letter-spacing: normal`. The previous
            // `-0.003em` came from an out-of-spec H1 sweep and broke the
            // x-height alignment on the section row.
            font: `600 16px/20px "Inter", system-ui, sans-serif`,
            color: token('color.text', '#292A2E'),
            margin: 0,
            letterSpacing: 'normal',
          }}
        >
          {label}
        </h4>
      </div>
      <p
        style={{
          font: `400 14px/20px "Inter", system-ui, sans-serif`,
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
  // Local avatar files only — Jira/Gravatar CDN URLs are banned (CLAUDE.md §19)
  // and fail to load due to CORS. Priority: local slug match → Atlaskit initials fallback.
  const avatarSrc = resolveAvatarUrl(row.authorName) || undefined;
  const relative = formatRelativeTimestamp(row.commentCreatedAt);

  return (
    <div
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
      {/* 32px circular avatar of the author */}
      <Tooltip content={row.authorName}>
        <span style={{ flexShrink: 0, paddingBlockStart: 2 }}>
          <Avatar size="medium" name={row.authorName} src={avatarSrc} />
        </span>
      </Tooltip>

      {/* Dismiss (X) — Jira parity: top-right of every feed row.
          24×24 subtle icon button that clears the row from the feed and
          persists the dismissal to localStorage. Resting state stays
          hidden; becomes visible on row hover OR keyboard focus on the
          button itself (WCAG 2.4.7 — opacity:0 elements that remain in
          the tab order are inaccessible). */}
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
            opacity: hover || dismissFocused ? 1 : 0,
            transition: 'opacity 120ms ease, background-color 120ms ease, box-shadow 120ms ease',
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

      {/* Text column takes the full remaining width. */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2, paddingInlineEnd: 28 }}>
        {/* Clickable headline: opens the detail modal. */}
        <button
          type="button"
          onClick={onOpen}
          style={{
            all: 'unset',
            cursor: 'pointer',
            font: `400 14px/20px "Inter", system-ui, sans-serif`,
            color: token('color.text', '#292A2E'),
            textAlign: 'start',
            wordBreak: 'break-word',
          }}
        >
          {row.headline}
        </button>

        {/* Meta row: Project · KEY · timestamp — all 12/16/400 subtle
            (Jira parity: flat weight, color-only hierarchy). */}
        <div
          style={{
            font: `400 12px/16px "Inter", system-ui, sans-serif`,
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
          <span>{relative}</span>
        </div>

        {/* Comment body — full text with @-chips rendered inline.
            Bumped from 13/18 to 14/20 to match Jira's For You card body
            and to read at the same density as the headline above it. */}
        <div
          style={{
            font: `400 14px/20px "Inter", system-ui, sans-serif`,
            color: token('color.text.subtle', 'var(--cp-text-secondary, var(--cp-text-secondary, #44546F))'),
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            marginBlockStart: 2,
          }}
        >
          {renderCommentWithMentions(row.commentBody)}
        </div>

        {/* Emoji reactions — Jira parity (DOM probe: data-testid="render-reactions").
            Each chip is 37×24 with a 0.556px border and radius 4. Persisted
            against `ph_comment_reactions.comment_id` → `ph_comments.id` UUID.
            When phCommentId is null (no ph_comments row yet), ReactionStrip
            creates the row on first click via on-demand upsert so the chips
            are always interactive. */}
        <ReactionStrip
          phCommentId={row.phCommentId}
          jiraCommentId={row.commentId}
          issueId={row.issueId}
          commentBody={row.commentBody}
        />

        {/* Reply composer — Jira parity:
             Row 1: 32px viewer avatar + a bordered textarea wrapper with
             "Leave a reply" placeholder. Submits via useWorkItemComments.
             Row 2: subtle "Suggest a reply" pencil button (separate button
             below the bordered wrapper, outside the border, per Jira DOM).
        */}
        <ReplyComposer
          issueId={row.issueId}
          currentUserName={currentUserName}
          commentBody={row.commentBody}
          issueSummary={row.issueSummary}
          issueType={row.issueType}
          commenterName={row.authorName}
        />
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
        setSuggestionPhase('error');
        toast.error('Could not generate a suggestion. Try again.');
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

  const canSubmit = value.trim().length > 0 && !isCreating;

  // Await the mutation explicitly so a failed insert surfaces to the user
  // instead of silently clearing the textarea. The previous fire-and-forget
  // `createComment(value)` swallowed network/permission errors — the user
  // saw an empty textarea and believed the reply posted. Toast on error,
  // keep the draft so it can be retried without retyping.
  const handleSubmit = async () => {
    if (!canSubmit) return;
    const draft = value.trim();
    try {
      await createCommentAsync(draft);
      setValue('');
      setFocused(false);
    } catch (err) {
      // Keep draft + focus so the user can retry. createComment's own hook
      // already logs; here we only need user-facing feedback.
      toast.error('Could not post your reply. Try again.');
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
              font: `400 12px/16px "Inter", system-ui, sans-serif`,
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
                    font: `400 14px/20px "Inter", system-ui, sans-serif`,
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
                    font: `500 14px/20px "Inter", system-ui, sans-serif`,
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
                    font: `500 14px/20px "Inter", system-ui, sans-serif`,
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
                      font: `500 14px/20px "Inter", system-ui, sans-serif`,
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
                      font: `500 14px/20px "Inter", system-ui, sans-serif`,
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
                      font: `500 11px/14px "Inter", system-ui, sans-serif`,
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
                      font: `400 13px/20px "Inter", system-ui, sans-serif`,
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
                      font: `500 13px/20px "Inter", system-ui, sans-serif`,
                      color: token('color.text.subtle', '#505258'),
                    }}
                  >
                    Caty
                  </span>
                  {/* Catalyst favicon — the correct blue "C" brand mark.
                      Source: /public/favicon.svg (512×512 blue rounded rect + white C path).
                      RCA: prior SVG was a hand-rolled purple star — not the Catalyst brand. */}
                  <img
                    src="/favicon.svg"
                    alt="Catalyst"
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
          Button: 2px 12px padding, gap 6px per Jira DOM probe 2026-05-28. */}
      {(suggestionPhase === 'idle' || suggestionPhase === 'error') && (
        <SuggestReplyTile onSuggest={handleSuggestReply} />
      )}
    </div>
  );
}

// Suggest-a-reply hover tile — Jira parity measurements (DOM probe 2026-05-28):
//   Button padding snapped to grid: 4px 12px (Jira raw was off-grid, nearest = 4px)
//   Button gap: 8px (nearest on-grid to Jira's 6px raw)
//   Button color: rgb(80,82,88) = color.text.subtle
//   Tile padding: 8px (on-grid, nearest to Jira's raw 6px)
//   On hover tile bg: color.background.neutral.subtle.hovered
function SuggestReplyTile({ onSuggest }: { onSuggest: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      style={{
        marginBlockStart: 8,
        marginInlineStart: 34, /* 32 avatar + 2 nudge */
        display: 'inline-flex',
        padding: 8,
        borderRadius: 3,
        background: hover
          ? token('color.background.neutral.subtle.hovered', 'rgba(9,30,66,0.04)')
          : 'transparent',
        transition: 'background-color 120ms ease',
        alignSelf: 'flex-start',
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <button
        type="button"
        onClick={onSuggest}
        aria-label="Suggest a reply using AI"
        style={{
          all: 'unset',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '4px 12px',
          borderRadius: 3,
          font: `500 14px/20px "Inter", system-ui, sans-serif`,
          color: token('color.text.subtle', '#505258'),
          background: 'transparent',
          border: `1px solid ${token('color.border', '#DFE1E6')}`,
        }}
      >
        <EditIcon label="" size="small" primaryColor="currentColor" />
        Suggest a reply
      </button>
    </div>
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

// Which char to render for a given emoji key — falls back to the raw key if
// a custom reaction shows up that isn't in the default starter set.
const EMOJI_CHAR: Record<string, string> = Object.fromEntries(
  DEFAULT_REACTIONS.map(r => [r.key, r.char])
);

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
      const { data, error } = await (supabase as any)
        .from('ph_comments')
        .upsert(
          { work_item_id: issueUuid, body: commentBody || '', jira_comment_id: jiraCommentId },
          { onConflict: 'jira_comment_id', ignoreDuplicates: false }
        )
        .select('id')
        .single();
      if (error) throw error;
      setResolvedId(data.id);
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
      {/* Trigger chip — Jira parity: 32×24 with emoji-add glyph. */}
      <button
        type="button"
        aria-label="Add reaction"
        onClick={() => handleReact('party')}
        disabled={!isAvailable}
        style={{
          all: 'unset',
          cursor: isAvailable ? 'pointer' : 'not-allowed',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 32,
          height: 24,
          border: `1px solid ${chipBorder}`,
          borderRadius: 4,
          color: token('color.text.subtle', '#626F86'),
          background: 'transparent',
          transition: 'background-color 120ms ease',
          opacity: 1,
        }}
      >
        <EmojiAddIcon label="" size="small" primaryColor="currentColor" />
      </button>
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

function HeadlineIssueTitle({
  issueType,
  issueSummary,
  issueKey,
  issueStatus,
}: {
  issueType: string;
  issueSummary: string;
  issueKey?: string;
  issueStatus?: string;
}) {
  return (
    // Jira parity: issue reference renders as an Atlaskit `inline-card-resolved-view`
    // DOM probe 2026-05-29 on digital-transformation.atlassian.net/jira/for-you:
    //   hairline border (color.border token), borderRadius 4, white surface bg.
    // The bordered pill is the "grey border on the ticket" the user sees in Jira.
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      verticalAlign: 'middle',
      flexWrap: 'wrap',
      border: `1px solid ${token('color.border', 'rgba(11, 18, 14, 0.14)')}`,
      borderRadius: 4,
      backgroundColor: token('elevation.surface', '#FFFFFF'),
      padding: '0px 4px',
    }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
        <WorkItemIcon type={normalizeIconType(issueType)} size={16} />
      </span>
      {/* Jira parity: entity title renders as a blue link with KEY prefix.
          DOM probe 2026-05-28: Jira shows "KEY: TITLE" in link color. */}
      <span style={{ fontWeight: 400, color: token('color.link', '#0052CC') }}>
        {issueKey ? `${issueKey}: ` : ''}{issueSummary}
      </span>
      {/* Jira parity: status lozenge displayed inline after the entity title.
          Renders as a default grey pill (DOM probe: bg rgb(221,222,225)). */}
      {issueStatus && (
        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
          <Lozenge appearance="default">{issueStatus}</Lozenge>
        </span>
      )}
    </span>
  );
}

// ─── Comment body rendering (Jira @-chip parity) ────────────────────────────

/**
 * Render a comment body with @-mention pills. Two matchers run per line:
 *
 *   (1) CC detector — `\bcc:` / `\bCC:` appearing ANYWHERE in the line (not
 *       just at line start). Every token after `cc:` is rendered as a
 *       MentionChip, with "@" prepended when the raw text lacks it. This
 *       mirrors Jira's behavior: the ADF stores mentions as `[~accountid:…]`
 *       or prefixed displayName, but our `adfToPlainText` flattener in the
 *       edge-function drops the leading "@". Rendering cc-list tokens as
 *       pills unconditionally restores visual parity without a backfill.
 *
 *   (2) Default fallback — explicit `@Name` tokens elsewhere in the text
 *       become pills; everything else renders as plain text.
 *
 * Also strips Jira's legacy bracketed `[~accountid:xyz]` form which the
 * sync layer may still leave behind on old comments.
 *
 * CC matcher uses a word-boundary `\bcc\s*:` so it catches cases where `cc:`
 * follows punctuation with no space (e.g. `"Supported Service'.cc: vikram"`).
 */
function renderCommentWithMentions(body: string): React.ReactNode {
  if (!body) return null;

  // Strip ADF mention placeholders (e.g. "[~accountid:abc123]") the sync
  // layer may still leave behind on old comments.
  // Also collapse runs of 2+ blank lines into a single newline — the Jira ADF
  // plaintext flattener leaves double-newlines between paragraphs which balloon
  // card height without adding information.
  const deAdf = body
    .replace(/\[~[^\]]+\]/g, '')
    .replace(/\n{2,}/g, '\n')
    .trim();
  if (!deAdf) return null;

  // Pre-processor — normalize CC/@-mention variants left by the adfToPlainText
  // flattener in wh-jira-bulk-sync, which drops the `@` marker on the name
  // and the newline between `cc:` and the name in inconsistent ways.
  //
  // Observed patterns (DOM probe of Catalyst For You, 2026-04-24):
  //   Pattern A (SIMP-1699):  "…services sectionCC\nvikram indla"
  //                            (no space before CC, no colon after it,
  //                             name on the next line, lowercase name)
  //   Pattern B (SIMP-1706):  "…Service'.cc: \nvikram indla"
  //                            (punctuation→cc, colon present, trailing space
  //                             before newline, lowercase name)
  //
  // Target canonical form (what the cc: branch below expects on one line):
  //   "…prefix cc: @vikram indla"
  //
  // Two passes, both safe on bodies that already use the canonical form:
  //   (a) Insert a space before a smushed "CC"/"Cc" so "sectionCC" becomes
  //       "section CC" — required so pass (b)'s `\b` anchor sees CC as a
  //       standalone token.
  //   (b) Collapse any "cc" / "Cc" / "CC" followed by an OPTIONAL colon,
  //       any amount of whitespace including a newline, and the rest of
  //       the next line, into "cc: @<rest-of-line>". Capturing to `[^\n]+`
  //       (rather than a fixed token count) lets lowercase names, multi-
  //       word names, and "A and B" lists all survive — the downstream
  //       ccMatch splits on commas / semicolons / " and ".
  const cleaned = deAdf
    .replace(/([a-z0-9])(CC|Cc)\b/g, '$1 $2')
    .replace(/\b(?:CC|Cc|cc)\s*:?\s*\n+\s*([^\n]+)/g, (_, names: string) => {
      const trimmed = names.trim();
      return `cc: ${trimmed.startsWith('@') ? trimmed : '@' + trimmed}`;
    });

  const lines = cleaned.split(/\n/);

  return lines.map((line, lineIdx) => {
    // cc: detector — find the FIRST "cc:" / "CC:" with a word-boundary
    // (non-word char or start of string before "cc"). Everything up to the
    // marker is pre-text; everything after is assumed to be a name list.
    const ccMatch = line.match(/^(.*?)\b(cc|CC)\s*:\s*(.*)$/);
    if (ccMatch && ccMatch[3]) {
      const [, preText, ccLiteral, namesPart] = ccMatch;
      // Split the tail on commas, semicolons, or " and " — NOT on single
      // spaces, because display names like "vikram indla" contain a space.
      const nameTokens = namesPart
        .split(/\s*[,;]\s*|\s+and\s+/)
        .map(s => s.trim())
        .filter(Boolean);

      return (
        <React.Fragment key={`l${lineIdx}`}>
          {lineIdx > 0 ? '\n' : null}
          {preText ? renderInlineAtMentions(preText) : null}
          <span style={{ color: token('color.text.subtle', 'var(--cp-text-secondary, var(--cp-text-secondary, #44546F))') }}>{`${ccLiteral}: `}</span>
          {nameTokens.map((tok, j) => {
            const normalized = tok.startsWith('@') ? tok : `@${tok}`;
            return (
              <React.Fragment key={`cc-${lineIdx}-${j}`}>
                {j > 0 ? ' ' : null}
                <MentionChip label={normalized} />
              </React.Fragment>
            );
          })}
        </React.Fragment>
      );
    }

    // Default path — split on explicit "@Name" tokens.
    return (
      <React.Fragment key={`l${lineIdx}`}>
        {lineIdx > 0 ? '\n' : null}
        {renderInlineAtMentions(line)}
      </React.Fragment>
    );
  });
}

/**
 * Split a run of text on explicit `@Name` tokens, returning an array of
 * <MentionChip> + plain-text React nodes. Used for any text that isn't in a
 * `cc:` block.
 */
function renderInlineAtMentions(text: string): React.ReactNode[] {
  const parts = text.split(/(@[A-Za-z][A-Za-z'.-]*(?:\s+[A-Za-z][A-Za-z'.-]*)?)/g);
  return parts.map((part, i) => {
    if (part.startsWith('@')) {
      return <MentionChip key={`m${i}`} label={part} />;
    }
    return <React.Fragment key={`t${i}`}>{part}</React.Fragment>;
  });
}

function MentionChip({ label }: { label: string }) {
  // Jira parity — Atlaskit Lozenge-style @-mention chip.
  // Compact horizontal padding, 20px line-height to match parent comment body.
  // bg: color.background.neutral. Display-only (no hover-card yet).
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '0 4px',
        borderRadius: 20,
        background: token('color.background.neutral', 'rgba(5, 21, 36, 0.06)'),
        color: token('color.text.subtle', '#505258'),
        font: `400 14px/20px "Inter", system-ui, sans-serif`,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  );
}

// ─── Utilities ──────────────────────────────────────────────────────────────

/**
 * Compact relative-time formatter matching Jira's For You meta row:
 *   "just now" | "Xm" | "Xh" | "yesterday" | "Xd" | "Xw" | "Xmo" | "Xy"
 *
 * Replaces the previous verbose "X minutes ago / X hours ago" output, which
 * wasted meta-row width and forced wraps on long author names + project
 * names. "yesterday" stays spelled out because Jira renders it that way too.
 * Returns "earlier" on any parse failure — never throws in the render path.
 */
function formatRelativeTimestamp(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 'earlier';
  const diffMs = Date.now() - then;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return 'yesterday';
  if (diffD < 7) return `${diffD}d`;
  const diffW = Math.floor(diffD / 7);
  if (diffW < 5) return `${diffW}w`;
  const diffMo = Math.floor(diffD / 30);
  if (diffMo < 12) return `${diffMo}mo`;
  const diffY = Math.floor(diffD / 365);
  return `${diffY}y`;
}
