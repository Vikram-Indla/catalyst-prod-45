/**
 * CatalystSidebarDetails — Labels gate canonical parity
 *
 * Vikram defect (2026-05-10): "Labels: the implementation is wrong."
 *
 * Root cause: Two Labels render paths exist in CatalystSidebarDetails:
 *
 *   1. Pinned-fields path (line ~490) — inside `pinnedFields.map`. Renders
 *      whenever 'labels' is in the user's pinned-field set for the issue
 *      type. NO per-type guard. If the user pins Labels on a QA Bug, it
 *      renders despite Labels NOT being in the QA Bug screen scheme
 *      (verified via getJiraIssueTypeMetaWithFields(BAU, 10012) on
 *      2026-05-10 — Labels absent from the 11-field set).
 *
 *   2. Canonical Details section (line ~624) — correctly gated:
 *      `issue?.issue_type === 'Task' || issue?.issue_type === 'Story'`
 *
 * Anti-pattern #18 (CLAUDE.md 2026-05-05): never render a field that is
 * not in the target issue type's screen scheme. The pinned-fields path
 * MUST honor the same gate as the canonical render.
 *
 * Per CLAUDE.md 2026-05-10: Labels gate is currently Task + Story only.
 * QA Bug, Defect, Production Incident, Change Request, Feature, Epic,
 * Backend, Business Request — none render Labels.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(
  resolve(__dirname, '../CatalystSidebarDetails.tsx'),
  'utf-8',
);

describe('CatalystSidebarDetails — Labels gate canonical parity', () => {
  it('pinned-fields Labels branch enforces Task/Story-only gate', () => {
    // Whitespace-tolerant regex: locate the `fieldId === 'labels'` token in
    // the pinned-fields path, then scan ~300 chars forward for the type gate.
    const labelsMatch = src.match(/fieldId === ['"]labels['"][\s\S]{0,300}/);
    expect(
      labelsMatch,
      "Could not locate the `fieldId === 'labels'` branch in pinned-fields map.",
    ).not.toBeNull();

    const branch = labelsMatch![0];
    // The branch MUST include a per-type guard for both Task and Story.
    const hasTypeGate =
      /issue\?\.issue_type === ['"]Task['"]/.test(branch) &&
      /issue\?\.issue_type === ['"]Story['"]/.test(branch);

    expect(
      hasTypeGate,
      'The pinned-fields Labels branch (CatalystSidebarDetails.tsx ~line 490) ' +
      'must enforce the same Task/Story-only gate as the canonical render ' +
      '(~line 624). Anti-pattern #18: never render a field not in the issue ' +
      "type's screen scheme. Verified via getJiraIssueTypeMetaWithFields(BAU, " +
      'QA Bug=10012) on 2026-05-10 — Labels is NOT in the scheme.',
    ).toBe(true);
  });
});
