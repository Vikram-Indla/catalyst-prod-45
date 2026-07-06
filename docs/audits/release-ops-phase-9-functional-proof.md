# Release Ops — Phase 9 Functional Proof

**Feature Work ID:** `CAT-RELEASE-OPS-DISCOVERY-BLUEPRINT-20260706-001` · Phase 9 · 2026-07-06
**Method:** live Chrome MCP on localhost:8080 against seeded cyij.

## Demo data (cyij, staging only)
- PE-8841 (event_key, success, 12-min overrun) linked to release 8 July + change CHG8841; CHG8841 has 9 SOP steps, 8 sign-off gates (approved/pending/overdue/rejected), approved emergency override (freeze:production), INC-154 + DEF-RO-8841 (source_change_id + source_sop_step_id).

## Proof matrix
| # | Proof | Result |
|---|---|---|
| 1 | Production Events list | Result Lozenge + Snapshot counts + Replay/Preview actions |
| 2 | Event row result/status | Success/partial/failed/rollback Lozenge |
| 3 | Replay action | Replay → opens full page; row-click opens replay |
| 4 | Replay full-page header | PE-8841, title, Success, release/change/env/window/duration(2h12m red)/executed-by |
| 5 | Executive summary | deterministic, honestly labelled "not AI", real data (SUCCESS + overrun + override + 1 open critical) |
| 6 | Release/change context | 8 July + CHG8841 (links), risk High, category Backend |
| 7 | Scope snapshot | reconstructed (labelled), BR/sprint/work-item counts |
| 8 | SOP execution timeline | 9 steps, planned vs actual, per-step issue markers (#51/#53 "1 issue") |
| 9 | Expanded SOP step | type/role/env/repo/commits/expected/actual/blocker/evidence |
| 10 | Commit ledger | "⚠ 2 commit-required missing" audit gap + #51 db e4f5g6h |
| 11 | Evidence ledger | "⚠ 3 evidence-required missing" audit gap |
| 12 | Sign-off trail | release+change gates: Overdue/Approved/Pending/Rejected(+reason) |
| 13 | Emergency override trail | ⚡ Emergency override — Approved · bypassed freeze:production |
| 14 | Freeze trail | ✓ No freeze conflict at deployment time |
| 15 | Incident/defect trail | INC-154 + DEF-RO-8841 with counts, from-SOP-step, links |
| 16 | Result & closure | final result + open incidents/defects + closure message |
| 17 | Replay link from Change Detail | production-event card "Open replay →" → /production-events/:eventKey |
| 18 | Replay link from Release Detail | same route reachable (documented) |
| 19 | Missing/reconstructed warning | "Reconstructed from current release links"; audit-gap warnings |
| 20 | No drawer | full-page replay; list modal = quick preview only |

## Build & gates
`tsc` clean · `npm run build` PASS (65s) · color clean · CRE/TestHub green · audit: **tokens and typography both DROPPED** below baseline (div-heading + sentence-case discipline), spacing 0 — no baseline change needed.

## Notes
Screenshot IDs in release-ops-screenshot-evidence.md. Scope shows 0/0/0 because rel_a has no seeded BR/sprint/work-item links — correctly labelled reconstructed. Change-level auto-generation + richer stored snapshots deferred to Phase 10.
