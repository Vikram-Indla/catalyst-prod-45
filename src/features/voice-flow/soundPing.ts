/**
 * soundPing — subtle audio confirmation for mic open/close
 * (CAT-VOICE-UX-PREMIUM-20260708-001 S6b, Wispr's "it heard me" cue).
 *
 * Synthesised (no asset), quiet, and OFF by default behind the voice_flow
 * sound_enabled preference — sound is never the only state signal (the
 * capsule + aria-live cover non-hearing contexts). Mirrors the AudioContext
 * pattern in src/lib/chat/huddle/ringtone.ts, including the suspended-context
 * guard (no user gesture → silent no-op).
 */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  try {
    if (!ctx) {
      const AC =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
    return ctx.state === 'running' || ctx.state === 'suspended' ? ctx : null;
  } catch {
    return null;
  }
}

function ping(fromHz: number, toHz: number): void {
  const ac = getCtx();
  if (!ac) return;
  try {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    const t = ac.currentTime;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(fromHz, t);
    osc.frequency.exponentialRampToValueAtTime(toHz, t + 0.09);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.05, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(t);
    osc.stop(t + 0.14);
  } catch {
    /* audio is decoration — never throw */
  }
}

/** Rising — the mic just opened. */
export function playListenPing(): void {
  ping(660, 880);
}

/** Falling — the session just closed toward processing/commit. */
export function playStopPing(): void {
  ping(880, 587);
}
