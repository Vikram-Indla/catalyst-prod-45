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
  /** Current dictation target — lets commit keys stay scoped to it. */
  getActiveField?: () => ActiveField | null;
}

/**
 * Voice activation hotkey handler.
 *
 * Activation triggers (both always active):
 *   1. Double-space within doubleSpaceThresholdMs on an eligible field
 *   2. Cmd+Shift+V (Mac) / Ctrl+Shift+V (Windows/Linux) — works from any text field
 *
 * While voice active:
 *   Enter  → onCommit()   (single Space is NEVER a control — Plan Lock
 *            CAT-VOICE-UX-PREMIUM-20260708-001 D3: text may be streaming into
 *            the focused composer, where Space is a legitimate character)
 *   Escape → onCancel()
 */
/** Any element that receives typed text — broader than voice eligibility
 *  (a data-voice-flow="off" field is still editable). */
function isEditableElement(el: HTMLElement): boolean {
  const tag = el.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea') return true;
  const editable = el.getAttribute('contenteditable');
  return el.isContentEditable || editable === 'true' || editable === 'plaintext-only';
}

export function useVoiceHotkey({
  enabled,
  isVoiceActive,
  onActivate,
  onCommit,
  onCancel,
  getActiveField,
}: UseVoiceHotkeyOptions): void {
  const lastSpaceTimeRef = useRef(0);
  const isActiveRef = useRef(isVoiceActive);
  const enabledRef  = useRef(enabled);
  const getFieldRef = useRef(getActiveField);

  // Keep refs in sync without triggering effect re-registration
  isActiveRef.current = isVoiceActive;
  enabledRef.current  = enabled;
  getFieldRef.current = getActiveField;

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
        if (isEnter) {
          // Commit keys belong to the dictation target only. If focus has
          // moved to a DIFFERENT editable element (incl. voice-opted-out
          // fields), the user is typing there — release the keys
          // (no preventDefault) and end the session.
          const sessionField = getFieldRef.current?.() ?? null;
          const focused = document.activeElement;
          if (
            sessionField &&
            focused instanceof HTMLElement &&
            focused !== sessionField.element &&
            isEditableElement(focused)
          ) {
            onCancel();
            return;
          }
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
        console.log('[VF-HK] double-space detected delta=', Math.round(delta), 'target=', target?.tagName, 'id=', (target as HTMLElement)?.id, 'field=', field ? field.kind : 'NULL', 'isActive=', isActiveRef.current);

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
