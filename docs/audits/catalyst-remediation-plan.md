# Catalyst Audit Remediation Plan

Feature Work ID: `CAT-AUDIT-REMEDIATION-20260705-001`
Source of truth: `catalyst_p0_p1_static_findings_1000.csv` (1000 findings), `catalyst_module_screen_inventory.csv` (274 rows), `catalyst_route_inventory.csv` (548 rows), `Catalyst_Static_Blueprint_UIUX_Mental_Model_Audit.md`.

## Findings summary

| Module | P0 | P1 | Total |
|---|---|---|---|
| Test Hub | 4 | 166 | 170 |
| Chat | 0 | 160 | 160 |
| Incident Hub | 2 | 148 | 150 |
| Release Hub | 0 | 150 | 150 |
| STRATA / Strategy | 0 | 150 | 150 |
| Project Hub | 0 | 120 | 120 |
| Product Hub | 0 | 80 | 80 |
| Tasks/Plan | 0 | 20 | 20 |
| **Total** | **6** | **994** | **1000** |

Category breakdown: 730 `UI_STANDARDIZATION`, 96 `OBSERVABILITY_GAP`, 90 `LEGACY_ROUTE_AMBIGUITY`, 62 `BROKEN_DEAD_END`, 5 `PREREQUISITE_BYPASS`, ~17 singleton categories (SLA/governance/i18n/mobile/state-machine/readiness-gate/etc.).

Only 6 findings are P0 — all reconciled against live `main` and confirmed still present (not stale, not already fixed):
- `CAT-0001`, `CAT-0002`, `CAT-0004`, `CAT-0005` — Test Hub, `PREREQUISITE_BYPASS` (defect/cycle lineage gaps).
- `CAT-0009`, `CAT-0012` — Incident Hub, `SLA_VISIBILITY_GAP` / `GOVERNANCE_ACTION_GAP`, both sourced from `features/CAT-INCIDENT-GOVERNANCE-20260703-001/07_HANDOVER.md` (a separate, already-active feature — must be re-verified for currency before acting, since the audit may be citing a gap that feature has since closed).

The remaining 994 are P1. 73% of all findings (730/1000) are `UI_STANDARDIZATION` — largely mechanical, repetitive inline-style / hardcoded-spacing / non-canonical-component findings spread across every module. These are real ADS-token debt (per repo CLAUDE.md's hard-stop color/token law) but are not individually distinct bugs — they are best fixed as batched sweeps per module/component, not 730 one-off edits.

## Wave order (per /goal mandated sequence)

1. **Test Hub** — Slice 1 (this slice): 4 P0 lineage/gating bugs fixed. Slices 2+: 166 P1s (mostly UI_STANDARDIZATION + a handful of BROKEN_DEAD_END/OBSERVABILITY_GAP) — batch by file.
2. **Release Hub** — 150 P1s. No P0s. Mental model per audit: release container → scope → readiness gates → deployment/rollback → closure. Needs a dedicated discovery pass (current release model may already have partial readiness/scope surfaces — must confirm before assuming gaps).
3. **Incident Hub** — 2 P0s (SLA visibility, governance approve/veto) + 148 P1s. First action: re-read `features/CAT-INCIDENT-GOVERNANCE-20260703-001/07_HANDOVER.md` in full and diff against current `src/hooks/useCommitteeQueue.ts` / incident SLA components to confirm the P0s are still open before touching code.
4. **STRATA / Strategy** — 150 P1s, no P0s. `docs/audits` cross-reference: repo already has an active `CAT-STRATA-20260705-001` feature (most recent commit) — remediation must reconcile against that work rather than duplicating it.
5. **Chat** — 160 P1s, no P0s. Cross-reference existing `chat-v2-production-hardening` memory (chat v2 hardening already landed 2026-07-04) — likely several audit findings here are already closed; needs reconciliation pass, not blind fixing.
6. **Project Hub** — 120 P1s. Used as UI/UX reference surface per /goal instructions; findings here are likely more about tightening an already-strong pattern than fixing broken mental models.
7. **Product Hub** — 80 P1s.
8. **Admin/Settings/Workflow** — not separately broken out in this CSV's module column; audit's `Tasks/Plan` (20 P1s) plus any admin-tagged rows in the inventory CSV need a follow-up query to route correctly (module taxonomy in the findings CSV doesn't have an explicit "Admin" bucket — needs reconciliation against `catalyst_module_screen_inventory.csv` before Slice 8).

## Slice 1 scope (closed this session)
Fixed the 4 Test Hub P0s. See `catalyst-mental-model-remediation-report.md` and `catalyst-runtime-proof-report.md` for detail. Everything else remains `Deferred` in `catalyst-finding-closure-ledger.csv` with a Notes field explaining which wave it's staged for.

## Non-negotiables carried into every future slice
- No fabricated screenshots or invented test runs — proof only for what actually ran.
- No dropped findings — every ID in the ledger is accounted for even where the fix decision is "defer to wave N."
- P0 fixes double-check the audit's evidence is still live in the current `main` before editing (audits sourced from static grep + a separate feature's handover doc can go stale).
- Batch the 730 UI_STANDARDIZATION findings by canonical-component substitution, not by chasing every line number individually.
