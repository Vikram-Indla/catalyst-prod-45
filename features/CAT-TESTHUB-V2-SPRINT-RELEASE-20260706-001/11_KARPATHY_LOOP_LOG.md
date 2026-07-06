# CAT-TESTHUB-V2-SPRINT-RELEASE-20260706-001 — Karpathy Loop Log

> Karpathy Loop for Catalyst means Hypothesis → Experiment → Measure → Keep/Discard → Log.
> Log every loop entry here before moving to the next experiment.
> See protocol: docs/ways-of-working/CATALYST_KARPATHY_LOOP.md

---

## Loop entries

## [LOOP-001] Existing tm_* schema covers most of V2 object model

**Date:** 2026-07-06
**Phase:** Discovery
**Hypothesis:** TestHub rebuild needs a mostly-new data model.
**Experiment:** Data/Safety Guard agent audit of supabase/migrations + generated types vs V2 locked object model.
**Evidence:** ~70% exists — versions (tm_test_case_versions + snapshot RPCs), plan refs (tm_test_plan_cases exact fit), plan lock (tm_plan_versions + auto-snapshot trigger), scope version-lock (tm_cycle_scope.locked_version BEFORE INSERT trigger), step results, release gates (tm_release_quality_gates/readiness/signoffs/gate_evaluation_history), AI audit (tm_ai_usage_log). Missing: variance table, sprint health snapshot, execution/cycle split, origin col, folder_type + auto-provision, DB-enforced immutability + draft-not-executable, hold status.
**Decision:** KEEP — extend tm_*, do not greenfield.
**Reason:** Greenfield = regression ban violation + weeks of migration risk; gaps are additive.
**Next step:** Plan Lock phases target additive migrations only; hardening triggers for immutability.

## [LOOP-002] Sprint/Release integration points already exist

**Date:** 2026-07-06
**Phase:** Discovery
**Hypothesis:** Sprint and Release surfaces need new detail pages for test health.
**Experiment:** Screen discovery + integration architect mapping of SprintDetailPage, ReleaseDetailPage, ChangeDetailPage, quality-gate hooks.
**Evidence:** SprintDetailPage = canonical ReleaseDetailPage + SPRINT_CONFIG (config-driven sections); rh_readiness_checks (release_id+check_key) is a ready-made gate plug-in; useEvaluateQualityGates already invalidates ['release-readiness']; tm_* tables already carry sprint_id → ph_jira_sprints; sprint signoff infra exists (ph_sprint_approvers + ph_sprint_dod).
**Decision:** KEEP — mount new sections into existing config-driven pages; no new sprint/release pages.
**Reason:** Canonical-first; zero route churn.
**Next step:** SprintTestHealthSection + ReleaseTestReadinessSection as sections, gates wired to existing evaluation infra.

## [LOOP-003] Side-drawer ban has exactly one hard violation

**Date:** 2026-07-06
**Phase:** Discovery
**Hypothesis:** TestHub is riddled with banned drawers.
**Experiment:** UI/UX Critic grep + read of all 18 surfaces.
**Evidence:** One true violation: CycleDetailPage RightPanel (fixed 480px, ×3 uses: defect create/comments/evidence). Repository authoring uses panelMode (canonical component, wrong mode). AddToCycleSetSheet/ReportFormulaDrawer are misnamed modal/popover.
**Decision:** KEEP finding — move drawer flows onto full-page run surface; switch case authoring to fullPageMode route.
**Reason:** DefectDetailPage already proves fullPageMode pattern — cheap, canonical.
**Next step:** Slice in Phase C/F of plan.

## [LOOP-004] Repository table gap is half UI-only

**Date:** 2026-07-06
**Phase:** Discovery
**Hypothesis:** 13-column repository table needs schema work throughout.
**Experiment:** Critic column-by-column audit vs TMTestCase type.
**Evidence:** 4 full + 1 partial exist; 4 columns are pure UI adds (origin/sprint/designer/updated — data already fetched); 4 need joins/schema (health, parent, release display, open defects).
**Decision:** KEEP — split into UI-only slice + join slice.
**Reason:** Fast visible win before schema work.
**Next step:** Ordered slices in Plan Lock.

## [LOOP-005] Release model must be decided before gates wiring

**Date:** 2026-07-06
**Phase:** Discovery
**Hypothesis:** One release table serves all.
**Experiment:** Data guard + integration cross-check.
**Evidence:** THREE models: `releases` (tm_* FKs + QA counters today), `rh_releases` (Release Ops cockpit, readiness_pct, rh_release_test_cycle_links→tm_test_cycles bridge exists), `ph_releases` (ph_jira_sprints.release_id). rh_release_sprints targets anchor_sprints (inconsistent with tm's ph_jira_sprints).
**Decision:** DISCARD assumption — open decision for Vikram in Plan Lock (recommend rh_releases as release plane, releases as legacy read).
**Reason:** Wrong pick = split-brain readiness numbers; CLAUDE.md: conflicts → stop and ask.
**Next step:** Decision D-001 in 09_DECISIONS.md; blocks Phase G release slices only.

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
