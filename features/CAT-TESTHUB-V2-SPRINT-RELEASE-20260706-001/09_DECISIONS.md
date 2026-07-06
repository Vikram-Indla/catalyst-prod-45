# CAT-TESTHUB-V2-SPRINT-RELEASE-20260706-001 — Decisions

> All explicit decisions made during this feature. Permanent record.
> Append — never delete.

---

## Decisions

> 2026-07-06: Vikram decided D-001 = bridge to rh_releases (keep tm FKs on `releases`, readiness via rh_readiness_checks); D-002 = new tm_test_executions parent table; D-003 = `ALTER TYPE tm_execution_status ADD VALUE 'hold'`; D-004 (new) = TestSets become redirect stubs → Plans, AddToCycleSet logic folds into execution scope builder. Plan Lock APPROVED same day.

### D-001 — Release plane table (DECIDED 2026-07-06: bridge to rh_releases)
Three release models coexist: `releases` (tm_test_cases/cycles/plans.release_id FK it today, has QA counters), `rh_releases` (Release Ops forward truth: readiness_pct, rh_readiness_checks, rh_release_signoffs, rh_release_test_cycle_links→tm_test_cycles bridge), `ph_releases` (ph_jira_sprints.release_id). **Recommendation: rh_releases = V2 release quality plane; `releases` stays legacy read; readiness feeds rh_readiness_checks.** Also flag: rh_release_sprints → anchor_sprints while tm/sprint plane uses ph_jira_sprints — needs alignment call.
**Blocks:** Phase G release slices only.

### D-002 — Execution vs Cycle split (OPEN — Vikram, recommendation attached)
V2 model separates Test Execution (lab) from Test Cycle (dated attempt); today tm_test_cycles is both. Options: (a) new tm_test_executions parent table + cycles FK it (clean model, more migration+UI risk); (b) extend tm_test_cycles with scope_type (project|product|sprint|release|br|custom) + scope FKs and treat "execution" as a grouping layer (lower risk, slight model impurity). **Recommendation: (a) new parent table — locked scope names both objects explicitly; additive migration, cycles gain nullable execution_id.**
**Blocks:** Phase B data slices for executions.

### D-003 — 'hold' step-result status (OPEN — Vikram, recommendation attached)
tm_step_results.status enum lacks `hold`. Options: (a) `ALTER TYPE tm_execution_status ADD VALUE 'hold'` (additive-safe, irreversible, separate txn); (b) new text+CHECK column. **Recommendation: (a) — one value, matches existing enum usage everywhere.**

### D-004 — Extend tm_*, never greenfield (DECIDED 2026-07-06)
~70% of V2 object model exists in tm_* (LOOP-001). All schema work = additive migrations on tm_* + new tables for variance/sprint-health/execution only. No forks of tm data layer; contracts in 12_AGENT_OUTPUTS.md Agent 4 binding.

### D-005 — No drops of live "dead-looking" tables (DECIDED 2026-07-06)
test_data_rows/test_data_parameters/test_cycle_executions/step_result_attachments still live-wired (FKs + hooks). Any consolidation = explicit deprecation slice with evidence, not part of V2 build.

### D-007 — AI ops consolidated into one parameterized edge fn (DECIDED 2026-07-06)
Plan Lock named 10 separate ai-tm-* functions. Implemented as: generation stays in existing `ai-generate-test-artefacts` (already covers work_item/defect/incident/prompt sources); the other 9 ops (complete/improve/correct/convert_uat/coverage/gaps/link_suggest/sprint_risk/release_risk + en|ar) live in ONE `ai-tm-assist` fn with op routing — same governed skeleton (JWT gate, shared tm_ai_usage_log quota `tm_assist_%`, cooldown, structured outputs per op family, draft-only contract). One deploy, one key, no 9× skeleton duplication. **Deploy pending: ANTHROPIC_API_KEY not set on cyij; deploy + set key together (Vikram).**

### D-006 — Evidence consolidation target (DECIDED 2026-07-06, reversible)
Standardize new evidence writes on polymorphic tm_attachments + bucket `testhub-attachments`. Existing rows untouched; useEntityAttachments defect-attachments drift fixed in a dedicated slice.
