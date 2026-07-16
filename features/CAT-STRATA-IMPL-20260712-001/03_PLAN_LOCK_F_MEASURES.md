# 03 — PLAN LOCK · Model measure-level authoring (`strata_scorecard_model_measures`)

> STATUS: **M-D0/M-D1/M-D2 APPROVED. Slice 1 (table + RPC + reader) ✅ BUILT + APPLIED + VERIFIED. Builder UI = next slice.** Target: `catalyst-staging` (the live target).
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

---

# PART 2b — measure ASSIGNMENT UI · ✅ BUILT + RULED · CLOSED (session 025, 2026-07-16)
> Built exactly as specced below; gates green; live-verified. The measures table went 0 → 2 rows through the
> new UI as `strategy_office`, which also closed part 2a's "populated rows verified by construction only" gap.
> PR #349. Evidence: `sessions/025_measures-builder-part2b.md`.
>
> **Both rulings in (Vikram 2026-07-16) — nothing outstanding on 2b:**
> - **M-D3 CONFIRMED** — the Save gate's "every group totals 100" applies only to groups that HAVE measures,
>   mirroring `ModelIntegrityBand`. The literal reading is unimplementable against the replace-set contract
>   (it would block the first save of a part-built model). Ruled as built; no code change followed.
> - **M-D4 DEFERRED to its own slice** — approved-model editability (measures AND perspective weights,
>   role-gated only, no status gate). Pre-existing since 5C via `ModelWeights`, so explicitly NOT 2b's to fix.
>   See `09_DECISIONS.md` → M-D4.
>
> **Anchor 05's builder is COMPLETE.** This was the feature's last ready-to-build spec — nothing is queued behind it.

Everything 2b needs already exists and is verified. This is a build-only slice — do not re-derive any of it.

## Already shipped (do not rebuild)
| Piece | Where |
|---|---|
| Table + CHECKs + RLS | `strata_scorecard_model_measures` (migration `20260716150000`, applied, ledger 1:1) |
| Writer | `configApi`→ **`scorecardApi.setModelMeasures(modelId, [{perspectiveId,kpiId,weight,orderIndex,required,aggregationMethod,targetPolicy}])`** → `strata_set_model_measures` (replace-set; rejects a perspective not on the model) |
| Readers | `useAllModelMeasures()` · `useModelMeasures(modelId)` |
| Display + integrity | `MeasureGroups` + `ModelIntegrityBand.measureIssues` in `StrataAdminConfigPage.tsx` (part 2a) |
| KPI dictionary | `useKpis()` → name; `kpi.kpi_type_id` → `useKpiTypes()` → `directionality` |

## Build exactly this
1. **Model `MeasureGroups` on `ModelWeights`** — it is the proven idiom in this same file: local `draft` state, an
   `editing` flag, `Save`/`Cancel`, `isDisabled` on Save while invalid, error via `SectionMessage`. Copy its shape.
2. **Per group:** `+ Add measure` → ADS `Select` over `useKpis()` (exclude KPIs already assigned to that model —
   `UNIQUE(model_id, perspective_id, kpi_id)` will reject duplicates server-side anyway). Each row: compact
   `Textfield type=number` for weight (`testId={`strata-measure-weight-${kpiId}`}`), a Remove button, `required`
   toggle, aggregation `Select` over **exactly** `weighted_average|sum|min|custom` (M-D1 — never mint a 5th).
3. **Save** → one `setModelMeasures(modelId, allRowsAcrossAllGroups)` call (replace-set = send the FULL set, not a
   delta). Then `invalidate()`.
4. **Gate Save** on every group totalling 100 — **client-side only**. The RPC deliberately does NOT enforce it
   (anchor 05 gates *submit*, not *save*); do not add server enforcement, it would make drafts unsavable.
5. **Never** render an input for name/direction/unit/scheme — those are READ from the KPI (M-D0). An editable one is
   the two-dictionaries bug.

## Gotchas that WILL bite (learned the hard way this session)
- **Test mocks:** any new hook used by `ScorecardModelsSection` must be added to the `vi.mock` factories in BOTH
  `ac6-keyboard-weight-change.test.tsx` and `phase5-governed-logic.test.tsx`, or 8 tests fail instantly with
  `undefined`. All fixtures go inside `vi.hoisted()`.
- **Spacing:** only 0/4/8/12/16/24/32/40/48 px — the audit gate fails on `6px`/`10px`.
- **tsc can report clean on a stale run** — re-read your imports (`useMemo` was missed exactly this way).
- **Run tests as** `PATH="/opt/homebrew/opt/node@22/bin:$PATH" npm test` (Node 20 crashes vitest).

## Verification (the table is EMPTY — this slice is what fills it)
2b is self-verifying and closes part 2a's gap: use the new UI as `strategy_office` (the logged-in session HAS that
role) to assign real measures, then confirm with
`select * from strata_scorecard_model_measures` on `cyijbdeuehohvhnsywig`, and confirm the group verdict flips
✓/✕ and the integrity band names the failing perspective. That also verifies 2a's populated row rendering, which is
currently verified by construction only.
