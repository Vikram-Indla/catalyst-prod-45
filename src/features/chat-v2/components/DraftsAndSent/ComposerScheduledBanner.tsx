/**
 * ComposerScheduledBanner — passive indicator above the composer that
 * surfaces "you have N scheduled message(s) pending in this
 * conversation" with a link to the Scheduled tab.
 *
 * Mounted by MessagePanel only when there is NO active edit-target.
 * The ScheduledEditBanner takes over while editing.
 */
import React, { useEffect, useState } from 'react';
import { formatRelativeSend } from './ScheduledRow';

interface ComposerScheduledBannerProps {
  count: number;
  nextSendAt: string;
  onSeeAll: () => void;
}

export function ComposerScheduledBanner({
  count,
  nextSendAt,
  onSeeAll,
}: ComposerScheduledBannerProps) {
  // Tick once a minute so relative day labels stay accurate across
  // midnight rollover without a page reload.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick(t => t + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const message =
    count > 1
      ? `${count} messages scheduled to be sent.`
      : `Your message will be sent ${formatRelativeSend(nextSendAt)}.`;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 12px',
        background: 'var(--cv2-bg-row-hover)',
        borderRadius: '8px 8px 0 0',
        fontFamily: 'var(--cv2-font)',
        fontSize: 13,
        color: 'var(--cv2-text-subtle)',
      }}
    >
      <ClockGlyph />
      <span style={{ flex: 1, minWidth: 0 }}>
        {message}{' '}
        <button
          type="button"
          onClick={onSeeAll}
          style={{
            display: 'inline',
            padding: 0,
            margin: 0,
            background: 'transparent',
            border: 'none',
            color: 'var(--cv2-accent)',
            fontFamily: 'inherit',
            fontSize: 'inherit',
            fontWeight: 600,
            cursor: 'pointer',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.textDecoration = 'underline';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.textDecoration = 'none';
          }}
        >
          See all scheduled messages
        </button>
      </span>
    </div>
  );
}

function ClockGlyph() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--cv2-warning, #ECB22E)"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flex: '0 0 auto' }}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}
