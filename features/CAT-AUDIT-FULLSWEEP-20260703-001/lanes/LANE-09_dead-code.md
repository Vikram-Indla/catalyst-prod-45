# LANE 9 — Dead Code / Repo Hygiene Audit

**Audit ID range:** CAT-AUDIT-0800…0899
**Date:** 2026-07-03 · **Branch:** main · **Mode:** READ-ONLY (nothing deleted)
**Raw evidence in scratch:** `ts-prune.txt` (5,867 lines), `depcheck.json`, `unrouted-pages.txt`, `unrouted-pages-notest.txt` under
`/private/tmp/claude-501/-Users-jahanarakhan-Documents-GitHub-catalyst-prod-45-Catalyst-web/d46f578f-e6ec-4b90-9f15-d31ee397d10e/scratchpad/`

Method notes:
- Unrouted-page analysis built a full import graph (static `from`, dynamic `import()`, `require()`, `@/` alias + relative resolution) over all 453 files in `src/pages/**`, then sample-verified 20 candidates by name-grep and import-origin trace before classifying.
- `src/_graveyard/` **does not exist** in this repo (`git ls-files | grep -i grave` = empty; no dir on disk). Reported as not-found, no issue raised.
- Dirs **verified LIVE** during this audit (do NOT delete): `src/pages/jira-clone` (routed via `App.tsx:49` → `ReleaseManagementPage`), `src/pages/jira-align` (imported by `src/routes/ProgramRoutesShell.tsx`), `src/pages/r360-member` (imported by `src/components/for-you/atlaskit/BoardPanel.tsx`), `src/pages/product/ideas` (imported by `CatalystShell.tsx`, `ideasBoardAdapter.tsx`), `src/pages/product-hub` + `src/pages/producthub` (both lazy-routed from `FullAppRoutes.tsx`).

---

## CAT-AUDIT-0801 — 35 tracked `.fuse_hidden*` junk artifacts (~1.04 MB)

- **Category:** Repo hygiene / junk artifacts
- **Severity:** High (repo pollution, committed editor/FS ghosts)
- **Surface:** none (never imported — dot-prefixed, no importable extension)
- **Route:** n/a · **Component:** n/a · **Mode:** n/a · **CRE:** n/a · **ADS:** n/a · **Typography:** n/a · **Accessibility:** n/a
- **File Path:** 35 files tracked by git, incl. `src/.fuse_hidden0000001800000001` (212,785 B — the "207KB" artifact; it lives in `src/`, not `src/pages/` — the two in `src/pages/producthub/` are 33 KB/15 KB/10 KB), 24 in `src/styles/`, 1 in `src/components/shared/JiraTable/` (81 KB), 2 in `src/components/strategy/room/`, plus `src/components/capacity-planner/`, `src/components/capacity/timeline/`, `src/modules/tasks/styles/`, `src/theme/atlassian/`. Full list: `git ls-files | grep fuse_hidden`.
- **Performance:** ~1,061,166 bytes of tracked dead weight; not bundled (no extension → Vite never resolves them).
- **Evidence:** `git ls-files | grep fuse_hidden` → 35 hits. `file src/.fuse_hidden0000001800000001` → UTF-8 text; content is an orphaned copy of the "CATALYST V12 TYPOGRAPHY SYSTEM" CSS. `.fuse_hidden` files are FUSE filesystem ghosts of deleted-while-open files.
- **Why:** Pure filesystem debris committed by accident. Zero import paths possible (no `.ts/.css` extension, dot-prefixed).
- **Recommended Fix:** `git rm` all 35 + add `.fuse_hidden*` to `.gitignore`.
- **Regression Risk:** None — unresolvable by any bundler/import.
- **Validation Required:** `npm run build` passes after removal (trivially will).
- **Suggested PR:** `chore(hygiene): remove 35 committed .fuse_hidden FUSE artifacts, ignore pattern`
- **Classification: SAFE-DELETE**

## CAT-AUDIT-0802 — `src/pages/dev/` experiment directory fully dead (10 files, 136 KB)

- **Category:** Dead code / stale experiment
- **Severity:** Medium · **Surface:** none · **Route:** none · **Component:** EvidenceToExecution* prototypes · **Mode/CRE/ADS/Typography/A11y:** n/a
- **File Path:** `src/pages/dev/` — `EvidenceToExecutionFull.tsx`, `EvidenceToExecutionPrototype.tsx`, `EvidenceToExecutionSimple.tsx`, `components/index.ts` + 6 more.
- **Performance:** not bundled if truly unrouted; dead weight in tsc/lint scope.
- **Evidence:** `grep -rE "@/pages/dev/" src` (excl. self) = 0; `grep "pages/dev" src/routes/FullAppRoutes.tsx src/App.tsx` = 0 hits. Import-graph shows the 7 "referenced" files are referenced only from within `src/pages/dev/` itself. Last meaningful touch 2026-06-29 was a mechanical sweep commit (`d5b1660d5`), not feature work.
- **Why:** Prototype spike ("Evidence to Execution") never wired to a route.
- **Recommended Fix:** Delete directory.
- **Regression Risk:** None found — no external importer, no route.
- **Validation Required:** `npx tsc -p tsconfig.app.json` error count does not increase (baseline ~157); grep for `pages/dev` returns nothing.
- **Suggested PR:** `chore(dead-code): remove unrouted src/pages/dev prototype directory`
- **Classification: SAFE-DELETE**

## CAT-AUDIT-0803 — `src/pages/releases/` superseded by `src/pages/releasehub/` (14 of 15 files dead)

- **Category:** Dead code / duplicate surface generation
- **Severity:** High (two parallel "releases" page trees confuse every future change)
- **Surface:** Release hub · **Route:** live routes point at `releasehub` · **Component:** AllReleasesPage, CommandCenterPage, TestCyclesPage, DefectsPage, QualityGatesPage, CalendarPage, ComparePage, ExecutionPage, TestPlansPage, MyTestScopePage, CoverageReportsPage, DefectDetailPage, ReleaseDashboardPage, CommandCenter · **Mode/CRE/ADS/Typography/A11y:** n/a
- **File Path:** `src/pages/releases/` (15 files). Live twins: `src/pages/releasehub/` (20 files).
- **Evidence:** `src/routes/FullAppRoutes.tsx:94-95` lazy-imports `../pages/releasehub/CommandCenterPage` and `../pages/releasehub/AllReleasesPage`; `src/components/layout/SidebarBase.tsx:64` prefetches `../../pages/releasehub/AllReleasesPage`. Import graph marks 14 `pages/releases/*` files unreferenced. The one external reference into `pages/releases/` is from `src/utils/releaseModuleDocumentation.ts` and `src/components/releases/cycle-command-center/CycleTabNavigation.tsx` — must be traced before deletion.
- **Why:** Release hub was rebuilt under `releasehub/`; old tree left behind.
- **Recommended Fix:** Trace the 2 residual importers, retarget them to `releasehub/`, then delete `src/pages/releases/`.
- **Regression Risk:** Low-Medium — the 2 residual imports could break docs/nav utilities.
- **Validation Required:** tsc clean; `/releasehub` routes render; grep `pages/releases/` = 0.
- **Suggested PR:** `chore(dead-code): retire legacy src/pages/releases tree in favor of releasehub`
- **Classification: NEEDS-REVIEW** (2 live inbound imports to untangle first)

## CAT-AUDIT-0804 — Orphan single-file leftovers: `src/pages/stories/`, `src/context/`

- **Category:** Dead code · **Severity:** Low · **Surface/Route:** none · **Mode/CRE/ADS/Typography/A11y:** n/a
- **File Path:** `src/pages/stories/StoriesPage.tsx` (8 KB, last touched 2026-05-10 in a mechanical icon sweep); `src/context/WorkListDataContext.tsx` + `WorkListDataContext.test.tsx` (live app uses `src/contexts/` — plural — with 29 external importers).
- **Evidence:** `grep -rln "WorkListDataContext" src` excluding `src/context/` = 0 hits. `StoriesPage` appears only in its own file + import graph shows 0 inbound.
- **Why:** Leftovers from renames/consolidations (`context` → `contexts`).
- **Recommended Fix:** Delete `src/pages/stories/` and `src/context/`.
- **Regression Risk:** None found.
- **Validation Required:** tsc + vitest config not globbing the deleted test (vitest broken on Node 20 anyway — verify via tsc).
- **Suggested PR:** `chore(dead-code): remove orphaned stories page and singular context dir`
- **Classification: SAFE-DELETE**

## CAT-AUDIT-0805 — 69 unrouted/unreferenced page components (non-test) across `src/pages/**`

- **Category:** Dead code · **Severity:** High (aggregate)
- **Surface:** many (release, admin, project-hub, incidenthub, projects) · **Route:** none for all 69 · **Mode/CRE/ADS/Typography/A11y:** n/a
- **File Path:** Full list in scratch `unrouted-pages-notest.txt`. Highlights (import-origin traced): `src/pages/ForYouPage.tsx` (routed file is `ForYouPage.atlaskit.tsx` — `src/App.tsx:37`), `src/pages/project/FeatureViewPage.tsx` (only its own CSS module referenced by sibling components), `src/pages/releases/*` (14, see 0803), `src/pages/project-hub/{HierarchyPage,HierarchyAllWorkPage,IssueDetailPage,NativeFeatureBacklogPage,NativeStoryBacklogPage,ProjectBoardPage,ProjectBoardCanvasPage,WorkItemsListPage}.tsx`, `src/pages/admin/{AdminOverview,AdminSidebar,Departments,ModuleAccessAdminPage,ResourceAssignments,UserAccessPage}.tsx`, `src/pages/projects/**` legacy `[projectId]` file-routing remnants, `src/pages/incidenthub/{CommitteeQueuePage,IncidentInsightsPage}.tsx`, `src/pages/{ProductRoadmapPage,ProductRoadmapV2Page,ProjectDirectory,WorkManager,WorkloadDashboard,UserNotificationSettingsPage}.tsx`.
- **Evidence:** Import graph over 453 page files → 106 unreferenced; 37 are `__tests__`/`.test.` (excluded — vitest entry points); 69 remain. Sample-verify of 20: every apparent name-hit resolved to a *different* live file (e.g. `AllReleasesPage` hits are `releasehub/`, `ForYouPage` hits are `.atlaskit`) or to self-imports only (`AdminOverview`, `FeatureViewPage`); `TestCyclesPage`, `IssueDetailPage`, `UserAccessPage`, `ProductAllWorkView` had zero import statements at all.
- **Why:** Successive surface rewrites (atlaskit rebuilds, hub migrations, releasehub) left prior generations in place.
- **Recommended Fix:** Batch-delete in 3-4 PRs grouped by area, each preceded by a per-file grep confirmation; note some (ForYouPage.tsx) have live tests pointing at the `.atlaskit` twin — delete the stale twin, keep tests.
- **Regression Risk:** Medium in aggregate — string-based/registry references (`src/registry/usage-map.generated.ts` mentions several paths; it is generated, regenerate after deletion).
- **Validation Required:** tsc baseline unchanged; app boots; regenerate usage-map; grep each deleted path = 0.
- **Suggested PR:** `chore(dead-code): remove unrouted legacy page components (batch 1..n)`
- **Classification: NEEDS-REVIEW** (69 files; each needs one grep + registry regen; the 20 sampled above are effectively SAFE-DELETE)

## CAT-AUDIT-0806 — `src/modules-dormant/` is NOT dormant — it is live production code (35 files, 516 KB)

- **Category:** Repo hygiene / misleading naming · **Severity:** High (a cleanup sweep would delete live Ideation)
- **Surface:** Ideation / Ideas Board · **Route:** producthub Ideas routes · **Component:** `IdeaDrawer` et al. · **Mode/CRE/ADS/Typography/A11y:** n/a
- **File Path:** `src/modules-dormant/` (35 files, last commit **today** 2026-07-03 `cda5ca3af` — active feature work).
- **Evidence:** Imported by live code: `src/routes/FullAppRoutes.tsx`, `src/components/layout/SidebarBase.tsx`, `src/services/ideationService.ts`, `src/components/catalyst-detail-views/idea/CatalystViewIdea.tsx`, and 5 `src/pages/producthub/Ideas*` pages.
- **Why:** Directory name promises "dormant"; reality is the ideation module runs from here. This is a booby trap for exactly this kind of audit.
- **Recommended Fix:** Rename to `src/modules/ideation/` (or fold into `src/modules/`), update ~9 importers. Do NOT delete.
- **Regression Risk:** Medium (path rename across lazy imports).
- **Validation Required:** Ideas Board/Roadmap/Backlog/Analytics routes render post-rename.
- **Suggested PR:** `refactor(hygiene): rename modules-dormant → modules/ideation (it is live)`
- **Classification: NEEDS-REVIEW** (rename, never delete)

## CAT-AUDIT-0807 — Duplicate directory families: which side is live

- **Category:** Repo hygiene / duplicate trees · **Severity:** Medium · **Surface:** cross-cutting · **Mode/CRE/ADS/Typography/A11y:** n/a
- **File Path / Evidence (external importers incl. dynamic):**
  | Family | LIVE | DEAD/LEGACY | Evidence |
  |---|---|---|---|
  | contexts | `src/contexts/` (11 files, 29 importers) | `src/context/` (2 files, 0 importers) | see 0804 |
  | stores | **BOTH live**: `src/store/` (4 files, 41 importers), `src/stores/` (6 files, 12 importers) | neither deletable | consolidation candidate only |
  | product pages | `src/pages/producthub/` (routed, FullAppRoutes) + `src/pages/product-hub/` (routed, FullAppRoutes) + `src/pages/product/ideas/` (imported by CatalystShell) | none deletable wholesale | three coexisting generations, all partially live |
  | release pages | `src/pages/releasehub/` (routed) + `src/pages/release-hub/` (2 files, 3 importers) | `src/pages/releases/` (14/15 dead — see 0803) | FullAppRoutes:94-95 |
  | release detail | `src/pages/release/` — `IncidentDetail/IncidentsDashboard/IncidentsList` unreferenced (3 files dead) | | import graph |
- **Why:** Hub rewrites created parallel trees without retiring predecessors.
- **Recommended Fix:** (a) delete `src/context/` (0804); (b) delete `pages/releases/` after retarget (0803); (c) plan a store/stores and product* consolidation as its own feature — not a hygiene delete.
- **Regression Risk:** High for consolidation, none for the two deletes.
- **Validation Required:** per-family route smoke.
- **Suggested PR:** split per family.
- **Classification: NEEDS-REVIEW** (except the sub-items already marked SAFE-DELETE in 0803/0804)

## CAT-AUDIT-0808 — Dead feature flags in `src/lib/featureFlags.ts`

- **Category:** Dead code / flags · **Severity:** Low · **Surface:** n/a · **Mode/CRE/ADS/Typography/A11y:** n/a
- **File Path:** `src/lib/featureFlags.ts`
- **Evidence (usage outside the flag file):** `ENABLE_WIKI` = **0 usages** and hard-coded `false` (line 11, deprecated 2026-06-25); `ENABLE_VOICE_DICTATION` = **0 usages** (defined line 87, feature apparently not yet wired). All others live: ENABLE_AI (2), ENABLE_HEAVY_EXPORTS (1), ENABLE_KNOWLEDGE_HUB (1), ENABLE_FULL_APP (1), ENABLE_KANBAN_V2 (5), ENABLE_FILTER_TO_KANBAN (2), ENABLE_FILTER_TO_ROADMAP (3), ENABLE_FILTER_TO_DASHBOARD (3), ENABLE_FILTER_WHATSAPP_AI_SUMMARY (2). Note: always-on-by-default pattern (`!== 'false'`) means most "flags" are permanently on unless env-disabled — flags shipped 2026-06-19 could be retired.
- **Recommended Fix:** Delete `ENABLE_WIKI` (SAFE-DELETE — dead + hardcoded false). `ENABLE_VOICE_DICTATION`: NEEDS-REVIEW — may be a landing zone for in-flight voice dictation work (double-gated with a DB flag per its comment). Consider retiring the four shipped-2026-06-19 filter flags.
- **Regression Risk:** None for ENABLE_WIKI.
- **Validation Required:** tsc.
- **Suggested PR:** `chore(flags): remove dead ENABLE_WIKI flag`
- **Classification:** ENABLE_WIKI **SAFE-DELETE**; ENABLE_VOICE_DICTATION + shipped-flag retirement **NEEDS-REVIEW**

## CAT-AUDIT-0809 — depcheck: 23 unused dependencies + 14 unused devDependencies

- **Category:** Dependency hygiene · **Severity:** Medium (install weight, audit surface) · **Performance:** node_modules bloat, `npm audit` noise; no runtime bundle impact (tree-shaken anyway)
- **File Path:** `package.json`; raw JSON: scratch `depcheck.json` (21 "missing" entries also recorded there)
- **Evidence & confidence:**
  - **HIGH confidence unused (0 grep hits in src):** `react-window` (+ `@types/react-window`), `embla-carousel-react`, `input-otp`, `@popperjs/core`, `y-websocket`, `y-protocols`, `lib0` (yjs collab leftovers), `scrollparent`, `events`, `@radix-ui/react-aspect-ratio`, `@radix-ui/react-menubar`, `@radix-ui/react-navigation-menu`, `@radix-ui/react-toggle-group`.
  - **MEDIUM:** `@atlaskit/atlassian-navigation`, `@atlaskit/navigation-system`, `@atlaskit/page-layout`, `@atlaskit/profilecard`, `@atlaskit/layering`, `@atlaskit/editor-plugins`, `@atlaskit/editor-toolbar`, `@atlaskit/css-reset` (not imported in `main.tsx`/`index.css`/`App.tsx`, but Atlaskit packages are sometimes peer-required by `@atlaskit/editor-core` — verify with `npm ls` before removal), `@radix-ui/react-avatar`, `@radix-ui/react-tooltip` (shadcn ui/ dir may reference).
  - **LIKELY FALSE POSITIVE (keep):** `postcss`, `autoprefixer` (used via `postcss.config.js`), `tailwindcss/typography` (tailwind.config.ts plugin), `rollup` (vite override/pin), `caniuse-lite` (browserslist pin), storybook addons + `chromatic` + `eslint-plugin-storybook` (`.storybook/` config present — depcheck doesn't scan it), `@testsprite/testsprite-mcp` (MCP tooling, not imported).
- **Recommended Fix:** Remove the HIGH set in one PR (`npm uninstall …`), then `npm run build` + boot. MEDIUM set only after `npm ls <pkg>` peer-dependency check.
- **Regression Risk:** Low (HIGH set) / Medium (Atlaskit peers).
- **Validation Required:** `npm install` clean, `npm run build`, app boot, Storybook still builds.
- **Suggested PR:** `chore(deps): drop 13 verified-unused dependencies`
- **Classification:** HIGH set **SAFE-DELETE**; MEDIUM set **NEEDS-REVIEW**; false-positive set **keep**

## CAT-AUDIT-0810 — ts-prune: 5,867 unused exports (4,954 excluding Storybook stories)

- **Category:** Dead exports · **Severity:** Medium (aggregate; inflates tsc/IDE surface, hides real API)
- **File Path:** full output in scratch `ts-prune.txt`
- **Evidence — top directories by unused-export count:** `src/hooks` 376, `src/types` 353, `src/stories/**` 913 (pages 265 / components 265 / enterprise 223 / audit-grade 134 — **expected**: Storybook loads these by glob, `.storybook/` exists; not dead), `src/lib` 136, `src/components/ads` 111, `src/modules/okr-v2` 101, `src/modules/project-work-hub/...story-detail-modules` 73, `src/modules/task10/hooks` 69, `src/hooks/test-management` 66, `src/components/shared/Timeline` 59, `src/services` 56, `src/modules/backlog` 50, `src/components/shared/JiraTable` 50. Notable concrete block: `src/hooks/planhub.ts` re-exports 15+ symbols (usePlanHubAIConfig, useUpdatePlanHubSettings, usePlanHubTemplates, …) none consumed.
- **Why:** Barrel-file over-exporting + retired modules (okr-v2, task10) + type dumping grounds.
- **Recommended Fix:** Do NOT bulk-delete from ts-prune output (it misses dynamic/string access and Vite glob imports). Use it as a work-queue: start with whole-module candidates (`modules/okr-v2`, `modules/task10`, `hooks/test-management`) and verify module-level imports first.
- **Regression Risk:** High if applied mechanically.
- **Validation Required:** per-module import grep + tsc + route smoke.
- **Suggested PR:** per-module chores, not one sweep.
- **Classification: NEEDS-REVIEW**

## CAT-AUDIT-0811 — 30 of 41 files in `scripts/` unreferenced by package.json / CI / husky

- **Category:** Repo hygiene / stale scripts · **Severity:** Low-Medium (several are one-shot **prod data-migration** scripts with embedded project refs — retention may be deliberate)
- **File Path:** `scripts/` — unreferenced set includes: `batch-fix-violations.mjs`, `batch-fix-violations-batch2.mjs`, `codemod-fix-focus.cjs`, `codemod-fix-spacing.cjs` (the codemod memory-flagged as having corrupted geometry once), `migrate-admin-data.sh`, `migrate-admin-to-lmqwtldpfacrrlvdnmld.sh`, `migrate-data-to-external.sh`, `migrate-nonjira-data.sh`, `remap-auth-uuids.sql`, `populate-jira-identity-map.sh`, `pull-avatars-oneshot.sh`, `pull-canonical-avatars.mjs`, `pull-jira-avatars.mjs`, `download-avatars.mjs`, `import-notion-features.mjs`, `audit-adf.mjs`, `check-field-compliance.mjs`, `remediate-heading-wrapped-descriptions.mjs`, `weekly-compliance-report.js`, `catalyst-feature.mjs`, `catalyst-sop-self-test.mjs`, `claude-start-*.sh` (3), `_check-tiptap.mjs`, `feature-builder`, + 3 `.md` guides.
- **Evidence:** `ls scripts/` (41) vs `scripts/…` references extracted from `package.json`, `.github/workflows/*.yml`, `.husky/*` (16 referenced). Note: `catalyst-feature.mjs`/`claude-start-*.sh` may be invoked by skills/hooks outside those three sources.
- **Recommended Fix:** Move one-shot migration/backfill scripts to `scripts/archive/` (retain history — some encode prod ref `lmqwtldpfacrrlvdnmld`); delete duplicate/superseded codemods after confirming baselines ratcheted; keep operational SOP scripts.
- **Regression Risk:** Low — none run automatically.
- **Validation Required:** grep `.claude/`, skills, docs for each script name before archiving.
- **Suggested PR:** `chore(scripts): archive one-shot migration and codemod scripts`
- **Classification: NEEDS-REVIEW**

---

## Lane Summary

| Metric | Value |
|---|---|
| Issues raised | 11 (CAT-AUDIT-0801…0811) |
| SAFE-DELETE | 4 full issues (0801 fuse_hidden ×35, 0802 pages/dev ×10, 0804 stories+context ×3, 0808 ENABLE_WIKI) + sub-items (13 high-confidence deps in 0809; ~20 sample-verified pages in 0805) |
| NEEDS-REVIEW | 7 (0803, 0805, 0806, 0807, 0809-medium, 0810, 0811) |
| Tracked junk bytes | 1,061,166 B across 35 `.fuse_hidden*` files |
| Unrouted non-test page files | 69 of 453 (`src/pages/**`) |
| ts-prune unused exports | 5,867 total; 4,954 excluding Storybook stories |
| depcheck unused deps | 23 deps + 14 devDeps (13 high-confidence, rest mixed/false-positive) |
| Dead feature flags | 2 of 11 (`ENABLE_WIKI`, `ENABLE_VOICE_DICTATION`) |
| Unreferenced scripts | 30 of 41 in `scripts/` |
| Booby trap | `src/modules-dormant/` is LIVE ideation code (committed today) — rename, never delete |
| Not found | `src/_graveyard/` does not exist |

**Nothing was deleted. All classifications carry dependency evidence above; every SAFE-DELETE was verified by import-graph + grep; every NEEDS-REVIEW lists the exact blocking references.**
