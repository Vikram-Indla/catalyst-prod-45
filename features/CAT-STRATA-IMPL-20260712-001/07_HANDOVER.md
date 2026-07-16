# 07 — HANDOVER · CAT-STRATA-IMPL-20260712-001

> Resume point. **Phases 0–5 COMPLETE. ✅ PHASE 5 (configuration & system states) COMPLETE — slices 5A–5G merged to `main`.**
> **Phase 5 anchors shipped: 03 (config landing 5A) · 04 (measurement domain + taxonomy 5B) · 05 (model integrity 5C) ·
> 25 (threshold bands 5D) · 26 (data & integration 5E) · 27 (roles & access 5F) · 28 (canonical system states 5G).**
> **⛔ THERE IS NO PHASE 6 — the design pack is FULLY IMPLEMENTED (28/28 anchors).** HANDOFF's build order allocates every
> anchor across Phases 0–5: P1 `01·11·12·13` (4) · P2 `06·16·02·14·15` (5) · P3 `07·17·18·08·22·21` (6) ·
> P4 `10·23·24·09·19·20` (6) · P5 `03·04·05·25·26·27·28` (7) = **28**. An earlier revision of this file said
> "NEXT = Phase 6 per HANDOFF build-order" — that was **WRONG** (corrected 2026-07-16). **No UI phase remains.**
> Everything still open is BACKEND, OPS or optional POLISH — see LIVE DEBT below. Each backend item needs its own
> migration + Plan Lock; do NOT start one expecting a "Phase 6" scope to exist.
>
> ## ▶ START HERE — resume point (2026-07-16, PR #348 merged to `main` @ `77fd5c26a`)
> **Design pack 28/28 anchors · §20 acceptance 7/7 · suite 2,426/2,448 green · map never touched in the entire feature.**
>
> ### ✅ measures builder **part 2b** — DONE (session 025, 2026-07-16). Anchor 05's builder is COMPLETE.
> Built as specced; gates green; live-verified on staging. The measures table went **0 → 2 rows** through the new UI as
> `strategy_office`, which also closed part 2a's only gap (populated rows had been verified by construction only).
> Proven end-to-end: replace-set (2nd save → still 2 rows, not 4) · order_index re-derived from position · draft seeds
> from persisted rows · group verdict flips ✕0→✕60→✓100→✕90 live · **the anchor-05 band renders "✕ Financial measure
> weights total 90 — assign the remaining 10"** (the exact band P5-D3 could not build) · Save blocked at ≠100 with a
> VISIBLE named reason · M-D0 held (direction READ per KPI: "Higher is better" vs "Lower is better") · M-D1 held (exactly
> four aggregation values) · light + dark. Evidence + **4 raised findings**: `sessions/025_measures-builder-part2b.md`.
>
> **⛔ ONE THING TO RATIFY before treating 2b as closed:** the Save gate treats an EMPTY perspective group as PASSING.
> The Plan Lock's literal "gate Save on every group totalling 100" would include empty groups — but Save is a
> replace-set (sends the FULL set), so that reading makes the first save of a part-built model impossible. Implemented
> to mirror `ModelIntegrityBand`, which flags only groups that HAVE measures. Confirm or overrule.
>
> ### ⛔ THE ONE THING TO DO NEXT — pick from the backend-feature list below (no slice is pre-selected)
> Nothing is queued. Every remaining item needs its own migration + Plan Lock. **Do not start one expecting a spec to
> already exist** — 2b was the last item with a ready-to-build spec.
>
> ### Environment — READ BEFORE RUNNING ANYTHING
> - **Tests need Node 22:** `PATH="/opt/homebrew/opt/node@22/bin:$PATH" npm test`. On the global Node 20 vitest dies at
>   startup (`util.styleText` / `ERR_INVALID_ARG_VALUE`) — that crash is a VERSION MISMATCH, not a broken suite. It hid
>   a 2,414-test suite for the whole implementation. `engines` now pins `>=22`.
> - **`catalyst-prod` is a SCOPE, not production** (INACTIVE/paused, different org). **`catalyst-staging`
>   (`cyijbdeuehohvhnsywig`) IS the live target.** There is no prod migration debt and no prod DDL to fear.
> - Prod token (if ever needed) lives OUTSIDE the repo at `~/.catalyst/supabase-prod.env`; `.gitignore` now covers
>   `.env*`. Never paste a token into chat.
> - Migrations: `execute_sql` + an **explicit ledger INSERT** (MCP `apply_migration` stamps its own version and breaks
>   the file↔ledger 1:1 rule).
>
> ### Shipped this session (all on `main`, all gates-green AND live-verified)
> `task_65642237` fix (`strata_promote_element` → `strata_theme_charters`; it broke **every** theme promotion, not just
> "legacy" as logged) · §20 pass 7/7 · Phase 6 (vitest unblocked, +34 tests) · **B2** freshness (no migration needed) ·
> **F1a** SoD RPC (`strata_check_role_sod`) closing anchor 27's column · **F2** view-as audit (`strata_log_view_as`) ·
> **measures** table + `strata_set_model_measures` + readers + groups/integrity UI (part 2a).
>
> ### Decisions in force
> **M-D0** a measure is a KPI ASSIGNMENT (assoc table; NO `strata_measures` master; `scorecard_lines` stays
> instance-level) · **M-D1** ONE aggregation vocabulary — `weighted_average|sum|min|custom` (verified byte-identical to
> `rollup_method`) · **M-D2** split the slice · **F1-D1** F1a approved · **F1-D2** CONFLICT deferred (the server never
> refuses a role COMBINATION, so claiming one would assert a check that does not exist).
>
> ### ⚠️ The pattern that bit SIX times this session — do not inherit a "can't" without re-testing it
> 5G-2 slug routing · vitest · prod-migration debt · DEF-013's premises · `task_70e821ad`'s "schema gap" · F1a's own
> first design. **Every one was a true observation with a wrong conclusion, carried forward because nobody re-ran the
> check.** Before you write "X is impossible" into a Plan Lock, run the one query/command that tests it.
>
> ### Still open
> Backend features remaining (2b is now OFF this list): band-editor · model draft-create · preview-with-data ·
> version diff · score-shift impact · source register/retire · board-pack editorial+Issue · blast-radius ·
> quarantine tier · `strata_reviews` entity · mapping-memory · import 3-way+diff+undo+ledger. **DEF-010** needs a
> product decision (draft linking vs post-approval). **DEF-013** is parked behind the multi-tenancy initiative
> (already ruled). 6 pre-existing ChatDock test failures are NOT ours (foreign module, predate this feature).
>
> ### ⚠️ Suite baseline correction (session 025)
> "2,426/2,448 green" was recorded BEFORE `def869232` (B2 freshness) landed. That commit added a
> `StrataFreshnessGlyph` usage without regenerating `usage-map.generated.ts`, so **`registry-drift` was failing on
> `main`** — a 7th failure nobody had attributed. Session 025 regenerated the map, repairing it. Back to 2,426 passed /
> 6 failed (all ChatDock). **`npm run scan:components` FAILS** (`tsx` is not on the global Node 20 PATH) — run
> `PATH="/opt/homebrew/opt/node@22/bin:$PATH" npx tsx scripts/scan-components.ts` instead. Adding any new component
> import to a page makes this test fail until the map is regenerated.

---

> **✅ 5G-2 NOTIFICATION LANDING SHIPPED** (`ceb99e56f`) — the earlier "UUIDs can't build slug routes" blocker was wrong in
> its conclusion: there is no link column, but every entity_table can be hopped id→slug, and the same hop returns the
> resolution state. `governanceApi.resolveNotificationTarget(n)` → `{ key, done }` (kpis→slug · benefit_values→benefit.slug ·
> decisions→snapshot.snapshot_key · dependencies→requesting_id→project_card.slug). The bell lands on the OBJECT with
> `?n=<id>` and falls back to the area landing when `key` is null (one seeded decision is orphaned). `StrataNotificationBand`
> is mounted ONCE in `StrataPageShell` → every object page shows the "why am I here" band; live + expired variants.
> **No Phase-5 UI debt remains.** Anchor 28's panel-scale "object deleted mid-session" variant was never in Phase-5 scope.
>
> **Phase-5 DEFERRED backend features (each needs its own migration + Plan Lock):** threshold band-editor authoring ·
> scorecard-model draft-create · model measure-level authoring (no model-measure table exists) · preview-with-data ·
> version diff · data-source register/retire (+ dependents-impact check) · **server SoD-check RPC** (per-assignment
> CLEAN/GUARDED/CONFLICT — deliberately NOT faked) · view-as audit-log write · server-calculated score-shift impact preview.
> **Earlier-phase backend deferrals still open:** board-pack editorial builder + Issue · run downstream blast-radius RPC ·
> quarantine validation tier · `strata_reviews` scheduling entity · mapping-memory write (all P4) · import
> Matched/Conflict/Unmatched + both-sides diff + 24h undo + run-log ledger (P3 · 3C).
>
> **⚠️ LIVE OPS + VERIFICATION DEBT — STILL OPEN. Do NOT lose: it is duplicated below the `# ARCHIVE` marker, where it
> reads as history. This block is the authoritative copy.**
> 1. ~~**Prod migrations parked**~~ — **DISSOLVED 2026-07-16 (Vikram): `catalyst-prod` is only a SCOPE/placeholder
>    project, NOT a live production system.** There is no production environment to migrate to, so this was never real
>    debt. `20260713100000` (plan-variance) + `20260713110000` (saved-views + bulk-update) are applied to
>    **`catalyst-staging` (`cyijbdeuehohvhnsywig`) — which IS the live target**, so nothing is degraded anywhere.
>    Evidence: Management API reports `catalyst-prod` (`lmqwtldpfacrrlvdnmld`, org `wxrdscstztinvcjdcgka`) =
>    **status INACTIVE / paused**, in a DIFFERENT org from staging (`xtrdfmquqljdkpxyltmn`); `supabase link` refuses with
>    "project is paused". The long-standing note "prod unreachable via the Supabase MCP" was a true observation with the
>    wrong conclusion — the MCP token is staging-scoped AND the project is paused AND it isn't production anyway.
>    **CONSEQUENCE — the "hold backend features until prod access" recommendation is WITHDRAWN.** It rested on avoiding a
>    growing prod-parked migration queue. No prod ⇒ no queue. Backend features ship to staging like everything else.
>    If a real production project is ever stood up, THEN re-apply the full migration ledger to it and re-instate the
>    CONCURRENT SESSIONS / DB-TARGETING hard stop for prod DDL.
> 2. **Backend defect `task_65642237`** — `strata_promote_element` references the dropped `strata_play_charters` table and
>    errors for legacy elements. Pre-existing backend bug, not a UI regression (the Promote UI surfaces the rejection).
> 3. **`task_70e821ad`** — data-source freshness/staleness column (schema gap). This is why 5E's registry shows
>    status + health rather than a freshness glyph.
> 4. **🔴 Vitest cannot run — there is NO unit-test verification for ANY phase.** Every slice was verified by gates
>    (tsc · lint:colors:gate · audit:ads:gate · lint:cre) plus live DOM/DB probes only. STILL OPEN — a §20 behavioural
>    pass is not a substitute for a test suite.
> 4b. **§20 ACCEPTANCE — ✅ 7 PASS / 0 NOT VERIFIED / 0 FAIL** (`06_VALIDATION_EVIDENCE.md`; run 2026-07-16,
>    completed in Phase 6). AC-1 five-verb chain · AC-2 CC first-screenful · AC-3 verdict→evidence in **1** interaction
>    w/ "Back to Command Center" · AC-4 grayscale · AC-5 reload-into-dark · **AC-6 keyboard-only — all 4 verbs** ·
>    AC-7 **map preservation** (map last touched 2026-07-09, 3 days BEFORE the feature began, never since; probe =
>    baseline exactly: 18 nodes · Drives/Contributes to/Enables · 5 animated · 4 zoom controls · legend).
>    **AC-6 scope (do not over-read):** weight-change is proven END-TO-END to the real RPC; validate/record/resolve are
>    proven through their canonical modal to the submit boundary — the page's one-line payload→RPC handler and the
>    modal-open trigger are inferred (same ADS Button proven in the weight-change path). 8 tests, 2 files.
> 5. **E2E defects 010 & 013** — partially fixed; remain OPEN pending backend/schema work + QA retest.
>
> **Optional UI polish (non-anchor-critical, all deliberately deferred):** Benefit-Detail 2-col rail (IN-THE-CHAIN +
> Confidence) + attestation timeline (P3 · 3B-1) · objective-hop subline · <1100 small-multiple stacking · committed-spend
> SAR (no field) · Element-Detail OKR restyle + locked band · Evidence Step/Fact restyle (P2) · not-found search box /
> fuzzy best-match / recents (no recents store or search index) · anchor 28 panel-scale "object deleted mid-session".
>
> **New canonical components (reuse these):** `components/StrataSystemStates.tsx` → `StrataNotFound` (names failed route +
> cause + owning-area exit) and `StrataRestricted` (consequence framing + owning role + reader's actual roles).
> `StrataAdminConfigPage` now EXPORTS for reuse: `GovActions` (with `submitBlockedReason`), `GovEnvelope`,
> `GovStatusLozenge`, `ROLE_DOCS`, `ScorecardModelsSection`, `ThresholdsSection`, `KpiTypesSection`,
> `UploadTemplatesSection`, `WorkflowsSection`. New readers: `useAllModelPerspectives`; `StrataProfileRef` now has `email`.
>
> **Domain pages:** `/strata/admin` (landing) · `/strata/admin/measurement` · `/strata/admin/data` · `/strata/admin/access`.
> The legacy 12-tab page stays reachable at `/strata/admin/:section` (transitional, P5-D0); unknown sections now render the
> canonical not-found instead of silently falling to tab 0.
>
> Read order to resume: `00_READ_ME_FIRST` → `01_OBJECTIVE` → **`03_PLAN_LOCK_PHASE5` (APPROVED, `3e215d4ed`)** → this file →
> `08_DRIFT_LOG` → `09_DECISIONS` (P5-D0…D6 CONFIRMED) → `discovery/08_phase5_anchor_specs.md` → `sessions/023_phase5-impl.md`
> (per-slice detail + honest scoping rationale). **Re-read the next slice's anchor in full via DesignSync (parent-only) before coding.**
>
> Phase 5 merges: 5A `4ae22c344` · 5B `18627efca` · 5C `5e4ebc65c` · 5D `56082a288` · 5E `a57670444` · 5F `18bae3c92` ·
> 5G `aedfcb6fd` · **5G-2 `ceb99e56f`**. Branch == origin/branch == origin/main (linear fast-forward). Map byte-untouched
> throughout (verified `git diff 3e215d4ed..HEAD -- StrataStrategyMapPage.tsx` = empty).

---

# ARCHIVE — Phase 4 detail below

## Slice 4B ✅ MERGED `5afac31f8` (anchor 23 Reviews Index)
- Redesigned `StrataReviewsPage` **index branch** (`!isDetail`) to anchor 23: **NOW band** + **Review registry**
  (JiraTable, `StrataLifecycleStepper variant="dots"` 5-stage, derived rows) + **Snapshot registry** (JiraTable,
  supersedes struck-through). Gated the cockpit detail column to `isDetail` (fixed `selected=snapshots[0]` index leak).
- **Derived-review model (P4-D1, honest):** review = current (non-superseded) snapshot keyed by snapshot_key; lifecycle/
  stage/decision-counts/follow-ups derived from snapshots + decisions + actions + board-packs. Cadence subtitle CUT;
  StatStrip dropped (subsumed). Close-period ritual PRESERVED below registries (governed feature; not in anchor 23; no regression).
- New thin hook `useAllBoardPacks` + `governanceApi.boardPacksAll` (plain select, no migration) for the pack-stage dot.
- Gates green (tokens 19799/19799 after off-grid 10px→12px fix); live-verified light+dark; detail branch + map unchanged; no console errors. See session 016.
## Slice 4C-1 ✅ MERGED `70695ddd3` (anchor 10 cockpit context layer)
- Detail branch (`isDetail`) gains: header **review-stage lozenge** + **snapshot identity band** (reused
  `StrataSnapshotBand`, rich ReactNode `basis` w/ derived KPI/benefit/frozen-record counts — no component change) +
  **review lifecycle strip** (`StrataLifecycleStepper variant="full"`, `selectedLifecycle` memo, per-step notes),
  layered above the preserved key-metrics/evidence/decisions/board-pack panels. Corrected a FactChip mislabel
  ("frozen records"→"config versions") the band surfaced. Gates green; light+dark (SNAP-1001 rich + SNAP-1 sparse);
  index branch unbroken; only StrataReviewsPage.tsx touched (map zero-change); no console errors. See session 017.
## ✅ Decision Cockpit (anchor 10) COMPLETE — 4C-1 + 4C-2 + 4C-3 merged. NEXT = 4D (anchor 19).
- **4C-3 compare-with-live** (P4-D5): identity-band "Compare with live" toggle → Snapshot-vs-live panel (client diff of
  frozen KPI value/band vs live `strata_calc_kpi_achievement` over `selected.period_id`; batched `useQueries` gated on the
  toggle; restated = |Δ%|>0.05 or band flip; "Snapshot matches live" when 0). Present-mode + Export-board-pack still → 4G.

## Slice 4C-2 ✅ MERGED `df5475b7c` (anchor 10 decision + actions registers)
- "03 Decisions & actions" → anchor-10 **2-col 7fr/5fr** registers. Decision register: `renderDecision` reworked into
  always-visible cards (status + evidence prose + verdict-record band [status-as-verdict + Recorded by X · date ·
  against SNAP] + evidence tags + preserved authoring; dropped chevron-expand + `expandedDecisionId`). Actions register:
  NEW `renderActionRow` + `snapshotActions` memo (from-decision ancestry + owner + due tone + transitions + follow-up
  footer). Fixed a runtime TDZ (`todayISO` order) caught live. Gates green; light+dark on SNAP-1001; index unbroken;
  only StrataReviewsPage.tsx (map zero-change); no console errors. See session 017.
- **⛔ NEXT — either (a) 4C-3 compare-with-live** (P4-D5: client diff of snapshot_items.payload vs live calc via
  `useKpiAchievement` per-KPI; restatements flagged) + Present-mode/Export-board-pack (→ 4G); **or (b) proceed to 4D**
  Data & Lineage Landing (anchor 19). Cockpit context + registers are DONE; remaining 4C bits are enhancements.
  Re-read the relevant anchor via DesignSync before coding.

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

## ⚠️ OPEN DEBT — **HISTORICAL (Phase-2 era). SUPERSEDED by the LIVE DEBT block at the top of this file.**
> Kept for provenance only. Items 1, 2 and 4 below are STILL OPEN and are restated authoritatively at the top;
> item 6 is stale (Phases 4–5 are complete). Do not treat this section as the current picture.
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
6. ~~**Phases 4–5 NOT started**~~ — **SUPERSEDED 2026-07-16: Phases 4 AND 5 are both COMPLETE and merged**
   (all 28/28 anchors shipped). This item is Phase-2-era history; see the authoritative block at the top of this file.

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
