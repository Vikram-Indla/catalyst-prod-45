/**
 * TDD — archiveIssue
 *
 * Row 4 gate: this test MUST fail before implementation exists.
 * Covers:
 *   - archiveIssue is exported from workItemRepo
 *   - calls update({ is_archived: true }) on ph_issues for the given key
 *   - resolves void (no return value)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Static contract ───────────────────────────────────────────────────────────
describe('archiveIssue — export contract', () => {
  it('is exported from workItemRepo', async () => {
    const mod = await import('../workItemRepo');
    expect(typeof (mod as any).archiveIssue).toBe('function');
  });
});

// ── Unit ─────────────────────────────────────────────────────────────────────
describe('archiveIssue — unit', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('calls update({ is_archived: true }) .eq("issue_key", key)', async () => {
    const eqSpy = vi.fn(() => Promise.resolve({ error: null }));
    const updateSpy = vi.fn(() => ({ eq: eqSpy }));

    vi.doMock('@/integrations/supabase/client', () => ({
      supabase: {
        from: vi.fn(() => ({
          update: updateSpy,
        })),
      },
    }));

    const { archiveIssue } = await import('../workItemRepo');
    const result = await (archiveIssue as any)('BAU-5751');

    // Returns void — resolves without a value
    expect(result).toBeUndefined();

    expect(updateSpy).toHaveBeenCalledOnce();
    expect(updateSpy.mock.calls[0][0]).toMatchObject({ is_archived: true });

    expect(eqSpy).toHaveBeenCalledOnce();
    expect(eqSpy.mock.calls[0]).toEqual(['issue_key', 'BAU-5751']);
  });
});
