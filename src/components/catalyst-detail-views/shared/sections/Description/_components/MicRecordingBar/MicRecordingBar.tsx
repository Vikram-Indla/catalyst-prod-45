/**
 * MicRecordingBar — "Caty is listening/transcribing/translating" centered pill.
 *
 * Rendered OUTSIDE the save row, centered in the editor width. Matches
 * the CatyStreamingOverlay strap design pattern exactly.
 *
 * Phases:
 *   listening    → "Caty is listening…" (no speech yet)
 *   transcribing → "Caty is transcribing…" + interim text preview
 *   translating  → "Caty is translating…" (language switch detected, auto-reverts after 2s)
 *
 * Controls (pause/resume, stop+insert, cancel) live inside the pill.
 */
// eslint-disable-next-line no-restricted-imports
import VideoPauseIcon from '@atlaskit/icon/core/video-pause';
// eslint-disable-next-line no-restricted-imports
import VideoPlayIcon from '@atlaskit/icon/core/video-play';
// eslint-disable-next-line no-restricted-imports
import VideoStopIcon from '@atlaskit/icon/core/video-stop';
// eslint-disable-next-line no-restricted-imports
import CloseIcon from '@atlaskit/icon/core/close';
import catyHeadUrl from '@/assets/caty-head.svg?url';
import type { MicPhase } from '../../hooks/useMicVoiceRecorder';

interface Props {
  isRecording: boolean;
  isPaused: boolean;
  phase: MicPhase;
  recordedText: string;
  interimText: string;
  onPauseResume: () => void;
  onStop: () => void;
  onCancel: () => void;
}

const PHASE_LABEL: Record<MicPhase, string> = {
  listening: 'Caty is listening',
  transcribing: 'Caty is transcribing',
  translating: 'Caty is translating',
};

export function MicRecordingBar({
  isRecording,
  isPaused,
  phase,
  recordedText,
  interimText,
  onPauseResume,
  onStop,
  onCancel,
}: Props) {
  const effectivePhase: MicPhase = isPaused ? 'listening' : phase;
  const label = isPaused ? 'Paused — click ▶ to resume' : PHASE_LABEL[effectivePhase];
  const displayInterim = !isPaused ? interimText : '';
  const preview = recordedText || displayInterim;

  return (
    <>
      <style>{`
        @keyframes caty-pill-enter {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes caty-mic-dot {
          0%,80%,100% { transform: scale(0.6); opacity: 0.4; }
          40%          { transform: scale(1);   opacity: 1; }
        }
      `}</style>

      {/* Outer centering wrapper */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          marginTop: 8,
          marginBottom: 4,
        }}
      >
        {/* Pill */}
        <div
          role="status"
          aria-live="polite"
          aria-label={label}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 10px 6px 10px',
            borderRadius: 999,
            background: 'var(--ds-surface-overlay, #FFFFFF)',
            border: '1px solid var(--ds-border, #DFE1E6)',
            boxShadow: '0 2px 8px rgba(9,30,66,0.12)',
            animation: 'caty-pill-enter 220ms ease forwards',
            maxWidth: 480,
            minWidth: 0,
          }}
        >
          {/* Caty head — canonical voice mark, replaces the status dot */}
          <span
            aria-hidden
            style={{
              flexShrink: 0,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: isPaused ? 0.5 : 1,
              transition: 'opacity 150ms ease',
            }}
          >
            <img
              src={catyHeadUrl}
              alt=""
              width={22}
              height={22}
              style={{ display: 'block' }}
            />
          </span>

          {/* Label + preview text */}
          <span
            style={{
              display: 'inline-flex',
              flexDirection: 'column',
              minWidth: 0,
              flex: 1,
            }}
          >
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: isPaused
                  ? 'var(--ds-text-subtlest, #97A0AF)'
                  : effectivePhase === 'translating'
                    ? 'var(--ds-text-warning, #974F0C)'
                    : 'var(--ds-text-information, #0C66E4)',
                whiteSpace: 'nowrap',
              }}
            >
              {label}
              {/* 3-dot trail — only while actively recording */}
              {isRecording && !isPaused && (
                <span aria-hidden style={{ display: 'inline-flex', gap: 2, marginLeft: 3, verticalAlign: 'middle' }}>
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      style={{
                        display: 'inline-block',
                        width: 3,
                        height: 3,
                        borderRadius: '50%',
                        background: 'currentColor',
                        animation: `caty-mic-dot 1.2s ease-in-out ${i * 0.2}s infinite`,
                      }}
                    />
                  ))}
                </span>
              )}
            </span>
            {preview && (
              <span
                style={{
                  fontSize: 11,
                  color: 'var(--ds-text-subtle, #44546F)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: 260,
                  fontStyle: displayInterim && !recordedText ? 'italic' : 'normal',
                }}
                title={preview}
              >
                {preview}
              </span>
            )}
          </span>

          {/* Controls */}
          <span style={{ display: 'inline-flex', gap: 2, flexShrink: 0 }}>
            <PillBtn
              label={isPaused ? 'Resume recording' : 'Pause recording'}
              onClick={onPauseResume}
            >
              {isPaused ? <VideoPlayIcon label="" /> : <VideoPauseIcon label="" />}
            </PillBtn>
            <PillBtn label="Stop and insert" onClick={onStop}>
              <VideoStopIcon label="" />
            </PillBtn>
            <PillBtn label="Cancel recording" onClick={onCancel} danger>
              <CloseIcon label="" />
            </PillBtn>
          </span>
        </div>
      </div>
    </>
  );
}

function PillBtn({
  label,
  onClick,
  danger = false,
  children,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      onMouseDown={(e) => e.preventDefault()}
      style={{
        width: 24,
        height: 24,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: 'none',
        borderRadius: '50%',
        background: 'transparent',
        color: danger
          ? 'var(--ds-text-danger, #AE2A19)'
          : 'var(--ds-text, #292A2E)',
        cursor: 'pointer',
        padding: 0,
        flexShrink: 0,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = danger
          ? 'var(--ds-background-danger, #FFEBE6)'
          : 'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.08))';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
      }}
    >
      {children}
    </button>
  );
}
