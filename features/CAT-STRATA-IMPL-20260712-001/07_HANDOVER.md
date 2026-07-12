# 07 — HANDOVER · CAT-STRATA-IMPL-20260712-001

> Resume point for the STRATA design-pack implementation (Phase 0 + Phase 1).
> Read order for continuation: `00_READ_ME_FIRST` → `01_OBJECTIVE` → `03_PLAN_LOCK` →
> this file → `08_DRIFT_LOG` → `09_DECISIONS` → `discovery/00_anchor_specs` → latest `sessions/`.

## State (as of session 001)
- **Branch:** `strata/impl-phase01` (off `main`). NOT pushed, NOT merged.
- **Committed (4 slices):**
  - `d4367b163` 0A — sidebar IA rename + context-spine scope/freshness slots + JiraTable `overflowX` prop.
  - `d479cce5d` 0B — `StrataSnapshotBand` (new canonical component).
  - `d50966a6d` 1A-1 — evidence `?from=` origin preservation + "n days overdue".
  - `8c921433c` 1A-2 — Command Center locked-mode snapshot band (live-verified).
- **Phase 0 COMPLETE.** Phase 1 IN PROGRESS (1A split into sub-slices; 1A-1 + 1A-2 done).
- Working tree clean at handover.

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
Slice 1A is split (2h rule). Remaining sub-slices, each ≤2h, one commit each, screenshot-verified:
- **1A-2b** — context-spine scope + freshness slots wired on CC (StrataPageShell already accepts
  `scope`/`freshness` from 0A) + data-trust strip (anchor 01 row 4). NEEDS `StrataDataSource` /
  `StrataUploadRun` field confirmation first (freshness/staleness fields) — read
  `src/modules/strata/types.ts` (StrataDataSource, StrataUploadRun) + `useDataSources`/`useUploadRuns`
  (`useStrata.tsx:468/470`). Zero-assumption: render nothing where freshness unknown.
- **1A-3** — judgment-band redesign (anchor 01): replace the 6-tile `StrataStatStrip` with the
  composed judgment band (StrataScoreRing 88px + composed executive sentence linking
  perspective/value/decisions) + perspective-health panel. Biggest/highest-value; always visible →
  easy to screenshot-verify. Keep decisions + what-changed as row 2, inbox row 3, data-trust row 4
  (current inbox-at-row-3 already matches the anchor — do NOT "promote" it).
- **1A-4** — restricted/403 role-aware state (rolesQ; executive_viewer consume-only), "Mine"
  no-results one-click Clear, changes-since-snapshot client diff (D-3), trend-dot accessible names.
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
