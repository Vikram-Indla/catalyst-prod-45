import { useEffect, useRef } from 'react';
import { VOICE_FLOW_CONFIG } from './voiceFlow.config';
import { getActiveTextTarget, removeSpaceBefore } from './useActiveTextTarget';
import type { ActiveField } from './voiceFlow.types';

interface UseVoiceHotkeyOptions {
  enabled: boolean;
  /** Mic is capturing or the blob is being transcribed (arming/listening/processing). */
  isRecording: boolean;
  /** A result is parked awaiting confirm (ready/review) — mic is OFF. */
  isResultPending: boolean;
  onActivate: (field: ActiveField) => void;
  onCommit: () => void;
  onCancel: () => void;
  /** Optional diagnostic sink — receives one line per relevant key press. */
  onDebug?: (msg: string) => void;
}

/** Session phase as the hotkey handler sees it. */
export type HotkeyPhase = 'idle' | 'recording' | 'pending';
/** Normalised key the handler reacts to. */
export type HotkeyKey = 'space' | 'enter' | 'escape' | 'cmd-shift-v' | 'other';
/** What the handler decides to do for a (phase, key) pair. */
export type HotkeyAction = 'commit' | 'cancel' | 'activate' | 'maybe-double-space' | 'none';

/**
 * Pure routing decision for a key press, given the current voice phase.
 *
 * The `pending` row is the fix for the "second dictation does nothing" bug:
 * while a low-confidence result is parked for review, the mic is OFF, so Space
 * must NOT commit — it routes to double-space detection so a fresh double-space
 * re-arms a new recording on the same field. Enter still commits, Escape discards.
 */
export function decideHotkeyAction(phase: HotkeyPhase, key: HotkeyKey): HotkeyAction {
  if (phase === 'recording') {
    if (key === 'space' || key === 'enter') return 'commit';
    if (key === 'escape') return 'cancel';
    return 'none';
  }
  if (phase === 'pending') {
    if (key === 'enter') return 'commit';
    if (key === 'escape') return 'cancel';
    if (key === 'cmd-shift-v') return 'activate';
    if (key === 'space') return 'maybe-double-space';
    return 'none';
  }
  // idle
  if (key === 'cmd-shift-v') return 'activate';
  if (key === 'space') return 'maybe-double-space';
  return 'none';
}

/**
 * Voice activation hotkey handler.
 *
 * Activation triggers (from idle, or to re-arm from a parked result):
 *   1. Double-space within doubleSpaceThresholdMs on an eligible field
 *   2. Cmd+Shift+V (Mac) / Ctrl+Shift+V (Windows/Linux) — works from any text field
 *
 * While recording: Space or Enter → onCommit(); Escape → onCancel()
 * While a result is parked: Enter → onCommit(); Escape → onCancel();
 *   Space → re-arm a fresh recording (double-space).
 */
export function useVoiceHotkey({
  enabled,
  isRecording,
  isResultPending,
  onActivate,
  onCommit,
  onCancel,
  onDebug,
}: UseVoiceHotkeyOptions): void {
  const lastSpaceTimeRef = useRef(0);
  const isRecordingRef = useRef(isRecording);
  const isPendingRef   = useRef(isResultPending);
  const enabledRef     = useRef(enabled);
  const onDebugRef     = useRef(onDebug);

  // Keep refs in sync without triggering effect re-registration
  isRecordingRef.current = isRecording;
  isPendingRef.current   = isResultPending;
  enabledRef.current     = enabled;
  onDebugRef.current     = onDebug;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!enabledRef.current) return;
      if (e.isComposing) return; // IME composition — never intercept

      const isCmdShiftV = (e.metaKey || e.ctrlKey) && e.shiftKey && e.code === 'KeyV';

      // Block modifier combos EXCEPT Cmd+Shift+V
      if (!isCmdShiftV && (e.ctrlKey || e.metaKey || e.altKey)) return;

      const isSpace  = e.code === 'Space';
      const isEnter  = e.code === 'Enter' || e.code === 'NumpadEnter';
      const isEscape = e.code === 'Escape';

      const phase: HotkeyPhase = isRecordingRef.current
        ? 'recording'
        : isPendingRef.current ? 'pending' : 'idle';
      const key: HotkeyKey = isCmdShiftV ? 'cmd-shift-v'
        : isSpace ? 'space'
        : isEnter ? 'enter'
        : isEscape ? 'escape'
        : 'other';

      const action = decideHotkeyAction(phase, key);

      if (key !== 'other') {
        onDebugRef.current?.(`key=${key} phase=${phase} → ${action}`);
      }

      if (action === 'commit') {
        e.preventDefault();
        e.stopPropagation();
        onCommit();
        return;
      }
      if (action === 'cancel') {
        e.preventDefault();
        e.stopPropagation();
        onCancel();
        return;
      }
      if (action === 'activate') {
        // Cmd+Shift+V — activate (or re-arm) from any text field
        const field = getActiveTextTarget(document.activeElement);
        if (field) {
          e.preventDefault();
          e.stopPropagation();
          onActivate(field);
        }
        return;
      }
      if (action === 'none') {
        // Any non-space key resets the double-space timer
        lastSpaceTimeRef.current = 0;
        return;
      }

      // action === 'maybe-double-space' — Space in idle or pending phase
      const now = performance.now();
      const delta = now - lastSpaceTimeRef.current;

      if (lastSpaceTimeRef.current > 0 && delta <= VOICE_FLOW_CONFIG.doubleSpaceThresholdMs) {
        // Second space within window — check if focused element is eligible
        const target = document.activeElement;
        const field = getActiveTextTarget(target);
        console.log('[VF-HK] double-space detected delta=', Math.round(delta), 'target=', target?.tagName, 'id=', (target as HTMLElement)?.id, 'field=', field ? field.kind : 'NULL', 'phase=', phase);
        onDebugRef.current?.(`DBL-SPACE el=${target?.tagName ?? 'none'} eligible=${field ? field.kind : 'NO'}`);

        if (field) {
          e.preventDefault();
          e.stopPropagation();
          lastSpaceTimeRef.current = 0;

          // Remove the first space that was already typed
          removeSpaceBefore(field);

          // onActivate re-arms; the provider discards any parked result first.
          onActivate(field);
          return;
        }
      }

      // Record this space press time for next-space comparison
      lastSpaceTimeRef.current = now;
    };

    // capture=true so we intercept before React synthetic handlers
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [onActivate, onCommit, onCancel]);
}
