# A6 — Execution Realist (VeriMAP) · Executable Phasing

**Feature:** CAT-TESTHUB-PROD-20260703-001 · **Role:** speaks last · **Date:** 2026-07-03
**Inputs:** all 14 discovery reports + all 14 gap shards (117 P0 / 422 P1 / 370 P2 / 189 P3 rows, heavily overlapping across shards). Council A1–A5 outputs absent at write time (wait-free rule applied).
**This file is the skeleton of 03_PLAN_LOCK.md.**

---

## 0. VeriMAP — claims I re-verified in src/ this pass

| Claim | Verified | Evidence |
|---|---|---|
| Barrel exports no-op stubs that lie success | ✅ CONFIRMED | `src/hooks/test-management/index.ts:31-52` — `useDeleteTestCase`/`useCreateTestCase`/`useCloneTestPlan` return empty mutations; `useTestCycleList`/`useTestCycleListSummary` return `[]`/`null` |
| Defect row-click navigates to dead URL | ✅ CONFIRMED | `src/modules/project-work-hub/adapters/defectsDataSource.ts:148-150` `window.location.assign('/testhub/defects/${id}')`; no such route in FullAppRoutes.tsx |
| "Generate with AI" invokes nonexistent function | ✅ CONFIRMED | `src/hooks/test-management/useAIGeneration.ts:74` invokes `ai-generate-test-cases`; `supabase/functions/` has only `ai-generate-story-test-cases` |
| Create Cycle silently drops fields | ✅ CONFIRMED | `src/pages/testhub/cycles/CyclesPage.tsx:255-301` — `releaseId/ownerId/tags/assigneeIds` in state + UI, `handleCreateCycle` (:287-301) submits neither |

Discovery corpus is trustworthy. Proceed on it; runtime (browser) re-verification of each P0 happens inside its slice, not before.

---

## 1. VERDICT

**GO — with a strict trust-first sequence.** TestHub is ~80% real; the danger is not missing features, it is a UI that lies (fake fallbacks, no-op stubs, silent `{data}` swallows ×40, dead routes, theater fields) plus a resurrectable dead legacy generation. The single highest-leverage move is **subtraction before addition**: excise the lie layer and the dead generation first, then repair errors-as-empty, then build. Every P1+ feature slice built before P0 completes will be built on sand and re-audited later — do not allow it.

**The ONE non-negotiable first action (P0-S1, first 30 minutes of execution):**
Delete the no-op stub exports in `src/hooks/test-management/index.ts:31-52` and re-export the real hooks (`useTestCases.ts:323/709`), then fix or fail-loud every importer. Nothing else may merge before this — any slice that lands while a barrel silently swallows mutations can "pass" while doing nothing, which invalidates its own acceptance evidence.

---

## 2. Global rules for every slice (Plan Lock inherits verbatim)

- **Timebox:** 2h hard per slice; one correction loop, then accept/split/rebuild/stop+revert.
- **Branch/DB:** work on main (per standing memory), staging **cyij only**; assert `supabase/.temp/project-ref` = `cyijbdeuehohvhnsywig` before every linked batch. No prod anything.
- **Forbidden everywhere (all phases):**
  - `src/pages/testhub/reports/**` report **bodies** — reports are REUSE ONLY (Vikram). Hook-level error-surfacing repairs allowed only where a shard marks P0 and only additive (no formula/body changes).
  - `src/components/shared/JiraTable/**` core — consume, never edit (regression blast radius = every module).
  - `CreateStoryModal` core logic — extend via existing props (`defaultWorkType='QA Bug'`) only.
  - `FullAppRoutes.tsx` outside the `/testhub` + `/admin/test` blocks.
  - Any `ph_*` migration not explicitly listed in a slice.
- **Binary gates on every commit:** `npx tsc --noEmit` · `npm run lint:colors:gate` · `npm run audit:ads:gate` · `npm run lint:cre` · slice-specific grep assertion (each slice defines one that returns **0**).
- **Screenshots:** light + dark for any UI-touching slice; dark via reload-into-dark (memory: runtime toggle gives false readings).
- **Rollback:** one slice = one commit = one `git revert`. Migrations: additive-only where possible; every destructive migration ships a written down-script in the slice log; cyij data is disposable, schema mistakes are not — RESTRICT before DROP.
- **Zero-assumption rendering:** removing a lying field beats defaulting it. "Render nothing" is an acceptable fix for any theater UI.

---

## 3. PHASE P0 — TRUST REPAIR (the UI must stop lying)

**Goal:** every routed `/testhub/*` surface either works or visibly fails. No fake data, no success toasts over no-ops, no dead navigation, no theater fields, no resurrectable mock landmines.
**Estimate: 11 slices (~1.5 days).** Sequenced by dependency: subtraction → error truth → route truth → write truth → visual truth.

### P0-S1 · Excise the lie layer (NON-NEGOTIABLE FIRST)
- **Files:** `src/hooks/test-management/index.ts`; importer call-sites surfaced by tsc.
- **Do:** delete stubs `useDeleteTestCase`/`useCreateTestCase`/`useCloneTestPlan`/`useTestCycleList`/`useTestCycleListSummary` (+ `CycleListRow=any`); re-export real implementations from `useTestCases.ts`; importers with no real backing (releases TestPlansPage clone etc.) lose the button rather than keep the lie.
- **Forbidden:** `useTestCases.ts` internals (re-export only).
- **Accept:** `grep -c "mutationFn: async (_" src/hooks/test-management/index.ts` → 0; tsc clean; Repository create/delete case round-trips against cyij (row visible in table after reload).
- **Screens:** none (behavioral). **Rollback:** revert commit.

### P0-S2 · Delete the dead legacy generation (landmine sweep)
- **Files (delete):** `src/pages/releases/TestPlansPage.tsx`, `TestCyclesPage.tsx`, `CycleCommandCenter.tsx`; `src/components/test-plans/**`; `src/components/test-cycles/**`; `src/hooks/test-cycles/**`; `src/features/test-cycles/**`; `src/components/releases/{test-cycles,smart-assignment,add-tests,cycle-command-center,test-case-detail,test-execution}/**` (incl. mock `LogDefectModal`); `src/pages/testhub/defects/DefectsPage.tsx` (orphan, 468 LOC); `src/pages/testhub/FilterDetailPage.tsx`; `src/pages/testhub/testhub.css` (46.6K unimported).
- **Guard:** importer grep per family MUST return only intra-family + generated usage-map hits before `rm`. If any routed file imports a member → excise that import in the same slice, do not keep the family.
- **Why P0:** kills wholesale: 85-fake-row assignment table, Math.random defect modal, mock team/AI-advice tab, console.log calendar, toast-theater quick actions, AND ~10 of the 16 UXD dark-mode P0s (UXD-005…019 live entirely in these dead folders) — the cheapest dark-mode fix ever.
- **Accept:** tsc clean; `grep -rc "generateMockAssignments\|mockTestCases\|mockTeamMembers" src/` → 0; app boots, all 21 testhub routes render.
- **Rollback:** revert (pure deletion, zero behavior on routed surfaces). Move-not-copy memory precedent.

### P0-S3 · Silent-error sweep wave 1 — resolvers + execution runner
- **Files:** `src/hooks/test-cases/useTestCycleByKey.ts` (throw on error; DAT-001/PLN-010/EXE-005), `src/pages/testhub/cycles/ExecutionPage.tsx` (scope query error state; **EXE-001**: destructure + check `tm_step_results` insert error, no success toast on partial save; **EXE-006**: `?caseId` re-select effect runs once, not per refetch), `src/hooks/test-cases/useTestCaseExecutionHistory.ts` (kill `test_cycle_executions` dead-table read + error-as-empty; point at `tm_test_runs` or render explicit error).
- **Pattern:** memory `silent-query-error-sweep` — throw in queryFn; `isError` → SectionMessage + Retry; `isPending` → spinner.
- **Accept:** grep `const { data } =` in the three files → 0 un-error-checked; DevTools-forced query failure renders SectionMessage not empty runner (screenshot).
- **Screens:** runner error state + normal state, light+dark.

### P0-S4 · Silent-error sweep wave 2 — case + defect hooks
- **Files:** `src/hooks/test-cases/useTestCases.ts` (×11), `src/hooks/useDefects.ts` (×10), `src/hooks/useDefectsG25.ts` (error-as-empty :184,:197 + dead `th_test_executions` join → tm_test_runs or explicit error), `useTestCaseVersions.ts`, `useTestCycles.ts` (incl. **VER-042** clone-scope: abort clone on scope-read error), `useAutoVersioning.ts` (TD-002: throw).
- **Accept:** repo grep for `{data}`-only destructure in listed files → 0; forced-failure screenshots on Repository + Defects.

### P0-S5 · Route truth — defects, sets, traceability
- **Files:** `src/modules/project-work-hub/adapters/defectsDataSource.ts` (row-click → open canonical defect view/modal per repo decision, NOT a new route yet), `src/pages/testhub/sets/TestSetsPage.tsx:435` (navigate to registered `/testhub/sets/:id`; full slug contract deferred to P1), `src/pages/testhub/TraceabilityPage.tsx` (TRC-005/006/007: `.eq(project)` server-side, resolve route `projectKey`, error-check scope query).
- **Accept:** `grep -c "testhub/defects/\${" src/` → 0; clicking defect row opens detail without full reload; traceability network tab shows project-scoped query.
- **Screens:** defect open, sets nav, traceability — light+dark.

### P0-S6 · Write truth — Create Cycle modal
- **Files:** `src/pages/testhub/cycles/CyclesPage.tsx`; `src/hooks/test-cases/useTestCycles.ts` (extend create input); migration on cyij only if `tm_test_cycles.owner_id` missing (verify first — 03_db_schema).
- **Do:** wire `ownerId` (+ `releaseId` ONLY if binding to the correct release table — `tm_test_cycles.release_id` FKs legacy `releases` (PLN-025); if wrong id-space, **delete the Release select** rather than wire a lie); **delete** Tags editor + Assignees tab until a real write path exists (zero-assumption: honest removal > theater).
- **Accept:** create cycle with owner → row in `tm_test_cycles` has owner set (SQL probe); grep `assigneeIds` in CyclesPage → 0.
- **Screens:** modal light+dark.

### P0-S7 · Defect write integrity on CycleDetail
- **Files:** `src/pages/testhub/cycles/CycleDetailPage.tsx` (DEF-002/UXL-003: rip inline DefectPanel insert `project_id: item.id`; open canonical `CreateStoryModal defaultWorkType='QA Bug'` isDefect branch instead), `src/hooks/useDefects.ts` (DEF-007/DAT-009: key gen via `tm_next_entity_key` RPC; DAT-010/011: remove auto-link inserts into type-absent relations or fix columns first via cyij probe).
- **Accept:** create defect from cycle → row with valid `defect_key`, real `project_id` (SQL probe); no console PostgREST 4xx.
- **Screens:** QA Bug modal from cycle, light+dark.

### P0-S8 · `tm_cycle_sets` exists or the feature doesn't
- **Files:** new migration `supabase/migrations/<ts>_tm_cycle_sets.sql` (cyij), regen types, `src/pages/testhub/sets/SetDetailPage.tsx` (drop both `as any` casts).
- **Accept:** add-set-to-cycle round-trips; `grep -c "tm_cycle_sets') as any" src/` → 0; migration ledger 1:1.
- **Rollback:** table is new/additive — down = drop table.

### P0-S9 · AI generate — real function + minimal protection
- **Files:** `src/hooks/test-management/useAIGeneration.ts` (invoke `ai-generate-story-test-cases` with prompt-mode branch) + edit that function to accept prompt mode + `getUser()` auth check (AI-001/AI-002); mutation `isPending` guard as in-flight dedup (AI-005). Full quota/ledger = P2.
- **Accept:** Generate on `/testhub/repository` returns cases and persists via existing `useCreateTestCase` path; unauthenticated curl to function → 401.
- **Screens:** dialog before/after generation.

### P0-S10 · Routed visual lies — shadow-as-color + banned gradients
- **Files:** `CycleDetailPage.tsx:638,642`, `SetDetailPage.tsx:155,166,324`, `TestSetsPage.tsx:193`, `CaseDrawer.tsx:182` (UXD-034/035: `--ds-shadow-*` used as background/box-shadow color → proper scrim `var(--ds-blanket)` / elevation tokens); `src/components/testhub/AIGenerateTestCasesDialog.tsx:186,330,387,583` (UXD-022: gradient CTAs → ADS Button / AIIntelligenceButton only).
- **Accept:** `grep -c "var(--ds-shadow" <files as bg/boxShadow>` → 0; `grep -c "bg-gradient-to-r" src/components/testhub/` → 0; lint:colors:gate + audit:ads:gate pass.
- **Screens:** drawers open over content, light+dark (scrim visible in both).

### P0-S11 · P0 close-out — runtime verification pass
- **Do:** browser probe of every P0 fix (findings #1-#3 were static-only per discovery 10); update `06_VALIDATION_EVIDENCE.md` + `10_SCREENSHOT_CHECKLIST.md`; ratchet baselines down if counts dropped (`ads-color-gate --update`).
- **Accept:** all P0 grep assertions re-run in one script → all 0; 21/21 routes screenshot light+dark.

**Exit criterion for P0 (binary):** a seeded cyij walkthrough (create case → cycle → execute → fail → defect → report) completes with zero console errors, zero dead clicks, zero success-toasts-over-nothing, and forced query failure shows an error on every core surface.

---

## 4. PHASE P1 — TABLE STAKES (pre-prod usable MVP)

**Goal:** a 500-seat QA team can run a real regression cycle without corrupting history or losing data. This is the "usable in pre-prod tomorrow" line.
**Estimate: 18 slices (~4-5 days).** Order below is dependency order.

| # | Slice (2h) | Key gaps | Files (primary) | Binary accept |
|---|---|---|---|---|
| P1-S1 | Immutable execution 1: stop the CASCADE massacre — `tm_step_results.test_step_id` → `ON DELETE RESTRICT` + soft-delete steps | VER-002 | migration (cyij) + `useTestSteps.ts` | delete executed step → blocked/soft; step results survive (SQL probe) |
| P1-S2 | Immutable execution 2: runner reads pinned `locked_version` snapshot, not live steps | VER-001 | `ExecutionPage.tsx`, `useTestCycles.ts` scope-add (pin version at add) | edit case mid-cycle → runner still shows pinned steps (screenshot + SQL) |
| P1-S3 | One snapshot writer: collapse 4 writers → DB RPC `tm_create_version_snapshot`; full-field snapshot shape; maintain `version/current_version/is_latest_version` | VER-005/006/008 | `useAutoVersioning.ts`, `useTestCaseVersions.ts`, `testCaseAuditService.ts` | grep: 1 snapshot insert path; version int increments on edit |
| P1-S4 | Restore = new version (snapshot-first, no step delete+reinsert); archive replaces hard delete; remove delete/bulkDelete from UI | VER-003/004 | `useTestCaseVersions.ts`, `useTestCases.ts`, RepositoryPage bulk bar | restore → history intact; `grep -c "\.delete()" useTestCases.ts` per plan count |
| P1-S5 | Bulk-status enum truth (`needs_update` 400) + cycle status FSM: pick ONE 5-value vocabulary, migrate data, single transition validator | VER-024, PLN-008 | migration + `useTestCases.ts:9`, cycle status consumers | bulk update each status value → 200; enum values = UI values exactly |
| P1-S6 | Cycle CRUD consolidation: one hook stack, one query-key family; delete `useTestCyclesEnhanced`/`useCycleMutations` duplicates | PLN-011 | `src/hooks/test-cases/useTestCycles.ts` + importers | one `['tm-cycles'…]` key family; mutation → visible refresh on all cycle surfaces |
| P1-S7 | Reschedule truth: per-scope-item dates, not whole-cycle rewrite | PLN-012 | migration (scope date cols), `useTestReschedule.ts` | reschedule one test → other rows' dates unchanged (SQL) |
| P1-S8 | Plan↔cycle single spine: migrate `plan_test_cycles` usage → `tm_test_cycles.test_plan_id` FK | PLN-014 | `useTestPlansG26.ts` | `grep -c "plan_test_cycles" src/` → 0 |
| P1-S9 | Traceability single link model 1: FK + backfill — `tm_requirement_links.requirement_id` FK→ph_issues; migrate `linked_story_key` rows into links table | TRC-001/002, DAT-031 | migration + backfill script (cyij) | orphan-link count = 0 (SQL); both old readers see same links |
| P1-S10 | Traceability 2: ph_issues picker replaces free-text entry; both readers (`TestCasesSection`, `TestCoveragePanel`) read links table | TRC-003/018 | `CatalystViewTestCase.tsx` req tab, `story/TestCoveragePanel.tsx` | free-text inputs gone (grep); story view + case view show identical link set |
| P1-S11 | Computed coverage: OK/NOK/NOT-RUN derived from latest run per linked case (view or RPC); `coverage_status` manual writes removed | TRC-004 | migration (view), `useRequirementLinks.ts`, TraceabilityPage | fail a run → linked story flips NOK without manual action |
| P1-S12 | Defect spine 1: single tm_defects hook layer (kill `g25-*` duplicate keys), project-scoped stats, sprint dual-column write fixed | DEF-005/012/013 | `useDefects.ts`, `useDefectsG25.ts`, `CreateStoryModal.tsx:845-871` (props-level only) | one key family; stats change when switching project |
| P1-S13 | Defect spine 2: defect detail is the canonical view everywhere; slugged route if a route is wanted; history reads tm_test_runs | DEF-004/010, VER-032 | routes.ts + `CatalystViewDefect` wiring | deep-link a defect key → opens; history tab shows real runs |
| P1-S14 | Slug contract sweep: sets/filters (+ any new routes) get slug columns + `Routes.*` builders + `useXBySlug`; UUID redirects outside shell | TD-001 full, PLN-053, CRE 09 §V | migrations + `src/lib/routes.ts` + hooks | `grep ":id" FullAppRoutes.tsx` testhub block → 0 |
| P1-S15 | Runner UX floor: navigation guard on dirty state (EXE-003), manual verdict for step-less cases (EXE-004), offline attachment warning (EXE-002 minimum: block or warn, never discard) | EXE-002/003/004 | `ExecutionPage.tsx` | navigate away dirty → confirm dialog; 0-step case can record verdict |
| P1-S16 | Admin truth: remove 11 dead sidebar links; case-status admin reflects real enum; run-statuses page → real `tm_execution_status` or removed; ModuleGate on `/testhub/*` | ADM-001/002/003/006 | `AdminSidebar.tsx`, admin test pages, FullAppRoutes testhub block | every admin sidebar link resolves; URL access with role=hidden → gated |
| P1-S17 | Dark/ADS sweep of ROUTED surfaces: 95 Tailwind color hits, `.th-badge` pattern, remaining routed `dark:` gaps → tokens/Lozenge | UXD remainder on live pages, G11/G12 P1s | routed testhub pages/components only | audit:ads baseline ratcheted DOWN; dark screenshots all routes |
| P1-S18 | Report hook repairs (additive only): throw-on-error in the 7 silent hooks, project/sprint-scoped queries replace org-wide scans, "capture since" disclosure line | RPT-001/002/006, TRC-022/023 | `useSprintTestingStatus.ts` etc. (hooks only — **bodies forbidden**) | forced failure → error card not zeros; network shows scoped queries |

**Exit criterion:** mid-cycle case edit cannot change execution history; every entity URL-addressable by slug/key; coverage computed not typed; admin shows nothing it can't do; audit:ads + lint:colors baselines strictly lower than at P0 start.

---

## 5. PHASE P2 — COMPETITIVE (Xray/TestRail-class credibility)

**Estimate: 20 slices (~1 week).** Build order: lift-don't-build first.

1. **Quality gates & release readiness (4 slices):** mount the existing UNMOUNTED gate stack (schema+RPCs+hooks+UI per discovery 13) on Release Hub; fix `tm_test_cycles.release_id` → correct release id-space (PLN-025); `readiness_pct` computed from gates+executions, not hand-stored (RPT-005); retire `/release/incidents/reports` 0-row page or repoint (RPT-004).
2. **Automation/CI ingestion (4 slices):** JUnit XML upload → edge function → `tm_test_runs` with provenance (manual|automated); API token surface; run-source shown per row (AUT family).
3. **AI governance (3 slices):** restore usage-ledger table (AI-003), per-user quota + cooldown (AI-004), delete dead `useCatyAI` layer + orphaned consumers (AI-006); batch + cache polish on test-gen.
4. **Collaboration (4 slices):** CatalystActivitySection on case + cycle views (COL-001/002); comment spine unification tm_comments→ph_comments bridge (COL-003); comment-before-first-run on scope items (COL-004); fire the defined notification events (COL-005).
5. **Planning depth (3 slices):** per-instance assignee/due-date on scope; cycle board/calendar rebuilt small on canonical components (replacing deleted legacy — only now, with real data contracts); saved filters on repository with slugs.
6. **RBAC reality (2 slices):** tm_user_roles assignment UI + one consumer path (matrix stops being decorative — ADM-004/005), or explicit descope decision recorded; RLS alignment note for ADM-007 (server-side enforcement design, implementation may slip to P3).

**Exit criterion:** a CI pipeline can post results that appear in cycles/reports with provenance; release go/no-go reads computed gates; AI spend is bounded and logged; case/cycle pages have comments+activity.

---

## 6. PHASE P3 — DELIGHTERS (bounded backlog, pull-based)

**Estimate: 12-15 slices, no calendar commitment.** Shared steps / parameterized (data-driven) cases; flaky-test detection from run history; AI coverage-gap suggestions + AI insight cards on remaining surfaces (reuse report-insights pattern); exploratory/session-based testing notes; bulk import (CSV/TestRail); PDF/exec export; cross-project dashboards; keyboard-first runner (TestRail-parity hotkeys); requirement-change → "needs re-test" flagging (needs VER stack, hence last); public read-only report links. Each item enters only as a written 2-hour slice with its own accept grep + screenshots; anything larger gets split or refused.

---

## 7. Sequencing rationale & risk register

- **Subtraction first (P0-S1/S2)** — regression risk near zero (dead code + stub swaps), payoff maximal: removes the entire class of "future session routes a mock," deletes ~10 dark-mode P0s for free, and makes every later acceptance test trustworthy.
- **Errors before features (P0-S3/S4)** — until failures are visible, no acceptance evidence means anything (memory: cyij "marked-not-executed" + silent 400s).
- **Migrations mid-P0/P1, additive-first** — `tm_cycle_sets` (new table), FK/RESTRICT changes carry the only real rollback complexity; each ships a down-script; probe columns before use (memory: schema_migrations row ≠ DDL applied).
- **VER stack is the sharpest architectural risk** (edits rewrite history) but needs a stable error layer to verify — hence P1 head, not P0.
- **Reports are the tripwire** — REUSE ONLY. P1-S18 touches hooks additively; any slice that wants to edit a report body must RED FLAG and stop.
- **CreateStoryModal + JiraTable are shared blast radii** — props-level changes only; regression sweep of 3 adjacent surfaces after any touch.
- **Biggest schedule risk:** the silent-error sweep (S3/S4) surfacing latent 400s that were invisible (type-absent columns, dropped tables). Budget: that is the point — each surfaced failure becomes a named P1 slice, not scope creep inside the sweep.

## 8. Totals

| Phase | Slices | Wall-clock (1 builder + agents) |
|---|---|---|
| P0 trust-repair | **11** | ~1.5 days |
| P1 table-stakes | **18** | ~4-5 days |
| P2 competitive | **20** | ~1 week |
| P3 delighters | **12-15** | pull-based |
| **Total** | **~61-64** | MVP line = end of P1 |

**Pre-prod tomorrow = P0 complete + P1-S1..S5 (versioning integrity).** That is the honest minimum; shipping pre-prod before P1-S2 means testers can rewrite execution history — do not.
