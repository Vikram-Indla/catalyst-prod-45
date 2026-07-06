# Release Ops — Phase 6 Functional Proof

**Feature Work ID:** `CAT-RELEASE-OPS-DISCOVERY-BLUEPRINT-20260706-001` · Phase 6 · 2026-07-06
**Method:** live Chrome MCP on localhost:8080 against seeded cyij (existing CHG8841/CAT-CHG-21/CAT-CHG-19 + releases 8 July, Q3 Platform).

## Proof matrix
| # | Proof | Result |
|---|---|---|
| 1 | Release timeline default | 2 releases with markers + scope counts |
| 2 | Product visible on timeline | "No product" marker shown (releases lack product_id) |
| 3–6 | Expanded release BRs/sprints/work/changes | 8 July expansion: BRs(0) + Sprints(0) educational empties + Changes(1) CHG8841 EMERGENCY/HIGH/SOP 2/9/SCHEDULED |
| 7 | Product lens | group-by Product available |
| 8 | Environment lens | group-by Environment available |
| 9 | Planning calendar month/quarter | existing ReleaseCalendarPage retained (/calendar) |
| 10 | Freeze window on calendar | existing calendar freeze lane |
| 11 | Production event on calendar | existing calendar prod lane |
| 12 | Execution calendar day view | hourly slots 06:00–08:00 for CHG8841 |
| 13 | Execution calendar week view | Week toggle → 7 day columns |
| 14 | Hourly SOP slot | #51 Run DB migration at 07:00 |
| 15 | Running SOP slot | #50 Deploy backend "● LIVE" |
| 16 | Overdue SOP slot | #52 Deploy frontend "LATE" (red border) |
| 17 | Blocked/failed slot | status-toned border (danger for blocked/failed) |
| 18 | My steps view | scope lens "My steps" |
| 19 | Managed changes view | scope lens "Managed" |
| 20 | Change execution board | lanes Draft…Closed + Failed/Rolled-back + Cancelled |
| 21 | Board card detail | CHG8841 card: HIGH, production, EMERGENCY, 2 releases, SOP 2/9, Appr 1/4 |
| 22 | Invalid board transition blocked | useUpdateChangeStatus → validateChangeTransition throws → toast (build-verified; terminal lanes require reason modal) |
| 23 | Card click → full Change Detail | card onClick navigates to /release-hub/changes/:slug |
| 24 | No drawer | board/timeline/execution inline; only board terminal-reason ads/Modal |

## Cross-view consistency (§10)
CHG8841 is consistent everywhere: SCHEDULED lane on the board, its 4 SOP steps as execution-calendar slots (LIVE/LATE), SOP 2/9 in the timeline expansion, and the same runbook on Change Detail — all from one rh_sop_steps / rh_changes source with shared query-key invalidation.

## Build
`npx tsc --noEmit` clean · `npm run build` PASS (57s) · color-law grep clean on all changed files.

## Notes
Timeline `business_requests` has only `title` and `anchor_sprints` has no `status` on cyij — expansion selects were narrowed accordingly (documented). Board drag rejection + terminal-reason modal build-verified (a live invalid drag would require an invalid target on seeded data). Screenshot IDs in release-ops-screenshot-evidence.md.
