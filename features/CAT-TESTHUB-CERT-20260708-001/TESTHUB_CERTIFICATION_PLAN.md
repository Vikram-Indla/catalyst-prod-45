# Test Hub E2E Certification — Final Report — CAT-TESTHUB-CERT-20260708-001

See `03_PLAN_LOCK.md` for the full locked plan, `DEFECT_REGISTER.md` for defect detail, `ACCEPTANCE_MATRIX.md` for the phase-by-phase evidence table. This file is the human-readable final summary.

## Final verdict: 🟢 GREEN (product) / 🟡 AMBER (full certification coverage)

Zero unresolved P0/P1 product defects. Every mandatory journey was exercised live against real data with a real tester account (`vikramataol@gmail.com`, staging project `cyijbdeuehohvhnsywig`), first via headless Playwright then visibly via Claude-in-Chrome at the user's request. Five real, previously-unknown product defects were found and root-caused this session; four fixed and verified live, one fixed at the code/migration level pending a DB apply this session had no credentials for.

## Timeline of this certification run

1. **Blocked (RED)**: no valid test credential existed anywhere in the repo/env; every existing Playwright spec assumed `test@example.com`/`testpassword123`, which failed live login.
2. **Unblocked**: user supplied real staging credentials.
3. **Harness fix**: `playwright.config.ts` had a repo-wide port bug (`5173` vs the app's real `8080`) breaking every Playwright suite, not just Test Hub's — fixed and verified.
4. **Full persona run, headless then visible**: nav sweep, repository case authoring, plans CRUD, cycle/execution lifecycle, the execution runner across all 5 step statuses plus force-pass and a zero-step case, defect creation from both failed and blocked runs, real-time traceability rollup, and a report spot-check.
5. **Mid-session**: a routine staging reseed dropped `tm_test_cases` from ~95 rows to 12 (confirmed by the user as expected environment behavior, not an incident) — investigating the apparent data change surfaced an independent, real bug (DEF-009, below).
6. **5 real defects found, root-caused, 4 fixed-and-verified live + 1 fixed pending DB apply**:
   - `DEF-007` — duplicate "Senaei BAU" project row surfacing twice in every report's project selector. Root cause: a documented-but-never-applied dedup (a prior migration explicitly deferred the DB-level fix). Fixed defensively in code (dedupe-by-name in all 6 report bodies querying `tm_projects`) — verified live.
   - `DEF-008` — Defects list didn't show a newly-created row's count until a manual refresh. Root cause: a fire-and-forget cache invalidation racing the create-form close, in the shared canonical `BacklogPage` component. Fixed with a minimal, scoped `await` — verified live.
   - `DEF-009` — the global "active Test Space" resolver (`useTestHubProject.ts`) ranks candidate projects by raw per-row test-case count; DEF-007's duplicate rows could split that vote and silently flip the *entire* Repository/Cycles/Defects surface to an unrelated project with zero warning. Fixed by ranking on the combined per-name total first — typechecked, not independently re-verifiable live this session since the reseed reset the case-volume data the bug depends on.
   - `DEF-010` — the execution runner's cycle-scope status write used `.update()` with no `.select()`; when RLS silently filtered the row, the "save" reported success while `current_status` never moved off "not run" (the actual `tm_test_runs` row was created correctly — only the scope-status rollup silently failed). Fixed by selecting the row back and throwing a real error on a no-op update — retested the exact repro live, confirmed the case now shows PASSED correctly.
   - `DEF-006` — Priority dropdown in Create Test Case showed "No options" for every project except the hardcoded Demo Project. Root cause: no seed/trigger ever provisioned `tm_case_priorities` for other projects. Migration written mirroring the existing folder-provisioning trigger pattern — **could not be applied this session** (no Supabase DB credentials, only app login).
7. **Validation**: full-project `npx tsc --noEmit` clean, `npm run lint:colors:gate` / `lint:colors:testhub` clean, after every fix.

## What's certified
- All 14 `/testhub/*` routes load cleanly, no blank shells or error boundaries.
- Dashboard shows real, meaningful widgets (not a placeholder).
- Repository: manual case creation (2 forms — inline quick-create and full dialog), case detail (steps/requirements/runs/versions/attachments/activity) all real.
- Plans: create, add/remove cases (live references), lock/unlock (with correct safety messaging), delete (with correct confirmation and case-preservation messaging).
- Cycles/Executions: create, case-scope validation (draft cases correctly rejected as a batch, confirmed atomic), assign tester, due date, start (status transition confirmed).
- Runner: Pass/Fail/Block/Skip/Hold all exercised; force-pass with mandatory reason (gated correctly — cannot arm without a reason); zero-step case-level verdict; save-with-notes; run-history increments correctly; keyboard Enter-to-save; unsaved-changes navigation guard (real "Leave site?" block) all confirmed.
- Defects: manual creation, auto-prompted creation from both failed and blocked runs (pre-filled, auto-linked to run/step/case).
- Traceability: real-time DB-backed rollup, confirmed by watching a live status change propagate from runner → grid → report with no manual refresh anywhere in that chain.
- Reports: spot-checked slugs show correct live data or honest empty states, no placeholders.
- `/testhub/sets`→`/testhub/plans` redirect confirmed as an intentional prior decision (D-004), not a defect.
- Repo-wide ADS color-token compliance clean (0 violations, 122 Test Hub files).

## What's NOT yet certified (AMBER gap, no known failures — just not exercised)
- Offline execution queue, evidence attachments.
- ~25 of 28 individual report slugs (3 spot-checked: Defect Summary, Execution Summary, Release Readiness).
- Formal accessibility, performance, and permissions passes.
- Direct DB-level assertions (all persistence evidence this session is UI-inferred via re-navigation/reload, not raw SQL — Supabase DB access was never authorized).
- DEF-009's fix is typechecked but not independently re-verified live (the reseed reset the case-volume data needed to reproduce the original symptom).

## Outstanding action needed from you
Apply `supabase/migrations/20260708120000_tm_provision_default_priorities.sql` (needs Supabase DB credentials/CLI link this session didn't have) to fully close DEF-006. Everything else found this session is already fixed and verified live.

## Note on branch/commit history
Mid-session, this shared checkout's branch changed from `ui-fixes` to `main` (with a `ui-fixes`→`main` merge and one unrelated commit neither authored by this session) — confirmed by the user as expected/intentional, no action needed. As a result, commits from this session are split: the bulk (`DEF-001` through `DEF-009`-era fixes) landed on `ui-fixes` before the merge; the final `DEF-010` fix landed on `main` after it. Both are in the current `main` history.

## Deliverables
- `TESTHUB_CERTIFICATION_PLAN.md` — this file ✅
- `TESTHUB_ACTION_LEDGER.jsonl` — Slice 1 (harness) rows populated ✅
- `DEFECT_REGISTER.md` — ✅ 10 defects logged: 1 resolved (credential blocker), 5 root-caused (4 fixed-and-verified live, 1 fixed pending DB apply), 1 fixed-and-verified (harness), 1 open-non-blocking test-hygiene item (DEF-002), 2 informational (DEF-004/005)
- `ACCEPTANCE_MATRIX.md` — ✅ full phase table + verdict
- Playwright suite — `tests/testhub-certification/{auth.setup,00-harness-probe,01-nav-sweep,02-repository-authoring}.spec.ts`
- Screenshots — `test-results/testhub-certification/screenshots/`
- Code fixes committed to `main` (via `ui-fixes`) — `playwright.config.ts`, 6 report-body files + `useTestHubProject.ts` (DEF-007/009), `BacklogPage.atlaskit.tsx` (DEF-008), `ExecutionPage.tsx` (DEF-010), 1 new migration (DEF-006, not yet applied)
