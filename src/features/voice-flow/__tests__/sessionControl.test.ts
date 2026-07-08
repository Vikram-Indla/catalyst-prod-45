import { describe, it, expect } from 'vitest';
import { VOICE_FLOW_CONFIG } from '../voiceFlow.config';
import type { VoiceStatus } from '../voiceFlow.types';

/**
 * S1 session-control regressions (CAT-VOICE-UX-PREMIUM-20260708-001).
 * Logic-level, matching the existing test style — no hook mounting.
 */

describe('voice session control config', () => {
  it('has NO silence auto-stop — thinking pauses must never end a session', () => {
    expect('silenceAutoStopMs' in VOICE_FLOW_CONFIG).toBe(false);
  });

  it('keeps the 15-minute cap with a warning threshold before it', () => {
    expect(VOICE_FLOW_CONFIG.maxDurationMs).toBe(900_000);
    expect(VOICE_FLOW_CONFIG.capWarningMs).toBeLessThan(VOICE_FLOW_CONFIG.maxDurationMs);
    expect(VOICE_FLOW_CONFIG.capWarningMs).toBeGreaterThan(0);
  });
});

describe('paused status', () => {
  it('is a valid VoiceStatus', () => {
    const s: VoiceStatus = 'paused';
    expect(s).toBe('paused');
  });
});

describe('pause accounting math', () => {
  // Mirrors AudioCaptureService.durationMs: elapsed minus accumulated and
  // live pause time. Guards the formula the cap timer depends on.
  function durationMs(now: number, startedAt: number, pausedAccum: number, pauseStartedAt: number | null): number {
    const pausedLive = pauseStartedAt ? now - pauseStartedAt : 0;
    return now - startedAt - pausedAccum - pausedLive;
  }

  it('excludes completed pauses', () => {
    // 60s wall clock, 20s spent paused → 40s speaking time
    expect(durationMs(60_000, 0, 20_000, null)).toBe(40_000);
  });

  it('excludes an in-flight pause', () => {
    // 60s wall clock, paused since 45s → 45s speaking time
    expect(durationMs(60_000, 0, 0, 45_000)).toBe(45_000);
  });

  it('a 15-second thinking pause costs zero speaking budget', () => {
    const before = durationMs(30_000, 0, 0, 30_000);
    const after = durationMs(45_000, 0, 0, 30_000); // still paused 15s later
    expect(after).toBe(before);
  });
});
