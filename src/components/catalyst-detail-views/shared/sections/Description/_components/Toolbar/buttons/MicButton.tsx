import { useEffect, useRef, useState } from 'react';

type VoiceMode = 'auto' | 'en' | 'ar';

interface Props {
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  voiceMode?: VoiceMode;
  onVoiceModeChange?: (mode: VoiceMode) => void;
}

const MODES: { id: VoiceMode; label: string }[] = [
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
  const [pickerVisible, setPickerVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Show picker on hover, keep open while interacting with it.
  useEffect(() => {
    setPickerVisible(hovered);
  }, [hovered]);

  // Close picker when clicking outside.
  useEffect(() => {
    if (!pickerVisible) return;
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setPickerVisible(false);
        setHovered(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [pickerVisible]);

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        type="button"
        aria-label={active ? 'Stop voice recording' : 'Start voice input (Caty AI)'}
        title={active ? 'Stop voice recording' : 'Caty AI voice input'}
        disabled={disabled}
        onClick={onClick}
        onMouseDown={(e) => e.preventDefault()}
        data-testid="catalyst-desc-toolbar-mic"
        style={{
          width: 28,
          height: 28,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: 'none',
          borderRadius: '50%',
          padding: 0,
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          position: 'relative',
          background: 'transparent',
        }}
      >
        {/* AI gradient ring — always animated when idle (slow), fast-spin when active */}
        <span
          aria-hidden
          style={{
            position: 'absolute',
            inset: -2,
            borderRadius: '50%',
            background:
              'conic-gradient(from 0deg, #FF6B6B, #FFD93D, #6BCB77, #4D96FF, #C77DFF, #FF6B6B)',
            animation: active
              ? 'caty-mic-spin 0.8s linear infinite'
              : 'caty-mic-spin 4s linear infinite',
            opacity: active ? 1 : hovered ? 0.9 : 0.7,
          }}
        />
        {/* White inner circle */}
        <span
          aria-hidden
          style={{
            position: 'absolute',
            inset: 1,
            borderRadius: '50%',
            background: active
              ? 'var(--ds-surface, #FFFFFF)'
              : 'var(--ds-surface, #FFFFFF)',
          }}
        />
        {/* Mic SVG icon — coloured gradient when idle, pulsing red dot when active */}
        <span
          style={{
            position: 'relative',
            zIndex: 1,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {active ? (
            /* Pulsing stop indicator when recording */
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 2,
                background: '#FF4444',
                animation: 'caty-mic-pulse 1s ease-in-out infinite',
              }}
            />
          ) : (
            <MicSvg gradient={hovered} />
          )}
        </span>
      </button>

      {/* Language picker — appears on hover above the button */}
      {pickerVisible && !active && (
        <div
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 6px)',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '4px 6px',
            borderRadius: 999,
            background: 'var(--ds-surface-overlay, #FFFFFF)',
            boxShadow: '0 2px 8px rgba(9,30,66,0.18)',
            border: '1px solid var(--ds-border, #DFE1E6)',
            whiteSpace: 'nowrap',
            zIndex: 9999,
          }}
        >
          {MODES.map(({ id, label }) => {
            const isActive = voiceMode === id;
            return (
              <button
                key={id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onVoiceModeChange?.(id);
                }}
                style={{
                  padding: '2px 8px',
                  borderRadius: 999,
                  border: 'none',
                  fontSize: 12,
                  fontWeight: isActive ? 600 : 400,
                  cursor: 'pointer',
                  background: isActive
                    ? 'var(--ds-background-selected, #E9F2FE)'
                    : 'transparent',
                  color: isActive
                    ? 'var(--ds-link, #0052CC)'
                    : 'var(--ds-text-subtle, #44546F)',
                  transition: 'background 80ms ease',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}

      {/* Keyframe definitions injected once */}
      <style>{`
        @keyframes caty-mic-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes caty-mic-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.6; transform: scale(0.85); }
        }
      `}</style>
    </div>
  );
}

function MicSvg({ gradient }: { gradient: boolean }) {
  const id = 'caty-mic-grad';
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      {gradient && (
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#C77DFF" />
            <stop offset="50%" stopColor="#4D96FF" />
            <stop offset="100%" stopColor="#6BCB77" />
          </linearGradient>
        </defs>
      )}
      {/* Microphone capsule */}
      <rect
        x="9"
        y="2"
        width="6"
        height="11"
        rx="3"
        fill={gradient ? `url(#${id})` : 'var(--ds-text-subtle, #44546F)'}
      />
      {/* Stand arc */}
      <path
        d="M5 11a7 7 0 0 0 14 0"
        stroke={gradient ? `url(#${id})` : 'var(--ds-text-subtle, #44546F)'}
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      {/* Stem */}
      <line
        x1="12"
        y1="18"
        x2="12"
        y2="22"
        stroke={gradient ? `url(#${id})` : 'var(--ds-text-subtle, #44546F)'}
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Base */}
      <line
        x1="9"
        y1="22"
        x2="15"
        y2="22"
        stroke={gradient ? `url(#${id})` : 'var(--ds-text-subtle, #44546F)'}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
