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
