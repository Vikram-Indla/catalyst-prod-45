import React from 'react';
import { PresenceAvatar } from '../shared/PresenceAvatar';
import type { SentMessage } from '../../hooks/useMySentMessages';
import type { ChatConversation } from '@/types/chat';

interface SentRowProps {
  message: SentMessage;
  conversation?: ChatConversation;
  onClick: () => void;
  /** Suppresses the inter-row divider so it doesn't overlap with the
   *  enclosing group container's bottom border. */
  isLastInGroup?: boolean;
}

export function SentRow({ message, conversation, onClick, isLastInGroup = false }: SentRowProps) {
  const isChannel =
    message.conversationKind === 'channel' || message.conversationKind === 'custom_channel';
  const avatar = resolveAvatar(message, conversation);
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        textAlign: 'left',
        padding: '12px 14px',
        background: 'transparent',
        border: 'none',
        borderRadius: 0,
        cursor: 'pointer',
        fontFamily: 'var(--cv2-font)',
        color: 'var(--cv2-text)',
        borderBottom: isLastInGroup ? 'none' : '1px solid var(--cv2-border)',
        transition: 'background var(--cv2-transition-fast)',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.background = 'var(--cv2-bg-row-hover)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.background = 'transparent';
      }}
    >
      <PresenceAvatar
        src={avatar.src}
        name={avatar.name}
        size={36}
        displayLabel={avatar.displayLabel}
      />
      <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <span
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: 'var(--cv2-text)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {isChannel ? `# ${message.conversationTitle}` : message.conversationTitle}
        </span>
        <span
          style={{
            fontSize: 13,
            color: 'var(--cv2-text-subtle)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {message.bodyPreview || 'No content'}
        </span>
      </span>
      <span
        style={{
          flex: '0 0 auto',
          fontSize: 12,
          color: 'var(--cv2-text-muted)',
        }}
      >
        {formatTime(message.deliveredAt)}
      </span>
    </button>
  );
}

function resolveAvatar(
  message: SentMessage,
  conversation: ChatConversation | undefined,
): { src: string | null; name: string; displayLabel?: string } {
  const kind = conversation?.kind ?? message.conversationKind;
  if (kind === 'dm') {
    const url = conversation?.dmAvatarUrls?.[0] ?? null;
    const name =
      conversation?.dmMemberNames?.[0] ??
      conversation?.title ??
      message.conversationTitle;
    return { src: url, name };
  }
  if (kind === 'group_dm') {
    const count = conversation?.dmMemberNames?.length ?? 0;
    return {
      src: null,
      name: conversation?.title ?? message.conversationTitle,
      displayLabel: count > 0 ? String(count) : undefined,
    };
  }
  if (kind === 'channel' || kind === 'custom_channel') {
    return { src: null, name: conversation?.title ?? message.conversationTitle, displayLabel: '#' };
  }
  return { src: null, name: conversation?.title ?? message.conversationTitle };
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}
