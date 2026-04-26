/**
 * LinkedWorkItemsSection — canonical entry point for every detail view.
 *
 * After the BAU-4771 pilot, the Atlaskit-based `LinkedWorkItems` molecule
 * is the production default across Catalyst. This wrapper is what every
 * detail view (Epic, Story/BusinessRequest, Feature, Defect, Subtask,
 * Incident, Task) now imports — no more branching on issue key at the
 * call site.
 *
 * What it adds on top of <LinkedWorkItems />:
 *
 *   1. `AtlaskitBoundary` — if the Atlaskit stack fails to load or
 *      throws at runtime (chunk-load failure after a bad deploy,
 *      prosemirror-singleton regression, etc.), it silently falls back
 *      to the legacy `LinkedIssuesSection`. Users are never stranded
 *      without a working link section.
 *
 *   2. Stable `diagnosticTag` — the boundary logs `[AtlaskitBoundary]
 *      linked-work-items:<issue_key>` on fallback, so on-call has a
 *      unique string to grep in browser logs.
 *
 *   3. Consistent prop contract — callers pass the same `issueId`,
 *      `issueKey`, `projectKey` triple they already passed to the legacy
 *      section, so rolling out is a pure import swap + tag rename.
 *
 * This file is the ONLY approved way to render linked work items in a
 * Catalyst detail view going forward. Do not import `LinkedWorkItems`
 * directly from feature code — the boundary is mandatory.
 */
import React from 'react';
import { AtlaskitBoundary } from '@/components/shared/rich-text/atlaskit/AtlaskitBoundary';
import { LinkedIssuesSection } from '@/modules/project-work-hub/components/dialogs/story-detail-modules';
import { LinkedWorkItems } from './LinkedWorkItems';

export interface LinkedWorkItemsSectionProps {
  /** UUID of the current work item (legacy compat). */
  issueId: string;
  /**
   * Display key (e.g. "BAU-4771"). Required — `ph_issue_links` is keyed
   * on `issue_key`, not UUID. If the consumer doesn't yet have the key
   * resolved (early render), pass a falsy string and this component
   * renders nothing safely.
   */
  issueKey?: string;
  /** Used by the create-linked-work-item flow to resolve projectId. */
  projectKey?: string;
  /** Optional override for the link picker AsyncSelect loadOptions. */
  loadOptionsOverride?: (input: string) => Promise<any[]>;
}

export function LinkedWorkItemsSection({
  issueId,
  issueKey,
  projectKey,
  loadOptionsOverride,
}: LinkedWorkItemsSectionProps) {
  // Early-render guard: some detail views render the section while the
  // primary issue query is still loading. Matches legacy behaviour —
  // the legacy section simply showed an empty state when key was ''.
  if (!issueKey) {
    return <LinkedIssuesSection issueId={issueId} issueKey="" />;
  }

  return (
    <AtlaskitBoundary
      diagnosticTag={`linked-work-items:${issueKey}`}
      fallback={<LinkedIssuesSection issueId={issueId} issueKey={issueKey} />}
    >
      <LinkedWorkItems
        issueId={issueId}
        issueKey={issueKey}
        projectKey={projectKey}
        loadOptionsOverride={loadOptionsOverride}
      />
    </AtlaskitBoundary>
  );
}

export default LinkedWorkItemsSection;
