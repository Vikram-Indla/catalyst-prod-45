# 03 — PLAN LOCK — CAT-STRATA-E2E-FIXES-20260711-001

## Objective
Resolve defects from the STRATA E2E QA Report (11 Jul 2026). Slice 1 = the four
frontend-only defects; DB defects deferred to Slice 2 (staging).

## Non-scope (Slice 1)
- 004 milestone roll-up (DB function change) — Slice 2
- 006 Risk/Blocker authoring (new schema + UI) — Slice 2
- 008 theme-under-theme (seed data repair) — Slice 2
- 009 console warnings — Slice 3 (independent cleanups)

## Canonical components (unchanged — reused, none hand-rolled)
- `StrataFormModal` / `FieldControl` (authoring.tsx) — `@atlaskit/datetime-picker`
- `useStrataContext` provider (useStrata.tsx) — existing `?period=` URL pattern reused for `?cycle=`
- Existing `executionApi.createProjectCard` / `valueApi.addPortfolioMember` RPCs

## Files modified (Slice 1)
- `src/modules/strata/hooks/useStrata.tsx` — 002
- `src/modules/strata/pages/StrataExecutionPage.tsx` — 001, 005
- `src/modules/strata/components/authoring.tsx` — 007

## Files forbidden
- Any DB migration (no linked project this slice)
- `src/components/ads/DropdownMenu.tsx` (pre-existing uncommitted change, not ours)
- `.codebase-memory/*` (autogen)

## UI/UX rules
- ADS tokens only; no new colors introduced (all edits reuse existing tokenized components)
- Zero-assumption: date placeholder is a neutral hint ("Select date"), not a fabricated date

## Decisions locked (Vikram, 2026-07-11)
- **001 Unassigned cards:** HIDE null-theme cards from cycle-scoped Execution views
  (a card belongs to a cycle iff its theme is in that cycle).
- **Commit:** commit Slice 1 under this Feature Work ID.
- **DB defects:** proceed on **staging**.

## Validation commands
- `npx tsc --noEmit -p tsconfig.json` → clean
- Live verify on `localhost:8080` (Chrome MCP): screenshots per defect

## Stop conditions
- Any ADS color violation → stop
- Any change touching the DB → stop (Slice 2, staging-gated)
