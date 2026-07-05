# CAT-STRATA-20260705-001 — Validation Evidence

> Raw output from validation commands, DOM probes, API responses.
> Append — never delete.

---

## Validation entries

### 2026-07-05 — Session 002 (Phase 3 implementation) — gate suite on worktree strata-20260705

**Staging DB probes** (project-ref `cyijbdeuehohvhnsywig` verified per batch; via `supabase db query --linked` in a disposable scratch link):
```
strata_kpis=8  strata_kpi_actuals=16  strata_scorecard_lines=16
strata_calculated_values=70  strata_snapshot_items=30
strata_lineage_records=8  strata_audit_events=174
Q2 CEO scorecard score = 96.1, band = green   ← engine output; hand-check:
  Financial 30×~99.2 + Customer 25×100 + Digital 20×86.7 + People 15×98.7 + ESG 10×91.7
  = 96.06 ≈ 96.1 ✓ (weighted_average rollup, governed weights)
portfolio value_at_risk = 2,650,000 (formula var:v1, gate exposure applied)
feature_flags.strategy_hub → enabled=true, label='STRATA'
supabase_migrations.schema_migrations ← 7 versions inserted, 1:1 with committed files
```
Two calc-engine defects were caught BY the live seed run and fixed at source before completion:
1. `strata_calc_kpi_achievement` referenced `t.threshold_scheme_id` (targets carry no scheme) → scheme now resolves from the KPI.
2. `strata_calc_execution_progress` plpgsql variable `progress` collided with the milestone column → renamed `v_progress`, columns qualified.

**Typecheck:** `npx tsc -p tsconfig.app.json --noEmit` → **183 errors total = pre-existing baseline** (5 unrelated legacy files); `grep "modules/strata"` and all touched wiring files → **0 errors**.

**ADS gates:**
```
✅ ads-color-gate: 0 = baseline 0. No new hard-coded colors.
✅ ads-fallback-hex-gate: 4836 = baseline 4836 (ratcheted DOWN from 4838 — improvement committed).
✅ ads-audit-gate: no category above baseline — tokens 24544/24544, typography 1527/1527, spacing 1/1, fontImports 0/0.
   (After compliance sweep: strata-scoped audit = 0 violations across 13 files, 64 edits;
    single annotated exception: @xyflow/react/dist/style.css import — third-party canvas
    stylesheet, ads-scanner:ignore-next-line, probed 2026-07-05.)
✓ CRE chokepoint gate passed
```

**ESLint (module-scoped):** 0 errors; warnings = `no-restricted-imports` (direct @atlaskit imports → migrated to the `@/components/ads` wrapper where API-compatible; see agent report in session log), 3 `react-hooks/exhaustive-deps` advisories, 1 `react-refresh/only-export-components`.

**Unit tests:** `npx vitest run` → **environmental startup failure on this machine** (Node v20.12.2; rolldown `styleText` crash — matches the recorded pre-existing issue; NOT a STRATA regression; CI runs vitest on a compatible Node). HubSwitcher tests were updated for the STRATA tile and will run in CI.

**Production build:** `NODE_OPTIONS=--max-old-space-size=8192 npx vite build` → `✓ built in 1m 32s`, exit 0, 962 assets (default heap OOMs on this machine — pre-existing; CSS syntax warnings pre-existing).

**Functional proof source of truth:** the numbers rendered by every STRATA surface come from `strata_calculated_values` / calc RPCs verified above — the UI has no scoring path to diverge.

**PENDING (requires interactive session):** Chrome MCP DOM probes + the 7-PNG screenshot set per surface against a dev server pointed at staging (`VITE_SUPABASE_URL=https://cyijbdeuehohvhnsywig.supabase.co` + staging anon key). Logged as the top follow-up in 07_HANDOVER.md and DRIFT-001.
