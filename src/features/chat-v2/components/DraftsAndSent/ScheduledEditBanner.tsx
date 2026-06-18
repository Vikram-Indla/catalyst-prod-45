/**
 * ScheduledEditBanner — slim banner mounted ABOVE the composer when the
 * user is actively editing a scheduled message. The composer footer
 * stays at its default (Send + chevron). Banner content:
 *
 *   Scheduled to send <when>  See all scheduled messages
 *
 * The "See all scheduled messages" link opens the Drafts & sent panel
 * on the Scheduled tab.
 */
import React from 'react';
import { formatRelativeSend } from './ScheduledRow';

interface ScheduledEditBannerProps {
  scheduledFor: string;
  onSeeAll: () => void;
}

export function ScheduledEditBanner({ scheduledFor, onSeeAll }: ScheduledEditBannerProps) {
  return (
    <div
      role="region"
      aria-label="Editing scheduled message"
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
        Scheduled to send {formatRelativeSend(scheduledFor)}.{' '}
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

