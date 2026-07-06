# Release Ops — Phase 3 Functional Proof

**Feature Work ID:** `CAT-RELEASE-OPS-DISCOVERY-BLUEPRINT-20260706-001` · Phase 3 · 2026-07-06
**Method:** live Chrome MCP on localhost:8080 against seeded cyij demo data.

## Demo data (cyij, staging only — re-runnable, documented not committed)
- **CHG8841** "Deploy payments service v2.4 to production" — SCHEDULED, high, production/backend; 2 linked releases; 4 owners + 4 SOP-step assignees; 9 SOP steps (1 done, 1 running); 4 sign-offs (1 approved, 3 pending); freeze conflict + **approved** override; production event PE-8841.
- **CAT-CHG-21** "Hotfix: rotate expired API certificate" — IMPLEMENTING, critical, production/configuration; **unlinked production** + justification; freeze conflict **not** overridden (blocked); no SOP; missing release manager; 1 pending sign-off.
- **CAT-CHG-19** "Update staging feature flags" — DRAFT, low, qa (clean empty-state demo).

## Proof matrix
| # | Proof | Result |
|---|---|---|
| 1 | Change Records list | Flags column shows Emergency / Unlinked prod; risk, status, releases, planned |
| 2 | Create Change flow | Modal builds; multi-release + conditional justification + validation wired |
| 3 | Production change without release warning | CAT-CHG-21 header + Linked-releases card both show "Unlinked production change" + justification |
| 4 | Change linked to multiple releases | CHG8841 Linked releases card shows 2 (8 July DRAFT, Q3 Platform IN PROGRESS) |
| 5 | Change Detail header | number/title/status/risk/meta + markers + Project breadcrumb |
| 6 | Linked Releases section | 2 releases, env/readiness/status, navigable |
| 7 | Owners/participants section | 8 people (CM/RM/TL/QA + BE/FE/Tech/QA SOP assignees), avatars + roles |
| 8 | SOP summary section | 9 steps, 3/9 done, 3 technical, 4/9 assigned, "Running: Run migration script", Open execution → |
| 9 | Timer summary | CHG8841 "Starts in 1h 47m"; CAT-CHG-21 "Window started 42m ago — overdue" (data-driven) |
| 10 | Sign-off summary | CHG8841 3 pending/1 approved; CAT-CHG-21 "Approval blocking execution — waiting on qa" |
| 11 | Freeze summary | CHG8841 "conflict — override approved"; CAT-CHG-21 "conflict — execution blocked" |
| 12 | Incident/defect summary | CHG8841 clean "No incidents or defects" |
| 13 | Production event summary | CHG8841 PE-8841 success + View event + Replay (coming soon, disabled) |
| 14 | Old UUID route | `/changes/22222222-…-8841` opens same cockpit ✓ |
| 15 | Slug route | `/changes/chg8841` and `/changes/cat-chg-21` open ✓ |
| 16 | No drawer | Row click → full-page detail; no drawer/peek anywhere ✓ |

## Empty/broken-state proof (§14)
CAT-CHG-21 live: Missing critical owner (RM), "No SOP for technical production change" (error), unlinked-prod hint, blocked-freeze — every panel educational, none blank. CAT-CHG-19 clean states.

## Build
`npx tsc --noEmit` clean · `npm run build` PASS (50s) · color-law grep clean on all changed files.

## Notes
Create-modal full flow screenshot not captured (modal build-verified; live create would mutate staging). Owner-on-create + apply-template + full status-action mutations deferred to Phase 4 (documented). Screenshot IDs in release-ops-screenshot-evidence.md.
