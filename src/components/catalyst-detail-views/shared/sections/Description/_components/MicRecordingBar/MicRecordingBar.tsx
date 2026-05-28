/**
 * MicRecordingBar — floating control bar shown while a mic-driven voice
 * recording session is active. Sits in the same row as Save/Cancel and
 * replaces the standard "Hold Ctrl" tip.
 *
 * Display:
 *   - Recording  → blue pulsing dot + "Listening" label + transcript so
 *                  far (recordedText) + interim text currently being said.
 *   - Paused     → static gray dot + transcript so far (no "Listening"
 *                  label; no interim since none is being captured).
 *
 * Controls:
 *   - Pause / Play: toggle recognition. Recorded text is preserved
 *                   across pause/resume so the user sees what they've
 *                   captured so far.
 *   - Stop:         inserts the entire session transcript into the
 *                   editor and closes the bar.
 *   - Cancel:       discards everything and closes the bar — no insert.
 */
// eslint-disable-next-line no-restricted-imports
import VideoPauseIcon from '@atlaskit/icon/core/video-pause';
// eslint-disable-next-line no-restricted-imports
import VideoPlayIcon from '@atlaskit/icon/core/video-play';
// eslint-disable-next-line no-restricted-imports
import VideoStopIcon from '@atlaskit/icon/core/video-stop';
// eslint-disable-next-line no-restricted-imports
import CloseIcon from '@atlaskit/icon/core/close';

interface Props {
  /** True when actively listening (not paused). */
  isRecording: boolean;
  isPaused: boolean;
  /** Transcript finalised so far in this session. */
  recordedText: string;
  /** Words currently being spoken (not yet finalised). */
  interimText: string;
  onPauseResume: () => void;
  onStop: () => void;
  onCancel: () => void;
}

export function MicRecordingBar({
  isRecording,
  isPaused,
  recordedText,
  interimText,
  onPauseResume,
  onStop,
  onCancel,
}: Props) {
  // Display rule:
  //   Recording → buffer + interim (interim italicised)
  //   Paused    → buffer only
  const displayBuffer = recordedText;
  const displayInterim = !isPaused ? interimText : '';

  return (
    <div
      role="toolbar"
      aria-label="Voice recording controls"
      style={{
        marginLeft: 'auto',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '4px 6px',
        borderRadius: 999,
        background: 'var(--ds-background-neutral, #F1F2F4)',
        maxWidth: '70%',
        minWidth: 0,
      }}
    >
      {/* Live indicator. "Listening" label hidden when paused. */}
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          paddingLeft: 4,
          flexShrink: 0,
        }}
      >
        <span
          aria-hidden
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: isRecording
              ? 'var(--ds-background-brand-bold, #0C66E4)'
              : 'var(--ds-text-subtlest, #97A0AF)',
            animation: isRecording
              ? 'catalyst-voice-pulse 1s ease-in-out infinite'
              : 'none',
          }}
        />
        {isRecording && (
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--ds-text-information, #0C66E4)',
            }}
          >
            Listening
          </span>
        )}
      </span>

      {/* Captured transcript so far + live interim. */}
      {(displayBuffer || displayInterim) && (
        <span
          style={{
            fontSize: 12,
            color: 'var(--ds-text-subtle, #44546F)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            minWidth: 0,
            direction: 'ltr',
          }}
          title={
            displayBuffer && displayInterim
              ? `${displayBuffer} ${displayInterim}`
              : displayBuffer || displayInterim
          }
        >
          {displayBuffer && <span>{displayBuffer}</span>}
          {displayBuffer && displayInterim && ' '}
          {displayInterim && (
            <span style={{ fontStyle: 'italic', opacity: 0.7 }}>
              {displayInterim}
            </span>
          )}
        </span>
      )}

      {/* Buttons */}
      <span
        style={{
          display: 'inline-flex',
          gap: 2,
          flexShrink: 0,
          marginLeft: 'auto',
        }}
      >
        <IconBtn
          label={isPaused ? 'Resume recording' : 'Pause recording'}
          onClick={onPauseResume}
        >
          {isPaused ? <VideoPlayIcon label="" /> : <VideoPauseIcon label="" />}
        </IconBtn>
        <IconBtn label="Stop and insert" onClick={onStop}>
          <VideoStopIcon label="" />
        </IconBtn>
        <IconBtn label="Cancel" onClick={onCancel} danger>
          <CloseIcon label="" />
        </IconBtn>
      </span>
    </div>
  );
}

function IconBtn({
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
