/**
 * TDD — cloneIssue
 *
 * Row 1 gate: this test MUST fail before implementation exists.
 * Covers:
 *   - cloneIssue is exported from workItemRepo
 *   - cloned row: summary prefixed "Copy of", status="To Do",
 *     source="catalyst", archived_at=null, parent_key preserved
 *   - returns the new issue_key string
 *
 * NOTE (stale-contract update): `is_archived` is not a ph_issues column —
 * archiving is tracked via a nullable `archived_at` timestamp (see the
 * archiveIssue rewrite), so the insert payload sets `archived_at: null`
 * instead of `is_archived: false`. Also, cloneIssue generates the new key
 * itself up front (via generateIssueKey) and returns THAT value — it does
 * not trust/re-read the insert response's `issue_key` (the insert's
 * `.select('id, issue_key').single()` is only consulted for the new row's
 * `id`, used to deep-copy child sections). The mocked insert response below
 * intentionally returns a different key (`BAU-9999`) to prove the return
 * value comes from the generated key, not the insert response.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Static contract: function must be exported ────────────────────────────────
describe('cloneIssue — export contract', () => {
  it('is exported from workItemRepo', async () => {
    const mod = await import('../workItemRepo');
    expect(typeof (mod as any).cloneIssue).toBe('function');
  });
});

// ── Unit: cloneIssue behaviour ────────────────────────────────────────────────
describe('cloneIssue — unit', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('calls insert with summary prefixed "Copy of", status To Do, is_archived false, parent_key preserved', async () => {
    const insertSpy = vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() =>
          Promise.resolve({ data: { issue_key: 'BAU-9999' }, error: null }),
        ),
      })),
    }));

    // Fallback mock for tables other than ph_issues
    const fallbackSelect = vi.fn(() => ({
      like: vi.fn(() => ({
        order: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
    }));

    // Full ph_issues mock: handles generateIssueKey (like chain) + fetch (eq chain) + insert
    const phIssuesSelect = vi.fn(() => ({
      like: vi.fn(() => ({
        order: vi.fn(() => ({
          limit: vi.fn(() =>
            Promise.resolve({
              data: [{ issue_key: 'BAU-5998' }],
              error: null,
            }),
          ),
        })),
      })),
      eq: vi.fn(() => ({
        single: vi.fn(() =>
          Promise.resolve({
            data: {
              issue_key: 'BAU-5751',
              summary: 'My Story',
              description_adf: null,
              issue_type: 'Story',
              priority: 'Medium',
              parent_key: 'BAU-100',
              project_key: 'BAU',
              project_id: null,
              reporter_account_id: null,
              acceptance_criteria_adf: null,
              status: 'In Requirements',
              status_category: 'inprogress',
            },
            error: null,
          }),
        ),
      })),
    }));

    vi.doMock('@/integrations/supabase/client', () => ({
      supabase: {
        from: vi.fn((table: string) => {
          if (table === 'ph_issues') {
            return {
              select: phIssuesSelect,
              insert: insertSpy,
            };
          }
          return { select: fallbackSelect };
        }),
      },
    }));

    const { cloneIssue } = await import('../workItemRepo');
    const result = await (cloneIssue as any)('BAU-5751');

    // Returned key is the key cloneIssue generated up front (next after
    // BAU-5998), NOT the insert response's issue_key (BAU-9999) — proves
    // the return value doesn't round-trip through the insert result.
    expect(result).toBe('BAU-5999');

    // Insert must have been called exactly once
    expect(insertSpy).toHaveBeenCalledOnce();
    const insertPayload = insertSpy.mock.calls[0][0] as Record<string, unknown>;

    expect(insertPayload.summary).toBe('Copy of My Story');
    expect(insertPayload.status).toBe('To Do');
    expect(insertPayload.status_category).toBe('todo');
    expect(insertPayload.archived_at).toBeNull();
    expect(insertPayload.parent_key).toBe('BAU-100');
    expect(insertPayload.source).toBe('catalyst');
    // New key must be next after BAU-5998
    expect(insertPayload.issue_key).toBe('BAU-5999');
  });
});
