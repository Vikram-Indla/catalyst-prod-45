# 07 — HANDOVER · CAT-STRATA-IMPL-20260712-001

> Resume point. **Phases 0–3 COMPLETE. Phase 4 (governance & data) IN PROGRESS — Plan Lock APPROVED; slice 4A done; NEXT = 4B.**
> Read order to resume Phase 4: `00_READ_ME_FIRST` → `01_OBJECTIVE` → **`03_PLAN_LOCK_PHASE4` (APPROVED)** →
> this file (State section below) → `08_DRIFT_LOG` (esp. DRIFT-8) → `09_DECISIONS` (P4-D0…D8 CONFIRMED) →
> `discovery/07_phase4_anchor_specs.md` (6 anchor digests) → `04_EXECUTION_LOG` (per-slice detail) → latest
> `sessions/` (015). **Then re-read the next slice's anchor (23) in full via DesignSync (parent-only) before coding.**
> All synced at `59ef4f4cf` (main = branch); working tree clean; map byte-untouched.

## State (as of 2026-07-15 — PHASE 3 COMPLETE; PHASE 4 IN PROGRESS, slice 4A done)
- **Branch:** `strata/impl-phase01`. `origin/main` advancing via fast-forward ([[github-noff-merge-push-rejected]] —
  `--no-ff` merge-commit push rejected; push branch then `git push origin <sha>:main`; retry flaky pushes).
  **`StrataStrategyMapPage.tsx` byte-untouched across Phases 3 + 4.**
- **PHASE 3 COMPLETE** (3A · 3B-0 · 3B-1 · 3B-2 `12deb2d15` · 3B-3 `338da9903` · 3C `0a85e8535`).
- **PHASE 4 (governance & data) — Plan Lock APPROVED** `03_PLAN_LOCK_PHASE4.md` (Vikram 2026-07-15; P4-D0…D8 CONFIRMED;
  planning docs merged `918ca5689`). 4 discovery agents done (canonical/route/integration/data-safety). Slice order:
  **4A ✅ → 4B(23) → 4C(10) → 4D(19) → 4E(09) → 4F(20) → 4G(24 scoped)**. Anchor digests: `discovery/07_phase4_anchor_specs.md`.
  - **4A ✅ DONE (component only) — AWAITING commit/merge.** `StrataLifecycleStepper` added to `shared.tsx`
    (`variant='full'` numbered circles + note, anchors 09/20; `variant='dots'` compact, anchors 23/10; states
    done/current/todo/failed, token-pure, a11y per-step). **DRIFT-8:** consumer refactors DEFERRED to redesign
    slices (4E/4F/4B/4C) — no behavior-preserving refactor exists (anchor "current"=warning ≠ existing brand/info;
    DataPipeline stepper is icon-dot/removed by anchor 19). Gates green; live-verified when first consumed. Flagged to Vikram.
  - **⛔ NEXT = 4B (Reviews Index, anchor 23)** — redesign `StrataReviewsPage` index branch (`isDetail=false`): NOW
    band + review registry (derived rows, `StrataLifecycleStepper variant="dots"`, stage lozenge, decisions/follow-up
    counts) + snapshot registry (supersedes struck-through). Cut scheduling/chair/cadence (P4-D1). Reviews are DERIVED
    (no `strata_reviews` table) from snapshots+decisions+actions keyed by snapshot_key. Hooks exist: useSnapshots/
    useDecisions/useActions. Re-read anchor 23 via DesignSync before coding (drift protocol).
- **Phase 4 KEY FACTS (from discovery):** NO splits — StrataReviewsPage branches on `:snapshotKey`, StrataDataPipelinePage
  on `:runKey` (redesign-in-place); only 24 = NEW route `/reviews/:snapshotKey/pack` + `StrataBoardPackPage`. Backend
  gaps (P4-D2/D3/D4): board-pack editorial builder+Issue DEFERRED (file/gen record only); runs 2-way not 3-way;
  downstream dependents backward-derivable only; promote has no reverse RPC. NO migration this phase.
- Phase 5 (config & system-states: 03·04·05·25·26·27·28) — own Plan Lock. See OPEN DEBT below.
- **Phases 0/1/2 COMPLETE + merged** (see history below). **Phase 3 = HANDOFF "delivery & value"** per D-12
  (DRIFT-6 resolved): anchors **17 · 07 · 18 · 08 · 22 · 21**. Plan Lock `03_PLAN_LOCK_PHASE3.md` APPROVED
  (Vikram 2026-07-14; decisions **P3-D1…D8** all CONFIRMED — P3-D3 = scoped-down import on the existing
  dry-run/apply backend, no undo/conflict engine).

### Phase-3 slice status (order per Plan Lock)
| Slice | Anchor / target | Status |
|---|---|---|
| 3A-1a/b | 17 Project Cards List (`StrataExecutionPage`) | ✅ merged — grouped JiraTable (Card·source·↑Objective·Health·Forecast Δ·Benefit-at-stake·Blockers), inline milestone tree-rows, row→detail `?from=` |
| 3A-2a/b | 07 Project Card Detail (`ProjectCardDetailView`) | ✅ merged — strategic-role panel · Health&Forecast · unified "What threatens the forecast" · 360px rail (Details/Source System/Value Contribution) |
| 3B-0 | `StrataValueBar` hero + `multiple` variants (`shared.tsx`) | ✅ merged — additive `variant` prop; default path unchanged |
| 3B-1 | 21 Benefit Detail (`BenefitDetailSection` in `StrataPortfolioVmoPage`) | ✅ merged **(focused)** — verdict band + hero value stages. **DEFERRED:** 2-col rail (IN-THE-CHAIN + Confidence) + attestation-timeline |
| 3B-2 | 08 Portfolio Detail — NEW route `/strata/portfolio/:slug` (`StrataPortfolioDetailPage`) | ✅ **merged to main `12deb2d15` (session 012)**. Leakage hero (`StrataValueBar` hero + grounded verdict) · leakage-sorted benefits JiraTable · gates decision-context list (`decideGate`). P3-D2 client-derived via `useQueries`. No shadow (benefits/:slug + :slug/evidence + index all verified unbroken). Map zero-change. **DEFERRED:** objective-hop subline (kept "via N cards"). **⚠️ MERGE QUIRK:** GitHub rejected the `--no-ff` merge-commit push to main with `remote: fatal error in commit_refs` (no branch-protection/ruleset exists — verified). Fast-forward push of the identical commit (`git push origin <sha>:main`) succeeded. main + branch now BOTH at `12deb2d15` (no merge commit this slice). See [[github-noff-merge-push-rejected]]. |
| 3B-3 | 22 Portfolio Index — repurpose `/strata/portfolio` to a real index | ✅ **merged to main `338da9903` (session 013)**. New `StrataPortfolioIndexView` (leakage-concentration sentence + shared-scale small multiples + ranked-by-leakage JiraTable → row→detail + comparability footer). VMO page → thin **dispatcher** (bare `/portfolio` → index; `?portfolio=`/benefit slug → `StrataPortfolioManageView`, byte-identical). `StrataValueBar` gained additive `scaleOverride?` (default-preserving). No shadow/regression: `?portfolio=` management + `/benefits/:slug` + hero all verified unbroken. Map zero-change. **DEFERRED:** <1100 responsive stacking (small multiples already `auto-fit`); committed-spend SAR (no field). |
| 3C | 18 Import & Reconciliation (`StrataExecutionImportPage`, scoped-down P3-D3) | ✅ **built + gates green (session 014) — AWAITING commit/merge**. Anchor-18 signature onto the honest Excel dry-run/apply backend: DRY RUN `Lozenge` + **`StrataStatStrip`** summary (WILL CREATE/UPDATE/REJECTED/WRITTEN-0) + honest **COMMITMENT** band (idempotent re-import, no 24h undo) + role-gated **Apply**. Per-row `ResultTable`s + upload/classify/map steps unchanged. **NOT built (no backend):** Matched/Conflict/Unmatched, both-sides diff, 24h undo, run-log ledger. **⚠️ Preview-step screenshot NOT captured** — Chrome `file_upload` sandbox rejects synthesized files; verified by tsc+gates+code (canonical components). Map zero-change. |

## ⛔ NEXT = SLICE 3C — Import & Reconciliation (anchor 18), the LAST Phase-3 slice. (3B-2 + 3B-3 done, awaiting commit/merge.)
**No code without re-reading anchor 18 in full via DesignSync first** (drift protocol). Key resume facts:
- **3C is DELIBERATELY scoped-down (P3-D3, Vikram-confirmed):** redesign `StrataExecutionImportPage.tsx` (1015 LOC)
  to the anchor-18 LAYOUT on the EXISTING `importApi.importExecutionBatch` dry-run/apply backend
  (created/updated/rejected). **NO** fabricated Matched/Conflict/Unmatched three-way, **NO** both-sides diff,
  **NO "undo" affordance** — none of that backend exists. Render honestly: DRY RUN header + summary strip
  (`StrataStatStrip`: created/updated/rejected + "nothing written until you apply") + per-row validation table +
  Apply = single commit + honest commitment strip. States: match-run failure SectionMessage+retry (previous
  preserved); partial-apply per-row errors; empty→Config; restricted read-only dry-run (apply disabled, owning
  role named); <1100 stack. If the full reconciliation engine is wanted, 3C becomes its own backend feature (own Plan Lock).
- **Portfolio value spine COMPLETE (3B-0/1/2/3):** `/strata/portfolio` = index (`StrataPortfolioIndexView`, anchor 22);
  `/strata/portfolio/:slug` = detail (`StrataPortfolioDetailPage`, anchor 08); `?portfolio=`/`benefits/:slug` =
  `StrataPortfolioManageView` (the old VMO body). `StrataValueBar` variants all consumed: `hero` (08/21),
  `multiple`+`scaleOverride` (22, shared scale). P3-D2 client-derivation pattern lives in both index + detail.
- **3C (import) scope is DELIBERATELY reduced (P3-D3):** redesign to the anchor LAYOUT on the existing
  `importApi.importExecutionBatch` dry-run/apply (created/updated/rejected) — NO Matched/Conflict/Unmatched
  three-way, NO both-sides diff, **NO "undo" affordance** (none of that backend exists). Render honestly.

## Merge / commit discipline (unchanged — used for all 7 Phase-3 merges)
One slice = one commit (explicit files; feature docs alongside; `git add -A` banned). Verify the staged set
with `git diff --cached --name-status` before every commit (GitHub Desktop auto-committer may be active).
Merge to main via a temp worktree: `git worktree add <scratchpad>/merge-main main` → `git merge --no-ff
strata/impl-phase01` → symlink node_modules → re-run ALL gates on the merged tree → `push origin main` →
(from the shared checkout) `git merge --ff-only main` + `push origin strata/impl-phase01` → remove worktree.
**LESSON (this session):** never `cd` INTO the worktree persistently — run gates in a `( cd "$WT" && … )`
subshell and remove the worktree from the repo-root cwd, else removing it deletes your cwd (concurrent-session
rule → STOP + re-verify). Gates: `npx tsc --noEmit` · `npm run lint:colors:gate` · `npm run audit:ads:gate`
(baseline 19799) · `npm run lint:cre`. Live-verify every UI slice light + dark on `localhost:8080`.

## Phase 0/1/2 history (reference)
- Phase 0/1 complete (earlier sessions). **Phase 2** (measure & direction) COMPLETE + merged: 2A StrataChainStrip ·
  2B KPI Detail (06) · 2C KPI/OKR Library (16, `da80fdb43`) · 2D Strategy Room (02, `a11d8e8e9`) · 2E Element
  Detail (14, `f1c3a3364`) · 2F Evidence (15, `f4b2b2b6a`). Detail for those slices is in git history + the
  lower sections of this file (below OPEN DEBT).

## ⚠️ OPEN DEBT (carry into Phase 3 — do NOT lose)
1. **Prod migrations BLOCKED (no prod access this session — tackle later).** `20260713100000`
   (plan-variance, session 004) and `20260713110000` (strata_saved_views + strata_bulk_update_kpis, 2C-2a)
   are applied to **staging (`cyijbdeuehohvhnsywig`) ONLY**; prod (`lmqwtldpfacrrlvdnmld`) is unreachable via
   the Supabase MCP. Apply BOTH on the next prod migration run (link a disposable dir, `execute_sql` +
   explicit ledger INSERT since MCP apply_migration stamps its own version — see CONCURRENT SESSIONS rule).
   Until then: Scorecards-Index "Vs plan" and any bulk/saved-view write error-degrade on prod only.
2. **Backend defect `task_65642237`** — `strata_promote_element` references the dropped `strata_play_charters`
   table and errors for legacy elements ("relation public.strata_play_charters does not exist"). Fix to use
   `strata_theme_charters` (or drop the dead 'play' branch) + committed migration. The Promote UI already
   surfaces the rejection correctly (§17); this is a pre-existing backend bug, not a UI regression.
3. **Deferred Phase-2 nice-to-haves (non-anchor-critical, optional):** Element-Detail OKR anchor-table
   restyle + locked-snapshot band; Evidence exact Step/Fact lineage-table restyle + "differs from live" markers.
4. Spun-off background task `task_70e821ad` — data-source freshness/staleness column (schema gap).
5. **Phase-3 deferred polish (anchor 21, from slice 3B-1):** the 2-col Benefit-Detail restructure with a 360px
   rail (IN-THE-CHAIN links: objective ↑ / delivery ▦ / measured-by ◎ / gate ⚖, + Confidence panel) and
   attestation-history-as-timeline were NOT built — verdict band + hero value stages shipped, other panels
   preserved as-is. Fold into a 3B-1b pass or the 3B-2 portfolio-page restructure.
6. **Phases 4–5 NOT started** (governance & data: anchors 09·10·19·20·23·24; config & system-states: 03·04·
   05·25·26·27·28). Each needs its own Plan Lock per CLAUDE.md before any code.

### 2E Element Detail (anchor 14) — SPLIT 2E-1/2E-2/2E-3. Page: `StrataStrategyElementDetailPage.tsx`.
- Anchor 14 = 2-col ViewBase: left body [health verdict (LEADS) → StrataChainStrip → Charter (Intent/Scope)
  → OKRs table] + 360px rail [Details field rows + History]. Draft → DRAFT lozenge + "Promote to active"
  (server-validated `strategyApi.promoteElement`, lists requirements). Themes = same shell, theme charter +
  child-objective list replacing OKRs. Restricted read-only; locked snapshot band. Health = derived (P2-D5,
  reuse `healthKeyFor` from 2D-2b — achievement rollup of linked KPIs).
- **DECISION (session 008):** the current rich Theme panels (Execution Summary, Governance, Project Cards,
  Strategy relationships) are NOT in anchor 14 but are PRESERVED in the left body (no regression, same rule
  as DRIFT-4/D-9). Anchor sections layer on TOP.
- **2E-1 DONE** — 2-col grid (left body 1fr + 360px sticky rail). Rail = Details field rows (Type/Lifecycle/
  Owner/Perspective/Parent/Charter) + History (audit). Removed standalone Summary + Audit panels; all other
  panels kept in left body. Gates green; light+dark; objective + theme both verified.
- **2E-2 DONE** — health verdict (derived rollup via useQueries over linked KPIs in the active period,
  worst-band, grounded sentence) LEADS the left body + StrataChainStrip (Theme/Measures/Delivery/Value/
  Decisions, multi-hop: element_kpis, project cards by objective_element_id, benefit↔card, decisions by
  element_id). Gates green; light+dark. NB: useQueries placed BEFORE the early returns (rules of hooks).
- **2E-3 DONE** — Promote-to-active (draft, server-validated + §17 rejection surfaced), Charter INTENT/SCOPE
  prose restyle, responsive rail-fold <1100. Backend defect flagged: `strata_promote_element` references
  dropped `strata_play_charters` for legacy elements (task_65642237). Deferred nice-to-haves: OKR table restyle, locked band.

### 2D Strategy Room (anchor 02) — SPLIT 2D-1/2D-2/2D-3/2D-4. HARD GATE: map component never touched.
- **Anchor 02 re-read in full (session 007).** **MAP BASELINE captured:** `/strata/strategy/map` = 18
  React-Flow nodes · dashed edges (Drives/Contributes/Enables) · 4 zoom controls · legend. RE-PROBE + visual
  diff after EVERY 2D slice; `git status` must show ZERO map-file changes (`StrataStrategyMapPage.tsx` + deps).
- **Decisions:** P2-D5 Health = **derive from linked-measure bands** (no element-health column/RPC exists —
  only stage/status); P2-D4 Narrative = **3-way toggle now, body in 2D-4** (no anchor chrome for Narrative).
- **2D-1 DONE** (`StrataStrategyRoomPage.tsx` only): `ViewToggle` (Structure/Map→navigate-out/Narrative) +
  `ReadinessBand` (4 tiles: measures/owners/execution/draft, client-derived from elements+element_kpis+
  project-cards.objective_element_id) replacing StrataStatStrip. Narrative = placeholder. Existing tree +
  authoring modals PRESERVED. Gates green; live-verified light+dark; map zero-change gate PASSED.
- **2D-2 DONE** (`StrataStrategyRoomPage.tsx` only): hand-rolled `renderNode` → **JiraTable** (flat rows +
  `getRowDepth` indent, NOT `groups` — themes carry column values so a label-header group doesn't fit).
  Columns Element(chevron+chip+name+DRAFT+gap chip)·Owner·KPIs(count, orange 0 gap)·Cards(objective_element_id;
  theme rolls up descendants)·Actions(Promote+menu). Gap chips NO MEASURES/NO OWNER; "Show coverage gaps only"
  toggle (gap rows + ancestors); dropped KPI-coverage + Cause-effect panels (subsumed). Draft = DRAFT lozenge
  (JiraTable has NO per-row style hook, so no dashed accent). Gates green; light+dark; MAP zero-change PASS.
- **2D-2b DONE** — Health column (derived rollup via `useQueries` over linked KPI achievement bands, worst-band;
  Tooltip "derived"; no measures → —) + Benefits column (multi-hop `useBenefitProjectCards` ⋈ card.
  objective_element_id). Column order now Element·Owner·Health·KPIs·Cards·Benefits·Actions; Promote folded into
  the Actions menu (no wide button column). Gates green; light+dark; MAP zero-change PASS. Anchor-02 tree COMPLETE.
- **2D-3 DONE** — 360px inspector rail (2-col grid). Selected element → chip + Open-full-page + name +
  description + `StrataChainStrip` (Theme/Measures/Delivery/Value, real multi-hop) + Owner/Lifecycle/Health/
  Perspective + derived attention callout. Row/name click SELECTS (no nav; nav via "Open full page"); Esc
  closes; <1280 → overlay drawer (`isNarrow` resize listener). No full-row highlight (JiraTable lacks the
  hook — feedback is brand-toned name + rail). Gates green; light+dark; MAP zero-change PASS.
- **2D-4 DONE** — Narrative view = grounded executive prose (`renderNarrative`): per theme a composed
  verdict sentence from real counts + health lozenge + "Open →", then objectives as one-liners with
  measures/cards/benefits + gap warnings. No invented content. Approach approved by Vikram. Gates green;
  light+dark; MAP zero-change PASS. **✅ 2D COMPLETE.**
- 2C-2 split into 2C-2a (backend ✓) · 2C-2b (columns) · 2C-2c (BulkFooterBar) · 2C-2d (saved views + filters).

## ⭐ PHASE 2 — NEXT (START HERE). Plan Lock: `03_PLAN_LOCK_PHASE2.md` (APPROVED, full build)
Phase 2 = measure & direction, 5 REDESIGNS of existing pages. Slice order: **2A ✓ · 2B ✓ · 2C-1 ✓** →
**2C-2 (DO NEXT)** → 2D Strategy Room (SPLIT) → 2E Element Detail → 2F Evidence. Map protection is
structural: `/strata/strategy` is NOT the map (it's `StrataStrategyRoomPage`); the map is a standalone
route; nothing imports the map component — so the Structure view (2D) is a Room-page redesign + a toggle
whose "Map" navigates out.

### DONE + merged (Phase 2)
- **2A** `84fcb57ff` — `StrataChainStrip` in `shared.tsx`. API: `StrataChainStrip({ segments, heading?,
  testId })`; `segments:[{ icon?, label, items:StrataChainLink[], emptyText? }]`;
  `StrataChainLink:{ name, onNav?, meta?, tone?:'default'|'danger' }`. Now mounted on KPI Detail.
- **2B-1** `78f1d9efd` — KPI Detail verdict band + Trend + StrataChainStrip + trust strip. Chain/trust
  sourced from **`useKpiEvidenceChain(kpi.id, activePeriod.id)`** (RPC keys: elements/projects/benefits/
  formula_version/lineage/actual). Scorecards chain segment OMITTED (not in RPC — zero-assumption).
- **2B-2** `98ba2b2d4` — unified "Actuals & validation" table (Period·Actual·Target·Band·Validation·
  Commentary·Lineage; commentary = period-scoped column; orphaned Commentary panel removed); role-gated
  Validate (`VALIDATE_ROLES`, `kpiApi.attestActual`). Anchor-06 COMPLETE.
- **2C-1** `91c0f868e` — KPI Library verdict-first columns (KPI+status · Achievement · Actual/Target ·
  Trend spark · Validation · Owner · Freshness) via per-row achievement + deduped `useKpiActualsLite`
  (`kpiApi.actuals`). Removed dead DirectionCell/ValidatorCell/dataSourceNameById. OKR accordion kept.

### 2C-2 — KPI Library: bulk + saved views + anchor-16 richness (`StrataKpiLibraryPage.tsx`). RE-READ anchor 16 in full at start.
Anchor 16 **COMPLETE** — 2C-2a ✓ · 2C-2b ✓ · 2C-2c ✓ · 2C-2d-1 ✓ · 2C-2d-2 ✓ (all DONE session 007).
- **2C-2d-2 DONE** — Validation filter chip (page-level actuals batch via `useQueries`, deduped w/ cells;
  All/Validated/Pending/Rejected/Quarantined/No data) + **Saved views** ("Saved views ▾" selector, built-in
  "My exceptions" = Band Below-threshold, user views via `strata_saved_views`, Save/Delete). New:
  `kpiApi.savedViews/createSavedView/deleteSavedView`, `useSavedViews`, `StrataSavedView`. Gates green;
  live-verified light+dark incl. real DB insert (Board exceptions) + delete (cleaned up).
- **2C-2d-1 DONE** (`StrataKpiLibraryPage.tsx` only) — page-level achievement batch via `useQueries`
  (deduped with cells); filter toolbar Status·Band·Perspective·Owner (`StrataChipMenu`); Band "Below
  threshold" = appearance ∈ {removed,moved}; worst-first achievement default sort (Achievement col now
  sortable); filter summary bar (Showing N of M — filtered to … · Clear filters · Sorted by …). Gates
  green; live-verified light+dark. NOTE: `useQueries` result array is fresh each render — memo keyed on
  resolved-count string. Spacing tokenized to `var(--ds-space-*)` (audit caught an off-grid 10px).
- **2C-2c DONE** — BulkFooterBar extended additively (`actions`/`note`/`BulkAction`, existing verbs +
  4 consumers untouched); JiraTable `selectable`/`selection` wired → anchor leading checkbox; verbs
  Change owner… · Assign threshold scheme… (gated canAuthor, → `kpiApi.bulkUpdate`/`strata_bulk_update_kpis`)
  · Export (client CSV). Result → SectionMessage banner (honest approved-KPI rejection surfaced, §17).
  New: `kpiApi.bulkUpdate`, `StrataBulkUpdateResult` type. Gates green; live-verified light+dark
  (0 applied/2 not-applied on 2 approved KPIs). Footer full-width overlaps sidebar Configuration label
  (pre-existing canonical BulkFooterBar behavior — not a regression).
- **2C-2b DONE** (`StrataKpiLibraryPage.tsx` only) — columns now match anchor 16 (DRIFT-5): dropped Trend
  spark; split Actual + Target; added Δ (vs prior period, direction-aware arrow+color, grayscale-safe);
  objective-ancestry sub-line "↑ {objective}" (useElementKpis⋈useStrategyElements, objectives-win);
  freshness staleness glyph ●/◐/○ + relative time (absolute on hover); Owner NO-OWNER → "— no owner".
  Gates green; live-verified light+dark. New cell helpers: `KpiValueCell`, `KpiDeltaCell`+`fmtDelta`,
  rewritten `KpiFreshnessCell`. Cell `useKpiActualsLite` feeds Δ+Validation+Freshness (one deduped fetch).
Anchor 16 re-read in FULL session 007 → **DRIFT-5** (anchor has NO trend spark; splits Actual/Target;
adds Δ) **RESOLVED (Vikram): match anchor exactly** — 2C-2b drops trend spark, splits Actual + Target,
adds Δ. Remaining anchor-16 work (Vikram: build everything, nothing deferred):
1. **Governed bulk RPC — ✓ DONE (2C-2a, migration `20260713110000`, staging-applied; prod parked).**
   `strata_bulk_update_kpis(p_kpi_ids uuid[], p_accountable_owner, p_threshold_scheme, p_reason) → jsonb
   {applied,failed,results:[{kpi_id,ok,error?}]}`. **HONEST-LOOP design** (session-007 decision): loops the
   existing `strata_update_kpi`, which REFUSES approved KPIs ("retire and recreate…") — no versioning
   subsystem was built. So the bulk verb applies to draft/pending KPIs; approved rows return the honest
   per-row rejection for BulkFooterBar to surface (§17). Role-gated strategy_office/kpi_owner/admin.
   Also shipped `strata_saved_views` table (per-user, RLS user_id=auth.uid(), NO slug — not URL-nav) for 2C-2d.
   No TS types added yet — add `SavedView` + bulk-result types to `src/modules/strata/types.ts` when 2C-2c/d consume them.
2. **BulkFooterBar** (reuse `src/components/shared/JiraTable/BulkFooterBar.tsx`): JiraTable `selectable`/
   `selection`/`onSelectionChange` + footer verbs **Change owner… · Assign threshold scheme… · Export**.
   Export = client-side CSV of selected (safe). Owner/scheme = the new governed RPC + "routes through
   approval" note. Anchor row has a leading 28px checkbox column.
3. **Saved views (P2-D2):** `strata_saved_views` migration (per-user named filter/column config, entity
   'kpi', jsonb). "Saved views ▾" selector + save/select/delete. Default view "My exceptions" = filtered to
   below-threshold bands. Anchor annotation: "Saved views per user via canonical BasicFilterBar."
4. **Filter enrichment + summary bar + sort:** filter chips **Band (Below+Critical) · Perspective · Owner ·
   Validation** (current page has only search + status). Filter summary bar: "Showing N of M — filtered to
   … · Clear filters · Sorted by achievement, worst first". Default sort = achievement ASC (worst first).
5. **Column refinements (anchor 16):** KPI name cell gets an **objective-ancestry sub-line** ("↑ {objective}"
   — from element_kpis→elements); add a **Δ column** (vs prior period, from actuals); Freshness → **staleness
   glyph** ● (fresh) / ◐ (aging) / ○ (stale >5d, danger) + relative time, not the plain date 2C-1 shipped.
   NO OWNER renders "— no owner" (value, never blank).
6. States: loading skeleton rows; empty → model builder; no-results → summary + clear; <1280 Owner+Freshness
   merge under name; <900 stacked verdict cards.

### 2B — KPI Detail — DONE (kept for reference: current-page wiring)
- Hooks `useKpiBySlug`→`kpi`, `useKpiDetail(kpi.id)`→
  `{formulas,targets,actuals,lineage,calc}`, `useKpiAchievement(kpi.id, activePeriod.id)`→`achievement`
  (`{achievement, score, status_key, actual, target, confidence}`), `commentaryQ` (`kpiApi.commentary`),
  `elementKpisQ`+`elementsQ` (chain: linked objective/theme), `uploadRunsQ` (trust/last-run), `rolesQ`.
  `trendRows` memo (targets⋈actuals per period, sorted) at ~366; `chartData` at ~391. Many governance
  modals (submit/approve KPI, approve formula, attest, edit/new-formula/set-target/submit-actual) —
  KEEP. Roles: `CREATE_ROLES`, `SUBMIT_ROLES` (~45). Render starts ~519.
- **Chain-data sourcing DECISION (resolve at 2B-1 start):** ↑ Objective is available now
  (`elementKpisQ` filtered to this kpi → `elementsQ`). Scorecards/Projects/Benefits linkage for a KPI is
  NOT loaded on the page. Option A: use `useKpiEvidenceChain(kpiId, periodId)` (F-REP-005, returns full
  chain — check its shape first) to populate all 4 segments. Option B: populate ↑ Objective truthfully +
  render honest `emptyText` for segments without loaded data, add wiring incrementally. Recommend A if
  the hook's shape is clean; else B (zero-assumption — never invent links).

### Shipped + merged (sessions 003–004, all live-verified, gates green)
- `16d41e844` **1A-4** CC close-out — whole-page restricted (§17), "Mine" one-click Clear,
  changes-since-snapshot client diff (D-3, "Since the last locked review" Row 3), trend-dot a11y
  (§14: role=link, tabindex, aria-names). Merge `ab93cddd2` (also carried sessions 001–002 work).
- `7c00a061b` **1C-1** Scorecards Index → anchor-12 **card scope-chooser** (full redesign, D-9;
  resolves DRIFT-4): instance cards (64px ring + band + scope + Δ-vs-prior + coverage footnote),
  CEO accent border + first, judgment one-liner, restricted/empty/skeletons/docTitle; Models grid
  DROPPED (Model Builder owns models). NEW `useScorecardCalcs` batch hook. Merge `2e2e3c15a`.
- `03892b726` **1C-2** ranked "Where attention pays" panel (JiraTable). Merge `665d105e4`.
- `ff222cf7f` **1D** Scorecard Detail close-out — ?from= threading (Evidence + line ⓘ; EvidencePage
  got `strataOriginLabel()` prefix resolver → "Back to Scorecard"), role-gated Recalculate
  (RECALC_ROLES = strategy_office/vmo_validator/strata_admin), layout-matched skeletons, whole-page
  restricted, "Partial — N of M lines have data" label, **D-6 dual-mode slug|UUID**
  (`scorecardApi.instanceBySlug` + canonical-slug replace-redirect). Merge `83b9728f2`.
- `b5e99ea6c` **plan-variance backend (D-11, task_e44f1ba9)** — migration `20260713100000`:
  `strata_kpi_plan_achievement` + `strata_calc_scorecard_plan_variance` (read-only, uncapped
  achievement rollup; 100 = on plan; locked → 'locked_snapshot' null; no provenance writes).
  Ranked panel re-based to true "Vs plan" (supersedes D-10 interim). Merge `0b3ab232f`.
- `9a83af9ba` handover refresh (merge `c643fe182`).
- `926cece43` **Scorecard Detail anchor-13 polish** — composed verdict sentence (worst perspective +
  below-target measures linked to KPI evidence w/ ?from=, + Δ-vs-prior), **Contribution column**
  (per-line share of total; Σ = total score, verified 96.5), roll-up mechanics footer; panel
  retitled "Measures by perspective". Fixed a const-TDZ (`refNameFor` used before init) caught in
  live verify (gates were green — screenshots catch what tsc can't). Merge `062bfa741`.
- Earlier (sessions 001–002, on main via `ab93cddd2`): 0A sidebar IA + spine slots + JiraTable
  overflowX · 0B StrataSnapshotBand · 1A-1 ?from= + "n days overdue" · 1A-2 locked snapshot band ·
  1A-3 judgment band · 1A-2b spine scope/freshness + data-trust strip.

## ⚠️ OPERATIONAL — prod migration pending
`supabase/migrations/20260713100000_strata_scorecard_plan_variance.sql` is applied to **staging
(`cyijbdeuehohvhnsywig`) ONLY** — prod (`lmqwtldpfacrrlvdnmld`) is unreachable via the Supabase MCP.
Until applied to prod, the Scorecards Index "Vs plan" column error-degrades there (per-panel banner,
page never blanks). **Apply on the next prod migration run.** Ledger discipline held: staging row
`20260713100000` matches the committed file 1:1 (applied via execute_sql + explicit ledger INSERT,
because MCP apply_migration stamps its own version).

## ⚠️ GIT HAZARD — GitHub Desktop auto-committer STILL ACTIVE ([[github-desktop-autocommit-hazard]])
Not paused in session 004 (Vikram chose "work carefully"). Discipline that worked (zero sweeps):
verify the staged set with `git diff --cached --name-status` before every commit; `git log
--oneline -3` after. **Merge-to-main flow used** (Vikram said "merge and commit" per slice):
temp worktree via `git worktree add <scratchpad>/merge-main main` → `git merge --no-ff` → symlink
node_modules → re-run ALL gates on the merged tree → push → remove worktree. Never `git checkout
main` in the shared checkout.

## Design authority (PARENT-ONLY access)
claude.ai design project `e8a6bad6-1868-4b84-96bf-d6d49474b58a` via **DesignSync** — subagents
CANNOT load it ([[designsync-parent-only]]). Anchors 01/11 read fully in sessions 001–002; **12 and
13 read fully in session 004** (`anchors/12 Scorecards Index.dc.html`, `anchors/13 Scorecard
Detail.dc.html`). Digest in `discovery/00_anchor_specs.md`.

## HARD protections (verify every slice — held through session 004)
- `/strata/strategy/map` (`StrataStrategyMapPage.tsx`) — ZERO change (untouched sessions 003–004).
- Sidebar (`EnterpriseSidebar.tsx`) + top nav — VISUAL FROZEN (untouched sessions 003–004).

## Decisions (09_DECISIONS.md — all CONFIRMED)
D-0 sidebar visual-frozen+IA · D-1 keep StrataPageShell · D-2 defer drawer-first drill (?from=
instead) · D-3 changes-since-snapshot = client diff · D-4 defer LifecycleStepper · D-5 My Work no
CRE chokepoint · D-6 dual-mode slug|UUID (DONE in 1D) · D-7 defer StrataChainStrip to Phase 2 ·
D-8 CC keeps trend chart + AI advisory · **D-9** Scorecards Index = full anchor-12 card redesign
(DONE) · **D-10** interim ranked basis (SUPERSEDED by D-11) · **D-11** vs-plan = uncapped-achievement
rollup RPC (DONE; naive targets-as-actuals rollup proven degenerate — constant 100).
Drift log: DRIFT-1/2 (CC layout, resolved via D-8) · DRIFT-3 (D-3 panel = new full-width row) ·
DRIFT-4 (anchor-12 vs Plan Lock, resolved via D-9).

## NEXT — remaining work (in order of value)
1. **1B My Work** (`/strata/my-work`) — **SKIPPED by Vikram 2026-07-13 ("ignore My Work"), not
   cancelled.** Full spec in `discovery/00_anchor_specs.md` (anchor 11): new page + route before
   catch-all + `strataRoutes.myWork()` + routeRegistry + sidebar item; `useMyWork` aggregator;
   verb groups Validate/Submit/Resolve/Act(+Approve); JiraTable compact + group headers;
   consequence column; Mine/Team; NO CRE chokepoint (D-5). Ask before starting.
2. **Anchor-13 polish — DONE** (`926cece43`). Remaining anchor-13 nice-to-haves NOT built: per-line
   Actual/Target split columns + per-line Δ-vs-Q1 column (needs prior per-line calc matching);
   composition popover per score cell; row-drawer (CatalystViewBase panel mode — D-2 deferred).
3. **Apply migration 20260713100000 to prod** (see OPERATIONAL above).
4. Spun-off background task `task_70e821ad` — data-source freshness/staleness column (schema gap;
   data-trust strip "N stale").
5. **Phase 2 is ACTIVE** — Plan Lock approved (`03_PLAN_LOCK_PHASE2.md`), 2A done; resume at 2B-1 (see
   the ⭐ PHASE 2 — NEXT section at the top). **Phases 3–5 still need their OWN Plan Locks.**

## As-built quick reference
- **Command Center rows:** 1 judgment band · 2 trend (8) + perspective health (4) · 3 "Since the
  last locked review" (D-3 diff vs last locked snapshot in the active cycle, matched by
  perspective_id) · 4 needs-attention inbox (Mine/All + Clear) · 5 AI advisory · 6 data-trust
  strip. Locked mode: StrataSnapshotBand above Row 1 (inside the non-restricted branch).
  Whole-page restricted when `useStrataRoles()` → 0 roles (pattern repeated on Index + Detail).
- **Scorecards Index:** judgment one-liner → instance cards (active period; CEO accent-border
  first, then worst score; cards are presentational — calc via `useScorecardCalcs`) → "Where
  attention pays" JiraTable ranked by vs-plan variance asc (`useScorecardPlanVariances`),
  coverage sub-note, Δ-vs-prior retained.
- **Scorecard Detail:** hero composed verdict (worst perspective + below-target measures as
  `VerdictLink`s to KPI evidence + Δ-vs-prior via prior-period instance calc); "Measures by
  perspective" table with a Contribution column (`contributionByLineId` = persp weight-share × line
  weight-share × line score, Σ = total); roll-up mechanics footer. ?from= via `originPath`;
  RECALC_ROLES gate; DetailSkeleton/LinesSkeleton; partial label keyed on `calc.lines` has_data;
  UUID param → replace-redirect to slug. NB: `refNameFor` MUST stay declared above the verdict
  memos (const TDZ).
- **Conventions learned:** ADS font weight 653 (not 650 — audit gate rejects); `var(--ds-space-*)`
  for new spacing (6px → var(--ds-space-075)); restricted = full-size EmptyState, never bare 403.

## Environment / verification gotchas (unchanged)
- Dev app + Supabase MCP → staging `cyijbdeuehohvhnsywig` ONLY; `execute_sql` takes explicit
  project_id. Re-verify before any write.
- Vitest CANNOT run (rolldown/node toolchain) — verify via tsc + gates + live DOM/screenshots.
- Gates before every commit: `npx tsc --noEmit` · `npm run lint:colors:gate` ·
  `npm run audit:ads:gate` · `npm run lint:cre`.
- Locked-mode UI: CC Period → "Q1 FY2026 · closed" (SNAP-1001). D-6 test URL:
  `/strata/scorecards/a5a1a000-0000-4000-8000-000000001512` → canonicalizes to slug.
- RTK mangles `grep -n` line numbers → `rtk proxy grep`.

## Commit discipline
One slice = one commit; explicit staging only; Vikram approves file list + message; feature folder
committed alongside; after every commit check `git log` for foreign "commit" sweeps; merge to main
via the temp-worktree flow above with gates re-run on the merged tree; push only on Vikram's word.
Co-author trailer: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
