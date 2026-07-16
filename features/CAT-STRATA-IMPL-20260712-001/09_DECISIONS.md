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
- **P5-D5 addendum (5G-2 SHIPPED `ceb99e56f`)** — the notification landing split was resolved, not dropped. The blocker
  ("entity_id is a UUID and routes are slug-only") was real but not fatal: probing staging showed each entity_table hops
  id→slug, and the same hop yields the resolution state, so the expired variant came nearly free. No migration, no new RPC
  (P5-D6 held). One seeded decision is orphaned (null snapshot) → the bell falls back to the area landing rather than build
  a broken link. Lesson: probe the data before accepting a stated constraint as a scope boundary — the bell's own header
  comment had encoded the same wrong conclusion.

---

## Measure-level authoring — data model RULED (Vikram, 2026-07-16). Unblocks 1 of the 15.
- **M-D0 CONFIRMED — a measure is a KPI ASSIGNMENT, not a master object.** Author it via an association table
  `strata_scorecard_model_measures` (model_id · perspective_id · kpi_id · weight · order_index · required ·
  aggregation_method · target_policy · created_at). **NO `strata_measures` master table** — duplicating KPI names,
  formulas, owners, units and sources would create two competing measurement dictionaries.
- `strata_scorecard_lines` stays as-is: it is **instance-level** (verified: scoped by `instance_id`; CHECK permits
  `kpi|objective|benefit`) and is not an adequate model-authoring structure. Reusable measures are defined at MODEL
  level first; lines remain the generated/live result structure.
- This settles the question that blocked anchor 05's measures builder in 5C (P5-D3 deferred it precisely because no
  measure structure existed). Plan Lock: `03_PLAN_LOCK_F_MEASURES.md`.
- **⚠️ OPEN — M-D1 (aggregation vocabulary).** `strata_scorecard_models.rollup_method` already CHECKs
  `weighted_average|sum|min|custom`. The suggested measure values ("minimum", "latest") do not match (`min`; and
  `latest` is absent). Minting them at measure level = a SECOND aggregation dictionary — the same failure M-D0 exists
  to prevent, one level down. **M-D1 ✅ RULED (Vikram 2026-07-16): REUSE the existing four** — `weighted_average|sum|min|custom`.
  No second dictionary; `minimum`/`latest` not minted. Verified after apply: the measures CHECK and the models
  `rollup_method` CHECK are **byte-identical**.
- **M-D2 ✅ RULED (Vikram 2026-07-16): SPLIT the slice.** Table + RPC + reader shipped first
  (`20260716150000`); the anchor-05 measures **builder UI** is its own slice (it replaces 5C's card layout with
  perspective groups — a large surface). **Part 2a shipped `ffb3f8c68`; part 2b BUILT session 025** (gates green,
  live-verified, measures table 0 → 2 rows through the UI). Anchor 05's builder is complete.

## Remaining-backend PROGRAMME — product policy RULED (Vikram, 2026-07-16). Blueprint: `03_PLAN_LOCK_BACKEND_PROGRAM.md`.
> Applies to all 14 remaining capabilities. **Blueprint is NOT approved — no code, no migrations.** Seven decisions
> (E-1…E-7) remain open in the blueprint §11 and may not be assumed.

- **D-1 ✅ CONFIRMED — approved-model aggregate immutability is P0**, ahead of the remaining programme. Protect the
  COMPLETE approved aggregate (perspectives, weights, measures, aggregation settings, target policies, threshold
  association) in **RPCs AND at the DB/RLS layer — the UI is not a security boundary.** Read-only integrity report
  FIRST; **do not silently rewrite historical records.**
  **AUDIT RESULT (executed read-only 2026-07-16): both approved models AND both locked snapshots are affected.**
  Blast radius is PROVENANCE, not values — frozen `snapshot_items` mean no number changed, but "model v1" no longer
  re-resolves to the weights that produced those numbers. Detection is a LOWER BOUND (no `updated_at` on child
  tables; the raw `.update()` writes no audit event → in-place UPDATEs undetectable). See blueprint §3.
- **D-2 ✅ RULED — dedicated revision RPCs**, not one generic polymorphic RPC and not a mandatory change-request
  workflow: `strata_create_model_draft_version` · `strata_create_kpi_draft_version` ·
  `strata_create_threshold_draft_version`. Each clones the complete governed aggregate, increments `version`, sets
  `supersedes_id`, resets approval fields, copies children, records actor/reason, **leaves the predecessor
  unchanged**. Reuse `strata_approve_record`'s approval + supersession boundary (it ALREADY auto-supersedes the
  predecessor when `supersedes_id` is set — `foundation_config_engine.sql:413-418`). `strata_config_change_requests`
  MAY serve as an OPTIONAL request/audit envelope; **do not create a second mandatory approval lifecycle without
  evidence it is needed.**
- **D-3 ✅ CONFIRMED — approved-KPI "retire and recreate" is REPLACED by governed revision.** Retirement remains for
  genuine discontinuation. Preserve logical KPI lineage + historical resolution for actuals, objectives, Key Results,
  scorecards, snapshots, board packs. (Changes `strata_update_kpi`'s explicit "retire and recreate to change an
  approved KPI" — `authoring_write_paths.sql:615-616`. Supersedes the [[strata-governance-version-based]] habit.)
- **D-4 ✅ RULED — replace misleading Finance terminology.** Neutral assurance states: **Reported · Owner confirmed ·
  Independently validated · Rejected.** Stop writing `finance_validated`; migrate the vocabulary to
  `independently_validated`, preserving original actors and audit events. **Do not claim historical Finance
  assurance.** (Probe: **no Finance role or actor exists anywhere in STRATA** — `strata_validate_benefit_value`
  hardcodes `lifecycle_stage='finance_validated'` on any validator's verdict — `strata_execution_value.sql:409-414`.
  The label is a lie today.)
- **D-5 ✅ RULED — accepted-with-exception MAY count after Strategy Office authorization.** Quarantined stays
  excluded. Submitter cannot authorize their own exception. Preserve exception reason, original validation failures,
  authorizer, timestamp, evidence, source run. Scorecards/snapshots/board packs must **retain and visibly expose**
  the exception flag. **Never silently convert exception-authorized data into ordinary Validated data.**
- **D-6 ✅ RULED — persisted reviews COEXIST with the derived model during transition.** `strata_reviews` is
  authoritative going forward; backfill ONE Closed historical review per existing locked snapshot, marked
  migrated/historical. **Do not invent chair, participants, agenda or meeting details that were never recorded.**
  Derived logic retained temporarily as compatibility/verification support, not as the system of record.
- **D-7 ✅ RULED — undo = immutable supersession + reversal ledger**, NOT negative/offsetting KPI measurements.
  Preserve the original run and actuals; compensating reversal run references the original; mark affected actuals
  reversed/superseded; restore the prior effective state where one existed. Allowed only within 24h · before a locked
  snapshot · before dependent board-pack issuance · before a later run makes reversal unsafe. **Prefer atomic
  reversal; never silently leave a partially reversed run.**
- **D-8 ✅ RULED — the count is 14.** 13 previously listed + DEF-010. **Measure-level scorecard authoring has SHIPPED
  and must not be counted.** 14 product capabilities ≈ 24 implementation slices — never report slice progress as
  capability progress.

## Integrity-exception handling — E-1…E-7 RULED (Vikram, 2026-07-16). Integrity report ACCEPTED.
> Blueprint §1.1 / §3.7 / §3.8 / §12 / §13 / §14. **Still NOT approved for implementation.** Seven NEW decisions
> (F-1…F-7) arose from these rulings — blueprint §11.

- **E-1 ✅ RULED — preserve and annotate both affected locked snapshots; do NOT restate** (the exact historical child
  configuration cannot be reconstructed reliably). Frozen values remain **official and unchanged**; provenance is
  **qualified**. Integrity-exception record: affected snapshot · model/version · discovery date · known post-approval/
  post-lock child changes · **values changed: NO** · **provenance reproducibility: INCOMPLETE** · Strategy Office
  owner · **resolution: preserved with qualification**. **Never modify the locked payload.**
- **E-2 ✅ RULED — do NOT backfill or infer `approved_at`.** B2B Sector Scorecard v1 = **legacy/unverified approval
  provenance**. Prevent further edits → clone intended current config to **v2 Draft** → proper SO approval → explicit
  effective date → **supersede v1 prospectively**. Clean approval requires agreement among: approved status ·
  `approved_at` · `approved_by` · approval audit event · successful integrity checks.
- **E-3 ✅ RULED — retain the 2 verification measure rows.** No in-place "cleaning" of the approved model. Preserve
  rows + audit evidence; mark v1 integrity-qualified; include/exclude the measures **deliberately** in the clean v2.
- **E-4 ✅ RULED — full DB-level child auditability.** `updated_at`, actor fields, INSERT/UPDATE/DELETE audit triggers
  on every governed child table affecting calculations; capture old+new values, parent, actor, timestamp, operation,
  correlation/request context. **For approved parents reject child UPDATE and DELETE at BOTH RPC and DB/RLS layers.**
  **Census (probed): exactly 4 child tables lack `updated_at`** — `strata_scorecard_model_perspectives` ·
  `strata_scorecard_model_measures` · `strata_element_kpis` · `strata_initiative_kpis`.
- **E-5 ✅ RULED — import reversal restores the previous validated effective state.** Mark imported actuals reversed/
  superseded; restore a prior valid non-reversed actual for the same KPI/period/source context as effective, else
  **leave no effective value**. **Never create zero, negative or artificial offset measurements.** Recalculate
  **unlocked results only**.
- **E-6 ✅ RULED — accepted-with-exception governance spans KPI actuals AND benefit values.** Both: quarantined +
  rejected don't count · validated counts · SO-authorized `accepted_with_exception` **counts** · no self-authorization
  · exception reason/original failures/evidence/actor/timestamp visible downstream. **Benefit assurance stays
  separate** (Reported · Owner confirmed · Independently validated). **Acceptance for calculation ≠ independent
  validation.**
- **E-7 ✅ RULED — draft-KPI exclusion enforced at BOTH relationship and calculation layers.** Draft/pending linkable
  for authoring, visible, excluded from official reporting; approved+effective ⇒ reportable; superseded/retired ⇒
  historical only. **No independent link-status state machine** — derive reportability from KPI lifecycle + effective
  dates. Every official calculation independently requires: approved+effective KPI · reportable relationship ·
  validated-or-accepted-with-exception actual · correct scope+period · captured config versions. Draft previews only
  in clearly labelled, non-persistent simulations. **DEF-010 is a relationship-authoring + calculation-eligibility +
  snapshot-context + audit + testing change — NOT a UI-only or link-table-only fix.**
- **P0+ ✅ RULED — broaden the integrity audit** across every governed parent/child aggregate affecting official
  results; **label it explicitly a LOWER-BOUND EVIDENCE REGISTER** (historical updates may be undetectable).
  **RESULT (probed 2026-07-16, all 9 governed parents × their aggregate children): the violation set is CONFINED to
  the scorecard-model aggregate** — 3 records. `element_kpis` rows written after KPI approval are **legitimate
  post-approval linking, NOT violations** (relationship ≠ definition). `gate_model_stages` is clean **because it is
  already correctly gated** — the shipped precedent the P0 fix must copy.

## DEF-010 — RULED (Vikram, 2026-07-16). Was the last open product decision; there are now NONE.
- **DEF-010 ✅ RULED — draft KPIs MAY be linked to strategic objectives during authoring, but never count.**
  Recorded verbatim:
  - Allow draft KPIs to be linked to strategic objectives during authoring.
  - Clearly label them as **Draft**.
  - **Exclude draft KPIs from official calculations, health, roll-ups, scorecards, snapshots, board packs and
    executive reporting.**
  - **Activate** eligible links when the KPI is approved.
  - **Do NOT auto-approve KPIs.**
  - **Preserve historical links** when KPIs are retired or superseded.
- **Status: product direction APPROVED; technical specification PENDING.** This is a **backend change needing its own
  Plan Lock** — it is now backend initiative #14 in the handover's authoritative "Still open" block, not a product
  decision. Do not start it expecting a spec to exist.
- **Why it was blocked (probed on staging, session 024 — re-probe before specifying):** `strata_link_element_kpi` is
  gated on `approved` (the function body references it); `strata_kpis.status` defaults to `'draft'`; 6 draft KPIs on
  staging today, all unlinkable at creation. So link-at-creation cannot work without this change.
  See [[strata-kpi-link-requires-approved]].
- **The ruling rejects the auto-approve escape hatch** that session 024 floated as an alternative. The exclusion rule
  is the load-bearing part: a draft link must be inert everywhere a number is asserted — calculations, health,
  roll-ups, scorecards, snapshots, board packs, executive reporting. A draft KPI that silently moved a score would be
  the zero-assumption violation this feature has refused eleven times.

## Part 2b — RULED (Vikram, 2026-07-16)
- **M-D3 ✅ CONFIRMED (Vikram 2026-07-16): the Save gate treats an EMPTY perspective group as PASSING.** Plan Lock 2b
  says "gate Save on every group totalling 100". Read literally that includes groups with zero measures — but
  `setModelMeasures` is a REPLACE-SET (the save sends the FULL set across all groups), so the literal rule makes the
  FIRST save of a part-built model impossible, and it contradicts `ModelIntegrityBand` (2a), which flags only groups
  that HAVE measures. Gate mirrors the band: **one rule for one fact.** Shipped in PR #349 as built — no code change
  needed from this ruling.
  **Consequence, ratified with the decision:** the band's ✕ measure state is unreachable *through the UI* (the gate
  stops you persisting ≠100); it still guards non-UI writes (RPC/seed/other clients), which is how it was verified.
- **M-D4 ⏸ DEFERRED TO ITS OWN SLICE (Vikram 2026-07-16): "rule separately in its own slice."** The open question:
  measures — and perspective weights — are editable on an APPROVED model, role-gated only (`strategy_office`), with no
  status gate, while STRATA governance is otherwise version-based (approved records are re-created, not field-edited;
  see the governance-is-version-based lesson). **NOT a 2b defect:** `ModelWeights` has behaved this way since 5C, so
  2b introduced nothing new — which is precisely why the fix does not belong inside 2b.
  **Scope when it is picked up:** it covers `ModelWeights` + `MeasureGroups` together (same question, two callers), and
  it needs its own Plan Lock + a ruling on the mechanism (block editing at `status='approved'` vs require a new draft
  version vs accept in-place edits as intended for models). Do NOT start it assuming the answer. No migration is
  obviously required — `strata_scorecard_models.status` already exists — but the versioning mechanism might need one.

---

## Backend programme AUTHORIZED (Vikram, 2026-07-16) — full continuous execution through Release 5
> "The complete backend-programme Plan Lock, D-series, E-series and F-series rulings are approved. Implementation is
> authorized for all dependency-ordered releases and all 14 product capabilities." PR #349 stays open/unmerged.
> Blueprint `03_PLAN_LOCK_BACKEND_PROGRAM.md` is **APPROVED**. Each slice: implement → migrate staging → test →
> evidence → logs → commit → next dependency-safe slice. Stop only for a hard blocker (list in the authorization).

### F-SERIES — resolved from the authorization's CONFIRMED PRODUCT RULES (not assumed)
| ID | Resolution | Derived from |
|---|---|---|
| **F-1** | ⛔ **STILL OPEN — the ONE thing not derivable.** No Strategy Office owner is named for the three integrity-exception records. E-1 mandates the field. A name cannot be inferred from schema, and inventing one is the exact zero-assumption violation the register exists to prevent. **Does NOT block the programme:** the register ships with `strategy_office_owner NOT NULL`; the three records are the only deferred item. | — |
| **F-2** | **Clone-as-is, then edit in draft.** v2 is a draft and freely editable; the deliberate include/exclude choice (E-3) is recorded at approval, where SO reviews it anyway. | blueprint §11 recommendation + "choose the smallest design" |
| **F-3** | **Qualification surfaces on board packs and exports**, not only admin/registry. | authorization R2: "Snapshot-integrity qualification on future packs and exports" |
| **F-4** | **A2 → A3 back-to-back**, before E-2 remediation. No one-time exception, no A3-before-A2. | authorization: "Maintain dependency order" + §11 recommendation |
| **F-5** | **Pre-existing rows get NULL `updated_at`**, never `now()`, plus an explicit "unaudited before <date>" marker. Defaulting to `now()` would assert a change time that never happened — false provenance on the very rows under investigation. | authorization: "Do not fabricate historical approval dates or update timestamps" |
| **F-6** | **Benefit values get `accepted_with_exception` ONLY — not `quarantined`.** The authorization's benefit assurance list names Reported · Owner confirmed · Independently validated · Accepted with exception · Rejected · Reversed/superseded, and no quarantine. Adding `quarantined` would imply a benefit-value quarantine workflow that does not exist and was not asked for. | authorization: benefit assurance state list |
| **F-7** | **`owner_confirmed` COUNTS in benefit realization.** This changes live numbers — `strata_calc_benefit_realization` currently whitelists `='validated'`, so the whitelist must be widened. Acceptance for calculation still does NOT imply independent validation (E-6); the state stays visibly distinct. | authorization: "Owner-confirmed benefits count" |
| **F-8** | 🆕 **`strata_element_kpis` is NOT part of the P0 draft-gate.** Blueprint §12.2 lists it, but that contradicts §3.7 (relationship ≠ definition; post-approval linking is intended) and E-7 (no independent link-status state machine), and `strata_link_element_kpi` REQUIRES `approved` — so a draft-gate would invert the rule and break every KPI link. It is not a child of the scorecard-model aggregate at all. It receives E-4 audit coverage + the DEF-010 relaxation instead. **Derived from approved rules + the regression ban; raised as DRIFT-10, not silently adapted.** | §3.7 + E-7 + probe of the RPC body |

### Probe corrections to the blueprint/handover (evidence-backed, this session)
- **DEF-010's link layer is PARTIALLY SHIPPED.** `strata_link_element_kpi` already permits draft/pending linking when
  `is_strategic` is true. Staging: 10 approved · 5 draft non-strategic · **1 draft STRATEGIC** · 1 pending_approval.
  The handover's "6 draft KPIs on staging, **all unlinkable at creation**" is **FALSE** — the strategic one is linkable
  today. DEF-010 extends a shipped pattern rather than inventing one.
- **E-4's old/new value capture needs NO new columns.** `strata_audit_events` **already has `before` and `after` jsonb**
  (probed). Blueprint §13.3's "extend it rather than mint a second audit store" is satisfied by the existing shape;
  only correlation context is genuinely absent.
- **The §12.1 precedent cannot be copied verbatim.** `strata_gate_model_stages_write` authorizes on
  `(created_by = auth.uid() OR strata_is_admin())`, **not** `strategy_office`. Copying it wholesale would silently
  change who may author measures. P0-A copies the draft-join SHAPE and preserves the existing role predicate.
- **§12.3.3 verified, not assumed:** `strata_scorecard_models_update` gates on `status='draft'`, so the threshold
  association (`threshold_scheme_id`, on the parent) is already protected. No work needed.
