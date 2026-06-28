# CAT-VERSIONED-CANONICAL-WORKFLOW-20260628-001 — Karpathy Loop Log

> Karpathy Loop for Catalyst means Hypothesis → Experiment → Measure → Keep/Discard → Log.
> Log every loop entry here before moving to the next experiment.
> See protocol: docs/ways-of-working/CATALYST_KARPATHY_LOOP.md

---

## Loop entries

## [LOOP-001] Extend ph_workflow_* vs new engine
**Date:** 2026-06-28
**Phase:** Discovery
**Hypothesis:** Extending ph_workflow_* is safer/lower-risk than a second engine.
**Experiment:** 7-agent discovery fan-out over types.ts + migrations + src.
**Evidence:** ph_workflow_* already has project scoping, category CHECK, templates, live admin builder; ph_issues.status is intentionally workflow-driven. A separate engine would orphan all of it.
**Decision:** KEEP
**Reason:** Lowest migration risk; reuses existing consumers.
**Next step:** Add ph_wf_* version/scheme/guard layer on top (P0).

## [LOOP-002] Migration FK/helper targets exist on staging
**Date:** 2026-06-28
**Phase:** Validation
**Hypothesis:** All FK + ph_wf_is_admin() targets exist on staging cyij.
**Experiment:** grep staging snapshot (types.ts) for ph_workflow_templates, ph_projects, profiles, user_roles(app_role), user_product_roles(role_id), product_roles(code), app_role enum.
**Evidence:** ALL FOUND.
**Decision:** KEEP
**Reason:** Migration FKs + admin helper resolve; safe to apply.
**Next step:** Hand to PO for Supabase Studio apply.

## [LOOP-003] Migration is additive / non-destructive
**Date:** 2026-06-28
**Phase:** Validation
**Hypothesis:** P0 migration drops/alters nothing existing.
**Experiment:** Static safety scan of the .sql file.
**Evidence:** 0 DROP TABLE (existing), 0 ALTER TYPE, 0 DROP COLUMN, 0 ALTER TABLE (existing), 0 lmqw, 13 CREATE TABLE IF NOT EXISTS.
**Decision:** KEEP
**Reason:** Additive + idempotent → safe re-apply, safe rollback.
**Next step:** Apply on staging, verify V1–V5.

[Further entries appended during implementation]

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
