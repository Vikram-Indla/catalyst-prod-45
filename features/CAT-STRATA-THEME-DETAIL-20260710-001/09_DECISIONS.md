# Decisions — CAT-STRATA-THEME-DETAIL-20260710-001

## D1 — 2026-07-10 — Governance schema migration approved
Vikram approved adding a Theme-level FK to `strata_decisions`/`strata_actions`
(exact shape TBD at Slice 4 Plan Lock time). Scoped to its own slice (Slice 4)
because it is a schema change on live governance tables — CLAUDE.md RED FLAG
class change, kept isolated from the lower-risk UI wiring slices.

## D2 — 2026-07-10 — Baseline/version: report gap, do not build
No per-Theme baseline/version concept exists in the schema
(`strata_snapshots` is cycle/period-scoped only). Per user instruction and
CLAUDE.md's zero-fabrication rule, the rebuilt page will state this gap
explicitly rather than synthesize fake version history. Revisit only via a
new explicit decision.

## D3 — 2026-07-10 — Slicing by priority tier
Full functional contract exceeds the Two-Hour Slice Rule. Split into 4 slices,
each with its own Plan Lock:
1. Edit Theme/Charter from detail page + business-readable audit
2. Objectives list + OKR performance
3. Project Cards section + execution summary
4. Governance migration + Decisions/Actions + relationship terminology rename
