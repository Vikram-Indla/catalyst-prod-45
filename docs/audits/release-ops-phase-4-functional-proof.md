# Release Ops — Phase 4 Functional Proof

**Feature Work ID:** `CAT-RELEASE-OPS-DISCOVERY-BLUEPRINT-20260706-001` · Phase 4 · 2026-07-06
**Method:** live Chrome MCP on localhost:8080 against seeded cyij demo data.

## Demo data (cyij, staging only — re-runnable, not committed)
- Template `cccc0000-…-01` "Standard production backend deploy" — active, backend/production, est 120m, 6 steps (5 mandatory, 3 technical, 4 evidence-required, 1 rollback) with offsets/durations.
- CHG8841 runbook: 9 SOP steps (5 base + 4 rich demo dddd0000-…-a1..a4) — mixed done/in-progress/pending, commit/evidence indicators, assignees, planned times.

## Proof matrix
| # | Proof | Result |
|---|---|---|
| 1 | SOP Template list | rich counts (`6 · 5 mand · 3 tech · 4 ev · 1 rb`), est duration, filters, search |
| 2 | Create SOP Template | modal: template fields + full step editor + flags + reorder (build-verified) |
| 3 | Edit SOP Template | row-click / Edit opens populated modal (build-verified) |
| 4 | Template step list | step editor rows with type/role/offset/duration/flags |
| 5 | Reordered steps | up/down move recomputes sequence on save |
| 6 | Template detail/preview | Apply modal previews generated steps + timing |
| 7 | Apply SOP Template to Change | "Apply SOP template" → select active + preview + append/replace |
| 8 | Generated SOP steps | apply copies fields + computes planned times; summary updates |
| 9 | SOP Execution runbook | summary (9 steps, 3/9 done, 1 missing-commit, 3 missing-evidence, 5 unassigned) + step list |
| 10 | Step expanded detail | planned vs actual, commits (DB `e4f5g6h`), repo/branch/command, actual result |
| 11 | Step assignment | per-step assignee picker (Ahmed Yousry) + avatar |
| 12 | Step start action | Start/Mark done/Block/Fail/Skip/Resume/Reopen by state |
| 13 | Running step with timer | "0m elapsed" / "28m" / "in 2h 22m" step-level timer; "Running: #3" |
| 14 | Commit-required validation | done blocked without commit (useSopStepAction throws → toast) |
| 15 | Evidence-required validation | done blocked without evidence |
| 16 | Blocked step with reason | reason required to block (validation) |
| 17 | Failed step with reason | reason required to fail |
| 18 | Rollback step visible | rollback rendered amber + Rollback indicator |
| 19 | Change Detail SOP summary updated | cockpit SOP card reads live runbook; Open execution → SOP tab |
| 20 | No drawer | runbook is inline in the SOP tab; template create/edit + apply are ads/Modal |

## Notable live signals
- **Data-quality warning** "multiple steps in progress" fired (2 steps in_progress) — real detection, not faked.
- Step indicators COMMIT / EVIDENCE render per requirement; unassigned base steps flagged.
- Screenshot IDs in release-ops-screenshot-evidence.md.

## Build
`npx tsc --noEmit` clean · `npm run build` PASS (57s) · color-law grep clean on all changed files.

## Notes
Validation error paths (missing commit/evidence, missing reason) are enforced in `useSopStepAction` and surfaced via catalystToast; verified by code + build, not separately screenshotted (would require mutating staging into an invalid attempt). Template create/edit + apply modals build-verified; runbook + template list captured live.
