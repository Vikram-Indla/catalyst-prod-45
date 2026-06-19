import React from 'react';
import { ConversationAvatar, ConversationTitle } from './ConversationAvatar';
import type { ScheduledMessage } from '../../hooks/useMyScheduledMessages';
import type { ChatConversation } from '@/types/chat';

interface ScheduledRowProps {
  scheduled: ScheduledMessage;
  conversation?: ChatConversation;
  onClick: () => void;
}

export function ScheduledRow({ scheduled, conversation, onClick }: ScheduledRowProps) {
  const avatar = resolveAvatar(scheduled, conversation);
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
        padding: '12px 16px',
        background: 'transparent',
        border: '1px solid var(--cv2-border)',
        borderRadius: 8,
        cursor: 'pointer',
        fontFamily: 'var(--cv2-font)',
        color: 'var(--cv2-text)',
        transition: 'background var(--cv2-transition-fast)',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.background = 'var(--cv2-bg-row-hover)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.background = 'transparent';
      }}
    >
      <ConversationAvatar
        kind={conversation?.kind ?? scheduled.conversationKind}
        isPrivate={conversation?.isPrivate ?? scheduled.conversationIsPrivate}
        name={avatar.name}
        displayLabel={avatar.displayLabel}
        size={36}
      />
      <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <ConversationTitle
          kind={conversation?.kind ?? scheduled.conversationKind}
          isPrivate={conversation?.isPrivate ?? scheduled.conversationIsPrivate}
          title={conversation?.title ?? scheduled.conversationTitle}
        />
        <span
          style={{
            fontSize: 13,
            color: 'var(--cv2-text-subtle)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {scheduled.bodyPreview || 'No content'}
        </span>
      </span>
      <span
        style={{
          flex: '0 0 auto',
          fontSize: 12,
          color: 'var(--cv2-text-muted)',
        }}
      >
        Send {formatRelativeSend(scheduled.scheduledFor)}
      </span>
    </button>
  );
}

function resolveAvatar(
  scheduled: ScheduledMessage,
  conversation: ChatConversation | undefined,
): { src: string | null; name: string; displayLabel?: string } {
  const kind = conversation?.kind ?? scheduled.conversationKind;
  if (kind === 'dm') {
    const url = conversation?.dmAvatarUrls?.[0] ?? null;
    const name =
      conversation?.dmMemberNames?.[0] ??
      conversation?.title ??
      scheduled.conversationTitle;
    return { src: url, name };
  }
  if (kind === 'group_dm') {
    const count = conversation?.dmMemberNames?.length ?? 0;
    return {
      src: null,
      name: conversation?.title ?? scheduled.conversationTitle,
      displayLabel: count > 0 ? String(count) : undefined,
    };
  }
  return { src: null, name: conversation?.title ?? scheduled.conversationTitle };
}

/**
 * "today at 5:15 PM" / "tomorrow at 5:15 PM" / "Mon at 5:15 PM" /
 * "May 12 at 5:15 PM" — same format as the composer banner.
 */
export function formatRelativeSend(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const isSameDay = d.toDateString() === now.toDateString();
  if (isSameDay) return `today at ${time}`;
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  if (d.toDateString() === tomorrow.toDateString()) return `tomorrow at ${time}`;
  const diffDays = Math.floor((d.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
  if (diffDays >= 0 && diffDays < 7) {
    return `${d.toLocaleDateString([], { weekday: 'long' })} at ${time}`;
  }
  return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${time}`;
}
