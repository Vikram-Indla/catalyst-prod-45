import { describe, it, expect } from 'vitest';
import { HUDDLE_SIGNAL_EVENT, type HuddleSignal } from './signaling';

describe('huddle signaling', () => {
  it('exposes a stable broadcast event name', () => {
    expect(HUDDLE_SIGNAL_EVENT).toBe('huddle-signal');
  });

  it('models all five message kinds', () => {
    const kinds: HuddleSignal['kind'][] = ['join', 'leave', 'offer', 'answer', 'ice-candidate'];
    expect(kinds).toHaveLength(5);
  });
});
