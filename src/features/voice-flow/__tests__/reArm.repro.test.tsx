import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useVoiceHotkey } from '../useVoiceHotkey';

/**
 * REPRODUCTION HARNESS — "voice only works once" bug.
 *
 * Drives the REAL useVoiceHotkey through two full dictation sessions on the
 * same focused input, mimicking the provider's prop transitions. If the second
 * double-space does NOT call onActivate, the bug lives in the hook. If it does,
 * the hook is innocent and the defect is in the provider runtime.
 */
function pressSpace() {
  document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', bubbles: true, cancelable: true }));
}
function doubleSpace() { pressSpace(); pressSpace(); }

describe('REPRO: voice re-arm on same input', () => {
  let input: HTMLInputElement;

  beforeEach(() => {
    input = document.createElement('input');
    input.type = 'text';
    document.body.appendChild(input);
    input.focus();
  });
  afterEach(() => { document.body.innerHTML = ''; vi.restoreAllMocks(); });

  it('second double-space re-activates after a completed session', () => {
    const onActivate = vi.fn();
    const onCommit = vi.fn();
    const onCancel = vi.fn();

    // Provider drives these; commit identity changes when result changes.
    const props = {
      enabled: true,
      isRecording: false,
      isResultPending: false,
      onActivate,
      onCommit,
      onCancel,
    };

    const { rerender } = renderHook((p) => useVoiceHotkey(p), { initialProps: props });

    // ── Session 1 ──────────────────────────────────────────────────────
    expect(document.activeElement).toBe(input);
    doubleSpace();
    expect(onActivate).toHaveBeenCalledTimes(1); // activation #1

    // provider: arming → listening (isRecording true), new commit identity
    rerender({ ...props, isRecording: true, onCommit: vi.fn() });
    // provider: processing → committing → reset → idle, result set then cleared
    rerender({ ...props, isRecording: false, isResultPending: false, onCommit: vi.fn() });

    // user clears text and refocuses (insertTextIntoTarget refocuses anyway)
    input.value = '';
    input.focus();
    expect(document.activeElement).toBe(input);

    // ── Session 2 ──────────────────────────────────────────────────────
    doubleSpace();
    expect(onActivate).toHaveBeenCalledTimes(2); // activation #2 — THE BUG if this fails
  });
});
