import React from 'react';
import { XIcon } from '../shared/Icon';

interface OutgoingMessagesBannerProps {
  onDismiss: () => void;
}

export function OutgoingMessagesBanner({ onDismiss }: OutgoingMessagesBannerProps) {
  return (
    <div
      style={{
        margin: '0 16px 12px',
        padding: '12px 16px',
        borderRadius: 8,
        background: 'var(--cv2-bg-row-hover)',
        position: 'relative',
        fontFamily: 'var(--cv2-font)',
      }}
    >
      <div
        style={{
          fontSize: 'var(--ds-font-size-400)',
          fontWeight: 700,
          color: 'var(--cv2-text)',
          marginBottom: 4,
        }}
      >
        All your outgoing messages
      </div>
      <div
        style={{
          fontSize: 'var(--ds-font-size-300)',
          color: 'var(--cv2-text-subtle)',
          paddingRight: 24,
          lineHeight: 1.45,
        }}
      >
        Everything you send, draft, and schedule can now be found here.
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          width: 24,
          height: 24,
          padding: 0,
          background: 'transparent',
          border: 'none',
          color: 'var(--cv2-text-subtle)',
          borderRadius: 4,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.background = 'var(--cv2-bg-row-hover)';
          (e.currentTarget as HTMLElement).style.color = 'var(--cv2-text)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.background = 'transparent';
          (e.currentTarget as HTMLElement).style.color = 'var(--cv2-text-subtle)';
        }}
      >
        <XIcon size={14} />
      </button>
    </div>
  );
}

const STORAGE_KEY = 'cv2.draftsBannerDismissed';

export function useOutgoingBannerDismissed(): [boolean, () => void] {
  const [dismissed, setDismissed] = React.useState<boolean>(() => {
    try {
      return window.localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const dismiss = React.useCallback(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* ignore */
    }
    setDismissed(true);
  }, []);
  return [dismissed, dismiss];
}
