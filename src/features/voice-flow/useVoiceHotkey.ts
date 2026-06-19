import { useEffect, useRef } from 'react';
import { VOICE_FLOW_CONFIG } from './voiceFlow.config';
import { getActiveTextTarget, removeSpaceBefore } from './useActiveTextTarget';
import type { ActiveField } from './voiceFlow.types';

interface UseVoiceHotkeyOptions {
  enabled: boolean;
  isVoiceActive: boolean;
  onActivate: (field: ActiveField) => void;
  onCommit: () => void;
  onCancel: () => void;
}

/**
 * Voice activation hotkey handler.
 *
 * Activation triggers (both always active):
 *   1. Double-space within doubleSpaceThresholdMs on an eligible field
 *   2. Cmd+Shift+V (Mac) / Ctrl+Shift+V (Windows/Linux) — works from any text field
 *
 * While voice active:
 *   Space or Enter → onCommit()
 *   Escape        → onCancel()
 */
export function useVoiceHotkey({
  enabled,
  isVoiceActive,
  onActivate,
  onCommit,
  onCancel,
}: UseVoiceHotkeyOptions): void {
  const lastSpaceTimeRef = useRef(0);
  const isActiveRef = useRef(isVoiceActive);
  const enabledRef  = useRef(enabled);

  // Keep refs in sync without triggering effect re-registration
  isActiveRef.current = isVoiceActive;
  enabledRef.current  = enabled;

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

      // ── While voice session is active ──────────────────────────────
      if (isActiveRef.current) {
        if (isSpace || isEnter) {
          e.preventDefault();
          e.stopPropagation();
          onCommit();
        } else if (isEscape) {
          e.preventDefault();
          e.stopPropagation();
          onCancel();
        }
        return;
      }

      // ── Cmd+Shift+V — activate from any text field ─────────────────
      if (isCmdShiftV) {
        const target = document.activeElement;
        const field = getActiveTextTarget(target);
        if (field) {
          e.preventDefault();
          e.stopPropagation();
          onActivate(field);
        }
        return;
      }

      // ── Double-space detection ─────────────────────────────────────
      if (!isSpace) {
        // Any non-space key resets the timer
        lastSpaceTimeRef.current = 0;
        return;
      }

      const now = performance.now();
      const delta = now - lastSpaceTimeRef.current;

      if (lastSpaceTimeRef.current > 0 && delta <= VOICE_FLOW_CONFIG.doubleSpaceThresholdMs) {
        // Second space within window — check if focused element is eligible
        const target = document.activeElement;
        const field = getActiveTextTarget(target);

        if (field) {
          e.preventDefault();
          e.stopPropagation();
          lastSpaceTimeRef.current = 0;

          // Remove the first space that was already typed
          removeSpaceBefore(field);

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
