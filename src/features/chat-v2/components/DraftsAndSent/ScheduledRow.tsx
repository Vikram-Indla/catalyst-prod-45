import React from 'react';
import type { ScheduledMessage } from '../../hooks/useMyScheduledMessages';

interface ScheduledRowProps {
  scheduled: ScheduledMessage;
  onClick: () => void;
}

export function ScheduledRow({ scheduled, onClick }: ScheduledRowProps) {
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
        }}
      >
        {firstInitial(scheduled.conversationTitle)}
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
          {scheduled.conversationTitle}
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

function firstInitial(title: string): string {
  const trimmed = title.trim();
  if (trimmed.length === 0) return '?';
  return trimmed.charAt(0).toUpperCase();
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
