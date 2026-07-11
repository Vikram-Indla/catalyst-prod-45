# Audit Matrix — 18 live Release Hub routes

Method: per-route grep sweep (CRE import check, ADS color/typography/spacing grep) + live Chrome MCP screenshot/computed-style check via a `pipeline()` Workflow (37 agents, 2.5M tokens, ~5min wall-clock). Raw per-agent output in journal at `wf_725b595d-28f` if deeper citation needed.

| Route | CRE | ADS-Color | Typography | Spacing | Canonical-Component | Viewport-Density | Priority |
|---|---|---|---|---|---|---|---|
| /release-hub/overview | N/A* | ❌ | ❌ | ✅ | ❌ | ❌ | P0 |
| /release-hub/release-kanban | N/A* | ✅ | ✅ | ❌ | ❌ | ✅ | P1 |
| /release-hub/change-board | N/A | ❌ | ❌ | ❌ | ❌ | ❌ | P1 |
| /release-hub/execution | N/A | ✅ | ✅ | ❌ | ❌ | ❌ | P2 |
| /release-hub/work | N/A | ✅ | ❌ | ✅ | ❌ | ❌ | P1 |
| /release-hub/filters | N/A | ✅ | ✅ | ❌ | ✅ | ❌ | P2 |
| /release-hub/production-events | N/A | ❌ | ❌ | ✅ | ❌ | ❌ | P1 |
| /release-hub/calendar | N/A | ✅ | ❌ | ✅ | ❌ | ❌ | P2 |
| /release-hub/releases-management | N/A* | ❌ | ✅ | ❌ | ❌ | ❌ | P0 |
| /release-hub/releases-management/:slug | N/A* | ✅ | ✅ | ❌ | ❌ | ❌ | P1 |
| /release-hub/releases-management/:slug/work | N/A | ✅ | ✅ | ✅ | ❌ | ❌ | P2 |
| /release-hub/changes | N/A* | ❌ | ❌ | ✅ | ❌ | ❌ | P0 |
| /release-hub/changes/:changeId | N/A | ✅ | ✅ | ❌ | ❌ | N/A | P2 |
| /release-hub/sop-templates | N/A | ❌ | ✅ | ❌ | ❌ | N/A | P1 |
| /release-hub/sign-off-queue | N/A | ✅ | ✅ | ❌ | ❌ | N/A | P0 |
| /release-hub/freeze-windows | N/A | ✅ | ✅ | ✅ | ❌ | ❌ | P2 |
| /release-hub/settings | N/A | ✅ | ❌ | ✅ | ✅ | ✅ | P2 |
| /for-you | N/A | ✅ | ✅ | ✅ | ❌ | ✅ | P2 |

N/A (CRE) = route has no create/link action to gate.
N/A* = **closed as category error 2026-07-08**: `rh_releases`/`rh_changes` are Release-Ops domain entities, not Jira-parity work-item types in `CRETypeName` (`CatalystRules.ts:43-56`) — no hierarchy/creation-rights problem exists for CRE to gate here. Original Slices 1–2 retired; see `03_PLAN_LOCK.md` RED FLAG note.
Canonical-Component ❌ mostly = ProjectPageHeader missing its tabs row (near-universal deviation across live screenshots), not a full hand-rolled-header problem.

## Attack Plan (2-hour slices)

**~~Slice 1/2 — CRE gating~~ — RETIRED (category error)**: Release/Change creation and Kanban link actions don't map to any CRE-governed type. No code change needed; matrix cells reclassified N/A.

**Slice 3 — ADS color hex-fallback purge, shared components first (P0)**
Files: `src/components/shared/JiraTable/JiraTable.tsx` (17 hits — used by releases-management, sop-templates, changes, filters), `src/components/releasehub/EmptyState.tsx`, `src/components/shared/FacetFilterBar.tsx`.
Replace `var(--ds-*, rgba(...))` / Tailwind named-color classes with bare tokens; fixing `JiraTable.tsx` alone clears violations on 4+ routes.

**Slice 4 — ADS color + typography cleanup, route-local files (P1)**
Files: `src/pages/releasehub/CommandCenterPage.tsx`, `ReleaseTimeline.tsx`, `ScopeIntegrityPanel.tsx`, `OwnerAlignmentStrip.tsx`, `src/components/layout/ProjectPageHeader.tsx` (raw `fontSize`/`lineHeight`, hits 5+ routes), `ReleasePredictorCard.tsx`, `ReleaseSettingsPage.tsx`.
Replace raw px `fontSize`/`lineHeight` with `var(--ds-font-size-*)`/`var(--ds-line-height-*)`.

**Slice 5 — Spacing grid + canonical-header (missing tabs) sweep (P1/P2)**
Files: `JiraTable.tsx` (10px/6px/2px hits), `ExecutionCalendarPage.tsx` (gap:6), `ChangeExecutionBoard.tsx`, `ReleaseSidePanel.tsx`, `ChangeCockpitSections.tsx`, `SopRunbook.tsx`, `ReleaseFiltersListPage.tsx`, `SignOffQueuePage.tsx`/`SignoffDependencyGraph.tsx`.
Snap padding/gap to `[0,4,8,12,16,24,32,40,48]` grid; add the missing tabs row to `ProjectPageHeader` usages; confirm/repoint two broken redirect chains found live (`/release-hub/sign-off-queue`, `/release-hub/sop-templates`).

## Separately: orphaned legacy Release tree

Deleted 2026-07-08, commit `a183d8d33` (39 files, 10484 lines): `src/pages/releases/*`, `src/features/all-releases/*`, `src/features/release-calendar/*`, `ReleaseArtifactSelector.tsx`, `pages/releasehub/ReleaseComparePage.tsx`, `TriageQueuePage.tsx` — confirmed zero live imports before deletion.

**Kept, contrary to initial task assumption**: `src/pages/releasehub/ReleaseDetailPage.tsx` is live (`/release-hub/:releaseId` route + `ReleaseDetailContent` embedded in `ProjectAllWorkView`/`CatalystDetailPanel`). `src/features/release-compare` kept — used by 2 Storybook stories (`ReleaseSelector.stories.tsx`, `PortfolioSelector.stories.tsx`), Vikram chose to keep over deleting stories.
