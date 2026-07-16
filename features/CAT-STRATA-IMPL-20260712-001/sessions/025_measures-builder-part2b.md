# 025 — Measures builder part 2b (measure ASSIGNMENT UI)

**Feature Work ID:** CAT-STRATA-IMPL-20260712-001
**Session opened:** 2026-07-16 · resumed via `continue feature`
**Branch:** `strata/impl-phase01` @ `35c14550b` (== `origin/main`, 0 ahead / 0 behind)

## Rehydration (artifacts read)
`00_READ_ME_FIRST` → `01_OBJECTIVE` → `03_PLAN_LOCK_F_MEASURES` (incl. "PART 2b — READY TO BUILD")
→ `07_HANDOVER` (▶ START HERE block, added `35c14550b` after PR #348) → `08_DRIFT_LOG` → `09_DECISIONS`
→ `11_KARPATHY_LOOP_LOG`.

## State on entry
- Design pack **28/28 anchors** complete. §20 acceptance **7/7**. No UI phase remains (there is no Phase 6).
- Everything open is BACKEND / OPS / optional POLISH.
- **Next action (named by the handover): measures builder part 2b.** Plan Lock complete, M-D0/M-D1/M-D2
  ruled, **no decisions outstanding**. Build-only slice.

## Pre-flight verification (run this session, not inherited)
| Check | Result |
|---|---|
| Working tree | clean (`git status --short -uall` empty) |
| HEAD vs origin/main | identical — `35c14550b`, linear |
| Feature folder | exactly one: `features/CAT-STRATA-IMPL-20260712-001/` (the `~/catalyst/...` path in CLAUDE.md does not exist; the worktree copy does not exist either) |
| Node 20 (global) | v20.12.2 — vitest dies at startup on this |
| Node 22 | v22.23.1 present at `/opt/homebrew/opt/node@22/bin` → tests MUST run as `PATH="/opt/homebrew/opt/node@22/bin:$PATH" npm test` |
| Supabase `--linked` | **no `supabase/.temp/project-ref`** in this checkout → nothing is linked; DB reads go through the staging-scoped MCP (`cyijbdeuehohvhnsywig`). No prod DDL risk. |
| 2b target symbols | all present in `src/modules/strata/pages/StrataAdminConfigPage.tsx` (1797 lines): `ModelWeights:377` (idiom to copy) · `ModelIntegrityBand:509` · `MeasureGroups:551` · `ScorecardModelsSection:609` |

## Slice scope (per Plan Lock "PART 2b")
Model `MeasureGroups` on `ModelWeights` (draft state · editing flag · Save/Cancel · isDisabled · SectionMessage).
Per group: `+ Add measure` → ADS Select over `useKpis()` (exclude already-assigned) · weight `Textfield type=number`
(`testId=strata-measure-weight-${kpiId}`) · Remove · `required` toggle · aggregation Select over exactly
`weighted_average|sum|min|custom`. Save → one `setModelMeasures(modelId, allRowsAcrossAllGroups)` (replace-set,
FULL set) → `invalidate()`. Gate Save on every group totalling 100 — **client-side only**.
**Never** render an input for name/direction/unit/scheme (M-D0).

## Forbidden
`StrataStrategyMapPage.tsx` · creating `strata_measures` · duplicating any KPI field on the measure row ·
altering `strata_scorecard_lines` · a 5th aggregation value · server-side 100-total enforcement.

## Status
✅ BUILT · gates green · live-verified on staging. Awaiting commit approval.

## What was built
`MeasureGroups` in `StrataAdminConfigPage.tsx` became editable, modelled on `ModelWeights` exactly
(local draft · editing flag · Save/Cancel · isDisabled Save · `SectionMessage` verbatim DB error).
Read-only rendering is unchanged. New: `AGGREGATION_METHODS`/`AGGREGATION_OPTIONS` (the four M-D1
values, no fifth), `MeasureDraft`, `canEdit` prop (role-gated on `strategy_office`, matching RLS).
Section caption no longer says assigning measures is a later slice.

## Verification — live, on `catalyst-staging` (`cyijbdeuehohvhnsywig`)
The table was EMPTY (0 rows) at slice start. This slice filled it, which is what closes part 2a's gap.

| Claim | Evidence |
|---|---|
| Table filled by the new UI | 0 rows → 2 rows on B2B Sector Scorecard, written as `strategy_office` |
| Every authored field round-trips | DB: `B2B Revenue Growth=60/sum/req:false` · `Churn Rate=40/weighted_average/req:true` — the aggregation I switched and the toggle I flipped both persisted |
| `order_index` re-derived from position | DB `order_index` 0, 1 |
| Replace-set, not append | second save → still **2** rows, not 4 |
| Draft seeds from persisted rows | re-entering edit showed weights 60/30 + "Sum" preserved |
| Group verdict flips live | ✕ total 0 → ✕ 60 → ✓ 100 → ✕ 90 as typed |
| Integrity band names the failing perspective | **"✕ Financial measure weights total 90 — assign the remaining 10"** + "Cannot submit until integrity passes" — the exact anchor-05 band P5-D3 could not build |
| Save gate blocks with a VISIBLE reason | at 90: Save `disabled=true` + "Financial must total 100 before saving". Never a silent disable. |
| M-D0 held — no identity input | direction is READ per KPI: "Higher is better" (B2B Revenue Growth) vs "Lower is better" (Churn Rate) |
| M-D1 held — one vocabulary | dropdown offers exactly Weighted average · Sum · Min · Custom |
| Already-assigned KPIs excluded | after adding B2B Revenue Growth it disappeared from the picker |
| Light + dark | both verified in edit mode; tokens resolve, no bare colour |
| Console | only a React legacy-context warning from **inside `@atlaskit/select`** (library-internal, fires for any canonical `Select`); none from the builder |

Gates: tsc clean · `lint:colors:gate` 0=0 · `audit:ads:gate` no category above baseline · `lint:cre` pass ·
suite **2,426 passed / 6 failed** (the 6 = pre-existing foreign ChatDock failures) — no regression.

## Data left on staging (deliberate, per Plan Lock's self-verifying design)
B2B Sector Scorecard · Financial: B2B Revenue Growth 60 (sum) + Churn Rate 40 (weighted_average, required)
= 100. Coherent, not junk. Say the word and I'll clear it.

## Findings raised (not silently adapted)
1. **Save gate treats an EMPTY group as passing.** Plan Lock says "gate Save on every group totalling
   100"; taken literally that includes groups with no measures, which — because Save is a replace-set
   sending the FULL set — would make the first save of a part-built model impossible. Implemented to
   mirror `ModelIntegrityBand` exactly (it flags only groups that HAVE measures). Two different rules
   for the same fact would be incoherent. **Confirm or overrule.**
2. **The band's ✕ measure state is now unreachable through the UI** — the Save gate stops you persisting
   ≠100. It still guards non-UI writes (RPC/seed/other clients), which is how it was verified above.
   Not a defect; noting the tension between the 2a band and the 2b gate.
3. **Measures are editable on an APPROVED model** (role-gated only, no status gate). `ModelWeights`
   already behaves exactly this way, so this is pre-existing shipped behaviour, not something 2b
   introduced — but STRATA governance is version-based, so in-place edits of an approved model may
   warrant a status gate. Out of 2b scope; flagging for a ruling.
4. **`registry-drift` was ALREADY failing on `main`** — `def869232` (B2 freshness) added a
   `StrataFreshnessGlyph` usage without regenerating `usage-map.generated.ts`. My `npm run scan:components`
   repairs that entry alongside my own `Select` entry. The handover's "2,426/2,448 green" predates B2.
   Regenerate with `PATH=node@22 npx tsx scripts/scan-components.ts` (`npm run scan:components` fails —
   `tsx` is not on the global Node 20 PATH).
