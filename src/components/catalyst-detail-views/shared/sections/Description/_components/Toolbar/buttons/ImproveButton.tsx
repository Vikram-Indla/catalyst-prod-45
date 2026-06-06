import React, { useState } from 'react';
import type { Editor } from '@tiptap/react';
import Spinner from '@atlaskit/spinner';

const RAINBOW = `conic-gradient(from 0deg, #FF3CAC 0deg, #784BA0 60deg, #2B86C5 120deg, #00C9FF 180deg, #92FE9D 240deg, #FFD700 300deg, #FF3CAC 360deg)`;

interface Props {
  editor: Editor | null;
  onImprove?: () => void;
  onStop?: () => void;
  label?: string;
  isImproving?: boolean;
}

export function ImproveButton({
  editor,
  onImprove,
  onStop,
  label = 'Improve description',
  isImproving = false,
}: Props) {
  const isEmpty = editor?.isEmpty ?? true;
  const disabled = isEmpty && !isImproving;
  const [hover, setHover] = useState(false);

  return (
    <div style={{ display: 'inline-flex', padding: 3, borderRadius: 20, background: RAINBOW }}>
      <button
        type="button"
        title={disabled ? `${label} — add content first` : isImproving ? 'Click to stop Caty' : label}
        aria-label={isImproving ? 'Stop Caty' : label}
        aria-busy={isImproving || undefined}
        disabled={disabled && !isImproving}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => { if (isImproving) { onStop?.(); } else if (!disabled) { onImprove?.(); } }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        data-testid="catalyst-desc-toolbar-improve"
        style={{
          height: 28,
          padding: '0 10px',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          border: 'none',
          borderRadius: 17,
          background: disabled && !isImproving
            ? 'var(--ds-background-disabled, #F1F2F4)'
            : hover
              ? 'var(--ds-surface-hovered, #F1F2F4)'
              : 'var(--ds-surface, #FFFFFF)',
          color: 'var(--ds-text, #172B4D)',
          cursor: disabled && !isImproving ? 'not-allowed' : 'pointer',
          fontSize: 12,
          fontWeight: 600,
          fontFamily: 'var(--ds-font-family-body, "Atlassian Sans"), ui-sans-serif, sans-serif',
          lineHeight: 1,
          transition: 'background 150ms ease',
        }}
      >
        {isImproving ? (
          <Spinner size="small" />
        ) : (
          <svg width="12" height="12" viewBox="0 0 14 14" aria-hidden="true" style={{ flexShrink: 0 }}>
            <defs>
              <linearGradient id="improve-btn-rainbow" gradientUnits="userSpaceOnUse" x1="1" y1="7" x2="13" y2="7">
                <stop offset="0%" stopColor="#FF3CAC" />
                <stop offset="20%" stopColor="#784BA0" />
                <stop offset="40%" stopColor="#2B86C5" />
                <stop offset="60%" stopColor="#00C9FF" />
                <stop offset="80%" stopColor="#92FE9D" />
                <stop offset="100%" stopColor="#FFD700" />
              </linearGradient>
            </defs>
            <path d="M7 0.5L8.5 5.2L13 7L8.5 8.8L7 13.5L5.5 8.8L1 7L5.5 5.2Z" fill="url(#improve-btn-rainbow)" />
          </svg>
        )}
        <span>{isImproving ? 'Stop' : label}</span>
      </button>
    </div>
  );
}
