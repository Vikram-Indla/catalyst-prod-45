import { useState } from 'react';

interface Props {
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  voiceMode?: 'auto' | 'en' | 'ar';
  onVoiceModeChange?: (mode: 'auto' | 'en' | 'ar') => void;
}

const LANG_CHIPS: Array<{ id: 'auto' | 'en' | 'ar'; label: string }> = [
  { id: 'auto', label: 'Auto' },
  { id: 'en', label: 'EN' },
  { id: 'ar', label: 'AR' },
];

export function MicButton({
  active = false,
  disabled = false,
  onClick,
  voiceMode = 'auto',
  onVoiceModeChange,
}: Props) {
  const [hovered, setHovered] = useState(false);

  return (
    <>
      {/* Keyframe injected once */}
      <style>{`

        .caty-mic-lang-picker {
          position: absolute;
          bottom: calc(100% + 6px);
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 4px;
          background: var(--ds-surface-overlay, #FFFFFF);
          border: 1px solid var(--ds-border, #DFE1E6);
          border-radius: 999px;
          padding: 3px 6px;
          box-shadow: 0 2px 8px rgba(9,30,66,0.14);
          white-space: nowrap;
          pointer-events: all;
          z-index: 10;
        }
      `}</style>

      <div
        style={{ position: 'relative', display: 'inline-flex' }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Language picker — shown on hover when not active */}
        {hovered && !active && onVoiceModeChange && (
          <div className="caty-mic-lang-picker">
            {LANG_CHIPS.map(({ id, label }) => {
              const sel = voiceMode === id;
              return (
                <button
                  key={id}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onVoiceModeChange(id);
                  }}
                  style={{
                    padding: '2px 8px',
                    border: 'none',
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: sel ? 600 : 400,
                    background: sel
                      ? 'var(--ds-background-selected, #E9F2FE)'
                      : 'transparent',
                    color: sel
                      ? 'var(--ds-text-selected, #0C66E4)'
                      : 'var(--ds-text-subtle, #6B778C)',
                    cursor: 'pointer',
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}

        <button
          type="button"
          aria-label={active ? 'Stop voice recording' : 'Record voice'}
          title={active ? 'Stop voice recording' : 'Record voice'}
          aria-pressed={active}
          disabled={disabled}
          onClick={onClick}
          onMouseDown={(e) => e.preventDefault()}
          data-testid="catalyst-desc-toolbar-mic"
          style={{
            position: 'relative',
            width: 28,
            height: 28,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            borderRadius: '50%',
            background: 'transparent',
            cursor: disabled ? 'not-allowed' : 'pointer',
            padding: 0,
            opacity: disabled ? 0.4 : 1,
          }}
        >
          {/* AI rainbow ring */}
          <span
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              background: `conic-gradient(
                #FF3CAC 0deg,
                #784BA0 60deg,
                #2B86C5 120deg,
                #00C9FF 180deg,
                #92FE9D 240deg,
                #FFD700 300deg,
                #FF3CAC 360deg
              )`,
              animation: 'none',
              opacity: active ? 1 : hovered ? 0.85 : 0.65,
              transition: 'opacity 200ms ease',
            }}
          />
          {/* White inset disc */}
          <span
            aria-hidden
            style={{
              position: 'absolute',
              inset: 3,
              borderRadius: '50%',
              background: '#FFFFFF',
            }}
          />
          {/* Icon or stop square */}
          {active ? (
            <span
              aria-hidden
              style={{
                position: 'relative',
                width: 10,
                height: 10,
                borderRadius: 2,
                background:
                  'conic-gradient(#FF3CAC 0deg, #784BA0 90deg, #2B86C5 180deg, #00C9FF 270deg, #FF3CAC 360deg)',
                animation: 'none',
                flexShrink: 0,
              }}
            />
          ) : (
            <svg
              aria-hidden
              width="12"
              height="14"
              viewBox="0 0 12 14"
              fill="none"
              style={{ position: 'relative' }}
            >
              <rect x="3.5" y="0.5" width="5" height="8" rx="2.5"
                fill="url(#micGrad)" />
              <path d="M1 6.5C1 9.538 3.238 12 6 12s5-2.462 5-5.5"
                stroke="url(#micGrad2)" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="6" y1="12" x2="6" y2="13.5"
                stroke="url(#micGrad2)" strokeWidth="1.5" strokeLinecap="round" />
              <defs>
                <linearGradient id="micGrad" x1="6" y1="0" x2="6" y2="9" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#FF3CAC" />
                  <stop offset="0.5" stopColor="#2B86C5" />
                  <stop offset="1" stopColor="#92FE9D" />
                </linearGradient>
                <linearGradient id="micGrad2" x1="1" y1="6" x2="11" y2="14" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#2B86C5" />
                  <stop offset="1" stopColor="#FF3CAC" />
                </linearGradient>
              </defs>
            </svg>
          )}
        </button>
      </div>
    </>
  );
}
