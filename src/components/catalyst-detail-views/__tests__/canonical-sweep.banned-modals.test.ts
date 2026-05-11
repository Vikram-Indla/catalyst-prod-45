/**
 * Canonical-sweep guard — banned non-canonical detail modals
 *
 * Mandate (2026-05-11): every issue/work-item detail view in Catalyst must
 * route through `<CatalystDetailRouter>` so the same per-type
 * `CatalystView*` components render in both panelMode (modal/drawer) and
 * fullPageMode (route page). Parallel hand-rolled modals/panels/drawers
 * fragment the surface and re-introduce defects that the canonical chain
 * already fixed (Share URL, parent picker portal, typography spec,
 * avatar fallback, print stylesheet, etc.).
 *
 * This test guards the sweep — it fails if a banned path re-appears in
 * src/. As each P1/P2/P3/P4 file is converted, add it to BANNED below.
 *
 * Phase 1, file 1 (this commit): WorkItemDetailModal.tsx was 100% dead
 * code (0 imports anywhere in src/) and was deleted. Plus its only
 * consumer, DetailRightSidebar.tsx.
 */
import { describe, it, expect } from 'vitest';
import { existsSync } from 'fs';
import { resolve } from 'path';

const repoSrc = resolve(__dirname, '../../..');

const BANNED_PATHS = [
  // P1 — file 1
  'components/project-hub/work-items/WorkItemDetailModal.tsx',
  'components/project-hub/work-items/detail/DetailRightSidebar.tsx',
  // P1 — file 2 — ProjectListView.tsx was already @deprecated 2026-04-18;
  // WorkItemDetailPanel.tsx was its only detail-view consumer. ProjectAllWorkView
  // is the active, canonical alternative (already uses CatalystDetailRouter).
  'pages/project-hub/jira-list/ProjectListView.tsx',
  'pages/project-hub/jira-list/components/WorkItemDetailPanel.tsx',
  // P1 — file 3 — 288 lines, 0 callers. Hand-rolled work-item
  // detail panel built on shadcn primitives (@/components/ui/button etc.),
  // not Atlaskit. Dead since at least the prior canonical migration.
  'modules/work-hub/components/AllWorkDetailPanel.tsx',
  // P1 — files 4 + 5 + 6 (this PR) — close out the sweep.
  // All three: 0 imports anywhere in src/ (truly dead). Total 1,740 lines.
  // IssueDetailPanel: the index.ts barrel still exports a `() => null` stub
  // by the same name — that's self-contained and out of scope here.
  'modules/work-hub/components/IssueDetailPanel.tsx',
  'modules/project-work-hub/components/drawers/EpicDetailDrawer.tsx',
  'modules/project-work-hub/components/drawers/StoryDetailDrawer.tsx',
  // P2 — files 7 + 8 (this PR) — both 0 imports, dead code.
  // File 9 (ForYouDetailPanel) is deferred: ForYouPage.atlaskit.tsx still
  // routes BRD items (business_request / business_gap) through it. Needs a
  // proper migration to CatalystViewBusinessRequest v2, not just deletion.
  'components/items/epics/EpicDetailModal.tsx',
  'components/boards/BoardIssueDetailDrawer.tsx',
];

describe('Canonical sweep — banned non-canonical detail-view files must not exist', () => {
  for (const rel of BANNED_PATHS) {
    it(`${rel} must remain deleted`, () => {
      const fullPath = resolve(repoSrc, rel);
      expect(
        existsSync(fullPath),
        `${rel} was removed in the canonical-router sweep — every issue ` +
        'detail view must route through <CatalystDetailRouter> (panelMode ' +
        'or fullPageMode). Re-adding this file fragments the surface and ' +
        'will re-introduce already-fixed defects.',
      ).toBe(false);
    });
  }
});
