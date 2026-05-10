/**
 * WorkItemDetailsDrawer — canonical parity tests
 *
 * Jira-compare 2026-05-10 (project-module path):
 *   1. EpicDescriptionRenderer must receive issueKey so MediaProvidersShell
 *      can resolve Jira attachment URLs (images embedded in ADF descriptions).
 *      Without issueKey the jira-attachment-proxy is called with no key and
 *      every image 403s — description looks broken.
 *   2. Development section is permanently banned (CLAUDE.md 2026-05-06):
 *      "NEVER implement the Development section in Catalyst under any
 *      circumstances, for any issue type, in any view."
 *
 * Both are static source-analysis tests (same pattern as AgeingPanel.star.test.tsx).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(
  resolve(__dirname, '../WorkItemDetailsDrawer.tsx'),
  'utf-8',
);

describe('WorkItemDetailsDrawer — canonical parity', () => {
  it('EpicDescriptionRenderer always receives issueKey prop', () => {
    // MediaProvidersShell (inside EpicDescriptionRenderer) needs issueKey to
    // proxy Jira attachment URLs.  A bare <EpicDescriptionRenderer content=.../>
    // without issueKey leaves MediaProvidersShell with undefined and every
    // embedded image 403s — description body looks broken.
    expect(
      src.includes('<EpicDescriptionRenderer content={item.description ?? null} />'),
      'WorkItemDetailsDrawer must not call EpicDescriptionRenderer without issueKey. ' +
      'Add issueKey={jiraData?.item_key ?? item.jiraKey ?? item.key ?? undefined} ' +
      'so MediaProvidersShell can proxy Jira attachment URLs.',
    ).toBe(false);
  });

  it('Development section is not rendered (permanently banned)', () => {
    // CLAUDE.md 2026-05-06: "NEVER implement the Development section in
    // Catalyst under any circumstances, for any issue type, in any view."
    // The section renders "No commits or pull requests linked" which is also
    // banned Jira-specific content with no Catalyst data model backing.
    expect(
      src.includes('No commits or pull requests linked'),
      'WorkItemDetailsDrawer must NOT render a Development section. ' +
      'Per CLAUDE.md 2026-05-06, the Development section is permanently banned ' +
      'from all Catalyst detail views.',
    ).toBe(false);
  });
});
