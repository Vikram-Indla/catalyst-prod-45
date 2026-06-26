# 07 — HANDOVER (living context-health doc — update every slice & before any handoff)

> A cold session must be able to resume from THIS FILE ALONE (+ the read-order in 00). Keep it current.

## CURRENT STATE
- **Phase:** Phase 0 (Foundation reset) — **COMPLETE & PROVEN LIVE**, awaiting Vikram sign-off to start Phase 1.
- **Active slice:** P0 done (Repository renders 6 folders + 10 cases live; Defects route resolves; 0 console errors).
- **Execution authorization:** GRANTED for Phase 0 ("proceed"). Phase 1 needs the P0 sign-off first.
- **Branch:** main. **DB:** staging cyij (verified via fingerprint + `projects list` linked).
- **Context health:** GREEN.

## WHAT'S DONE IN P0
- Verified MCP/CLI both target cyij; migrations go via **MCP apply_migration** (config.toml=prod, so NEVER `supabase db push`).
- D5 resolved → defect source = `ph_issues` (791 bug rows/11 projects). ph_work_items has 0 bugs.
- Applied idempotent guard migration `20260626100000_drop_broken_sync_jira_bug_to_defect.sql` (trigger was absent on cyij anyway).
- Wiped tm_* content (25c/24s/13f/3cy/7d → 0), kept project DEMO + 4 priorities + 4 types.
- Reseeded: 6 folders (nested), 10 cases, 28 steps. Seed file: features/.../seed/phase0_seed.sql.
- Verified `tm_user_has_access` permissive → seed visible to any authed user.
- Wired `/testhub/defects` route → canonical `src/pages/testhub/DefectsPage.tsx` (kills dead sidebar link).

## EXACT NEXT ACTION
1. User signs in at localhost:8080 (Claude cannot enter credentials).
2. Screenshot `/testhub/repository` (folders+10 cases live) and `/testhub/defects` (route resolves) → store in 10_SCREENSHOT_CHECKLIST.
3. Get Vikram P0 sign-off → start **Phase 1** (Repository: folder tree CRUD, case CRUD via CatalystViewBase, steps, versions, native case icon).

## OPEN RISKS / DEFERRED
- Run-table name fragmentation → consolidate in Phase 4.
- `/testhub/defects/:id` detail + repoint defects adapter ph_issues → Phase 5.
- Stub hooks in `src/hooks/test-management/index.ts` may shadow real ones — verify imports in Phase 1.
- Uncommitted: route edit + migration file. Commit only on Vikram's word (not yet).

## KEY PINS
- Acceptance PDFs: `/Users/vikramindla/Downloads/Catalyst/Catalyst Tests`
- Seed project: tm_projects DEMO id `00000000-0000-0000-0000-000000000001`; prio ids `…0001-000X`; type ids `…0002-000X`.
- Resumable discovery agents: codebase `aa4233cf5c4633134` · DB `af2f3416e3d3a2686` · acceptance `a4bef8bef2ea10b36` · components `ae0cd7a0b3fe593df`
- Seed-wipe DO-block + delete order: 02 §B / seed file.

## CONTEXT-HEALTH LOG (newest on top)
- 2026-06-26 — P0 executed (migration+wipe+reseed+route). GREEN. Next: user sign-in → screenshot → P0 sign-off → Phase 1.
- 2026-06-26 — Discovery + Plan Lock. GREEN.
