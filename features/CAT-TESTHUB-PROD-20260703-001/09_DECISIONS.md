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

## D-003 (2026-07-03)
**Release id-space decision needed from Vikram (blocks PLN-025/TRC-012 cluster):** test↔release FKs point at legacy `releases`; live UX runs on `ph_releases`/`rh_releases`. Options in council/A4 §Corrected-schema-list. Plan Lock P2 assumes re-point to `ph_releases` — flagged PLACEHOLDER-07, not executed without approval.

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
