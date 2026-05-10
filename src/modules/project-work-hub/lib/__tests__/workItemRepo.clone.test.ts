/**
 * TDD — cloneIssue
 *
 * Row 1 gate: this test MUST fail before implementation exists.
 * Covers:
 *   - cloneIssue is exported from workItemRepo
 *   - cloned row: summary prefixed "Copy of", status="To Do",
 *     source="catalyst", is_archived=false, parent_key preserved
 *   - returns the new issue_key string
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

    // Returned key should be the new key (from insert response)
    expect(result).toBe('BAU-9999');

    // Insert must have been called exactly once
    expect(insertSpy).toHaveBeenCalledOnce();
    const insertPayload = insertSpy.mock.calls[0][0] as Record<string, unknown>;

    expect(insertPayload.summary).toBe('Copy of My Story');
    expect(insertPayload.status).toBe('To Do');
    expect(insertPayload.status_category).toBe('todo');
    expect(insertPayload.is_archived).toBe(false);
    expect(insertPayload.parent_key).toBe('BAU-100');
    expect(insertPayload.source).toBe('catalyst');
    // New key must be next after BAU-5998
    expect(insertPayload.issue_key).toBe('BAU-5999');
  });
});
