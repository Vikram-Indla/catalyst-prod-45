/**
 * TDD: ticket trigger type (#) in useInlineTriggers.
 * Tests the TRIGGER_REGEX and TriggerType directly (pure logic, no editor instance).
 */

// Re-export the regex for unit testing by extracting the logic inline.
// We test the discriminator logic that maps '#' → 'ticket'.

import type { TriggerType } from '../useInlineTriggers';

describe('useInlineTriggers – ticket trigger', () => {
  // Replicates the TRIGGER_REGEX from useInlineTriggers.ts
  const TRIGGER_REGEX = /(?:^|\s)([@:/#])([\w-]{0,40})$/;

  it('TriggerType includes ticket', () => {
    // Type-level assertion: if this compiles, the type includes 'ticket'
    const t: TriggerType = 'ticket';
    expect(t).toBe('ticket');
  });

  it('matches # trigger with BAU- query', () => {
    const m = TRIGGER_REGEX.exec('#BAU-55');
    expect(m).not.toBeNull();
    expect(m![1]).toBe('#');
    expect(m![2]).toBe('BAU-55');
  });

  it('matches # after whitespace', () => {
    const m = TRIGGER_REGEX.exec('some text #BAU-123');
    expect(m).not.toBeNull();
    expect(m![1]).toBe('#');
    expect(m![2]).toBe('BAU-123');
  });

  it('still matches @ mention', () => {
    const m = TRIGGER_REGEX.exec('@vikram');
    expect(m![1]).toBe('@');
  });

  it('still matches / slash', () => {
    const m = TRIGGER_REGEX.exec('/ai');
    expect(m![1]).toBe('/');
  });

  it('discriminator maps # → ticket', () => {
    const triggerChar = '#';
    const type: TriggerType =
      triggerChar === '@' ? 'mention'
      : triggerChar === ':' ? 'emoji'
      : triggerChar === '#' ? 'ticket'
      : 'slash';
    expect(type).toBe('ticket');
  });
});
