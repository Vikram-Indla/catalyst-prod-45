import React from 'react';
import { PinFilledIcon } from '../shared/Icon';
import type { ChatMessage } from '@/types/chat';

interface PinnedBannerProps {
  pinnedMessages: ChatMessage[];
  pinnedByMap: Record<string, { name: string | null; isMe: boolean }>;
  onOpenMessage: (messageId: string) => void;
}

/**
 * Slack-style horizontal banner shown above the message list when at least one
 * message is pinned in the conversation. Renders nothing when no pins exist.
 * Shows the most recently pinned message (top of the pins list).
 */
export function PinnedBanner({ pinnedMessages, pinnedByMap, onOpenMessage }: PinnedBannerProps) {
  if (pinnedMessages.length === 0) return null;
  const latest = pinnedMessages[0];
  const meta = pinnedByMap[latest.id];
  const label = meta?.isMe ? 'Pinned by you' : meta?.name ? `Pinned by ${meta.name}` : 'Pinned';

  return (
    <button
      type="button"
      onClick={() => onOpenMessage(latest.id)}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        width: '100%',
        padding: '10px 20px',
        background: 'rgba(236, 178, 46, 0.08)', // ads-scanner:ignore-line — semi-transparent overlay, no ADS token for alpha variant
        borderBottom: '1px solid var(--cv2-border)',
        textAlign: 'left',
        cursor: 'pointer',
        fontFamily: 'var(--cv2-font)',
        color: 'var(--cv2-text)',
        border: 'none',
        borderTop: 'none',
        borderLeft: 'none',
        borderRight: 'none',
        transition: 'background var(--cv2-transition-fast)',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.background = 'rgba(236, 178, 46, 0.14)'; // ads-scanner:ignore-line — semi-transparent overlay, no ADS token for alpha variant
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.background = 'rgba(236, 178, 46, 0.08)'; // ads-scanner:ignore-line — semi-transparent overlay, no ADS token for alpha variant
      }}
    >
      <span
        aria-hidden="true"
        style={{
          color: 'var(--cv2-warning)',
          marginTop: 2,
          flex: '0 0 auto',
        }}
      >
        <PinFilledIcon size={14} />
      </span>
      <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, flex: 1 }}>
        <span style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--cv2-text-muted)', fontWeight: 600 }}>
          {label}
          {pinnedMessages.length > 1 ? ` · +${pinnedMessages.length - 1} more` : ''}
        </span>
        <span
          style={{
            fontSize: 'var(--ds-font-size-400)',
            color: 'var(--cv2-text)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            lineHeight: 1.4,
          }}
        >
          {latest.bodyText}
        </span>
      </span>
    </button>
  );
}
