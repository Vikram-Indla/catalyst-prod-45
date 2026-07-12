# 04 — Integration Architecture (Phase 1 data flow + API contracts)

**Feature:** CAT-STRATA-IMPL-20260712-001 · Integration Architect · read-only
**Scope:** Phase-1 surfaces — 01 Command Center, 11 My Work (NEW), 12 Scorecards Index, 13 Scorecard Detail.

> **DesignSync note:** the DesignSync MCP (`get_file` on project `e8a6bad6-…`) was NOT reachable
> in this session (only Read/Bash tools were provisioned). Per-panel data needs below are derived
> from the work-order text + the *existing page wiring* traced in code, not freshly re-read from the
> anchor DESIGN ANNOTATIONS footers. Re-confirm each panel's field list against the footer before Plan Lock.

## Canonical wiring facts
- All Phase-1 pages read cycle/period context from `StrataProvider` via `useStrataContext()`
  (`src/modules/strata/hooks/useStrata.tsx:143`). No page does local business math — engine RPCs / frozen snapshots only.
- Every data hook lives in `useStrata.tsx`; each delegates to an `*Api` object in
  `src/modules/strata/domain/index.ts`. Api object line anchors:
  `configApi:51`, `strategyApi:173`, `scorecardApi:262`, `kpiApi:332`, `executionApi:451`,
  `valueApi:745`, `lineageApi:885`, `governanceApi:1003`.

---

## Surface 1 — 01 Command Center `/strata` (`pages/StrataCommandCenterPage.tsx`)

| Panel | Hook (file:line) | Api owner | Status |
|---|---|---|---|
| Judgment band (StrataScoreRing) | `useScorecardInstances`:266 + `useScorecardCalc`:287 | scorecardApi.instances / calcResult | EXISTS |
| Trend (enterprise score) | `useEnterpriseScoreTrend`:401 | lineageApi.calcValuesForEntities | EXISTS |
| Decisions panel | `useDecisions`:512 | governanceApi.decisions (`strata_decisions`) | EXISTS |
| Attention inbox (JiraTable compact) | `useNeedsAttention(activePeriod.id)`:533 | governanceApi.needsAttention:1157 | EXISTS |
| Attention "Mine" filter | `useStrataUserId`:172 (matches `owner_id`) | supabase.auth | EXISTS |
| Value / VaR / realization | `usePortfolios`,`useValueAtRisk`,`useBenefits`,`useBenefitRealization` | valueApi / lineageApi | EXISTS |
| Derived attention (blocked deps, KPIs) | `useDependencies`:338, `useKpis`:296 | executionApi / kpiApi | EXISTS |
| AI advisory | `useAiOutputs`:523 + `governanceApi.generateAdvisory/reviewAdvisory` | governanceApi | EXISTS |
| Live/locked mode | `dataState` from `instance.status` (page L448) | scorecardApi | EXISTS |
| **Changes-since-snapshot** | — none — page does NOT import `useSnapshots`/`useSnapshotItems` | governanceApi.snapshots:1004 / snapshotItems:1008 (Api EXISTS, no hook wiring, no diff) | **GAP** |
| **Data-trust strip** | — none — page does NOT import `useDataSources`/`useUploadRuns` | lineageApi.dataSources:885 / uploadRuns (Api EXISTS, unwired) | **GAP** |

**Contract — attention inbox row (`strata_needs_attention` RPC, NOT a table):**
`{ item_type, severity, entity_type, entity_id, entity_name|null, detail, due_date|null, owner_id|null }`.
IMPORTANT: work order says "table `strata_needs_attention`" — it is an **RPC** (`typedRpc('strata_needs_attention',{p_period})`, domain L1163). Rule-driven, no seed rows.

**Changes-since-snapshot gap:** no client hook computes a diff between current live calc values and the
last locked `strata_snapshot_items` payload. `governanceApi.snapshots` + `snapshotItems` exist to source
both sides; the diff/aggregation layer (new `useChangesSinceSnapshot(cycleId, periodId)`) is **missing**.

**Data-trust strip gap:** `lineageApi.dataSources` + `uploadRuns` exist (surfaced today only on Data
Pipeline page). A trust-strip hook aggregating freshness/last-run/rejections is **missing** on Command Center.

---

## Surface 2 — 11 My Work `/strata/my-work` (NEW page)

**No page, no route, no hook exists today.** `routes.ts` `strataRoutes` (L252) has NO `myWork` builder
(the L117 `myWork` is TestHub's, unrelated). STRATA module has **zero** `ph_work_item` references.

**Data source verdict:** My Work aggregates **STRATA governance entities, NOT `ph_work_item`**:
- Primary feed: `governanceApi.needsAttention` (RPC already returns `owner_id` → role/personal home + consequence via `severity`+`detail`+`due_date`).
- Secondary: `governanceApi.decisions` (`strata_decisions`) + `governanceApi.actions` (`strata_actions`, ordered by due_date) for verb-grouped "resolve/record" rows.
- Role-sensitive default home: `useStrataRoles`:150.
- Verb actions operate on EXISTING rows via existing RPCs: `updateAction`/`updateDecision` (governanceApi L1104/1120), KPI actuals (kpiApi), `strata_calc_scorecard_instance` recalc (weight-change).

**Gaps:** (a) new `strataRoutes.myWork()` builder in `routes.ts`; (b) a `useMyWork()` aggregator hook
composing needsAttention + decisions + actions into verb groups (no single RPC returns the composite);
(c) the verb→group mapping is UI-side and undefined in code today.

### CRE CHOKEPOINT VERDICT — My Work
**Not required for the queue-view + existing-row-mutation design. Read-only aggregation + verb actions
that mutate existing strata rows do NOT create or link CRE-governed work items.**

- CRE governs work-item TYPES. ENTERPRISE-owned CRE types = `['Theme','Objective','Snapshot']`
  (`CatalystRules.ts:73`). My Work verbs (validate/resolve/record/weight-change) touch
  `strata_actions`/`strata_decisions`/`strata_kpi_actuals`/`strata_scorecard_lines` — none are CRE types,
  none are creations, none are cross-type links.
- STRATA today imports catalyst-rules **nowhere** (grep: 0 hits in `src/modules/strata`). No `filterCreatableTypes`/`canLinkTo` in the module.

**CONDITIONAL — chokepoint becomes MANDATORY if the anchor-11 queue adds any "create" or "link" verb
that produces a Theme/Objective/Snapshot or links strategy elements.** Then it MUST route through
`filterCreatableTypes` / `canLinkTo` (`@/lib/catalyst-rules`). Confirm against the anchor-11 footer:
if a "+ New" / "Link" affordance exists → CRE required; if pure queue → not required.

---

## Surface 3 — 12 Scorecards Index `/strata/scorecards` (`pages/StrataScorecardsPage.tsx`)

| Panel | Hook (file:line) | Api owner | Status |
|---|---|---|---|
| Scope-chooser cards | `useScorecardModels`:257 + `useScorecardInstances`:266 | scorecardApi.models / instances | EXISTS |
| Per-instance score | `useScorecardCalc`:287 (per InstanceRow) | scorecardApi.calcResult | EXISTS |
| Context (period names) | `useStrataContext`:143 | strategyApi | EXISTS |
| **Ranked-variance panel** | — none — no variance/rank aggregation hook | scorecardApi.calcResult gives per-instance score+status only | **GAP (derivable)** |

**Ranked-variance gap:** variance = per-instance/per-line (score − target)·weight contribution, ranked.
`calcResult.lines[].{weight,score,status_key,detail}` carries the raw material but no hook ranks
instances/lines by variance. Needs a `useRankedVariance(cycleId)` deriving from existing calc results
(no new Api/RPC required — pure client aggregation over `useScorecardInstances` + `useScorecardCalc`).

---

## Surface 4 — 13 Scorecard Detail `/strata/scorecards/:slug` (`pages/StrataScorecardDetailPage.tsx`)

| Panel | Hook (file:line) | Api owner | Status |
|---|---|---|---|
| Slug resolution | `useScorecardInstanceBySlug(slug)`:272 | scorecardApi.instanceBySlug:272 | EXISTS |
| Verdict band | `useScorecardCalc`:287 | scorecardApi.calcResult (live RPC OR frozen snapshot) | EXISTS |
| Perspective-grouped measures (weight/contribution) | `useScorecardLines`:279 + calc `linesByPerspective` | scorecardApi.lines / calcResult | EXISTS |
| Perspective names | `usePerspectives`:204 | configApi.perspectives | EXISTS |
| Composition popover / drill refs | `useKpis`:296, `useStrategyElements`:235, `useBenefits`:431 (ref resolution) | kpiApi/strategyApi/valueApi | EXISTS |
| Commentary | inline `useQuery` (page L82) | scorecardApi (inline) | EXISTS |
| Recalc (live only) | `scorecardApi` RPC via `strata_calc_scorecard_instance` | scorecardApi | EXISTS |

**Slug resolution contract:** `scorecardApi.instanceBySlug` = `strata_scorecard_instances .eq('slug', slug) .maybeSingle()`.

**FLAG — `useScorecardInstanceBySlug` is slug-ONLY, NOT dual-mode.** Work order references "CRE Grid F
useXBySlug dual-mode" (accept slug OR legacy UUID). Current impl matches `slug` only; a UUID param
returns `null` → StrataNotFound. There is **no `UuidToSlugRedirect` for `/strata/scorecards/*`** in App.tsx
and no dual-mode branch. If legacy UUID scorecard links must resolve, this is a **GAP** (either add a
UUID-branch in `instanceBySlug`/hook, or mount a redirect outside CatalystShell per the Slug Contract).

**Frozen-vs-live contract (important, already correct):** locked instances read
`strata_snapshot_items` payload (never recalc); live instances call `strata_calc_scorecard_instance`
(domain L280-327). Detail redesign must preserve this branch — do not add a recalc affordance to locked instances.

---

## Riskiest integration gap
**Changes-since-snapshot (Command Center)** — the only Phase-1 panel with NO existing hook AND requiring
a new client-side diff between live calc values and frozen `strata_snapshot_items`. It crosses the
live/locked boundary (the module's most-tested invariant) and there is no server RPC that returns the
diff, so the aggregation is net-new and easy to get wrong (double-counting, comparing against the wrong
snapshot). Second: the My-Work verb→group aggregator (net-new, no composite RPC). Third: scorecard-detail
UUID dual-mode (may be out of scope if all links are already slugs — confirm).
