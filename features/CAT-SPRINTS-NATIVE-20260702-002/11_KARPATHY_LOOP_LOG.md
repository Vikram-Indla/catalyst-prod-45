# CAT-SPRINTS-NATIVE-20260702-002 — Karpathy Loop Log

> Karpathy Loop for Catalyst means Hypothesis → Experiment → Measure → Keep/Discard → Log.
> Log every loop entry here before moving to the next experiment.
> See protocol: docs/ways-of-working/CATALYST_KARPATHY_LOOP.md

---

## Loop entries

## [LOOP-001] sprint_iteration field exists?

**Date:** 2026-07-02
**Phase:** Discovery
**Hypothesis:** A `sprint_iteration` column exists under projects (JK's brief references it).
**Experiment:** Repo-wide grep (src + supabase migrations) for sprint_iteration/sprintIteration.
**Evidence:** Zero hits. "Sprint/Iteration" is a UI label over three different stores: sprint_id FK, ph_issues.sprint_release JSONB, ph_issues.sprint_name text.
**Decision:** DISCARD (the assumption); KEEP the finding.
**Reason:** Requirements were written against an imagined schema; wiring target is the FK.
**Next step:** D-002 — consolidate membership on sprint_id.

## [LOOP-002] Sprint UI is its own module?

**Date:** 2026-07-02
**Phase:** Discovery
**Hypothesis:** Sprints have dedicated pages/components to redesign.
**Experiment:** Read SprintsPage/SprintDetailPage/SprintCreateModal + entity-hub config.
**Evidence:** Everything is shared release components driven by SPRINT_CONFIG (src/lib/entity-hub/config.ts). List table is ReleasesTable (hand-rolled <table>), not JiraTable.
**Decision:** KEEP.
**Reason:** Redesign lands in config extension + shared components (upgrades releases/milestones too) + a JiraTable migration for the list.
**Next step:** A4 defines config extension contract; A1 verifies JiraTable API gaps.

## [LOOP-003] ph_jira_sprints has slug/deleted_at (hook assumes both)

**Date:** 2026-07-02
**Phase:** Discovery
**Hypothesis:** useSprintBySlug's selected columns exist in the DB.
**Experiment:** information_schema probe blocked on MCP-connected prod project; PostgREST probe against app DB (cyijbdeuehohvhnsywig) with anon key.
**Evidence:** slug EXISTS on staging (out-of-band patch, in no migration); deleted_at DOES NOT EXIST. Bonus: prod project (lmqwtldpfacrrlvdnmld) has NO ph_jira_sprints table at all.
**Decision:** KEEP.
**Reason:** Hook is querying a missing column; schema drift between envs is a RED-FLAG-grade finding.
**Next step:** S0.1 codifies slug in a migration + adds deleted_at (or drops the filter); env-drift raised in Plan Lock stop conditions.

## [LOOP-004] Transition history usable for analytics?

**Date:** 2026-07-02
**Phase:** Discovery
**Hypothesis:** work_item_transitions/catalyst_status_history/work_item_changelogs are empty (prior session knowledge).
**Experiment:** PostgREST count probes on staging.
**Evidence:** transitions=2,085 (1,278 with dwell ms) — backfill HAS run; native rows (jira_changelog_id NULL)=0; changelogs=3,054 but field_name='sprint'=0; status_history=0.
**Decision:** KEEP (partially revises prior knowledge).
**Reason:** Jira-side backfill partially proven; Catalyst-native writes don't exist; sprint membership history not retroactive.
**Next step:** New required slice: native transition write path. Late-add tracking instrumented forward-only. D-007 gates hold.

## [LOOP-005] Jira layout probe (structure/typography only per D-001)

**Date:** 2026-07-02
**Phase:** Discovery
**Hypothesis:** Jira's release list/detail structure offers layout patterns worth adopting.
**Experiment:** Chrome MCP DOM probe, 12+ interactions on digital-transformation.atlassian.net BAU versions.
**Evidence:** Overdue dates in danger text; contextual inline quick-action on eligible rows; multi-select status filter (default hides archived); status control = action verbs; work-items row → embedded side panel with colored status dropdown; release notes = grouped-by-type modal; AI summary = uncached Rovo drawer (Catalyst's cached inline card is ahead); create modal = name*, dates, person picker, description (no project field).
**Decision:** KEEP structure; DISCARD vocabulary (D-001: "Owner" not "Driver").
**Next step:** A3 critic translates into ADS tokens/typography; wireframes in 05_UI_UX_REVIEW.md.

## [LOOP-006] Are 26 existing sprints safe to purge?

**Date:** 2026-07-02
**Phase:** Discovery
**Hypothesis:** Existing ph_jira_sprints rows are dead Jira imports.
**Experiment:** Status distribution probe on staging.
**Evidence:** 25 released + 1 archived, 0 active/planning; names in legacy convention ("Sprint2.8 - 03 Jul 2025").
**Decision:** KEEP.
**Reason:** Nothing in-flight; soft-delete via deleted_at is safe pending A5's reference check (approvers/name-links).
**Next step:** S0.4 purge slice after A5 report.

### Format

```
## [LOOP-NNN] <Short description>

**Date:** YYYY-MM-DD
**Phase:** Discovery | Implementation | Validation
**Hypothesis:** [What you expected to be true]
**Experiment:** [Exact probe run]
**Evidence:** [What you found]
**Decision:** KEEP | DISCARD
**Reason:** [Why — 1-2 sentences]
**Next step:** [What to do with this result]
```
