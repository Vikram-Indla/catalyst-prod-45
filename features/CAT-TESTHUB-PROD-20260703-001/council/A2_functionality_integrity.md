# A2 — Functionality Integrity Guard: R3 Functionality Preservation Matrix

Feature: CAT-TESTHUB-PROD-20260703-001 · Advisor: Functionality Integrity Guard · Date: 2026-07-03
Basis: discovery 01/02/03/04/05/06/10/13 + all 14 gap shards; disputed claims re-verified against src/ at main (7213f84ab). Every "verified this pass" line below was grep/read-confirmed by this advisor, not inherited.

**VERDICT: GO WITH SEQUENCING GUARDS.** The routed `/testhub/*` surface is substantially real (repository CRUD, runner + offline queue, storage uploads, 26 wired reports, canonical adapters). Most gap-shard proposals are ADDITIVE. But **6 proposals are secretly or conditionally SUBTRACTIVE** (§4) and 4 are NEUTRAL-intent rewrites of live surfaces — the highest regression class. Plan Lock must encode the sequencing constraints in §5 and the proof table in §3 as binary acceptance criteria.

---

## 1. Baseline — what works TODAY and must not regress

Everything in this table is live, routed, DB-backed functionality. Any slice that touches a row's files re-proves that row before merge.

| # | Surface (route) | Working functionality | Evidence anchor | Regression class |
|---|---|---|---|---|
| B1 | `/testhub/repository` | Folder tree CRUD (create/rename), case list via `JiraTable<TMTestCase>`, search, case create/edit/version via CaseDrawer+StepEditor, bulk archive/copy, AI-generated cases **persistence path** (`useCreateTestCase`, RepositoryPage.tsx:599-624 — the AI *call* is broken, the save is real), detail via `CatalystDetailRouter entityKind='test_case'` | 01 §3.2; 10 counter-evidence; verified: RepositoryPage + CaseDrawer import real hooks **directly** from `useTestCases.ts` (not the stub barrel) | CRITICAL |
| B2 | `/testhub/cycles`, `/testhub/:projectKey/cycles/:cycleKey` | Cycle list (JiraTable), create cycle (name/desc/sprint/dates/case-scope DO persist — release/owner/tags/assignees do NOT, that's finding #3 in 10), start/complete, scope add/remove, bulk status, comments (tm_comments), inline defect panel | 10 counter-ev: CycleDetailPage 23 reads/9 writes | CRITICAL |
| B3 | `/testhub/cycles/:cycleKey/execute` | Step runner: pass/fail/block per step, run save → `tm_cycle_scope.current_status` cascade, **offline queue** (`testhub_offline_queue` localStorage + useSyncExternalStore + sync toast, ExecutionPage.tsx:18-105), **real attachment upload** to storage bucket (`ExecutionPage.tsx:17, 505-526`, path `test-runs/<run.id>/…`) | 01 §3.2; 10 counter-ev | CRITICAL — only offline capability in the app |
| B4 | `/testhub/reports`, `/testhub/reports/:slug` | 26/26 registry reports `status:'wired'` (verified this pass: `grep -c "status: 'wired'" report-registry.ts` = 26), real data via `useRealTestReportData`, AI insight cards (`report-insights` edge fn exists), CSV export (Papa.unparse), saved views, 5 legacy-slug redirects | 01 §3.3; 06; CAT-REPORTS-HUB-20260703-001 closed | CRITICAL + **contract: reused, never refactored** |
| B5 | `/testhub/dashboard`, `/board`, `/my-work`, `/defects`, `/filters*` | Canonical wrappers: ProjectDashboardPage mode='test', KanbanPage mode='test' (DRAFT/IN REVIEW/APPROVED/DEPRECATED), BacklogPage + `useTestCasesSource`/`useDefectsSource` adapters, project-hub filter pages hubType='test' (TESTHUB sentinel) | 01 §3.1 | HIGH — shared chassis: a regression here hits project modules too |
| B6 | `/testhub/sets`, `/testhub/sets/:id` | Set CRUD, membership add/remove (tm_set_cases ×5 call sites — verified; `tm_test_set_cases` 0 uses), cycle-set links (list works; row-click nav is already broken, R1 — do not count as regression) | 01 §1.3, 10 counter-ev | HIGH |
| B7 | `/testhub/timeline`, `/dependencies`, `/traceability` | Timeline date-drag persists planned_start/end; dependencies real tm_test_cycle_dependencies create/delete + the ONLY error-surfacing page; traceability read-only matrix renders | 01 §3.1-3.2 | HIGH |
| B8 | Detail views + sidebar | CatalystViewTestCase (675 LOC, tm-backed), CatalystViewTestCycle, TestHubSidebar 12 items over canonical SidebarBase | 01 §2, §4.6 | HIGH |
| B9 | `/admin/test/{priorities,types,statuses,run-statuses,permissions}` | 5 routed admin config pages; `useAdminConfig` drives UI | 10 counter-ev; FullAppRoutes.tsx:150-154 | MEDIUM |
| B10 | DB automation | run→scope status cascade + `passed_count` maintained by migrations/triggers; `trigger_update_test_set_count` lives on **tm_test_set_cases** (the UNUSED membership table — see S6) | 03 §66; 10 | HIGH |
| B11 | Live-adjacent: Releases quality gates | `lib/shared-quality/hooks/{useQualityGates,useReadiness}` consumed by `components/releases/quality-gates/*` ← imported by `ReleasesManagementSidebar` which **is mounted by CatalystShell.tsx:726** (verified this pass) | this pass | HIGH — see S2 |

Known-broken today (baseline defects, fixing them is ADDITIVE, not regression risk): AI edge fn missing (10 #1), defect row-click dead URL (10 #2, verified `defectsDataSource.ts:148` `window.location.assign`), Create Cycle silent field drop (10 #3), sets row-nav unmatched route (01 R1), zero error states (01 R3), 11 dead admin sidebar links (G10 ADM-001).

---

## 2. Classification of planned change areas

| Gap area | Classification | Rationale |
|---|---|---|
| G01 authoring additions (drag-reorder steps, attachments-per-step, labels wiring, shared steps) | **ADDITIVE** — except StepEditor/CaseDrawer rework touches B1 | New capability on existing spine |
| G02 versioning (single RPC writer, audit triggers) | **NEUTRAL→SUBTRACTIVE risk** | Deleting 3 client snapshot writers changes write path of live auto-versioning; VER-022 port has a purge-ordering trap (S1) |
| G03 planning/cycles (plans, clone, stub deletion) | ADDITIVE + **NEUTRAL** stub cleanup (verified: routed pages bypass the stub barrel) | PLN-014 table consolidation needs cyij row probe first |
| G04 execution UX | **NEUTRAL rewrite of B3** — highest-value, highest-risk | Offline queue + cascade + uploads must survive byte-for-byte behavior |
| G05 defects (canonical QA-Bug modal convergence, link schema) | ADDITIVE + SUBTRACTIVE flags S3/S4 | Deleting 2 of 4 create paths is fine (mock + dead); CycleDetailPage inline panel is LIVE — swap, don't drop |
| G06 traceability, G07 reports additions | ADDITIVE — **new registry entries only**; any edit to the 26 wired bodies/hooks violates "reused never refactored" | RPT-004 redirect already PLACEHOLDER'd for Vikram |
| G08 automation, G09 AI, G14 collaboration | ADDITIVE (greenfield) except COL-003 comment-spine migration (S5) |  |
| G10 admin | ADDITIVE; ADM-001 sidebar-link deletion is NEUTRAL (links are dead) |  |
| G11/G12 UX + dark | NEUTRAL rewrites (JiraTable adoption on Sets/SetDetail/CycleDetail/Traceability, drawer→CatalystDetailRouter) + NEUTRAL deletes (testhub.css, orphan DefectsPage — both verified zero importers this pass) | Full CRUD re-proof per rewritten surface |
| G13 dead-code purge (DAT-046 ~60 files) | **NEUTRAL only with exclusions** — see S1, S2 | Wholesale delete is right per move-not-copy, but two file sets inside the blast radius are load-bearing |

---

## 3. Mandatory proofs per slice (binary, attach raw output to 06_VALIDATION_EVIDENCE.md)

Every slice: `npx tsc --noEmit` · `npm run lint:colors:gate` · `npm run audit:ads:gate` · importer grep for every deleted file (zero hits excluding usage-map.generated.ts) · screenshot light+dark (reload-into-dark method per memory).

| Touched area | Additional required proof |
|---|---|
| B1 repository/authoring | Browser: create folder → create case with 3 steps → edit → version bump → bulk archive → restore; DB probe `tm_test_cases`/`tm_test_steps`/`tm_test_case_versions` rows on cyij; screenshot of case detail via CatalystDetailRouter |
| B2 cycles | Create cycle with scope → verify `tm_test_cycles` + `tm_cycle_scope` rows; start/complete; bulk status; screenshot |
| B3 execution | Full run: execute 2 steps → fail 1 → verify `tm_test_runs`/`tm_step_results` + scope `current_status` cascade; **offline drill**: DevTools offline → record result → assert `testhub_offline_queue` localStorage populated → online → sync toast → DB row exists; attachment: upload file → verify storage object under `test-runs/<run.id>/` + `tm_attachments` row |
| B4 reports | Smoke all 26 slugs render non-empty against REVAMP-DEMO seed (scripted nav or checklist screenshots); CSV export downloads; 5 legacy redirects still 302; `git diff --stat src/components/testhub/reports/` reviewed — bodies/hooks of the 26 unchanged unless slice explicitly adds a NEW registry entry |
| B5 wrappers/adapters | If adapters touched: `/testhub/my-work` + `/testhub/defects` row render + inline status edit; PLUS one project-module Backlog screenshot (shared chassis) |
| B6 sets | Membership add/remove; **test_count column matches actual membership count after the S6 trigger decision** |
| B10 DB | Before any tm_* DDL: `cat supabase/.temp/project-ref` = cyij (`cyijbdeuehohvhnsywig`); ledger 1:1 rule; ghost tables (tm_requirement_tests, plan_test_cycles, tm_scheduled_runs) probed via information_schema BEFORE code path decisions |
| Any deletion slice | `rm` list enumerated in Plan Lock; post-delete tsc + `npm run build`; color-baseline ratchet down committed when testhub.css dies |

---

## 4. SUBTRACTIVE flags — verified this pass

- **S1 (P0 sequencing trap) — DAT-046 purge deletes the only version-diff/restore UI before VER-022 ports it.** `TestCaseVersionHistory.tsx` lives inside the purge target `src/components/releases/test-case-detail/` and is the sole importer of `components/testhub/versioning/VersionDiffView.tsx` (verified). Purge-first orphans VersionDiffView and destroys the port source. **Rule: VER-022 port lands before, or in the same slice as, the test-case-detail folder deletion; VersionDiffView is excluded from any orphan sweep.**
- **S2 (P0 scope trap) — `lib/shared-quality` is NOT dead.** DAT-015 says "retire useDefectsG25 + lib/shared-quality/hooks/useDefects.ts" — that exact scope is safe (verified: `shared-quality/hooks/useDefects.ts` has zero importers; it merely re-exports useDefectsG25). But `useQualityGates`/`useReadiness` in the SAME directory are live via quality-gates components ← `ReleasesManagementSidebar` ← `CatalystShell.tsx:726`. **A directory-level sweep breaks routed release-hub quality gates. Delete the two defect files only.**
- **S3 (P0) — DAT-031 retiring `linked_story_key`:** sole reader `project-work-hub/components/story-test-cases/TestCasesSection.tsx` (verified) is a LIVE story-detail surface. Retirement is SUBTRACTIVE unless the same slice: cyij backfill row-count proof (every non-null linked_story_key has a tm_requirement_links row) + reader repointed + story-detail screenshot showing linked cases.
- **S4 (P1) — DEF-012 "retire sprint text column after backfill":** grep all readers of `tm_defects.sprint` including the 26 report hooks before DROP — reports are contract-locked (B4); if any report reads the text column, retirement breaks a frozen surface. Backfill + dual-read window; column drop only as a later verified slice.
- **S5 (P1) — COL-003 comment-spine migration:** CycleDetailPage comments on tm_comments WORK today (B2). Read-spine swap before row migration = existing comments vanish. Order: migrate rows on cyij → verify counts → swap reader+writer in one slice → screenshot old comment visible on new spine.
- **S6 (P1) — set-membership consolidation:** live code uses `tm_set_cases` (5 call sites) but the `test_count` trigger sits on unused `tm_test_set_cases` (03 §66). Consolidating either direction without moving/rewriting the trigger leaves counts frozen or wrong. Trigger reconciliation is part of the slice, proof per B6.
- **S7 (P2) — DAT-004 barrel stub deletion:** routed pages verified unaffected (direct imports). Re-exporting REAL hooks from the barrel flips 6 dead-family importers from no-op to live mutations if ever routed — acceptable only because DAT-046 deletes those importers; land stub-fix and purge in the same phase, tsc-gated.
- **S8 (P2) — UXD-050 `--cp-bg-sunken` hex removal:** 81 TestHub usages resolve through it; before/after dark+light screenshots of repository, cycle detail, execution.

## 5. Sequencing constraints for Plan Lock

1. VER-022 version-tab port ≤ DAT-046 purge (S1). 2. DAT-046 exclusion list explicit: keep `lib/shared-quality/{useQualityGates,useReadiness}` + `components/releases/quality-gates/**` + `components/testhub/versioning/**` (S2). 3. Backfill-verify-then-retire (never retire-first) for linked_story_key, sprint text, tm_comments (S3/S4/S5). 4. Ghost-table cyij probes precede any code deletion keyed on "absent from types" (tm_requirement_tests, plan_test_cycles, tm_scheduled_runs). 5. NEUTRAL rewrites of B1-B3 surfaces each get their own 2-hour slice with the §3 proof block — never bundled with feature additions. 6. No slice edits the 26 wired report bodies/hooks; report gaps land as new registry entries only.
