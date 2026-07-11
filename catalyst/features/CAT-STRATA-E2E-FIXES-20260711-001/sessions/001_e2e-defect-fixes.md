# Session 001 — E2E defect RCA + Slice 1 fixes

Date: 2026-07-11 · Branch: main · User: Vikram Indla

## What happened
1. Ran mandatory start sequence; no active STRATA feature folder → created this one on approval.
2. Fanned out 4 parallel read-only RCA agents across all 8 QA defects → root-caused each.
3. Discovered the STRATA app would not boot (corrupt `node_modules/.vite` optimize-deps cache).
   Proven pre-existing via full stash. Fixed: stop dev server → `rm -rf node_modules/.vite` →
   `npm run dev`. (I restarted the user's dev server to do this.)
4. Implemented + live-verified 4 frontend defects: 001, 002, 005, 007.
5. Vikram decisions: hide unassigned cards from cycle views (001); commit under this Feature ID;
   do DB defects on staging.

## Root causes (all 8)
- 001: `useProjectCards()`/`filteredCards` never scoped by cycle; out-of-cycle cards fell into
  the "Unassigned" bucket and stayed visible. Cards relate to cycle only via `theme_id`.
- 002: `cycleOverride` was plain `useState(null)` — no URL sync, unlike the working `?period=`.
- 003: no swallowed-error path in client; object now exists → likely the boot-cache environment.
  Latent: client `WRITE_ROLES` (4 roles) vs RPC (`strategy_office`+admin only).
- 004: active `strata_calc_execution_progress` weights by baseline DURATION and ignores the
  `weight` column; NULL when a milestone lacks baseline dates → Actual Progress stays "—".
- 005: pure UI gap; columns + RPC already accept LBU/Delivery Team/Sector; Portfolio via join table.
- 006: Risk = missing schema+RPC+UI; Blocker = UI-only (schema has `strata_dependencies.is_blocker`).
- 007: `FieldControl` date case passed no `placeholder`; @atlaskit defaults to `new Date(1993,1,18)`.
- 008: real seed DATA — `20260705100600` ('play' row) + `20260710120000` (investor 3-tier "pillar")
  set `parent_id` theme→theme, violating the 2-tier root-level-themes contract.

## Slice 1 changes (committed)
- useStrata.tsx: `?cycle=` param + rehydration + setter writes URL (mirrors `?period=`).
- StrataExecutionPage.tsx: cycle-scope `filteredCards` (hide non-cycle + unassigned);
  add LBU/Delivery Team/Sector/Portfolio to New Project Card; chain portfolio membership.
- authoring.tsx: pass `placeholder ?? 'Select date'` to DatePicker.

## Deferred (Slice 2 — staging)
004 (rollup migration), 006 (Risk schema+RPC+UI), 008 (seed data repair + pillar decision),
003 role-gate alignment, 009 console warnings.
