# Session 007 — Slice 2C-2 KPI & OKR Library (anchor 16): bulk + saved views + richness

> `continue feature CAT-STRATA-IMPL-20260712-001`. Resumed on `strata/impl-phase01`.

## Rehydration (pre-flight done)
- Pre-flight: `pwd`/branch/status/stash run. Feature folder is IN-REPO at
  `features/CAT-STRATA-IMPL-20260712-001/` (NOT `~/catalyst/features/`).
- Read: 00, 01, 03_PLAN_LOCK, 03_PLAN_LOCK_PHASE2, 07_HANDOVER, 08_DRIFT_LOG, 09_DECISIONS,
  discovery/00_anchor_specs, sessions/006. **Anchor 16 re-read IN FULL via DesignSync** (drift protocol).
- **Git:** HEAD (`c8b40aa4e`) was a strict ancestor of `origin/main` (`02ec24f61`) — no divergence.
  Fast-forwarded to `02ec24f61`. The 3 new commits: 2 legit ADS maintenance + `b2171a350`
  "commit everything today" (GitHub Desktop sweep — ISOLATED to `docs/handoffs/docintel-claude-design/`,
  142 files, zero strata touch; verified). Tree clean. GitHub Desktop auto-committer STILL ACTIVE.
- Confirmed: NO strata bulk-write RPC exists; NO `strata_saved_views` migration exists.

## Anchor 16 full-read — DRIFT surfaced (DRIFT-5)
2C-1 shipped columns: KPI · Achievement · **Actual/Target (combined)** · **Trend spark** · Validation ·
Owner · Freshness. **Anchor 16 has NO trend spark**; it splits **Actual** and **Target** into separate
columns and adds a **Δ** column: `[✓] · KPI·objective · Achievement · Actual · Target · Δ · Validation ·
Owner · Freshness`. Plan Lock 2C line listed "Actual vs Target · Trend spark" — anchor contradicts it.
Logged DRIFT-5; raised to Vikram (do not silently adapt).

## 2C-2 sub-slice plan (proposed, each ≤2h)
- **2C-2a** backend: governed bulk RPC (owner-change/threshold-assign → routes through approval) +
  `strata_saved_views` table. Migrations staging-applied; prod parked. Ledger discipline (execute_sql +
  explicit ledger INSERT). **DDL — confirm go-ahead + project-ref before applying.**
- **2C-2b** column refinements (DRIFT-5 resolution: split Actual/Target + Δ, drop/keep trend spark) +
  objective-ancestry sub-line + freshness staleness glyph (●/◐/○).
- **2C-2c** BulkFooterBar (Change owner / Assign scheme / Export CSV) wired to the governed RPC.
- **2C-2d** Saved views selector + filter enrichment (Band/Perspective/Owner/Validation chips) +
  summary bar + worst-first default sort + states.

## Decisions (Vikram, session 007)
- **DRIFT-5 → (a) match anchor exactly** (drop trend spark, split Actual+Target, add Δ) — applied in 2C-2b.
- **Start 2C-2a backend, apply to staging.** Bulk write = **honest loop of existing `strata_update_kpi`**
  (approved KPIs return per-row rejection; no versioning subsystem built).

## 2C-2a — DONE (backend, staging-applied, verified)
Migration `20260713110000`: `strata_saved_views` (per-user, RLS, no slug) + `strata_bulk_update_kpis`.
Functional test (simulated strategy_office, rolled back): `applied:1, failed:1` — draft applied, approved
honestly rejected. Gates GREEN. See 04_EXECUTION_LOG "Slice 2C-2a". **Awaiting Vikram commit approval.**

## Status: 2C-2a built + verified; commit pending Vikram approval → then 2C-2b (columns).
