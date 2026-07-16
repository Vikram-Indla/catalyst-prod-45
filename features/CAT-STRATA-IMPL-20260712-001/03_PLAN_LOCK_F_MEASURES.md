# 03 — PLAN LOCK · Model measure-level authoring (`strata_scorecard_model_measures`)

> STATUS: **PROPOSED — awaiting Vikram. NO CODE until approved.** Target: `catalyst-staging` (the live target).
> Migration: **yes, one** (new association table). PR-based. Unblocks one of the 15 backend features (anchor 05).

## The decision (Vikram, 2026-07-16) — recorded verbatim
> *"A measure is a KPI assignment, not a new master business object."*
> New **association** table `strata_scorecard_model_measures`: `model_id`, `perspective_id`, `kpi_id`, `weight`,
> `order_index`, `required`, `aggregation_method`, `target_policy`, `created_at`.
> *"Do not create a separate `strata_measures` master table duplicating KPI names, formulas, owners, units, and
> sources. That would create two competing measurement dictionaries."*
> `strata_scorecard_lines` is instance-level — keep it for generated/live scorecards; define reusable measures at
> **model** level first.

**This unblocks the item; it was the open data-model question.** It also settles anchor 05's builder, whose
perspective-groups-with-measures layout 5C could not build (P5-D3) because no measure structure existed.

## Grounding — verified on the live target, not assumed
| Claim | Verified |
|---|---|
| `strata_scorecard_lines` is instance-level | ✅ scoped by `instance_id` (`id, instance_id, perspective_id, ref_type, kpi_id, element_id, benefit_id, weight, target_override, order_index, …`) |
| …and permits kpi/objective/benefit | ✅ CHECK is exactly `kpi \| objective \| benefit` (mutually exclusive FKs) |
| `strata_scorecard_model_measures` absent | ✅ free to create |
| `strata_measures` master absent | ✅ **must remain absent** |
| Sibling to mirror | ✅ `strata_scorecard_model_perspectives` = `id, model_id, perspective_id, weight, order_index, created_at`; `UNIQUE(model_id, perspective_id)`; RLS `SELECT => current_user_is_approved()`, `ALL => strata_has_role(['strategy_office'])` |
| KPI dictionary (do not duplicate) | ✅ `name, kpi_type_id, unit, accountable_owner_id, data_source_id` |

## 🔴 ONE DECISION NEEDED — `aggregation_method` vocabulary
The aggregation dictionary **already exists**:
```
strata_scorecard_models.rollup_method CHECK: weighted_average | sum | min | custom
```
The suggested values were *"weighted average, sum, minimum, latest"* — two don't match: **`minimum`** (existing is
`min`) and **`latest`** (absent entirely). Minting `minimum`/`latest` at measure level while models use `min`/`custom`
would create **two competing aggregation vocabularies — the same failure the decision above exists to prevent**, just
one level down.

- **M-D1 · RECOMMEND:** reuse the existing CHECK verbatim — `weighted_average | sum | min | custom`. If `latest` is
  genuinely required, **add it to BOTH** `rollup_method` and `aggregation_method` in this migration (one dictionary,
  extended once) — never to measures alone.

## Table (final shape, pending M-D1)
```sql
create table public.strata_scorecard_model_measures (
  id                uuid primary key default gen_random_uuid(),
  model_id          uuid not null references public.strata_scorecard_models(id) on delete cascade,
  perspective_id    uuid not null references public.strata_perspectives(id),
  kpi_id            uuid not null references public.strata_kpis(id),          -- the ONLY measure identity
  weight            numeric not null default 0,
  order_index       int not null default 0,
  required          boolean not null default false,
  aggregation_method text not null default 'weighted_average'
                     check (aggregation_method in ('weighted_average','sum','min','custom')),  -- M-D1
  target_policy     text not null default 'default'
                     check (target_policy in ('default','local')),            -- mirrors lines.target_override
  created_at        timestamptz not null default now(),
  unique (model_id, perspective_id, kpi_id)   -- a KPI at most once per perspective per model
);
```
- **No name/formula/unit/owner/source columns** — those live on `strata_kpis` and are read through `kpi_id`. Any PR
  adding one is the second-dictionary bug and must be rejected.
- RLS mirrors the sibling exactly: `SELECT => current_user_is_approved()`, `ALL => strata_has_role(['strategy_office'])`.
- `perspective_id` must belong to the model — enforced by the authoring RPC (a FK can't express it).

## Scope
- **Migration:** table + RLS + indexes + `strata_set_model_measures(p_model uuid, p_measures jsonb)` (replace-set,
  mirroring `setModelPerspectiveWeights`), integrity-checked: measure weights per perspective must total 100.
- **Domain/UI:** reader + hook; **5C's `ScorecardModelsSection` gains the anchor-05 perspective-groups-with-measures
  builder** (Measure · Weight · Direction · Threshold scheme · Target source), and `ModelIntegrityBand` extends from
  perspective-weights-only to *"✕ Customer measure weights total 90 — assign the remaining 10"* — the exact anchor-05
  band that P5-D3 could not build. Direction/scheme/unit are READ from the KPI, never re-entered.
- **Forbidden:** `StrataStrategyMapPage.tsx` · creating `strata_measures` · duplicating any KPI field ·
  altering `strata_scorecard_lines` (instance-level, out of scope) · a parallel aggregation vocabulary.
- **Gates:** tsc · colors · audit · CRE · `PATH=node@22 npm test`. **Ledger:** `execute_sql` + explicit INSERT (1:1).
- **Stop conditions:** any need to store a KPI attribute on the measure row → stop and ask.

## Decisions
- **M-D1 · aggregation vocabulary** — reuse `weighted_average|sum|min|custom`, or extend BOTH tables to add `latest`?
  → **Recommend: reuse as-is; add `latest` to both only if actually needed.**
- **M-D2 · scope of the slice** — table + RPC + reader only (thin), or include the full anchor-05 measures builder UI?
  → **Recommend: split.** Table+RPC first (verifiable, low risk), builder UI as the next slice — it is a large surface
  and 5C's card layout must change to perspective groups.
