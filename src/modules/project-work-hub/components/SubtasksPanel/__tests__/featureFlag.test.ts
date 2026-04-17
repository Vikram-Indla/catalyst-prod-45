/**
 * Regression pin: ENABLE_SUBTASKS_V2 must exist, be a boolean, and default OFF.
 *
 * The canonical V2 molecule pilots on Epic only while this flag defaults false.
 * If it ever starts defaulting true by accident, non-Epic consumers would
 * pick up the V2 behaviour unexpectedly.
 */
import { describe, it, expect } from 'vitest';
import * as flags from '@/lib/featureFlags';

describe('feature flags', () => {
  it('ENABLE_SUBTASKS_V2 exists and is boolean', () => {
    expect(typeof flags.ENABLE_SUBTASKS_V2).toBe('boolean');
  });

  it('ENABLE_SUBTASKS_V2 defaults to false when VITE_ENABLE_SUBTASKS_V2 is unset', () => {
    // In the test env VITE_ENABLE_SUBTASKS_V2 is not set to 'true', so the
    // flag must be false. This pins the "default OFF / opt-in pilot" contract.
    expect(flags.ENABLE_SUBTASKS_V2).toBe(false);
  });
});
