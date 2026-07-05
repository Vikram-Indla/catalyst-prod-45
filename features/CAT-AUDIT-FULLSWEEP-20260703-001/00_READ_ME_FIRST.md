# CAT-AUDIT-FULLSWEEP-20260703-001 — Catalyst Full-Sweep Audit

**Type:** Audit-first engagement. NO code fixes in this feature until per-PR approval.
**Approved scope (2026-07-03, "proceed" on consent gate):** run full audit + prepare PR-by-PR fix plans; do not change code; return for approval before each PR.

## Read order for continuation sessions
1. `01_OBJECTIVE.md`
2. `03_PLAN_LOCK.md`
3. `07_HANDOVER.md`
4. `08_DRIFT_LOG.md`
5. `09_DECISIONS.md`
6. `lanes/` — per-lane findings (LANE-01 … LANE-14)
7. `MASTER_AUDIT_REPORT.md` — consolidated report

## Hard rules
- No modifications to `src/`, `scripts/`, configs, migrations, or baselines.
- The pre-existing dirty file `features/CAT-SPRINTS-NATIVE-20260702-002/03_PLAN_LOCK.md` is foreign — never stage it.
- All tooling scratch output goes to the session scratchpad, not the repo.
- No Supabase `--linked` commands, no DB contact, no prod/staging writes.
