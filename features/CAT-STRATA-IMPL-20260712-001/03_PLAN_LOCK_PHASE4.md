# 03 — PLAN LOCK · CAT-STRATA-IMPL-20260712-001 · Phase 4 (governance & data)

> STATUS: **APPROVED — Vikram 2026-07-15: "Approve — start 4A." Decisions P4-D0…D8 all CONFIRMED as recommended.
> Execution authorized on `strata/impl-phase01`.** Slice order: 4A (START HERE) → 4B(23) → 4C(10) → 4D(19) →
> 4E(09) → 4F(20) → 4G(24 scoped).
> Scope: STRATA design-pack **Phase 4** per HANDOFF build-order "governance & data": anchors **10 · 23 · 24 · 09 ·
> 19 · 20**. Grounded in: HANDOFF.md build-order (re-read in full, session 015); all 6 Phase-4 anchors read IN FULL
> via DesignSync (digest: `discovery/07_phase4_anchor_specs.md`); 4 parallel discovery agents (canonical / route /
> integration / data-safety, read-only on repo + staging); Phase-0…3 decisions D-0…D-12, P3-D1…D8. Karpathy loops:
> `11_KARPATHY_LOOP_LOG.md` K-P4-1…4.

## Objective
Bring the six governance & data surfaces to their anchors — the **review→decision→board-pack** governance spine and
the **sources→run→upload** data spine — reusing canonical components + `--ds-*` tokens only, **redesigning existing
pages in place** (one net-new route for the board pack), building the deferred canonical **`StrataLifecycleStepper`**
first, with **zero-assumption rendering** wherever the schema is thinner than the anchor, and leaving
`StrataStrategyMapPage.tsx` byte-for-byte unchanged.

## Surfaces (confirmed by discovery)
| Anchor | Route | Page | Nature |
|---|---|---|---|
| 23 Reviews Index | `/strata/reviews` | `StrataReviewsPage` (index branch, `isDetail=false`) | redesign-in-place |
| 10 Decision Cockpit | `/strata/reviews/:snapshotKey` | `StrataReviewsPage` (detail branch) | redesign-in-place |
| 24 Board Pack + Present | **`/strata/reviews/:snapshotKey/pack`** (NEW) | **`StrataBoardPackPage`** (new) | NEW route + page (scoped, P4-D2) |
| 19 Data & Lineage Landing | `/strata/data` | `StrataDataPipelinePage` (landing branch) | redesign-in-place |
| 09 Run Detail | `/strata/data/runs/:runKey` | `StrataDataPipelinePage` (`RunDetailSection`) | redesign-in-place |
| 20 Upload Wizard | `/strata/data/upload` | `StrataUploadWizardPage` | redesign-in-place |

## PROPOSED DECISIONS (need Vikram ruling before the gated slice — recommendation first)

- **P4-D0 · Build `StrataLifecycleStepper` FIRST (slice 4A), by EXTRACTING `PipelineStepper`/`StageDot`**
  (`StrataDataPipelinePage.tsx:83-151`) into `shared.tsx` — §18 API `{ steps:[{id,label,state:'done'|'current'|
  'todo'|'failed', note?}], variant:'full'|'dots', ariaLabel }`. Refactor DataPipeline (8-stage) + UploadWizard
  (4-step) to consume it behavior-preserving. `@atlaskit/progress-tracker` (installed) rejected on API-fit (no
  failed state / note / dots). Consumed by 09·20 (`full`) + 23·10 (`dots`). → **Recommend CONFIRM.**
- **P4-D1 · Reviews are a DERIVED virtual entity — no `strata_reviews` table.** Registry (23) + cockpit (10)
  compose over `strata_snapshots` (spine, keyed by `snapshot_key` = the `:snapshotKey` route param) + `strata_
  decisions` + `strata_actions` + `strata_board_packs`. **CUT "+ Schedule review", chair, and cadence subtitle**
  (no backing column). Derive review **stage** transparently (snapshot locked? + decisions-recorded ratio + period
  `close_status`); render a gap where a stage can't be derived (zero-assumption). → **Recommend CONFIRM** (a
  `strata_reviews` migration for first-class scheduling is a later feature, not Phase 4).
- **P4-D2 · Anchor 24 board pack = SPLIT.** `strata_board_packs` is a file/generation-job record (format/
  storage_path/status), NOT an editorial document. **Phase 4 ships:** (a) read-only **pack preview** — the editorial
  arc (Cover + Condition/Explanation/Value/Decisions/Follow-through) generated client-side from snapshot_items +
  decisions + KPIs, per-page snapshot stamp; (b) **Present mode** — a `position:fixed` chrome-stripped 16:9 overlay
  (`?present`/`?section=`), keyboard ←/→/Esc-to-cockpit, reduced-motion crossfade, client-only from snapshot data;
  (c) **Print/PDF** reuses the existing `generateBoardPackPdf/Pptx` (`lib/boardPack.ts`). **DEFERRED to a separate
  backend feature (own migration + Plan Lock):** the editorial **builder** (narrative editing, reorder, draft
  N→N+1) and **Issue** (freeze draft→issued + distribution list + immutable copy). No fabricated draft numbers or
  distribution lists. → **Recommend CONFIRM split** (present/print now; builder+issue later).
- **P4-D3 · Anchor 09 run detail = 2-way, not 3-way.** `strata_validate_run` emits only `valid`/`rejected`
  (severity always `error`); no quarantine tier. **Render Accepted (valid) + Rejected tiles only** — do not invent
  "Quarantined". **Clustered errors** = client `GROUP BY error_code/field_name` over `strata_validation_results`
  (has `error_code`/`message`/`suggested_fix`). **Promote** = existing `strata_promote_run` (idempotent, writes
  valid rows to `strata_kpi_actuals` as `pending` attestation, role-gated); **"reversible" framed honestly**
  (pending-attestation ≠ committed; NO reverse RPC — P4-D7). → **Recommend CONFIRM.**
- **P4-D4 · Downstream dependents rendered honestly.** No source→KPI/scorecard/snapshot forward-dependency table.
  Render only **backward-derivable named KPIs** (via `strata_lineage_records` / `kpisForSource(dataSourceId)` on
  `strata_kpis.data_source_id`); render a labeled gap ("downstream dependents not fully tracked") for scorecard/
  snapshot forward impact — never fabricate victims. A `strata_run_downstream` blast-radius RPC is a later
  enhancement. → **Recommend CONFIRM.**
- **P4-D5 · Compare-with-live (10) = client diff** of `strata_snapshot_items.payload` (frozen) vs live calc — no
  RPC/migration. Restatements flagged where snapshot ≠ live. → **Recommend CONFIRM.**
- **P4-D6 · Upload wizard (20) redesign = align to the anchor's 7-step lifecycle + AUTO/CONFIRM/DECIDE mapping;
  wizard stages the run then HANDS OFF to run detail (09) for Validate→Resolve→Promote.** The anchor's stepper spans
  both surfaces (Map on the wizard; Resolve/Promote on run detail). AUTO/CONFIRM/DECIDE = client logic over template
  `mapping_rules`; sample values from `strata_staging_rows.raw`. **Mapping-memory persistence has no write path →
  render the "saved to template contract" affordance honestly or DEFER the write** (flag). NOTE: the wizard uses the
  `lineageApi` staging path (`createUploadRun`/`insertStagingRows`/`markRunStaged`), NOT `importExecutionBatch`
  (that backs the separate Phase-3 `StrataExecutionImportPage` — do not conflate). → **Recommend CONFIRM handoff +
  defer mapping-memory write.**
- **P4-D7 · Promote "reversible" is UI framing only** — `strata_promote_run` is idempotent + writes `pending`
  attestation, but there is NO un-promote/rollback RPC. Do not promise a reverse; frame recovery as
  pending-attestation + re-run a corrected file (like 3C's honest commitment). → **Recommend CONFIRM.**
- **P4-D8 · Freshness glyph parity (19):** promote the KPI-library `KpiFreshnessCell` (`StrataKpiLibraryPage.tsx:
  222`, ●◐○ + age) to `shared.tsx` so anchor-19 sources match the KPI library exactly. Source freshness = derive
  from latest run `completed_at` per `data_source_id` (no `source.last_refreshed` column). → **Recommend CONFIRM.**

## Canonical components (reuse-first — verified by discovery)
BUILD (extract, slice 4A): **`StrataLifecycleStepper`** (from `PipelineStepper`/`StageDot`). PROMOTE to shared:
**freshness glyph** (from `KpiFreshnessCell`). Reuse as-is / extend: `StrataSnapshotBand` (extend for the LOCKED
SNAPSHOT identity band — counts, config vN, compare/history action slots), `StrataDecisionModal` (verdict + note +
SoD), `StrataStatStrip` (validation tiles), `StrataChainStrip` (contract & lineage rows), `StrataPanel`, `JiraTable`,
`StatusLozenge`/`StrataDataStateLozenge`, the `1fr/340px` rail idiom (`StrataStrategyElementDetailPage:318`).
Build NEW: **`StrataBoardPackPage`** + `Routes.strata.boardPack`/`boardPackPresent`. Thin additive hooks (plain
select, no migration): `useDataSourceBySlug`, `useRunsForSource`, `kpisForSource`/`useKpisForSource`. Client helpers
(pure compose): error-clustering, supersedes-chain self-join, lifecycle-stage derivation, compare-with-live diff.

## Slices (each ≤ 2h; one commit; stop/split per CLAUDE.md). Order: stepper → governance triad → data triad.
- **4A · `StrataLifecycleStepper`** — extract to `shared.tsx` (`variant='full'|'dots'`); refactor `StrataDataPipeline
  Page` + `StrataUploadWizardPage` consumers behavior-preserving (diff before/after — no visual change to current use).
- **4B · Anchor 23 Reviews Index** (`StrataReviewsPage` index branch) — NOW band + review registry (derived rows,
  lifecycle `dots`, stage lozenge, decisions/follow-up counts) + snapshot registry (supersedes struck-through +
  reason). Cut scheduling/chair/cadence (P4-D1). States: empty/loading/overdue-danger/<1100/<900.
- **4C · Anchor 10 Decision Cockpit** (`StrataReviewsPage` detail branch) — SPLIT if >2h: **4C-1** snapshot identity
  band (extend StrataSnapshotBand) + lifecycle strip + decision register (record via StrataDecisionModal, SoD) +
  actions register (decision ancestry) + board-pack preview link. **4C-2** compare-with-live 2-col diff (P4-D5) +
  Present-mode / Export-board-pack actions (→ 4G).
- **4D · Anchor 19 Data & Lineage Landing** (`StrataDataPipelinePage` landing branch) — judgment sentence + sources
  table (consequence-ranked, freshness glyph P4-D8, downstream KPIs honest P4-D4, source→detail) + recent-runs table
  (waiting-on-it) + `useDataSourceBySlug`/`useRunsForSource`/`kpisForSource`.
- **4E · Anchor 09 Run Detail** (`StrataDataPipelinePage` `RunDetailSection`) — lifecycle stepper (7-step) +
  validation summary (2-way tiles P4-D3) + clustered errors (client group) + promote panel (honest reversibility) +
  downstream-impact rail (honest) + contract/lineage rows (StrataChainStrip).
- **4F · Anchor 20 Upload Wizard** (`StrataUploadWizardPage`) — 7-step lifecycle stepper + AUTO/CONFIRM/DECIDE
  mapping table (JiraTable, monospace source + Select target + real sample values) + mapping-memory band (honest) +
  Save & exit draft; hand off to run detail (09) for validate/promote (P4-D6).
- **4G · Anchor 24 Board Pack (scoped, P4-D2)** — SPLIT: **4G-1** NEW route `/reviews/:snapshotKey/pack` +
  `StrataBoardPackPage` = read-only editorial-arc preview from snapshot data (per-page snapshot stamp). **4G-2**
  Present mode overlay (16:9 `position:fixed`, keyboard ←/→/Esc, reduced-motion). **4G-3** Print/PDF wiring (reuse
  `generateBoardPackPdf/Pptx`). Editorial builder + Issue DEFERRED (separate feature).

## Files forbidden (do not touch)
`src/modules/strata/pages/StrataStrategyMapPage.tsx` + its graph/inspector/edge/filter/legend deps. `EnterpriseSidebar.tsx`
styling; top-nav styling. `CatalystViewBase`/`CatalystDetailRouter` entity-kind unions. The Phase-3 `StrataExecutionImportPage`
(different domain — do not conflate with the upload wizard). No new design tokens.

## UI/UX rules (enforced every slice)
ADS `--ds-*` tokens only (no hex/rgb/hsl/Tailwind color util/named color/local map/hex fallback); font-weight ∈
{400,500,600,653,700}; `var(--ds-space-*)` for new spacing. Color never alone (lozenges/stepper carry words +
glyph shape). Layout-matched skeletons; per-panel SectionMessage; role-aware empty; explained restricted. Context
spine on 100% of routes; snapshot identity band persists across evidence drills; `?from=` on evidence drills.
Overdue = "n days overdue" danger; counts labeled; SAR via fmtSarCompact; tabular-nums. Escape returns focus.

## Data / backend rules
NO migration this phase (P4-D1…D8 all client-derive or existing RPC). Wire per verified ownership: snapshots/
decisions/actions/board-packs→`governanceApi` + hooks; runs/validation/promote/sources/lineage→`lineageApi`; upload
staging→`lineageApi` staging path. RLS unchanged; every write surfaces server rejection (§17); SoD DB-enforced on
decisions/promote. **Zero-assumption:** render gap/dash where absent (quarantine tier, forward dependents, review
stage/chair/cadence, board-pack drafts/distribution, mapping-memory write) — never a wrong default. FLAG-BEFORE-BUILD
if any slice turns out to need a migration (esp. board-pack editorial/issue, run-downstream RPC, quarantine tier,
strata_reviews, mapping-memory write).

## Parallel execution plan
4A (stepper) precedes 4B/4C/4E/4F (consumers). Governance triad (4B→4C→4G) and data triad (4D→4E→4F) are independent
after 4A — may run in isolated worktrees per the concurrent-session rule. One slice = one commit. Branch stays
`strata/impl-phase01`.

## Screenshot + probe acceptance (QA)
Per slice, light+dark, 1440/1024/640: (1) DOM/DB probe proving function (not screenshots); (2) ADS + CRE gates green;
(3) grayscale-distinguishable states; (4) keyboard-only path (record-decision / promote / present-mode nav / mapping).
**Map baseline:** diff `/strata/strategy/map` after each slice — zero change is a HARD gate.

## Validation commands
`npx tsc --noEmit` · `npm run lint:colors:gate` · `npm run audit:ads:gate` · `npm run lint:cre` (Vitest can't run).
Merge to main via the fast-forward path ([[github-noff-merge-push-rejected]] — `--no-ff` merge-commit push is
rejected; push branch then `git push origin <sha>:main`; retry flaky pushes). Verify staged set before every commit.

## Stop conditions
Any ADS/CRE gate regression; any map diff ≠ zero; any slice exceeding 2h (split); any anchor verb needing a migration
(raise before adding — esp. board-pack editorial/issue, run-downstream RPC, quarantine tier, strata_reviews, mapping
memory); any PROPOSED decision (P4-D0…D8) unresolved for the slice it gates; any field the schema can't back honestly
(render dash + flag, never a wrong default).

## Drift / rebaseline
Re-read the slice's anchor in full at slice start. If it contradicts this plan, log to `08_DRIFT_LOG.md` and stop for
re-decision — do not silently adapt. Anchor 24's editorial builder + Issue, anchor 09's quarantine tier, and the
review entity are KNOWN gaps vs backend (P4-D1/D2/D3) — the honest scoped-down build is the plan, not a drift.

## Open debt carried (do not lose)
1. Prod migrations `20260713100000` + `20260713110000` — staging-ledgered, prod-parked (no prod access). Apply on next prod run.
2. Backend defect `task_65642237` — `strata_promote_element` references dropped `strata_play_charters`.
3. Phase-4 DEFERRED backend features (own migration + Plan Lock): board-pack editorial builder + Issue; run-downstream
   blast-radius RPC; quarantine validation tier; `strata_reviews` entity (if first-class scheduling wanted); mapping-memory write.
4. Phase 5 (config & system-states: 03·04·05·25·26·27·28) — own Plan Lock.
