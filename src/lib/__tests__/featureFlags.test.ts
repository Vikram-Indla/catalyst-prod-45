import { describe, it, expect } from 'vitest';
import { ENABLE_FILTER_TO_KANBAN } from '@/lib/featureFlags';

/**
 * Step 2 — ENABLE_FILTER_TO_KANBAN gate.
 * The "Convert filter → Kanban" vertical must stay invisible until shipped.
 * Mirrors ENABLE_KANBAN_V2: opt-in via VITE_ENABLE_FILTER_TO_KANBAN==='true',
 * so with the env var unset (the test/default environment) it MUST be false.
 */
describe('ENABLE_FILTER_TO_KANBAN feature flag', () => {
  it('is a boolean', () => {
    expect(typeof ENABLE_FILTER_TO_KANBAN).toBe('boolean');
  });

  it('defaults to OFF when the env var is unset', () => {
    expect(ENABLE_FILTER_TO_KANBAN).toBe(false);
  });
});
