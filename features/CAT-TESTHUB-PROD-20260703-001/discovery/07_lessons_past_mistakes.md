# 07 — Lessons from Past Mistakes (Discovery, CAT-TESTHUB-PROD-20260703-001)

**Scope:** Mined from `src/pages/testhub/TESTHUB_BUILD_HANDOVER.md` (642 lines), feature folders
`CAT-TESTHUB-ENGINE-20260626-001`, `CAT-TESTHUB-REPORT-REVAMP-20260627-001`,
`CAT-TESTHUB-REPORTS-20260627-001`, `CAT-REPORTS-HUB-20260703-001`,
`CAT-WORKFLOW-STUDIO-20260702-001`, `CAT-KANBAN-JIRA-PARITY-20260702-001`, and project memory files.
Every claim carries file:line or command evidence. Rules of evidence: no guessing; UNKNOWN stated where applicable.

---

## A. Documentation & planning failures

### L1 — The TESTHUB_BUILD_HANDOVER.md itself caused live bugs. Treat it as HISTORICAL, not authoritative.
- **Evidence:** `features/CAT-TESTHUB-ENGINE-20260626-001/08_DRIFT_LOG.md:32` — "step-result inserts used WRONG columns … Followed stale TESTHUB_BUILD_HANDOVER.md doc". The doc claims `tm_test_runs` uses `scope_id, cycle_id, case_id` and `tm_step_results` uses `run_id, step_id` (`src/pages/testhub/TESTHUB_BUILD_HANDOVER.md:54-55`); real columns are `cycle_scope_id` and `test_run_id`/`test_step_id`.
- More staleness: it prescribes hardcoded hex icon colors `#0052CC`, `#6554C0`, `#DE350B` (`TESTHUB_BUILD_HANDOVER.md:131-137`) and "ADS tokens … with hex fallback" (`:405`) — both now HARD-BANNED by CLAUDE.md color law (no hex, no `var(--ds-*, #fallback)`). It also points at prod `lmqwtldpfacrrlvdnmld` (`:555`) while the dev app runs on staging cyij (memory `dev-app-supabase-project.md`), and references docs that no longer exist (`docs/TESTHUB_GAP_ANALYSIS.md`, `docs/test-management-backend-spec.md` — `ls` returns "No such file or directory").
- **Plan response:** The new plan must declare TESTHUB_BUILD_HANDOVER.md superseded. Every schema claim in any doc gets re-proven against live cyij `information_schema` before a hook is written. No hex anywhere; tokens only.

### L2 — "Greenfield" framing was wrong once already; the module is refactor/complete, not rebuild.
- **Evidence:** `features/CAT-TESTHUB-ENGINE-20260626-001/11_KARPATHY_LOOP_LOG.md:3-8` — Loop 1: hypothesis "build the whole test hub" DISCARDED; full `tm_*` schema (75 tables), routes, pages, hooks already existed. Loop 2: execution was "built but UNPROVEN", not missing.
- The original module was deleted once for being placeholder-ware: "9 of 14 routes were 'coming soon'" and it read `th_*` but wrote `tm_*` → always empty (`TESTHUB_BUILD_HANDOVER.md:27-31`).
- **Plan response:** Discovery-first with live probes per surface (exists? renders? writes persist?). No "coming soon" pages ever (`TESTHUB_BUILD_HANDOVER.md:629` + objective constraint "deprecating existing TestHub behavior is not [allowed]", `01_OBJECTIVE.md`). Classify every surface as PROVEN / EXISTS-UNPROVEN / MISSING before scoping.

### L3 — Decision flip-flop on the defect model burned two cycles. Pin it once.
- **Evidence:** D1 (defects = ph_issues QA-bug view, `CAT-TESTHUB-ENGINE…/09_DECISIONS.md:5`) → D5 (source table = ph_issues, `:9`) → **D14 REVISES D1: keep tm_defects** because the DEMO tm_project had 0 ph_issues bugs (`:17`). Report-revamp then locked **hybrid**: D-005 = ph_issues (QA Bug 788 / Production Incident 152) + tm_defects (`CAT-TESTHUB-REPORT-REVAMP…/07_HANDOVER.md:13`). Canonical creation path today: CreateStoryModal defaultWorkType "QA Bug" → tm_defects via isDefect branch (memory `defect-creation-canonical-qabug.md`).
- **Plan response:** State the defect model in the Plan Lock as settled (tm_defects = TestHub store; ph_issues QA Bug/Production Incident = delivery-side; hybrid for reports; creation via canonical CreateStoryModal). Any change is a formal decision, not a mid-slice pivot.

---

## B. Database landmines (the biggest lesson family)

### L4 — Broken DB triggers silently killed ALL writes — twice.
- **Evidence:** `08_DRIFT_LOG.md:17` — `auto_create_test_case_version()` referenced nonexistent `OLD.objective/OLD.priority/NEW.updated_by` → **every tm_test_cases UPDATE 400'd** (42703); all edit paths dead until D9 dropped it (migration 20260627120000). `08_DRIFT_LOG.md:33` — 2 audit triggers on tm_cycle_scope read dead `test_cases.test_key` → **every scope UPDATE 400'd** (D13, migrations …160000/…170000).
- **Plan response:** Before any phase touching a tm_* table, run a live write-probe (INSERT/UPDATE/DELETE as authed user) per table and enumerate its triggers (`pg_trigger`). Budget a "trigger forensics" slice; assume legacy triggers reference dead `test_cases`/`th_*` names until proven otherwise.

### L5 — Competing/duplicated denormalized counters drift; live counts win.
- **Evidence:** `08_DRIFT_LOG.md:29` — tm_cycle_scope had recompute triggers AND +1/-1 increment triggers → cycle total_cases=4 vs real 3 (D12 dropped increments, backfilled). `08_DRIFT_LOG.md:23` — `tm_test_sets.test_count` never synced (=0 forever); list fixed to derive live count; note PostgREST embed `tm_set_cases(count)` failed PGRST200 (no detected FK) → two-query tally.
- **Plan response:** Never render a denormalized count column without proving its maintenance path. Prefer live COUNT queries or a single verified recompute trigger. Any dashboard/report KPI must show its data source in the plan.

### L6 — FK family split: tm_* points at BOTH `projects` and `tm_projects`. 5 outliers still un-fixed.
- **Evidence:** D10 repointed tm_test_sets FK projects→tm_projects after Set create 23503-failed (`09_DECISIONS.md:13`). `08_DRIFT_LOG.md:26` — still-open FLAG: `tm_audit_logs, tm_gate_templates, tm_run_templates, tm_scheduled_runs, tm_step_definitions` FK `project_id→projects`. Also duplicate "Senaei BAU" tm_projects rows (84f91caf active, 748f80ae orphan-ish) — `CAT-REPORTS-HUB…/07_HANDOVER.md:34`.
- **Plan response:** Include a one-shot FK audit slice (`information_schema.table_constraints` for all tm_*) and repoint the 5 outliers before building on them (audit log, templates, scheduled runs are all in the enterprise gap list). Resolve the Senaei BAU dedup before seeding.

### L7 — RLS enabled with ZERO policies = default-deny that reads as "empty", not as an error.
- **Evidence:** `08_DRIFT_LOG.md:21` — tm_set_cases shipped RLS-enabled, no policies → 42501 on every membership write; D11 added the canonical 4 policies mirroring tm_cycle_scope. Related: memory `reference_staging_db_access.md` — "never trust MCP-perm-error/anon-RLS as 'empty'".
- **Plan response:** Policy audit across all tm_* tables (pg_policies vs relrowsecurity) is a Phase-0 gate. Any new tm_* table ships with the 4 tm_user_has_access-gated policies in the same migration.

### L8 — Enum casing mismatches: DB lowercase vs app UPPERCASE matched 0 rows / 400'd writes.
- **Evidence:** `08_DRIFT_LOG.md:28` — cycle status enum lowercase but SetDetailPage:427 filtered `'PLANNED'/'IN_PROGRESS'` → matched 0 cycles; "ExecutionPage run-status uppercase ('NOT_RUN'/'IN_PROGRESS') deferred to Phase 4" — status UNKNOWN whether ever fixed; must re-probe. `08_DRIFT_LOG.md:36` — DEFECT_STATUSES used UPPERCASE + invented values (FIXED/VERIFIED/WONT_FIX) vs real enum [open,in_progress,resolved,closed,reopened] → 400.
- **Plan response:** One canonical enum-bridge module per entity (like severityToDb/FromDb, memory `workitem-enum-dedup-deprecation.md`); ban raw string literals for statuses in queries. Re-probe ExecutionPage run-status casing explicitly.

### L9 — Missing tables/columns fail silently in the UI (PGRST205 / PGRST200 / 42703 swallowed).
- **Evidence:** `08_DRIFT_LOG.md:25` — `tm_cycle_sets` doesn't exist on cyij; SetDetailPage query "errors silently → '0 cycles'". `08_DRIFT_LOG.md:12` — useTestCases referenced nonexistent `tm_test_cases.archived` / `tm_case_priorities.level` → threw on every surface. Memory `dev-app-supabase-project.md`: app DB is cyij; unapplied migrations → PGRST205 404s. Memory `cyij-migration-marked-not-executed.md`: a schema_migrations row ≠ DDL applied.
- **Plan response:** Every hook lists its exact columns in the plan; a column-existence probe (or generated types check) precedes coding. Migration acceptance = probe the column live, never trust the ledger.

### L10 — Migration ledger: 5 timestamp-prefix collisions (2 were TestHub migrations) broke `db push`.
- **Evidence:** `features/CAT-KANBAN-JIRA-PARITY-20260702-001/08_DRIFT_LOG.md:47-58` — schema_migrations PK on version; colliding pairs included `20260626100001_drop_broken_sync_jira_bug_to_defect.sql` and `20260627130001_repoint_tm_test_sets_project_fk_to_tm_projects.sql`; 29 orphaned + 439 unrecorded versions repaired. CLAUDE.md now codifies unique-version + 1:1 ledger discipline.
- **Plan response:** Check `ls supabase/migrations | cut -d_ -f1 | sort | uniq -d` before naming any migration; all DDL staging-first on cyij via MCP apply_migration / Management API (memory `staging-ddl-via-management-api.md`); never `supabase db push` from the shared checkout; assert `supabase/.temp/project-ref` per batch.

---

## C. Frontend wiring failures

### L11 — Silent `{data}`-only destructure hides every backend failure as an empty state.
- **Evidence:** Repo-wide sweep already done — memory `silent-query-error-sweep.md` (commits 122398d11 + dbc7faaa5): fix pattern = `isError||error → SectionMessage+Retry, isPending → spinner`. Origin cases: `features/CAT-DETAIL-MODAL-404-20260702-001/01_OBJECTIVE.md:21` ("destructures only `{ data }`, discards `{ error }`") and `features/CAT-KANBAN-JIRA-PARITY-20260702-001/03b_PLAN_LOCK_REVISED.md:79`. Workflow Studio P0 found two extra layers: React Query pauses retries when tab unfocused (pending/paused renders as neither loading nor error) and the ads SectionMessage wrapper crashed on raw action objects — `features/CAT-WORKFLOW-STUDIO-20260702-001/sessions/001_discovery_council_plan_p0.md` (P0 log).
- **Plan response:** Mandatory query contract for all new TestHub hooks: destructure `data, error, isError, isPending`; error → SectionMessage(error, Retry); pending → spinner. Add to the plan's binary acceptance criteria per surface.

### L12 — Crashed/dead pages shipped unnoticed: missing import, wrong column names in components.
- **Evidence:** `08_DRIFT_LOG.md:19` — TestSetsPage crashed on render (`useNavigate is not defined`, missing react-router-dom import) — whole /testhub/sets surface dead. `08_DRIFT_LOG.md:22` — SetDetailPage used `set_id`/`order_index` (real: `test_set_id`/`sort_order`) → "Cases (0)" despite 3 members. Workflow-studio close-out: "Two crash-fixes en route … tsc missed both, runtime caught".
- **Plan response:** tsc-clean is necessary but NOT sufficient. Every route in scope gets a runtime render probe + one CRUD round-trip proof (the ENGINE feature's "PROVEN live" discipline) before a slice is called done. Memory `feedback_self_verify_before_declaring_done.md` applies.

### L13 — Destructive actions without confirm: TC-010 was hard-deleted by a stray click.
- **Evidence:** `08_DRIFT_LOG.md:14` — "INCIDENT: TC-010 hard-deleted by a stray click during testing (no confirm) … Restored TC-010; added delete-confirm dialog."
- **Plan response:** Confirm-dialog (or undo) is a required acceptance row for every delete/archive/bulk action across the revamp — cases, folders, sets, cycles, runs, defects.

### L14 — Floating CATY assistant overlapped the drawer footer's primary action.
- **Evidence:** `08_DRIFT_LOG.md:15` — "CATY floating assistant overlaps the CaseDrawer primary action (Create case) — clicks hit CATY not submit" (logged open; CaseDrawer→CatalystViewBase migration removed the footer, `07_HANDOVER.md:9` "CATY footer-collision gone").
- **Plan response:** Any new modal/drawer footer must be z-index/collision-checked against the CATY widget; prefer CatalystViewBase (D4) which already avoids this.

### L15 — JiraTable chevron slot: gate on actual expandability or every row gets dead left padding.
- **Evidence:** memory `jiratable-chevron-slot-gating.md`; implemented at `src/components/shared/JiraTable/JiraTable.tsx:1289` (`anyRowHasChildren`) with regression test `src/components/shared/JiraTable/__tests__/chevron-slot-gating.test.ts:16`.
- **Plan response:** TestHub tables (repository, cycles, defects, sets) must use JiraTable as-is and pass `getRowHasChildren` only when rows genuinely expand. No forked table. JiraTable gotcha from Studio: `onRowClick` passes the ROW object, not an id.

### L16 — Dark mode: light-metaphor styling ships broken into dark; verify by reload-into-dark only.
- **Evidence:** memories `dark-mode-light-metaphor-trap.md`, `dark-mode-probe-method.md` (runtime toggle gives false white-glare; reload into dark), `index-css-dark-sweep-hijacks.md` (!important sweep rules make computed color contradict inline style); recent main commits `7213f84ab` (sidebar blue-on-blue) and `677b167fb` (ON HOLD amber pill) are both dark-mode defects. Reports-hub handover: "Dark-mode reload check NOT done — do on next session" (`CAT-REPORTS-HUB…/07_HANDOVER.md:20`).
- **Plan response:** The objective demands light+dark audit. Every screenshot gate runs twice (light + reload-into-dark). Tokens-only styling makes this nearly free; any neutral-palette/white-pill elevation metaphor is a defect.

### L17 — Persisted react-query cache masks fresh data during verification.
- **Evidence:** memory/feature `testhub-report-revamp.md` gotchas — "persisted react-query cache key `catalyst-rq-cache` (localStorage) + 15min staleTime → stale UI after data/seed changes. Clear it + reload when verifying."
- **Plan response:** Validation protocol for every data-proof: clear `catalyst-rq-cache` + hard reload before screenshotting. Write it into 06_VALIDATION_EVIDENCE procedure.

---

## D. Ecosystem shifts since the old handover (stale advice that would now be WRONG)

### L18 — Workflow/status advice in the old handover is superseded by Workflow Studio (ph_wf_* + registry + CRE).
- **Evidence:** `TESTHUB_BUILD_HANDOVER.md:93-102, 358-367` says extend `WORK_ITEM_TYPES` in useTypeWorkflow.ts / `ph_workflow_statuses`. Since then: versioned engine ph_wf_* with draft/publish RPCs (`CAT-WORKFLOW-STUDIO…/sessions/001…md` P1 log), work-item types now live in **ph_work_item_types registry** — "native RAISEs" for unregistered types via `ph_issues_resolve_type` trigger (P3.3 log), and CRE chokepoints gate creation (`memory cre-chokepoints-wired.md`: filterCreatableTypes/getAllowedChildTypesWithRegistry/canLinkTo, lint:cre blocking; never bypass — extend EXTRA_CREATE_RIGHTS for cross-module exceptions).
- **Plan response:** If TestHub entities need admin-managed statuses/workflows, the plan must decide: tm_* config tables vs onboarding test entity types into the ph_wf_*/registry world — with CRE module-ownership rules stated. Do NOT resurrect useTypeWorkflow extension. Any TestHub→ph_issues create/link surface must pass through CRE chokepoints or lint:cre fails the commit.

### L19 — Reports are DONE and consolidated; the objective says "reuse, never refactor".
- **Evidence:** `CAT-REPORTS-HUB-20260703-001/07_HANDOVER.md:15` — single hub `/testhub/reports/:reportSlug`, 26-report registry (`src/components/testhub/reports/report-registry.ts`), zero mock data, old routes redirect; D-001 killed standalone report pages and ReportDetailPage (1366 LOC). `01_OBJECTIVE.md` (this feature): "Reports: reuse, never refactor."
- **Plan response:** New test reports = new registry entries only. Chart engine = Recharts 3 + `--ds-chart-categorical-1…8` (ECharts proof-gated, D-001.5). The only sanctioned hex exception is the recharts SVG palette with `ads-scanner:ignore-line` (`CAT-TESTHUB-REPORTS…/07_HANDOVER.md:60`). AI narratives only on proven data (D-001.6); edge functions deployed via MCP must have zero external imports (`CAT-REPORTS-HUB…/07_HANDOVER.md:37`).

### L20 — Duplicate work-item "generations" were purged once; do not create a new parallel family.
- **Evidence:** memory `workitem-enum-dedup-deprecation.md` — Defects-v2 retired (3 routes + pages deleted), old release test-cases folded into TestHub, g25 UI deleted. BUT `src/hooks/useDefectsG25.ts` + `src/lib/shared-quality/hooks/useDefects.ts` still exist (grep confirms) — kept alive via lib/shared-quality. `test_*` family (~110 tables) is ALL DEAD 0 rows; 6 competing schema families exist (memory `testhub-report-revamp.md`).
- **Plan response:** Canonical set is fixed: `tm_*` tables, `src/types/test-management.ts`, TestHub pages, canon types in `src/types/work-item-canon.ts`. The plan must not import from useDefectsG25/shared-quality for new surfaces, and should flag them for a dedicated retirement task, not silently fork around them. Never touch th_*/test_* (`TESTHUB_BUILD_HANDOVER.md:41` remains valid).

### L21 — Sprint linkage claims must be re-proven: sprint data moved twice.
- **Evidence:** Old handover: `tm_test_cycles.sprint_id` → FK `iterations.id` (`TESTHUB_BUILD_HANDOVER.md:76`). Report revamp: ph_issues sprint truth = `sprint_release` JSONB, `sprint_name` near-dead (2/2381) (`CAT-TESTHUB-REPORT-REVAMP…/07_HANDOVER.md:25`). Sprints-native Phase 0 (memory `sprints-native-phase0-complete.md`): "membership = sprint_id FK" shipped 2026-07-02. Current FK target of tm_test_cycles.sprint_id: **UNKNOWN — probe live**.
- Also: supabase-js `.contains`/`cs` cannot encode sprint names with spaces → returns 0; resolve JSONB scope client-side or raw SQL `@>` (`memory testhub-report-revamp.md` gotchas).
- **Plan response:** Phase-0 probe: FK target of tm_test_cycles.sprint_id, iterations vs sprints table liveness, and the sprint picker source. Sprint-scoped queries follow the client-side JSONB resolution pattern.

### L22 — tm_requirement_links has a CHECK constraint that bit once already.
- **Evidence:** memory `testhub-report-revamp.md` gotchas — `requirement_type` CHECK = story/epic/feature/business_request/external only (no defect/incident); tests link to QA Bug/Incident via `external` + external_key.
- **Plan response:** Traceability/linkage design must respect (or explicitly migrate) this constraint; the linkage map deliverable should state per link-type which table+constraint carries it.

---

## E. Process lessons

### L23 — Discovery agents mis-report; trust live probes over agent claims.
- **Evidence:** `08_DRIFT_LOG.md:11` — agent said `/testhub/defects` route MISSING; it existed at FullAppRoutes.tsx:674 ("Trust live probe over agent claim"). Workflow-studio P1.3: "Discovery correction: … WorkflowVersioningPage 'NONE' cells are stale in-file hardcode". Reports-hub D-006: "PHASE0 'no approved_at' claim was checked against the wrong table" (`09_DECISIONS.md:37`).
- **Plan response:** Council/discovery outputs are hypotheses. Plan Lock rows referencing a table/route/column cite a live probe, not an agent summary.

### L24 — Gates that saved the last three features (keep them all).
- **Evidence:** every phase of reports-hub and workflow-studio committed only after: `npx tsc --noEmit` 0, `lint:colors:gate` 0-over-baseline, `audit:ads:gate` no-increase (`CAT-REPORTS-HUB…/07_HANDOVER.md:19`; `CAT-TESTHUB-REPORTS…/07_HANDOVER.md:62-70`). Audit-gate specifics learned live: bans `textTransform: uppercase` (use literal caps), off-grid px (10/14/18), raw `<hN>` (use ads Heading); ads Select needs `{value,label}` option objects (silent no-op with raw strings) — workflow-studio P2.3 gotchas.
- **Plan response:** Same three gates per slice, plus `lint:cre` where creation surfaces are touched. Ratchet baselines only downward.

### L25 — Concurrent sessions on one checkout have destroyed work; stage explicit files only.
- **Evidence:** memory `concurrent-session-git-collision.md` (sibling `git add -A` swept edits into b5a73181c); `CAT-REPORTS-HUB…/07_HANDOVER.md:39` — "Two concurrent sessions on this checkout: always stage explicit paths"; CLAUDE.md CONCURRENT SESSIONS hard-stop section; git status right now shows a workflow-studio session file modified by another session.
- **Plan response:** Execution sessions for this feature isolate in a worktree if anything else is active; never `git add -A`; per-batch `cat supabase/.temp/project-ref` before linked DDL (staging cyij `cyijbdeuehohvhnsywig`; prod lmqw only on explicit instruction).

### L26 — Cosmetic-but-open leftovers from the ENGINE feature to inherit into the gap register.
- **Evidence (all `08_DRIFT_LOG.md` / `07_HANDOVER.md` of CAT-TESTHUB-ENGINE):** case_key padding TC-0001 vs TC-001 (`:16`, open); version-pinned set membership not schema-supported (`:24`, open); tm_cycle_sets missing (`:25`, open); percolate trigger fires only on UPDATE OF status, app compensates (`:31`, open); Phase 4b evidence-attach never built, run_number hardcoded 1 / multi-run missing, Phase 3b assignees untested, Classic/BDD toggle deferred, folder move/drag deferred (`07_HANDOVER.md:11,17,18`).
- **Plan response:** These are pre-verified gaps — import them into GAP_REGISTER.md with their evidence lines instead of re-discovering.

---

## Top risks distilled (for the Plan Lock risk table)
1. **Legacy triggers/RLS on untouched tm_* tables** will 400/deny the first time a new surface writes (L4, L7) — Phase-0 trigger+policy+write-probe sweep is non-negotiable.
2. **Stale docs as spec** (L1, L18): the old handover actively contradicts current color law, DB reality, workflow architecture, and Supabase project targeting.
3. **Silent-empty failure modes** (L9, L11, L17): missing table, RLS deny, JSONB filter miss, and persisted cache all render as "no data" — acceptance must prove data round-trips, not screenshots of empty states.
4. **Schema-family confusion** (L20, L21): th_*/test_* dead families, G25 hooks still importable, sprint linkage moved — one wrong import recreates the dual-schema bug that killed TestHub v1.
5. **Scope explosion without slice discipline** (L2, L24, L26): the ENGINE feature succeeded via per-slice live proof + gates; the 500+-gap ambition must decompose into the same 2-hour proven slices.
