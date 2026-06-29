import React from 'react';
import { HashIcon, LockIcon, HeadphonesIcon } from '../shared/Icon';
import type { ChatConversation } from '@/types/chat';

interface ChannelRowProps {
  conversation: ChatConversation;
  isActive: boolean;
  onClick: () => void;
  hasHuddle?: boolean;
}

export function ChannelRow({ conversation, isActive, onClick, hasHuddle = false }: ChannelRowProps) {
  const { title, unreadCount, isPrivate } = conversation;
  const hasUnread = unreadCount > 0;
  return (
    <button
      type="button"
      onClick={onClick}
      data-cv2-active={isActive || undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        width: '100%',
        padding: '4px 12px 5px 30px',
        background: isActive ? 'var(--cv2-bg-row-active)' : 'transparent',
        border: 'none',
        textAlign: 'left',
        cursor: 'pointer',
        transition: 'background var(--cv2-transition-fast)',
        color: isActive
          ? 'var(--cv2-text-strong)'
          : hasUnread
          ? 'var(--cv2-text-strong)'
          : 'var(--cv2-text)',
        fontFamily: 'var(--cv2-font)',
        fontSize: 'var(--ds-font-size-400)',
        fontWeight: hasUnread || isActive ? 700 : 400,
        lineHeight: '24px',
        ...(hasHuddle ? { boxShadow: 'inset 3px 0 0 0 var(--ds-icon-success)' } : null),
      }}
      onMouseEnter={e => {
        if (!isActive) {
          (e.currentTarget as HTMLElement).style.background = 'var(--cv2-bg-row-hover)';
        }
      }}
      onMouseLeave={e => {
        if (!isActive) {
          (e.currentTarget as HTMLElement).style.background = 'transparent';
        }
      }}
    >
      <span
        aria-hidden="true"
        style={{ display: 'inline-flex', color: 'var(--cv2-text-subtle)' }}
      >
        {isPrivate ? <LockIcon size={14} /> : <HashIcon size={14} />}
      </span>
      <span
        style={{
          flex: 1,
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {title}
      </span>
      {hasHuddle && (
        <span aria-label="Active huddle" title="Active huddle" style={{ marginLeft: 4, color: 'var(--ds-icon-success)', display: 'inline-flex', flex: '0 0 auto' }}>
          <HeadphonesIcon size={12} />
        </span>
      )}
      {hasUnread && (
        <span
          aria-label={`${unreadCount} unread`}
          style={{
            minWidth: 16,
            height: 16,
            padding: '0 4px',
            borderRadius: 8,
            background: 'var(--cv2-unread)',
            color: 'var(--ds-text-inverse)',
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
