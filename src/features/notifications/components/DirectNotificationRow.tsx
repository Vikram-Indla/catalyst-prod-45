import { useState, useCallback } from 'react';
import type React from 'react';
import Avatar from '@atlaskit/avatar';
import Lozenge from '@atlaskit/lozenge';
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
  alignItems: 'center',
  gap: 'space.075',
  marginBlockStart: 'space.050',
  overflow: 'hidden',
});

const metaRowXcss = xcss({
  display: 'flex',
  alignItems: 'center',
  gap: 'space.075',
  marginBlockStart: 'space.050',
});

const aggRowXcss = xcss({
  display: 'flex',
  alignItems: 'center',
  gap: 'space.075',
  marginBlockStart: 'space.075',
});


export default function DirectNotificationRow({ notification, isRead, onMarkRead, isDark }: Props) {
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);

  const actorName = notification.actor?.displayName ?? null;
  const verbText  = getVerbText(notification.verb, actorName);
  const relTime   = formatRelativeTime(notification.createdAt);
  const { target, aggregation } = notification;

  const hoverBg  = isDark ? '#1F1F1F' : token('color.background.neutral.hovered', 'rgba(9,30,66,0.06)');
  const pressBg  = isDark ? '#292929' : token('color.background.neutral.pressed',  'rgba(9,30,66,0.10)');
  const rowBg    = pressed ? pressBg : hovered ? hoverBg : 'transparent';

  const text1    = isDark ? '#EDEDED' : token('color.text',           '#172B4D');
  const text2    = isDark ? '#A1A1A1' : token('color.text.subtle',    '#626F86');
  const text3    = isDark ? '#878787' : token('color.text.subtlest',  '#8590A2');
  const linkClr  = isDark ? '#6698FF' : token('color.link',           '#0C66E4');
  const dotColor = '#2563EB';

  const handleClick = useCallback(() => {
    if (!isRead) onMarkRead(notification.id);
  }, [isRead, notification.id, onMarkRead]);

  const handleMarkReadBtn = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onMarkRead(notification.id);
  }, [notification.id, onMarkRead]);

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
        padding: '10px 16px',
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
      {/* Avatar */}
      <div style={{ flexShrink: 0, marginTop: 2 }}>
        <Avatar
          name={actorName ?? 'System'}
          size="medium"
          appearance="circle"
        />
      </div>

      {/* Text content */}
      <Box style={CONTENT_STYLE}>
        {/* Verb + timestamp row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <span
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: 13,
              lineHeight: '18px',
              color: text1,
              flex: 1,
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {actorName && (
              <span style={{ fontWeight: 600 }}>{actorName} </span>
            )}
            <span style={{ fontWeight: 400 }}>
              {actorName
                ? verbText.replace(`${actorName} `, '')
                : verbText}
            </span>
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <span
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: 11,
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
              fontFamily: 'Inter, sans-serif',
              fontSize: 13,
              color: text1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1,
              minWidth: 0,
            }}
          >
            {target.title}
          </span>
        </Box>

        {/* Key + status lozenge */}
        <Box xcss={metaRowXcss}>
          <span
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: 12,
              fontWeight: 500,
              color: linkClr,
              flexShrink: 0,
            }}
          >
            {target.key}
          </span>
          <span style={{ color: text3, fontSize: 10, lineHeight: '16px', flexShrink: 0 }}>•</span>
          <Lozenge appearance={target.statusAppearance}>
            {target.statusLabel}
          </Lozenge>
        </Box>

        {/* Aggregation row */}
        {aggregation && (
          <Box xcss={aggRowXcss}>
            <div style={{ flexShrink: 0 }}>
              <Avatar name={aggregation.actor.displayName} size="xsmall" appearance="circle" />
            </div>
            <span
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: 12,
                color: linkClr,
              }}
            >
              +{aggregation.count} update from {aggregation.actor.displayName}
            </span>
          </Box>
        )}
      </Box>
    </button>
  );
}
