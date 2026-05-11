/**
 * EditableAssignee + EditableReporter — display fallback chain
 *
 * Vikram defect (2026-05-10):
 *   "Assignee does not come through. I don't know what happens to the
 *    avatar people. Reporter is wrong, so I don't think even one field
 *    is implemented properly."
 *
 * Screenshot showed assignee picker rendering as:
 *   - "Unassigned" + "UN Unknown"
 * Both EditableAssignee and EditableReporter share the same defect:
 *   1. SELECT clause only requests `full_name` — drops `email` entirely.
 *   2. Fallback chain is `full_name ?? 'Unknown'` — when full_name is null
 *      (common for users synced from Jira without full_name populated),
 *      the literal string "Unknown" is shown.
 *
 * Canonical fallback chain: `full_name ?? email ?? 'Unknown'`.
 *
 * Static-source test — asserts both:
 *   (a) profiles SELECT includes `email`
 *   (b) the assignment uses email as the second fallback before "Unknown"
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(
  resolve(__dirname, '../EditableFields.tsx'),
  'utf-8',
);

describe('EditableAssignee / EditableReporter — display fallback', () => {
  it('EditableAssignee profiles SELECT requests email + falls back to email before Unknown', () => {
    // Locate the assignee profiles query
    const block = src.match(
      /queryKey: \['projectMembers-edit-local'[\s\S]{0,1200}/,
    );
    expect(block, 'Could not locate EditableAssignee profiles block').not.toBeNull();
    const text = block![0];
    expect(
      /select\(['"]id, full_name, email['"]\)/.test(text),
      'EditableAssignee: profiles SELECT must include `email` so users without a ' +
      'full_name fall back to their email rather than the literal string "Unknown".',
    ).toBe(true);
    expect(
      /full_name \?\? .*email.* \?\? ['"]Unknown['"]/.test(text),
      'EditableAssignee: display fallback must be `full_name ?? email ?? "Unknown"`.',
    ).toBe(true);
  });

  it('EditableReporter profiles SELECT requests email + falls back to email before Unknown', () => {
    const block = src.match(
      /queryKey: \['projectMembers-reporter'[\s\S]{0,1200}/,
    );
    expect(block, 'Could not locate EditableReporter profiles block').not.toBeNull();
    const text = block![0];
    expect(
      /select\(['"]id, full_name, email['"]\)/.test(text),
      'EditableReporter: profiles SELECT must include `email` so users without a ' +
      'full_name fall back to their email rather than the literal string "Unknown".',
    ).toBe(true);
    expect(
      /full_name \?\? .*email.* \?\? ['"]Unknown['"]/.test(text),
      'EditableReporter: display fallback must be `full_name ?? email ?? "Unknown"`.',
    ).toBe(true);
  });
});
