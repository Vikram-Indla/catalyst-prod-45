/**
 * RecommendedPanel — the default For You tab.
 *
 * Jira parity (from /jira-compare 2026-04-24 — RecommendedPanel probe):
 * The Recommended tab is a two-section surface.
 *
 *   Section A — "Reply to mentions"
 *   ────────────────────────────────
 *   • H4 header "Reply to mentions" (Inter 600 16/20, color.text) + subtitle
 *     ("You were mentioned in a comment. See if you need to reply or action
 *     something.")
 *   • Transparent container — no card border, no shadow. It's a section,
 *     not a bordered card.
 *   • One row per mention (1142×142 in Jira's DOM):
 *       - 32×32 CIRCULAR avatar of the mentioner (NOT square — square is
 *         the project card treatment). Atlaskit Avatar default shape is
 *         circle.
 *       - Text format: "<Mentioner> mentioned you on <issueType icon>
 *         <issue key · issue summary>"
 *       - Comment body preview (truncated to a single line in our Catalyst
 *         treatment — Jira has a multi-line preview with emoji reactions;
 *         we ship the simpler one-liner first and iterate).
 *       - Relative timestamp at the row tail.
 *       - Clicking the row opens the same detail panel the list rows use
 *         (we resolve the WorkItem by issueKey against the items prop).
 *
 *   Section B — Recommended work
 *   ────────────────────────────
 *   Unchanged: the usual recency-grouped list of ForYouRow primitives —
 *   this is the "you should look at this next" fallback seeded from the
 *   user's assigned queue.
 *
 * House divergences from Jira (accepted):
 *   • Fonts: Inter/Sora instead of Atlassian Sans (CLAUDE.md §1).
 *   • Section B label is "Recommended" (Jira uses the whole-page tab name).
 *   • No emoji-reaction bar on the mention row (Catalyst doesn't sync
 *     emoji reactions from Jira).
 */
import React, { useMemo } from 'react';
import { token } from '@atlaskit/tokens';
import Avatar from '@atlaskit/avatar';
import Tooltip from '@atlaskit/tooltip';
import ForYouRow from './ForYouRow';
import { ForYouEmptyState, GroupHeading, groupByRecency } from './helpers';
import WorkItemIcon, { normalizeIconType } from '@/components/shared/WorkItemIcon';
import { resolveAvatarUrl } from '@/lib/avatars';
import type { WorkItem, RecommendedMention } from '@/hooks/useForYouData';

interface RecommendedPanelProps {
  items: WorkItem[];
  mentions: RecommendedMention[];
  isLoading: boolean;
  onSelect: (item: WorkItem) => void;
  onToggleStar: (id: string) => void;
}

export default function RecommendedPanel({
  items,
  mentions,
  isLoading,
  onSelect,
  onToggleStar,
}: RecommendedPanelProps) {
  // Index items by issueKey so a mention row can hand back the same
  // WorkItem object when opening the detail panel — keeps the click
  // behaviour identical to the list below.
  const itemByKey = useMemo(() => {
    const m = new Map<string, WorkItem>();
    items.forEach(i => m.set(i.key, i));
    return m;
  }, [items]);

  if (isLoading) {
    return (
      <div style={{ padding: 24, color: token('color.text.subtle', '#626F86') }}>Loading…</div>
    );
  }

  if (items.length === 0 && mentions.length === 0) {
    return (
      <ForYouEmptyState
        title="Nothing recommended yet"
        description="When teammates mention you or you pick up work, recommendations will show here."
      />
    );
  }

  const groups = groupByRecency(items, ['TODAY', 'YESTERDAY', 'LAST_WEEK', 'LAST_MONTH', 'EARLIER']);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {mentions.length > 0 && (
        <MentionsSection
          mentions={mentions}
          onSelect={(key) => {
            const target = itemByKey.get(key);
            if (target) onSelect(target);
          }}
        />
      )}

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

// ─── Mentions section ───────────────────────────────────────────────────────

function MentionsSection({
  mentions,
  onSelect,
}: {
  mentions: RecommendedMention[];
  onSelect: (issueKey: string) => void;
}) {
  return (
    <section
      aria-label="Reply to mentions"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        marginBlockEnd: 24,
      }}
    >
      <h2
        style={{
          font: `600 16px/20px "Inter", system-ui, sans-serif`,
          color: token('color.text', '#292A2E'),
          margin: 0,
        }}
      >
        Reply to mentions
      </h2>
      <p
        style={{
          font: `400 14px/20px "Inter", system-ui, sans-serif`,
          color: token('color.text', '#292A2E'),
          margin: 0,
          marginBlockEnd: 8,
        }}
      >
        You were mentioned in a comment. See if you need to reply or action something.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {mentions.map(m => (
          <MentionRow key={m.commentId} mention={m} onClick={() => onSelect(m.issueKey)} />
        ))}
      </div>
    </section>
  );
}

// ─── Single mention row ─────────────────────────────────────────────────────
//
// Layout (Jira DOM ground truth, April 2026):
//
//   ┌──────────────────────────────────────────────────────────────────┐
//   │ [32 avatar]  Mentioner mentioned you on [16 icon] KEY summary    │
//   │              "Comment body preview truncated to one line…"       │
//   │                                                         12h ago  │
//   └──────────────────────────────────────────────────────────────────┘
//
// Hover surfaces a faint neutral bg so the row reads as a clickable
// jump target. Keyboard handlers mirror the pattern in ForYouRow.

function MentionRow({ mention, onClick }: { mention: RecommendedMention; onClick: () => void }) {
  const [hover, setHover] = React.useState(false);
  // Avatar src: prefer the profile avatar_url from Supabase, fall back to
  // the project-wide avatar resolver (local .png assets), else let
  // Atlaskit render hashed initials from the name.
  const avatarSrc = mention.mentionerAvatarUrl || resolveAvatarUrl(mention.mentionerName) || undefined;
  const relative = formatRelativeTimestamp(mention.commentCreatedAt);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-label={`${mention.mentionerName} mentioned you on ${mention.issueKey} ${mention.issueSummary}`}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '12px 12px',
        borderRadius: 4,
        cursor: 'pointer',
        backgroundColor: hover
          ? token('elevation.surface.hovered', '#F0F1F2')
          : 'transparent',
        transition: 'background-color 150ms ease',
        outline: 'none',
        minWidth: 0,
      }}
    >
      {/* Circular 32px mentioner avatar — Jira parity.
          Note: @atlaskit/avatar defaults to a circle; we don't pass
          appearance="square" here on purpose (square is reserved for the
          project card strip above the tab bar). */}
      <Tooltip content={mention.mentionerName}>
        <span style={{ flexShrink: 0 }}>
          <Avatar size="medium" name={mention.mentionerName} src={avatarSrc} />
        </span>
      </Tooltip>

      {/* Text column */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div
          style={{
            font: `400 14px/20px "Inter", system-ui, sans-serif`,
            color: token('color.text', '#292A2E'),
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            flexWrap: 'wrap',
            minWidth: 0,
          }}
        >
          <span style={{ fontWeight: 600 }}>{mention.mentionerName}</span>
          <span style={{ color: token('color.text.subtle', '#505258') }}>mentioned you on</span>
          {/* Inline 16×16 work-item type icon (CLAUDE.md §11 — canonical only). */}
          <span style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
            <WorkItemIcon type={normalizeIconType(mention.issueType)} size={16} />
          </span>
          <span
            style={{
              font: `500 14px/20px "Inter", system-ui, sans-serif`,
              color: token('color.text', '#292A2E'),
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              minWidth: 0,
            }}
          >
            <span
              style={{
                font: `500 12px/20px "JetBrains Mono", ui-monospace, monospace`,
                color: token('color.text.subtlest', '#8590A2'),
                marginInlineEnd: 6,
              }}
            >
              {mention.issueKey}
            </span>
            {mention.issueSummary}
          </span>
        </div>
        {/* Comment body preview — 1 line, ellipsised. We strip Jira
            mention markup (e.g. "[~accountid:xyz]") to keep the preview
            readable; the full body is available in the detail panel. */}
        <div
          style={{
            font: `400 13px/18px "Inter", system-ui, sans-serif`,
            color: token('color.text.subtle', '#505258'),
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            minWidth: 0,
          }}
        >
          {stripMentionMarkup(mention.commentBody)}
        </div>
      </div>

      {/* Timestamp — Jira anchors this at the row tail in subtle text. */}
      <div
        style={{
          font: `400 12px/16px "Inter", system-ui, sans-serif`,
          color: token('color.text.subtle', '#626F86'),
          flexShrink: 0,
          paddingBlockStart: 2,
        }}
      >
        {relative}
      </div>
    </div>
  );
}

// ─── Utilities ──────────────────────────────────────────────────────────────

/**
 * Strip Jira "@mention" markup ("[~accountid:xyz]", "[~username]") from a
 * raw comment body so the preview is readable. Leaves the rest of the body
 * intact including punctuation and whitespace — just collapses runs of
 * whitespace so single-line rendering is tidy.
 */
function stripMentionMarkup(body: string): string {
  if (!body) return '';
  return body
    .replace(/\[~[^\]]+\]/g, '') // "[~accountid:xyz]" or "[~username]"
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Lightweight relative-time formatter. We mirror Jira's conventions:
 *   "just now" | "Xm" | "Xh" | "yesterday" | "Xd" | "Xw" | "Xmo" | "Xy"
 * and fall back to "earlier" for any parse failure so we never throw in
 * the render path.
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
