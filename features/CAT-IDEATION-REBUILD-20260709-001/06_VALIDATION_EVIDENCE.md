# Validation Evidence

## S1 — core schema (20260709130000_idn_core_schema.sql) · staging · 2026-07-09

**Target verification**: Supabase MCP connector scoped to `catalyst-staging` (`cyijbdeuehohvhnsywig`, eu-central-1, ACTIVE_HEALTHY) — prod not visible to token; project ID cross-checked against Vikram's dashboard screenshot. No local link created (shared checkout untouched).

**Apply**: `apply_migration` success. Ledger row aligned to committed file: `version=20260709130000, name=idn_core_schema` (1:1 discipline).

**P0 structural** (raw): `idn_tables=7, idn_policies=21, idn_triggers=4, approval_fn_exists=true`

**Behavioral RLS probes** (JWT-simulated approved users A/B, raw output):
| Probe | Outcome |
|---|---|
| P1 insert + key/slug autogen (user A) | PASS: IDEA-2 / s1-probe-idea |
| P3 cross-user draft edit (user B) | PASS: 0 rows |
| P4 spoofed submitter insert | PASS: blocked (42501) |
| P6a update on converted (locked) idea | PASS: 0 rows |
| P6b comment on locked idea (designed exemption) | PASS: allowed |
| P6c vote on locked idea | PASS: blocked (42501) |
| P8 non-admin delete | PASS: 0 rows |
| P9 audit-log tamper (append-only) | PASS: 0 rows |
| cleanup | done (probe rows removed) |

Notes: key sequence shows IDEA-2 because a first probe transaction rolled back on a temp-table grant (sequences don't roll back — expected, gap-tolerant by design). P2 (parallel-session key race) not executable over a single MCP connection; covered structurally by sequence-based generation + UNIQUE constraint; flagged for the Phase 2 integration test suite.

## S2 — governance schema (20260709150000_idn_governance_schema.sql) · staging · 2026-07-09

**Precondition**: pgvector 0.8.0 already enabled (verified) — HNSW index used.
**Apply**: `apply_migration` success; ledger aligned to `20260709150000` (1:1).

**Probes** (raw output):
| Probe | Outcome |
|---|---|
| G1 single-active-model unique index (2nd approved model) | PASS: blocked (23505) |
| G2 score recompute trigger — value 4×0.6 + effort 2 (lower_better → norm 3)×0.4 | PASS: 3.60 |
| G3 score insert by user without idn role | PASS: blocked (42501) |
| G4 AI suggestion insert by client (service-role-only ledger) | PASS: blocked (42501) |
| G5 embeddings invisible to authenticated clients (RLS, no policies) | PASS: 0 rows |
| G6 conversion insert by non-approver | PASS: blocked (42501) |
| G7 business_requests.source_idea_id column present | PASS |
| cleanup | done |

Notes: G1 first attempt failed on `created_by NOT NULL` (definer context has null auth.uid()) before reaching the unique index — re-run with explicit created_by exercised the intended path. Suggestion-decide policy (status transition + decided_by attribution CHECK) exercised structurally via constraint `idn_suggestion_decision_attributed`; behavioral decide-flow probe lands with the Phase 4 copilot tests.

## S3 — seeds (20260709160000_idn_seeds_phase1.sql) · staging · 2026-07-09

**Pre-apply**: first apply attempt FAILED (`42P01 ph_wf_templates does not exist`) → DRIFT-001 raised; 4 sections amended per Vikram decisions D10–D12 (see 09_DECISIONS.md, session 004). Transactional rollback verified (guard CHECK unchanged, no ledger row) before re-apply.
**Apply**: amended migration `apply_migration` success; ledger aligned to `20260709160000` (1:1, verified: 130000/150000/160000 all present).

**Probes** (raw output, single UNION query):
| Probe | Outcome |
|---|---|
| Scoring models | PASS: default-v1 approved · rice-v1 draft · wsjf-v1 draft |
| Drivers | PASS: default-v1 = value,effort (2) · rice-v1 = reach,impact,confidence,effort_months (4) · wsjf-v1 = user_value,business_value,time_criticality,effort (4) |
| Workflow version | PASS: entity_key ideation, published, v1 |
| Workflow statuses | PASS: 10 — draft,submitted,screening,evaluation,approved,declined,parked,merged,converted,delivered (sort order correct) |
| Workflow transitions | PASS: 12 |
| Transition roles | PASS: 11 rows |
| Transition guards | PASS: 8 rows; types = strategy_link_present, scores_complete, duplicate_review_complete, reason_required |
| Scheme entry | PASS: ideation registered in default scheme |
| Workflow template | PASS: Ideation / work_item_type 'Idea' (D12) |
| admin_nav_modules | PASS: ideation → core/main, sort 8 (D12) |
| admin_role_module_permissions | PASS: 26 rows — full=7, view=19 (D11 exactly) |
| notification_trigger_config | SKIPPED with NOTICE (table absent on staging — D10 waiver; seeds will apply where table exists) |
