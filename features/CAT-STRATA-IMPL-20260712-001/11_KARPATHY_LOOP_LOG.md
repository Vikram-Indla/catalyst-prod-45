# 11 — Karpathy Loop Log

Format per loop: Hypothesis → Experiment → Measure → Keep/Discard → Log.

## Phase 3 planning (session 011, 2026-07-14)

### K-P3-1 · Which anchors are Phase 3?
- **Hypothesis:** Phase 3 = the handover's candidate set (07·09·10·17·18·19·23·24, "governance & delivery").
- **Experiment:** Re-read HANDOFF.md build-order in full via DesignSync.
- **Measure:** HANDOFF has NO "governance & delivery" phase. Phase 3 = delivery & value (07·17·18·08·22·21);
  Phase 4 = governance & data (10·23·24·09·19·20). Handover conflated the two + dropped value anchors.
- **Keep/Discard:** DISCARD handover candidate set. Raised DRIFT-6; Vikram ruled HANDOFF-as-written (D-12).

### K-P3-2 · Greenfield or redesign?
- **Hypothesis:** Some Phase-3 surfaces are new pages.
- **Experiment:** Route/page discovery agent mapped StrataRoutes.tsx + routes.ts + pages.
- **Measure:** All 6 surfaces already have mounted pages; only `/strata/portfolio/:slug` is a net-new route
  (`usePortfolioBySlug` already exists, unused). Slug contract satisfied on all 3 tables.
- **Keep:** Treat Phase 3 as redesign-in-place + one route split. Lowers risk; drives slice order.

### K-P3-3 · Do the anchors' data needs exist?
- **Hypothesis:** The pages can be brought to anchor with existing hooks/columns.
- **Experiment:** Integration + data-safety agents mapped every UI element → table/RPC on staging.
- **Measure:** Delivery spine (17,07) fully backed. Value spine (22,08,21) partly — benefit detail backed;
  portfolio value rollups/leakage/weakest-link NOT stored (no RPC). Import (18) reconciliation
  Matched/Conflict/Unmatched + both-sides diff + 24h undo do NOT exist (only dry-run/apply created/updated/
  rejected). Assumptions have no "under strain"; cards have no SAP source, no on_hold bool, no portfolio_id.
- **Keep:** Zero-assumption rendering mandatory. Client-derive portfolio aggregates + threats ranking + card
  benefit value (thin hooks, no migration). Import anchor-18 backend gap → scope decision P3-D3.

### K-P3-4 · Overlay drill or full-page?
- **Hypothesis:** Anchor 17's row→overlay-detail needs a new overlay router.
- **Experiment:** Canonical agent checked CatalystViewBase/DetailRouter entity-kind union.
- **Measure:** Both locked to ph_issues/tasks/test entities — no STRATA host (confirms P2-D1). Building one
  reopens P2-D1. Shipped Phase-1/2 pattern = full-page slug + `?from=` (satisfies "origin preserved").
- **Keep (recommend):** Reuse full-page slug + `?from=` (P3-D1), consistent with D-2. Overlay = out of scope.
