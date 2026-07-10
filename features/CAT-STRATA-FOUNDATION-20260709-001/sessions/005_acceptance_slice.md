# Session 005 — acceptance slice + staging apply (2026-07-09)

## Delivered
1. **Staging apply (Plan Lock sanctioned)** via Supabase MCP, project-ref `cyijbdeuehohvhnsywig` asserted on every call: 20260709170000 (rename — 4 charter rows + RLS preserved), 20260709171000 (linkage), 20260709172000 (seed). Ledger rows inserted with EXACT file versions (1:1 with committed files; MCP apply_migration avoided because it stamps its own version).
2. **Drift D-BUILD-002**: seed rule-5/6 UPDATE was a no-op (demo cards on root theme; objectives live under child themes). Authored + applied + committed `20260709180000_strata_seed_chain_repair.sql`. Post-repair: 4/4 cards linked, project objective + KPI rollup edges live.
3. **Negative tests (rules 12–15) PASS on staging**: theme as member rejected; theme UUID smuggled as project_card rejected by new referential guard.
4. **DOM acceptance on :8081 (worktree app)**: 10/10 routes render, 0 dead links; cycle+period toolbar everywhere (REQ-006 DOM-confirmed); 4 canonical areas + banned labels absent (REQ-004/005); Theme terminology live (REQ-001/003); REQ-013 drilldown CEO scorecard → measure → Care App v3 card (Theme + Objective + Blockers rendering) — Sector/CXO leg blocked by seed gap (no sector scorecard instance).
5. Micro-interaction ACs sampled: focus ring PASS, empty/zero-assumption PASS, hover PASS, drilldown continuity PASS; **AC8 tooltips on status lozenges MISSING (open)**; AC5 transitions + AC6 mutation feedback not instrumented (open).
6. Full evidence: `06_VALIDATION_EVIDENCE.md`. Screenshots shared in chat for signoff.

## Environment truths discovered (rehydrate on these)
- Auth on :8081 required manual sign-in by Vikram (per-origin session). Chrome MCP tab holds the session now.
- `catalyst-rq-cache` (persisted react-query) hydrates stale data with NO refetch — clear it (localStorage) after any DB change before trusting the UI.
- performance/network probes on Vite dev pages overflow the resource buffer — absence of visible supabase requests is NOT evidence the app is mocked.
- Seeded charters have stale `status='complete'` with owner_id NULL → Strategy Room "Charter incomplete" lozenges are TRUTHFUL. Data repair + lozenge-should-read-status follow-up logged in 06.

## Next
- Sector/CXO scorecard seed (unblocks REQ-013 leg + REQ-012 group visual) — candidate small slice.
- AC8 tooltips on RAG lozenges; AC5/AC6 instrumentation; Command Room visual depth; decommission slice REQ-016/018/019/022/023 (DB row counts now reachable via MCP).
- Charter data repair (owner_id) or lozenge switch to `charter.status`.
