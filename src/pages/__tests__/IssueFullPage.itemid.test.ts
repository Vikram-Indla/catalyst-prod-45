/**
 * IssueFullPage — itemId contract
 *
 * F-iter9 PK fix (CLAUDE.md): useCatalystIssue queries ph_issues by
 * .eq('issue_key', itemId) — itemId MUST be the issue key string
 * (e.g. "BAU-5824"), NEVER the UUID `id` column.
 *
 * Sibling page IssueDetailPage.tsx correctly passes `issue.issue_key`
 * with an explicit comment citing this contract. IssueFullPage.tsx
 * regressed to passing `issue.id` (UUID) — every detail page silently
 * renders "Issue not found" because the lookup never matches.
 *
 * 2026-05-10 — root-cause of "we don't have a full-page implementation":
 * the route exists, the shell renders, but the issue body never resolves.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(
  resolve(__dirname, '../IssueFullPage.tsx'),
  'utf-8',
);

describe('IssueFullPage — itemId contract', () => {
  it('passes issue.issue_key (not issue.id UUID) to CatalystDetailRouter', () => {
    // The wrong pattern: itemId={issue.id}
    // The right pattern: itemId={issue.issue_key}
    expect(
      src.includes('itemId={issue.id}'),
      'IssueFullPage must NOT pass issue.id (UUID) as itemId. ' +
      'useCatalystIssue queries ph_issues by issue_key (F-iter9 PK contract). ' +
      'Passing UUID makes every full-page view silently fail. ' +
      'Change to itemId={issue.issue_key}.',
    ).toBe(false);

    expect(
      src.includes('itemId={issue.issue_key}'),
      'IssueFullPage must pass issue.issue_key (not UUID) to CatalystDetailRouter.itemId.',
    ).toBe(true);
  });

  it('selects issue_key from ph_issues so it is available to pass downstream', () => {
    expect(
      src.includes('issue_key'),
      'IssueFullPage must SELECT issue_key from ph_issues so it can be ' +
      'forwarded as itemId to CatalystDetailRouter.',
    ).toBe(true);
  });
});
