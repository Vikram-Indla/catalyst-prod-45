import React from 'react';
import { PinFilledIcon } from '../shared/Icon';

interface PinnedIndicatorProps {
  byMe?: boolean;
  byName?: string | null;
}

export function PinnedIndicator({ byMe, byName }: PinnedIndicatorProps) {
  const label = byMe ? 'Pinned by you' : byName ? `Pinned by ${byName}` : 'Pinned';
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        marginBottom: 4,
        fontFamily: 'var(--cv2-font)',
        fontSize: 'var(--ds-font-size-200)',
        fontWeight: 600,
      }}
    >
      <span aria-hidden="true" style={{ color: 'var(--cv2-warning)', display: 'inline-flex' }}>
        <PinFilledIcon size={12} />
      </span>
      <span style={{ color: 'var(--cv2-text-muted)' }}>{label}</span>
    </div>
  );
}
