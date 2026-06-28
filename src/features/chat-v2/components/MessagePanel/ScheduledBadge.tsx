import React from 'react';
import { ClockIcon } from '../shared/Icon';

interface ScheduledBadgeProps {
  scheduledFor: string;
  onCancel?: () => void;
}

export function ScheduledBadge({ scheduledFor, onCancel }: ScheduledBadgeProps) {
  return (
    <div
      style={{
        marginTop: 6,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '4px 10px 4px 8px',
        borderRadius: 4,
        background: 'var(--cv2-saved-bg, rgba(236,178,46,0.12))',
        color: 'var(--cv2-text)',
        fontSize: 'var(--ds-font-size-200)',
        fontWeight: 600,
      }}
    >
      <span style={{ display: 'inline-flex', color: 'var(--cv2-warning)' }}>
        <ClockIcon size={12} />
      </span>
      <span>Scheduled for {formatScheduled(scheduledFor)}</span>
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          style={{
            marginLeft: 4,
            padding: '0 4px',
            background: 'transparent',
            color: 'var(--cv2-text-subtle)',
            border: 'none',
            fontSize: 'var(--ds-font-size-200)',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
      )}
    </div>
  );
}

function formatScheduled(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameYear = d.getFullYear() === now.getFullYear();
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const dayDiff = Math.round((d.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
  if (dayDiff === 0) return `today at ${time}`;
  if (dayDiff === 1) return `tomorrow at ${time}`;
  const dateLabel = sameYear
    ? d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  return `${dateLabel} at ${time}`;
}
