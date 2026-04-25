import { useState, useCallback } from 'react';
import type React from 'react';
import Avatar from '@atlaskit/avatar';
import { Box, xcss } from '@atlaskit/primitives';
import { token } from '@atlaskit/tokens';
import type { DirectNotification } from '../types';
import DirectWorkItemIcon from './DirectWorkItemIcon';
import { formatRelativeTime, getVerbText } from '../utils/date';

interface Props {
  notification: DirectNotification;
  isRead: boolean;
  onMarkRead: (id: string) => void;
  isDark: boolean;
}

const CONTENT_STYLE: React.CSSProperties = { flex: 1, minWidth: 0 };

const entityRowXcss = xcss({
  display: 'flex',
  alignItems: 'flex-start',
  gap: 'space.075',
  marginBlockStart: 'space.050',
});

const metaRowXcss = xcss({
  display: 'flex',
  alignItems: 'center',
  gap: 'space.075',
  marginBlockStart: 'space.050',
});

// ─── Emoji reaction emojis (canonical Jira set) ──────────────────────────────
const REACTION_EMOJIS = ['👍', '👏', '🔥', '❤️', '😊'];

export default function DirectNotificationRow({ notification, isRead, onMarkRead, isDark }: Props) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);

  const actorName = notification.actor?.displayName ?? null;
  const verbText  = getVerbText(notification.verb, actorName);
  const relTime   = formatRelativeTime(notification.createdAt);
  const { target, aggregation, thread } = notification;

  const hoverBg  = isDark ? '#1F1F1F' : token('color.background.neutral.hovered', 'rgba(9,30,66,0.06)');
  const pressBg  = isDark ? '#292929' : token('color.background.neutral.pressed',  'rgba(9,30,66,0.10)');
  const rowBg    = pressed ? pressBg : hovered ? hoverBg : 'transparent';

  const text1    = isDark ? '#EDEDED' : token('color.text',           '#172B4D');
  const text2    = isDark ? '#A1A1A1' : token('color.text.subtle',    '#626F86');
  const text3    = isDark ? '#878787' : token('color.text.subtlest',  '#8590A2');
  const linkClr  = isDark ? '#6698FF' : token('color.link',           '#0C66E4');
  const dotColor = '#2563EB';

  const threadBorderColor = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(11,18,14,0.14)';
  const threadBg          = 'transparent';

  const handleClick = useCallback(() => {
    if (!isRead) onMarkRead(notification.id);
  }, [isRead, notification.id, onMarkRead]);

  const handleMarkReadBtn = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onMarkRead(notification.id);
  }, [notification.id, onMarkRead]);

  // Build avatar src — prefer real avatar_url, fall back to undefined (shows initials)
  const avatarSrc = notification.actor?.avatarUrl ?? undefined;

  return (
    <button
      type="button"
      aria-label={`Notification: ${verbText} ${target.title}`}
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false); }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick(); }
        if ((e.key === 'r' || e.key === 'R') && !isRead) onMarkRead(notification.id);
      }}
      style={{
        display: 'flex',
        width: '100%',
        padding: '8px 16px 10px',
        background: rowBg,
        border: 'none',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'background-color 150ms ease',
        outline: 'none',
        gap: 10,
        alignItems: 'flex-start',
        opacity: isRead ? 0.85 : 1,
      }}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
    >
      {/* Avatar — with real face photo when available */}
      <div style={{ flexShrink: 0, marginTop: 2 }}>
        <Avatar
          name={actorName ?? 'System'}
          size="large"
          appearance="circle"
          src={avatarSrc}
        />
      </div>

      {/* Text content */}
      <Box style={CONTENT_STYLE}>
        {/* Verb + timestamp row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <span
            style={{
              fontFamily: 'var(--ds-font-family-body)',
              fontSize: 14,
              lineHeight: '20px',
              color: text1,
              flex: 1,
              minWidth: 0,
            }}
          >
            {actorName && (
              <span style={{ fontWeight: 600 }}>{actorName} </span>
            )}
            <span style={{ fontWeight: 500 }}>
              {actorName
                ? verbText.replace(`${actorName} `, '')
                : verbText}
            </span>
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <span
              style={{
                fontFamily: 'var(--ds-font-family-body)',
                fontSize: 14,
                color: text3,
                whiteSpace: 'nowrap',
              }}
            >
              {relTime}
            </span>

            {/* Unread dot — swap to mark-read button on hover */}
            {!isRead && !hovered && (
              <div
                aria-label="Unread"
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: dotColor,
                  flexShrink: 0,
                }}
              />
            )}
            {!isRead && hovered && (
              <button
                type="button"
                onClick={handleMarkReadBtn}
                title="Mark as read"
                aria-label="Mark as read"
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  border: `1.5px solid ${text3}`,
                  background: 'transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                  flexShrink: 0,
                }}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                  <path d="M1.5 5L4 7.5L8.5 2.5" stroke={text2} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Work item icon + title */}
        <Box xcss={entityRowXcss}>
          <div style={{ flexShrink: 0, display: 'flex' }}>
            <DirectWorkItemIcon type={target.iconType} />
          </div>
          <span
            style={{
              fontFamily: 'var(--ds-font-family-body)',
              fontSize: 14,
              lineHeight: '20px',
              color: text1,
              flex: 1,
              minWidth: 0,
            }}
          >
            {target.title}
          </span>
        </Box>

        {/* Key + status — plain text like Jira (no Lozenge) */}
        <Box xcss={metaRowXcss}>
          <span
            style={{
              fontFamily: 'var(--ds-font-family-body)',
              fontSize: 14,
              fontWeight: 400,
              color: linkClr,
              flexShrink: 0,
            }}
          >
            {target.key}
          </span>
          <span style={{ color: text3, fontSize: 14, lineHeight: '20px', flexShrink: 0 }}>•</span>
          {/* Plain grey status text — sentence case, matching Jira */}
          <span
            style={{
              fontFamily: 'var(--ds-font-family-body)',
              fontSize: 14,
              fontWeight: 400,
              color: text2,
              flexShrink: 0,
            }}
          >
            {target.statusLabel}
          </span>
        </Box>

        {/* Thread preview card — shown when notification has a comment thread */}
        {thread && (
          <div
            style={{
              marginTop: 8,
              padding: '8px 10px',
              borderRadius: 4,
              border: `1px solid ${threadBorderColor}`,
              background: threadBg,
            }}
          >
            {/* Comment preview text (or placeholder when preview not yet stored) */}
            {thread.commentPreview ? (
              <p
                style={{
                  margin: 0,
                  fontFamily: 'var(--ds-font-family-body)',
                  fontSize: 14,
                  lineHeight: '20px',
                  color: text1,
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical' as const,
                }}
              >
                {thread.commentPreview}
              </p>
            ) : (
              <p
                style={{
                  margin: 0,
                  fontFamily: 'var(--ds-font-family-body)',
                  fontSize: 14,
                  lineHeight: '20px',
                  color: text3,
                  fontStyle: 'italic',
                }}
              >
                View the full thread for context
              </p>
            )}

            {/* Reactions + Reply + View thread */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                marginTop: 6,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Emoji reactions */}
              {REACTION_EMOJIS.map(emoji => {
                const count = thread.reactions[emoji] ?? 0;
                return (
                  <button
                    key={emoji}
                    type="button"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      padding: '2px 5px',
                      borderRadius: 10,
                      border: `1px solid ${threadBorderColor}`,
                      background: count > 0
                        ? (isDark ? '#292929' : 'rgba(37,99,235,0.06)')
                        : 'transparent',
                      cursor: 'pointer',
                      fontFamily: 'var(--ds-font-family-body)',
                      fontSize: 11,
                      color: text2,
                      lineHeight: '16px',
                    }}
                    title={`React with ${emoji}`}
                    aria-label={`${emoji} reaction${count > 0 ? `, ${count}` : ''}`}
                  >
                    <span style={{ fontSize: 12, lineHeight: 1 }}>{emoji}</span>
                    {count > 0 && (
                      <span style={{ fontWeight: 500 }}>{count}</span>
                    )}
                  </button>
                );
              })}

              {/* Add reaction */}
              <button
                type="button"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 22,
                  height: 22,
                  borderRadius: 10,
                  border: `1px solid ${threadBorderColor}`,
                  background: 'transparent',
                  cursor: 'pointer',
                  color: text3,
                  fontSize: 13,
                  lineHeight: 1,
                  padding: 0,
                }}
                title="Add reaction"
                aria-label="Add reaction"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2"/>
                  <path d="M4 7c.5.8 1.5 1.3 2 1.3s1.5-.5 2-1.3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                  <circle cx="4.5" cy="4.5" r=".7" fill="currentColor"/>
                  <circle cx="7.5" cy="4.5" r=".7" fill="currentColor"/>
                </svg>
              </button>

              {/* Spacer */}
              <div style={{ flex: 1 }} />

              {/* Reply */}
              <button
                type="button"
                style={{
                  fontFamily: 'var(--ds-font-family-body)',
                  fontSize: 12,
                  fontWeight: 500,
                  color: linkClr,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0 4px',
                  lineHeight: '16px',
                }}
              >
                Reply
              </button>

              {/* View thread */}
              <button
                type="button"
                style={{
                  fontFamily: 'var(--ds-font-family-body)',
                  fontSize: 12,
                  fontWeight: 500,
                  color: linkClr,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0 4px',
                  lineHeight: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                }}
              >
                View thread
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                  <path d="M2 5h6M5.5 2.5L8 5l-2.5 2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Aggregation row (multiple updates from same person) */}
        {aggregation && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
            <Avatar name={aggregation.actor.displayName} size="xsmall" appearance="circle" src={aggregation.actor.avatarUrl ?? undefined} />
            <span
              style={{
                fontFamily: 'var(--ds-font-family-body)',
                fontSize: 14,
                fontWeight: 400,
                color: linkClr,
              }}
            >
              +{aggregation.count} update{aggregation.count !== 1 ? 's' : ''} from {aggregation.actor.displayName}
            </span>
          </div>
        )}
      </Box>
    </button>
  );
}
