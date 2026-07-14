# 03 — PLAN LOCK · CAT-STRATA-IMPL-20260712-001 · Phase 3 (delivery & value)

> STATUS: **APPROVED — Vikram 2026-07-14: "Approve the Plan Lock; confirm P3-D3 scoped-down and start
> 3A-1." Execution authorized on `strata/impl-phase01`.** All proposed decisions P3-D1…D8 CONFIRMED (P3-D3
> = scoped-down import on the existing dry-run/apply backend; full reconciliation engine deferred to a
> separate backend initiative). Slice order: 3A-1 (START HERE) → 3A-2 → 3B-0 → 3B-1 → 3B-2 → 3B-3 → 3C.
> Scope: STRATA design-pack **Phase 3** per HANDOFF build-order "delivery & value" (D-12, resolves
> DRIFT-6): anchors **17, 07, 18, 08, 22, 21**. Governance/data (09·10·19·20·23·24) = Phase 4, own Plan Lock.
> Grounded in: HANDOFF.md build-order (re-read in full, session 011); all 6 Phase-3 anchors read IN FULL
> via DesignSync; 4 parallel discovery agents (canonical / routes / integration / data-safety, read-only on
> repo + staging); Phase-0/1/2 decisions D-0…D-12. Digest: `discovery/06_phase3_discovery.md`; loops:
> `11_KARPATHY_LOOP_LOG.md`.

## Objective
Bring the six delivery & value surfaces to their anchors — the execution-truth spine (list → card → import)
and the value-realization spine (portfolio index → portfolio detail → benefit detail, "completion ≠
benefit") — reusing canonical components + `--ds-*` tokens only, **redesigning existing pages in place**
(one net-new route), with **zero-assumption rendering** wherever the schema is thinner than the anchor, and
**leaving `StrataStrategyMapPage.tsx` byte-for-byte unchanged**.

## Surfaces (all REDESIGNS of existing pages — confirmed by discovery)
| Anchor | Route | Page (LOC) | New route? |
|---|---|---|---|
| 17 Project Cards List | `/strata/execution` | `StrataExecutionPage.tsx` (1180) | no |
| 07 Project Card Detail | `/strata/execution/:slug` | `ProjectCardDetailView.tsx` (801) | no |
| 18 Import & Reconciliation | `/strata/execution/import` | `StrataExecutionImportPage.tsx` (1015) | no |
| 22 Portfolio Index | `/strata/portfolio` | `StrataPortfolioVmoPage.tsx` (1142) → split | no (repurpose) |
| 08 Portfolio Detail | `/strata/portfolio/:slug` | promote VMO body → `PortfolioDetailPage` | **YES (1 route + builder)** |
| 21 Benefit Detail | `/strata/portfolio/benefits/:slug` | `BenefitDetailSection` in VMO page | no |

## "Done" (Phase 3)
- **17** theme-grouped JiraTable with strategic-contribution columns (Card·source · ↑Objective · Health
  lozenge · Forecast Δ · Benefit at stake · Blockers); filter bar + saved views; row→full page (`?from=`);
  sync-failure/on-hold/empty/skeleton states. **07** CatalystViewBase-anatomy (StrataPageShell 2-col):
  strategic-role panel first → Health&forecast → unified "What threatens the forecast" (ranked) → Milestones;
  right rail Details/Source System/Value Contribution + permanent "completion ≠ benefit" callout; read-only
  for viewer. **18** anchor layout on the EXISTING dry-run/apply backend, rendered honestly (see P3-D3).
- **22** portfolio index: value-by-stage small multiples (shared scale) + ranked-by-leakage JiraTable +
  weakest-link, row→08. **08** portfolio detail: value-waterfall hero + benefits table + gates as decision
  briefs. **21** benefit detail: verdict band + value stages + assumptions (break indicators) + attribution +
  attestation history + IN-THE-CHAIN rail + confidence; Validate → SoD attestation modal.
- Every route: skeleton/empty/no-results/partial/error(per-panel)/restricted states, both themes,
  keyboard paths, grayscale-distinguishable. Both ADS gates GREEN (baseline 19799 unchanged or ratcheted
  down); `lint:cre` green. **Map zero-change diff passes.**

## Non-scope (forbidden this phase)
Phase-4 governance/data anchors. ANY change to `StrataStrategyMapPage.tsx` / map graph/inspector/filters/
legend/edges. Sidebar/top-nav restyle. New design tokens. A STRATA overlay detail-router (P3-D1 → full-page
`?from=` instead). A reconciliation engine — import-run ledger / conflict model / 24h-undo RPC (P3-D3: not
built this phase; render honestly). New portfolio-value rollup RPC unless P3-D2 flips to RPC. Inventing
`attestation_status`, `on_hold` bool, `portfolio_id` on card, SAP source, or an "under strain" assumption
state that has no DB backing (zero-assumption).

## Canonical components (reuse-first — verified by discovery)
Reuse as-is: `JiraTable` (grouped `RowGroup` + `density="compact"` + selection + `BulkFooterBar` + cell
factories + `overflowX`), `StrataStatStrip`, `StrataChainStrip`, `StrataSnapshotBand`, `StrataDecisionModal`
(attestation body via `description:ReactNode` + `onConfirm` SoD contract), `StrataPageShell`/
`ProjectPageHeader(hubType="strata")`/`HubSurface`, `StrataExecutionHealthLozenge`, `StrataBandLozenge`,
`StrataScoreRing`/`BandBar`, `fmtSarCompact`, `useBandResolver`, `useStrataRoles`, `ProjectCardDetailView`,
plus existing hooks (`useProjectCards`/`BySlug`, `useMilestones`, `useDependencies`, `useRisks`,
`usePortfolios`, `usePortfolioBySlug`, `useBenefits`, `useBenefitBySlug`, `useBenefitValues`,
`useAssumptions`, `useGateInstances`, `useValueAtRisk`, `useBenefitRealization`, `useBenefitProjectCards`).
Extend (additive, NOT new component): **`StrataValueBar`** hero + small-multiple variants (P3-D5).
Build NEW: **`PortfolioDetailPage`** (route split) + `Routes.strata.portfolioDetail`. Thin additive hooks
(no migration): `useCardBenefitValue(cardId)`, portfolio-aggregate wrapper, unified-threats merge+rank,
attestation-history assembler.

## PROPOSED DECISIONS (need Vikram ruling before the gated slice — recommendation first)
- **P3-D1 · Detail drill = full-page slug route + `?from=` origin (NOT a new overlay detail-router).**
  Anchor 17 shows row→overlay preserving list; `CatalystViewBase`/`DetailRouter` are locked to
  ph_issues/tasks/test entity-kinds (no STRATA host — confirms P2-D1), so an overlay = a new subsystem +
  reopening P2-D1. Shipped Phase-1/2 pattern (`?from=` + "Back to [origin]") already satisfies the
  acceptance "origin preserved". → **Recommend CONFIRM** (same rationale as D-2).
- **P3-D2 · Portfolio value aggregates (planned/forecast/realized/validated/leakage/weakest-link) =
  client-derive over each portfolio's `strata_benefit_values`, NO migration.** `strata_portfolios` stores
  only `value_target`; no rollup columns/RPC. Client aggregation is honest and truthful (dash where a
  `value_kind` row is absent). Cost: N benefit-value queries per portfolio on the index. → **Recommend
  CONFIRM client-derive**; a `strata_calc_portfolio_value` rollup RPC is a later optimization, not a
  Phase-3 blocker. (If Vikram wants the RPC now, it becomes backend slice 3B-0 + migration.)
- **P3-D3 · Anchor 18 scope = redesign to the anchor LAYOUT on the EXISTING `strata_import_execution_batch`
  dry-run/apply backend only.** Render honestly: summary strip from `{created,updated,rejected}` (NOT a
  fabricated Matched/Conflict/Unmatched three-way — that model doesn't exist); NO both-sides conflict diff
  and **NO "undo (23h left)" affordance** (no import-run ledger / revert RPC exists). The full reconciliation
  engine (import-run ledger + conflict model + both-sides diff + 24h-undo RPC) is a **separate backend
  initiative**, flagged for Phase 4/ backlog, NOT this phase. → **Recommend CONFIRM scoped-down**; if the
  full engine is required now, 18 splits out as its own multi-slice backend feature (out of a 2h UI slice).
- **P3-D4 · Health lozenge = map `calculated_health` band keys faithfully via `StrataExecutionHealthLozenge`
  (`on_track|minor_delay|major_delay|on_hold|not_started|not_available`).** The anchor's "BLOCKED/WATCH"
  labels have NO DB backing — do not invent them; render the governed band key the data carries (health is a
  data-driven band, not a fixed enum). → **Recommend CONFIRM.**
- **P3-D5 · `StrataValueBar` hero + small-multiple = additive props on the existing component** (`variant`/
  `height`/`scale`), not a new component (canonical-proof: it's the same visual, one consumer today). →
  **Recommend CONFIRM.**
- **P3-D6 · Assumption "UNDER STRAIN" — render the DB status (`holding`/`broken`/`open`/`retired`); do NOT
  invent "under strain".** If Vikram wants the strain state, define a threshold rule (e.g. confidence band)
  or a migration adding the enum value — flag before building. → **Recommend CONFIRM render-DB-status.**
- **P3-D7 · Portfolio page split:** index (list of portfolios) stays at `/strata/portfolio`; the current
  single-portfolio VMO body is promoted to `PortfolioDetailPage` at new `/strata/portfolio/:slug` (driven by
  `usePortfolioBySlug`); benefit detail stays at `/strata/portfolio/benefits/:slug`. Splitting the 1142-LOC
  `StrataPortfolioVmoPage`. → **Recommend CONFIRM.**
- **P3-D8 · Attestation modal = extend `StrataDecisionModal` via `description:ReactNode` (a small
  `StrataAttestationDiff` block: claimed vs prior/plan + evidence links + SoD notice), keeping the
  `validateBenefitValue` SoD contract.** No benefit-level `attestation_status` invented — derive state from
  `strata_benefit_values.validation_status`; "attestation history" = the value rows (no per-attestation note
  log exists → omit the note column honestly or show validation_note where present). → **Recommend CONFIRM.**

## Slices (each ≤ 2h; one commit; stop/split rule per CLAUDE.md). Order: delivery spine → value component → value spine.

### Slice 3A-1 — Project Cards List (anchor 17) · `StrataExecutionPage.tsx` (list mode)
Theme-grouped JiraTable (`groups`, `meta`=count) with strategic-contribution columns: Card·source
(name + `source_system`·`last_synced_at`) · ↑Objective (via `objective_element_id`→elements) · Health
(`StrataExecutionHealthLozenge`, P3-D4) · Forecast Δ (`forecast_variance_days`, tone by sign, tabular) ·
Benefit at stake (`useCardBenefitValue`, fmtSarCompact, dash when none) · Blockers (open `is_blocker`
count + client-derived age). Filter bar (Group:Theme · Health · Portfolio · Blocked-only) + Saved views
(reuse `useSavedViews` pattern, entity 'project_card' — or reuse existing execution filters if a saved-view
table row-type isn't wanted; confirm at slice start). States: group+row skeleton; empty→Import&reconcile;
sync-failure row (danger, card never hidden); no-results summary+clear; on-hold dimmed + HOLD lozenge kept
in place; <1280 Benefit folds under Objective. Row click → full page (`?from=`). New: `useCardBenefitValue`.

### Slice 3A-2 — Project Card Detail (anchor 07) · `ProjectCardDetailView.tsx` — SPLIT if >2h
- **3A-2a** Layout to CatalystViewBase-anatomy (StrataPageShell + 2-col grid, left body 1fr + 360px rail):
  strategic-role panel FIRST (prose + objective/affects-KPIs/benefit/gate chain links) → Health & forecast
  (progress %, baseline/forecast end, variance, source; baseline-vs-forecast bar) → Milestones table. Right
  rail: Details field rows (sponsor/lead/stage/portfolio-via-membership/budget/on-hold-derived) · Source
  System (source_system+source_key+last_synced_at + "View reconciliation →") · Value Contribution
  (`useCardBenefitValue`: planned/forecast/realized + permanent **"completion ≠ benefit"** danger callout).
- **3A-2b** Unified **"What threatens the forecast"** — client merge of `useMilestones` (at-risk) +
  `useDependencies` (blockers) + `useRisks`, kind as a lozenge (BLOCKER/DEPENDENCY/RISK/MILESTONE), ranked by
  client-derived schedule impact (dates; risks with no schedule date sort last / impact "—"). Read actions
  (Open in Jira) visible; consequential (unlink/archive/rebaseline) in ⋯ with consequence-framed confirms;
  viewer read-only.

### Slice 3B-0 — `StrataValueBar` hero + small-multiple variants (P3-D5) [prerequisite for 3B-2/3/4]
Additive `variant`/`height`/`scale` props on `shared.tsx:170`; refactor the single existing consumer
(`StrataPortfolioVmoPage:343`) behavior-preserving (diff before/after — no visual change to the current use).

### Slice 3B-1 — Benefit Detail (anchor 21) · `BenefitDetailSection` (redesign in place)
Verdict band (value-position prose + "SAR X awaits attestation") + 4-stage value bars (`useBenefitValues`)
→ Assumptions (`useAssumptions`, status lozenge per DB value P3-D6, evidence + KPI link) → Attribution
(`attributionRules` jsonb split, defensive) → Attestation history (from benefit_values: period/claimed/
verdict/by; note where present) + IN-THE-CHAIN rail (objective/delivery/measured-by/gate) + Confidence.
Validate → `StrataDecisionModal` + `StrataAttestationDiff` in `description` (P3-D8), `valueApi.
validateBenefitValue` (SoD DB-enforced), recompute realization/VaR only after a validated realized value.
States: over-delivery success framing; no-claims planned-only; locked snapshot band; <1100 rail folds.

### Slice 3B-2 — Portfolio Detail (anchor 08) · NEW route + `PortfolioDetailPage` (P3-D7)
Add `Routes.strata.portfolioDetail(slug)` (routes.ts) + `portfolio/:slug` route (StrataRoutes.tsx, before
`*`); promote VMO body to `PortfolioDetailPage` driven by `usePortfolioBySlug`. Value-position hero
(leakage headline + `StrataValueBar` hero, portfolio aggregate P3-D2) + Benefits table (JiraTable, sorted by
leakage: Benefit · planned/forecast/realized/validated · confidence text+level · attestation-from-values) +
Gates (decision-context list + `StrataDecisionModal` → `valueApi.decideGate`). Restricted/locked/empty.

### Slice 3B-3 — Portfolio Index (anchor 22) · `/strata/portfolio` (repurpose to real index)
Replace the single-portfolio-at-index body with a portfolios list: leakage-concentration sentence +
value-by-stage **small multiples** (`StrataValueBar` small-multiple, shared scale, P3-D2 aggregate per
portfolio) + ranked-by-leakage JiraTable (Portfolio+owner · planned · forecast · leakage · validated ·
weakest-link) → row click `Routes.strata.portfolioDetail`. States: bar skeletons; restricted out-of-scope
named-but-unlinked; locked snapshot; <1100 stack. (Depends on 3B-2's route existing.)

### Slice 3C — Import & Reconciliation (anchor 18) · `StrataExecutionImportPage.tsx` (P3-D3 scoped)
Anchor layout on the existing `importApi.importExecutionBatch` dry-run/apply RPC: DRY RUN header + summary
strip (StrataStatStrip: created/updated/rejected + "nothing written until you apply") + per-row validation
table (source row · verdict · errors/warnings · create/update action) + Apply = single commit + honest
commitment strip (NO undo affordance — none exists; state idempotent re-import only). States: match-run
failure SectionMessage+retry (previous preserved); partial apply per-row errors; empty→Config; restricted
read-only dry-run, apply disabled with owning role named; <1100 stack. **Gated on P3-D3** — if Vikram wants
the full reconciliation engine, 3C is replaced by a separate backend feature (own Plan Lock).

## Files forbidden (do not touch)
`src/modules/strata/pages/StrataStrategyMapPage.tsx` + its graph/inspector/edge/filter/legend deps.
`EnterpriseSidebar.tsx` styling; top-nav styling. Non-STRATA OKR domain (`src/hooks/useKeyResults.ts`/
`useObjectives.ts`, `src/components/forms/KeyResultDialog.tsx`). `CatalystViewBase`/`CatalystDetailRouter`
entity-kind unions (P3-D1 — do not fork to add STRATA kinds this phase).

## UI/UX rules (enforced every slice)
ADS `--ds-*` tokens only (no hex/rgb/hsl/Tailwind color util/named color/local map/hex fallback);
font-weight ∈ {400,500,600,653,700} (653 not 650); `var(--ds-space-*)` for new spacing. Color never alone
(lozenges carry words; bars add ▲▼/leakage danger). Layout-matched skeletons; per-panel SectionMessage;
role-aware empty; explained restricted (never bare 403). Context spine on 100% of routes. Escape returns
focus. 32/44px targets. prefers-reduced-motion. `?from=` on every evidence/detail drill. Completion ≠
benefit wherever delivery % and value co-appear; counts labeled; overdue = "n days overdue"; SAR via
fmtSarCompact; tabular-nums on numerics.

## Data / backend rules
NO migration expected this phase (P3-D2 client-derive; P3-D3 existing RPC only). Wire per verified
ownership: `importExecutionBatch`→`importApi`; VaR/realization DISPLAY→`lineageApi.latestCalc` (never the
recompute RPC in render); `benefitProjectCards`/`validateBenefitValue`/`decideGate`/`assumptions`/
`attributionRules`/`portfolioBySlug`/`benefitBySlug`→`valueApi`; `projectCards`/`milestones`/`dependencies`/
`risks`→`executionApi`. RLS unchanged; every write surfaces server rejection text (§17). SoD DB-enforced
(`strata_validate_benefit_value`). ZERO-ASSUMPTION: render dash/nothing where a field is absent (SAP source,
on_hold bool, portfolio_id, attestation_status, "under strain", schedule-impact, portfolio rollups) — never
a wrong default. FLAG-BEFORE-BUILD if any slice turns out to need a migration.

## Integration / wiring
Delivery = `executionApi` + `importApi` + thin `useCardBenefitValue`. Value = `valueApi` +
`lineageApi.latestCalc` (display) + portfolio-aggregate wrapper. `?from=` via `Routes` builders only. New
builder `Routes.strata.portfolioDetail`.

## Parallel execution plan
3B-0 (StrataValueBar variants) precedes 3B-1/2/3. 3B-2 (route) precedes 3B-3 (row→detail). Delivery spine
(3A-1, 3A-2) is independent of the value spine — may run in isolated worktrees per the concurrent-session
rule. One slice = one commit. Branch stays `strata/impl-phase01` (or new `strata/impl-phase03` off
origin/main — decide at approval).

## Screenshot + probe acceptance (QA)
Per slice, light+dark, 1440/1024/640: (1) DOM/DB probe proving function (not screenshots); (2) ADS + CRE
gates green; (3) grayscale-distinguishable states; (4) keyboard-only path (validate/decide-gate/apply where
present). **Map baseline:** screenshot + behavior probe of `/strata/strategy/map` and diff after each slice —
zero visual/behavioral change is a HARD gate (even though no Phase-3 surface imports the map).

## Validation commands
`npx tsc --noEmit` · `npm run lint:colors:gate` · `npm run audit:ads:gate` · `npm run lint:cre`
(Vitest can't run — verify via tsc + gates + live DOM/screenshot). Merge to main via temp-worktree flow
(gates re-run on merged tree). Verify staged set (`git diff --cached --name-status`) before every commit
(GitHub Desktop auto-committer may be active); `git log --oneline -3` after.

## Stop conditions
Any ADS/CRE gate regression; any map diff ≠ zero; any slice exceeding 2h (split); any anchor verb needing a
migration (raise before adding — esp. import reconciliation/undo, portfolio rollup RPC, assumption state,
attestation entity); any PROPOSED decision (P3-D1…D8) unresolved for the slice it gates; any field the
schema can't back honestly (render dash + flag, never a wrong default).

## Drift / rebaseline
Re-read the slice's anchor in full at slice start. If it contradicts this plan, log to `08_DRIFT_LOG.md`
and stop for re-decision — do not silently adapt (cf. DRIFT-4/5/6). Anchor 18's designed reconciliation
engine is a KNOWN gap vs backend (P3-D3) — the honest scoped-down build is the plan, not a drift.

## Open debt carried (do not lose)
1. Prod migrations `20260713100000` + `20260713110000` — committed + staging-ledgered, prod-parked (no prod
   access). Apply on next prod run (disposable dir, execute_sql + explicit ledger INSERT).
2. Backend defect `task_65642237` — `strata_promote_element` references dropped `strata_play_charters`.
3. Phase-4 = governance & data (09·10·19·20·23·24) — own Plan Lock.
