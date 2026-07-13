# 07 — HANDOVER · CAT-STRATA-IMPL-20260712-001

> Resume point for the STRATA design-pack implementation (Phase 0 + Phase 1).
> Read order for continuation: `00_READ_ME_FIRST` → `01_OBJECTIVE` → `03_PLAN_LOCK` →
> this file → `08_DRIFT_LOG` → `09_DECISIONS` → `discovery/00_anchor_specs` → latest `sessions/`.

## State (as of session 002)
- **Branch:** `strata/impl-phase01` (off `main`). NOT pushed, NOT merged.
- **Committed:**
  - `d4367b163` 0A — sidebar IA rename + context-spine scope/freshness slots + JiraTable `overflowX` prop.
  - `d479cce5d` 0B — `StrataSnapshotBand` (new canonical component).
  - `d50966a6d` 1A-1 — evidence `?from=` origin preservation + "n days overdue".
  - `8c921433c` 1A-2 — Command Center locked-mode snapshot band (live-verified).
  - `686f2e74b` session 001 handover.
  - `20eb0db1c` **"commit" (FOREIGN — GitHub Desktop auto-commit)** — contains the bulk of slice 1A-3
    (judgment band in `StrataCommandCenterPage.tsx`) + docs, swept from my working tree. See below.
  - `58cb2af90` 1A-3 (the D-8 tweak; bulk is in the foreign commit above) — judgment band, live-verified.
  - `c3de22709` untrack + gitignore the stray `Design attachments archive.zip` (swept in by `20eb0db1c`).
  - `469202473` handover update (1A-3 + git-hazard note).
  - `8fcf1b99b` 1A-2b — context-spine scope/freshness + data-trust strip (live-verified).
- **Phase 0 COMPLETE.** Phase 1 IN PROGRESS: 1A-1, 1A-2, 1A-3, 1A-2b done. Working tree clean.
- Spun-off background task `task_70e821ad` — add a data-source freshness/staleness column so the
  data-trust strip can show "N stale" (schema gap; see 1A-2b in `04_EXECUTION_LOG.md`).

## ⚠️ GIT HAZARD — active GitHub Desktop auto-committer ([[github-desktop-autocommit-hazard]])
A GitHub Desktop process (user `Vikram-Indla`) auto-commits the working tree as commits titled
"commit", sweeping in my in-progress edits + stray files. It split slice 1A-3 and pulled in a 3.7MB
zip. **Before the next slice, ask Vikram to pause GitHub Desktop's auto-commit.** After every commit,
`git log --oneline -3` and check for a foreign "commit"; `git diff --cached --name-status` before
committing. Do not rewrite history while it is live.

## Design authority (PARENT-ONLY access)
- claude.ai design project `e8a6bad6-1868-4b84-96bf-d6d49474b58a` ("Strata design brief").
- Read via **`DesignSync`** (`get_file`) — **subagents CANNOT load DesignSync** ([[designsync-parent-only]]).
  The parent must read anchors and pass structured specs down. Anchor specs captured in
  `discovery/00_anchor_specs.md`. Anchors 01 + 11 read in full; 12/13 via critique only (read them
  before 1C/1D for pixel fidelity).

## HARD protections (unchanged, verify every slice)
- `/strata/strategy/map` (`StrataStrategyMapPage.tsx`) — ZERO change. It imports `StrataPageShell`
  from shared.tsx, so shared.tsx edits must stay additive. Verified unchanged through 0A.
- Sidebar (`EnterpriseSidebar.tsx`) + top nav — VISUAL FROZEN. IA relabel done (0A). Note: numeric
  badges are removed platform-wide in `SidebarBase` — My Work item ships WITHOUT a count badge.

## Decisions (see 09_DECISIONS.md — all CONFIRMED unless noted)
D-0 sidebar visual-frozen+IA. D-1 keep StrataPageShell (not Grid E). D-2 defer drawer-first drill
(CatalystViewBase STRATA-table union) — ship `?from=` instead. D-3 changes-since-snapshot = client
diff. D-4 defer StrataLifecycleStepper (no Phase-1 consumer). D-5 My Work = no CRE chokepoint.
D-6 add slug|UUID dual-mode to `useScorecardInstanceBySlug` (do in 1D). D-7 defer StrataChainStrip
to Phase 2 (no Phase-1 consumer; prior art inline in `StrataEvidencePage.tsx:106-338`).

## NEXT — remaining Phase-1 work (in order)
Slice 1A is split (2h rule). One commit each, screenshot-verified. **DONE: 1A-1, 1A-2, 1A-3, 1A-2b.**

- **1A-4 (START HERE)** — closes out Command Center. All in `StrataCommandCenterPage.tsx` unless noted:
  - **Restricted/403 role-aware state:** `rolesQ = useStrataRoles()`. When the viewer has no strata
    role / RLS denies, render an explained restricted panel (never blank or a generic error).
    `executive_viewer` is consume-only — advisory generate/review is already gated by `canAdvise`
    (`ADVISORY_ROLES`); extend the same pattern to any other write affordance. §17: hiding a button
    is presentation, never the security model.
  - **"Mine" no-results one-click Clear:** in the inbox empty state when `attentionScope==='mine'` &
    0 rows, add a real button calling `setAttentionScope('all')` (teaching text already says "Switch
    to All").
  - **changes-since-snapshot (D-3, client diff, no RPC):** "What changed since the last locked
    review" panel (anchor 01 row 2 right). Diff the active locked snapshot's items vs live calc —
    `useSnapshots` + `useSnapshotItems(snapshotId)` (`useStrata.tsx:505`) vs current calc/values.
    Zero-assumption where no prior snapshot exists.
  - **Trend-dot accessible names (§14):** `TrendDot` SVG circles → focusable links with accessible
    names ("Q1 2026, 73.5, Needs attention — view evidence") + keyboard activation.
- **1B My Work** (NEW `/strata/my-work`) — new page + route (`StrataRoutes.tsx` before catch-all) +
  `strataRoutes.myWork()` + `routeRegistry.ts` + sidebar item (add here, WITH the route). `useMyWork`
  aggregator over `needsAttention(owner_id=me)` + decisions + actions; verb groups
  Validate/Submit/Resolve/Act (+Approve admin); JiraTable compact + group headers; consequence
  column; Mine/Team toggle. NO CRE chokepoint (D-5). Full spec in `discovery/00_anchor_specs.md`.
- **1C Scorecards Index** — skeleton, per-panel errors, role-aware empty, restricted, docTitle,
  ranked-variance panel (client-derived). Read anchor 12 first.
- **1D Scorecard Detail** — `?from=` on evidence/line ⓘ (thread origin like 1A-1; also add
  `/strata/scorecards` + detail path to `STRATA_ORIGIN_LABELS` in EvidencePage), role-gate
  Recalculate, skeleton, restricted, stale label, D-6 dual-mode slug hook. Read anchor 13 first.

Then Phases 2–5 get their OWN Plan Locks (do not start without one).

## Command Center as-built (reference for 1A-4)
Grid rows: **1** judgment band (full-width: StrataScoreRing 88px + eyebrow[score label · verdict
Lozenge · Δ vs prior] + composed sentence[worst-perspective · VaR · decisions, `InlineLink`s] +
footer) · **2** trend chart (span 8) + perspective health (span 4) · **3** needs-attention inbox
(JiraTable, Mine/All toggle) · **4** AI advisory (D-8 keep) · **5** data-trust strip. Locked mode
renders `StrataSnapshotBand` above Row 1. Spine: Cycle · Period · Scope Enterprise · Model ·
[freshness "Data as of…"] · LIVE/locked. Local helpers: `InlineLink`, `daysOverdue`. Reach locked
mode via Period → "Q1 FY2026 · closed" (instance CEO Scorecard Q1 → SNAP-1001). DRIFT-1: perspective
health is Row 2, not beside the band (anchor 7/5 split) — refine later if desired.

## Environment / verification gotchas
- **Dev app + Supabase MCP both target `cyijbdeuehohvhnsywig` (catalyst-staging) ONLY.** Prod
  (`lmqwtldpfacrrlvdnmld`) is unreachable via the MCP. `execute_sql` takes explicit `project_id` —
  always pass staging. Re-verify target before any write ([[strata-v6-remediation]]).
- **Vitest CANNOT run** — rolldown/node `styleText` startup error (toolchain). Tests updated by
  inspection only; rely on tsc + gates + live DOM/screenshot for verification.
- Gates (must stay green, run before every commit): `npx tsc --noEmit`, `npm run lint:colors:gate`,
  `npm run audit:ads:gate`, `npm run lint:cre`. Off-grid spacing trips `audit:ads:gate` (baseline
  spacing 0/0) — prefer canonical Lozenge/components over hand-rolled styled spans.
- **To reach locked-mode UI for verification:** CC Period selector → "Q1 FY2026 · closed" (instance
  CEO Scorecard Q1 → SNAP-1001). Overdue inbox rows: none in current data ("n days overdue" is
  code-verified only).
- RTK mangles `grep -n` line numbers → use `rtk proxy grep` for real refs.

## Commit discipline
One slice = one commit. Stage explicit files only (never `git add -A`). Get Vikram approval on file
list + message before committing. Feature folder committed alongside. Co-author trailer:
`Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
