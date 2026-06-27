# QUESTIONS QUEUE — answer first, every iteration

> Discovery surfaced the real blockers. These are now LIVE questions for Vikram.
> Zero-assumption: Claude will not pick a convenient interpretation. Stop and ask.

---

## OPEN — BLOCKING (answer to unblock blueprint)

### Q-001 | Canonical TEST schema
**Found:** 6 families — `tm_*` (reports use this, 11 cases), `th_*` (mostly dead), `test_*` (~110 tables, 0 rows), plus ph_/rh_/r360_ test bits.
**Unknown:** Which is the source of truth going forward?
**Why:** Every report's data source depends on it.
**Options:** A. tm_* (reports already wired) · B. th_* · C. consolidate to one (invasive, migration) · D. other.
**Recommendation (only):** A — tm_* is the only test schema the live reports query and has the richest model (requirement_links, cycle_scope, defect→test). Needs real data, not a new schema.
**Blocks:** D1/D4/D5, all of blueprint.

### Q-002 | Canonical WORK-ITEM source
**Found:** `ph_issues` (2381, Jira mirror, sprint as TEXT `sprint_name`) vs `ph_work_items` (1366, normalized `sprint_id`/`release_id`/`parent_id` FKs).
**Unknown:** Which is authoritative for report scope + coverage joins?
**Why:** Coverage/traceability needs to join test artifacts → stories → sprint/release. FK model (ph_work_items) joins cleanly; ph_issues needs text matching.
**Options:** A. ph_work_items (FK-clean) · B. ph_issues (full Jira data, 2381) · C. ph_issues for display + ph_work_items for joins.
**Blocks:** scope model, coverage, traceability.

### Q-003 | Release → Sprint relationship
**Found:** No FK. `ph_jira_sprints` has no `release_id`; `ph_releases` has no sprint ref. `ph_work_items` carries both sprint_id + release_id.
**Unknown:** Can a release contain many sprints? Derive how?
**Options:** A. Derive: a release's sprints = sprints of work items in that release · B. Add explicit release_id on sprint (invasive, consent-gated) · C. Releases & sprints independent, joined only via work items.
**Blocks:** release-level reporting (U-002).

### Q-004 | Coverage denominator
**Unknown:** Coverage % = covered ÷ (stories? requirements? test cases? executions?).
**Found:** `tm_requirement_links.coverage_status` exists (per-link), unused at scale.
**Blocks:** every coverage formula (F-01..).

### Q-005 | Real test data plan
**Found:** tm_* is demo-only (11 cases/1 run/1 cycle/1 defect). Delivery data (ph_*) is rich.
**Unknown:** Is real test execution data coming (seed/import/usage), or is reporting designed against future data? Determines whether Phase-8 wiring shows anything.
**Blocks:** acceptance expectations.

### Q-006 | Sprint vs iteration
**Found:** `iterations` table EMPTY; live = `ph_jira_sprints`.
**Unknown:** Confirm sprint == iteration, ph_jira_sprints is the one.
**Recommendation (only):** treat ph_jira_sprints as the sprint/iteration source; iterations is dead.

---

## OPEN — non-blocking (defer)
- Status mappings per object (STATUS_MAPPING) — needed before governance/readiness.
- Date sources (DATE_SOURCES) — needed before any trend/burndown.
- QA-team derivation rule (D13) — needed before team report.

## ANSWERED
- (process) New feature vs continue lab → new feature. See DECISION_LOG D-000.

---

## OPEN — surfaced in 2nd probe (2026-06-27)

### Q-007 | Defect & Incident reporting source
**Found:** Real defects = `ph_issues` issue_type='QA Bug' (788) + 'Defect' (3). Real incidents = issue_type='Production Incident' (152). `tm_defects` = 1 (test-linked model). Standalone defects/incidents tables = 0.
**Unknown:** Defect/Incident reports read from ph_issues (real volume) vs tm_defects (test-linked) vs both?
**Why:** D-001 set tm_* as test schema, but the real defect/incident data is in ph_issues.
**Options:** A. ph_issues for volume + tm_defects for test-linked detail (hybrid) · B. ph_issues only · C. tm_defects only (needs seeding).
**Blocks:** Defects & Incidents report group (taxonomy B1), seed plan defect rows.

### Q-004 | Coverage denominator (still open)
Coverage % = covered ÷ ? → stories (ph_issues Story=683) / requirements / test cases / executions. Blocks all coverage formulas.
