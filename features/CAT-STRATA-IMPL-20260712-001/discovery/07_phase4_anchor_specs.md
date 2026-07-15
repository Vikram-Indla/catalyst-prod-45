# Phase 4 (governance & data) — Anchor digests (for discovery subagents)

> Source: claude.ai design project anchors, read IN FULL by the parent (DesignSync is parent-only —
> [[designsync-parent-only]]). Build order: **10 → 23 → 24 → 09 → 19 → 20.** ADS `--ds-*` tokens only
> (anchor hex = token stand-ins). State taxonomy + navigation contract per HANDOFF. Map protection absolute.
> Route map: 10 `/strata/reviews/:snapshotKey` (StrataReviewsPage) · 23 `/strata/reviews` (StrataReviewsPage) ·
> 24 board-pack/present (**likely NEW route(s)**) · 09 `/strata/data/runs/:runKey` (StrataDataPipelinePage) ·
> 19 `/strata/data` (StrataDataPipelinePage) · 20 `/strata/data/upload` (StrataUploadWizardPage).

## ⭐ CROSS-CUTTING: StrataLifecycleStepper — BUILD FIRST (Phase-0 D-4 deferred "until first consumed")
Consumed by: **09** (run stepper: Contract→Upload→Map→Validate→Resolve→Promote→Calculated, 7 steps w/ per-step
note + commitment/reversibility) · **20** (same 7-step stepper, Map current) · **23** (review-lifecycle **compact
dots** variant, 5 stages readiness→snapshot→decisions→actions→pack, a11y labels) · **10** (review lifecycle
strip, same 5 stages). §18 API. Token-pure (@atlaskit has no process stepper). Verify `CatalystProgressTracker`
(src/components/ads) suitability first (D-4 note). States: done ✓ (success), current (warning/bold), todo (neutral).

## ⚠️ DATA-REALITY FLAGS (discovery MUST confirm against staging schema + domain API — expect P3-D3-style scope cuts)
- **Board pack (24):** `strata_board_packs` + `governanceApi.boardPacks/reviewAdvisory` exist, BUT the anchor's full
  editorial builder (narrative editing, reorder sections, per-page snapshot stamp, **Issue** = freeze draft→issued
  w/ distribution list + immutable copy, Print/PDF templates, 16:9 **Present mode** w/ live verdict capture) almost
  certainly EXCEEDS the backend. FLAG scope — likely a large scoped-down build or split-out feature.
- **Run resolve (09):** `strata_upload_runs` + `lineageApi.validateRun` (row_count_valid/rejected) exist. Anchor
  wants Accepted/Quarantined/Rejected 3-way + **clustered errors by cause** + remediation actions (Remap/Apply
  correction) + **Promote accepted rows (reversible)**. Confirm: does a promote RPC exist? are clustered errors /
  quarantine derivable? Zero-assumption where not.
- **Decision cockpit (10):** `strata_decisions`/`strata_actions`/`strata_snapshots`/`snapshot_items` +
  `governanceApi` exist; `StrataDecisionModal` for recording. Confirm decision↔action ancestry, snapshot_items for
  "compare with live", verdict records (recorded_by/at).
- **Data landing (19):** `strata_data_sources` + `lineageApi.dataSources` + `useUploadRuns`. Confirm **downstream
  dependents** ("2 KPIs · CEO scorecard · Q2 snapshot") — is there a lineage/dependency query, or must it be
  client-derived / rendered honestly as a gap?

---

## Anchor 10 — Decision Cockpit · `/strata/reviews/:snapshotKey` (StrataReviewsPage)
Breadcrumb "STRATA / Governance / Reviews & Decisions / {review}"; H2 {review name} + "REVIEW IN PROGRESS" lozenge;
actions **"Present mode"** + **"Export board pack"**.
- **Snapshot identity band** (LOCKED SNAPSHOT, discovery-toned, persists across drilled evidence): SNAP key ·
  frozen timestamp · config vN · N KPIs · N benefits · "every number below is snapshot truth" + "Compare with live"
  + "Snapshot history (03 supersedes 02)".
- **Review lifecycle strip** (StrataLifecycleStepper, 5 stages): Readiness ✓ (24/24 KPIs validated) → Snapshot
  locked ✓ → Decisions ● (1 of 3 recorded) → Actions ○ → Board pack ○.
- **2-col grid 7/5:** **Decision register** (left) — per decision: status lozenge (RECORDED/OPEN) + title + snapshot
  evidence prose + (if recorded) verdict-record band (verdict + note + "Recorded by X · date · against SNAP") +
  "Evidence →". Record = `StrataDecisionModal` (verdict options + mandatory note; SoD in-modal). **Actions register**
  (right) — per action: title + "from {decision}" ancestry + owner + due (tone); footer "Q1 follow-ups: 4/5 closed
  · 1 overdue".
- **Board pack editorial preview**: "Board pack — Q2 · draft 2" + "Edit narrative"; horiz-scroll page thumbnails
  (kicker/title/body/viz mini + snapshot stamp + page num) → links to anchor 24.
- Annotations: lifecycle strip; snapshot band persists on evidence drills; decisions show snapshot evidence +
  verdict ancestry; actions carry decision+snapshot ancestry; **compare-with-live** = 2-col diff (snapshot vs now,
  restatements flagged); present mode strips chrome + keyboard-steps.
- Canonical: StrataLifecycleStepper, StrataDecisionModal, StrataSnapshotBand (extend for identity band), JiraTable.

## Anchor 23 — Reviews Index · `/strata/reviews` (StrataReviewsPage)
Breadcrumb "STRATA / Governance"; H2 "Reviews & Decisions" + cadence subtitle + **"+ Schedule review"**. Spine LIVE.
- **NOW band** (raised): single most-consequential fact ("Q2 Review in progress — 1 of 3 decisions recorded; Gate 3
  is 12 days overdue") + "Open cockpit →" (anchor 10).
- **Review registry** (JiraTable): Review (name + date·chair) · Stage lozenge (IN PROGRESS/READINESS/CLOSED) ·
  **Lifecycle** (5 dots, StrataLifecycleStepper compact) · Snapshot (key) · Decisions ("1 recorded · 2 open") ·
  Follow-ups (ageing, danger "1 overdue from Q1"). Row → cockpit (10).
- **Snapshot registry** (JiraTable): Snapshot (key link) · Frozen (ts) · Basis of · **Supersedes** (narrated).
  Superseded snapshots **struck-through** + reason (auditor journey; nothing silently replaced).
- States: readiness blocking-count on hover+drill; empty→cadence config; overdue danger+days; loading skeleton;
  <1100 lifecycle+snapshot merge; <900 stacked cards.

## Anchor 24 — Board Pack + Present Mode · NEW route(s) (e.g. `/strata/reviews/:snapshotKey/pack`) — ⚠️ HEAVY, scope-flag
Breadcrumb ".../ Q2 2026 · Board pack"; H2 "Board pack — {review}" + DRAFT N lozenge; actions **"Present mode"** +
**"Print / PDF"** + **"Issue pack…"**.
- LOCKED SNAPSHOT band (+ "Changes since freeze (3) →").
- **Pack structure — editorial arc**: horiz-scroll page cards (0.773 aspect) COVER + SECTION 01 CONDITION / 02
  EXPLANATION / 03 VALUE / 04 DECISIONS / 05 FOLLOW-THROUGH — each kicker/title/narrative/viz + **snapshot stamp +
  page num per page**. "Edit narrative" · "Reorder sections". (McKinsey pyramid: headline→evidence→ask.)
- **Present mode**: chrome-stripped **16:9** stage, one section/screen, keyboard **←/→ · Esc→cockpit at same
  section**; verdict capture stays available on decision pages; reduced-motion crossfade; dark = same tokens.
- **Print/PDF**: Letter/A4 templates, page# + snapshot stamp footer, charts from same tokens. **Issue pack** = freeze
  draft→issued w/ distribution list + immutable copy attached to review; later edits = draft N+1, never mutate issued.
- Missing data = honest labeled gap, never silently dropped.

## Anchor 09 — Run Detail · `/strata/data/runs/:runKey` (StrataDataPipelinePage)
Breadcrumb ".../ Data & Lineage / Run #498"; H2 "Upload run #498 — {desc}" + NEEDS RESOLUTION lozenge + "Uploaded by
X · ts · template v6".
- **Lifecycle stepper** (StrataLifecycleStepper, 7 steps): Contract→Upload→Map→Validate→**Resolve**(current)→Promote
  →Calculated, per-step note.
- **2-col grid 1fr/340px rail:** **Validation summary** (left) — "N rows received" + 3 tiles (Accepted success
  "written to staging" / Quarantined warning "fixable here" / Rejected danger "need corrected file"); then
  **clustered errors** (NOT raw rows): "N ROWS" badge + cause title + fix guidance + action ("Remap lane →" /
  "Apply correction →" / "View conflicts →"). **Commit panel**: "Promote N accepted rows to canonical" + reversibility
  note + "Download rejected (N)" + "Promote accepted rows". **Downstream-impact rail** (right 340px): "WHAT DEPENDS
  ON THIS RUN" (KPIs/scorecard/snapshot + consequence "Until promoted, June OTIF shows MISSING ACTUAL … Q2 snapshot
  cannot freeze"); "CONTRACT & LINEAGE" field rows (Source/Template/Contract/Validation/Config/Run key) + "Full
  lineage chain →".
- Promote = consequence-framed confirm listing affected KPIs; error = SectionMessage retry preserving file; empty→
  contract teaching + template download.

## Anchor 19 — Data & Lineage Landing · `/strata/data` (StrataDataPipelinePage)
Breadcrumb "STRATA / Governance"; H2 "Data & Lineage" + "13 sources · 9 templates" + **"Upload actuals"**. Spine LIVE.
- **Judgment sentence**: "2 sources stale, 1 run needs resolution. Fleet telematics staleness degrades 2 KPIs; run
  #498 blocks June OTIF and the Q2 snapshot freeze."
- **Sources table** (JiraTable, sorted by consequence blocked>stale>degraded>healthy): Source (name + type·cadence) ·
  Freshness (●◐○ glyph + age, absolute on hover — matches KPI library) · Contract (template vN · cols) · **Downstream
  dependents** (named victims) · Last run (#id · date) · Status lozenge. Source click → source detail.
- **Recent runs table** (JiraTable): Run (#id link) · What (name + owner·date) · Rows (valid/total) · Status
  (RESOLVE N / FAILED·RETRYING / PROMOTED) · **Waiting on it** (downstream, danger; feeds My Work). Run → 09.
- States: connector FAILED·RETRYING + next-retry; empty→config teaching + template download; loading skeleton;
  restricted viewer read-only no upload; <1100 contract folds; <900 stacked.

## Anchor 20 — Upload Wizard (Mapping) · `/strata/data/upload` (StrataUploadWizardPage)
Breadcrumb ".../ Data & Lineage / Upload actuals"; H2 "Upload actuals — {desc}" + "STEP 3 OF 7 · MAP" lozenge +
"Save & exit" + "Continue to validation".
- **7-step lifecycle stepper** (same as anchor 09; Map current, "12 of 14 auto-matched").
- "12 of 14 auto-matched vs template v6 — 2 need decision. Sample values from your file." + "Nothing written until
  Promote (step 6)".
- **Mapping table** (JiraTable): Your column (monospace) · Sample values (monospace, REAL file rows) · → · Template
  field (Select) · Match (**AUTO** success / **CONFIRM** warning "header renamed since v5" / **DECIDE** warning "new
  column — map or leave unmapped"). Continue enabled only when no DECIDE remains (disabled names blocking rows).
- **Mapping memory** band: confirmed mappings saved to template contract → next month auto-matches 14/14 + "View
  template contract vN →".
- States: upload parse error step 2 danger + "fix and re-upload" keeping state; template mismatch → contract diff;
  loading stepper instant + rows skeleton; **restricted data_steward-only**; Save & exit = draft run resumable from
  Data & Lineage; <1100 sample collapses + stepper scrolls sticky.
- NOTE: an Excel upload/parse/map path already exists in `StrataExecutionImportPage` (Phase-3 3C) + `StrataUploadWizardPage`
  — discovery must map what the existing wizard already does vs anchor 20 to scope redesign-vs-rebuild.
