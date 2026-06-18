/**
 * ScheduledEditBanner — slim banner mounted ABOVE the composer when the
 * user is actively editing a scheduled message. The composer footer
 * stays at its default (send + chevron) — the chevron lets the user
 * reschedule via ScheduleSendMenu, and the send button saves the body
 * edit. This banner only carries the schedule-time label plus the
 * destructive "Send now" and "Delete" actions that don't belong in the
 * composer footer.
 */
import React from 'react';
import { XIcon } from '../shared/Icon';
import { formatRelativeSend } from './ScheduledRow';

interface ScheduledEditBannerProps {
  scheduledFor: string;
  onSendNow: () => void;
  onDelete: () => void;
  onDismiss: () => void;
}

export function ScheduledEditBanner({
  scheduledFor,
  onSendNow,
  onDelete,
  onDismiss,
}: ScheduledEditBannerProps) {
  return (
    <div
      role="region"
      aria-label="Editing scheduled message"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
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
        Scheduled to send {formatRelativeSend(scheduledFor)}
      </span>
      <button type="button" onClick={onSendNow} style={linkBtn} aria-label="Send now">
        Send now
      </button>
      <span style={{ color: 'var(--cv2-border)' }} aria-hidden="true">
        ·
      </span>
      <button type="button" onClick={onDelete} style={dangerLinkBtn} aria-label="Delete scheduled message">
        Delete
      </button>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        style={{
          width: 22,
          height: 22,
          padding: 0,
          background: 'transparent',
          border: 'none',
          color: 'var(--cv2-text-subtle)',
          cursor: 'pointer',
          borderRadius: 4,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flex: '0 0 auto',
        }}
      >
        <XIcon size={12} />
      </button>
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

const linkBtn: React.CSSProperties = {
  padding: 0,
  background: 'transparent',
  border: 'none',
  color: 'var(--cv2-accent)',
  fontFamily: 'var(--cv2-font)',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
};

const dangerLinkBtn: React.CSSProperties = {
  padding: 0,
  background: 'transparent',
  border: 'none',
  color: 'var(--cv2-danger, #E01E5A)',
  fontFamily: 'var(--cv2-font)',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
};
