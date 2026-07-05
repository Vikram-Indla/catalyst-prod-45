import React from 'react';
import Badge from '@atlaskit/badge';
import { PresenceAvatar } from '../shared/PresenceAvatar';
import { HeadphonesIcon } from '../shared/Icon';
import { formatRowTimestamp } from '../../lib/formatTimestamp';
import type { ChatConversation } from '@/types/chat';

interface DmRichRowProps {
  conversation: ChatConversation;
  isActive: boolean;
  onClick: () => void;
  hasHuddle?: boolean;
}

/**
 * Slack-style DM list row used by the dedicated Direct messages tab.
 * Layout: stacked avatar(s) | name (full names for groups) + last-message preview | timestamp.
 */
export function DmRichRow({ conversation, isActive, onClick, hasHuddle = false }: DmRichRowProps) {
  const {
    title,
    lastMessageAt,
    lastMessagePreview,
    unreadCount,
    kind,
    dmAvatarUrls,
    dmMemberNames,
    isMuted,
  } = conversation;
  // Muted DMs never bold or badge — mute means "stop drawing my attention".
  const hasUnread = unreadCount > 0 && !isMuted;
  const isGroup = kind === 'group_dm';
  const displayTitle = isGroup && dmMemberNames && dmMemberNames.length > 0
    ? dmMemberNames.join(', ')
    : title;
  const preview = lastMessagePreview ?? '';
  const ts = formatRowTimestamp(lastMessageAt);

  return (
    <button
      type="button"
      onClick={onClick}
      data-cv2-active={isActive || undefined}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
        width: '100%',
        padding: '8px 8px',
        background: isActive ? 'var(--cv2-bg-row-active)' : 'transparent',
        border: 'none',
        borderRadius: 'var(--cv2-radius-md)',
        textAlign: 'left',
        cursor: 'pointer',
        transition: 'background var(--cv2-transition-fast)',
        position: 'relative',
        minWidth: 0,
        // Huddle bar (success) wins over the active accent bar — never both.
        ...(hasHuddle
          ? { boxShadow: 'inset 3px 0 0 0 var(--ds-icon-success)' }
          : isActive
          ? { boxShadow: 'inset 3px 0 0 0 var(--cv2-accent)' }
          : null),
      }}
      onMouseEnter={e => {
        if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--cv2-bg-row-hover)';
      }}
      onMouseLeave={e => {
        if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent';
      }}
    >
      <AvatarStack
        urls={dmAvatarUrls ?? []}
        names={dmMemberNames ?? [title]}
        isGroup={isGroup}
      />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, minWidth: 0 }}>
          <span
            style={{
              flex: 1,
              minWidth: 0,
              fontFamily: 'var(--cv2-font)',
              font: 'var(--ds-font-body)',
              fontWeight: hasUnread ? 700 : 700,
              color: 'var(--cv2-text-strong)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              whiteSpace: 'normal',
              wordBreak: 'break-word',
              lineHeight: 1.25,
            }}
          >
            {displayTitle}
          </span>
          {hasHuddle && (
            <span aria-label="Active huddle" title="Active huddle" style={{ marginLeft: 4, color: 'var(--ds-icon-success)', display: 'inline-flex', flex: '0 0 auto' }}>
              <HeadphonesIcon size={12} />
            </span>
          )}
          {ts && (
            <span
              style={{
                flex: '0 0 auto',
                fontFamily: 'var(--cv2-font)',
                font: 'var(--ds-font-body-small)',
                color: hasUnread ? 'var(--cv2-text-strong)' : 'var(--cv2-text-muted)',
                whiteSpace: 'nowrap',
              }}
            >
              {ts}
            </span>
          )}
        </div>
        {preview && (
          <div
            dir="auto"
            style={{
              fontFamily: 'var(--cv2-font)',
              font: 'var(--ds-font-body-small)',
              color: hasUnread ? 'var(--cv2-text)' : 'var(--cv2-text-muted)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              minWidth: 0,
            }}
          >
            {preview}
          </div>
        )}
      </div>
      {hasUnread && (
        <span aria-label={`${unreadCount} unread`} style={{ position: 'absolute', top: 10, right: 10 }}>
          <Badge appearance="important">{unreadCount}</Badge>
        </span>
      )}
    </button>
  );
}

function AvatarStack({
  urls,
  names,
  isGroup,
}: {
  urls: string[];
  names: string[];
  isGroup: boolean;
}) {
  const size = 28;
  const stackSize = 22;
  if (!isGroup) {
    return (
      <PresenceAvatar
        name={names[0] ?? ''}
        size={size}
        presence={null}
      />
    );
  }
  const a = { url: urls[0] ?? null, name: names[0] ?? '' };
  const b = { url: urls[1] ?? null, name: names[1] ?? '' };
  return (
    <div style={{ position: 'relative', width: size, height: size, flex: '0 0 auto' }}>
      <div style={{ position: 'absolute', top: 0, left: 0 }}>
        <PresenceAvatar name={a.name} size={stackSize} presence={null} />
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          borderRadius: 6,
          padding: 0,
          background: 'var(--cv2-bg-sidebar)',
        }}
      >
        <PresenceAvatar name={b.name} size={stackSize} presence={null} />
      </div>
    </div>
  );
}
