import React from 'react';

interface EmptyPanelProps {
  /** Opens the "New message" flow. Button renders only when provided. */
  onNewMessage?: () => void;
  /** Opens the "Create channel" flow. Button renders only when provided. */
  onNewChannel?: () => void;
}

export function EmptyPanel({ onNewMessage, onNewChannel }: EmptyPanelProps) {
  return (
    <section
      aria-label="No conversation selected"
      style={{
        gridArea: 'panel',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--cv2-bg-panel)',
        color: 'var(--cv2-text-muted)',
        padding: 24,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 'var(--ds-space-200)',
          maxWidth: 440,
          textAlign: 'center',
        }}
      >
        {/* Two overlapping rounded chat bubbles — token fills only. */}
        <svg
          width={96}
          height={96}
          viewBox="0 0 96 96"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          style={{ display: 'block' }}
        >
          <g fill="var(--ds-background-information)">
            <rect x="6" y="10" width="58" height="42" rx="12" />
            <path d="M20 50 L20 64 L34 52 Z" />
          </g>
          <g fill="var(--ds-background-brand-bold)">
            <rect x="34" y="36" width="58" height="42" rx="12" />
            <path d="M76 76 L76 90 L62 78 Z" />
          </g>
        </svg>
        <p
          style={{
            fontFamily: 'var(--cv2-font)',
            font: 'var(--ds-font-body-large)',
            fontWeight: 700,
            color: 'var(--cv2-text-strong)',
            margin: 0,
          }}
        >
          Pick up where the work left off
        </p>
        <p
          style={{
            fontFamily: 'var(--cv2-font)',
            font: 'var(--ds-font-body)',
            color: 'var(--cv2-text-muted)',
            margin: 0,
            textAlign: 'center',
          }}
        >
          Message a teammate, drop into a project channel, or start a huddle — everything stays
          linked to the work.
        </p>
        {(onNewMessage || onNewChannel) && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--ds-space-100)',
            }}
          >
            {onNewMessage && (
              <button
                type="button"
                className="cv2-empty-primary-btn"
                onClick={onNewMessage}
                style={{
                  height: 32,
                  padding: '0 var(--ds-space-150)',
                  border: 'none',
                  borderRadius: 'var(--cv2-radius-md)',
                  background: 'var(--ds-background-brand-bold)',
                  color: 'var(--ds-text-inverse)',
                  font: 'var(--ds-font-body)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background var(--cv2-transition-fast)',
                }}
              >
                New message
              </button>
            )}
            {onNewChannel && (
              <button
                type="button"
                onClick={onNewChannel}
                style={{
                  height: 32,
                  padding: '0 var(--ds-space-150)',
                  border: '1px solid var(--cv2-border-strong)',
                  borderRadius: 'var(--cv2-radius-md)',
                  background: 'transparent',
                  color: 'var(--cv2-text)',
                  font: 'var(--ds-font-body)',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                New channel
              </button>
            )}
          </div>
        )}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--ds-space-050)',
            font: 'var(--ds-font-body-small)',
            color: 'var(--cv2-text-subtle)',
          }}
        >
          <kbd
            style={{
              border: '1px solid var(--cv2-border)',
              borderRadius: 4,
              padding: '0 var(--ds-space-050)',
              font: 'var(--ds-font-body-small)',
              fontFamily: 'var(--cv2-font)',
            }}
          >
            ⌘K
          </kbd>
          <span>Search conversations</span>
        </div>
      </div>
    </section>
  );
}
