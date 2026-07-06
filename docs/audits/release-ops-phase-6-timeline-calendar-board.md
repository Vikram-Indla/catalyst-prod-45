# Release Ops — Phase 6: Timeline, Execution Calendar, Change Board

**Feature Work ID:** `CAT-RELEASE-OPS-DISCOVERY-BLUEPRINT-20260706-001` · Phase 6
**Date:** 2026-07-06 · **DB:** staging cyij · **Build:** `tsc` clean · `npm run build` PASS. No drawers. No migration.
**Scope:** connect planning (timeline/planning calendar) and deployment execution (execution calendar/board) across Release Ops, consistent with Change Detail + For You.

## Files delivered
- `src/pages/releasehub/ChangeExecutionBoard.tsx` (new) — change-lifecycle board.
- `src/pages/releasehub/ExecutionCalendarPage.tsx` (new) — hourly SOP execution calendar.
- `src/pages/releasehub/ReleaseTimelineOps.tsx` (new) — rich expandable release roadmap.
- `src/hooks/useReleaseTimeline.ts` (new) — timeline list + lazy per-release expansion.
- `src/routes/FullAppRoutes.tsx` — routes `/release-hub/change-board`, `/release-hub/execution`; `/release-hub/timeline` → new timeline (canonical kept at `/timeline-canonical`).
- `src/components/layout/ReleaseHubSidebar.tsx` — nav: "Execution" (Releases), "Change Board" (Change Management).

## Release timeline (§2–§4)
Each release row: name (→ detail), version, product (or **No product** marker), env, status lozenge, planned release date, readiness %, and scope counts (BRs / sprints / work items / changes / incidents / prod events). Risk markers: emergency, freeze, **empty scope**, **no change (deployment gap)**, no product. **Expansion** (lazy) → Business Requests, Sprints (name + dates), and linked Changes (chg#, title, risk, emergency, SOP progress, status) — each clickable to full detail; every sub-section has an educational empty state. **Lenses:** group by Product / Environment / Status, "Risk only" filter, search. Verified live: 8 July + Q3 Platform with NO PRODUCT / EMERGENCY / EMPTY SCOPE markers; expansion shows CHG8841 (EMERGENCY/HIGH/SOP 2/9/SCHEDULED) + empty BR/sprint states.

## Planning calendar (§5)
The existing `ReleaseCalendarPage` (`/release-hub/calendar`) already provides month/quarter release planning with release/change/freeze/production lanes + product/project lens + today marker; retained as the planning calendar. Clicks route to full pages; no drawer.

## Execution calendar (§6–§7)
`/release-hub/execution`. **Day view** = hourly rows of SOP execution slots; **Week view** = 7 day columns. Scope lens **All / My steps / Managed** + date nav (prev / Today / next). Each slot: change#, step#, step title, assignee avatar (or Unassigned), env, commit/evidence requirement, emergency ⚡, and state — **● LIVE** for the running step, **LATE** for overdue, status-toned border. Real `rh_sop_steps.planned_start_at` schedule — no placeholders. Click → full Change Detail. Verified live: CHG8841 steps at 06:00 (#52 LATE, #50 LIVE), 07:00 (#51), 08:00 (#53). Educational empty state when no slots.

## Change execution board (§8–§9)
`/release-hub/change-board`. Lanes = the 9 `CHANGE_STAGES` (Draft…Closed) + **Failed / Rolled back** + **Cancelled**. Cards: chg#, risk, env, title, markers (unlinked-prod, emergency), release count / name, planned window, SOP + sign-off progress; high-risk cards get a danger border; click → full Change Detail. **Drag** validates via `useUpdateChangeStatus` (→ `validateChangeTransition`: stage order, freeze conflict, approval gating, production-SOP) — invalid drops rejected with a toast; **terminal lanes require a reason** (ads/Modal). Empty-lane states ("No changes in this stage"). Read-only for non-managers. Verified live: CAT-CHG-19 (Draft), CHG8841 (Scheduled, EMERGENCY), CAT-CHG-21 (Implementing, Unlinked prod).

## Cross-view consistency (§10)
Timeline, execution calendar, board, Change Detail, and For You all read the same `rh_*` tables and share React-Query keys, so a change/SOP update anywhere invalidates the others. CHG8841 reads consistently: SCHEDULED on the board, its SOP steps as execution slots, SOP 2/9 in the timeline expansion, and the same runbook on Change Detail. Actions (SOP from For You/Change Detail, status from board) mutate the single source row.

## Empty/broken states (§11)
Timeline: no releases, no product, empty scope, deployment gap, empty BR/sprint/change sub-sections. Board: empty lanes, no changes. Execution calendar: no slots this day/week; unassigned slots flagged. Each explains what/why/next.

## Deferred to Phase 7+
Sign-off dependency graph, incident creation modal, production event replay, training/admin manuals; plus execution-calendar drag-to-reschedule, release-manager/change-manager timeline lenses beyond product/env/status, and a dedicated hourly grid on the planning calendar.

## ADS compliance
Canonical only (JiraTable-style rows, StatusLozenge, CatalystAvatar, ads/Modal, @atlaskit select/textarea/button, Pragmatic DnD for the board). Zero bare colors (grep clean). No drawers — board/timeline/calendar are inline; the only modal is the board terminal-reason capture (centered ads/Modal).
