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
  it('suggests stale active items', () => {
    const out = buildCatySuggestions([item({ issue_key: 'BAU-9', status: 'In Progress', jira_updated_at: daysAgo(4) })], NOW, new Set());
    expect(out).toHaveLength(1);
    expect(out[0].issueKey).toBe('BAU-9');
    expect(out[0].text).toMatch(/sat in In Progress for 4 days/);
    expect(out[0].key).toBe('stale:BAU-9');
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
      item({ issue_key: 'BAU-3', status_category: 'To Do' }),
      item({ issue_key: 'BAU-4', status_category: 'In Progress' }),
    ], NOW, new Set());
    expect(out.map((s) => s.issueKey)).toEqual(['BAU-3', 'BAU-4']);
  });

  it('caps the list and orders deterministically by key', () => {
    const items = ['BAU-30', 'BAU-10', 'BAU-20', 'BAU-40', 'BAU-50', 'BAU-60']
      .map((k) => item({ issue_key: k }));
    const out = buildCatySuggestions(items, NOW, new Set(), 5);
    expect(out).toHaveLength(5);
    expect(out.map((s) => s.issueKey)).toEqual(['BAU-10', 'BAU-20', 'BAU-30', 'BAU-40', 'BAU-50']);
  });
});
