/**
 * TDD — archiveIssue
 *
 * Row 4 gate: this test MUST fail before implementation exists.
 * Covers:
 *   - archiveIssue is exported from workItemRepo
 *   - calls update({ archived_at: <iso>, archived_by: userId }) on ph_issues
 *     for the given key
 *   - writes an audit row to ph_archive_log
 *   - resolves void (no return value)
 *
 * NOTE (stale-contract update): archiving was originally a simple
 * `is_archived: true` boolean flip. ph_issues has no such column — the real
 * implementation soft-archives via a nullable `archived_at` timestamp (+
 * `archived_by`) and additionally writes an audit row to `ph_archive_log`
 * (fetching the issue's summary/type/status/assignee/reporter first for that
 * log entry). The mock + assertions below are updated to match.
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

  it('calls update({ archived_at, archived_by }) .eq("issue_key", key) and logs to ph_archive_log', async () => {
    const mockIssue = {
      issue_key: 'BAU-5751',
      project_key: 'BAU',
      summary: 'Test summary',
      issue_type: 'Story',
      status: 'To Do',
      assignee_account_id: 'user-1',
      reporter_account_id: 'user-2',
    };

    const selectEqSpy = vi.fn(() => ({ single: vi.fn(() => Promise.resolve({ data: mockIssue, error: null })) }));
    const selectSpy = vi.fn(() => ({ eq: selectEqSpy }));

    const updateEqSpy = vi.fn(() => Promise.resolve({ error: null }));
    const updateSpy = vi.fn(() => ({ eq: updateEqSpy }));

    const insertSpy = vi.fn(() => Promise.resolve({ error: null }));

    const fromSpy = vi.fn((table: string) => {
      if (table === 'ph_archive_log') return { insert: insertSpy };
      return { select: selectSpy, update: updateSpy };
    });

    vi.doMock('@/integrations/supabase/client', () => ({
      supabase: { from: fromSpy },
    }));

    const { archiveIssue } = await import('../workItemRepo');
    const result = await (archiveIssue as any)('BAU-5751', 'user-9');

    // Returns void — resolves without a value
    expect(result).toBeUndefined();

    expect(updateSpy).toHaveBeenCalledOnce();
    expect(updateSpy.mock.calls[0][0]).toMatchObject({ archived_by: 'user-9' });
    expect(typeof updateSpy.mock.calls[0][0].archived_at).toBe('string');

    expect(updateEqSpy).toHaveBeenCalledOnce();
    expect(updateEqSpy.mock.calls[0]).toEqual(['issue_key', 'BAU-5751']);

    expect(insertSpy).toHaveBeenCalledOnce();
    expect(insertSpy.mock.calls[0][0]).toMatchObject({
      issue_key: 'BAU-5751',
      project_key: 'BAU',
      action: 'archived',
      performed_by: 'user-9',
    });
  });
});
