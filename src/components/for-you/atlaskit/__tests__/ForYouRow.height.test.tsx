/**
 * ForYouRow — row height contract.
 *
 * Jira For You row spec (April 2026): 56px tall for non-Jira-assigned rows.
 * A later live Jira DOM probe (2026-05-17, see comment above the height line
 * in ForYouRow.tsx) found Jira-assigned rows render at 62px tall — the
 * component now branches height on `isJiraAssigned` (62 : 56) rather than
 * using a single fixed value.
 * Updated 2026-07-09: this test previously enforced the single-value 56px
 * spec, which is stale against the later live-probe-backed branch. Assertion
 * updated to match current, evidence-backed behavior.
 *
 * Root-cause ref: preflight 2026-05-10 D2-HIGH
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(
  resolve(__dirname, '../ForYouRow.tsx'),
  'utf-8',
);

describe('ForYouRow — row height', () => {
  it('row container height branches 62 (Jira-assigned) / 56 (default) per live Jira probe, never 48', () => {
    // The container style block is the one with `data-testid="for-you-row"` above it.
    expect(
      src.includes('height: isJiraAssigned ? 62 : 56,'),
      'ForYouRow container must branch height on isJiraAssigned (62 : 56), per the ' +
      '2026-05-17 live Jira DOM probe recorded above the style block. Fix the height ' +
      'in the style object of the role="button" div with data-testid="for-you-row".',
    ).toBe(true);
    expect(
      src.includes('height: 48,'),
      'ForYouRow must not use height: 48 — that was the pre-spec value.',
    ).toBe(false);
  });
});
