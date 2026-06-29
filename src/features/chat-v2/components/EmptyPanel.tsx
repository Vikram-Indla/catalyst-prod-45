import React from 'react';
import { DmsIcon } from './shared/Icon';

export function EmptyPanel() {
  return (
    <section
      aria-label="No conversation selected"
      style={{
        gridArea: 'panel',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        background: 'var(--cv2-bg-panel)',
        color: 'var(--cv2-text-muted)',
        padding: 24,
        textAlign: 'center',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 56,
          height: 56,
          borderRadius: 'var(--cv2-radius-lg)',
          background: 'var(--cv2-bg-row-hover)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--cv2-text-subtle)',
        }}
      >
        <DmsIcon size={24} />
      </span>
      <p
        style={{
          fontFamily: 'var(--cv2-font)',
          font: 'var(--ds-font-heading-small)',
          fontWeight: 700,
          color: 'var(--cv2-text-strong)',
          margin: 0,
        }}
      >
        Select a conversation
      </p>
      <p
        style={{
          fontFamily: 'var(--cv2-font)',
          font: 'var(--ds-font-body-small)',
          color: 'var(--cv2-text-muted)',
          margin: 0,
          maxWidth: 320,
        }}
      >
        Choose from the sidebar to start messaging, or create a new conversation.
      </p>
    </section>
  );
}
