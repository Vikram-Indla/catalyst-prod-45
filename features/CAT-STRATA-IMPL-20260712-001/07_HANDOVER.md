# 07 — HANDOVER · CAT-STRATA-IMPL-20260712-001

> Resume point for the STRATA design-pack implementation (Phase 0 + Phase 1).
> Read order for continuation: `00_READ_ME_FIRST` → `01_OBJECTIVE` → `03_PLAN_LOCK` →
> this file → `08_DRIFT_LOG` → `09_DECISIONS` → `discovery/00_anchor_specs` → latest `sessions/`.

## State (as of session 005, 2026-07-13)
- **Branch:** `strata/impl-phase01`. **Everything through `84fcb57ff` is MERGED TO MAIN AND PUSHED**
  (`origin/main` = `184e720a8`). Working tree clean.
- **Phase 0 + Phase 1 COMPLETE** (1B skipped; anchor-13 polish done). **PHASE 2 STARTED:** Plan Lock
  approved (`03_PLAN_LOCK_PHASE2.md`, full build — nothing deferred), **slice 2A (StrataChainStrip) done
  + merged** (`84fcb57ff` → `184e720a8`). **NEXT = slice 2B-1 (KPI Detail) — see PHASE 2 NEXT below.**
- Session 005 checkpointed here deliberately (context-health): 2B is the largest Phase-2 surface and
  deserves fresh context. Resume with `continue feature CAT-STRATA-IMPL-20260712-001`.

## ⭐ PHASE 2 — NEXT (START HERE). Plan Lock: `03_PLAN_LOCK_PHASE2.md` (APPROVED, full build)
Phase 2 = measure & direction, 5 REDESIGNS of existing pages. Slice order: **2A done** →
**2B (KPI Detail, SPLIT — DO NEXT)** → 2C Library → 2D Strategy Room (SPLIT) → 2E Element Detail →
2F Evidence. All backed by existing tables/RPCs — **no migrations expected** except a
`strata_saved_views` table at 2C (P2-D2 BUILD). Map protection is structural: `/strata/strategy` is
NOT the map (it's `StrataStrategyRoomPage`); the map is a standalone route; nothing imports the map
component — so the Structure view (2D) is a Room-page redesign + a toggle whose "Map" navigates out.

### 2A DONE — `StrataChainStrip` (`shared.tsx`, commit `84fcb57ff`)
Canonical compact "IN THE CHAIN" strip (anchors 06/14/02). API: `StrataChainStrip({ segments, heading?,
testId })`; `segments: [{ icon?, label, items: StrataChainLink[], emptyText? }]`;
`StrataChainLink: { name, onNav?, meta?, tone?:'default'|'danger' }`. Zero-assumption empties; danger
tone = blocked link (color+weight). NOT yet mounted anywhere → **first live mount is 2B-1** (this
verifies 2A, same as 0B StrataSnapshotBand → 1A-2). Scope refinement logged: EvidencePage's richer
lineage chain (EvidenceRow-based) is NOT refactored into the compact strip (would regress detail).

### 2B — KPI Detail (`StrataKpiDetailPage.tsx`, 1109 LOC, anchor 06). Read anchor 06 in full at start.
Anchor-06 order = **verdict → trust → definition**. SPLIT:
- **2B-1 (DO FIRST):** (1) **Verdict band (5fr) + Trend (7fr)** row. Verdict band replaces the plain
  `StrataStatStrip` hero: "MONTH VERDICT" eyebrow + band lozenge (BELOW TARGET) + PENDING-VALIDATION
  lozenge; big actual value + "vs target X" + "▲ n vs {prev period}"; achievement bar (StrataBandBar)
  with target marker; "Achievement N (governed formula …)" + threshold; composed prose sentence. Trend
  = existing recharts LineChart, add band-toned dots + "every point drills to evidence →" (`?from=`).
  (2) **Chain strip (StrataChainStrip, 7fr) + Trust strip (5fr)** row. Chain segments: ↑ Objective ·
  ◔ Scorecards · ▦ Delivery · ◇ Value. Trust: Source · Last run · Formula · Validation.
- **2B-2:** Actuals & validation JiraTable — columns Period·Actual·Target·Band·Validation·**Commentary**
  ·Lineage (commentary as a COLUMN, NOT the orphaned "Commentary" panel — remove that panel);
  progressive-reveal Definition/Formula/Audit; role-gated Submit actual (owner) / Validate (validator →
  attestation modal; `kpiApi.attestActual`; submitter≠validator server-enforced, explained); Viewer no
  ghosts.
- **Current page wiring to PRESERVE** (discovery): hooks `useKpiBySlug`→`kpi`, `useKpiDetail(kpi.id)`→
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
