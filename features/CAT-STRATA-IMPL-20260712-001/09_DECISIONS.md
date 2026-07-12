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
  = regression. Trend chart is a working panel. → **PROPOSED: keep both** (recommend), pending a
  Vikram decision to keep or remove-to-match-anchor. See DRIFT-2 in `08_DRIFT_LOG.md`.

## Status update (D-1…D-6)
D-1…D-6 CONFIRMED by Vikram 2026-07-12 ("proceed with all recommended decisions"). D-7 applied.
