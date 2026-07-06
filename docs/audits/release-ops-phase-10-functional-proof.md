# Release Ops — Phase 10 Functional Proof (E2E + closeout)

**Feature Work ID:** `CAT-RELEASE-OPS-DISCOVERY-BLUEPRINT-20260706-001` · Phase 10 · 2026-07-06
**Method:** live Chrome MCP on localhost:8080 against seeded cyij; gates on the repo.

## E2E scenario (§3) — "Production deployment with SOP, sign-off, override, issue linkage, and replay"
Verified across phases on **CHG8841** (release 8 July + Q3 Platform):
BR/scope reconstructed on replay → Change linked to 2 releases → SOP template applied → 9 SOP steps generated + assigned → assigned steps appear in For You (P5) → release + change sign-offs requested (8 gates) → one Approved, one Rejected(+reason), several Overdue → emergency override requested + Approved → Change Board marker (SCHEDULED, EMERGENCY, SOP 2/9, ⚠) → Timeline marker → Execution Calendar hourly slots (LIVE/LATE + ⚠ issue badges) → SOP steps started/completed with commits + one blocked with reason → incident INC-154 + defect DEF-RO-8841 raised from steps → issues on Change Detail ledger + calendar ⚠ badges → production event PE-8841 generated/refreshable → full replay opened → Copy summary. Every link is full-page; no drawer.

## Phase 10 closures (§2)
| Item | Status | Evidence |
|---|---|---|
| Change-level prod-event generate/refresh | CLOSED | `useGenerateProductionEvent` + Change Detail "Generate/Refresh prod event" button (dup-safe by change_id; rebuilds snapshots) |
| Safer refresh action | CLOSED | manual generate/refresh (no risky auto-trigger) |
| Execution Calendar issue badges | CLOSED | slots #51/#53 show ⚠1 (ss_16317rbmo) |
| Reconstructed-scope labelling | CLOSED (P9) | replay "Reconstructed from current release links" |
| Copy/export replay summary | CLOSED (P9) | Copy summary button |
| For-You issue action | CLOSED (via View change) | For You SOP card → View change → issue ledger/raise |
| Release-level roll-up / stored snapshot enrichment / incident-defect detail context panel / PDF / per-approver authz | DEFERRED | acceptance report §12 (reasons) |

## Cross-view consistency (§4)
CHG8841 reads identically everywhere: SCHEDULED on board, SOP 2/9 in cockpit + timeline expansion, same steps as execution-calendar slots + replay timeline, same sign-off states in cockpit + queue + replay trail, same override, same incident/defect counts in ledger + calendar ⚠ + replay trail. One source of truth (`rh_*` + shared invalidation).

## Navigation/route audit (§5)
Change list → detail (slug + legacy UUID both open); detail → release/SOP/replay; timeline → release/change; calendar slot → change; board card → detail; sign-off node → release/change; production list → replay; replay → release/change. Breadcrumbs use the Project-module `ProjectPageHeader` pattern. No dead route, no drawer.

## Persona / broken-state (§6/§7)
Documented in the user manual (§2) + acceptance report (§7). Broken states verified live across phases: unlinked production, freeze conflict, rejected/overdue sign-off, missing commit/evidence audit gaps, reconstructed replay scope, empty For You, empty board lane, unassigned SOP owner, missing approver ("Unassigned approver").

## Gates (§8)
`tsc` clean · `npm run build` PASS · color 0 · audit: tokens/typography below baseline, spacing 0 (no bump) · CRE pass · TestHub pass · self-test 45/45. No Folio/wiki touched. No drawers.
