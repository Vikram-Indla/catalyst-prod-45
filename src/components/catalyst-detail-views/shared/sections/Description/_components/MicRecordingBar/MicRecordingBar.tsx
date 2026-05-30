/**
 * MicRecordingBar — "Caty is …" floating status pill while mic recording is active.
 *
 * Mirrors the CatyStreamingOverlay strap pattern (caty-improve__strap) so all
 * AI-in-progress states look identical across the app.
 *
 * Phases (from useMicVoiceRecorder):
 *   listening    → "Caty is listening …"  (pulsing logo, no interim text)
 *   transcribing → "Caty is transcribing …" (live interim text scrolls)
 *   translating  → "Caty is translating …"  (shown briefly on lang switch)
 *   paused       → "Paused"
 */
import type { MicPhase } from '../../hooks/useMicVoiceRecorder';
// eslint-disable-next-line no-restricted-imports
import VideoPauseIcon from '@atlaskit/icon/core/video-pause';
// eslint-disable-next-line no-restricted-imports
import VideoPlayIcon from '@atlaskit/icon/core/video-play';
// eslint-disable-next-line no-restricted-imports
import VideoStopIcon from '@atlaskit/icon/core/video-stop';
// eslint-disable-next-line no-restricted-imports
import CloseIcon from '@atlaskit/icon/core/close';

const catyLogo = '/caty.svg';

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
  const displayInterim = !isPaused ? interimText : '';
  const label = isPaused ? 'Paused' : PHASE_LABEL[phase];

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        width: '100%',
        marginTop: 8,
        pointerEvents: 'none',
      }}
    >
      <div
        role="toolbar"
        aria-label="Voice recording controls"
        className="caty-pill-enter"
        style={{
          pointerEvents: 'auto',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 10px 6px 8px',
          borderRadius: 999,
          background: 'var(--ds-surface-overlay, #FFFFFF)',
          boxShadow: '0 4px 16px rgba(9,30,66,0.22), 0 0 0 1px rgba(9,30,66,0.08)',
          maxWidth: '80%',
          minWidth: 0,
        }}
      >
        {/* Caty logo — pulses while actively listening/transcribing */}
        <img
          src={catyLogo}
          alt=""
          width={18}
          height={18}
          style={{
            flexShrink: 0,
            animation:
              isRecording && !isPaused
                ? 'caty-pulse 1s ease-in-out infinite'
                : 'none',
            opacity: isPaused ? 0.5 : 1,
          }}
        />

        {/* State label */}
        <span
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: isPaused
              ? 'var(--ds-text-subtlest, #8590A2)'
              : 'var(--ds-text, #292A2E)',
            flexShrink: 0,
          }}
        >
          {label}
        </span>

        {/* Animated dots (only while active) */}
        {isRecording && !isPaused && (
          <span
            aria-hidden
            style={{
              display: 'inline-flex',
              gap: 3,
              alignItems: 'center',
              flexShrink: 0,
            }}
          >
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: '50%',
                  background: 'var(--ds-background-brand-bold, #0C66E4)',
                  animation: `caty-dot-bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                }}
              />
            ))}
          </span>
        )}

        {/* Live interim / recorded text preview */}
        {(recordedText || displayInterim) && (
          <span
            style={{
              fontSize: 12,
              color: 'var(--ds-text-subtle, #44546F)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              minWidth: 0,
              maxWidth: 200,
            }}
            title={
              recordedText && displayInterim
                ? `${recordedText} ${displayInterim}`
                : recordedText || displayInterim
            }
          >
            {recordedText && <span>{recordedText}</span>}
            {recordedText && displayInterim && ' '}
            {displayInterim && (
              <span style={{ fontStyle: 'italic', opacity: 0.7 }}>
                {displayInterim}
              </span>
            )}
          </span>
        )}

        {/* Divider */}
        <span
          aria-hidden
          style={{
            width: 1,
            height: 14,
            background: 'var(--ds-border, #DFE1E6)',
            flexShrink: 0,
            marginLeft: 4,
          }}
        />

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
          <PillBtn label="Discard" onClick={onCancel} danger>
            <CloseIcon label="" />
          </PillBtn>
        </span>
      </div>

      <style>{`
        @keyframes caty-dot-bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40%            { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </div>
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
        width: 26,
        height: 26,
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
