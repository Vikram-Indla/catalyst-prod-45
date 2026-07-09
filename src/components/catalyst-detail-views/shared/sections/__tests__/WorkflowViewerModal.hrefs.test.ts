/**
 * Guard test for Block 0 of admin Phase C (2026-05-09).
 *
 * The /admin/v2 shell was deleted (Vikram decision, council-approved).
 * WorkflowViewerModal previously linked to /admin/v2/work-items/workflows
 * at two places. Both must point at the surviving workflow admin page.
 * Any future regression that reintroduces an /admin/v2 href will be
 * caught here.
 *
 * 2026-07-09: WorkflowViewerModal was rewritten to delegate entirely to
 * CatalystWorkflowModal (reads ph_workflow_ and ph_wf_ tables directly),
 * which no longer contains any href itself — see WorkflowViewerModal.tsx's own
 * header comment. The "surviving WorkHub workflow page" this test
 * originally pointed at (/admin/workhub/jira-activity-sync) has itself
 * since been superseded by /admin/workflows (WorkflowAdminPage, per the
 * versioned-canonical-workflow-engine work) — /admin/workhub/jira-activity-
 * sync no longer exists anywhere in FullAppRoutes.tsx. This test now
 * follows the delegation and checks the link inside CatalystWorkflowModal.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

const source = readFileSync(
  resolve(__dirname, '..', 'WorkflowViewerModal.tsx'),
  'utf8',
);

const catalystWorkflowModalSource = readFileSync(
  resolve(__dirname, '../../workflow/CatalystWorkflowModal.tsx'),
  'utf8',
);

describe('WorkflowViewerModal hrefs', () => {
  it('does not link to any /admin/v2 path', () => {
    expect(source).not.toMatch(/\/admin\/v2/);
  });

  it('delegates to CatalystWorkflowModal, which does not link to any /admin/v2 path either', () => {
    expect(catalystWorkflowModalSource).not.toMatch(/\/admin\/v2/);
  });

  it('links the surviving workflow admin page', () => {
    expect(catalystWorkflowModalSource).toMatch(/\/admin\/workflows/);
  });
});
