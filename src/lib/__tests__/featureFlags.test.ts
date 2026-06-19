import { describe, it, expect } from 'vitest';
import {
  ENABLE_FILTER_TO_KANBAN,
  ENABLE_FILTER_TO_ROADMAP,
  ENABLE_FILTER_TO_DASHBOARD,
  ENABLE_FILTER_WHATSAPP_AI_SUMMARY,
} from '@/lib/featureFlags';

/**
 * Filters-as-reusable-views vertical — SHIPPED 2026-06-19 (G7).
 * The four gates now default ON (opt-out via VITE_...=false), matching the
 * file's standard ship pattern (ENABLE_AI etc.). With no env var set (the
 * test/default environment) each MUST be true.
 */
describe('ENABLE_FILTER_TO_KANBAN feature flag', () => {
  it('is a boolean', () => {
    expect(typeof ENABLE_FILTER_TO_KANBAN).toBe('boolean');
  });
  it('defaults to ON now that the vertical has shipped', () => {
    expect(ENABLE_FILTER_TO_KANBAN).toBe(true);
  });
});

describe('ENABLE_FILTER_TO_ROADMAP feature flag', () => {
  it('is a boolean', () => {
    expect(typeof ENABLE_FILTER_TO_ROADMAP).toBe('boolean');
  });
  it('defaults to ON now that the vertical has shipped', () => {
    expect(ENABLE_FILTER_TO_ROADMAP).toBe(true);
  });
});

describe('ENABLE_FILTER_TO_DASHBOARD feature flag', () => {
  it('is a boolean', () => {
    expect(typeof ENABLE_FILTER_TO_DASHBOARD).toBe('boolean');
  });
  it('defaults to ON now that the vertical has shipped', () => {
    expect(ENABLE_FILTER_TO_DASHBOARD).toBe(true);
  });
});

describe('ENABLE_FILTER_WHATSAPP_AI_SUMMARY feature flag', () => {
  it('is a boolean', () => {
    expect(typeof ENABLE_FILTER_WHATSAPP_AI_SUMMARY).toBe('boolean');
  });
  it('defaults to ON — deterministic fallback makes it safe to ship', () => {
    expect(ENABLE_FILTER_WHATSAPP_AI_SUMMARY).toBe(true);
  });
});
