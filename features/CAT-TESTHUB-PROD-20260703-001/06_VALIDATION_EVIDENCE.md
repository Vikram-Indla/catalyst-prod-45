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
