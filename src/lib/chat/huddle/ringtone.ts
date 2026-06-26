// src/lib/chat/huddle/ringtone.ts
/**
 * Incoming-huddle ringtone — synthesised with Web Audio (no asset file).
 * A gentle double-beep that repeats until stopRing() is called. Best-effort:
 * if the AudioContext is suspended (no user gesture yet) the ring is silent
 * until the next interaction — never throws.
 */
let ctx: AudioContext | null = null;
let timer: ReturnType<typeof setInterval> | null = null;

function beep(at: number) {
  if (!ctx) return;
  const t = ctx.currentTime + at;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(523, t); // C5
  osc.connect(gain);
  gain.connect(ctx.destination);
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(0.18, t + 0.02);
  gain.gain.linearRampToValueAtTime(0, t + 0.26);
  osc.start(t);
  osc.stop(t + 0.3);
}

export function startRing(): void {
  stopRing();
  try {
    ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    void ctx.resume();
    const ring = () => { beep(0); beep(0.45); };
    ring();
    timer = setInterval(ring, 2600);
  } catch { /* audio unavailable — silent */ }
}

export function stopRing(): void {
  if (timer) { clearInterval(timer); timer = null; }
  if (ctx) { try { void ctx.close(); } catch { /* ignore */ } ctx = null; }
}
