import { describe, it, expect } from 'vitest';
// Edge function is import-safe (no Deno-only deps at module scope); we import
// the pure signature helper directly to assert its cache-invalidation contract.
import { computeIssuesSignature } from '../../../supabase/functions/ai-digest/themes.ts';

/**
 * Option C (2026-06-02): the AI-theme cache signature must hash semantic issue
 * fields — summary, status, issue_type — and IGNORE jira_updated_at. Jira bumps
 * jira_updated_at on cosmetic re-syncs, which previously busted the cache and
 * forced a full Gemini re-run even when nothing themable had changed.
 */
describe('computeIssuesSignature — semantic cache key', () => {
  const base = [
    { issue_key: 'MWR-1', summary: 'Login page broken', status: 'To Do', issue_type: 'Story' },
    { issue_key: 'MWR-2', summary: 'Slow dashboard', status: 'In Progress', issue_type: 'Task' },
  ];

  it('is stable when only jira_updated_at / time fields churn', async () => {
    const withTimeA = base.map(i => ({ ...i, jira_updated_at: '2026-05-25T10:00:00Z' }));
    const withTimeB = base.map(i => ({ ...i, jira_updated_at: '2026-06-02T09:31:00Z' }));
    expect(await computeIssuesSignature(withTimeA as never))
      .toBe(await computeIssuesSignature(withTimeB as never));
  });

  it('changes when an issue status changes', async () => {
    const changed = base.map((i, idx) => (idx === 0 ? { ...i, status: 'Done' } : i));
    expect(await computeIssuesSignature(changed as never))
      .not.toBe(await computeIssuesSignature(base as never));
  });

  it('changes when an issue summary changes', async () => {
    const changed = base.map((i, idx) => (idx === 0 ? { ...i, summary: 'Login page fixed' } : i));
    expect(await computeIssuesSignature(changed as never))
      .not.toBe(await computeIssuesSignature(base as never));
  });

  it('changes when an issue_type changes', async () => {
    const changed = base.map((i, idx) => (idx === 0 ? { ...i, issue_type: 'Bug' } : i));
    expect(await computeIssuesSignature(changed as never))
      .not.toBe(await computeIssuesSignature(base as never));
  });

  it('is order-independent for the same issue set', async () => {
    const reversed = [...base].reverse();
    expect(await computeIssuesSignature(reversed as never))
      .toBe(await computeIssuesSignature(base as never));
  });
});
