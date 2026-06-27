# 07 — HANDOVER (living context-health doc — update every slice & before any handoff)

> A cold session must be able to resume from THIS FILE ALONE (+ the read-order in 00). Keep it current.

## CURRENT STATE
- **Phase:** Phase 1 (Repository proper) — **1a/1b/1c COMPLETE & PROVEN LIVE**, incl. D4. Awaiting sign-off.
- **1a done:** archived column+filter, is_latest de-dup, edit folder-trap fix, delete-confirm dialog, create write-path proven (TC-0001). D8 archive decision applied.
- **1b done:** folder rollup count badges (incl subfolders) + folder delete-confirm dialog (proven live, Cancel keeps 6 folders). Move/drag-reorder DEFERRED.
- **1c done (D4 — 2026-06-27):** native case icon (earlier) + **CaseDrawer→CatalystViewBase migration COMPLETE & PROVEN.** New `src/components/catalyst-detail-views/test-case/CatalystViewTestCase.tsx` (+index). Row-click opens case in canonical CatalystViewBase shell (breadcrumb, sidebar status pill, Details/Steps/Versions tabs); CREATE still via CaseDrawer (coexist). entityKind='test_case' wired in shared/types.ts + CatalystDetailRouter.tsx; RepositoryPage row-click → CatalystDetailRouter. Status + priority inline edits PERSIST to tm_test_cases (proven: DRAFT→APPROVED + Critical→Low live on cyij). CATY footer-collision gone (footer no longer rendered).
- **D9 (2026-06-27):** dropped broken `auto_create_test_case_version` trigger (migration 20260627120000) — it referenced nonexistent OLD.objective/OLD.priority/NEW.updated_by → EVERY tm_test_cases UPDATE 400'd. Edit surface was silently dead before this; now unblocked. App-layer useUpdateTestCase already owns versioning.
- **1c REMAINING (deferred, small):** Classic/BDD toggle, version-list is read-only display (works; create-version still via CaseDrawer), case_key format (TC-0001 vs TC-001). + deferred folder Move/drag.
- **Active slice:** none (sign-off gate).
- **Execution authorization:** Phase 1 in progress (commits 1a–1c on origin/main). D4 + D9 done this session.
- **Branch:** main. **DB:** staging cyij (verified). Migration applied via MCP.
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
- COMMITTED `519e39a18` (pushed origin/main): useTestCases fix + drop-trigger migration + artifacts + seed. FullAppRoutes NOT touched (defects route pre-existed at :674).

## KEY PINS
- Acceptance PDFs: `/Users/vikramindla/Downloads/Catalyst/Catalyst Tests`
- Seed project: tm_projects DEMO id `00000000-0000-0000-0000-000000000001`; prio ids `…0001-000X`; type ids `…0002-000X`.
- Resumable discovery agents: codebase `aa4233cf5c4633134` · DB `af2f3416e3d3a2686` · acceptance `a4bef8bef2ea10b36` · components `ae0cd7a0b3fe593df`
- Seed-wipe DO-block + delete order: 02 §B / seed file.

## CONTEXT-HEALTH LOG (newest on top)
- 2026-06-26 — P0 COMMITTED 519e39a18 + pushed. GREEN. Next: await Phase 1 GO.
- 2026-06-26 — P0 executed (migration+wipe+reseed+route). GREEN. Next: user sign-in → screenshot → P0 sign-off → Phase 1.
- 2026-06-26 — Discovery + Plan Lock. GREEN.
