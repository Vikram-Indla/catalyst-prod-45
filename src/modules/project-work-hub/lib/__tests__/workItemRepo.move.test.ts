/**
 * TDD — moveIssue
 *
 * Row 7 gate: this test MUST fail before implementation exists.
 * Covers:
 *   - moveIssue is exported from workItemRepo
 *   - calls update({ project_key, project_id }) .eq('issue_key', key)
 *   - resolves void
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Static contract ───────────────────────────────────────────────────────────
describe('moveIssue — export contract', () => {
  it('is exported from workItemRepo', async () => {
    const mod = await import('../workItemRepo');
    expect(typeof (mod as any).moveIssue).toBe('function');
  });
});

// ── Unit ─────────────────────────────────────────────────────────────────────
describe('moveIssue — unit', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('calls update({ project_key, project_id }) .eq("issue_key", key)', async () => {
    const eqSpy = vi.fn(() => Promise.resolve({ error: null }));
    const updateSpy = vi.fn(() => ({ eq: eqSpy }));

    vi.doMock('@/integrations/supabase/client', () => ({
      supabase: {
        from: vi.fn(() => ({
          update: updateSpy,
        })),
      },
    }));

    const { moveIssue } = await import('../workItemRepo');
    const result = await (moveIssue as any)('BAU-5751', 'PROJ2', 'uuid-project-2');

    expect(result).toBeUndefined();
    expect(updateSpy).toHaveBeenCalledOnce();
    expect(updateSpy.mock.calls[0][0]).toMatchObject({
      project_key: 'PROJ2',
      project_id: 'uuid-project-2',
    });
    expect(eqSpy).toHaveBeenCalledOnce();
    expect(eqSpy.mock.calls[0]).toEqual(['issue_key', 'BAU-5751']);
  });
});
