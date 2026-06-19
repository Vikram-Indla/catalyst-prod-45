import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { VOICE_FLOW_CONFIG } from '../voiceFlow.config';

/**
 * useVoiceHotkey — unit tests for double-space detection logic.
 *
 * Tests the timing math and guard conditions without mounting the full hook.
 */

describe('double-space timing logic', () => {
  const THRESHOLD = VOICE_FLOW_CONFIG.doubleSpaceThresholdMs;

  function simulateDoubleSpace(deltaMs: number): boolean {
    let lastSpaceTime = 0;
    let activated = false;

    // First space
    const t1 = 1000;
    lastSpaceTime = t1;

    // Second space at t1 + deltaMs
    const t2 = t1 + deltaMs;
    if (lastSpaceTime > 0 && (t2 - lastSpaceTime) <= THRESHOLD) {
      activated = true;
    }

    return activated;
  }

  it('activates when second space within threshold', () => {
    expect(simulateDoubleSpace(100)).toBe(true);
    expect(simulateDoubleSpace(200)).toBe(true);
    expect(simulateDoubleSpace(THRESHOLD)).toBe(true);
  });

  it('does not activate when second space exceeds threshold', () => {
    expect(simulateDoubleSpace(THRESHOLD + 1)).toBe(false);
    expect(simulateDoubleSpace(500)).toBe(false);
    expect(simulateDoubleSpace(1000)).toBe(false);
  });

  it('threshold constant is 350ms', () => {
    expect(THRESHOLD).toBe(350);
  });
});

describe('BLOCKED_INPUT_TYPES guard', () => {
  it('blocks sensitive input types', async () => {
    const { BLOCKED_INPUT_TYPES } = await import('../voiceFlow.config');
    expect(BLOCKED_INPUT_TYPES.has('password')).toBe(true);
    expect(BLOCKED_INPUT_TYPES.has('hidden')).toBe(true);
    expect(BLOCKED_INPUT_TYPES.has('file')).toBe(true);
    expect(BLOCKED_INPUT_TYPES.has('submit')).toBe(true);
  });

  it('allows text input types', async () => {
    const { BLOCKED_INPUT_TYPES } = await import('../voiceFlow.config');
    expect(BLOCKED_INPUT_TYPES.has('text')).toBe(false);
    expect(BLOCKED_INPUT_TYPES.has('search')).toBe(false);
    expect(BLOCKED_INPUT_TYPES.has('email')).toBe(false);
    expect(BLOCKED_INPUT_TYPES.has('url')).toBe(false);
    expect(BLOCKED_INPUT_TYPES.has('number')).toBe(false);
  });
});

describe('SENSITIVE_FIELD_PATTERNS guard', () => {
  it('blocks fields with sensitive names', async () => {
    const { SENSITIVE_FIELD_PATTERNS } = await import('../voiceFlow.config');
    const matches = (name: string) => SENSITIVE_FIELD_PATTERNS.some(re => re.test(name));

    expect(matches('password')).toBe(true);
    expect(matches('api_key')).toBe(true);
    expect(matches('apiKey')).toBe(true);
    expect(matches('secret_token')).toBe(true);
    expect(matches('otp')).toBe(true);
    expect(matches('cvv')).toBe(true);
  });

  it('allows safe field names', async () => {
    const { SENSITIVE_FIELD_PATTERNS } = await import('../voiceFlow.config');
    const matches = (name: string) => SENSITIVE_FIELD_PATTERNS.some(re => re.test(name));

    expect(matches('description')).toBe(false);
    expect(matches('summary')).toBe(false);
    expect(matches('comment')).toBe(false);
    expect(matches('title')).toBe(false);
    expect(matches('assignee')).toBe(false);
  });
});
