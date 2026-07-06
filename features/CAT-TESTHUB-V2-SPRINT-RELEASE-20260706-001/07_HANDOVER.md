# CAT-TESTHUB-V2-SPRINT-RELEASE-20260706-001 — Handover

## Status — LANDED ON MAIN (2026-07-06)
**Reconciled + merged to `main` @ 8f60c7d84.** Branch was 105 behind / 22 ahead; merged current main into `worktree-testhub-v2` (1 real conflict: CatalystViewBusinessRequest.v3.tsx imports — kept both CatalystPagesSection + TestCasesSection), fixed 2 typography offenders (h3→div role=heading in Sprint/Release sections), ratcheted audit+color baselines DOWN (typography 1468→1467, tokens 23725→23723), then fast-forwarded main. **tsc = 183 (pinned baseline, zero merge-introduced errors — the 5 error files are pre-existing, incl. icon-registry.ts JSX-in-.ts). Production build passes (dist emitted). All gates green (lint:colors:testhub 0/121, audit:ads:gate, color gate).**

Acceptance: **28/30 DONE, 2 PARTIAL** (both external-dep, not code). Full mapping → `13_ACCEPTANCE_LEDGER_MAPPING.md`. DB-enforced criteria verified live on cyij (draft-reject trigger, closed-cycle guard, locked-version snapshot, hold enum, folder system, variance, defect lineage, signoff, execution container, 11/11 migrations in ledger).

### Still external-dependency blocked (Vikram-only)
1. `ai-tm-assist` deploy — cyij edge-function cap (`PaymentRequiredException: Max number of functions reached`). Code committed + correct; client degrades to SectionMessage. Raise cap / delete a stale fn, then MCP `deploy_edge_function`. (P0-018 assist ops; generation already live via `ai-generate-test-artefacts` v2.)
2. `ANTHROPIC_API_KEY` on cyij (generator + assist runtime).
3. types.ts regen — MCP regen works (2.2MB) but NOT applied: hooks use `typedQuery` (functional), a 1-line 2.2MB types.ts risks new tsc errors + noise. Optional nicety.
4. Screenshot signoff sweep — repository + case page verified live on :8081; rest queued.

---

## Prior status (pre-landing)
FEATURE-COMPLETE (all buildable slices) — Plan Lock APPROVED. 25 commits on worktree-testhub-v2. **Production build passes** (npm run build → dist emitted, only pre-existing CSS/chunk warnings). tsc pinned 183 baseline. All pre-commit gates green (lint:colors:testhub 0/121). Remaining items are EXTERNAL-DEPENDENCY BLOCKED (Vikram only), not buildable work.

## Blocked — Vikram-only, cannot self-serve
1. **ai-tm-assist deploy** — cyij hit edge-function cap (PaymentRequiredException: max functions). Raise cap / delete a stale fn, then MCP deploy_edge_function (inline content, verify_jwt=true). Code committed + correct. (DRIFT-006)
2. **ANTHROPIC_API_KEY on cyij** — needed for ai-tm-assist AND ai-generate-test-artefacts (latter already deployed v2, just needs the key).
3. **types.ts regen** — `supabase login` (CLI token stale). New hooks use typedQuery meanwhile — works, just untyped.
4. **Screenshot signoff sweep** — user paused mid-verification. Repository + case page verified live; rest queued on :8081.
5. **Merge to main** — Vikram call after screenshot signoff.

## Every buildable slice — DONE
Phase B (11 migrations, DB-enforced rules) · C (repo 13-col + folder DnD) · D (full-page authoring + D2 editor + **D6 Caty assist cluster**) · E (plans/executions/cycles + drawer excision) · F (**F2 hold+force-pass**, F4 defect lineage, F5 variance) · G (**G1–G6**: sprint/release health sections, all 9 insertion hosts, generate CTAs, **G2/G4 gate-enforced signoff**) · H (H1 ai-tm-assist written, **H5/H6 traceability hierarchy+matrix**) · I (**I1–I6**: 5 reports + RTL bidi). H7 canvas is the only deferred sub-slice (grid/hierarchy/matrix cover it; EmptyState-fallback acceptable per Plan Lock).

## Environment — CRITICAL
- Work happens in **worktree** `/Users/vikramindla/Documents/GitHub/catalyst-prod-45/.claude/worktrees/testhub-v2`, branch `worktree-testhub-v2` (concurrent Release Ops session owns origin checkout). Re-enter via EnterWorktree path=… after restart. node_modules installed there.
- DB = cyij only. MCP `mcp__supabase__*` verified pointing at cyij. All migrations applied via execute_sql + manual ledger INSERT (exact version match to committed file — MCP apply_migration would mint wrong version).
- Migration versions: mine run 20260706170000–183000 (140000/150000 were taken by concurrent docex/kb sessions — DRIFT-001).
- types.ts regen BLOCKED (CLI token stale — DRIFT-003). New hooks use typedQuery. Ask Vikram to `supabase login`.

## Session 001 continued — additional commits (2026-07-06, same worktree)
11. 205fe8f23 — F2/F4/D4: HOLD verdict end-to-end (hotkey 5, aggregation, db union), force-pass with mandatory-reason modal ([FORCE PASS] in notes), defect links carry cycle_scope_id + non_test_origin=false, CycleDetailPage evidence bucket fixed tm-attachments→testhub-attachments
12. 41af288ad — H1 (D-007): ai-tm-assist parameterized edge fn — 9 ops (complete/improve/correct/convert_uat/coverage/gaps/link_suggest/sprint_risk/release_risk), en|ar, structured outputs, shared tm_ai_usage_log quota, draft-only contract. DEPLOY PENDING (needs ANTHROPIC_API_KEY on cyij; use MCP deploy_edge_function with file content inline)
13. 95a94a58f — I6: strict color gate extended to V2 surfaces (walker accepts file paths; 116 files, 0 violations)
14. a949aa66d — I1/I4/I5: Sprint Test Health + Version Variance + AI Generation Audit reports (registry-wired, JiraTable bodies)
15. ca053427b — G5 wave 2: TestCasesSection on Defect/Incident/BR — all 9 insertion hosts done

## Session 001 final wave (commits 16–19)
16. 187f10e7d — G6: GenerateTestCasesCTA (CatyIconCTA + AIGenerateTestCasesDialog + draft persistence) on SprintTestHealthSection + ReleaseTestReadinessSection
17. 6cb9ce6d1 — I2/I3: Release Readiness report (live gate per scoped release, blocks sort first) + Defect Leakage & Retest report (test-caught vs leaked + retest state)
18. 86da3f138 — G2/G4: ApproversCard approval now consults the test gate — BLOCK requires typed [TEST GATE WAIVER] reason on the approver row; rejections ungated; gate-unavailable degrades open
19. (earlier waves 11–15 listed above)

## Visual evidence captured (Vikram signed in on :8081, 2026-07-06)
- Repository: breadcrumbs + folder rail + **provisioned system folders live** (Senaei BAU root → Functional/UAT/Regression/Incident/Defect) + **full 13-column table** (Origin AI/MANUAL lozenges, Health/Sprint/Release honest dashes, Designer avatars, Updated, Open defects, Parent keys, Last run) ✓
- Test case full page (/testhub/repository/case/TC-0009): breadcrumb, tabs (Steps/Details/Requirements/Runs/Versions/Attachments/Activity), DRAFT pill, D2 step editor (chevrons/copy/96px rows), honest Unknown assignee ✓
- Remaining checklist surfaces (plans/plan detail/executions/cycle variance/sprint health/release readiness/reports/RTL) queued — user paused verification mid-sweep; 8080 rogue server killed on request, 8081 still serving worktree.

## Remaining buildable next session (no blockers)
- G6: Generate CTAs on SprintTestHealthSection/ReleaseTestReadinessSection/FolderTree → AIGenerateTestCasesDialog scope-prefilled
- D6: CatyIconCTA assist cluster (Complete/Improve/Coverage via ai-tm-assist) on CatalystViewTestCase with accept/reject draft strip
- H5–H7: traceability hierarchy/canvas/matrix views + link-suggest surfacing
- I2/I3: release readiness + UAT signoff + regression + defect-leakage report bodies
- I6 remainder: RTL logical-properties sweep + react-intl extraction on new surfaces
- G2/G4: signoff writes into ph_sprint_approvers/tm_release_signoffs from the gate sections

## Commits on worktree-testhub-v2 (all gates green, tsc pinned at 183 baseline)
1. cbac0de47 — Phase B data foundation (8 migrations B2–B9 + 3 hooks; all verified live with probes)
2. 592d98152 — C1/C2/C6a: repositoryCase route + TestCaseDetailPage (fullPageMode) + ?case= deep-link repair + 13-col table (tm_case_table_v2, one query) + key-cell→full-page
3. a560e051c — C3: tm_move_folder RPC (circularity/system-lock/depth-7/ltree subtree rewrite) + pragmatic-dnd folder tree + system-folder menu locks
4. (G1/G3 commit) — SprintTestHealthSection (kind-gated in ReleaseDetailPage engine) + tm_compute_ph_release_gate RPC + ReleaseTestReadinessSection
5. 8f633ea59 — E5/E6: 480px drawer → canonical modal (ban cleared), CSV quoting, cycles full-width + delete confirm

## Key corrections vs discovery docs (DRIFT-002)
- tm_* release FKs → **ph_releases** (not `releases`); entity-hub RELEASE_CONFIG.table = ph_releases → G3 gate computes natively; B8 rh bridge serves cockpit only.
- tm_defect_links.test_run_id correctly FKs tm_test_runs on live DB; cycle_scope_id added as denormalized lineage.
- Live scope-add trigger fn = tm_cycle_scope_populate_locked_version (patched for locked_snapshot; fn_lock_scope_version is unattached bootstrap relic).
- Bucket `tm-attachments` doesn't exist (CycleDetailPage exec uploads broken pre-existing; D-006 → standardize testhub-attachments; code fix still TODO in F3).

## NEXT exact actions (Plan Lock phase order)
1. **E1/E2**: TestPlansPage rebuild (rows not clickable today!) + NEW TestPlanDetailPage full page (tm_test_plans + tm_test_plan_cases + tm_plan_versions live/locked banner). Register /testhub/plans/:planKey route (builder exists). tm_test_plans not in types → typedQuery. CRE: register create surface in scripts/cre-chokepoint-gate.cjs CHECKS.
2. **E3/E4**: ExecutionsPage + ExecutionDetailPage (hooks useTestExecutions ready; routes builders exist, need FullAppRoutes registration).
3. **F1–F5**: run player + variance banner (useCycleVariance/usePullLatestIntoScope ready; tm_pull_latest_into_scope RPC live).
4. **D2**: TestCaseStepsEditor uplift (large rows). D4: useTmAttachments → tm_attachments + testhub-attachments bucket.
5. **E7**: TestSets → redirect stubs to Plans (D-004).
6. **G5/G6**: insertion points on Feature/Epic/BR/Defect/Incident (generalize TestCasesSection/TestCoveragePanel); AI CTAs.
7. **H1–H4**: ai-tm-* edge fns (copy supabase/functions/ai-generate-test-artefacts skeleton; deploy needs ANTHROPIC_API_KEY on cyij).
8. **I**: reports registry entries + RTL sweep + extend scripts/lint-colors-testhub.cjs path list for any new dirs (currently covers src/pages/testhub/** + src/components/testhub/** — SprintTestHealthSection/ReleaseTestReadinessSection live in src/components/releases/ = NOT covered; keep them token-clean manually or extend gate).
9. **Screenshot evidence batch**: port 8080 busy (origin session dev server) — run worktree vite on 8081 (`npx vite --port 8081`), Chrome MCP screenshots per 10_SCREENSHOT_CHECKLIST.md; then design-critique repository/case/run player.
10. Landing to main: merge/cherry-pick worktree branch after Vikram review of screenshot pack.

## Open risks
- G5 wide regression radius (5 host surfaces) — flag per entity.
- Playwright config baseURL stale :5173 — use PLAYWRIGHT_TEST_BASE_URL.
- Functional proof matrix F1–F9 partially proven (F1/F2-adjacent/F4-immutability/F5-snapshot at DB level); UI-level proofs pending E/F surfaces.

## Next prompt
`continue feature CAT-TESTHUB-V2-SPRINT-RELEASE-20260706-001`
