/**
 * VoiceMicButton — the composer-anchored CatyFlow affordance
 * (CAT-VOICE-UX-PREMIUM-20260708-001 S2a).
 *
 * One spatial anchor for the whole session lifecycle: the same control
 * morphs idle mic → arming spinner → listening stop → processing spinner
 * and never unmounts mid-session (the hover DictationCTA's vanishing act
 * was complaint #2). Mount it inside a composer's own action row; the
 * session engine, capsule, and hotkeys are unchanged.
 */
import React, { useCallback, useEffect, useState } from 'react';
import Button, { IconButton } from '@atlaskit/button/new';
import Popup from '@atlaskit/popup';
import Spinner from '@atlaskit/spinner';
import MicrophoneIcon from '@atlaskit/icon/core/microphone';
import VideoStopIcon from '@atlaskit/icon/core/video-stop';
import Tooltip from '@atlaskit/tooltip';
import { useVoiceFlow } from './VoiceFlowProvider';
import { getActiveTextTarget } from './useActiveTextTarget';

const COACHMARK_KEY = 'catalyst.voice.coachmark.v1';

export interface VoiceMicButtonProps {
  /** Resolve the editable element this button dictates into (called at
   *  click time — editors mount late). */
  getTargetElement: () => HTMLElement | null;
}

export function VoiceMicButton({ getTargetElement }: VoiceMicButtonProps) {
  const { status, enabled, activeElement, activate, commit } = useVoiceFlow();

  // First-run coachmark: the hover CTA this button replaces was invisible
  // until discovered — introduce the mic once, then never again.
  const [coachmarkOpen, setCoachmarkOpen] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    let seen = true;
    try { seen = localStorage.getItem(COACHMARK_KEY) === '1'; } catch { /* private mode */ }
    if (seen) return;
    const t = setTimeout(() => setCoachmarkOpen(true), 1200);
    return () => clearTimeout(t);
  }, [enabled]);
  const dismissCoachmark = useCallback(() => {
    setCoachmarkOpen(false);
    try { localStorage.setItem(COACHMARK_KEY, '1'); } catch { /* private mode */ }
  }, []);

  const handleStart = useCallback(
    (e: React.MouseEvent) => {
      // Keep the field focused; capture selection state before any blur.
      e.preventDefault();
      if (coachmarkOpen) dismissCoachmark();
      const el = getTargetElement();
      const field = el ? getActiveTextTarget(el) : null;
      if (field) activate(field);
    },
    [getTargetElement, activate, coachmarkOpen, dismissCoachmark],
  );

  if (!enabled) return null;

  const target = getTargetElement();
  const isMine =
    activeElement != null &&
    target != null &&
    (target === activeElement || target.contains(activeElement) || activeElement.contains(target));

  const sessionHere = isMine && status !== 'idle';

  let visual: 'idle' | 'arming' | 'recording' | 'processing' = 'idle';
  if (sessionHere) {
    if (status === 'arming') visual = 'arming';
    else if (status === 'listening' || status === 'paused') visual = 'recording';
    else visual = 'processing';
  }

  return (
    <span
      data-voice-anchor
      data-voice-status={sessionHere ? status : 'idle'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        // Magenta = CatyPulse AI signature; atlaskit icons inherit currentColor.
        color: visual === 'recording' ? 'var(--ds-icon-accent-magenta)' : undefined,
      }}
    >
      {visual === 'arming' || visual === 'processing' ? (
        <span
          role="status"
          aria-label={visual === 'arming' ? 'Requesting microphone' : 'Transcribing'}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
          }}
        >
          <Spinner size="small" />
        </span>
      ) : visual === 'recording' ? (
        <Tooltip content="Finish dictation and insert (Enter)">
          <IconButton
            icon={VideoStopIcon}
            label="Finish dictation"
            appearance="subtle"
            onClick={() => commit()}
          />
        </Tooltip>
      ) : (
        <Popup
          isOpen={coachmarkOpen}
          onClose={dismissCoachmark}
          placement="top-end"
          content={() => (
            <div style={{ maxWidth: 260, padding: 12, display: 'grid', gap: 8 }}>
              <strong style={{ font: 'var(--ds-font-heading-xsmall)' }}>Dictate with CatyFlow</strong>
              <span style={{ font: 'var(--ds-font-body-small)', color: 'var(--ds-text-subtle)' }}>
                Speak Arabic, Urdu, Hindi or English — it lands here as English text.
                Works in any text field with ⌘⇧V or double-space.
              </span>
              <span>
                <Button appearance="subtle" spacing="compact" onClick={dismissCoachmark}>
                  Got it
                </Button>
              </span>
            </div>
          )}
          trigger={(triggerProps) => (
            <span {...triggerProps}>
              <Tooltip content="Dictate — speak Arabic, Urdu, Hindi or English; it lands as English text">
                <IconButton
                  icon={MicrophoneIcon}
                  label="Start dictation"
                  appearance="subtle"
                  onMouseDown={handleStart}
                />
              </Tooltip>
            </span>
          )}
        />
      )}
    </span>
  );
}

export default VoiceMicButton;
