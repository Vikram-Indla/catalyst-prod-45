import React, { useState } from 'react';
import { token } from '@atlaskit/tokens';

/**
 * CatalystReplayButton — inline replay button for BR detail title.
 * RTL-aware. Only visible on title hover if BR transitioned from initial status.
 * Opens full-screen replay modal with live data.
 */

interface CatalystReplayButtonProps {
  brKey: string;
  hasTransitioned: boolean; // Only show if BR moved from initial status
  dir?: 'ltr' | 'rtl';
}

export default function CatalystReplayButton({ brKey, hasTransitioned, dir = 'ltr' }: CatalystReplayButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isRTL = dir === 'rtl';

  if (!hasTransitioned) {
    return null;
  }

  return (
    <>
      {/* Inline button — appears on parent title hover via sibling CSS */}
      <button
        onClick={() => setIsOpen(true)}
        style={{
          background: 'transparent',
          border: `0.5px solid ${token('color.border.secondary', '#DFE1E6')}`,
          padding: '6px 12px',
          borderRadius: 4,
          fontSize: 12,
          fontWeight: 500,
          color: token('color.text', '#172B4D'),
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          whiteSpace: 'nowrap',
          transition: 'background-color 0.2s ease',
          [isRTL ? 'marginRight' : 'marginLeft']: 8,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = token('color.background.neutral.subtle.hovered', '#F1F2F4');
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
        title={`Replay ${brKey} lifecycle`}
        aria-label={`Replay ${brKey} lifecycle`}
      >
        <i className="ti ti-refresh" style={{ fontSize: 14 }} aria-hidden="true" />
        Replay
      </button>

      {/* Full-screen modal */}
      {isOpen && (
        <div
          dir={dir}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9000,
            background: token('elevation.surface', '#FFFFFF'),
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '20px 24px',
              borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: 24,
                  fontWeight: 600,
                  color: token('color.text', '#172B4D'),
                }}
              >
                {brKey} Replay
              </h1>
              <p
                style={{
                  margin: '6px 0 0 0',
                  fontSize: 12,
                  color: token('color.text.subtle', '#42526E'),
                }}
              >
                Business Request lifecycle visualization · Live data from Catalyst
              </p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: 24,
                cursor: 'pointer',
                color: token('color.text', '#172B4D'),
              }}
              aria-label="Close replay"
            >
              ✕
            </button>
          </div>

          {/* Content */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: token('elevation.surface.sunken', '#F7F8F9'),
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <i className="ti ti-player-play" style={{ fontSize: 48, color: token('color.text.subtlest', '#6B778C') }} aria-hidden="true" />
            <h2
              style={{
                margin: 0,
                fontSize: 18,
                fontWeight: 600,
                color: token('color.text', '#172B4D'),
              }}
            >
              Loading {brKey} lifecycle...
            </h2>
            <p
              style={{
                margin: 0,
                fontSize: 13,
                color: token('color.text.subtle', '#42526E'),
                maxWidth: 400,
                textAlign: 'center',
              }}
            >
              Fetching status transitions, linked epics, stories, and events from Catalyst database.
            </p>
          </div>

          {/* Controls */}
          <div
            style={{
              padding: '16px 24px',
              borderTop: `1px solid ${token('color.border', '#DFE1E6')}`,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <button
              style={{
                padding: '8px 16px',
                background: token('color.background.information.bold', '#0052CC'),
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 500,
              }}
              disabled
            >
              <i className="ti ti-player-play" style={{ fontSize: 14, marginRight: 6 }} aria-hidden="true" />
              Play
            </button>
            <span
              style={{
                fontSize: 12,
                color: token('color.text.subtlest', '#6B778C'),
              }}
            >
              Connecting to live data...
            </span>
          </div>
        </div>
      )}
    </>
  );
}
