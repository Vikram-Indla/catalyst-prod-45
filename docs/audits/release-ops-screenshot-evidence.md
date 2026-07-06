# Release Ops — Screenshot Evidence

**Feature Work ID:** `CAT-RELEASE-OPS-DISCOVERY-BLUEPRINT-20260706-001`
**Capture tool:** Chrome MCP (localhost:8080), 1456×829 · **Date:** 2026-07-06

> Chrome MCP screenshots render inline in the session transcript; the extension does not expose a stable filesystem path, so each proof is recorded by MCP screenshot ID + what it demonstrates. Re-capture to `docs/audits/p0-screenshots/` once staging is seeded (see gaps).

| # | Proof | Route | MCP ID | Result |
|---|---|---|---|---|
| 1 | Release Ops sidebar | /release-hub/calendar | ss_78846zei0 | Release Operations nav rail renders (Overview/Releases/Board/Work/Timeline/Calendar/Change Records/SOP/Sign-off/Freeze/Production) |
| 2 | Releases list (L1) | /release-hub/releases-management | ss_03569u4pz | JiraTable list; breadcrumb "Releases / Releases" (project L1, no trail); no drawer |
| 3 | Release detail (L2) + full-page nav proof | /release-hub/releases-management/investor-journey | ss_5764yuc01 | Full-page detail after row click; breadcrumb "Releases / Releases / Investor Journey" (project L2 trail); inline sidebar, NOT overlay drawer |
| 4 | Change Records list (L1) | /release-hub/changes | ss_0894nmkpe | Breadcrumb "Releases / Changes"; empty state (0 rows on staging) |
| 5 | Drawer-no-longer-opens proof | releases list → detail | (see #3) | Row click changed URL to full-page detail; no side panel appeared |

## Gaps (staging seed limitation — not a code failure)

- **Change detail breadcrumb (live):** staging cyij has 0 change rows → no row to open. Breadcrumb verified in code (`ChangeDetailPage.tsx:136–144`, trail → `/release-hub/changes`).
- **Sprint prediction modal (live):** no sprint bands in the current month under Project lens → modal not triggerable. Modal verified in code + build (`ReleaseCalendarPage.tsx`, `ads/Modal`).
- **Legacy change redirect:** n/a — `:changeSlug` route intentionally not created (no slug column yet, D-004 deferred). `:changeId` remains canonical; existing deep links unbroken.

Close these by seeding a change + a sprint band on cyij, then re-capturing #6 (change detail), #7 (sprint modal preview), and confirming no drawer opens from the changes list row-click.

## Phase 3 — Change Cockpit (2026-07-06, cyij seeded demo)
| # | Proof | Route | MCP ID | Result |
|---|---|---|---|---|
| P3-1 | Change list with Flags | /release-hub/changes | ss_2318yjjsm | Emergency / Unlinked-prod flags, risk, releases columns |
| P3-2 | CHG8841 cockpit (top) | /release-hub/changes/chg8841 | ss_5037vh3dq | breadcrumb + Emergency-override marker + live timer "Starts in 1h 48m" + tracker + 4 cockpit cards |
| P3-3 | CHG8841 cockpit (sections) | /release-hub/changes/chg8841 | (scroll) | Freeze "override approved", Incidents clean, Prod event PE-8841 + Replay-disabled |
| P3-4 | Legacy UUID route | /release-hub/changes/22222222-…-8841 | ss_50163mjf4 | same cockpit — deep link safe |
| P3-5 | Unlinked-prod cockpit | /release-hub/changes/cat-chg-21 | ss_6463b1v8v | Freeze "execution blocked" + Unlinked-prod + justification + timer "overdue" + educational empty/broken states |

No-drawer proof: row click navigates to full-page detail (URL change); no drawer/peek rendered. Slug + UUID both resolve. Demo data is staging-only (cyij), documented in release-ops-phase-3-functional-proof.md, not committed as a migration.

## Phase 4 — SOP Templates + Execution Runbook (2026-07-06, cyij seeded)
| # | Proof | Route | MCP ID | Result |
|---|---|---|---|---|
| P4-1 | SOP Template list | /release-hub/sop-templates | ss_9362hwlwo | rich counts (5 mand·3 tech·4 ev·1 rb), est 120m, filters, search |
| P4-2 | SOP runbook summary | /release-hub/changes/chg8841 (SOP tab) | ss_7727yo9g4 | 9 steps, 3/9 done, 1 missing-commit, 3 missing-evidence, 5 unassigned, "multiple in progress" warning, running #3 |
| P4-3 | Runbook step list | (scroll) | — | indicators COMMIT/EVIDENCE, assignees, planned times, step timer, statuses |
| P4-4 | Step expanded (actions) | (expand #51) | — | planned/actual + DB commit e4f5g6h, assignee picker, commit/evidence/actual capture, Mark done/Block/Fail, reorder ↑↓ |

No-drawer proof: runbook is inline in the SOP tab; template create/edit + apply are ads/Modal (centered), no side panel. Demo (template cccc0000-…-01, steps dddd0000-…-a1..a4) is staging-only, documented in release-ops-phase-4-functional-proof.md.

## Phase 5 — For You SOP cards + prompts (2026-07-06, cyij seeded, user vikramataol@gmail.com)
| # | Proof | Route | MCP ID | Result |
|---|---|---|---|---|
| P5-1 | For You Change-execution section | /for-you | ss_3515q4rso | prompts (overdue/emergency/missing-capture) + day-of-change (CHG8841 running, CAT-CHG-21 CHANGE MANAGER) |
| P5-2 | Assigned SOP step cards | /for-you (scroll) | (scroll of ss_3515q4rso) | #52 OVERDUE, #50 RUNNING 15m left + capture, #51/#53 UPCOMING; MISSING COMMIT/EVIDENCE chips; Changes-you-manage |
| P5-3 | For You action validation | /for-you | ss_3692x7626 | "Mark done" on running step missing commit → toast "This step requires a commit ID before it can be marked done" |

No-drawer proof: section is inline cards + toasts; no side panel. Live page = ForYouPage.atlaskit.tsx. Demo assignments (owner_id 6bbd0863 on 4 CHG8841 steps + CAT-CHG-21 manager) are staging-only, documented in release-ops-phase-5-functional-proof.md.
