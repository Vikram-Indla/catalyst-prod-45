# EXECUTION PLAN LOCK — 5 slices (added 2026-07-08, post-audit)

> Covers Slices 1–5 from `02_CANONICAL_DISCOVERY.md`. Each slice below is independently timeboxed at 2 hours per the Two-Hour Slice Rule. Approve once, all 5 execute in sequence with a stop-and-report between each (drift/regression check before moving to the next).

## Canonical components selected (all slices)
`@/lib/catalyst-rules` (barrel `index.ts` — `canCreateInModule`, `filterCreatableTypes`, `canLinkTo`, `getAllowedChildTypes`), `src/components/shared/JiraTable/JiraTable.tsx`, `src/components/layout/ProjectPageHeader.tsx` (hubType="release"), ADS tokens (`--ds-color-*`, `--ds-font-size-*`, `--ds-space-*`) — no new components introduced, this is a compliance pass on existing canonicals.

## Canonical screens selected
The 18 live routes audited in `02_CANONICAL_DISCOVERY.md`. No new screens.

---

### Slice 1 — CRE gating on release/change create flows (P0)
**Objective**: gate the 3 highest-traffic create modals through CRE before their Supabase insert.
**Files to modify**: `src/components/releasehub/CreateReleaseModal.tsx`, `src/components/releasehub/CreateChgModal.tsx`, `src/components/releases/ReleaseCreateModal.tsx`.
**Files forbidden**: anything outside these 3 files; no schema changes.
**Rule**: before the insert/`handleSubmit`, call `canCreateInModule`/`filterCreatableTypes` from `@/lib/catalyst-rules`; if disallowed, block submit and show existing error-toast pattern (no new UI).
**Validation**: `npm run lint:cre`, `npx tsc --noEmit`, manual create-flow smoke test (create a release, create a change) in browser.
**Stop condition**: if CRE functions don't cover the release/change entity types cleanly (schema mismatch), stop and report rather than force-fit.

### Slice 2 — CRE gating on Kanban/board link+work-item flows (P1)
**Files to modify**: `src/pages/release-hub/KanbanPage.tsx`, `LinkWorkItemModal.tsx`, `AddDependencyModal.tsx`, `src/components/release-hub/WorkItemsSection.tsx`, `MoveToVersionModal.tsx`, `ReleaseSidePanel.tsx`.
**Files forbidden**: kanban DnD internals unrelated to link/create actions.
**Rule**: wire `canLinkTo`/`getAllowedChildTypes` into card-create, link-work-item, add-dependency, move-to-version handlers.
**Validation**: `npm run lint:cre`, `npx tsc --noEmit`, manual smoke on `/release-hub/release-kanban` (create card, link item, add dependency).
**Stop condition**: same as Slice 1.

### Slice 3 — ADS color hex-fallback purge, shared components (P0)
**Files to modify**: `src/components/shared/JiraTable/JiraTable.tsx`, `src/components/releasehub/EmptyState.tsx`, `src/components/shared/FacetFilterBar.tsx`.
**Files forbidden**: no visual redesign — token swap only, same layout.
**Rule**: replace every `var(--ds-*, rgba(...))` / Tailwind named-color class with the bare `var(--ds-*)` token (no hex fallback), per repo CLAUDE.md color law.
**Validation**: `npm run lint:colors`, `npm run lint:colors:gate`, `npm run audit:ads:gate`, screenshot diff on releases-management/sop-templates/changes/filters (JiraTable is shared across all 4) before/after — must look visually identical (color only, not layout).
**Stop condition**: if a hex fallback exists because no ADS token covers that exact color, flag with `/* ads-scanner:ignore-next-line */` + reason instead of forcing a wrong token — do not invent colors.

### Slice 4 — ADS typography cleanup (P1)
**Files to modify**: `src/pages/releasehub/CommandCenterPage.tsx`, `ReleaseTimeline.tsx`, `ScopeIntegrityPanel.tsx`, `OwnerAlignmentStrip.tsx`, `src/components/layout/ProjectPageHeader.tsx`, `ReleasePredictorCard.tsx`, `ReleaseSettingsPage.tsx`.
**Files forbidden**: no font-family changes, no new heading levels.
**Rule**: replace raw px `fontSize`/`lineHeight` with `var(--ds-font-size-*)`/`var(--ds-font-line-height-*)` matching the closest existing visual size (no size changes without explicit sign-off).
**Validation**: `npm run audit:ads:gate`, screenshot before/after on overview/change-board/calendar (ProjectPageHeader touches all).
**Stop condition**: if replacing a token changes rendered size >2px from original, stop and confirm with Vikram before committing (visual regression risk).

### Slice 5 — Spacing grid + missing-tabs + broken-redirect fix (P1/P2)
**Files to modify**: `JiraTable.tsx`, `ExecutionCalendarPage.tsx`, `ChangeExecutionBoard.tsx`, `ReleaseSidePanel.tsx`, `ChangeCockpitSections.tsx`, `SopRunbook.tsx`, `ReleaseFiltersListPage.tsx`, `SignOffQueuePage.tsx`, `SignoffDependencyGraph.tsx`.
**Rule**: snap padding/gap literals to `[0,4,8,12,16,24,32,40,48]`px grid; add missing tabs row to `ProjectPageHeader` usages; investigate + fix the two broken redirect chains found live (`/release-hub/sign-off-queue`, `/release-hub/sop-templates` — confirm expected destination before repointing).
**Validation**: `npm run audit:ads:gate`, manual click-through of both redirect chains, screenshot before/after.
**Stop condition**: if fixing the redirect requires a route/schema change beyond a `Navigate` target, stop and report — do not add new routes without a Feature Work ID.

## Cross-slice rules
- **Regression check between slices**: run `npx tsc --noEmit` + relevant gate script after each slice before starting the next; if any pre-existing (not-mine) count regresses, stop and report per the RED FLAG protocol.
- **Screenshot checklist**: capture before/after for every touched route, store under `evidence/` in this feature folder.
- **Drift/rebaseline**: if a slice reduces a baseline count (color/audit gates), ratchet down via `--update` flag and commit the baseline file in the same slice's commit.
- **Commit gate**: one commit per slice, explicit file list, message states which slice + validation run.

---

# Release Module UI/UX + CRE + ADS Standardization Audit

## Context

Vikram flagged the Release Hub as text-dense, low-signal, and poor at using viewport space — small illegible text in some spots, noisy walls of text in others. He wants every route in the Release module inspected against: (1) the CRE rule engine (creation/link flows must call `src/lib/catalyst-rules`), (2) ADS token compliance (no hardcoded colors, typography/spacing on the governance scale), and (3) canonical-component reuse (replace hand-rolled UI with `JiraTable`, `ProjectPageHeader`, `StatusLozenge`, etc.). Output requested: a pass/fail matrix per route + an attack plan to bring the module to ADS/CRE standard. This round is **audit + plan only** — no code changes yet (Plan Lock required first per `CLAUDE.md`).

Discovery already done (3 parallel Explore agents):
- Full route→page→component map of the Release module.
- Prior blueprint feature (`CAT-RELEASE-OPS-DISCOVERY-BLUEPRINT-20260706-001`) — discovery-only, P0–P11 never started, canonicals already selected there (`JiraTable`, `ProjectPageHeader` hubType="release", `StatusLozenge`, `ads/Modal`, `ads/SectionMessage`, `ads/Flag`, `CatalystAvatar`, drawers banned).
- CRE + ADS tooling locations and exact gate commands.

## Key finding: two parallel trees — scope to the LIVE one

Router (`src/routes/FullAppRoutes.tsx:798-837`, `src/lib/routes.ts:94-108`) only mounts:
`src/pages/releasehub/*`, `src/pages/release-hub/*`, `src/components/releasehub/*`, `src/components/release-hub/*` (mostly), `src/components/releases/*` (shared with `ReleasesPage`), plus the Release section of `src/pages/ForYouPage.atlaskit.tsx`.

A second tree — `src/pages/releases/*`, `src/features/all-releases/*`, `src/features/release-calendar/*`, `src/features/release-compare/*` — is **not routed anywhere** (only referenced by a docs/usage-map generator) and carries the overwhelming majority of hardcoded colors and `text-[Npx]` hits found in the grep sweep. Auditing/fixing dead code wastes the timebox. **Scope this audit to the 21 live routes below; flag the orphaned tree as a separate deletion candidate** (spawn a task chip, don't fix it).

## Live routes to inspect (21 + For You section)

1. `/release-hub/overview` — `CommandCenterPage.tsx`
2. `/release-hub/release-kanban` — `ReleaseBoardCanonical.tsx` → `KanbanPage` (mode="release")
3. `/release-hub/change-board` — `ChangeExecutionBoard.tsx`
4. `/release-hub/execution` — `ExecutionCalendarPage.tsx`
5. `/release-hub/work` — `ReleasesWorkCanonical.tsx` → `ProjectAllWorkView`
6. `/release-hub/filters`, `/filters/create`, `/filters/:filterId`
7. `/release-hub/production-events`, `/production-events/:eventKey`
8. `/release-hub/calendar` — `ReleaseCalendarPage.tsx`
9. `/release-hub/releases-management` — `ReleasesPage.tsx` (canonical, shared w/ project-hub)
10. `/release-hub/releases-management/:slug` — `ReleaseDetailPage.tsx` (release-hub dir, 609 lines)
11. `/release-hub/releases-management/:slug/work` — `ReleaseWorkNavigatorPage.tsx` (929 lines)
12. `/release-hub/changes`, `/changes/:changeId` — `AllChangesPage.tsx`, `ChangeDetailPage.tsx`
13. `/release-hub/sop-templates` — `SopTemplatesPage.tsx`
14. `/release-hub/sign-off-queue` — `SignOffQueuePage.tsx`
15. `/release-hub/freeze-windows` — `FreezeWindowsPage.tsx`
16. `/release-hub/settings` — `ReleaseSettingsPage.tsx`
17. `/for-you` — `ReleaseOpsForYouSection`, `ReleaseChangeAnnouncementBanner`

(`ReleaseComparePage.tsx`, `TriageQueuePage.tsx`, `src/pages/releasehub/ReleaseDetailPage.tsx` (the *other* one, sibling dir) are dead-redirected — same treatment as orphaned tree, don't audit as live.)

## The 3 validation lenses per route

**A. CRE rule compliance** — any create/link action on the route (`CreateReleaseModal`, `CreateChgModal`, `CreateSopTemplateModal`, `CreateFreezeWindowModal`, `RaiseIssue`) must import from `src/lib/catalyst-rules` (barrel `index.ts`) and call `filterCreatableTypes`/`canLinkTo`/`canCreateInModule` — the same pattern `scripts/cre-chokepoint-gate.cjs` enforces for its hardcoded chokepoint list (which does **not** currently include these Release-module modals — that's itself a gap to flag: CRE gate has no Release-module chokepoints registered).

**B. ADS token compliance** — per route, grep-scoped (not the noisy repo-wide gate) for: bare hex/rgb/hsl, Tailwind color utilities, `var(--ds-*, #fallback)`, non-token `fontSize:`/`text-[Npx]`/`text-xs`/`text-sm` (should be `--ds-font-size-*` or the governance heading/body scale), and off-grid spacing (`padding`/`margin`/`gap` not on the `[0,4,8,12,16,24,32,40,48]px` grid from `design-governance/rules/spacing-grid-validator.js`).

**C. Canonical-component + viewport/density UX** — for each route: does it use `JiraTable`/`ProjectPageHeader`/`StatusLozenge`/`ads/Modal` where a table/header/status/modal exists, or is there a hand-rolled equivalent? And a live-rendered check (screenshot + computed styles via Chrome MCP, not just grep — token usage can still render too-small/cramped) against Atlassian Design System heading/body scale and 8px spacing rhythm, plus whether the viewport is under-utilized (e.g. the Calendar/Execution screenshots already show large dead whitespace below sparse content — that's a layout issue, not a token issue).

## Decisions locked

- **Orphaned tree excluded from audit** (`src/pages/releases/*`, `src/features/all-releases/*`, `release-calendar`, `release-compare`, dead-redirected `ReleaseComparePage.tsx`/`TriageQueuePage.tsx`/sibling-dir `ReleaseDetailPage.tsx`). Not routed anywhere live — spawn a background task chip proposing confirm-then-delete instead of folding it into this feature.
- **Execution uses Workflow orchestration** — the 21-route inspection is a `pipeline()` with one stage per lens per route (grep sweep, then live screenshot/computed-style + design-critique), so routes don't block each other on the slowest stage.

## Execution plan (after Plan Lock approval)

1. **Create Feature Work ID + folder**: `CAT-RELEASE-UI-STANDARDIZATION-20260707-001` under `~/catalyst/features/` with the standard artifact set, Plan Lock derived from this document.
2. **Per-route inspection pass** — `Workflow` script, `pipeline(routes, grepStage, liveRenderStage)`:
   - Grep sweep (lens A + B) — fast, already have a head start from discovery.
   - Live render check (lens C) — Chrome MCP screenshot + `get_page_text`/computed-style probe at `localhost:8080`, run the `design-critique` skill's heuristic scoring per route (mandatory per that skill's own trigger rule for design-only surfaces).
   - Spawn the background task chip for orphaned-tree deletion in parallel with (not blocking) the pipeline.
3. **Build the matrix** — one row per route, columns: CRE ✅/❌, ADS-color ✅/❌, Typography-scale ✅/❌, Spacing-grid ✅/❌, Canonical-component ✅/❌ (with gap named), Viewport-density ✅/❌ (with 1-line note), Priority (P0/P1/P2).
4. **Attack plan** — group failing rows into 2-hour slices (per the Two-Hour Slice Rule): e.g. Slice 1 = register Release-module modals as CRE chokepoints; Slice 2 = swap raw `text-[Npx]`/`text-xs` for `--ds-font-*` scale on the worst 3 routes; Slice 3 = layout/density fix for Calendar+Execution (currently near-empty despite full viewport); etc. Each slice needs its own Plan Lock before code per `CLAUDE.md`.
5. Flag orphaned `src/pages/releases/*` + `src/features/all-releases/*` + `release-calendar` + `release-compare` trees as a separate spawn-task ("confirm dead, then delete") — do not fold into this feature's scope.
6. `/goal` loop stays active until every one of the 21 routes has a matrix row with all 3 lenses inspected (grep + live render) — this plan's step 2–3 is what satisfies that condition.

## Verification

- Matrix delivered as the audit artifact (in `02_CANONICAL_DISCOVERY.md` or a dedicated `AUDIT_MATRIX.md` in the new feature folder).
- Each ✅ cell backed by either a grep result (color/typography/spacing) or a live screenshot/computed-style probe (viewport/density, canonical component presence) — no cell marked from memory.
- No code touched this round; first code change happens only after a route-specific Plan Lock is approved.
