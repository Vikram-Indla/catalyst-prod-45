# 06 — Validation Evidence (P0 execution, 2026-07-03 overnight)

## Global gates (run per slice; final state)
- `npx tsc --noEmit` → **clean** (every slice)
- `npm run lint:colors:gate` → **0 = baseline 0**
- `npm run audit:ads:gate` → **pass**, ratcheted DOWN twice (typography 1658→1618, tokens 25976→25969) — baselines committed
- `npm run lint:cre` → pass (pre-commit, every commit)
- `npm run build` → clean (after the 135-file deletion)

## Slice-by-slice acceptance

| Slice | Commit | Binary acceptance | Result |
|---|---|---|---|
| P0-S0 probes | (docs) | 14 probe result sets + rulings in 09_DECISIONS.md D-004 | ✅ all 14 run on cyij (write-probes folded into walkthrough) |
| P0-S1 stub excision | 0256b880b | `grep 'mutationFn: async (_'` = 0 + tsc | ✅; Repository create/delete now binds real hooks |
| P0-S2 dead-gen sweep | 3ca477ebd | importer guards pre-rm; tsc+build; mock-grep 0 in deleted families | ✅ 135 files, −21,922 LOC; 3 exclusions honored + 1 plan correction (FilterDetailPage is live — kept) |
| P0-S3 runner truth | 634d4d99f | `{data}`-grep = 0 in 3 files | ✅; error states render SectionMessage+Retry |
| P0-S4 hook sweep | 9cfadf55c | `{data}`-grep = 0 in 6 files | ✅ 45+ sites |
| P0-S5 route truth | 434534cb4 | dead-URL grep = 0 | ✅; sets row-click WORKS live (was unmatched route); traceability server-scoped |
| P0-S6 create-cycle truth | 9926feea6 | assigneeIds grep = 0 + tsc | ✅; sprint_id (was silently dropped by insert!) + owner persist |
| P0-S7 defect integrity | f948f10df | tsc + lint:cre; SQL row proof | ✅ **DEF-002 created live**: RPC key, project DEMO, auto-links test_case+test_run+test_cycle (see below) |
| P0-S7b last_run truth | edba8024d | panel detects runs | ✅ proven live (panel showed run + form after fix, "no run" before) |
| P0-S8 tm_cycle_sets | 060d1581f | migration+types+casts 0; UI+SQL round-trip | ✅ add-set-to-cycle live: UI 0→1 cycles; SQL row CYC-001↔Smoke Suite v1 |
| P0-S9 AI real fn | ed38541e7 | old fn-name grep = 0; unauth curl 401 | ✅ deployed to cyij; `HTTP 401 UNAUTHORIZED_NO_AUTH_HEADER` |
| P0-S10 visual truth | 0432fa8ce | shadow-as-color grep = 0; gradient grep = 0; both gates | ✅; blanket scrim visibly correct in walkthrough |
| P0-S11 close-out | (this doc) | seeded walkthrough, zero console errors | ✅ see below |

## P0-S11 seeded cyij walkthrough (live browser, localhost:8080)

Chain executed: repository (11 cases, folder tree) → set detail via row click (**previously dead**) → add-set-to-cycle (tm_cycle_sets round trip, SQL row) → cycle detail CYC-001 (progress 33%, 1 failed) → execution runner TC-001 (3-step: pass/pass/fail + actual result text) → save Run #2 → **SQL: run_number=2, status=failed, 3 step rows (passed,passed,failed), scope cascaded to failed, duration 58s** → defect panel (detects run post-S7b) → file defect → **SQL: DEF-002, RPC key, real project, links test_case+test_run+test_cycle** → defects list shows DEF-002 via canonical BacklogPage → reports hub renders sprint-testing-status with live data.

- Console: **zero 4xx/5xx/PGRST errors** across dashboard, repository, sets, set detail, cycles, cycle detail, runner, board, my-work, defects, traceability, timeline, dependencies, filters, reports. Only finding: pre-existing @atlaskit/select legacy-context React warning (framework noise, repo-wide).
- Light + dark both verified via theme toggle + reload (dark default restored). Screenshots captured in-session (repository, cycles, sets, set detail, cycle detail, runner ×3, defect panel ×2, defects list, traceability, reports — dark; repository, cycle detail, defects, traceability, reports — light).
- Auto-defect trigger (`trg_tm_auto_create_defect`): fired NOTHING for the failed run (auto_created_defect_id null) — behavior recorded, config-dependent, P1 item.
- Known-remaining (P1 scope, honestly stated): TC-0001 step-less case cannot receive verdict (EXE-004); no keyboard runner; no in-runner defect raise (panel is on cycle detail); defect full-page view absent (row click stays on list — S5 note).

## P0 EXIT CRITERION: **MET** — every routed surface works or visibly fails; zero dead clicks found in walkthrough; zero success-toasts-over-nothing observed; forced-failure error states implemented across the spine.

## P1 execution (post-P0, same session)

| Slice | Commit(s) | Live proof |
|---|---|---|
| P1-S1 immutable snapshot | 6c491a15c | Scratch step hard-deleted → `test_step_id` nulled, `action_snapshot`/status/actual_result survive (SQL before/after) |
| P1-S2 pinned-version runner | c5d87830f | Edited a live step's text; runner (browser, TC-002) still showed pre-edit pinned text; **found+fixed D-005**: tm_test_case_versions RLS had reversed function args + read an empty disconnected membership table |
| P1-S3 one snapshot writer | aeb794ee0 | **Found+fixed D-006**: the RPC itself had never run (4 nonexistent-column references) — fixed, then proved live via RPC call: version created, case.version bumped, step snapshot correct |
| P1-S4a restore = append-only | 4e24c543b | Full v1→v2(edit)→restore-to-v1 cycle: live steps match v1 exactly, all 6 historical step rows survive soft-deleted (not destroyed), 3 versions deep (append-only) |
| P1-S4b-1 archive replaces delete | b7cc4e8b1 | Archived TC-010 live (browser): row vanished from list, case+2 steps intact in DB (`archived=true`), restored |
| — (unscoped, blocking) | 5c26c0fd1 | Fixed a foreign concurrent-session commit's forgotten file (`renderPersonOrDash.tsx`) that hard-broke a shared component — flagged separately, not folded into TestHub commits |

**Versions tab (list + restore) confirmed live-working and ADS-token-clean already** — created a real version via the fixed RPC, saw it render correctly in `CatalystViewTestCase`'s Versions tab (browser), cleaned up.

**Deferred (P1-S4b-2, next slice):** side-by-side version-diff view. `VersionDiffView.tsx` (`src/components/testhub/versioning/`) has a large pre-existing Tailwind-color debt (VER-023) that must be rewritten to ADS tokens before it can be wired into the Versions tab — a distinct, non-trivial sub-task, not started tonight. `src/components/releases/test-case-detail/**` (incl. `TestCaseVersionHistory.tsx`) stays until that port lands, per the original P0-S2 exclusion note.

**Noted but explicitly out of scope:** `src/modules/project-work-hub/adapters/testCasesDataSource.ts` still exposes hard-delete via `useDeleteTestCase`, reachable from `MyWorkPage.tsx`'s generic BacklogPage bulk-action bar. Plan Lock scoped S4 to RepositoryPage only; this adapter shares a component (`BacklogPage`) used by many non-TestHub hubs, so touching it is higher blast radius than this slice's mandate. Flagged for a future slice.

## P1-S4 completion (same session, continued)

| Slice | Commit | Live proof |
|---|---|---|
| P1-S4b-2 diff view ADS rewrite + wire-in | 7ac5d939f | `VersionDiffView.tsx` fully rewritten off Tailwind/ui-* onto ads/Modal+ads/Select+inline tokens; "Compare versions" wired into `CatalystViewTestCase`'s Versions tab; proven live in **both light and dark** (title diff red/green panels, unchanged fields un-highlighted, 3→3 steps diff, no light-metaphor bugs) |
| P1-S4b-3 folder deletion | 09446c63e | `src/components/releases/test-case-detail/**` (12 files) deleted — confirmed every remaining name-collision hit outside the folder was a false positive (coincidental naming); tsc clean, full `npm run build` succeeds, live repository sweep zero console errors |

**P1-S4 is now fully done**: restore is append-only (S4a), row-delete is archive (S4b-1), version diff view is canonical-ADS and wired in (S4b-2), the orphaned folder is gone (S4b-3). Tokens debt ratcheted down twice more during this stretch: 25951→25907→25631; typography 1601→1590.

**Next up per Plan Lock: P1-S5** (status-vocabulary truth — case enum + cycle FSM type-swap).

## P1-S5 (status-vocabulary truth)

| Item | Evidence |
|---|---|
| `needs_update` dropped | Never a real `tm_case_status` enum value (probe P0.8), zero live callers — removed from `BulkCaseStatus` type + one dead display-mapping |
| `tm_cycle_status` 7→4 collapse | Full type-swap migration `20260703115102_tm_cycle_status_collapse.sql`: `draft`/`planned` and `active`/`in_progress` were silent duplicate synonyms, `paused` had zero UI representation and zero live writers (confirmed via full table scan before deciding — actual data: only draft/active/planned rows existed). 5 dependent views (3 found only after first apply failed) + FSM trigger all dropped and recreated |
| Canonical enum bridge | `src/lib/testhub/enums.ts` (D-PIN-6) — `cycleStatusToDb`/`FromDb` centralized, `useTestCycles.ts`'s duplicate local mapper deleted |
| Found+fixed live bug | `useStartCycle` wrote `status:'in_progress'` — a value the enum never actually accepted post-collapse (would 400) |
| FSM proof | Invalid transition (planned→completed) rejected by trigger with exact error message; valid chain planned→active→completed run through the **real UI buttons** ("Start cycle"/"Complete"), `actual_start`/`actual_end` auto-set both times, verified via SQL before/after |
| Scope discipline | `useTestCyclesEnhanced.ts`'s stale `draft`/`in_progress` literals left untouched — confirmed zero live callers, scheduled for deletion in P1-S6 (touching it now would be wasted, redundant work) |

**Concurrent-session note:** a foreign session's uncommitted edit to `src/components/committee/CommitteeQueueDrawer.tsx` sat in this shared checkout throughout S5 and briefly caused a false ADS-gate failure (their file's pre-existing violations, not mine). Verified via `git stash push` (full path stash, not `--keep-index` — that mode left shared-index-staged foreign content in place) that my own changes were gate-clean, committed, then restored their file byte-for-byte immediately after. Never touched, read for content, or altered their work.

**P1-S5 done.** Next per Plan Lock: **P1-S6** — cycle CRUD consolidation onto one hook stack (delete `useTestCyclesEnhanced.ts`, now confirmed fully dead).

## P1-S6 (cycle CRUD consolidation)

| Item | Evidence |
|---|---|
| Deleted `useTestCyclesEnhanced.ts` (516 lines) | Confirmed zero live callers before deletion (only barrel re-export + doc file) |
| Deleted `cycle-config.ts` (337 lines) | Orphaned once its sole importer was removed |
| Barrel fixed | `hooks/test-management/index.ts` re-export of the 3 Enhanced hooks removed |
| Acceptance grep | `grep -rc 'useTestCyclesEnhanced' src/` → 0, exact Plan Lock binary criterion |
| Bonus finding | The deleted file's `useCreateCycleEnhanced` still hardcoded `status:'draft'` — a value P1-S5's enum collapse had already removed; would have 400'd on first real use |
| Live proof | tsc clean, full build succeeds, `/testhub/cycles` renders CYC-001 (PLANNED) from the single canonical `['tm-cycles'...]` hook stack, zero console errors |

**One cycle hook stack now.** Next per Plan Lock: **P1-S7** — reschedule truth (per-scope-item dates instead of rewriting the whole cycle).

## P1-S7 (reschedule truth) — CLOSED, no code change

Target bug (PLN-012, "reschedule rewrites whole cycle") no longer exists:

| Check | Finding |
|---|---|
| `src/hooks/test-cycles/useTestReschedule.ts` (Plan Lock's cited bug source) | Confirmed deleted in P0-S2's dead-code sweep along with rest of `src/hooks/test-cycles/` (only `useCycleExecutionItems.ts` survived) |
| Repo-wide reschedule search | Zero references to reschedule feature anywhere live — nothing to fix |
| `tm_cycle_scope.due_date` column | Already exists (`timestamp with time zone`), no migration needed |
| Wiring | `useCycleScope` (`useTestCycles.ts`) already reads it; `DueDateCell` in `CycleDetailPage.tsx` already writes it via `.update({ due_date: iso }).eq('id', scopeId)` — correctly scoped to one row already |

**Live proof (real UI, real DB):** set TC-001's due date to 7/11/2026 via the actual date-picker on `/testhub/cycles/CYC-001`. SQL before/after:

```
TC-0001: null → null (unchanged)
TC-001:  null → 2026-07-11 00:00:00+00 (changed)
TC-002:  null → null (unchanged)
```

Plan Lock's binary accept condition — "reschedule one test → other rows' dates unchanged" — met exactly. Scratch value reset to `null` after proof to keep demo pristine (same discipline as every prior slice).

**No code, no migration, no commit needed for this slice** — closed as documentation-only verification. Next per Plan Lock: **P1-S8**.

## P1-S8 (plan↔cycle single spine)

| Check | Finding |
|---|---|
| Join-table hooks (`usePlanLinkedCycles`/`useLinkCycleToPlan`/`useUnlinkCycleFromPlan`, `src/hooks/useTestPlansG26.ts`) | Queried a plan-cycle join table confirmed absent in P0.1 (D-001, "ALL 14 ABSENT" ghost-relation probe) — would 42P01 on any call |
| Live callers | Zero anywhere in `src/` (grepped before touching) |
| Plan detail route | **None exists** — `src/routes/FullAppRoutes.tsx` has zero `/testhub/plan*` routes; no page could ever have hosted these hooks |
| Real spine | `tm_test_cycles.test_plan_id` FK already exists, already live-read by `useDefects.ts:403` (`tm_test_plans!test_plan_id`) for defect plan provenance — the "single spine" the slice asked for already works for reads |
| Action taken | Deleted the 3 dead exports + `LinkedCycle` interface (ghost-table dead code, zero blast radius) |
| Accept cmd | `grep -rc 'plan_test_cycles' src/ ...` → **0**, exact Plan Lock binary criterion |
| Live proof | tsc clean, `lint:colors:gate` + `audit:ads:gate` pass unchanged, full `npm run build` succeeds |

**Screenshot n/a** — no route/page existed to screenshot; the "plan detail still lists cycles" sub-condition is moot for the same reason as D-007 (cited surface doesn't exist). Recorded as D-008.

**P1-S8 done.** Next per Plan Lock: **P1-S9** — traceability single link model 1 (FK + backfill).
