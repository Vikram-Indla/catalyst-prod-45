# 09 — Decisions

## D-001 (2026-07-03, Vikram, mid-run correction)
**The AIO Tests PDF pack (`~/Downloads/Catalyst/Catalyst Tests/`, 152 PDFs) is NOT the reference standard.** It's the spec the current (unsatisfactory) TestHub was built from. Treat it as *current-state documentation only*.

**Target baseline instead:** best-in-class composite of Jira Xray, TestRail, Zephyr Scale, qTest, PractiTest + independent test-architecture judgment. Gap register, architecture blueprint, and Plan Lock all measure against this composite. Where AIO's model is weakest (flat run model, thin parameterization, weak automation ingestion, no BDD depth), deliberately exceed it.

**Consequence:** TESTHUB_BUILD_HANDOVER.md's PDF-to-feature traceability map is deprioritized; its tm_* schema facts remain useful as current-state evidence only.

## D-002 (2026-07-03, Advanced Council v3 — overnight synthesis)

**ADVANCED COUNCIL VERDICT: PROCEED WITH MODIFICATIONS** · Debate mode: WR · Read-only council: YES · Evidence level: HIGH · Implementation allowed now: NO (awaiting Vikram go)

Advisor verdicts (full reports in `council/`):
- **A1 Guardrails (ADS + Canonical):** GO with 8 vetoes + 4 mandatory enforcement additions. Key vetoes: no plan may cite `CatalystRichTextEditor` (neutered tombstone — @atlaskit/editor-core is canonical); no new hand-rolled tables/badges; `no-hardcoded-colors.cjs` "fallback-pragmatic mode" hole confirmed — TestHub-scoped zero-baseline ratchet mandated; CRE gate has zero TestHub entries — must add.
- **A2 Functionality Integrity:** GO WITH SEQUENCING GUARDS. Baseline-that-must-not-regress documented (repository CRUD, runner + offline queue, uploads, 26 reports, canonical adapters). 6 gap proposals flagged secretly SUBTRACTIVE; 4 NEUTRAL-intent rewrites of live surfaces = highest regression class — proof table encoded into Plan Lock acceptance.
- **A3 Challenger:** CONDITIONAL GO — "the register reads like a feature backlog; the disease is a data layer that cannot be trusted to tell the truth." Kill-the-lies sweep + live-DB probe pack MUST precede feature gaps or this fails exactly like TestHub v1 (green screenshots over silent-empty queries).
- **A4 DB Realist:** far fewer new tables needed than shards imply, but ZERO migrations until the 14-probe Phase-0 batch runs on cyij — migration ledger over-states live schema by ~73 tables; "exists in migrations" proves nothing.
- **A5 Opportunity:** AMPLIFY 4 / DEFER 6 / REJECT 7. Enterprise "feel" = numbers that never lie + a go/no-go release answer + governed AI — all three buyable with existing repo assets (quality-gate stack lift is highest-leverage).
- **A6 Execution Realist:** GO — trust-first sequence, 61–64 slices (P0=12 incl. probe batch, P1=19, P2=20, P3=12–15). Pre-prod line = P0 + P1-S1…S5. **The one non-negotiable first action: delete the no-op stub barrel exports in `src/hooks/test-management/index.ts:31-52` and re-export real hooks.**

Where council agrees: trust repair before features; reuse over rebuild (quality gates, Gemini fn, JiraTable, adapters); staging probes before any migration; enforcement ratchets in P1.
Where council disagrees: A5 wants quality-gate lift early (P1), A2/A3 sequence it after the coverage-engine spine (P2 start). Plan Lock sides with A2/A3; gate lift = P2-S1.

## D-003 (2026-07-03, RESOLVED 2026-07-04 by Vikram)
**Release id-space decision needed from Vikram (blocks PLN-025/TRC-012 cluster):** test↔release FKs point at legacy `releases`; live UX runs on `ph_releases`/`rh_releases`. Options in council/A4 §Corrected-schema-list. Plan Lock P2 assumes re-point to `ph_releases` — flagged PLACEHOLDER-07, not executed without approval.

**Resolution: `ph_releases`.** Vikram confirmed via direct question at P2 kickoff — matches Plan Lock's own default assumption. `tm_test_cycles.release_id` FK re-points from legacy `releases` to `ph_releases` in P2-S1…S3. PLACEHOLDER-07 cleared.

## D-004 (2026-07-03, P0-S0 cyij probe batch — EXECUTED, rulings)
Target verified: MCP → https://cyijbdeuehohvhnsywig.supabase.co (staging).

| Probe | Ruling |
|---|---|
| P0.1 ghost relations | **ALL 14 ABSENT** (tm_cycle_sets, plan_test_cycles, tm_requirement_tests, tm_requirements, tm_shared_steps, tm_shared_step_categories, tm_scheduled_runs, tm_plan_milestones, tm_saved_filters, tm_notifications, tm_activity_log, tm_ai_embeddings, tm_test_case_templates, tm_user_presence). D-REQ-1 default CONFIRMED (create tm_cycle_sets). useTestPlansG26 `plan_test_cycles` + useDefects `tm_requirement_tests` query dead space. |
| P0.2 tm_defect_links | 7 cols only: id, defect_id, test_run_id, step_result_id, created_by, created_at, attachment_id. D-REQ-3 resolved at P0-S7 vs code expectations. |
| P0.3 requirement_links | requirement_id has **NO FK** (confirmed); orphans=0; 40 link rows; 16 cases with linked_story_key; UNIQUE(test_case_id,requirement_type,requirement_id) + (…external_key) exist; link_type + requirement_type + coverage_status CHECKs live. P1-S9 backfill = 16 rows max, clean. |
| P0.4 sprint FKs | tm_test_cases/cycles/plans/defects → ph_jira_sprints ON DELETE SET NULL ✓ (L21 settled). |
| P0.5 project FK split | CONFIRMED: tm_audit_logs, tm_gate_templates, tm_run_templates, tm_step_definitions → `projects`; all other tm_* → `tm_projects`. |
| P0.6 RLS zero-policy | none — every RLS-enabled tm_* has policies ✓. |
| P0.7 triggers | FSM trigger `trg_validate_cycle_status_transition` (tm_test_cycles) EXISTS — P1-S5 must recreate it in type-swap. `trg_tm_auto_create_defect` (tm_test_runs) EXISTS (P0.10 answered statically). Counter triggers: tm_cycle_scope_stats + trg_sync_cycle_scope_counters (double-maintainer risk), tm_test_cases_folder_counts, trigger_update_test_set_count on **dead** tm_test_set_cases (split-brain proof: count trigger on the unused twin). |
| P0.8 enums | tm_case_status = draft,ready,approved,deprecated (**no needs_update** → D-REQ-2 drop-from-UI CONFIRMED). tm_cycle_status = 7 overlapping values confirmed. tm_defect_severity includes blocker. |
| P0.9 counter drift | cycles: 0 drift; sets: 1 row drifted (expected — count trigger sits on dead twin table). |
| P0.11 legacy rows | test_data_rows/parameters, test_cycle_executions, th_test_executions, defects, tm_test_set_cases, tm_test_plan_cases ALL 0 rows. tm_set_cases=3 (canonical). Retiring legacy reads loses nothing. |
| P0.12 audit split | tm_audit_log = 3 rows, FK→tm_projects (CANONICAL). tm_audit_logs = 0 rows, FK→projects (dead twin). |
| P0.13 tm_projects dupes | 0 ✓. |
| P0.14 RPCs | ALL EXIST: tm_get_traceability_matrix, tm_get_requirement_test_cases, tm_link_requirement, tm_next_entity_key, tm_evaluate_quality_gates, tm_get_release_test_summary, **tm_create_version_snapshot** (P1-S3 reuses instead of creating). |
| tm_ai_usage_log | EXISTS on cyij (0 rows, FK→tm_projects) — memory claim "dropped" is prod/stale; AI usage logging can resume without migration. |

Write-probes (authed INSERT/UPDATE/DELETE per core table) deferred to P0-S11 seeded walkthrough — UI round-trips prove the same paths.

## D-005 (2026-07-03, found live during P1-S2)
**tm_test_case_versions RLS was broken schema-wide** — both policies gated on `is_project_member(uuid,uuid)` with arguments reversed vs that function's real signature, AND even corrected, `is_project_member` reads an empty `project_members` table (0 rows for DEMO project; disconnected from the `tm_user_roles`-based membership every other tm_* policy uses). This silently blocked 100% of direct client reads/writes on version history — masked because the only writer was the SECURITY DEFINER RPC (bypasses RLS). Fixed by standardizing on `tm_user_has_access` (migration `20260703102113_fix_tm_test_case_versions_rls.sql`). Found via a live scratch-row acceptance probe for P1-S2, not by static analysis — recorded as a lesson: RLS policies using an uncommon gate function deserve a live round-trip test, not just a `pg_policies` read.

## D-006 (2026-07-03, found live during P1-S3)
**`tm_create_version_snapshot` RPC has never successfully run.** It referenced 4 columns absent from the real schema: `tm_test_steps.step_type` (no such column) and `tm_test_cases.postconditions`/`priority`/`type` (real columns are `postconditions_html`/`priority_id`/`case_type_id` — the exact UUID-FK-vs-plain-text silent-bug shape TESTHUB_BUILD_HANDOVER.md warned about, this time inside a DB function). Every call 42703'd; explains why `tm_test_case_versions` had 0 rows anywhere despite live client writers running for months (they inserted directly, never through this RPC). Fixed in migration `20260703103642_fix_tm_create_version_snapshot_rpc.sql`, proven via a live scratch-row RPC call (version created, case bumped, step snapshot correct). Lesson: an RPC's mere existence (confirmed by probe P0.14) is not proof it works — the probe should have included a live invocation, not just an existence check.

## D-007 (2026-07-03, found during P1-S7)
**P1-S7's target bug (PLN-012) no longer exists — slice closed with zero code changes.** The Plan Lock cited `src/hooks/test-cycles/useTestReschedule.ts` as the source of a whole-cycle-rewrite bug, but that file (and its whole directory bar `useCycleExecutionItems.ts`) was already deleted in P0-S2's dead-code sweep — no reschedule feature exists anywhere live to have the bug. Separately, `tm_cycle_scope.due_date` already exists in schema and is already correctly wired end-to-end (`useCycleScope` reads it, `DueDateCell` in `CycleDetailPage.tsx` writes it scoped to one row). Verified live: reschedule TC-001 → only its row changed, TC-0001/TC-002 stayed null. Lesson: a Plan Lock slice's cited bug source should be existence-checked before starting execution, not just before writing the fix — P0-S2 had already mooted this one three slices earlier.

## D-008 (2026-07-03, found during P1-S8)
**The whole test-plans feature has zero routed UI — no `/testhub/plan*` route exists in `FullAppRoutes.tsx`.** P1-S8's target (`usePlanLinkedCycles`/`useLinkCycleToPlan`/`useUnlinkCycleFromPlan` in `useTestPlansG26.ts`) queried a plan-cycle join table that P0.1 already proved absent from the DB (D-001 ghost-relation list) and had zero callers anywhere in `src/` — unreachable dead code, not a live migration target. Deleted the 3 exports + `LinkedCycle` interface outright (grep=0 accept criterion met exactly) rather than rewriting them onto `tm_test_cycles.test_plan_id`, since nothing would ever call the rewritten version either. The real FK spine already works today, read-only, via `useDefects.ts` (defect plan provenance). **Scope note:** the rest of `useTestPlansG26.ts` (plan CRUD, scope, team, approvals, templates — ~20 more exports) was NOT audited this slice; it may share the same zero-route fate but that's a separate finding for a future gap slice, not P1-S8's mandate.

## D-020 (2026-07-04, found live during P2-S1 — quality-gate/readiness stack had never run)
**The entire quality-gate/release-readiness RPC stack (`tm_get_release_test_summary`,
`tm_evaluate_quality_gates`, `tm_evaluate_release_gates`, `tm_create_readiness_snapshot`) had
never executed successfully.** Live invocation surfaced four distinct 42703/22P02-class bugs,
stacked (each fix uncovered the next): (1) `tm_get_release_test_summary` filtered
`tm_cycle_scope` on a column called `status`, which doesn't exist (real column `current_status`)
— Postgres silently resolved the unqualified name to the *outer* `tm_test_cycles.status` instead
of erroring at parse time, so it looked plausible until executed; (2) `ORDER BY c.start_date` —
`tm_test_cycles` has no such column (real: `planned_start`); (3) the defects sub-join read the
dead legacy `defects` table (`d.test_case_id`, 0 rows confirmed) instead of live `tm_defects`,
which has no `test_case_id` at all — provenance is `tm_defects.source_test_run_id →
tm_test_runs.cycle_scope_id → tm_cycle_scope.cycle_id`; (4) the defects status filter used
`'verified'`, not a member of `tm_defect_status` (real set: open/in_progress/resolved/closed/
reopened). Separately, `tm_evaluate_quality_gates` read six *denormalized* columns off the
legacy `releases` row (`test_cases_executed`, `test_cases_passed`, `defects_open`,
`coverage_percent`, etc.) that no live trigger ever maintained — meaningless once release_id
re-points to `ph_releases`, which has no such columns at all. And `tm_evaluate_release_gates`'s
`coverage` gate type compared a raw case *count* against a percentage threshold (copy-paste bug,
always nonsensical), and only wrote `tm_release_gate_results`, leaving
`tm_release_quality_gates.current_value/status` stale after every readiness evaluation — a
split-brain between the two gate-evaluation entrypoints (`useReleaseQualityGates`'s manual
"Evaluate Now" vs `useReleaseReadiness`'s snapshot flow). All four RPCs rewritten to compute
live from `tm_cycle_scope`/`tm_defects`/`v_tm_requirement_coverage` (P1-S11's view, reused not
rebuilt); `tm_evaluate_release_gates` now also syncs the gate-list table. Live-proofed
end-to-end on real Senaei BAU data (3 cycles re-pointed to `ph_releases` "Refactor-Senaei 3.3",
4 real gates inserted): summary/evaluate/snapshot all returned consistent, correct numbers
(58 cases, 69.2% pass, 89.7% exec, 1 open critical defect, readiness = not_ready). **Known
follow-up, not fixed this slice:** `blocker_count` gate type has inconsistent semantics between
the two evaluators (`tm_evaluate_quality_gates` counts blocker+critical severities combined;
`tm_evaluate_release_gates` counts `blocker` severity only) — both are internally consistent
and functional, but they disagree with each other on this one gate type. Pick one canonical
definition in a future slice rather than silently picking one now.

**Scope boundary (same slice):** `tm_release_signoffs` (3 live rows, read by the live
`useApprovalAge.ts`/`ApprovalAgeBody.tsx` report) and `th_test_cycles` (6 rows, zero live
readers — only in generated types) both still FK to legacy `releases` and were deliberately
**not** re-pointed: `tm_release_signoffs`'s 3 rows share one legacy release id with no
`ph_releases` counterpart to map onto, and the live report that reads it never touches
`release_id`/`releases` at all (grep confirmed), so leaving it alone is zero-risk and in-scope
work would require inventing a mapping — a zero-assumption violation. `th_test_cycles` is dead
weight, out of the TestHub-live mandate, not touched. Fourteen other FKs to legacy `releases`
exist across unrelated modules (`features`, `subtasks`, `milestones`, `work_item_versions`,
etc.) — explicitly out of scope for a TestHub feature, not touched, not audited further here.

## D-021 (2026-07-04, found live during P2-S4 — target already gone, tool caching bit me)
**P2-S4's cited route (`/release/incidents/reports`, RPT-004) no longer exists at all** —
confirmed via direct `grep`/`ls` (not the `rtk` proxy — see caveat below): no route registers
it in `FullAppRoutes.tsx`, and the file it would have rendered
(`src/pages/release/IncidentReportsPage.tsx`) doesn't exist on disk. It was already deleted,
most likely by P0-S2's 135-file dead-code sweep, without anyone updating the barrel
`src/pages/release/index.ts` that still re-exported it. **Asked Vikram to choose
redirect-vs-delete for a route that turned out to already be gone** — the question itself was
moot, based on a stale finding (see caveat). Closed it properly instead of just deleting one
broken export line: the entire `src/pages/release/` folder (`index.ts` +
`CAPCommitteeQueuePage.tsx`) had **zero live importers anywhere** — 5 of 6 barrel exports
pointed at already-deleted files, and the barrel itself was never imported by anything (grep
confirmed). Deleted the whole folder. `tsc`/build clean after; `audit:ads:gate`'s `tokens`
count dropped 24743→24730 from the dead code's own debt — ratcheted the baseline down per
CLAUDE.md's "ratchet down when a slice reduces counts" rule.

**Tool-reliability caveat:** the first pass at this slice used `rtk proxy grep` (a token-saving
CLI proxy this session has been using throughout) and it returned line-numbered matches for the
dead route in `FullAppRoutes.tsx` that do not exist in the live file — a stale cache, not a
present fact. Cross-checked with plain `grep`/`ls`/`cat` and the discrepancy was immediate and
obvious. No other finding this session was sourced from `rtk proxy grep` without a direct
cross-check, so nothing else is suspected — but any single-sourced `rtk`-only claim from earlier
in this session that was never independently re-verified via a live SQL probe, `tsc`, or a
direct `grep` carries a small residual risk and should be spot-checked before being relied on
again. Flagging this to Vikram directly rather than quietly self-correcting.

## D-024 (2026-07-04, P2-S9/S10/S11 — AI governance: a repo-wide silent-failure bug, quota, and a live-vs-dead correction on my own research)
**Usage logging for the `ai-generate-story-test-cases` edge function had never worked, and the
same bug pattern is copy-pasted into 10 other AI edge functions repo-wide.** Its `logGovernance()`
helper inserted into `ai_governance_audit_log` with columns (`payload`/`status`/`error_message`/
`source`) that don't exist on that table's real schema (`id`/`actor_id`/`contract_id`/`action`/
`object_type`/`object_id`/`diff` — looks designed for a different, contract-based governance
concept entirely). Every insert has silently failed since the function was written — confirmed
live: `select count(*) from ai_governance_audit_log` → 0, and the same `catch (_e) { /* audit
must never block inference */ }` swallow pattern exists in all 10 other functions
(`ai-improve-story`, `ai-translate-field`, `ai-suggest-children`, `voice-transcribe`,
`ai-translate-title`, `summarize-release`, `presence-backup-suggest`, `summarize-comments`,
`generate-whatsapp-summary`, `ai-improve-comment`). **Fixed for this function only** (in scope for
this feature) — replaced with a `logUsage()` helper writing to `tm_ai_usage_log` (the real
usage-ledger table, already existed with correct RLS, 0 rows, zero prior code references —
confirmed via grep before use). **The other 10 functions are out of scope** — flagged via
`spawn_task` (task_b1ad6af3) rather than silently expanding this slice.

**AI-004 (quota + cooldown)**: added server-side, in the same edge function, querying
`tm_ai_usage_log` directly (no separate counter table) — 20/day per user, 10s cooldown between
calls. New `quota_exceeded`/`cooldown` error codes surface as a distinct `isBlocked` state in
`useAIGeneration.ts` (not just a generic error), disabling the Generate button in
`AIGenerateTestCasesDialog.tsx` with "Generation limit reached". Deployed (version 5); live-
verified the unauthenticated-401 path still works post-deploy (`curl` → 401 unauthorized). Full
authenticated round-trip (quota/cooldown/ledger-row proof) needs a real user JWT — deferred to
the browser-access backlog like every other live-UI proof this session.

**AI-006 (delete dead `useCatyAI` layer) — a discovery agent's finding was wrong, caught before
acting on it.** A research agent reported `useCatyAI.ts`'s consumers as "live, routed" — checked
directly (this session's standing rule after the `rtk proxy grep` staleness incident) and found
the *entire* `src/components/caty-ai-chat/` folder (8 files: `CatyAIChat`, `CatyGenerateTestsModal`,
`CatyAICoverageAnalysis`, etc.) has **zero importers anywhere outside itself** — grep for each
component name and for the folder path itself came back empty except the Storybook registry story
and the generated usage-map doc (neither a live route). The *only* connection to a live file was
`BacklogPage.atlaskit.tsx` calling `useCreateCatyConversation()` — but the returned
`createConversation` mutation object was never actually invoked anywhere in that file either (one
dead `const` declaration, no `.mutate(` call). Deleted the whole layer: `useCatyAI.ts`,
`src/types/caty-ai.ts`, the entire `caty-ai-chat/` folder, and the dead hook call + import in
`BacklogPage.atlaskit.tsx`. `caty_conversations`/`caty_messages` DB tables (0 rows) left alone —
out of this slice's frontend-cleanup scope, no code references them anymore either way.

## D-022 (2026-07-04, P2-S16 — target already fully satisfied)
**Per-instance assignee/due-date on cycle scope already exists, live, working, no gaps.**
`tm_cycle_scope.assigned_to`/`due_date` columns already exist; `CycleDetailPage.tsx`'s
`AssigneeCell` (line ~552) and `DueDateCell` (line ~595) already render/write both per row,
already wired into the scope table header (`Assignee`/`Due Date` columns). Confirmed by direct
read, not just agent report (the P0-S2/S7 lesson about verifying before trusting held). No code
change made — same shape as D-007 (target already resolved before the slice started).

## D-023 (2026-07-04, P2-S19/S20 — RBAC reality: a real gap, and a real fail-closed fix on one path)
**`tm_user_has_access()` (the function nearly every tm_* RLS policy calls) has a permissive
fallback: if `tm_user_roles` has no row for a user+project, it returns `true` anyway** ("Allow
authenticated users to access any project — permissive for development" per its own comment).
`tm_user_roles` has 0 rows for every project on staging. **Net effect: every tm_* RLS policy
gated by this function currently provides no real tenant isolation — any authenticated user can
read/write any project's TestHub data.** This is the actual substance of ADM-007.

**Deliberately not touched this slice**: tightening the fallback (removing the `RETURN TRUE`
permissive branch) would instantly lock out every current user on every tm_* table, since no
project has any `tm_user_roles` rows to fall back TO. That's the textbook regression-red-flag
shape CLAUDE.md exists to catch — stopped rather than patched over. Real fix needs a dedicated,
carefully-sequenced future slice: backfill `tm_user_roles` for every current project member
first (from existing project-membership signal, not invented), THEN remove the permissive
fallback, with live verification that no one gets locked out. Plan Lock's own S20 text already
anticipated this ("implementation may slip to P3") — this decision makes the reasoning explicit
rather than leaving it as an unexplained deferral.

**What WAS built this slice** (P2-S19, real and additive): `tm_user_roles` had zero live
consumers anywhere (confirmed via grep) despite having full RLS. First consumer built:
- New `src/hooks/test-management/useTmUserRoles.ts` (assign/remove/list roles per project).
- New "Team & roles" tab on `/admin/test-ops` (`TestOpsPage.tsx`) — real CRUD against
  `tm_user_roles`, not decorative (the actually-decorative matrix, `PermissionsMatrix.tsx`, is a
  completely separate product-level permission system unrelated to `tm_user_roles` — confirmed
  it never references that table at all).
- `tm_approve_release_readiness` rewritten to **require** an `admin`/`test_lead` role in
  `tm_user_roles` for the release's project before approving — additive, fail-closed on this ONE
  action only, doesn't touch the broad `tm_user_has_access()` fallback. Live-proofed: approval
  attempt with no role assigned → rejected ("Only admin or test_lead roles may approve release
  readiness"); assigned a real `test_lead` row → same call succeeded, `tm_release_readiness.
  overall_status` flipped to `approved` with `approved_by`/`approved_at` set correctly.
- Also widened `tm_requirement_links.requirement_type` CHECK to include `defect`/`incident`
  (A4 E4) — was `story|epic|feature|business_request|external` only.
- Set-membership consolidation (A2 S6): `trigger_update_test_set_count` was firing on
  `tm_test_set_cases` (dead legacy twin, 0 rows, zero live code references — confirmed via grep)
  instead of `tm_set_cases` (canonical, live, 3 rows) — proven drift live
  (`tm_test_sets.test_count` stored 0, actual 3). Backfilled the correct count, moved the
  trigger, live-proofed with a scratch insert/delete (count went 3→4→3 correctly), then dropped
  the dead twin outright (0 rows, 0 references, no snapshot table needed — nothing to lose).

## D-009 (2026-07-03, found live during P1-S10b — self-correction of my own P1-S9 work)
**The P1-S9 backfill migration (`20260703410000`) set `requirement_id` on its 16 rows but never `external_key`/`external_title`.** Both `TestCoveragePanel.tsx` and (after S10b) `TestCasesSection.tsx` filter `tm_requirement_links` by `external_key`, not `requirement_id` — so all 16 backfilled rows were invisible to both readers despite having a technically-correct FK. Caught by live testing (story BAU-2668 showed "Test cases 2" instead of the expected 18), not by re-reading my own migration SQL. Fixed with a follow-up data-repair migration (`20260703430000`) rather than amending the original — the original already ran and is committed; a second additive migration is the correct fix per the migration-ledger discipline (never alter an applied migration's file after the fact). Lesson: when a migration sets one column that participates in a join/filter used elsewhere, grep every reader's filter column before declaring the backfill's job done — count equality (16=16) on the wrong column silently proves nothing.

## D-010 (2026-07-03, P1-S10a/b combined finding)
**Two readers of the same conceptual "case↔story" relationship (`TestCoveragePanel.tsx` on the story side, `CatalystViewTestCase.tsx`'s req tab on the case side) already agreed on `tm_requirement_links` + `external_key` as the read contract before this slice — only `TestCasesSection.tsx` (a third, independently-built story-side surface) was on the disconnected `tm_test_cases.linked_story_key` column.** This confirms the Plan Lock's read of the split-brain (DAT-030/031): it was never "no single link model," it was "one file didn't get the memo." P1-S10a+b bring all three onto the same table/column; `linked_story_key` itself is left in place (still written, no longer read) per the retire-first-banned rule — a future slice can drop it once a repo-wide grep confirms zero remaining readers.

## D-011 (2026-07-03, found during P1-S11)
**`TraceabilityPage.tsx` (and, separately, `RepositoryPage.tsx` per S10a's D-finding) resolves its project from a hardcoded literal with no route param ever overriding it — and in this file's case, the literal (`'BAU'`) happens to coincidentally match a REAL but WRONG `tm_projects` row.** The demo's 56 real requirement-links all belong to `tm_projects` key `'SENAEI-BAU'` (a separate row, confusingly also named "Senaei BAU"); the page silently renders "No requirements linked" as if there were genuinely no data, when in fact it's looking at the wrong project entirely. Zero-assumption law technically applies here too (a wrong-but-plausible default masquerading as ground truth) but the actual fix requires a real project-context/switcher mechanism this route doesn't have — bigger than a one-line default swap, and out of scope for P1-S11's file list. Proved this slice's actual deliverable (the `v_tm_requirement_coverage` view + the query logic) correct via rigorous SQL before/after instead of a screenshot through this broken route. Flagged for a future routing slice (candidate for P1-S14's slug/routing sweep or a dedicated project-context fix).

## D-012 (2026-07-03, found during P1-S12)
**The canonical `get_defect_stats(p_project_id)` RPC — the one `useDefectStats` (the CORRECT, non-G25 hook) actually calls — was itself fundamentally broken, not just duplicated by the G25 stack.** It queried `th_defects` (a dead legacy table, confirmed 0 rows) instead of `tm_defects`; its project filter was `(p_project_id IS NULL OR TRUE)` — a tautology that's always true, meaning **the parameter was accepted but silently never used to scope anything**; and its status/severity `WHERE` clauses referenced enum literals (`'new'`, `'fixed'`, `'verified'`, `'deferred'` for status; `'high'`, `'medium'`, `'low'` for severity) that don't exist in the real `tm_defect_status`/`tm_defect_severity` enums. All of this was invisible until I tried to actually prove this slice's own accept condition ("stats change when switching project") and got all-zero for every project. Fixed in migration `20260703460000` — same JSON output keys, correct source table/columns/enum values/filter. Separately found: `useDefectStats` has **zero live consumers anywhere in the routed app** — no dashboard or defects-page surface calls it, so there's no UI to screenshot even now that the RPC is honest. Wiring a stats widget is a real feature, out of scope for this slice's file list; proved via SQL instead (same discipline as D-011). Lesson: "the G25 duplicate is broken, the canonical one is fine" was an assumption worth checking — it wasn't.

## D-013 (2026-07-03, found during P1-S13)
**`CatalystViewDefect` (the existing detail component the router's default type-resolution already pointed "defect" at) cannot render a `tm_defects` row — it's built for `ph_issues`.** TestHub's entire defect surface (`/testhub/defects`, `CreateStoryModal`'s QA Bug branch, P1-S12's sprint/stats work) writes to `tm_defects`, a completely separate table. Built a new sibling component (`CatalystViewTmDefect.tsx`) rather than forking or bending the existing one — same pattern this codebase already uses for `tm_test_cases`/`tasks`/`tm_test_cycles` (each gets its own `CatalystView*` + `entityKind` short-circuit, never a shared component juggling two source tables). The two "defect" concepts (`ph_issues` QA Bug rows, presumably Jira-synced, vs `tm_defects` rows, TestHub-native) remain genuinely separate — unifying them is out of scope for this slice and probably a much larger future decision, not a wiring fix.

## D-014 (2026-07-03, found during P1-S13)
**Wiring `defectsDataSource.ts`'s `onOpenItem` callback was necessary but not sufficient — `BacklogPage.atlaskit.tsx`'s own `openDetail`/`openModal` functions hard-coded a redirect back to the defects list for `entityKind === 'defect'`, intercepting every row-click before `onOpenItem` was ever called.** This was an explicit P0-S5 placeholder ("no registered defect detail route — stay on the list instead of a dead URL") that simply never got revisited once the P0-S5 comment's own precondition (a real detail route) became true in this slice. Fixed both call sites to navigate to the real route, matching the already-correct `test_case`/`release` entityKind branches in the same two functions. Lesson: a stub comment referencing "when P1 ships this" is a live tripwire, not documentation — grep for it, don't assume the caller you just fixed is the only gate.

## D-015 (2026-07-03, found during P1-S14)
**`saved_filters` — a table SHARED across every hub's filter surface — had a dormant, never-reachable code branch that would have errored the moment anyone tried to use it.** `FilterDetailPage.tsx` already read `.eq(isUuid ? 'id' : 'slug', filterId)`, correctly anticipating a future slug-based URL — but the `slug` column never existed, so that branch would `42703` if a real slug were ever passed. It stayed invisible because nothing in the app has ever generated a non-uuid `filterId`. Added the column + a `generate_slug()` trigger (migration `20260703470000`, mirroring the repo's existing `sprints_generate_slug()` pattern and its shared `catalyst_slugify()` helper) — table was confirmed empty, so no backfill/dual-read window was needed, just forward-correctness. Deliberately did **not** touch the dozen+ other files that build filter URLs off `.id` — out of this slice's scope (Files list: migration + routes.ts + testhub block only) and the existing `isUuid` fallback means nothing breaks either way.

## D-016 (2026-07-03, found during P1-S16)
**Two parallel admin sidebars existed — one dead, one live — and the Plan Lock's "11 dead links" ADM-001 finding was about the dead one.** `src/pages/admin/AdminSidebar.tsx` had 16 TestHub entries with 11 pointing nowhere; `src/components/admin/AdminSidebarV2.tsx` (the one `CatalystShell.tsx` actually renders, confirmed by trace) has 5 entries, all real, and is protected by its own parity test. The old file had zero importers — genuinely orphaned, never mounted, so its 11 dead links were never clickable by any real user, but they were still real rot sitting in the repo. Deleted the whole file rather than patch a component nobody sees. Separately: `TestRunStatusesPage.tsx` managed `test_run_statuses`, a legacy table with 0 rows and 0 readers anywhere else — disconnected from the real `tm_execution_status` enum that drives execution, and there's no way to "reconnect" it since Postgres enum values aren't per-row customizable like the table pretended. Deleted per the Plan Lock's own "or removed" alternative. Also found and fixed (drive-by, unrelated to TestHub): the admin-sidebar parity test was red on 2 stale `REGISTERED_ADMIN_ROUTES` entries for the Workflows pocket — both real routes, just missing from a manually-maintained set.

## D-017 (2026-07-03, found during P1-S18)
**None of the 7 report bodies (or the report shell) render an error state at all — "forced failure → error card" is not achievable within this slice's allowed scope.** Grepped every file in `src/components/testhub/reports/bodies/` and `src/pages/testhub/reports/` for `isError`: zero matches anywhere. The hooks now correctly throw on a Supabase error (previously: silent `data: null` → `?? []`/`?? 0` → a "successful" empty/zero result, no error ever surfaced), but nothing downstream reads that error yet. Wiring an actual error-card UI would mean touching a report body or the report shell — both explicitly forbidden by this slice's VETO-8 boundary. Did not cross that boundary to force the accept condition green; documented the gap instead. The real fix (give every report body a shared error-state renderer) is separate, future, additive work — likely its own slice once P1's scope reopens report bodies.

## D-018 (2026-07-03, found during P1-S19)
**TestHub's two create surfaces (`testCasesDataSource.ts`, `defectsDataSource.ts`) hardcoded their `creatableTypes` as literal arrays, completely bypassing the CRE chokepoint filter — confirmed live that `BacklogPage.atlaskit.tsx` uses a data source's `creatableTypes` override as-is with zero call to `filterCreatableTypes()`.** This is exactly the "hardcoded type list" class of drift the CRE gate exists to catch, and it had zero registered chokepoint coverage (Plan Lock's "currently ZERO TestHub entries" claim confirmed accurate). Fixed by routing both through `filterCreatableTypes(types, 'TESTHUB')` — not a cosmetic no-op: `TESTHUB` is already a real CRE module owning exactly `['QA Bug', 'Test Case', 'Test Cycle']` (`MODULE_OWNED_TYPES.TESTHUB`), so this is genuine live wiring that will catch any future ownership-rule drift automatically instead of silently going stale like the two hardcoded arrays would have.
