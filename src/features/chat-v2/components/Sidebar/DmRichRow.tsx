import React from 'react';
import { PresenceAvatar } from '../shared/PresenceAvatar';
import { formatRowTimestamp } from '../../lib/formatTimestamp';
import type { ChatConversation } from '@/types/chat';

interface DmRichRowProps {
  conversation: ChatConversation;
  isActive: boolean;
  onClick: () => void;
}

/**
 * Slack-style DM list row used by the dedicated Direct messages tab.
 * Layout: stacked avatar(s) | name (full names for groups) + last-message preview | timestamp.
 */
export function DmRichRow({ conversation, isActive, onClick }: DmRichRowProps) {
  const {
    title,
    lastMessageAt,
    lastMessagePreview,
    unreadCount,
    kind,
    dmAvatarUrls,
    dmMemberNames,
  } = conversation;
  const hasUnread = unreadCount > 0;
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
        gap: 10,
        width: '100%',
        padding: '10px 16px',
        background: isActive ? 'var(--cv2-bg-row-active)' : 'transparent',
        border: 'none',
        textAlign: 'left',
        cursor: 'pointer',
        transition: 'background var(--cv2-transition-fast)',
        position: 'relative',
        minWidth: 0,
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
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, minWidth: 0 }}>
          <span
            style={{
              flex: 1,
              minWidth: 0,
              fontFamily: 'var(--cv2-font)',
              fontSize: 14,
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
          {ts && (
            <span
              style={{
                flex: '0 0 auto',
                fontFamily: 'var(--cv2-font)',
                fontSize: 12,
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
            style={{
              fontFamily: 'var(--cv2-font)',
              fontSize: 13,
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
        <span
          aria-label={`${unreadCount} unread`}
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            minWidth: 18,
            height: 18,
            padding: '0 5px',
            borderRadius: 9,
            background: 'var(--cv2-unread)',
            color: 'var(--cv2-unread-text, #FFFFFF)',
            fontSize: 11,
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {unreadCount > 99 ? '99+' : unreadCount}
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
  const size = 36;
  const stackSize = 26;
  if (!isGroup) {
    return (
      <PresenceAvatar
        src={urls[0] ?? null}
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
        <PresenceAvatar src={a.url} name={a.name} size={stackSize} presence={null} />
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          borderRadius: 6,
          padding: 2,
          background: 'var(--cv2-bg-sidebar)',
        }}
      >
        <PresenceAvatar src={b.url} name={b.name} size={stackSize} presence={null} />
      </div>
    </div>
  );
}
