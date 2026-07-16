# 11 — Karpathy Loop Log

Format per loop: Hypothesis → Experiment → Measure → Keep/Discard → Log.

## Phase 3 planning (session 011, 2026-07-14)

### K-P3-1 · Which anchors are Phase 3?
- **Hypothesis:** Phase 3 = the handover's candidate set (07·09·10·17·18·19·23·24, "governance & delivery").
- **Experiment:** Re-read HANDOFF.md build-order in full via DesignSync.
- **Measure:** HANDOFF has NO "governance & delivery" phase. Phase 3 = delivery & value (07·17·18·08·22·21);
  Phase 4 = governance & data (10·23·24·09·19·20). Handover conflated the two + dropped value anchors.
- **Keep/Discard:** DISCARD handover candidate set. Raised DRIFT-6; Vikram ruled HANDOFF-as-written (D-12).

### K-P3-2 · Greenfield or redesign?
- **Hypothesis:** Some Phase-3 surfaces are new pages.
- **Experiment:** Route/page discovery agent mapped StrataRoutes.tsx + routes.ts + pages.
- **Measure:** All 6 surfaces already have mounted pages; only `/strata/portfolio/:slug` is a net-new route
  (`usePortfolioBySlug` already exists, unused). Slug contract satisfied on all 3 tables.
- **Keep:** Treat Phase 3 as redesign-in-place + one route split. Lowers risk; drives slice order.

### K-P3-3 · Do the anchors' data needs exist?
- **Hypothesis:** The pages can be brought to anchor with existing hooks/columns.
- **Experiment:** Integration + data-safety agents mapped every UI element → table/RPC on staging.
- **Measure:** Delivery spine (17,07) fully backed. Value spine (22,08,21) partly — benefit detail backed;
  portfolio value rollups/leakage/weakest-link NOT stored (no RPC). Import (18) reconciliation
  Matched/Conflict/Unmatched + both-sides diff + 24h undo do NOT exist (only dry-run/apply created/updated/
  rejected). Assumptions have no "under strain"; cards have no SAP source, no on_hold bool, no portfolio_id.
- **Keep:** Zero-assumption rendering mandatory. Client-derive portfolio aggregates + threats ranking + card
  benefit value (thin hooks, no migration). Import anchor-18 backend gap → scope decision P3-D3.

### K-P3-4 · Overlay drill or full-page?
- **Hypothesis:** Anchor 17's row→overlay-detail needs a new overlay router.
- **Experiment:** Canonical agent checked CatalystViewBase/DetailRouter entity-kind union.
- **Measure:** Both locked to ph_issues/tasks/test entities — no STRATA host (confirms P2-D1). Building one
  reopens P2-D1. Shipped Phase-1/2 pattern = full-page slug + `?from=` (satisfies "origin preserved").
- **Keep (recommend):** Reuse full-page slug + `?from=` (P3-D1), consistent with D-2. Overlay = out of scope.

## Phase 4 planning (session 015, 2026-07-15)

### K-P4-1 · Which anchors + do they split like Phase 3?
- **Hypothesis:** Phase-4 governance/data anchors need portfolio-style route splits.
- **Experiment:** HANDOFF build-order re-read; route/page discovery agent mapped StrataReviewsPage / StrataDataPipelinePage / StrataUploadWizardPage.
- **Measure:** Phase 4 = 10·23·24·09·19·20 (governance triad + data triad). NO splits — StrataReviewsPage already
  branches on `:snapshotKey` (23 index / 10 cockpit); StrataDataPipelinePage already branches on `:runKey` (19/09);
  wizard is static (20). All **redesign-in-place**. Only anchor 24 (board pack) is a genuine NEW route + page.
- **Keep:** Redesign-in-place for 5 anchors (preserve each page's param branch); NEW route + `StrataBoardPackPage` for 24.

### K-P4-2 · StrataLifecycleStepper — build or reuse?
- **Hypothesis:** A canonical stepper exists or `@atlaskit` provides one.
- **Experiment:** Canonical agent evaluated `CatalystProgressTracker` (@atlaskit/progress-tracker, INSTALLED) + inline steppers.
- **Measure:** ADS ProgressTracker = progress bar (current|visited|unvisited only) — NO failed state, NO per-step note,
  NO dots variant → can't express the anchors' commitment/reversibility notes or the quarantine `failed` stage.
  Strong prior art = `PipelineStepper`/`StageDot` (StrataDataPipelinePage:83-151, token-pure, 4 states, connectors).
- **Keep:** BUILD `StrataLifecycleStepper` by EXTRACTING PipelineStepper→shared.tsx (variant `full`|`dots`), refactor
  DataPipeline + UploadWizard consumers (removes 2 duplicates). **Slice 4A, prerequisite for 10/23/09/20.**

### K-P4-3 · Do "reviews" exist as an entity?
- **Hypothesis:** There is a strata_reviews table backing anchors 23/10.
- **Experiment:** Integration + data-safety agents grepped src + queried staging schema.
- **Measure:** ZERO `strata_reviews` anywhere. A "review" = a snapshot + its derived decisions/actions/pack, keyed by
  `snapshot_key`. Stage/chair/cadence/"schedule review" have NO backing column.
- **Keep:** Reviews = **derived virtual entity** (P4-D1). Registry/cockpit compose over snapshots+decisions+actions+
  packs. Cut "+Schedule review"/chair/cadence (zero-assumption); derive stage transparently.

### K-P4-4 · How much of the anchor set does the backend actually support?
- **Hypothesis:** The governance/data anchors are mostly backed.
- **Experiment:** Data-safety agent confirmed 12 tables + 6 RPC signatures + 2 RPC bodies on staging (read-only).
- **Measure:** Board pack (24) = file/generation-job record, NO editorial/issue schema (biggest gap). Runs = 2-way
  valid/rejected (no quarantine tier); clustered errors + compare-with-live client-derivable; promote has no reverse
  RPC. No source→KPI/scorecard/snapshot forward-dependency table (downstream dependents backward-derivable only).
  Upload wizard (20) best-backed (staging_rows.raw + template contract). 
- **Keep:** Honest scoped build (P4-D2…D8): render on the existing backend, zero-assumption gaps, split anchor-24
  editorial builder + Issue to a separate backend feature (own migration + Plan Lock).

## Measures builder part 2b (session 025, 2026-07-16)

### K-M-1 · Does the Save gate's literal reading survive contact with the replace-set contract?
- **Hypothesis:** "gate Save on every group totalling 100" (Plan Lock) is directly implementable as written.
- **Experiment:** traced it against the two shipped facts — `setModelMeasures` is a REPLACE-SET (sends the full set
  across every group), and `ModelIntegrityBand` (2a) flags only groups that HAVE measures.
- **Measure:** the literal reading is unimplementable in practice: with 3 empty groups, a model could never take its
  FIRST save (you'd have to fill every perspective in one sitting), and it would contradict the band's own rule — two
  different answers to "is this group OK?".
- **Keep:** gate on groups that HAVE measures; mirror the band exactly. RAISED as finding 1 for ratification rather
  than silently adapted. Consequence logged honestly: the band's ✕ measure state is now unreachable via the UI (it
  still guards non-UI writes — which is how it was verified).

### K-M-2 · Was the suite baseline ("2,426 green, 6 ChatDock failures") actually true at HEAD?
- **Hypothesis:** the 7th failure in my first run was mine.
- **Experiment:** ran the suite, attributed each changed line of `usage-map.generated.ts` to its component key, then
  `git log -S` on the foreign entry.
- **Measure:** only ONE of the two stale entries was mine (`Select` ← my import). The other
  (`StrataFreshnessGlyph` ← `StrataDataIntegrationPage`) landed in `def869232` (B2 freshness) — earlier this feature,
  never regenerated. **`registry-drift` was already red on `main`;** the recorded baseline predated B2.
- **Keep:** regenerate the map (repairs both). Do not inherit a stated baseline without re-running it — the same
  "true observation, wrong conclusion" pattern the handover warns about, this time in a number rather than a claim.

## K-P4-5 · Slice 4B — is the review registry derivable honestly without a strata_reviews table? (2026-07-15)
- **Hypothesis:** anchor 23's review registry can be composed from snapshots + decisions + actions + board-packs
  (P4-D1), with "review == current non-superseded snapshot" as the key, and lifecycle/stage derived transparently.
- **Experiment:** probed staging schema + rows (2 snapshots both locked, 0 superseded, 16 periods, 2 decisions,
  3 actions, 3 board-packs); built the derivation; live-verified light+dark.
- **Measure:** 2 honest review rows render with correct derived lifecycle — SNAP-1 (0 decisions, 1 pack) shows
  readiness✓ snapshot✓ decisions○ actions○ pack✓; SNAP-1001 shows decisions✓ + actions●(1 of 2 open, not overdue)
  + pack✓. Stage lozenge derives from period.close_status. No fabricated readiness-only rows (no draft snapshots exist).
- **Keep:** derived model (DRIFT-9, within P4-D1). Anchor's period-scheduled readiness rows require the deferred
  `strata_reviews` entity — out of Phase 4 scope. Thin `useAllBoardPacks`/`boardPacksAll` (plain select) for the pack dot.
