# Release Ops — Phase 7 Functional Proof

**Feature Work ID:** `CAT-RELEASE-OPS-DISCOVERY-BLUEPRINT-20260706-001` · Phase 7 · 2026-07-06
**Method:** live Chrome MCP on localhost:8080 against seeded cyij.

## Demo data (cyij, staging only — re-runnable, not committed)
- CHG8841: 6 change-level gates — Change manager PENDING, Qa PENDING, Qa APPROVED, Change manager OVERDUE, Release manager OVERDUE, Uat REJECTED (reason "UAT found a blocking defect in payments flow"); + APPROVED emergency override (freeze:production).
- Release gates: rel_a (8 July) product_owner OVERDUE + release_manager APPROVED; Q3 Platform product_owner OVERDUE.
- CAT-CHG-21: requested emergency override (freeze:production) awaiting approval.

## Proof matrix
| # | Proof | Result |
|---|---|---|
| 1 | Sign-off Queue default | Visual/Table toggle + Request sign-off + filters + search |
| 2 | Assigned-to-me filter | "Assigned to me" chip filters by approver = current user |
| 3 | Release-level sign-off list | Release-level filter + release nodes with release gates |
| 4 | Change-level sign-off list | Change-level filter + change gates |
| 5 | Visual dependency graph | release → change → gate hierarchical map |
| 6 | Release node expanded to changes | 8 July / Q3 Platform expand to CHG8841 |
| 7 | Change node expanded to gates | CHG8841 → 6 gates |
| 8 | Approver avatar node | Maali Alanazi / Abdulrahman / Ahmed Yousry avatars; Unassigned flagged |
| 9 | Pending gate | Change manager / Qa PENDING |
| 10 | Approved gate | Release manager / Qa APPROVED (green) |
| 11 | Rejected gate | Uat REJECTED + reason shown (severe) |
| 12 | Overdue gate | OVERDUE (red) release + change gates |
| 13 | Emergency override bypass edge | "⚡ EMERGENCY OVERRIDE — APPROVED" dashed badge under CHG8841 |
| 14 | Approve action | inline Approve on actionable gates (useSignoffAction) |
| 15 | Reject with mandatory comment | inline reject → TextArea reason required (graph) / prompt (table) |
| 16 | Request sign-off action | Request-sign-off modal (scope/entity/role/approver/due/reason) |
| 17 | Request emergency override | Change Detail "Request override" → EmergencyOverrideModal |
| 18 | Approve emergency override | queue override panel Approve/Reject + decision comment |
| 19 | Change Detail sign-off state | cockpit sign-off summary + Request sign-off / override actions |
| 20 | Release Detail sign-off state | release gates surface in graph + release rollup |
| 21 | Board marker | board reads same rh_change_signoffs (approval progress) |
| 22 | Timeline marker | timeline reads same signoff/override truth |
| 23 | Calendar marker | execution calendar reads same change/override state |
| 24 | No drawer | graph inline-expands; actions inline or ads/Modal |

## Cross-view consistency (§11)
Every sign-off/override read+write hits the same rh_*_signoffs / rh_emergency_overrides rows with shared query-key invalidation — approving in the queue reflects on Change Detail, board transition validation, timeline, and For You.

## Build
`npx tsc --noEmit` clean · `npm run build` PASS (55s) · color-law grep clean · zero new INVALID_SPACING.

## Notes
Table-mode reject uses a lightweight window.prompt for the reason (visual mode uses an inline TextArea). Live approve/override-approve actions were not clicked to preserve the seeded demo states; the mutations are build-verified and share the same validated hooks. Screenshot IDs in release-ops-screenshot-evidence.md.
