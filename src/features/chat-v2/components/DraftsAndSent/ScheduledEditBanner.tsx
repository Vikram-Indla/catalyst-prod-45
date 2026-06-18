/**
 * ScheduledEditBanner — slim banner mounted ABOVE the composer when the
 * user is actively editing a scheduled message. Pairs with the
 * scheduled-edit-mode footer inside the composer (Edit / Send now /
 * Delete buttons).
 *
 * The composer text area is pre-seeded with the scheduled message body
 * and remains fully editable — this banner exists only to surface the
 * scheduled send time and provide an explicit dismiss affordance.
 */
import React from 'react';
import { XIcon } from '../shared/Icon';
import { formatRelativeSend } from './ScheduledRow';

interface ScheduledEditBannerProps {
  scheduledFor: string;
  onDismiss: () => void;
}

export function ScheduledEditBanner({ scheduledFor, onDismiss }: ScheduledEditBannerProps) {
  return (
    <div
      role="region"
      aria-label="Editing scheduled message"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 14px',
        background: 'var(--cv2-bg-row-hover)',
        borderRadius: 8,
        fontFamily: 'var(--cv2-font)',
        fontSize: 13,
        color: 'var(--cv2-text-subtle)',
      }}
    >
      <span style={{ flex: 1, minWidth: 0 }}>
        Scheduled to send {formatRelativeSend(scheduledFor)}
      </span>
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
