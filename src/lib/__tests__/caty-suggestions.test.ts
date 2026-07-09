import { describe, it, expect } from 'vitest';
import { buildCatySuggestions, type SuggestionInput } from '../caty-suggestions';

const NOW = Date.parse('2026-06-11T00:00:00Z');
const daysAgo = (n: number) => new Date(NOW - n * 86_400_000).toISOString();

const item = (over: Partial<SuggestionInput>): SuggestionInput => ({
  issue_key: 'BAU-1',
  issue_type: 'Story',
  summary: 's',
  status: 'To Do',
  status_category: 'todo',
  jira_updated_at: daysAgo(5),
  ...over,
});

describe('buildCatySuggestions', () => {
  // NOTE: this file originally asserted a "sat in status for N days" stale
  // detector. caty-suggestions.ts was later rewritten into the 10-rule
  // trending scorer documented at the top of that file — its module
  // docstring explicitly states stale-sitting is NOT a signal here ("stale
  // view belongs in a separate tab"). These tests were stale contracts
  // against removed behavior; rewritten below to assert the real scorer.
  it('surfaces overdue items via the due-date signal', () => {
    const out = buildCatySuggestions(
      [item({ issue_key: 'BAU-9', status: 'In Progress', effective_due_date: daysAgo(2) })],
      NOW,
      new Set(),
    );
    expect(out).toHaveLength(1);
    expect(out[0].issueKey).toBe('BAU-9');
    expect(out[0].signal).toBe('Overdue');
    expect(out[0].key).toBe('trending:BAU-9');
  });

  it('excludes Done items', () => {
    expect(buildCatySuggestions([item({ status_category: 'Done' })], NOW, new Set())).toHaveLength(0);
  });

  it('excludes fresh items (< 3 days)', () => {
    expect(buildCatySuggestions([item({ jira_updated_at: daysAgo(1) })], NOW, new Set())).toHaveLength(0);
  });

  it('excludes dismissed items', () => {
    expect(buildCatySuggestions([item({ issue_key: 'BAU-2' })], NOW, new Set(['stale:BAU-2']))).toHaveLength(0);
  });

  it('tolerates inconsistent category casing/spacing', () => {
    const out = buildCatySuggestions([
      // odd-cased/spaced "Done" must still be excluded (normCategory strips
      // whitespace/underscores/hyphens and lowercases before comparing).
      item({ issue_key: 'BAU-3', status_category: ' Do_ne ', effective_due_date: daysAgo(2) }),
      // odd-cased/spaced active category must still be scored normally.
      item({ issue_key: 'BAU-4', status_category: ' In_Progress ', effective_due_date: daysAgo(2) }),
    ], NOW, new Set());
    expect(out.map((s) => s.issueKey)).toEqual(['BAU-4']);
  });

  it('caps the list and orders deterministically by score', () => {
    const items = [
      item({ issue_key: 'BAU-10', effective_due_date: daysAgo(2) }), // overdue → 40
      item({ issue_key: 'BAU-20', is_assignee: true, jira_updated_at: daysAgo(1), status_category: 'todo' }), // just assigned → 35
      item({ issue_key: 'BAU-30', effective_due_date: daysAgo(-1) }), // due tomorrow → 30
      item({ issue_key: 'BAU-40', is_assignee: false, jira_created_at: daysAgo(1) }), // just created → 25
      item({ issue_key: 'BAU-50', effective_due_date: daysAgo(-2) }), // due within 3 days → 20
      item({ issue_key: 'BAU-60', jira_updated_at: daysAgo(0.5), status_category: 'in_progress' }), // just started → 15 (dropped by cap)
    ];
    const out = buildCatySuggestions(items, NOW, new Set(), 5);
    expect(out).toHaveLength(5);
    expect(out.map((s) => s.issueKey)).toEqual(['BAU-10', 'BAU-20', 'BAU-30', 'BAU-40', 'BAU-50']);
  });
});
