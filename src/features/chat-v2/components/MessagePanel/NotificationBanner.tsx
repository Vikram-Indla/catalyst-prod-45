import React from 'react';
import { BellIcon } from '../shared/Icon';

interface NotificationBannerProps {
  message: React.ReactNode;
}

export function NotificationBanner({ message }: NotificationBannerProps) {
  return (
    <div
      role="status"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '4px 16px',
        background: 'var(--cv2-bg-banner)',
        color: 'var(--cv2-text-muted)',
        fontFamily: 'var(--cv2-font)',
        font: 'var(--ds-font-body-small)',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          display: 'inline-flex',
          width: 20,
          height: 20,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <BellIcon size={14} />
      </span>
      <span>{message}</span>
    </div>
  );
}
