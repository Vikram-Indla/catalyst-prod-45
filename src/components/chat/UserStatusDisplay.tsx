/**
 * UserStatusDisplay — Shows emoji + user name inline.
 *
 * Props:
 *   userId: string (required) — fetch status for this user
 *   name: string — user full name
 *   size?: 'small' | 'default' — emoji size (14px or 16px)
 *   showName?: boolean — include name in output (default: true)
 *   tooltipDelay?: number — ms before showing full message in title
 *
 * Example usage in message author info:
 *   <UserStatusDisplay userId={msg.author_id} name={msg.author_name} size="small" />
 */

import React from 'react';
import { useUserStatus } from '@/hooks/chat/useUserStatus';

export interface UserStatusDisplayProps {
  userId: string;
  name?: string;
  size?: 'small' | 'default';
  showName?: boolean;
  tooltipDelay?: number;
  className?: string;
}

export function UserStatusDisplay({
  userId,
  name,
  size = 'default',
  showName = true,
  tooltipDelay = 1000,
  className = '',
}: UserStatusDisplayProps) {
  const { emoji, message, loading } = useUserStatus(userId);

  const emojiSize = size === 'small' ? '14px' : '16px';

  // Build title: if message exists, show emoji + message
  const title = message ? `${emoji} ${message}` : `Online (${emoji})`;

  return (
    <span
      className={`user-status-display ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        whiteSpace: 'nowrap',
      }}
      title={title}
    >
      {/* Emoji indicator */}
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: emojiSize,
          lineHeight: 1,
          opacity: loading ? 0.5 : 1,
          transition: 'opacity 150ms',
        }}
      >
        {emoji}
      </span>

      {/* Name (optional) */}
      {showName && name && (
        <span
          style={{
            fontSize: 'var(--ds-font-size-400)',
            color: 'var(--ds-text, #172B4D)',
            fontWeight: 500,
          }}
        >
          {name}
        </span>
      )}
    </span>
  );
}
