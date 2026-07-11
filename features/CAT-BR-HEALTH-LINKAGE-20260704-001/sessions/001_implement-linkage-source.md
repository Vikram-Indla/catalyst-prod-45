# Session 001 — Implement BR health linkage source

**Date:** 2026-07-04
**Feature:** CAT-BR-HEALTH-LINKAGE-20260704-001
**Branch:** catalyst/practical-cannon-53eb50 (worktree)

## What

Rewired BR delivery-health from the non-existent `ph_issues.business_request_id` FK to the
app's real link model: `business_request_links` (kind='implementation') → `features`/`stories`
(epics excluded as grouping containers). Decision (Vikram): option (a), no ph_issues schema
change.

## Decisions confirmed (Vikram)

1. Epics excluded from linked work (grouping containers).
2. Cancelled epics — moot (all epics excluded).
3. Stories carry no due_date column → null (honest Uncommitted), no sprint derivation.

## Changes

- NEW `src/lib/date-pulse/normalizeLinkedWork.ts` — shared `fetchLinkedWorkForBRs(brIds)` →
  `Map<brId, WorkItem[]>`. One links query, batched per-table feature/story fetch,
  per-table status normalization + blocked-bool precedence, epic exclusion, soft-delete filter,
  throws on query error.
- `src/hooks/useBusinessRequestHealth.ts` — step-2 now calls the boundary; removed silent
  `{data}`-only ph_issues destructure (now throws → surfaces).
- `src/hooks/useBatchBusinessRequestHealth.ts` — replaced ph_issues query + manual grouping
  with the boundary.

Memory's `date-pulse/normalize.ts` reference was stale (no such file); normalizers previously
only in CatalystSidebarDetails.tsx. New boundary is `normalizeLinkedWork.ts`.

## Verification (cyij staging, project cyijbdeuehohvhnsywig)

- tsc --noEmit: clean.
- Unit: normalizeLinkedWork.test.ts 7/7 (epic exclusion, feature/story status maps, blocked
  precedence, null status→null, story due null, soft-delete skip, brId stamping).
- Seed: MDT-00081 linked to 1 feature (implementing, due 2026-08-15), 2 stories (done, todo),
  1 dummy epic link. E/F/S were 0 on staging → seeded targets too.
- API probe (SQL mirroring normalizer): 3 WorkItems returned (epic excluded), feature
  implementing+dated, stories done/todo null-dated. → engine: linked=3, done=1, in_progress=1,
  committed, On Track/Delayed. Off Uncommitted, no error. All 4 acceptance criteria met.
- Color audit on touched files: clean.

## Out of scope / flagged

- 7 pre-existing time-relative failures in DatePulseEngine/HealthStatusEngine tests (stale
  hardcoded date fixtures vs new Date()). Confirmed independent (fail with my changes stashed).
  Spawned task_b4b44ada.

## Seed cleanup note

Demo rows tagged 'BR-HEALTH-DEMO' on cyij: 1 soft-deleted epic, 1 feature, 2 stories, 4
business_request_links on BR 2dfc9c16-768a-48f7-b4ac-82df3094c994. Remove by name prefix if
staging needs to return to empty.
