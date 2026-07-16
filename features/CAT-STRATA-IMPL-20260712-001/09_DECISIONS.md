# 09 — Decisions

Format: ID · statement · status (PROPOSED / CONFIRMED / REJECTED) · rationale.

## CONFIRMED (by user, this session)
- **D-0 · Sidebar + top nav = visual-frozen, IA rename allowed.** No restyle/token-swap/layout
  shift; Phase-0 IA relabel + additive routes + legacy redirects permitted. (User, 2026-07-12.)

## PROPOSED (need Vikram ruling before the relevant slice — recommendation first)
- **D-1 · Keep `StrataPageShell` as the STRATA canonical shell; do NOT migrate STRATA pages to
  the literal Grid E `CatalystListPageLayout`/`AtlaskitPageShell`.** Rationale: proposal §18
  explicitly sanctions "StrataPageShell → ProjectPageHeader(hubType strata) + HubSurface. No
  change." StrataPageShell already wraps ProjectPageHeader, so breadcrumb/Grid-E intent is met.
  → **Recommend CONFIRM** (design authority overrides the generic Grid E for STRATA). Log, don't refactor.
- **D-2 · Defer drawer-first drill (CatalystViewBase panel mode) out of Phase 1; ship `?from=`
  origin-preservation with full-page nav now.** Rationale: §18 wants drawer drill via
  CatalystViewBase, but CatalystViewBase has zero STRATA table-union (`coverItemTable`/
  `flagContext.tableName` have no strata tables) — wiring it is a real API-union extension, its
  own slice. `?from=` + "Back to [origin]" satisfies the acceptance ("origin preserved") without it.
  → **Recommend CONFIRM defer**; raise CatalystViewBase-STRATA integration as a separate slice.
- **D-3 · Compute changes-since-snapshot client-side** (diff `strata_snapshot_items` vs live calc),
  no new server RPC, no migration, for Phase 1 Command Center. → **Recommend CONFIRM.**
- **D-4 · Drop `StrataLifecycleStepper` from Phase 0.** It is consumed by NO Phase-1 page (data
  runs/reviews = Phase 4). Karpathy: don't build unused. Build it when first consumed, and verify
  `CatalystProgressTracker` (src/components/ads) suitability first. → **Recommend CONFIRM.**
- **D-5 · My Work is read/act-only over existing STRATA governance entities → NO CRE chokepoint.**
  Verbs = Validate/Submit/Resolve/Act/Approve; none create or link a governed work-item type.
  Confirmed against anchor 11 + integration architect. → **Recommend CONFIRM** (revisit only if a
  future "+ New/Link governed type" verb is added).
- **D-6 · Add dual-mode (slug OR UUID) to `useScorecardInstanceBySlug` to satisfy CRE Grid F4.**
  Currently slug-only; a legacy UUID returns null with no redirect. Small, in Scorecard Detail slice.
  → **Recommend CONFIRM** (or explicitly waive F4 for STRATA if legacy UUID links can't exist).

- **D-7 · Defer `StrataChainStrip` from slice 0B to Phase 2 (first consumer).** Anchor 01 (Command
  Center) contains NO chain strip; the entity-lineage chain (Strategy→Initiatives→Projects→source)
  belongs to the Phase-2 detail pages (KPI Detail anchor 06, Element Detail anchor 14), where working
  prior art already exists inline in `StrataEvidencePage.tsx:106-338`. No Phase-1 page consumes it, and
  building it well means refactoring a Phase-2 page. Same defer-until-consumed rationale as the
  Vikram-approved D-4 (stepper). Slice 0B therefore ships `StrataSnapshotBand` only.
  → **Applied** (flagged for override). Extract `ChainItem`/`ChainEmpty` → canonical `StrataChainStrip`
  when Phase 2 KPI/Element detail is built.

- **D-8 · CC keeps the enterprise-score trend chart + AI-advisory panel** (anchor 01 shows neither).
  The AI advisory is a governed feature (F-GOV-009, reviewer≠author enforced); removing it silently
  = regression. Trend chart is a working panel. → **CONFIRMED by Vikram 2026-07-13: keep both.**
  See DRIFT-2 in `08_DRIFT_LOG.md`.

## Status update (D-1…D-6)
D-1…D-6 CONFIRMED by Vikram 2026-07-12 ("proceed with all recommended decisions"). D-7 applied.

## CONFIRMED (session 004 — 1C, Vikram)
- **D-9 · Scorecards Index = full anchor-12 card scope-chooser, split into 1C-1 + 1C-2.** 1C-1 = instance
  cards (StrataScoreRing 64px + band + scope + Δ-vs-prior + coverage footnote, CEO accent border,
  enterprise-first order, click→detail) + judgment one-liner + skeleton/role-aware-empty/restricted/docTitle;
  drop the Models grid (models live in Model Builder, anchor 05). 1C-2 = ranked-variance panel. Each ≤2h,
  one commit each. Resolves DRIFT-4. (Vikram, 2026-07-13.)
- **D-10 · Ranked panel basis = worst-first by server score + band + Δ-vs-prior where a prior period
  exists (else nothing).** "Variance to plan" is NOT client-derivable (no instance-level plan/target;
  would need a rollup RPC) → raised as a backend data-gap ticket, not faked. (Vikram, 2026-07-13.)

## CONFIRMED (session 011 — Phase-3 scope, Vikram 2026-07-14)
- **D-12 · Phase 3 = HANDOFF "delivery & value" as written: anchors 07·17·18·08·22·21.** Resolves
  DRIFT-6 (handover 07 misread HANDOFF's phase labels). Order = delivery spine first (17 list → 07
  detail → 18 import), then value spine (22 portfolio index → 08 portfolio detail → 21 benefit detail).
  Governance/data anchors (09·10·19·20·23·24) deferred to Phase 4 (own Plan Lock). (Vikram, 2026-07-14.)

- **P3-D1…D8 · ALL CONFIRMED (Vikram, 2026-07-14, with Plan-Lock approval).** D1 full-page `?from=` drill
  (no overlay router); D2 client-derived portfolio aggregates (no migration); **D3 anchor-18 scoped-down to
  existing dry-run/apply backend — no fake Matched/Conflict/Unmatched, no undo affordance; full
  reconciliation engine = separate backend initiative (Phase 4/backlog)**; D4 map health band keys faithfully;
  D5 StrataValueBar additive variants; D6 render DB assumption status (no invented "under strain"); D7
  portfolio page split (index `/strata/portfolio`, detail `/strata/portfolio/:slug`, benefit unchanged);
  D8 attestation via StrataDecisionModal `description` + `validateBenefitValue` SoD. See `03_PLAN_LOCK_PHASE3.md`.

## CONFIRMED (session 004 — plan-variance backend, Vikram 2026-07-13)
- **D-11 · "Vs plan" = uncapped-achievement rollup, NOT targets-as-actuals.** The task-proposed
  `strata_calc_scorecard_plan_variance` naive design (roll up targets as if actuals) is DEGENERATE —
  the engine scores actual/target so target/target = 100 for every KPI, a constant. Since targets are
  per-period, plan = 100 on the achievement scale; the engine's cap-at-100 destroys the above-plan
  signal. Shipped: read-only RPC rolling up UNCAPPED achievements ([0,150] engine clamp), variance =
  plan_index − 100, signed like anchor 12. Locked instances → has_data=false ('locked_snapshot');
  benefit lines excluded (no per-period plan concept); no provenance writes. **Supersedes the D-10
  interim ranked-panel basis** (worst-score-first) — panel now ranks by true vs-plan variance.

## CONFIRMED (session 015 — Phase-4 Plan Lock, Vikram 2026-07-15 "Approve — start 4A"; P4-D0…D8 all CONFIRMED as recommended). See `03_PLAN_LOCK_PHASE4.md`.
- **P4-D0 · Build `StrataLifecycleStepper` first** (extract `PipelineStepper`/`StageDot`→shared.tsx, variant full|dots;
  refactor DataPipeline + UploadWizard). @atlaskit progress-tracker rejected on API-fit. → Recommend CONFIRM.
- **P4-D1 · Reviews = derived virtual entity** (no `strata_reviews` table; spine = snapshots keyed by snapshot_key).
  Cut "+Schedule review"/chair/cadence (no backing); derive stage transparently. → Recommend CONFIRM.
- **P4-D2 · Anchor 24 board pack SPLIT** — ship read-only pack preview + Present mode overlay + Print/PDF (reuse
  existing) on snapshot data; DEFER editorial builder + Issue (freeze/distribution/immutable) to a separate backend
  feature (migration + own Plan Lock). No fabricated drafts/distribution. → Recommend CONFIRM.
- **P4-D3 · Anchor 09 run detail 2-way** (Accepted/Rejected; no invented Quarantine); clustered errors client GROUP BY
  error_code; promote via existing `strata_promote_run`, reversibility framed honestly. → Recommend CONFIRM.
- **P4-D4 · Downstream dependents honest** — backward-derivable named KPIs only (kpisForSource); labeled gap for
  scorecard/snapshot forward impact; never fabricate. → Recommend CONFIRM.
- **P4-D5 · Compare-with-live = client diff** of snapshot_items.payload vs live calc (no RPC). → Recommend CONFIRM.
- **P4-D6 · Upload wizard 7-step + AUTO/CONFIRM/DECIDE mapping; stages run then hands off to run detail (09) for
  validate/promote**; mapping-memory write DEFERRED (no path). Uses lineageApi staging (NOT importExecutionBatch). → Recommend CONFIRM.
- **P4-D7 · Promote "reversible" is UI framing only** (no reverse RPC; pending-attestation ≠ committed). → Recommend CONFIRM.
- **P4-D8 · Freshness glyph parity** — promote KpiFreshnessCell→shared; source freshness derived from latest run
  completed_at per data_source_id. → Recommend CONFIRM.

---

## Phase 5 (configuration & system states) — APPROVED by Vikram 2026-07-16 ("approved, implement full phase 5")
Plan Lock `03_PLAN_LOCK_PHASE5.md` approved at `3e215d4ed`. All decisions ratified as recommended:
- **P5-D0 CONFIRMED** — config landing added to bare `/strata/admin` (domain cards + approval band + change log);
  the 12-tab page stays reachable via `:section` (transitional). Shipped 5A `4ae22c344`.
- **P5-D1 CONFIRMED** — measurement domain page = the governed-editor shell (left section-nav + list + rail) reused by
  04/05/25. Shipped 5B `18627efca`.
- **P5-D2 CONFIRMED** — impact preview = CLIENT-derived usage counts + immutable-history guarantee; the anchor's
  server-calculated score-shift has no RPC and is rendered as a labelled gap, never a number. Shipped 5B.
- **P5-D3 CONFIRMED (scoped-down)** — authoring writes exist only for perspectives + model weights + roles, so:
  threshold band editing, model draft-create, model measure-level authoring, preview-with-data, version diff, and data-source
  register/retire are DEFERRED and labelled. Shipped 5C `5e4ebc65c` / 5D `56082a288` / 5E `a57670444`.
- **P5-D4 CONFIRMED** — View-as = read-only client preview + persistent banner; SoD stays DB-enforced. **Consequence
  discovered at build time:** there is no SoD table/field/check-RPC, so the anchor's per-row CLEAN/GUARDED/CONFLICT column
  is NOT rendered (a fabricated "CLEAN" asserts a check that never ran) — deferred with a labelled note. No audit-write RPC,
  so View-as states plainly it is not audit-logged. Shipped 5F `18bae3c92`.
- **P5-D5 CONFIRMED (split)** — canonical `StrataNotFound` + `StrataRestricted` extracted and wired (incl. unknown
  `/strata/admin/:section`, which used to fall silently to tab 0). **Notification landing SPLIT to 5G-2 (deferred)** under
  the Plan Lock's >2h split rule — needs entity_id→slug resolution per entity type (the slug contract forbids UUID routes),
  a provenance band on every object page, and expired-state detection. Shipped 5G `aedfcb6fd`.
- **P5-D6 CONFIRMED** — no migration this phase. Held: the only DB additions were two plain-select readers
  (`allModelPerspectives`; `email` on the existing profiles select). No new RPC was needed or invented.
