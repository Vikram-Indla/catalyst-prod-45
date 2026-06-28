import { useState, useCallback, useMemo } from 'react';
import Lozenge from '@atlaskit/lozenge';
import { token } from '@atlaskit/tokens';
import CatalystAvatar from '@/components/shared/CatalystAvatar';
import ReactionBar from './ReactionBar';
import ReplyComposer from './ReplyComposer';
import type { DirectNotification } from '@/features/notifications/types';
import { formatRelativeTime } from '@/features/notifications/utils/date';
import { useChatPeople } from '@/hooks/chat/useChatPeople';
import { parseMentions } from '@/lib/mentions/parseMentions';
import { CatalystMention } from '@/components/shared/rich-text/mentions/CatalystMention';
import { useAuth } from '@/hooks/useAuth';
import { Star } from '@/lib/atlaskit-icons';
import { useStarredItemIds, useToggleStar } from '@/hooks/home/useStarredItems';
import { workItemStarType } from '@/lib/starType';

// ─── Section header icon ─────────────────────────────────────────────────────

function MentionSectionIcon() {
  return (
    <div
      style={{
        flexShrink: 0,
        width: 24,
        height: 24,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--ds-background-discovery)',
        borderRadius: 4,
      }}
    >
      {/* @atlaskit/icon equivalent: comment-icon or mention glyph */}
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="2" y="3" width="20" height="14" rx="2" stroke="var(--ds-icon-discovery)" strokeWidth="1.8"/>
        <path d="M8 8h8M8 11.5h5" stroke="var(--ds-icon-discovery)" strokeWidth="1.8" strokeLinecap="round"/>
        <path d="M6 17l3-3H20a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h2Z" fill="var(--ds-background-discovery)"/>
      </svg>
    </div>
  );
}

// ─── Work item type icon (inline, 16px) ──────────────────────────────────────

function EntityTypeIcon({ type }: { type: string }) {
  const t = (type ?? '').toLowerCase();
  // bookmark / page style — the spec shows a green bookmark
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      {t === 'bug' || t === 'qa bug' ? (
        <><rect width="16" height="16" rx="2" fill="var(--ds-background-danger-bold)"/><path d="M4 8.5l2 2 5-5" stroke="var(--ds-text-inverse)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"/></>
      ) : t === 'epic' ? (
        <><rect width="16" height="16" rx="2" fill="var(--ds-background-discovery-bold)"/><path d="M9.5 3L5.5 9h4L6.5 13l6-7H9l.5-3z" fill="var(--ds-text-inverse)"/></>
      ) : (
        /* default: page/bookmark = green */
        <><rect width="16" height="16" rx="2" fill="var(--ds-background-success-bold)"/><path d="M4 3h8v10l-4-2.5L4 13V3z" fill="var(--ds-text-inverse)"/></>
      )}
    </svg>
  );
}

// @mention chips are rendered via the canonical <CatalystMention> primitive
// (see shared/rich-text/mentions/CatalystMention.tsx) so notification cards
// look identical to chat messages and Description/Comment renderings.

// ─── Metadata line (Project · Key · Timestamp) ───────────────────────────────

function MetadataLine({
  projectName,
  issueKey,
  timestamp,
  isDark,
}: {
  projectName?: string;
  issueKey: string;
  timestamp: string;
  isDark: boolean;
}) {
  const color = isDark ? 'var(--ds-text-subtlest)' : token('color.text.subtlest', 'var(--ds-text-subtlest)');
  const items = [projectName, issueKey, formatRelativeTime(timestamp)].filter(Boolean) as string[];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        marginTop: 0,
        paddingInlineStart: 40, // 32px avatar + 12px gap
        fontFamily: 'var(--cp-font-body, inherit)',
        fontSize: 'var(--ds-font-size-200)',
        lineHeight: '16px',
        color,
      }}
    >
      {items.map((item, i) => (
        <span key={i} style={{ display: 'inline-flex', alignItems: 'center' }}>
          {i > 0 && (
            <span style={{ margin: '0 8px', userSelect: 'none' }} aria-hidden="true">·</span>
          )}
          {item}
        </span>
      ))}
    </div>
  );
}

// ─── Lozenge appearance mapping ───────────────────────────────────────────────

type LozengeAppearance = 'default' | 'inprogress' | 'success' | 'moved' | 'new' | 'removed';

function mapStatusAppearance(statusAppearance: string): LozengeAppearance {
  switch (statusAppearance) {
    case 'inprogress': return 'inprogress';
    case 'success':    return 'success';
    case 'moved':      return 'moved';
    case 'new':        return 'new';
    case 'removed':    return 'removed';
    default:           return 'default';
  }
}

// ─── Comment body with @mention parsing ──────────────────────────────────────

function CommentBody({ text, isDark }: { text: string; isDark: boolean }) {
  const color = isDark ? 'var(--ds-text)' : token('color.text', 'var(--ds-text)');

  // Roster-aware @mention parsing — supports names of any word count.
  // Longest-matches `@maria garcia lopez` as one mention even though it's
  // three words, because the parser checks the actual people roster. Each
  // matched mention renders via the canonical CatalystMention primitive so
  // the chip looks identical to the Description / Comment renderers.
  const { user } = useAuth();
  const currentUserId = user?.id ?? null;
  const { groups: peopleGroups } = useChatPeople();
  const roster = useMemo(
    () =>
      peopleGroups.flatMap((g) =>
        g.people.map((p) => ({ name: p.name, userId: p.profileId })),
      ),
    [peopleGroups],
  );
  const parts = parseMentions(text, roster);

  return (
    <p
      style={{
        margin: 0,
        fontFamily: 'var(--cp-font-body, inherit)',
        fontSize: 'var(--ds-font-size-400)',
        lineHeight: '20px',
        color,
      }}
    >
      {parts.map((part, i) =>
        part.type === 'mention' ? (
          <CatalystMention
            key={i}
            name={part.name}
            userId={part.userId}
            currentUserId={currentUserId}
          />
        ) : (
          <span key={i}>{part.value}</span>
        ),
      )}
    </p>
  );
}

// ─── Props ───────────────────────────────────────────────────────────────────

export interface MentionActivityCardProps {
  notification: DirectNotification;
  /** Project name shown in metadata line */
  projectName?: string;
  /** Current user's name/avatar for reply composer */
  currentUserName?: string;
  currentUserAvatarSrc?: string;
  onReact?: (notificationId: string, emoji: string) => void;
  onReply?: (notificationId: string, text: string) => void;
  onViewThread?: (notificationId: string) => void;
  onAiSuggest?: (notificationId: string) => void;
  onEntityClick?: (key: string) => void;
  isDark?: boolean;
}

// ─── Main card component ──────────────────────────────────────────────────────

export default function MentionActivityCard({
  notification,
  projectName,
  currentUserName = 'Me',
  currentUserAvatarSrc,
  onReact,
  onReply,
  onViewThread,
  onAiSuggest,
  onEntityClick,
  isDark = false,
}: MentionActivityCardProps) {
  const [showComposer, setShowComposer] = useState(false);

  const { actor, verb, target, thread, createdAt } = notification;

  // Star this work item into the unified store. The card has no row-hover
  // state, so the star is always present (subtle until starred, gold when on).
  const { data: starredIds } = useStarredItemIds();
  const toggleStar = useToggleStar();
  const isStarred = !!target.key && (starredIds?.has(target.key) ?? false);
  const handleToggleStar = useCallback((e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    if (!target.key) return;
    toggleStar.mutate({ itemId: target.key, itemType: workItemStarType(target.iconType), isCurrentlyStarred: isStarred });
  }, [target.key, target.iconType, isStarred, toggleStar]);

  const actorName = actor?.displayName ?? 'Someone';
  const actorAvatarUrl = actor?.avatarUrl ?? undefined;

  // Token-based colors
  const cardBg        = isDark ? 'var(--ds-surface-raised)' : token('color.background.card', 'var(--ds-surface)');
  const cardBorder    = isDark ? 'var(--ds-border)'          : token('color.border', 'var(--ds-border)');
  const primaryText   = isDark ? 'var(--ds-text)'            : token('color.text', 'var(--ds-text)');
  const subtleText    = isDark ? 'var(--ds-text-subtle)'     : token('color.text.subtle', 'var(--ds-text-subtle)');
  const linkColor     = isDark ? 'var(--ds-link)'            : token('color.link', 'var(--ds-link)');
  const threadBorder  = isDark ? 'var(--ds-border)'          : 'var(--ds-border)';

  const handleReply = useCallback(() => {
    setShowComposer(true);
  }, []);

  const handleSubmitReply = useCallback(
    (text: string) => {
      onReply?.(notification.id, text);
      setShowComposer(false);
    },
    [notification.id, onReply],
  );

  return (
    <div
      style={{
        background: cardBg,
        border: `1px solid ${cardBorder}`,
        borderRadius: 8,
        padding: 24,
        boxShadow: isDark
          ? 'var(--ds-shadow-raised, 0 2px 4px rgba(0,0,0,0.3))'
          : 'var(--ds-shadow-raised, 0 1px 1px rgba(9,30,66,0.08), 0 0 1px rgba(9,30,66,0.12))',
        fontFamily: 'var(--cp-font-body, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif)',
        transition: 'box-shadow 200ms ease',
      }}
    >
      {/* ── Section header ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
        <MentionSectionIcon />
        <div>
          <h3
            style={{
              margin: 0,
              fontSize: 'var(--ds-font-size-500)',
              fontWeight: 600,
              lineHeight: '20px',
              color: primaryText,
            }}
          >
            Reply to mentions
          </h3>
          <p
            style={{
              margin: '4px 0 0',
              fontSize: 'var(--ds-font-size-400)',
              fontWeight: 400,
              lineHeight: '20px',
              color: subtleText,
            }}
          >
            You were mentioned in a comment. See if you need to reply or action something.
          </p>
        </div>
      </div>

      {/* ── Activity row ───────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        {/* Actor avatar */}
        <div style={{ flexShrink: 0, marginTop: 0 }}>
          <CatalystAvatar
            name={actorName}
            src={actorAvatarUrl}
            size="medium"
            appearance="circle"
          />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Verb line: "[Actor] mentioned you on [EntityLink] [StatusPill]" */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 4,
              fontSize: 'var(--ds-font-size-400)',
              lineHeight: '20px',
              color: primaryText,
            }}
          >
            <span style={{ fontWeight: 600 }}>{actorName}</span>
            <span style={{ fontWeight: 400 }}>
              {verb === 'mentioned' ? 'mentioned you on' : 'commented on'}
            </span>

            {/* Entity link: icon + title (truncated) + StatusPill */}
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, maxWidth: '100%', minWidth: 0 }}>
              <EntityTypeIcon type={target.iconType} />
              <button
                type="button"
                onClick={() => onEntityClick?.(target.key)}
                style={{
                  fontFamily: 'inherit',
                  fontSize: 'var(--ds-font-size-400)',
                  fontWeight: 400,
                  lineHeight: '20px',
                  color: linkColor,
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  textDecoration: 'none',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: 320,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline'; }}
                onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none'; }}
                title={target.title}
              >
                {target.key}: {target.title}
              </button>
            </span>

            {/* Status pill — @atlaskit/lozenge */}
            {target.statusLabel && (
              <Lozenge
                appearance={mapStatusAppearance(target.statusAppearance)}
                isBold={false}
              >
                {target.statusLabel}
              </Lozenge>
            )}

            {/* Star → unified store. Pinned right; gold when starred. */}
            {target.key && (
              <span
                role="button"
                tabIndex={0}
                aria-label={isStarred ? 'Remove from starred' : 'Add to starred'}
                onClick={handleToggleStar}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleToggleStar(e); }}
                style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', cursor: 'pointer', flexShrink: 0 }}
              >
                <Star size={16} color="var(--ds-icon-accent-yellow)" fill={isStarred ? 'var(--ds-icon-accent-yellow)' : 'none'} />
              </span>
            )}
          </div>

          {/* Metadata line: Project · Key · Timestamp */}
          <MetadataLine
            projectName={projectName}
            issueKey={target.key}
            timestamp={createdAt}
            isDark={isDark}
          />

          {/* Thread comment body */}
          {thread && (
            <div
              style={{
                marginTop: 16,
                paddingInlineStart: 40, // align with text column
              }}
            >
              {/* Comment body with @mention highlighting */}
              {thread.commentPreview && (
                <div
                  style={{
                    marginBottom: 16,
                  }}
                >
                  <CommentBody text={thread.commentPreview} isDark={isDark} />
                </div>
              )}

              {/* Reaction bar */}
              <div
                style={{
                  border: `1px solid ${threadBorder}`,
                  borderRadius: 4,
                  padding: 8,
                  background: 'transparent',
                }}
              >
                <ReactionBar
                  reactions={thread.reactions}
                  onReact={(emoji) => onReact?.(notification.id, emoji)}
                  onReply={handleReply}
                  onViewThread={() => onViewThread?.(notification.id)}
                />
              </div>

              {/* Reply composer — shown after "Reply" is clicked */}
              {showComposer && (
                <ReplyComposer
                  avatarName={currentUserName}
                  avatarSrc={currentUserAvatarSrc}
                  onSubmit={handleSubmitReply}
                  onAiSuggest={onAiSuggest ? () => onAiSuggest(notification.id) : undefined}
                  isDark={isDark}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
