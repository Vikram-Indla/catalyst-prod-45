# 05 — Data / Safety Guard Findings
**Feature:** CAT-STRATA-IMPL-20260712-001 (STRATA design pack, Phase 0 + Phase 1)
**Role:** Data / Safety Guard (read-only)
**Date:** 2026-07-13

## Method / limitations
- `supabase/.temp/project-ref` does **not exist** in this checkout → no linked Supabase
  project. Per the CONCURRENT SESSIONS / DB TARGETING rule, I did **not** invoke the
  Supabase MCP (`list_tables` / `execute_sql`) without a verified target. All findings below
  are from **committed migrations** in `supabase/migrations/` (1280 files, read via
  `rtk proxy grep` per the RTK-line-number memory note) cross-checked against the live
  client code that already consumes these tables (`src/modules/strata/domain/index.ts`,
  `src/modules/strata/hooks/useStrata.ts`, `src/lib/routes.ts`, and the three existing
  Phase-1 pages).
- The `DesignSync` / `ToolSearch` MCP tools specified in the task brief were **not present**
  in this session's tool list (only `Bash` + `Read` were available), so I could not pull the
  `.dc.html` anchors directly. I inferred each panel's data assumptions from the existing
  (pre-redesign) page implementations, which the objective doc states are "existing pages,
  redesign to anchor" — i.e. the data contracts are unlikely to change even though the visual
  layer will. **This is a gap another agent/session should close** by fetching the anchors
  before Plan Lock is finalized, specifically to confirm no *new* fields are implied beyond
  what's below.

## Findings

| Entity | Exists? | Key columns | Slug-ready? | Risk | Migration needed? |
|---|---|---|---|---|---|
| **`strata_needs_attention(p_period uuid)`** — Command Center attention inbox | EXISTS (SQL function/RPC, not a table/view) | Returns `item_type, severity, entity_type, entity_id, entity_name, detail, due_date, owner_id` | N/A (not a routed entity) | Low. `SECURITY DEFINER`, already consumed by `StrataCommandCenterPage.tsx` and `src/modules/strata/domain/index.ts`. 12 UNION ALL branches cover attestation/validation/blockers/overdue actions/gates/assumptions/missing actuals/upload rejections/governance/project delay. `owner_id` is NULL for branches with no single personal owner (attestation, overdue gate, upload rejections) — those are "All" only, never "Mine", by design. | None for Phase 1. |
| **`strata_scorecard_models`** (template) | EXISTS | `id, name, slug text UNIQUE, owner_scope_type, rollup_method, threshold_scheme_id, status, version, effective_from/to` | YES — `BEFORE INSERT` trigger `trg_strata_scorecard_models_slug` → `strata_generate_slug()` | Low | None |
| **`strata_scorecard_instances`** (feeds `/strata/scorecards` + `/strata/scorecards/:slug`) | EXISTS | `id, model_id, cycle_id, period_id, name, slug text UNIQUE, owner_id, status ('draft','live','pending_validation','locked'), locked_snapshot_id` | YES — `BEFORE INSERT` trigger `trg_strata_scorecard_instances_slug` → same `strata_generate_slug()` (slugify(name), dedupe `-2`/`-3`, **frozen on creation** — matches CRE Grid F2 verbatim) | Low. `routes.ts:258` already types the param as `instanceSlug`, confirming the `:slug` route targets this table, not `strata_scorecard_models`. Column is `UNIQUE` but **not `NOT NULL`** at the DDL level (relies on the trigger always firing pre-INSERT); functionally equivalent for all current insert paths (RPC-only writes per `strata_entity_create_rpcs.sql` comment: "the RPCs never compute slugs"). | None for Phase 1. Optional hardening (out of scope): add `NOT NULL` via `ALTER TABLE ... ALTER COLUMN slug SET NOT NULL` once backfilled — not required, flagging only. |
| **`strata_scorecard_lines`** | EXISTS | `id, instance_id, perspective_id, ref_type ('kpi'\|'objective'\|'benefit'), kpi_id/element_id/benefit_id (mutually exclusive via CHECK), weight, target_override` | N/A (child rows, not routed) | Low | None |
| **My Work queue source** (`/strata/my-work`, NEW page) | **PARTIAL / MISSING** | No `strata_my_work` table or view exists. (A `v_tm_my_work` view exists but belongs to the unrelated Task Manager module — do not reuse.) The nearest fit is `strata_needs_attention(p_period)` filtered client-side to `owner_id = current_user`, unioned with any other actionable tables (`strata_actions`, `strata_gate_instances`, `strata_dependencies`, `strata_benefit_values`, `strata_kpi_actuals`) if the anchor's verb-groups (validate/resolve/record/weight-change) need finer per-verb detail than `strata_needs_attention.item_type` already encodes. | **Medium.** `strata_needs_attention` covers 12 of the likely verb categories already (attestation, benefit validation, blocked dependency, overdue action, overdue gate, broken assumption, missing actual, upload rejection, governance, project delay ×3) with `owner_id` populated for 8 of 12. This is probably sufficient for a v1 My Work page composed **client-side** (group-by `item_type`/verb, filter `owner_id = auth.uid()`), with **zero new migration**. Confirm against the actual `11 My Work.dc.html` anchor (not fetched this session — see limitation above) before Plan Lock locks the "no migration needed" call, in case the anchor implies a verb/action not covered by the 12 branches (e.g. "weight-change" approvals on scorecard models, which is NOT currently a `strata_needs_attention` branch). | **Possible** — only if the anchor requires a verb not in the 12 existing branches (e.g. pending scorecard-model weight-change approval). Flag as open question for Plan Lock, not a confirmed gap. |
| **`strata_snapshots` / locked-mode + snapshot band** (Phase 0 `StrataSnapshotBand`) | EXISTS | `strata_snapshots`: `id, snapshot_key text UNIQUE DEFAULT 'SNAP-'||seq, name, cycle_id, period_id, scope, config_versions, data_run_ids, created_by, approved_by, superseded_by_id` (INSERT-only, comment: "Locked review evidence... supersession happens via `strata_supersede_snapshot` RPC and creates a NEW snapshot"). `strata_snapshot_items`: `snapshot_id, entity_type, entity_id, payload jsonb`. `strata_scorecard_instances.locked_snapshot_id` FK's into it; `strata_calculated_values.snapshot_id` too. `strata_lock_snapshot(...)` RPC sets instance `status='locked'` atomically with snapshot creation. | N/A (not routed by slug; `snapshot_key` is a stable business key, not a route param in scope) | Low. Model is coherent and already wired end-to-end (lock RPC → snapshot row → snapshot_items → instance status flip, all inside one function). | None for Phase 1. |

## Zero-assumption consequences (CLAUDE.md)

- **My Work page (`/strata/my-work`):** until confirmed against the actual anchor, the page
  must render **only** verb-groups it can populate from `strata_needs_attention(owner_id=me)`.
  Any verb/action implied by the anchor with no backing branch (e.g. a hypothetical
  "weight-change approval" queue) must render as an **empty state for that group**, never a
  fabricated placeholder count or synthetic row.
- **Scorecard `:slug` route:** `strata_scorecard_instances.slug` is real and trigger-populated,
  so no zero-assumption risk here — but if any *legacy* instance row predates the slug trigger
  (unlikely, trigger ships in the same migration as the table) a NULL slug must not fall back to
  showing the instance under a fabricated slug; it should be excluded from slug-routed lists
  until backfilled (none expected, flagging as a defensive note only).
- **Command Center attention inbox:** items with `owner_id IS NULL` (attestation, overdue gate,
  upload rejections) must **never** appear under a "Mine" filter — rendering them there would be
  a fabricated ownership claim. They belong only in "All".

## Summary (for Plan Lock)

1. **`strata_needs_attention`** (Command Center) — EXISTS, fully wired, zero migration risk.
2. **Scorecard Index/Detail** — EXISTS end-to-end with a **real, trigger-populated, frozen-on-
   creation slug column** on `strata_scorecard_instances` (matches CRE Grid F2). `routes.ts`
   already expects `instanceSlug`. **No slug-column blocker.** Zero migration needed.
3. **My Work (new page)** — **no dedicated table**; must be composed from
   `strata_needs_attention(owner_id=me)` client-side. Likely zero migration, but this is
   **provisional** pending confirmation against the `11 My Work.dc.html` anchor (not fetched
   this session — DesignSync tool unavailable). Flag as an open item for whoever finalizes
   Plan Lock: re-run this check with DesignSync access before ruling out a migration.
4. **Snapshot / locked-mode data (`StrataSnapshotBand`)** — EXISTS, coherent INSERT-only model
   with an atomic lock RPC. Zero migration risk.
5. **RLS caution:** all STRATA tables inspected use per-table `ENABLE ROW LEVEL SECURITY` with
   `current_user_is_approved()` (SELECT) and `strata_has_role(ARRAY[...])` (write) policies
   applied via a `DO $$ FOREACH ... $$` loop per migration — this is a read-only inventory
   check, not an RLS audit; no RLS gaps were found in what was read, but a full policy audit
   was out of scope for this pass.
6. **No DDL, no writes, no Supabase MCP calls were made** — no linked project-ref existed to
   verify a safe target against.
