# HANDOVER — CAT-STRATA-FOUNDATION-20260709-001 (updated 2026-07-09, build session)

## Where everything lives
- **Branch**: `strata-standalone`. **Worktree**: `~/Documents/GitHub/catalyst-prod-45/strata-foundation-wt` (ALL STRATA work happens here — the origin checkout `catalyst-prod-46` belongs to the concurrent ideation session; see sessions/003 collision record).
- **node_modules** in worktree is a symlink to `../catalyst-prod-46/node_modules`. Vitest needs `NODE_OPTIONS="--require <scratchpad>/styletext-shim.cjs"` on this machine (Node 20.12 vs .nvmrc 22).
- Research pack + Plan Lock + design direction: this feature folder (committed on the branch). Read 03_PLAN_LOCK.md first — micro-interaction ACs §list apply to every UI slice.

## Delivered (all pushed to origin/strata-standalone)
| Commit | Wave | Content |
|---|---|---|
| d0d5ba2 | — | Research pack v1.1 + Command Room design direction |
| 3fd850c | W1 | Play→Theme rename (REQ-001/003), DB rename migration `20260709170000` (REQ-002, **file only — NOT applied to any live DB**), sidebar 4 canonical areas + routeRegistry (REQ-004/005). Repaired 2 latent dead 'play' filters (needs_attention branch 9, map charter inspector). |
| 4ab52c4 | — | Plan Lock + build authorization + session 003 |
| ed69742 | W2 | `20260709171000` card→objective edge + theme-consistency trigger (REQ-007), portfolio member referential guard (REQ-010), Blockers first-class on card detail (REQ-011), linkage guard tests (REQ-008/009 pinned). |
| 69c40b2 | — | ADS audit baseline ratchet down (tokens 23574→23571) |
| a28bb0f | W3 | CEO / Sector-CXO scorecard grouping (REQ-012), VMO value-kind + Project Card labels (REQ-014), Review Cadence on Reviews (REQ-015). |

Tests: `src/modules/strata/__tests__/` terminology.guard (2) + linkage.guard (5) — all green. tsc rc=0. Color gate 0=0. ads-audit-gate at (ratcheted) baseline.

## Remaining (frozen register, TRACE.csv)
- **REQ-006**: visible cycle name+period on all 4 area landings (Command Center + Scorecards already show it; verify Strategy Room / Portfolio / Reviews headers).
- **REQ-013**: drilldown clickthrough verification on seed data (CEO → Sector/CXO → measure → cards) — needs running app.
- **REQ-016/017/018**: delete dead `StrategyCockpit` (zero importers), delete `src/modules/strategy/astryx/` + correct CLAUDE.md Astryx section, drop dead `public.scorecards` (migration).
- **REQ-019**: initiative→project-card seams out of Execution UI.
- **REQ-020**: seed slice for full canonical chain (follow `20260705100600` conventions, idempotent).
- **REQ-021**: remaining smoke tests (nav 4-areas render test; hierarchy trigger; ban negative test needs staging DB).
- **REQ-022/023 (BIGGEST, own slice)**: decommission+migrate `/enterprise/objectives` stacks per CON-002 — inventory legacy tables + live row counts FIRST (never probed), reversible migration, redirects. NOTE: these legacy stacks live on `main`, not `strata-standalone` — check whether they even exist on this branch before scoping (likely absent → REQ-022/023 may be main-branch work or moot here; log to 08_DRIFT_LOG).
- **Migration apply**: 20260709170000 + 20260709171000 are committed files, NOT applied. Apply to staging only after `cat supabase/.temp/project-ref` = `cyijbdeuehohvhnsywig` and ledger check.
- **Screenshot/DOM acceptance** for W1–W3 UI (micro-interaction AC checklist per Plan Lock) — requires the app running on 8080 from THIS worktree.
- W3 Command Room depth (KPI band flavor on remaining landings, segmented value bar, board-pack editorial layout) per 50_design/DESIGN-DIRECTION.md.

## Resume command
`continue feature CAT-STRATA-FOUNDATION-20260709-001` in a session whose cwd is the worktree. Re-read 03_PLAN_LOCK.md + this file + 00_admin/STATE.json.
