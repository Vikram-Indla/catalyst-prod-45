# Release Ops — P0 Report: Drawers, Breadcrumbs, Route/Slug

**Feature Work ID:** `CAT-RELEASE-OPS-DISCOVERY-BLUEPRINT-20260706-001`
**Phase:** P0 (drawer removal + breadcrumb compliance + slug-route posture)
**Date:** 2026-07-06
**Target DB:** staging cyij (`cyijbdeuehohvhnsywig`) — probe only, no DDL this phase.
**Build:** PASS (`npm run build` ✓ 1m07s) · `tsc --noEmit` clean.

Locked context: D-001 no drawers · D-002 breadcrumbs mirror Project module · D-003 Atlaskit/Catalyst canonical · D-004 `:changeSlug` per recommendation.

---

## 1. Files inspected

- `src/routes/FullAppRoutes.tsx` (release-hub routes L764–804, lazy imports L66–291)
- `src/lib/routes.ts` (`releaseHubRoutes` L94–107)
- `src/pages/releasehub/ReleaseCalendarPage.tsx` (peek logic)
- `src/pages/releasehub/ChangeDetailPage.tsx` (breadcrumb L136–144, param L109)
- `src/pages/release-hub/ReleaseDetailPage.tsx` (breadcrumb L315–337)
- `src/pages/releasehub/AllReleasesPage.tsx` (row nav L105/291, header L234)
- `src/pages/releasehub/AllChangesPage.tsx` (row nav L215, header L167)
- `src/components/releasehub/ChgDrawer.tsx`, `ReleaseDrawer.tsx`, `ReleasePeekPanel.tsx`
- `src/components/ads/Modal.tsx`, `src/components/releasehub/ReleasePredictorCard.tsx`
- `src/lib/catalyst-rules/RULE_TABLE.md` (Grid E5 breadcrumb ban), `CatalystRules.ts`
- Live schema probe: `information_schema.columns` for rh_changes (no `slug` column present).

## 2. Drawer components found

| Component | Status found | Live importers |
|---|---|---|
| `src/components/releasehub/ChgDrawer.tsx` | banned side drawer, **dead** | 0 (registry noise only) |
| `src/components/releasehub/ReleaseDrawer.tsx` | banned side drawer, **dead** | 0 |
| `src/components/releasehub/ReleasePeekPanel.tsx` | banned right drawer, **live** | 1 (`ReleaseCalendarPage`) |
| Inline sprint peek `<div position:fixed justify:flex-end>` in `ReleaseCalendarPage.tsx:268–278` | banned right side-panel + 2× bare `rgba()` | inline |

No `CatalystDrawer`, `@atlaskit/drawer`, or `AIInsightsDrawer` usage in any release-hub page/component. No raw `@atlaskit/breadcrumbs` in release-hub.

## 3. Drawer usages removed

- **Deleted** `ChgDrawer.tsx`, `ReleaseDrawer.tsx` (dead code, zero importers).
- **Deleted** `ReleasePeekPanel.tsx` (only importer rewired below).
- `ReleaseCalendarPage.tsx`:
  - Removed `ReleasePeekPanel` import; added `ads/Modal` import.
  - `Peek` type narrowed to sprint-only (`{ id, label }`).
  - **Release chip click** → `navigate('/release-hub/${uuid}')` **full-page detail** (was `setPeek(release)`).
  - **Sprint band peek** → centered `ads/Modal` preview of `ReleasePredictorCard` (was a right side-panel). Removed both bare `rgba()` fallbacks in the process (color-law clean).

Net: **zero side drawers / peek panels remain in Release Ops.** Complex detail = full-page (per rule); lightweight sprint prediction = modal preview only.

## 4. Routes changed

- No route file edits required. `AllChangesPage` row-click already navigates full-page (`/release-hub/changes/${id}`); `AllReleasesPage` → `/release-hub/${id}`. Verified live: release row → `/release-hub/releases-management/investor-journey` (full page, no drawer).
- `src/lib/routes.ts` already exposes slug-shaped builders: `releaseHubRoutes.change(changeSlug)` and `.release(releaseSlug)`. No change needed.

### Slug posture (D-004) — migration-safe, no fake slugs
- Live probe: **`rh_changes` has NO `slug` column.** Canonical change route remains `/release-hub/changes/:changeId` (UUID) resolving via `useChange(changeId)`.
- Per rule "do not invent fake slugs silently": **no `:changeSlug` route or UuidToSlugRedirect added yet** — doing so against a non-existent column would be dead/fake wiring.
- **Documented migration need** (deferred to data-model phase): add `rh_changes.slug TEXT NOT NULL UNIQUE` + `generate_slug()` trigger + backfill, then flip route to `:changeSlug`, add `useChangeBySlug`, mount `UuidToSlugRedirect` for legacy `:changeId`. Tracked as blueprint §12 migration #9.
- Existing deep links (`/release-hub/changes/<uuid>`) unbroken.

## 5. Breadcrumb components changed

**None required — already compliant.** All release-hub surfaces use `ProjectPageHeader` (which wraps `ads/Breadcrumbs`); no raw `@atlaskit/breadcrumbs`. Verified against Project-module pattern (`FilterDetailPage.tsx:221`, project L1 `AllProjectsPage.tsx:181`):

| Surface | Pattern | Verdict |
|---|---|---|
| Releases list (L1) | `<ProjectPageHeader hubType="release" />` no trail | ✓ mirrors project L1 |
| Changes list (L1) | `<ProjectPageHeader projectKey="RELEASES" hubType="release" />` | ✓ |
| Calendar (L1) | `<ProjectPageHeader projectKey="RELEASES" hubType="release" />` | ✓ |
| Release detail (L2) | `trail={[{text:'Releases', href:'/release-hub/releases-management'}]}` + `title` | ✓ mirrors project L2 |
| Change detail (L2) | `trail={[{text:'Change Records', href:'/release-hub/changes'}, {text:chg_number}]}` (hideTitle; custom hero) | ✓ back-to-list trail, canonical header, no raw breadcrumbs |

## 6. Atlaskit / Catalyst components used

- `@/components/ads/Modal` (`Modal/ModalHeader/ModalTitle/ModalBody/ModalFooter`) — sprint prediction preview (replaces side panel).
- `@atlaskit/button` (`Button`) — modal footer Close (already imported).
- `@/components/layout/ProjectPageHeader` → `@/components/ads/Breadcrumbs` — unchanged, confirmed canonical.

## 7. CRE checks performed

- Grid E5 (no raw `@atlaskit/breadcrumbs` on hub routes): PASS — none present.
- Color law (no bare hex/rgb/Tailwind color): PASS on changed file (removed 2 `rgba()`; `grep` clean).
- Hand-rolled UI ban: side panels removed in favour of canonical `ads/Modal` + full-page nav.
- Slug contract (Grid F): honoured by deferring — no fake slug route created.

## 8. Screenshots captured (Chrome MCP, localhost:8080)

See `release-ops-screenshot-evidence.md`. Captured: sidebar, Releases list, Release detail (full-page + project breadcrumb, list→full-page proof), Change Records list. Not capturable this pass (staging seed gap, not a code failure): Change detail (0 change rows), sprint modal (no sprint bands in current month), legacy redirect (n/a — no slug route yet).

## 9. Build / test results

- `tsc --noEmit`: clean.
- `npm run build`: PASS (1m07s). Only pre-existing chunk-size warning (vendor-atlaskit), unrelated.
- `npm run lint:colors:gate`: PASS (0 = baseline 0).
- Color grep on changed file: clean.

### Commit status — HELD (concurrent-session collision)
P0 code is complete and build-green but **not committed**. Two reasons, both external to P0:
1. **Foreign uncommitted files in the shared checkout** — `src/components/layout/ProjectHubSidebar.tsx` and `src/pages/project-hub/ProjectDashboardPage.tsx` carry a "2026-07-06 RCA fix — ghost projectKey" that this session did NOT author (another Claude/agent session on the same checkout). Per CLAUDE.md concurrent-session rule, foreign files are neither staged nor reverted.
2. **`npm run audit:ads:gate` fails on non-P0 drift** — `spacing: 4 (baseline 1, +3)`. Traced to the foreign `ProjectDashboardPage` edit (`minHeight: 400`, off-grid). Proven by stash test: the gate still failed with P0's `ReleaseCalendarPage` reverted. The pre-commit husky hook scans the whole working tree, so it would block a commit on drift this session does not own.

P0's own fileset (`ReleaseCalendarPage.tsx` M + 3 deletions + docs + feature folder) introduces **zero** new color/spacing offenders. Landing options for Vikram: (a) let the concurrent session commit/ratchet its own drift first, then P0 commits clean; or (b) land P0 via detached worktree from `origin/main` (cherry-pick only P0 files), per the CLAUDE.md concurrent-session landing pattern.

## 10. Remaining risks

- **Seed gap on staging cyij**: 1 release, 0 changes, no visible sprint bands → change-detail + sprint-modal not live-verified. Mitigation: code-verified via build; seed before P1 acceptance or verify on a richer env.
- Sprint prediction now a modal (was persistent side panel) — a reviewer expecting the old multi-tab release peek should note release chips now open the **fuller** full-page release detail instead (strict upgrade).
- `useReleaseBits` / `useGenerateReleaseNotes` hooks (previously only used by ReleasePeekPanel) may now be unused; left in place (no build impact) — flag for dead-code sweep, not removed in P0 to stay surgical.

## 11. What P1 must handle

- Data-model foundation (the interrupted prompt): `rh_changes.slug` + `generate_slug()` + backfill → then flip change route to `:changeSlug` + `useChangeBySlug` + `UuidToSlugRedirect`.
- Seed staging cyij with changes + sprint bands, then capture Change-detail and sprint-modal screenshots to close the evidence gap.
- Dead-hook sweep (`useReleaseBits`, `useGenerateReleaseNotes`) if confirmed unused post-P0.
