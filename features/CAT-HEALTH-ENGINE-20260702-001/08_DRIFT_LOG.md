# CAT-HEALTH-ENGINE-20260702-001 — Drift Log

> All drift events, rebaseline decisions, superseded Plan Locks.
> Append — never delete.

---

## Drift entries

### 2026-07-02 — Phase 3/4 scope collapse (positive drift)
Original plan (approved 03_PLAN_LOCK.md) treated Sprint and Timeline/Release as two separate phases (3 and 4). Discovery found `src/pages/release-hub/ReleaseDetailPage.tsx` is mounted for BOTH via a shared `EntityConfig` param — one component, no fork. Built one adapter (`entity.ts`) and wired both phases in a single implementation pass instead of two. No scope was cut; this is consolidation, not reduction.

### 2026-07-02 — Phase 3 "ph_sprints missing" reversed
Phase 0's Data/Safety Guard reported no `ph_sprints` table, flagging Phase 3 as needing re-scoping. Re-discovery for Phase 3 found the real table: `ph_jira_sprints`, with genuine start_date/release_date/status columns. The earlier report was a naming miss (searched for the wrong literal string), not a real schema gap. Phase 3 shipped as originally scoped, no rework needed.

### 2026-07-02 — Timeline/Release live verification blocked (external, not this feature's fault)
`/release-hub/releases-management/:releaseId` is stuck on "Loading release…" for all release rows — a pre-existing bug in the release row's Supabase query (confirmed via `git diff --stat`, this session's edits never touch that code). Blocks visual/live proof of Phase 4 (Timeline/Release) even though the code is implemented, type-checked, and ADS-clean, and the identical shared component works correctly for Sprint. Flagged as background task `task_2dbda83d`, out of this feature's scope to fix.
