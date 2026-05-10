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

  it('Automation section is not rendered (permanently banned)', () => {
    // CLAUDE.md 2026-05-06: "NEVER implement the Development section,
    // Automation section, or Automate (⚡) button in Catalyst under any
    // circumstances, for any issue type, in any view."
    expect(
      src.includes('No rule executions'),
      'WorkItemDetailsDrawer must NOT render an Automation section. ' +
      'Per CLAUDE.md 2026-05-06, the Automation section is permanently banned ' +
      'from all Catalyst detail views.',
    ).toBe(false);
  });

  it('uses canonical SubtasksPanel (not hand-rolled "Coming soon" stub)', () => {
    // The hand-rolled stub shows a disabled "+ Add" button and static count.
    // Canonical replacement is SubtasksPanel from
    // @/modules/project-work-hub/components/SubtasksPanel — which provides
    // full CRUD, inline create, drag-reorder, and Jira parity.
    expect(
      src.includes("import { SubtasksPanel }"),
      'WorkItemDetailsDrawer must import canonical SubtasksPanel ' +
      'instead of the hand-rolled "Coming soon" disabled stub.',
    ).toBe(true);

    // Ensure the old stub is gone
    expect(
      src.includes("Subtasks ({item.subtaskCount || 0})"),
      'WorkItemDetailsDrawer must NOT render the hand-rolled subtasks stub ' +
      '(static count badge + disabled "+ Add" button).',
    ).toBe(false);
  });

  it('uses canonical LinkedWorkItemsSection (not absent)', () => {
    // Linked work items were entirely absent from WorkItemDetailsDrawer.
    // Canonical implementation is LinkedWorkItemsSection from
    // @/modules/project-work-hub/components/linked-work-items — consistent
    // with CatalystViewDefect, CatalystViewStory, and all other detail views.
    expect(
      src.includes("import { LinkedWorkItemsSection }"),
      'WorkItemDetailsDrawer must import canonical LinkedWorkItemsSection. ' +
      'Linked work items were absent — add the canonical component.',
    ).toBe(true);
  });

  it('uses useCatalystIssue for ph_issues data (canonical data path)', () => {
    // useCatalystIssue queries ph_issues by issue_key — the canonical
    // Jira-synced table. Without it, all canonical components (KeyDetails,
    // ActivitySection, StatusPill) have no PhIssue row to read from.
    expect(
      src.includes("useCatalystIssue"),
      'WorkItemDetailsDrawer must use useCatalystIssue to load the ph_issues ' +
      'row. All canonical sections depend on PhIssue shape.',
    ).toBe(true);
  });

  it('uses useCatalystIssueMutations (replaces legacy stories/features mutations)', () => {
    // useCatalystIssueMutations writes to ph_issues via updateField / updateStatus.
    // The legacy updateItem mutation wrote to stories and features tables directly.
    expect(
      src.includes("useCatalystIssueMutations"),
      'WorkItemDetailsDrawer must use useCatalystIssueMutations. ' +
      'Legacy mutations writing to stories/features tables must be removed.',
    ).toBe(true);
  });

  it('no legacy write to stories table', () => {
    // updateItem.mutationFn wrote supabase.from("stories").update(...).
    // Replaced by useCatalystIssueMutations which writes to ph_issues.
    expect(
      src.includes("from('stories').update"),
      "WorkItemDetailsDrawer must NOT write to the legacy 'stories' table. " +
      'Use useCatalystIssueMutations (writes to ph_issues).',
    ).toBe(false);
  });

  it('no legacy write to features table', () => {
    // updateItem.mutationFn wrote supabase.from("features").update(...).
    // Replaced by useCatalystIssueMutations which writes to ph_issues.
    expect(
      src.includes("from('features').update"),
      "WorkItemDetailsDrawer must NOT write to the legacy 'features' table. " +
      'Use useCatalystIssueMutations (writes to ph_issues).',
    ).toBe(false);
  });

  it('uses canonical CatalystActivitySection (replaces Coming-soon stub)', () => {
    // The Activity tab had a "Coming soon" comment box and a fake single
    // "System created" history entry. CatalystActivitySection provides
    // real comments, activity log, and the ADF comment composer.
    expect(
      src.includes("CatalystActivitySection"),
      'WorkItemDetailsDrawer must render CatalystActivitySection in the ' +
      'Activity tab instead of the "Coming soon" stub.',
    ).toBe(true);

    // Ensure the stub is gone
    expect(
      src.includes("Add a comment..."),
      'WorkItemDetailsDrawer must NOT render the hand-rolled "Add a comment..." ' +
      '"Coming soon" stub. Use CatalystActivitySection instead.',
    ).toBe(false);
  });

  it('uses canonical CatalystKeyDetails (replaces hand-rolled Key Details block)', () => {
    // The hand-rolled Key Details block showed static parent/priority text.
    // CatalystKeyDetails provides the canonical editable parent picker +
    // priority picker with Jira-parity styling.
    expect(
      src.includes("CatalystKeyDetails"),
      'WorkItemDetailsDrawer must render CatalystKeyDetails instead of the ' +
      'hand-rolled static parent/priority block.',
    ).toBe(true);
  });
});
