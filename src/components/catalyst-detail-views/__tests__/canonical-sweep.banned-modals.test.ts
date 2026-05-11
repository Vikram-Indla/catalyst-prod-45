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
  // P1 — file 3 (this PR) — 288 lines, 0 callers. Hand-rolled work-item
  // detail panel built on shadcn primitives (@/components/ui/button etc.),
  // not Atlaskit. Dead since at least the prior canonical migration.
  // (File 2 — ProjectListView / WorkItemDetailPanel — lands in PR #160.)
  'modules/work-hub/components/AllWorkDetailPanel.tsx',
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
