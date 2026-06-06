import React, { useState } from 'react';
import { token } from '@atlaskit/tokens';
import Spinner from '@atlaskit/spinner';

const CATY_RAINBOW = `conic-gradient(
  from 0deg,
  #FF3CAC 0deg, #784BA0 60deg, #2B86C5 120deg,
  #00C9FF 180deg, #92FE9D 240deg, #FFD700 300deg, #FF3CAC 360deg
)`;

interface CatyRainbowCTAProps {
  label: string;
  onClick: () => void;
  isLoading?: boolean;
  align?: 'left' | 'right';
}

export function CatyRainbowCTA({ label, onClick, isLoading, align = 'right' }: CatyRainbowCTAProps) {
  const [hover, setHover] = useState(false);
  const isInert = !!isLoading;

  return (
    <div style={{
      display: 'flex',
      justifyContent: align === 'right' ? 'flex-end' : 'flex-start',
      paddingBlockStart: 8,
      paddingBlockEnd: 16,
    }}>
      <div style={{
        display: 'inline-flex',
        padding: 3,
        borderRadius: 20,
        background: CATY_RAINBOW,
      }}>
        <button
          type="button"
          onClick={isInert ? undefined : onClick}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          aria-label={isLoading ? 'Caty is thinking...' : label}
          aria-busy={isLoading || undefined}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            height: 32,
            padding: '0 16px',
            border: 'none',
            borderRadius: 17,
            background: hover
              ? token('elevation.surface.hovered', '#F1F2F4')
              : token('elevation.surface', '#FFFFFF'),
            color: token('color.text', '#172B4D'),
            cursor: 'pointer',
            fontFamily: 'var(--ds-font-family-body, "Atlassian Sans"), ui-sans-serif, sans-serif',
            fontSize: 12,
            fontWeight: 600,
            lineHeight: 1,
            transition: 'background 150ms ease',
          }}
        >
          {isLoading ? (
            <Spinner size="small" />
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" style={{ flexShrink: 0 }}>
              <defs>
                <linearGradient id={`caty-cta-${label.replace(/\s/g, '-')}`} gradientUnits="userSpaceOnUse" x1="1" y1="7" x2="13" y2="7">
                  <stop offset="0%" stopColor="#FF3CAC" />
                  <stop offset="20%" stopColor="#784BA0" />
                  <stop offset="40%" stopColor="#2B86C5" />
                  <stop offset="60%" stopColor="#00C9FF" />
                  <stop offset="80%" stopColor="#92FE9D" />
                  <stop offset="100%" stopColor="#FFD700" />
                </linearGradient>
              </defs>
              <path d="M7 0.5L8.5 5.2L13 7L8.5 8.8L7 13.5L5.5 8.8L1 7L5.5 5.2Z" fill={`url(#caty-cta-${label.replace(/\s/g, '-')})`} />
            </svg>
          )}
          {isLoading ? 'Thinking...' : label}
        </button>
      </div>
    </div>
  );
}
