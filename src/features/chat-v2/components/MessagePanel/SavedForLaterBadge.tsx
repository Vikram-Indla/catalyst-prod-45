import React from 'react';
import { BookmarkFilledIcon } from '../shared/Icon';

export function SavedForLaterBadge() {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4,
        color: 'var(--cv2-saved-fg)',
        fontFamily: 'var(--cv2-font)',
        fontSize: 12,
        fontWeight: 700,
      }}
    >
      <BookmarkFilledIcon size={13} />
      <span>Saved for later</span>
    </div>
  );
}
