# Release Ops — Phase 5 Functional Proof

**Feature Work ID:** `CAT-RELEASE-OPS-DISCOVERY-BLUEPRINT-20260706-001` · Phase 5 · 2026-07-06
**Method:** live Chrome MCP on localhost:8080, logged in as vikramataol@gmail.com (uid 6bbd0863…), seeded cyij.

## Demo data (cyij, staging only — re-runnable, not committed)
- 4 CHG8841 SOP steps assigned to the logged-in user with varied states: #50 Deploy backend (RUNNING, missing commit+evidence), #51 Run DB migration (UPCOMING +35m), #52 Deploy frontend (OVERDUE), #53 Smoke test (UPCOMING, evidence-required).
- CAT-CHG-21 change_manager_id set to the logged-in user (manager + day-of-change).

## Proof matrix
| # | Proof | Result |
|---|---|---|
| 1 | For You with no SOP assignments | section self-hides when no involvement (clean empty state for assignees) |
| 2 | For You with assigned SOP step | "Change execution" section renders 4 assigned cards |
| 3 | Day-of-change card | TODAY CHG8841 (running #3, SOP 2/9) + TODAY CAT-CHG-21 (CHANGE MANAGER) |
| 4 | Upcoming SOP step countdown | #51 "Starts in 35m", #53 "Starts in 1h 55m" |
| 5 | Ready SOP step | pending w/ due timing → Start action |
| 6 | Running step with timer | #50 "15m left" |
| 7 | Overdue SOP step | #52 "Overdue 30m" (red) |
| 8 | Commit-required warning | #50 MISSING COMMIT chip |
| 9 | Evidence-required warning | #50/#51/#53 MISSING EVIDENCE chip |
| 10 | Add commit action | #50 running card commit input + Save |
| 11 | Add evidence action | #50 running card Evidence URL input + Save |
| 12 | Mark done validation | "Mark done" on #50 (missing commit) → toast "This step requires a commit ID before it can be marked done." |
| 13 | Blocked step with reason | Reason field + Block action (reason enforced by useSopStepAction) |
| 14 | Failed step with reason | Fail action (reason enforced) |
| 15 | Emergency override marker | EMERGENCY chip on all CHG8841 cards + "Emergency override active" prompt |
| 16 | Freeze conflict marker | FREEZE (OVERRIDE) on CHG8841, FREEZE BLOCK on CAT-CHG-21 |
| 17 | Manager view | "Changes you manage": CAT-CHG-21 (Change manager · Implementing · SOP 0/0) |
| 18 | Assignee view | 4 personal step cards with timers + actions |
| 19 | Change Detail sync | actions reuse useSopStepAction → shared query keys invalidated (sop-runbook/sop-steps/changes/my-execution) |
| 20 | No drawer | all inline cards + toasts; no side panel |

## Prompts (notification event model)
Live: "Your step is overdue" (error), "Emergency override active on this change" (warning, deduped per change), "Missing required commit/evidence near planned end" (warning). Each links to the change.

## Build
`npx tsc --noEmit` clean · `npm run build` PASS (54s) · color-law grep clean on changed files.

## Notes
Live page is `ForYouPage.atlaskit.tsx` (not the dead `ForYouPage.tsx`). Persisted/push notification delivery deferred; derived in-app prompts satisfy §7. Screenshot IDs in release-ops-screenshot-evidence.md.
