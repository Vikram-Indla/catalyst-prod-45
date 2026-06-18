/**
 * ForYouRow — work-item type icon must not lie.
 *
 * Per CLAUDE.md "ZERO-ASSUMPTION CODE — THE LIE VS SILENCE PRINCIPLE"
 * (Assumption Class 1): `JiraIssueTypeIcon type={item.issueType ?? 'Task'}`
 * renders a blue Task checkbox when the real type is unknown — a lie. The
 * icon must be silent (render nothing) when issueType is absent, matching
 * StarredHubList's `{iconType ? <JiraIssueTypeIcon/> : null}` pattern.
 *
 * Source-grep contract (mirrors ForYouRow.height.test.tsx).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(resolve(__dirname, '../ForYouRow.tsx'), 'utf-8');

describe('ForYouRow — type icon (no typed-domain fallback)', () => {
  it("never falls back JiraIssueTypeIcon type to a literal 'Task'", () => {
    expect(
      /JiraIssueTypeIcon[^>]*\?\?\s*['"]Task['"]/.test(src),
      "ForYouRow must not use `type={item.issueType ?? 'Task'}` — render no icon " +
      'when issueType is absent (silence over a lie).',
    ).toBe(false);
  });

  it('guards the icon render on issueType being present (ternary, not ??)', () => {
    // Matches `item.issueType ? <` (conditional render) but NOT `item.issueType ?? '`.
    expect(
      /item\.issueType\s*\?\s*</.test(src),
      'ForYouRow should render JiraIssueTypeIcon only when item.issueType is present.',
    ).toBe(true);
  });
});
