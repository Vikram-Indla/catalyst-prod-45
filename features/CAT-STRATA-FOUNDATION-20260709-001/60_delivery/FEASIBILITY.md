# FEASIBILITY — delivery waves (each wave ≤ 2h slices per operating contract)

| Wave | Scope (REQs) | Effort | Risk | Notes / downside of ordering |
|---|---|---|---|---|
| **W0 — Decisions + probes** | Resolve CON-001/002/003/006 with Vikram; read `README_STRATA_ISOLATION.md`, `catalyst/features/CAT-STRATA-ISOLATE-20260707-001/`, reconciliation migrations in full; live-DB drift check (ASM-001); probe `strata_execution_links` (ASM-002). Produce 03_PLAN_LOCK. | S | Low | Nothing else starts without this; skipping it risks building against the wrong product form (hub vs standalone). |
| **W1 — Terminology + IA** | REQ-001, 003, 004, 005, 006 (+002 if full rename approved) | M | Low-Med | Pure label/code renames + sidebar regroup; UI-heavy → mockup-first contract + screenshot signoff apply. Downside of doing first: cosmetic before structural — but it is the loudest acceptance signal and unblocks terminology guard. |
| **W2 — Linkage model** | REQ-007, 008, 009, 010, 011 | M-L | Med | Additive migrations + triggers; must preserve existing rows (impl-rule 6/8). Verify-first REQs may collapse to zero-DDL if execution_links already covers them. |
| **W3 — BSC + VMO + Governance surface alignment** | REQ-012, 013, 014, 015 | M | Low-Med | Mostly config/labels/drilldown verification on existing engines. |
| **W4 — Consolidation + hygiene** | REQ-016, 017, 018, 019 | M-L | Med-High | CON-002 dependent; deleting/redirecting `/enterprise/objectives` has the widest blast radius — regression red-flag protocol applies. |
| **W5 — Seed + smoke tests + acceptance sweep** | REQ-020, 021 + AC1–20 verification notes | M | Low | Final evidence: seed chain queries + vitest + nav dead-link sweep + screenshots. |

**Overall verdict: HIGH feasibility.** ~85–90% of the locked goal already exists and is wired; the remaining work is decision-gated renames, additive linkage schema, IA regrouping, seed, and tests. Biggest risks: (1) hub-vs-standalone ambiguity (CON-003), (2) duplicate OKR stack consolidation blast radius (CON-002), (3) schema drift between repo migrations and live DB (ASM-001).
