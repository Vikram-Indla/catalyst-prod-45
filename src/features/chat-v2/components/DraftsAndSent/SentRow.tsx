import React from 'react';
import type { SentMessage } from '../../hooks/useMySentMessages';

interface SentRowProps {
  message: SentMessage;
  onClick: () => void;
  /** Suppresses the inter-row divider so it doesn't overlap with the
   *  enclosing group container's bottom border. */
  isLastInGroup?: boolean;
}

export function SentRow({ message, onClick, isLastInGroup = false }: SentRowProps) {
  const isChannel =
    message.conversationKind === 'channel' || message.conversationKind === 'custom_channel';
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
      <span
        aria-hidden="true"
        style={{
          width: 36,
          height: 36,
          borderRadius: 6,
          background: 'var(--cv2-bg-row-hover)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--cv2-text-subtle)',
          fontWeight: 600,
          flex: '0 0 auto',
          fontSize: 16,
        }}
      >
        {isChannel ? '#' : firstInitial(message.conversationTitle)}
      </span>
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

function firstInitial(title: string): string {
  const trimmed = title.trim();
  if (trimmed.length === 0) return '?';
  return trimmed.charAt(0).toUpperCase();
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}
