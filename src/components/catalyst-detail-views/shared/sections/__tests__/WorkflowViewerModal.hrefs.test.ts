/**
 * Guard test for Block 0 of admin Phase C (2026-05-09).
 *
 * The /admin/v2 shell was deleted (Vikram decision, council-approved).
 * WorkflowViewerModal previously linked to /admin/v2/work-items/workflows
 * at two places. Both must point at the surviving WorkHub workflow page
 * (/admin/workhub/jira-activity-sync). Any future regression that
 * reintroduces an /admin/v2 href will be caught here.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

const source = readFileSync(
  resolve(__dirname, '..', 'WorkflowViewerModal.tsx'),
  'utf8',
);

describe('WorkflowViewerModal hrefs', () => {
  it('does not link to any /admin/v2 path', () => {
    expect(source).not.toMatch(/\/admin\/v2/);
  });

  it('links the surviving WorkHub workflow page', () => {
    expect(source).toMatch(/\/admin\/workhub\/jira-activity-sync/);
  });
});
