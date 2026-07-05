# LANE 01 — /CRE Rule Engine Compliance Audit

Audit date: 2026-07-03 · Auditor: Claude (read-only lane) · Repo: Catalyst-web @ main
Sources of truth read: `src/lib/catalyst-rules/RULE_TABLE.md`, `src/lib/catalyst-rules/CatalystRules.ts`, `src/lib/catalyst-rules/index.ts`.

## Gate run

```
$ npm run lint:cre
> node scripts/cre-chokepoint-gate.cjs
✓ CRE chokepoint gate passed
```

The gate PASSES while this lane finds ~690 grep-verifiable occurrences against Grids E/F/G/H — the chokepoint gate does not cover the grids audited below (see CAT-AUDIT-0020).

Scope notes:
- `editors.tsx:863` (`lineHeight: 1.4`) and `kanban/WorkItemCard.tsx` are EXCLUDED everywhere below — documented exceptions per RULE_TABLE.md Grid H (H3 notes, 2026-06-11 / CAT-KANBAN-TYPOGRAPHY-20260702-001). WorkItemCard.tsx had zero literal hits anyway (already fixed).
- `:filterId` param is conditionally allowed by F1's own allow-list ("only when the column is named slug or key"); dual-mode resolution verified at `src/pages/project-hub/filters/FilterPreviewPage.tsx:751` (`UUID_RE.test(urlFilterId) ? 'id' : 'slug'`). Reported separately as naming drift (CAT-AUDIT-0003), not as hard violations.
- `src/components/ads/Breadcrumbs.tsx` is the sanctioned ADS wrapper (`ProjectPageHeader` imports it at `src/components/layout/ProjectPageHeader.tsx:20`) — not a violation.
- `src/components/ads/Avatar.tsx`, `CatalystAvatar.tsx`, `UserAvatar.tsx` are the sanctioned avatar files — excluded from G1/G4.

---

## ISSUE ID: CAT-AUDIT-0001
- Category: Grid F — Slug & URL Contract (F1)
- Severity: High
- Surface: App routing (all hubs)
- Route: 36 route definitions
- Component: Route tree
- File Path: `src/routes/FullAppRoutes.tsx`
- Mode: N/A
- CRE Rule Impact: F1 — route params MUST NOT end in `Id`/`ID`/`_id`/`uuid`; F1's own enforcement grep is non-zero
- ADS Impact: None
- Typography Impact: None
- Performance Impact: None
- Accessibility Impact: None (indirect: unreadable URLs)
- Evidence: 36 params ending in `Id`/`:id` — e.g. `FullAppRoutes.tsx:462` (`releases/:versionId`), `:558` (`:id`), `:615/:619` (`:programId`), `:680` (`:id`), `:768` (`:changeId`), `:779` (`:releaseId`), `:807` (`:productId`), `:820–824` (`:epicId` ×5), `:855–875` (`:resourceId`/`:projectId`/`:boardId`/`:featureId` ×17), `:902–903` (`:spaceId`/`:documentId`), `:913/:915` (`:incidentId`), `:945` (`:versionId`), `:978`, `:1014–1024` (`:resourceId`/`:id`/`:memberId` ×6), `:1041` (`:itemId`). Full enumeration in Appendix A.
- Why This Is A Problem: RULE_TABLE F1 bans UUID/bare-ID params permanently; `CatalystRules.isValidRouteParam()` returns false for every one of these. These routes force UUID-bearing URLs, defeating the slug contract (CLAUDE.md SLUG CONTRACT ⛔) and Grid F2–F6 machinery.
- Recommended Fix: Per-cluster migration to `:slug`/`:key` params with `useXBySlug()` dual-mode hooks (F4) and `UuidToSlugRedirect` mounts outside CatalystShell (F6). Prioritize live hubs: release-hub, knowledge-hub, items/epics, resource-360, projects/*.
- Regression Risk: High if renamed without dual-mode hooks — stale bookmarks/deep links break. F4 dual-mode + F6 redirects mitigate.
- Validation Required: `grep -rn '/:.*[Ii][Dd]\b|/:.*uuid' src/routes/` → zero results; navigation smoke on each migrated route.
- Suggested PR: PR1 (route param migration, split per hub if >2h)

## ISSUE ID: CAT-AUDIT-0002
- Category: Grid F — Slug & URL Contract (F1)
- Severity: High
- Surface: Team & Program hub kanban boards
- Route: `/team/*/kanban-boards/:boardId(...)`, `/program(s)/*/kanban-boards/:boardId(...)`
- Component: Route shells
- File Path: `src/routes/TeamRoutesShell.tsx`, `src/routes/ProgramRoutesShell.tsx`
- Mode: N/A
- CRE Rule Impact: F1 — `:boardId` is the first named example in F1's banned list
- ADS/Typography/Performance/Accessibility Impact: None
- Evidence: `TeamRoutesShell.tsx:49,50,51` and `ProgramRoutesShell.tsx:76,77,78` — `kanban-boards/:boardId`, `/setup`, `/analytics` (6 occurrences)
- Why This Is A Problem: Same as 0001; additionally the parent shells themselves hang off `:programId` (0001), compounding two UUID segments per URL.
- Recommended Fix: `:boardSlug` + board slug column/trigger per F2, `Routes.teamHub.board()` builders.
- Regression Risk: Medium — board deep links; dual-mode hook required.
- Validation Required: F1 grep zero on both shells; board open/setup/analytics nav probes.
- Suggested PR: PR1

## ISSUE ID: CAT-AUDIT-0003
- Category: Grid F (F1 naming drift, conditionally sanctioned)
- Severity: Low
- Surface: Saved-filter preview routes (5 hubs)
- Route: `/tasks|testhub|incident-hub|release-hub/filters/:filterId`, `/product-hub/:key/filters/:filterId`, `/project-hub/:key/filters/:filterId`
- Component: FilterPreviewPage family
- File Path: `src/routes/FullAppRoutes.tsx:539,646,699,720,760,1060`
- Mode: N/A
- CRE Rule Impact: F1 allow-list — `:filterId` permitted "only when the column is named slug or key"; F4 dual-mode verified (`FilterPreviewPage.tsx:751`)
- Evidence: 6 route lines; a wiring test pins the pattern (`src/pages/releasehub/__tests__/release-filters-wiring.test.ts:46`)
- Why This Is A Problem: Param name still reads as an ID and future grep-based enforcement flags it forever; renaming to `:filterSlug` would make F1's grep truly zero-result instead of exception-laden.
- Recommended Fix: Optional rename `:filterId` → `:filterSlug` in one sweep incl. the wiring test; no behavior change (dual-mode already in place).
- Regression Risk: Low.
- Validation Required: Filter preview open via slug and via legacy UUID URL.
- Suggested PR: PR1 (tail item)

## ISSUE ID: CAT-AUDIT-0004
- Category: Grid F — URL construction (F3)
- Severity: High
- Surface: Repo-wide navigation call sites (~60 files)
- Route: Many
- Component: navigate() call sites
- File Path: mass pattern — top clusters: `src/modules/project-work-hub/pages/BacklogPage.atlaskit.tsx` (7), `src/pages/project-hub/filters/FilterDetailPage.tsx` (6), `src/pages/BrowsePage.tsx` (6), `src/modules/incidents/kanban/components/KanbanCard.tsx` (4), workhub dashboard sections (8 across 4 files), task10 landing (8 across 3 files)
- Mode: N/A
- CRE Rule Impact: F3 — string-concatenating `.id` into a URL is banned; enforcement grep must be zero
- ADS/Typography Impact: None
- Performance Impact: None
- Accessibility Impact: None
- Evidence: 109 active occurrences of ``navigate(`…${x.id}`)`` (F3 enforcement grep). Examples: `src/features/all-releases/components/EnterpriseTableView.tsx:147` ``navigate(`/release-hub/${release.id}`)``; `src/components/workhub/dashboard/ReleaseHealthSection.tsx:66`; `src/components/workhub/capacity/CapacityTable.tsx:142` ``navigate(`/project-hub/resource360/${r.id}`)``; `src/components/releases/defects/DefectTableView.tsx:64`. Full enumeration in Appendix B.
- Why This Is A Problem: Every call bypasses `Routes.*` typed builders and injects a UUID into the URL — the exact BANNED pattern in F3's rule text. Also keeps the 0001/0002 UUID routes alive by feeding them traffic.
- Recommended Fix: Register/extend builders in `src/lib/routes.ts`; replace call sites cluster-by-cluster (`navigate(Routes.x.y(key, slug))`). Where the target route is still UUID-based, fix jointly with PR1.
- Regression Risk: Medium — mechanical replacement; a few `.id` fields may actually hold keys (verify per cluster before assuming slug exists).
- Validation Required: `grep -rn 'navigate(\`' src/ | grep '\.id}'` → zero; click-through probes on top 10 surfaces.
- Suggested PR: PR2 (split per hub)

## ISSUE ID: CAT-AUDIT-0005
- Category: Grid F — URL construction (F3)
- Severity: Medium
- Surface: Link components
- Route: 5 routes
- Component: `<Link to>` call sites
- File Path: `src/components/committee/CommitteeQueueTable.tsx:452`, `src/components/releases/test-case-detail/TestCasePropertiesPanel.tsx:448`, `src/pages/KnowledgeHubDocumentPage.tsx:163`, `src/pages/Resource360MemberDetail.tsx:152`, `src/pages/project-hub/roadmaps/RoadmapsListPage.tsx:407`
- Mode: N/A
- CRE Rule Impact: F3
- Evidence: 5 occurrences of ``to={`…${x.id}`}`` (Appendix B)
- Why This Is A Problem: Same as 0004 via `<Link>` instead of `navigate()`.
- Recommended Fix: Same builders as 0004.
- Regression Risk: Low.
- Validation Required: Same grep for ``to={\``` pattern → zero.
- Suggested PR: PR2

## ISSUE ID: CAT-AUDIT-0006
- Category: Grid F (F3) — dormant code
- Severity: Low
- Surface: Dormant wiki module
- Route: `/wiki/learning-paths/:id`
- Component: WikiHomePage
- File Path: `src/modules-dormant/wiki/WikiHomePage.tsx:405`
- Mode: N/A
- CRE Rule Impact: F3
- Evidence: ``navigate(`/wiki/learning-paths/${p.id}`)``
- Why This Is A Problem: Dormant, but will resurface as a violation if the module is reactivated.
- Recommended Fix: Fix on reactivation, or exclude `modules-dormant/` from enforcement greps explicitly.
- Regression Risk: None (dormant).
- Validation Required: N/A while dormant.
- Suggested PR: PR2 (tail) or defer

## ISSUE ID: CAT-AUDIT-0007
- Category: Grid H — Row Typography (H2)
- Severity: Medium
- Surface: JiraTable + project-hub pages (H2's enforcement scope)
- Route: Project Board, Filter Dashboard, all JiraTable surfaces
- Component: JiraTable, ProjectBoardPage, FilterDashboardPage
- File Path: 3 files
- Mode: Both
- CRE Rule Impact: H2 — hardcoded lineHeight literals banned in row/table cell components; enforcement grep must be zero outside documented exceptions
- ADS Impact: Bypasses `--ds-line-height-body` token
- Typography Impact: Direct — row text line-height drift vs canonical 20px
- Performance Impact: None
- Accessibility Impact: `lineHeight: 1` risks descender clipping
- Evidence:
  - `src/components/shared/JiraTable/JiraTable.tsx:2535` — `lineHeight: 1` (span with `--ds-font-size-700`)
  - `src/pages/project-hub/ProjectBoardPage.tsx:144` — `lineHeight: 1.1` (mono font block)
  - `src/pages/project-hub/FilterDashboardPage.tsx:98` — `lineHeight: 1`
  (`editors.tsx:863` excluded — documented exception)
- Why This Is A Problem: These are inside H2's exact enforcement grep scope (`src/components/shared/JiraTable/ src/pages/project-hub/`) and are not on the documented-exception list, so H2's "zero results outside documented exceptions" clause currently fails.
- Recommended Fix: Replace with `var(--ds-line-height-body)` or the token pairing the element's font-size (per the H3 kanban precedent: derive, don't hardcode). If any is intentional (e.g. the size-700 glyph), add a documented exception to RULE_TABLE.md H3 notes.
- Regression Risk: Low — visual only; verify no clipping in dark/light.
- Validation Required: H2 enforcement grep → 1 result (editors.tsx:863 exception only); DOM computed-style probe on Board reference.
- Suggested PR: PR3

## ISSUE ID: CAT-AUDIT-0008
- Category: Grid H — H2-adjacent repo-wide debt (mass pattern)
- Severity: Medium
- Surface: Repo-wide (271 files)
- Route: Many
- Component: Cards, timelines, dashboards, admin, dormant modules
- File Path: mass pattern — top dirs: `src/components/resource360` (19), `src/pages` root (16), `src/modules-dormant/ideation` (15), `src/pages/admin` (14), `src/modules/work-hub/views` (13), `src/modules-dormant/wiki` (13), `src/components/layout` (13), `src/components/shared/Timeline` (12)
- Mode: Both
- CRE Rule Impact: H2 scope-adjacent — Grid H formally governs row/table surfaces only (H3 notes exempt cards/graphs/timelines), but several clusters ARE row surfaces: `src/modules/work-hub/views/AllWorkView.tsx` (8 hits), `src/components/resource360` tables, `src/modules/project-work-hub/pages` (4)
- ADS Impact: 437 hardcoded `lineHeight` numeric literals / `leading-[...]` classes bypass tokens
- Typography Impact: Systemic drift risk; the exact debt class H2 was written to kill
- Performance/Accessibility Impact: None / clipping risk at `lineHeight: 1`
- Evidence: 437 occurrences (441 total minus 3 in-scope from 0007 and 1 documented exception). Full per-file counts + enumeration in Appendix C.
- Why This Is A Problem: Every row-rendering file in this set is one refactor away from violating H1/H2; there is no ratchet gate for line-height the way there is for colors.
- Recommended Fix: (a) Triage the row-surface clusters (work-hub/views, resource360, project-work-hub) into H2 proper and fix; (b) consider a `lineHeight` ratchet in `audit:ads:gate`; (c) leave card/timeline/dormant clusters as recorded debt.
- Regression Risk: Low per-file; volume risk if swept blindly — do NOT codemod (see spacing-codemod incident d76b5d62c).
- Validation Required: Per-cluster DOM probes; count-only ratchet.
- Suggested PR: PR3 (row surfaces) + PR12 (ratchet tooling)

## ISSUE ID: CAT-AUDIT-0009
- Category: Grid E — CatalystPageHeader ban (E3)
- Severity: High
- Surface: Project Hub pages
- Route: `/project-hub/*`
- Component: CatalystPageHeader
- File Path: 9 files — `src/pages/project-hub/`: FilterDashboardPage, HierarchyAllWorkPage, HierarchyPage, IssueDetailPage, PhasePlaceholderPage, ProjectListPage, ProjectSettingsPage, StoryDetailPage, WorkItemsListPage (17 occurrences: import + JSX each, IssueDetailPage import-only)
- Mode: Both
- CRE Rule Impact: E3 — `CatalystPageHeader` BANNED on all hub routes; enforcement grep must be zero on hub routes
- ADS Impact: No breadcrumb support → violates ADS page-header navigation pattern
- Typography Impact: Header token drift vs ProjectPageHeader
- Performance Impact: None
- Accessibility Impact: Missing breadcrumb nav landmark on L1/L2 pages
- Evidence: `grep -rn CatalystPageHeader src/pages/project-hub/` → 17 hits (Appendix D)
- Why This Is A Problem: These are the flagship hub routes E3 names explicitly; each must migrate to `ProjectPageHeader` (E1 for L1 lists, E2 for L2 details with `trail`).
- Recommended Fix: Migrate to the FiltersListPage/FilterDetailPage canonical patterns.
- Regression Risk: Medium — header actions/props differ; screenshot signoff per page mandatory.
- Validation Required: E3 grep zero on `src/pages/project-hub/`; screenshots L1+L2, both modes.
- Suggested PR: PR4

## ISSUE ID: CAT-AUDIT-0010
- Category: Grid E — CatalystPageHeader ban (E3)
- Severity: High
- Surface: Release / Incident hub pages
- Route: `/release/*`, `/releases/*`
- Component: CatalystPageHeader
- File Path: 10 files — `src/pages/release/`: CreateIncidentPage, IncidentDashboardPage, IncidentViewPage, IncidentsDashboard, IncidentsList, IncidentsListPage; `src/pages/releases/`: AllReleasesPage, CommandCenterPage, CoverageReportsPage, QualityGatesPage (20 occurrences)
- Mode: Both
- CRE Rule Impact: E3 + E4 (global hub pages must use `ProjectPageHeader hubType` without projectKey)
- ADS/Typography/Accessibility Impact: As 0009
- Evidence: Appendix D
- Why This Is A Problem: Incident/release are named E4 global hubs; entire cluster is off-pattern.
- Recommended Fix: `ProjectPageHeader hubType="incident"/"release"` per E4.
- Regression Risk: Medium.
- Validation Required: E3 grep zero on both dirs; screenshots.
- Suggested PR: PR5

## ISSUE ID: CAT-AUDIT-0011
- Category: Grid E — CatalystPageHeader ban (E3)
- Severity: High
- Surface: Product Hub pages
- Route: `/product-hub/*`
- Component: CatalystPageHeader
- File Path: 4 files — `src/pages/producthub/`: IdeationPage, requirement-assist/{compose,index,output} (8 occurrences)
- Mode: Both
- CRE Rule Impact: E3
- Evidence: Appendix D
- Why This Is A Problem / Fix / Risk / Validation: As 0009, hubType="product".
- Suggested PR: PR6

## ISSUE ID: CAT-AUDIT-0012
- Category: Grid E — CatalystPageHeader ban (E3)
- Severity: Medium
- Surface: Items (epics) + Enterprise pages
- Route: `/items/*`, `/enterprise/*`
- Component: CatalystPageHeader
- File Path: 7 files — `src/pages/items/`: EpicEstimationPage, EpicsCanceledPage, EpicsPage, EpicsRecycleBinPage; `src/pages/enterprise/`: BudgetGovernancePage, BudgetPlannerPage, EnterpriseEpics (14 occurrences)
- Mode: Both
- CRE Rule Impact: E3 (hub-route status of these areas is arguable — Program/Enterprise module surfaces; treat as hub)
- Evidence: Appendix D
- Recommended Fix: Migrate to ProjectPageHeader (hubType program/enterprise) or get an explicit RULE_TABLE exemption.
- Regression Risk: Medium.
- Validation Required: grep + screenshots.
- Suggested PR: PR6

## ISSUE ID: CAT-AUDIT-0013
- Category: Grid E — CatalystPageHeader ban (E3)
- Severity: Medium
- Surface: Misc global pages
- Route: various
- Component: CatalystPageHeader
- File Path: 8 files — `src/pages/`: Features.tsx, KBAdminSetup.tsx, KanbanBoardView.tsx, KnowledgeHubSpacePage.tsx, PIObjectives.tsx, PortfolioRoadmap.tsx, ResourceListingPage.tsx, SearchPage.tsx (16 occurrences)
- Mode: Both
- CRE Rule Impact: E3/E4 — KnowledgeHubSpacePage and KanbanBoardView are clearly hub-family; SearchPage/KBAdminSetup are borderline (utility pages)
- Evidence: Appendix D
- Recommended Fix: Migrate hub-family pages; explicitly document any utility-page exemptions in RULE_TABLE E3.
- Regression Risk: Medium.
- Validation Required: grep + screenshots.
- Suggested PR: PR6

## ISSUE ID: CAT-AUDIT-0014
- Category: Grid E — Hand-rolled breadcrumbs (E5)
- Severity: High
- Surface: All Work (workhub)
- Route: `/workhub/allwork` (AllWork.tsx)
- Component: AllWorkHeader
- File Path: `src/components/workhub/allwork/AllWorkHeader.tsx:27` (consumed by `src/pages/workhub/AllWork.tsx`)
- Mode: Both
- CRE Rule Impact: E5 — hand-rolled `<nav>` breadcrumbs in hub chrome BANNED; also Tailwind classes (`className="flex items-center gap-1.5 mb-2"`)
- ADS Impact: Bypasses ADS Breadcrumbs component
- Typography Impact: Crumb text not on header tokens
- Performance Impact: None
- Accessibility Impact: Non-standard breadcrumb semantics vs @atlaskit/breadcrumbs
- Evidence: `<nav className="flex items-center gap-1.5 mb-2" aria-label="Breadcrumb">` — live on a hub surface
- Why This Is A Problem: E5 names `ProjectPageHeader trail` as the sole sanctioned mechanism; this is exactly the pattern the rule bans, on a live route.
- Recommended Fix: Replace AllWorkHeader crumb block with `ProjectPageHeader hubType` chrome (E1/E4).
- Regression Risk: Low-Medium; screenshot signoff.
- Validation Required: `grep -rn '<nav' src/components/workhub/` → zero breadcrumb navs; screenshots.
- Suggested PR: PR7

## ISSUE ID: CAT-AUDIT-0015
- Category: Grid E — direct @atlaskit/breadcrumbs in hub chrome (E5)
- Severity: Medium
- Surface: Tasks hub header, Project Work Hub backlog/chrome
- Route: `/tasks/*`, project-work-hub routes
- Component: TasksPageHeader, BacklogPage.atlaskit, ProjectChromeBand
- File Path: `src/modules/tasks/components/TasksPageHeader.tsx:13`, `src/modules/project-work-hub/pages/BacklogPage.atlaskit.tsx:44`, `src/modules/project-work-hub/components/ProjectChromeBand.tsx:50`
- Mode: Both
- CRE Rule Impact: E5 — standalone `<Breadcrumbs>` in hub chrome banned (only `ProjectPageHeader trail` sanctioned); also violates the ADS-barrel eslint pattern (`@atlaskit/*` direct import outside `src/components/ads`)
- Evidence: 3 direct `import Breadcrumbs from '@atlaskit/breadcrumbs'` outside the sanctioned `src/components/ads/Breadcrumbs.tsx` wrapper
- Why This Is A Problem: Parallel breadcrumb mechanisms guarantee crumb drift vs ProjectPageHeader's entity-icon trail.
- Recommended Fix: Route these headers through `ProjectPageHeader` (preferred) or minimally through the `@/components/ads` barrel.
- Regression Risk: Medium — TasksPageHeader is a live shared header.
- Validation Required: `grep -rn "from '@atlaskit/breadcrumbs'" src/ | grep -v components/ads` → zero; screenshots.
- Suggested PR: PR7

## ISSUE ID: CAT-AUDIT-0016
- Category: Grid E — dead/dormant hand-rolled breadcrumbs (E5)
- Severity: Low
- Surface: Dormant wiki, dead component, shadcn primitive
- Route: dormant/none
- Component: BacklogBreadcrumb, wiki pages, ui/breadcrumb
- File Path: `src/components/BacklogBreadcrumb.tsx:11` (zero consumers — dead code), `src/modules-dormant/wiki/WikiCategoryPage.tsx:37`, `src/modules-dormant/wiki/WikiWhatsNewPage.tsx:35`, `src/components/ui/breadcrumb.tsx:12` (shadcn primitive — banned in new code per §20.2, retirement ladder)
- Mode: N/A
- CRE Rule Impact: E5 latent
- Evidence: 4 `<nav aria-label="Breadcrumb">` definitions
- Why This Is A Problem: Dead/dormant patterns get copy-pasted back into live code.
- Recommended Fix: Delete `BacklogBreadcrumb.tsx` (unused); leave dormant wiki + shadcn primitive on existing retirement tracks.
- Regression Risk: None (verify zero imports before delete).
- Validation Required: `grep -rn 'BacklogBreadcrumb' src/` → only the file itself, then remove.
- Suggested PR: PR7 (delete) 

## ISSUE ID: CAT-AUDIT-0017
- Category: Grid G — Avatar contract (G1)
- Severity: Medium
- Surface: Chat
- Route: chat surfaces
- Component: AtlaskitAvatar (third, unsanctioned wrapper)
- File Path: `src/components/chat/main/AtlaskitAvatar.tsx:16`
- Mode: Both
- CRE Rule Impact: G1 — direct `@atlaskit/avatar` import allowed ONLY in `src/components/ads/Avatar.tsx` and `src/components/shared/CatalystAvatar.tsx`; enforcement grep non-zero
- ADS Impact: Custom color seeding instead of CatalystAvatar's deterministic ADS-palette hash
- Typography Impact: None
- Performance Impact: None
- Accessibility Impact: Tooltip/presence handled ad hoc
- Evidence: `import AKAvatar from '@atlaskit/avatar';` + file header calls itself "the recommended avatar for new chat surfaces" — a rival canon to G1's hierarchy. It uses `resolveAvatarUrl` but does NOT apply `isBannedAvatarSrc()` (G2 runtime ban bypassed).
- Why This Is A Problem: Creates a third avatar canon; new chat code is being pointed at it by its own docstring.
- Recommended Fix: Rebase AtlaskitAvatar on `CatalystAvatar` (keep presence dot as decoration) or fold its presence/tooltip features into CatalystAvatar; fix the docstring.
- Regression Risk: Medium — chat surfaces visual diff; screenshot signoff.
- Validation Required: G1 enforcement grep → zero outside the two sanctioned files.
- Suggested PR: PR8

## ISSUE ID: CAT-AUDIT-0018
- Category: Grid G — AvatarGroup contract (G4)
- Severity: Medium
- Surface: Universal Work View toolbar, Project Hub member stack, Tasks list view
- Route: multiple
- Component: AvatarGroup consumers
- File Path: `src/components/universal-work-view/UWVToolbar.tsx:16`, `src/components/projecthub/MemberStack.tsx:4`, `src/modules/tasks/views/TasksTaskListView.tsx:38`
- Mode: Both
- CRE Rule Impact: G4 — raw `@atlaskit/avatar-group` banned; enforcement grep non-zero. eslint no-restricted-imports gate exists (`eslint.config.js:63`) yet these ship.
- ADS Impact: MemberStack maps members straight into Atlaskit data shape — fallback renders Atlaskit gray silhouettes, not ADS-palette initials
- Evidence: 3 imports. Mitigations noted: UWVToolbar (`:361`) and TasksTaskListView (`:1640`) override item render with `CatalystAvatar`; MemberStack only filters via `isBannedAvatarSrc` (`:6`) — its non-overridden avatars bypass the CatalystAvatar chain entirely.
- Why This Is A Problem: G4 requires groups to wrap CatalystAvatar via a sanctioned mechanism; the correct home is a `CatalystAvatarGroup` in `src/components/shared/` or `src/components/ads/`, not three ad-hoc imports.
- Recommended Fix: Extract one shared AvatarGroup wrapper (in ads/ or shared/) that forces CatalystAvatar item rendering + Badge overflow; point all three at it; then the eslint gate holds.
- Regression Risk: Low-Medium.
- Validation Required: G4 enforcement grep → zero outside sanctioned files; screenshots of the three stacks.
- Suggested PR: PR8

## ISSUE ID: CAT-AUDIT-0019
- Category: Grid G — banned avatar CDN URLs (G2) + stray duplicate file
- Severity: Low
- Surface: Test fixtures only
- Route: N/A
- Component: jira-changelog-mapper tests
- File Path: `src/lib/jira-changelog-mapper/mapper.test.ts:26,57`, `src/lib/jira-changelog-mapper/mapper.test 2.ts:26,57`
- Mode: N/A
- CRE Rule Impact: G2 — gravatar URLs present, but as test INPUT fixtures (asserting the mapper handles them); no product code emits banned CDN URLs. `DemandFulfilmentGadget.tsx:1337` and `AllWorkToolbar.tsx:76` hits are comments documenting the ban.
- Evidence: 4 fixture occurrences; zero live `src=` usages of gravatar/atl-paas/googleusercontent found in product code.
- Why This Is A Problem: Not a violation per se — but `mapper.test 2.ts` is a stray duplicate file (space in name, macOS copy artifact) duplicating the entire test including fixtures; it will double-run or confuse tooling.
- Recommended Fix: Delete `src/lib/jira-changelog-mapper/mapper.test 2.ts` (verify identical to mapper.test.ts first).
- Regression Risk: None.
- Validation Required: `diff` the two files, remove duplicate.
- Suggested PR: PR8 (tail) or hygiene commit

## ISSUE ID: CAT-AUDIT-0020
- Category: Tooling — CRE gate coverage gap
- Severity: Medium
- Surface: CI / pre-commit
- Route: N/A
- Component: `scripts/cre-chokepoint-gate.cjs` (`npm run lint:cre`)
- File Path: `scripts/cre-chokepoint-gate.cjs`, `package.json` (`lint:cre`)
- Mode: N/A
- CRE Rule Impact: Meta — gate passes green while Grids E3/E5, F1, F3, G1/G4, H2 have ~690 grep-verifiable occurrences; RULE_TABLE's own enforcement greps are not wired into any gate
- Evidence: `npm run lint:cre` → "✓ CRE chokepoint gate passed" (this audit, 2026-07-03) vs Appendices A–D
- Why This Is A Problem: The rule table specifies exact enforcement greps (F1, F3, E3, G1, G4, H2) but nothing executes them; drift accumulates invisibly and each new violation ships green.
- Recommended Fix: Extend the chokepoint gate (or add a ratchet gate mirroring `ads-color-gate`) that runs the six enforcement greps against committed baselines, decreasing only. (Note per feedback-functionality-over-tooling: propose, don't self-prioritize — Vikram decides.)
- Regression Risk: None (CI-only).
- Validation Required: Gate fails on synthetic new violation; passes at baseline.
- Suggested PR: PR12

---
## Appendix A — F1 route-param occurrences (48 route lines + 1 test assertion = 49 grep hits)

```
src/pages/releasehub/__tests__/release-filters-wiring.test.ts:46:    expect(src).toMatch(/path="\/release-hub\/filters\/:filterId"/);
src/routes/TeamRoutesShell.tsx:49:      <Route path="kanban-boards/:boardId"
src/routes/TeamRoutesShell.tsx:50:      <Route path="kanban-boards/:boardId/setup"
src/routes/TeamRoutesShell.tsx:51:      <Route path="kanban-boards/:boardId/analytics"
src/routes/ProgramRoutesShell.tsx:76:      <Route path="kanban-boards/:boardId"
src/routes/ProgramRoutesShell.tsx:77:      <Route path="kanban-boards/:boardId/setup"
src/routes/ProgramRoutesShell.tsx:78:      <Route path="kanban-boards/:boardId/analytics"
src/routes/FullAppRoutes.tsx:462:          <Route path="releases/:versionId"
src/routes/FullAppRoutes.tsx:558:        <Route path="/product-hub/requirement-assist/:id"
src/routes/FullAppRoutes.tsx:615:        <Route path="/program/:programId/*"
src/routes/FullAppRoutes.tsx:619:        <Route path="/programs/:programId/*"
src/routes/FullAppRoutes.tsx:646:        <Route path="/tasks/filters/:filterId"
src/routes/FullAppRoutes.tsx:680:        <Route path="/testhub/sets/:id"
src/routes/FullAppRoutes.tsx:699:        <Route path="/testhub/filters/:filterId"
src/routes/FullAppRoutes.tsx:720:        <Route path="/incident-hub/filters/:filterId"
src/routes/FullAppRoutes.tsx:760:        <Route path="/release-hub/filters/:filterId"
src/routes/FullAppRoutes.tsx:768:        <Route path="/release-hub/changes/:changeId"
src/routes/FullAppRoutes.tsx:779:        <Route path="/release-hub/:releaseId"
src/routes/FullAppRoutes.tsx:807:        <Route path="/product/:productId/room"
src/routes/FullAppRoutes.tsx:820:        <Route path="/items/epics/:epicId/status-report"
src/routes/FullAppRoutes.tsx:821:        <Route path="/items/epics/:epicId/trace"
src/routes/FullAppRoutes.tsx:822:        <Route path="/items/epics/:epicId/requirement-hierarchy"
src/routes/FullAppRoutes.tsx:823:        <Route path="/items/epics/:epicId/responsibility-matrix"
src/routes/FullAppRoutes.tsx:824:        <Route path="/items/epics/:epicId/planning"
src/routes/FullAppRoutes.tsx:855:        <Route path="/projecthub/resource360/:id"
src/routes/FullAppRoutes.tsx:856:        <Route path="/resource-360/:resourceId"
src/routes/FullAppRoutes.tsx:859:        <Route path="/projects/:projectId/features"
src/routes/FullAppRoutes.tsx:860:        <Route path="/projects/:projectId/features/:featureId"
src/routes/FullAppRoutes.tsx:862:        <Route path="/projects/:projectId"
src/routes/FullAppRoutes.tsx:868:        <Route path="/projects/:projectId/boards"
src/routes/FullAppRoutes.tsx:869:        <Route path="/projects/:projectId/boards/:boardId"
src/routes/FullAppRoutes.tsx:870:        <Route path="/projects/:projectId/work"
src/routes/FullAppRoutes.tsx:871:        <Route path="/projects/:projectId/backlog"
src/routes/FullAppRoutes.tsx:872:        <Route path="/projects/:projectId/roadmap"
src/routes/FullAppRoutes.tsx:873:        <Route path="/projects/:projectId/dependencies"
src/routes/FullAppRoutes.tsx:874:        <Route path="/projects/:projectId/reports"
src/routes/FullAppRoutes.tsx:875:        <Route path="/project/:projectId/work"
src/routes/FullAppRoutes.tsx:902:        <Route path="/knowledge-hub/spaces/:spaceId"
src/routes/FullAppRoutes.tsx:903:        <Route path="/knowledge-hub/documents/:documentId"
src/routes/FullAppRoutes.tsx:913:        <Route path="/release/incidents/:incidentId"
src/routes/FullAppRoutes.tsx:915:        <Route path="/release/incident-room/:incidentId"
src/routes/FullAppRoutes.tsx:945:          <Route path="workflows/:versionId/edit"
src/routes/FullAppRoutes.tsx:978:          <Route path="resources/:resourceId"
src/routes/FullAppRoutes.tsx:1014:        <Route path="/my-team/:resourceId"
src/routes/FullAppRoutes.tsx:1016:        <Route path="/project-hub/resources/:resourceId"
src/routes/FullAppRoutes.tsx:1018:        <Route path="/project-hub/resources-v2/:resourceId"
src/routes/FullAppRoutes.tsx:1022:        <Route path="/project-hub/resource360/:id"
src/routes/FullAppRoutes.tsx:1023:        <Route path="/project-hub/resource-360/:resourceId"
src/routes/FullAppRoutes.tsx:1024:        <Route path="/resource360/members/:memberId"
```

## Appendix B — F3 raw URL concatenation (navigate: 110 · Link to: 5 = 115 total)

### B.1 navigate() call sites
```
src/modules-dormant/wiki/WikiHomePage.tsx:405
src/features/all-releases/components/EnterpriseTableView.tsx:147
src/components/workhub/dashboard/ReleaseHealthSection.tsx:66
src/components/workhub/dashboard/ReleaseHealthSection.tsx:69
src/components/workhub/dashboard/ThemeProgressSection.tsx:64
src/components/workhub/dashboard/ThemeProgressSection.tsx:67
src/components/workhub/capacity/CapacityTable.tsx:142
src/components/workhub/jira/JiraProjectsPage.tsx:174
src/components/workhub/dashboard/TeamUtilizationSection.tsx:75
src/components/workhub/dashboard/TeamUtilizationSection.tsx:78
src/components/workhub/dashboard/ReleaseTimeline.tsx:184
src/features/my-test-scope/components/MyTestScopeDashboard.tsx:115
src/features/my-test-scope/components/MyTestScopeDashboard.tsx:122
src/components/workhub/resource360/Resource360Page.tsx:180
src/components/workhub/resource360/Resource360Page.tsx:188
src/components/workhub/themes/ThemesPage.tsx:130
src/components/workhub/analytics/ThemeHealthChart.tsx:37
src/components/committee/CommitteeQueueTable.tsx:390
src/components/releases/defects/DefectTableView.tsx:64
src/components/releases/defects/DefectTableView.tsx:122
src/components/releases/all-releases/ReleasesTableRow.tsx:45
src/components/releases/defects/DefectKanbanView.tsx:223
src/components/releases/test-cycles/CycleCardEnhanced.tsx:114
src/components/knowledge-hub/KnowledgeBaseCard.tsx:30
src/components/project/ProjectHeader.tsx:81
src/components/releasehub/WorkItemTraceabilityPanel.tsx:38
src/components/releasehub/WorkItemTraceabilityPanel.tsx:50
src/components/boards/BoardCanvasPage.tsx:272
src/components/items/features/FeatureDetailsPanel.tsx:271
src/components/requirement-assist/DocumentTable.tsx:49
src/modules/tasks/components/dashboard/DashboardUpcomingDeadlines.tsx:106
src/modules/project-work-hub/ProjectWorkHubPage.tsx:41
src/modules/tasks/components/dashboard/DashboardUpcomingDeadlinesV2.tsx:108
src/modules/tasks/components/TaskDetailDrawer/TaskDetailDrawer.tsx:288
src/modules/task10/components/week/T10WeekHeader.tsx:43
src/modules/task10/components/landing/T10ListCardMinimal.tsx:33
src/modules/task10/components/landing/T10ListCardMinimal.tsx:47
src/modules/task10/components/landing/T10ListCardMinimal.tsx:182
src/modules/project-work-hub/pages/BacklogPage.atlaskit.tsx:2650
src/modules/project-work-hub/pages/BacklogPage.atlaskit.tsx:2657
src/modules/project-work-hub/pages/BacklogPage.atlaskit.tsx:2663
src/modules/project-work-hub/pages/BacklogPage.atlaskit.tsx:2699
src/modules/project-work-hub/pages/BacklogPage.atlaskit.tsx:2703
src/modules/project-work-hub/pages/BacklogPage.atlaskit.tsx:2707
src/modules/project-work-hub/pages/BacklogPage.atlaskit.tsx:5061
src/modules/task10/components/landing/T10ListCardNew.tsx:43
src/modules/task10/components/landing/T10ListCardNew.tsx:46
src/modules/task10/components/landing/T10ListCardNew.tsx:63
src/modules/task10/components/week/T10WeekViewV3.tsx:424
src/modules/task10/components/week/T10WeekViewV3.tsx:431
src/pages/ResourceListingPage.tsx:503
src/modules/incidents/kanban/components/KanbanCard.tsx:137
src/modules/incidents/kanban/components/KanbanCard.tsx:142
src/modules/incidents/kanban/components/KanbanCard.tsx:301
src/modules/incidents/kanban/components/KanbanCard.tsx:313
src/pages/KnowledgeHubSpacePage.tsx:178
src/pages/KnowledgeHubSpacePage.tsx:182
src/pages/KnowledgeHubSpacePage.tsx:196
src/pages/ProjectDirectory.tsx:202
src/pages/ProjectDirectory.tsx:230
src/pages/releases/TestPlansPage.tsx:495
src/pages/releases/TestPlansPage.tsx:577
src/pages/releases/CommandCenterPage.tsx:581
src/pages/releases/CommandCenterPage.tsx:728
src/pages/ForYouPage.atlaskit.tsx:482
src/pages/KnowledgeHubPage.tsx:150
src/pages/KnowledgeHubPage.tsx:196
src/modules/priorities/pages/PriListsPage.tsx:39
src/modules/priorities/pages/PriListsPage.tsx:150
src/modules/incidents/kanban/pages/IncidentKanbanPage.tsx:531
src/pages/admin/workflows/studio/WorkItemTypesTab.tsx:109
src/modules/incidents/analytics/pages/IncidentAnalyticsPage.tsx:102
src/pages/release/IncidentsListPage.tsx:179
src/pages/BrowsePage.tsx:147
src/pages/BrowsePage.tsx:152
src/pages/BrowsePage.tsx:155
src/pages/BrowsePage.tsx:159
src/pages/BrowsePage.tsx:162
src/pages/BrowsePage.tsx:165
src/pages/admin/workflows/studio/HistoryDrawer.tsx:70
src/pages/releases/CalendarPage.tsx:78
src/pages/releases/ExecutionPage.tsx:29
src/pages/releasehub/CommandCenterPage.tsx:276
src/pages/producthub/requirement-assist/compose.tsx:123
src/pages/admin/workflows/studio/StudioTabs.tsx:197
src/pages/releasehub/AllReleasesPage.tsx:291
src/pages/release/CreateIncidentPage.tsx:251
src/pages/testhub/sets/TestSetsPage.tsx:435
src/pages/releasehub/AllChangesPage.tsx:215
src/pages/project-hub/roadmaps/RoadmapsListPage.tsx:187
src/pages/project-hub/roadmaps/RoadmapsListPage.tsx:619
src/pages/testhub/cycles/CycleDetailPage.tsx:212
src/pages/testhub/sets/SetDetailPage.tsx:700
src/pages/project-hub/filters/FilterDetailPage.tsx:251
src/pages/project-hub/filters/FilterDetailPage.tsx:254
src/pages/project-hub/filters/FilterDetailPage.tsx:261
src/pages/project-hub/filters/FilterDetailPage.tsx:262
src/pages/project-hub/filters/FilterDetailPage.tsx:267
src/pages/project-hub/filters/FilterDetailPage.tsx:268
src/modules/task10/components/landing/T10ListCardV3.tsx:69
src/modules/task10/components/landing/T10LandingPageV3.tsx:419
src/modules/task10/components/landing/T10LandingPageV3.tsx:427
src/modules/task10/components/landing/T10LandingPageV3.tsx:429
src/modules/incidents/analytics/pages/IncidentInsightsPage.tsx:1258
src/pages/releases/AllReleasesPage.tsx:873
src/pages/producthub/requirement-assist/categories.tsx:66
src/pages/release/IncidentRoomList.tsx:84
src/pages/release/IncidentDashboardPage.tsx:416
src/pages/items/reports/EpicPlanningPage.tsx:235
src/pages/items/reports/EpicPlanningPage.tsx:273
```

### B.2 Link to= call sites
```
src/components/committee/CommitteeQueueTable.tsx:452
src/components/releases/test-case-detail/TestCasePropertiesPanel.tsx:448
src/pages/KnowledgeHubDocumentPage.tsx:163
src/pages/Resource360MemberDetail.tsx:152
src/pages/project-hub/roadmaps/RoadmapsListPage.tsx:407
```

## Appendix C — H2 hardcoded lineHeight / leading-[...] (repo-wide: 441 grep hits across 271 files; in-scope violations: 3; documented exception: editors.tsx:863)

### C.1 In-scope (H2 enforcement grep)
```
src/pages/project-hub/ProjectBoardPage.tsx:144:                  fontFamily: 'var(--cp-font-mono)', lineHeight: 1.1,
src/components/shared/JiraTable/JiraTable.tsx:2535:                  <span style={{ fontSize: 'var(--ds-font-size-700)',
src/components/shared/JiraTable/editors.tsx:863:                  lineHeight: 1.4,
src/pages/project-hub/FilterDashboardPage.tsx:98:        lineHeight: 1,
```

### C.2 Repo-wide per-file counts
```
   9 src/pages/ReqAssistGenerate.tsx
   8 src/modules/work-hub/views/AllWorkView.tsx
   8 src/components/strategy/room/AIExecutiveBrief.tsx
   7 src/features/chat-v2/components/Summarize/SummaryPanel.tsx
   6 src/modules/tasks/components/workstreams/WorkstreamDrawer.tsx
   5 src/pages/r360-member/RingView.tsx
   5 src/pages/admin/workflows/WorkflowAdminPage.tsx
   5 src/modules/work-hub/views/ReleasesView.tsx
   5 src/modules-dormant/wiki/WikiArticlePage.tsx
   5 src/components/layout/SidebarBase.tsx
   4 src/pages/dev/EvidenceToExecutionFull.tsx
   4 src/pages/admin/FieldLayoutPage.tsx
   4 src/modules/tasks/views/TasksTaskListView.tsx
   4 src/modules/project-work-hub/pages/BacklogPage.atlaskit.tsx
   4 src/modules-dormant/ideation/IdeationIntelligenceHub.tsx
   4 src/components/shared/Timeline/TimelineView.tsx
   4 src/components/resource360/RingViewV16.tsx
   4 src/components/product-dashboard/BrPostMortemModal.tsx
   3 src/pages/admin/AdminAccessPage.tsx
   3 src/modules-dormant/ideation/IdeationTriagePanel.tsx
   3 src/modules-dormant/ideation/IdeationDetailPanel.tsx
   3 src/features/kanban-board/components/Board.tsx
   3 src/features/health/components/HealthPanel.tsx
   3 src/components/strategy/intelligence/AIStrategyIntelligencePanel.tsx
   3 src/components/shared/Timeline/SidebarRow.tsx
   3 src/components/resource360/Resource360Banner.tsx
   3 src/components/resource360/R360RingView.tsx
   3 src/components/resource360/R360DetailPanel.tsx
   3 src/components/reqAssist/RAJiraSidePanel.tsx
   3 src/components/product-dashboard/widgets/StageDrillDownDrawer.tsx
   3 src/components/product-dashboard/widgets/ActiveInitiativesWidget.tsx
   3 src/components/filters/CanonicalFilter.tsx
   3 src/components/chat/ChatMainView.tsx
   3 src/components/boards/BoardSettingsDrawer.tsx
   3 src/components/boards/AttentionItemCard.tsx
   3 src/components/admin/ai-assistant/AiActivityFeed.tsx
   2 src/pages/testhub/reports/ReportsHubPage.tsx
   2 src/pages/testhub/cycles/CycleDetailPage.tsx
   2 src/pages/releases/AllReleasesPage.tsx
   2 src/pages/dev/EvidenceToExecutionSimple.tsx
   2 src/pages/admin/workflows/CatalystWorkflowBuilder.tsx
   2 src/pages/admin/connections/VercelConnectionPage.tsx
   2 src/pages/admin/connections/NotionConnectionPage.tsx
   2 src/pages/admin/ReleaseOpsAdminPage.tsx
   2 src/pages/admin/AdminStorybookPage.tsx
   2 src/pages/DeactivatedPage.tsx
   2 src/pages/CleanupPage.tsx
   2 src/modules/workhub/admin/components/SyncConfigPanel.tsx
   2 src/modules/workhub/admin/components/SchedulingRules.tsx
   2 src/modules/task10/components/week/T10WeekViewV3.tsx
   2 src/modules/task10/components/panel/T10EnterpriseSidePanel.tsx
   2 src/modules/product-roadmap/components/RoadmapDetailPanel.tsx
   2 src/modules-dormant/wiki/WikiSearchPage.tsx
   2 src/modules-dormant/wiki/WikiHomePage.tsx
   2 src/modules-dormant/ideation/IdeationCreateWizard.tsx
   2 src/lib/catalyst-rules/CatalystRules.ts
   2 src/features/notifications/components/DirectNotificationRow.tsx
   2 src/features/chat-v2/components/MessagePanel/ChannelEmptyState.tsx
   2 src/features/chat-v2/components/Later/LaterRow.tsx
   2 src/features/chat-v2/components/Activity/ActivityRow.tsx
   2 src/components/workhub/releases/ReleaseDetail.tsx
   2 src/components/workhub/allwork/AllWorkSplitView.tsx
   2 src/components/wiki/WikiQuickRefDrawer.tsx
   2 src/components/wiki/WikiOnboardingWizard.tsx
   2 src/components/strategy/shared/KrListItem.tsx
   2 src/components/shared/jira-description-editor/Toolbar.tsx
   2 src/components/shared/Timeline/ProductEditDatesModal.tsx
   2 src/components/requirement-assist/TranslationView.tsx
   2 src/components/reqAssist/RAPDFViewer.tsx
   2 src/components/reqAssist/RAEpicGenerationModal.tsx
   2 src/components/reqAssist/RAEpicDraftDrawer.tsx
   2 src/components/releasehub/ReleasePredictorCard.tsx
   2 src/components/releasehub/ReleasePeekPanel.tsx
   2 src/components/releasehub/CatyRiskPanel.tsx
   2 src/components/project-hub/sdlc/PHDetailDrawer.tsx
   2 src/components/project-hub/dashboard/widgets/ReleaseConfidenceWidget.tsx
   2 src/components/project-hub/dashboard/widgets/ItemsByStatusWidget.tsx
   2 src/components/project-hub/dashboard/GadgetSettingsPanel.tsx
   2 src/components/planner/task-modal/organisms/ModalHeader.tsx
   2 src/components/notifications/AgeingTab.tsx
   2 src/components/layout/ProjectPageHeader.tsx
   2 src/components/knowledge-assist/KnowledgeAssistPanel.tsx
   2 src/components/knowledge-assist/KAItemDetailPanel.tsx
   2 src/components/ideas-roadmap/PresentationModal.tsx
   2 src/components/goals/GoalDetailDrawer.tsx
   2 src/components/for-you/ForYouInlineFilters.tsx
   2 src/components/filters/JQLEditor.tsx
   2 src/components/filters/FilterTemplateGallery.tsx
   2 src/components/chat/main/SlashCommandPalette.tsx
   2 src/components/caty/AskCatyInlineBar.tsx
   2 src/components/catalyst-ds/comments/CommentToolbar.tsx
   2 src/components/boards/KanbanCard.tsx
   2 src/components/admin/ai-assistant/AiCommandComposer.tsx
   1 src/stories/fixtures/DuplicateCard.tsx
   1 src/spaces/components/steps/StepPermissions.tsx
   1 src/spaces/components/steps/StepFeatures.tsx
   1 src/pages/testhub/traceability/TraceabilityPage.tsx
   1 src/pages/testhub/reports/lab/ReportNavigator.tsx
   1 src/pages/testhub/reports/lab/ReportFormulaDrawer.tsx
   1 src/pages/testhub/reports/lab/ReportEmptyState.tsx
   1 src/pages/testhub/cycles/ExecutionPage.tsx
   1 src/pages/testhub/cycles/CyclesPage.tsx
   1 src/pages/releasehub/ReleaseSettingsPage.tsx
   1 src/pages/releasehub/ReleaseCalendarPage.tsx
   1 src/pages/releasehub/CommandCenterPage.tsx
   1 src/pages/r360-member/QuickSearchInput.tsx
   1 src/pages/project-hub/ProjectBoardPage.tsx
   1 src/pages/project-hub/FilterDashboardPage.tsx
   1 src/pages/producthub/IdeasThemePage.tsx
   1 src/pages/producthub/IdeasRoadmapPage.tsx
   1 src/pages/product/ideas/IdeasRoadmapPage.tsx
   1 src/pages/incidenthub/IncidentInsightsPage.tsx
   1 src/pages/admin/test/TestCaseStatusesPage.tsx
   1 src/pages/admin/test-ops/TestOpsPage.tsx
   1 src/pages/admin/connections/JiraSyncPage.tsx
   1 src/pages/admin/components/ComponentsAdminPage.tsx
   1 src/pages/admin/RoutingTaxonomyPage.tsx
   1 src/pages/admin/FieldRegistryPage.tsx
   1 src/pages/admin/AdminOverview.tsx
   1 src/pages/ResourceListingPage.tsx
   1 src/pages/ReqAssistLibrary.tsx
   1 src/pages/R360MemberDetail.tsx
   1 src/modules/workhub/admin/components/UserMapping.tsx
   1 src/modules/workhub/admin/components/StatusMapping.tsx
   1 src/modules/workhub/admin/components/ReadOnlyBanner.tsx
   1 src/modules/workhub/admin/components/DataScope.tsx
   1 src/modules/tasks/widgets/TasksByStatusWidget.tsx
   1 src/modules/tasks/widgets/OverdueTasksWidget.tsx
   1 src/modules/tasks/widgets/BlockedTasksWidget.tsx
   1 src/modules/tasks/components/workstreams/WorkstreamSummaryCard.tsx
   1 src/modules/project-work-hub/components/dialogs/story-detail-modules/RichTextCommentEditor.tsx
   1 src/modules/project-work-hub/components/dialogs/story-detail-modules/LinkedIssuesSection.tsx
   1 src/modules/project-work-hub/components/dialogs/story-detail-modules/ConfirmDialog.tsx
   1 src/modules/project-work-hub/components/dialogs/MoveIssueDialog.tsx
   1 src/modules/project-work-hub/components/dialogs/ArchiveConfirmDialog.tsx
   1 src/modules/project-work-hub/components/ProjectChromeBand.tsx
   1 src/modules/priorities/components/PriLabelBadge.tsx
   1 src/modules-dormant/wiki/WikiWhatsNewPage.tsx
   1 src/modules-dormant/wiki/WikiLearningPathsPage.tsx
   1 src/modules-dormant/wiki/WikiLearningPathDetailPage.tsx
   1 src/modules-dormant/wiki/WikiCategoryPage.tsx
   1 src/modules-dormant/ideation/IdeationDrivesView.tsx
   1 src/modules-dormant/ideation/IdeationBoardView.tsx
   1 src/modules-dormant/ideation/IdeationAnalyticsView.tsx
   1 src/lib/catalystFlag.tsx
   1 src/features/whatsapp-summary/WhatsAppSummaryModal.tsx
   1 src/features/kanban-board/components/InlineCreate.tsx
   1 src/features/chat/components/thread/ThreadPane.tsx
   1 src/features/chat/components/feed/HoverToolbar.tsx
   1 src/features/chat-v2/components/Sidebar/DmRichRow.tsx
   1 src/features/chat-v2/components/NavRail/ChatNavRail.tsx
   1 src/features/chat-v2/components/MessagePanel/ReactionStrip.tsx
   1 src/features/chat-v2/components/MessagePanel/PinsPanel.tsx
   1 src/features/chat-v2/components/MessagePanel/PinnedBanner.tsx
   1 src/features/chat-v2/components/MessagePanel/MessageHoverActions.tsx
   1 src/features/chat-v2/components/MessagePanel/DeleteMessageDialog.tsx
   1 src/features/chat-v2/components/EmojiPicker/EmojiPicker.tsx
   1 src/features/chat-v2/components/DraftsAndSent/OutgoingMessagesBanner.tsx
   1 src/features/chat-v2/components/DraftsAndSent/DraftsTab.tsx
   1 src/features/chat-v2/components/Composer/ComposerEditor.tsx
   1 src/features/chat-v2/components/Activity/ActivityPanel.tsx
   1 src/features/chat-v2/components/Activity/ActivityHoverStrip.tsx
   1 src/components/workhub/themes/ThemeCard.tsx
   1 src/components/workhub/issue-view/IssueViewShell.tsx
   1 src/components/workhub/issue-view/IssueActionDialogs.tsx
   1 src/components/workhub/dashboard/DashboardKPIRow.tsx
   1 src/components/workhub/capacity/CapacityPage.tsx
   1 src/components/wiki/WikiChatPanel.tsx
   1 src/components/testhub/reports/ReportInsightCard.tsx
   1 src/components/strategy/widgets/StrategyPyramid.tsx
   1 src/components/strategy/widgets/OkrHeatmap.tsx
   1 src/components/strategy/widgets/ActivityFeed.tsx
   1 src/components/strategy/themes/ThemeStatsStrip.tsx
   1 src/components/strategy/themes/ThemeDetailDrawer.tsx
   1 src/components/strategy/themes/ThemeBoardView.tsx
   1 src/components/shared/title-translate/BizArabicTranslateLink.tsx
   1 src/components/shared/rich-text/atlaskit/adfLightRenderer.tsx
   1 src/components/shared/Timeline/utils.ts
   1 src/components/shared/Timeline/primitives.tsx
   1 src/components/shared/Timeline/ProductTimelineRowMenu.tsx
   1 src/components/shared/JiraTable/editors.tsx
   1 src/components/shared/JiraTable/JiraTable.tsx
   1 src/components/shared/CommandCenterHeader.tsx
   1 src/components/shared/CatalystAvatar.tsx
   1 src/components/shared/CanonicalDescriptionField/DescriptionViewMode.tsx
   1 src/components/shared/CanonicalDescriptionField/DescriptionEditMode.tsx
   1 src/components/shared/BacklogTable/BacklogTable.tsx
   1 src/components/shared/AutoSyncCard.tsx
   1 src/components/resource360/Resource360Board.tsx
   1 src/components/resource360/R360ChronologyView.tsx
   1 src/components/resource360/R360BoardView.tsx
   1 src/components/resource360/DepartmentIntelligenceOverlay.tsx
   1 src/components/resource360/ClaimDrillInPanel.tsx
   1 src/components/resource360/ChronologyView.tsx
   1 src/components/requirement-assist/EpicView.tsx
   1 src/components/reqAssist/RABackgroundModal.tsx
   1 src/components/releases/ReleasesTable.tsx
   1 src/components/releases/ReleaseFilters.tsx
   1 src/components/releasehub/detail/ReleaseDetailTabs.tsx
   1 src/components/r360/R360WeeklyStoryTab.tsx
   1 src/components/r360/R360SummarizeDrawer.tsx
   1 src/components/r360/R360DrawerShared.tsx
   1 src/components/project-hub/work-items/CreateWorkItemModal.tsx
   1 src/components/project-hub/settings/TypesTab.tsx
   1 src/components/project-hub/settings/MembersTab.tsx
   1 src/components/project-hub/settings/ArchiveConfirmModal.tsx
   1 src/components/project-hub/sdlc/PHBoardView.tsx
   1 src/components/project-hub/dashboard/widgets/TeamWorkloadWidget.tsx
   1 src/components/project-hub/dashboard/widgets/ScopeChangeWidget.tsx
   1 src/components/project-hub/dashboard/widgets/ReleaseHealthWidget.tsx
   1 src/components/project-hub/dashboard/widgets/OverdueWidget.tsx
   1 src/components/project-hub/dashboard/widgets/OnHoldWidget.tsx
   1 src/components/project-hub/dashboard/widgets/BrPulseMapWidget.tsx
   1 src/components/producthub/timeline/TimelineTodayLine.tsx
   1 src/components/producthub/timeline/TimelineDateCursor.tsx
   1 src/components/producthub/timeline/TimelineBarTooltip.tsx
   1 src/components/producthub/shared/SourceBadge.tsx
   1 src/components/producthub/shared/CreateRequestDrawer.tsx
   1 src/components/product-hub/roadmap/RoadmapRequestList.tsx
   1 src/components/product-hub/roadmap/RoadmapKPIStrip.tsx
   1 src/components/product-dashboard/widgets/WidgetSettingsPanel.tsx
   1 src/components/product-dashboard/widgets/AtAGlanceWidget.tsx
   1 src/components/product-dashboard/WidgetShell.tsx
   1 src/components/planner/task-modal/molecules/NoteComposer.tsx
   1 src/components/planner/task-modal/molecules/CommentComposer.tsx
   1 src/components/planner/task-modal/molecules/ActivityItem.tsx
   1 src/components/notifications/NotificationPanel.tsx
   1 src/components/layout/UnifiedSidebar.tsx
   1 src/components/layout/PageChrome.tsx
   1 src/components/layout/HuddleWindow.tsx
   1 src/components/layout/HubPageHeader.tsx
   1 src/components/layout/ContextSwitcher.tsx
   1 src/components/layout/AskCatalystPill.tsx
   1 src/components/knowledge-hub/editor/ConfluenceEditor.tsx
   1 src/components/kanban/overflow-menu/LabelEditorPanel.tsx
   1 src/components/ideas-roadmap/RoadmapSidePanel.tsx
   1 src/components/ideas-roadmap/RoadmapKanban.tsx
   1 src/components/ideas-roadmap/RoadmapCard.tsx
   1 src/components/icons/CatalystIconWrapper.tsx
   1 src/components/hierarchy/DetailPanel.tsx
   1 src/components/goals/GoalsStatsStrip.tsx
   1 src/components/goals/GoalsHeatmapView.tsx
   1 src/components/global-search/FilterDropdown.tsx
   1 src/components/for-you/atlaskit/SummarizeDigestModal.tsx
   1 src/components/for-you/atlaskit/StarredEmptyState.tsx
   1 src/components/for-you/atlaskit/RecommendedPanel.tsx
   1 src/components/for-you/atlaskit/CatyButton.tsx
   1 src/components/chat/main/ConversationList.tsx
   1 src/components/chat/caty-mood/CatyWhyCard.tsx
   1 src/components/chat/UserStatusDisplay.tsx
   1 src/components/catalyst-ds/status/Lozenge.tsx
   1 src/components/catalyst-ds/comments/Comment.tsx
   1 src/components/catalyst-ds/activity/JiraActivityRow.tsx
   1 src/components/catalyst-detail-views/shared/sections/Description/_components/TableInteractions/MenuShared.tsx
   1 src/components/catalyst-detail-views/shared/sections/Description/_components/SlashMenu/ViewMoreModal.tsx
   1 src/components/catalyst-detail-views/shared/sections/Description/_components/SlashMenu/SlashMenu.tsx
   1 src/components/catalyst-detail-views/shared/sections/Description/_components/SelectionTranslate/SelectionTranslate.tsx
   1 src/components/catalyst-detail-views/shared/sections/Description/_components/MentionSuggestionPill/MentionSuggestionPill.tsx
   1 src/components/catalyst-detail-views/shared/sections/CatalystQuickActions.tsx
   1 src/components/catalyst-detail-views/shared/sections/CatalystAcceptanceCriteria.tsx
   1 src/components/catalyst-detail-views/improve/ImproveIssueDropdown.tsx
   1 src/components/catalyst-detail-views/idea/CatalystViewIdea.tsx
   1 src/components/catalyst-detail-views/defect/CatalystDefectFields.tsx
   1 src/components/business-requests/CreateBusinessRequestModal.tsx
   1 src/components/boards/BoardCard.tsx
   1 src/components/auth/login/LoginFormPanel.tsx
   1 src/components/auth/HeroPanel.tsx
   1 src/components/ads/EmptyState.tsx
   1 src/components/admin/rbac/PermissionsMatrix.tsx
   1 src/components/admin/StatusRegistryTable.tsx
   1 src/components/ErrorBoundary.tsx
```

### C.3 Repo-wide full enumeration (file:line)
```
src/modules-dormant/ideation/IdeationCreateWizard.tsx:325
src/modules-dormant/ideation/IdeationCreateWizard.tsx:498
src/modules-dormant/ideation/IdeationIntelligenceHub.tsx:192
src/modules-dormant/ideation/IdeationIntelligenceHub.tsx:234
src/modules-dormant/ideation/IdeationIntelligenceHub.tsx:247
src/modules-dormant/ideation/IdeationIntelligenceHub.tsx:298
src/modules-dormant/ideation/IdeationDrivesView.tsx:154
src/modules-dormant/ideation/IdeationBoardView.tsx:155
src/modules-dormant/ideation/IdeationAnalyticsView.tsx:148
src/modules-dormant/wiki/WikiLearningPathDetailPage.tsx:147
src/modules-dormant/ideation/IdeationDetailPanel.tsx:287
src/modules-dormant/ideation/IdeationDetailPanel.tsx:485
src/modules-dormant/ideation/IdeationDetailPanel.tsx:658
src/modules-dormant/wiki/WikiCategoryPage.tsx:55
src/modules-dormant/wiki/WikiHomePage.tsx:342
src/modules-dormant/wiki/WikiHomePage.tsx:418
src/modules-dormant/wiki/WikiSearchPage.tsx:231
src/modules-dormant/wiki/WikiSearchPage.tsx:349
src/modules-dormant/ideation/IdeationTriagePanel.tsx:287
src/modules-dormant/ideation/IdeationTriagePanel.tsx:288
src/modules-dormant/ideation/IdeationTriagePanel.tsx:290
src/modules-dormant/wiki/WikiWhatsNewPage.tsx:77
src/modules-dormant/wiki/WikiArticlePage.tsx:144
src/modules-dormant/wiki/WikiArticlePage.tsx:540
src/modules-dormant/wiki/WikiArticlePage.tsx:549
src/modules-dormant/wiki/WikiArticlePage.tsx:602
src/modules-dormant/wiki/WikiArticlePage.tsx:739
src/features/whatsapp-summary/WhatsAppSummaryModal.tsx:259
src/modules-dormant/wiki/WikiLearningPathsPage.tsx:43
src/features/chat/components/feed/HoverToolbar.tsx:429
src/features/chat/components/thread/ThreadPane.tsx:291
src/features/chat-v2/components/Sidebar/DmRichRow.tsx:86
src/features/chat-v2/components/DraftsAndSent/DraftsTab.tsx:140
src/features/chat-v2/components/DraftsAndSent/OutgoingMessagesBanner.tsx:35
src/features/chat-v2/components/MessagePanel/DeleteMessageDialog.tsx:76
src/features/chat-v2/components/MessagePanel/PinsPanel.tsx:201
src/features/chat-v2/components/MessagePanel/PinnedBanner.tsx:75
src/features/chat-v2/components/MessagePanel/ReactionStrip.tsx:85
src/features/chat-v2/components/Activity/ActivityPanel.tsx:490
src/features/chat-v2/components/Activity/ActivityHoverStrip.tsx:102
src/features/chat-v2/components/Activity/ActivityRow.tsx:219
src/features/chat-v2/components/Activity/ActivityRow.tsx:380
src/features/chat-v2/components/Composer/ComposerEditor.tsx:237
src/features/chat-v2/components/Summarize/SummaryPanel.tsx:196
src/features/chat-v2/components/Summarize/SummaryPanel.tsx:314
src/features/chat-v2/components/Summarize/SummaryPanel.tsx:375
src/features/chat-v2/components/Summarize/SummaryPanel.tsx:417
src/features/chat-v2/components/Summarize/SummaryPanel.tsx:457
src/features/chat-v2/components/Summarize/SummaryPanel.tsx:463
src/features/chat-v2/components/Summarize/SummaryPanel.tsx:478
src/features/chat-v2/components/EmojiPicker/EmojiPicker.tsx:257
src/features/chat-v2/components/MessagePanel/ChannelEmptyState.tsx:54
src/features/chat-v2/components/MessagePanel/ChannelEmptyState.tsx:201
src/features/chat-v2/components/NavRail/ChatNavRail.tsx:169
src/features/chat-v2/components/Later/LaterRow.tsx:110
src/features/chat-v2/components/Later/LaterRow.tsx:120
src/features/chat-v2/components/MessagePanel/MessageHoverActions.tsx:136
src/features/health/components/HealthPanel.tsx:139
src/features/health/components/HealthPanel.tsx:249
src/features/health/components/HealthPanel.tsx:271
src/features/kanban-board/components/InlineCreate.tsx:150
src/features/notifications/components/DirectNotificationRow.tsx:532
src/features/notifications/components/DirectNotificationRow.tsx:555
src/spaces/components/steps/StepFeatures.tsx:54
src/spaces/components/steps/StepPermissions.tsx:47
src/components/catalyst-detail-views/defect/CatalystDefectFields.tsx:198
src/components/ErrorBoundary.tsx:90
src/features/kanban-board/components/Board.tsx:90
src/features/kanban-board/components/Board.tsx:98
src/features/kanban-board/components/Board.tsx:426
src/components/catalyst-detail-views/shared/sections/CatalystAcceptanceCriteria.tsx:31
src/components/catalyst-detail-views/shared/sections/Description/_components/MentionSuggestionPill/MentionSuggestionPill.tsx:282
src/components/catalyst-detail-views/shared/sections/CatalystQuickActions.tsx:55
src/components/catalyst-detail-views/shared/sections/Description/_components/TableInteractions/MenuShared.tsx:193
src/components/catalyst-detail-views/shared/sections/Description/_components/SelectionTranslate/SelectionTranslate.tsx:364
src/components/catalyst-detail-views/shared/sections/Description/_components/SlashMenu/ViewMoreModal.tsx:311
src/components/catalyst-detail-views/shared/sections/Description/_components/SlashMenu/SlashMenu.tsx:319
src/components/catalyst-detail-views/idea/CatalystViewIdea.tsx:531
src/components/catalyst-detail-views/improve/ImproveIssueDropdown.tsx:467
src/components/ads/EmptyState.tsx:112
src/components/filters/FilterTemplateGallery.tsx:148
src/components/filters/FilterTemplateGallery.tsx:158
src/components/filters/CanonicalFilter.tsx:2852
src/components/filters/CanonicalFilter.tsx:2896
src/components/filters/CanonicalFilter.tsx:3494
src/components/product-dashboard/BrPostMortemModal.tsx:91
src/components/product-dashboard/BrPostMortemModal.tsx:164
src/components/product-dashboard/BrPostMortemModal.tsx:182
src/components/product-dashboard/BrPostMortemModal.tsx:205
src/components/product-dashboard/widgets/ActiveInitiativesWidget.tsx:204
src/components/product-dashboard/widgets/ActiveInitiativesWidget.tsx:215
src/components/product-dashboard/widgets/ActiveInitiativesWidget.tsx:307
src/components/product-dashboard/widgets/StageDrillDownDrawer.tsx:111
src/components/product-dashboard/widgets/StageDrillDownDrawer.tsx:152
src/components/product-dashboard/widgets/StageDrillDownDrawer.tsx:238
src/components/product-dashboard/widgets/WidgetSettingsPanel.tsx:54
src/components/filters/JQLEditor.tsx:304
src/components/filters/JQLEditor.tsx:393
src/components/workhub/releases/ReleaseDetail.tsx:291
src/components/workhub/releases/ReleaseDetail.tsx:295
src/components/knowledge-assist/KAItemDetailPanel.tsx:261
src/components/knowledge-assist/KAItemDetailPanel.tsx:330
src/components/product-dashboard/WidgetShell.tsx:36
src/components/knowledge-assist/KnowledgeAssistPanel.tsx:232
src/components/knowledge-assist/KnowledgeAssistPanel.tsx:300
src/components/product-dashboard/widgets/AtAGlanceWidget.tsx:135
src/components/workhub/issue-view/IssueActionDialogs.tsx:251
src/components/workhub/capacity/CapacityPage.tsx:74
src/components/workhub/allwork/AllWorkSplitView.tsx:286
src/components/workhub/allwork/AllWorkSplitView.tsx:568
src/components/workhub/themes/ThemeCard.tsx:82
src/components/workhub/issue-view/IssueViewShell.tsx:233
src/components/workhub/dashboard/DashboardKPIRow.tsx:156
src/components/releases/ReleaseFilters.tsx:47
src/components/releases/ReleasesTable.tsx:80
src/components/global-search/FilterDropdown.tsx:48
src/components/hierarchy/DetailPanel.tsx:261
src/components/chat/UserStatusDisplay.tsx:60
src/components/chat/ChatMainView.tsx:348
src/components/chat/ChatMainView.tsx:668
src/components/chat/ChatMainView.tsx:671
src/components/chat/main/ConversationList.tsx:408
src/components/goals/GoalsStatsStrip.tsx:79
src/components/chat/caty-mood/CatyWhyCard.tsx:247
src/components/chat/main/SlashCommandPalette.tsx:267
src/components/chat/main/SlashCommandPalette.tsx:275
src/components/catalyst-ds/comments/Comment.tsx:277
src/components/catalyst-ds/status/Lozenge.tsx:6
src/components/producthub/shared/CreateRequestDrawer.tsx:306
src/components/producthub/shared/SourceBadge.tsx:74
src/components/auth/HeroPanel.tsx:34
src/components/producthub/timeline/TimelineDateCursor.tsx:36
src/components/goals/GoalDetailDrawer.tsx:441
src/components/goals/GoalDetailDrawer.tsx:674
src/components/goals/GoalsHeatmapView.tsx:156
src/components/catalyst-ds/comments/CommentToolbar.tsx:147
src/components/catalyst-ds/comments/CommentToolbar.tsx:296
src/components/producthub/timeline/TimelineTodayLine.tsx:35
src/components/catalyst-ds/activity/JiraActivityRow.tsx:199
src/components/product-hub/roadmap/RoadmapRequestList.tsx:236
src/components/product-hub/roadmap/RoadmapKPIStrip.tsx:43
src/components/planner/task-modal/molecules/NoteComposer.tsx:51
src/components/planner/task-modal/molecules/ActivityItem.tsx:61
src/components/producthub/timeline/TimelineBarTooltip.tsx:67
src/components/planner/task-modal/organisms/ModalHeader.tsx:206
src/components/planner/task-modal/organisms/ModalHeader.tsx:245
src/components/planner/task-modal/molecules/CommentComposer.tsx:60
src/components/auth/login/LoginFormPanel.tsx:204
src/components/layout/PageChrome.tsx:80
src/components/layout/ProjectPageHeader.tsx:222
src/components/layout/ProjectPageHeader.tsx:240
src/components/layout/HubPageHeader.tsx:87
src/components/layout/SidebarBase.tsx:458
src/components/layout/SidebarBase.tsx:487
src/components/layout/SidebarBase.tsx:505
src/components/layout/SidebarBase.tsx:546
src/components/layout/SidebarBase.tsx:663
src/components/layout/UnifiedSidebar.tsx:302
src/components/for-you/ForYouInlineFilters.tsx:154
src/components/for-you/ForYouInlineFilters.tsx:176
src/components/for-you/atlaskit/SummarizeDigestModal.tsx:235
src/components/layout/ContextSwitcher.tsx:245
src/components/for-you/atlaskit/RecommendedPanel.tsx:3273
src/components/for-you/atlaskit/CatyButton.tsx:115
src/components/layout/HuddleWindow.tsx:333
src/components/admin/rbac/PermissionsMatrix.tsx:94
src/components/knowledge-hub/editor/ConfluenceEditor.tsx:63
src/components/admin/ai-assistant/AiCommandComposer.tsx:96
src/components/admin/ai-assistant/AiCommandComposer.tsx:157
src/components/layout/AskCatalystPill.tsx:186
src/components/admin/StatusRegistryTable.tsx:86
src/components/wiki/WikiChatPanel.tsx:107
src/components/wiki/WikiOnboardingWizard.tsx:70
src/components/wiki/WikiOnboardingWizard.tsx:132
src/components/shared/CommandCenterHeader.tsx:78
src/components/for-you/atlaskit/StarredEmptyState.tsx:106
src/components/shared/JiraTable/JiraTable.tsx:2535
src/components/shared/jira-description-editor/Toolbar.tsx:91
src/components/shared/jira-description-editor/Toolbar.tsx:469
src/components/shared/CanonicalDescriptionField/DescriptionViewMode.tsx:42
src/components/admin/ai-assistant/AiActivityFeed.tsx:77
src/components/admin/ai-assistant/AiActivityFeed.tsx:96
src/components/admin/ai-assistant/AiActivityFeed.tsx:131
src/components/wiki/WikiQuickRefDrawer.tsx:52
src/components/wiki/WikiQuickRefDrawer.tsx:66
src/components/shared/Timeline/SidebarRow.tsx:973
src/components/shared/Timeline/SidebarRow.tsx:1014
src/components/shared/Timeline/SidebarRow.tsx:1038
src/components/shared/AutoSyncCard.tsx:336
src/components/shared/Timeline/primitives.tsx:401
src/components/shared/BacklogTable/BacklogTable.tsx:3533
src/components/shared/Timeline/ProductEditDatesModal.tsx:203
src/components/shared/Timeline/ProductEditDatesModal.tsx:303
src/components/shared/Timeline/utils.ts:211
src/components/shared/CatalystAvatar.tsx:136
src/components/shared/JiraTable/editors.tsx:863
src/components/shared/title-translate/BizArabicTranslateLink.tsx:127
src/components/shared/CanonicalDescriptionField/DescriptionEditMode.tsx:51
src/components/shared/rich-text/atlaskit/adfLightRenderer.tsx:308
src/components/shared/Timeline/ProductTimelineRowMenu.tsx:95
src/components/shared/Timeline/TimelineView.tsx:1924
src/components/shared/Timeline/TimelineView.tsx:1960
src/components/shared/Timeline/TimelineView.tsx:1995
src/components/shared/Timeline/TimelineView.tsx:3264
src/components/resource360/ChronologyView.tsx:238
src/components/resource360/Resource360Banner.tsx:110
src/components/resource360/Resource360Banner.tsx:112
src/components/resource360/Resource360Banner.tsx:157
src/components/releasehub/ReleasePredictorCard.tsx:55
src/components/releasehub/ReleasePredictorCard.tsx:178
src/components/resource360/Resource360Board.tsx:100
src/components/resource360/R360BoardView.tsx:131
src/components/resource360/ClaimDrillInPanel.tsx:252
src/components/resource360/R360RingView.tsx:261
src/components/resource360/R360RingView.tsx:268
src/components/resource360/R360RingView.tsx:389
src/components/releasehub/CatyRiskPanel.tsx:218
src/components/releasehub/CatyRiskPanel.tsx:233
src/components/resource360/RingViewV16.tsx:253
src/components/resource360/RingViewV16.tsx:265
src/components/resource360/RingViewV16.tsx:698
src/components/resource360/RingViewV16.tsx:844
src/components/releasehub/ReleasePeekPanel.tsx:56
src/components/releasehub/ReleasePeekPanel.tsx:74
src/components/releasehub/detail/ReleaseDetailTabs.tsx:506
src/components/icons/CatalystIconWrapper.tsx:125
src/components/boards/KanbanCard.tsx:88
src/components/boards/KanbanCard.tsx:110
src/components/resource360/R360DetailPanel.tsx:162
src/components/resource360/R360DetailPanel.tsx:178
src/components/resource360/R360DetailPanel.tsx:289
src/components/boards/AttentionItemCard.tsx:79
src/components/boards/AttentionItemCard.tsx:130
src/components/boards/AttentionItemCard.tsx:173
src/components/resource360/DepartmentIntelligenceOverlay.tsx:156
src/components/boards/BoardSettingsDrawer.tsx:246
src/components/boards/BoardSettingsDrawer.tsx:323
src/components/boards/BoardSettingsDrawer.tsx:476
src/components/kanban/overflow-menu/LabelEditorPanel.tsx:197
src/components/caty/AskCatyInlineBar.tsx:292
src/components/caty/AskCatyInlineBar.tsx:367
src/components/resource360/R360ChronologyView.tsx:184
src/components/reqAssist/RABackgroundModal.tsx:162
src/components/boards/BoardCard.tsx:257
src/components/reqAssist/RAEpicGenerationModal.tsx:324
src/components/reqAssist/RAEpicGenerationModal.tsx:331
src/components/reqAssist/RAPDFViewer.tsx:86
src/components/reqAssist/RAPDFViewer.tsx:95
src/components/ideas-roadmap/PresentationModal.tsx:123
src/components/ideas-roadmap/PresentationModal.tsx:126
src/components/business-requests/CreateBusinessRequestModal.tsx:519
src/components/reqAssist/RAJiraSidePanel.tsx:328
src/components/reqAssist/RAJiraSidePanel.tsx:496
src/components/reqAssist/RAJiraSidePanel.tsx:638
src/components/r360/R360SummarizeDrawer.tsx:316
src/components/r360/R360WeeklyStoryTab.tsx:93
src/components/ideas-roadmap/RoadmapCard.tsx:137
src/components/notifications/AgeingTab.tsx:701
src/components/notifications/AgeingTab.tsx:716
src/components/requirement-assist/EpicView.tsx:216
src/components/requirement-assist/TranslationView.tsx:90
src/components/requirement-assist/TranslationView.tsx:103
src/components/ideas-roadmap/RoadmapKanban.tsx:120
src/components/ideas-roadmap/RoadmapSidePanel.tsx:283
src/components/notifications/NotificationPanel.tsx:422
src/components/strategy/shared/KrListItem.tsx:54
src/components/strategy/shared/KrListItem.tsx:63
src/components/strategy/themes/ThemeBoardView.tsx:69
src/components/strategy/widgets/StrategyPyramid.tsx:133
src/components/strategy/room/AIExecutiveBrief.tsx:276
src/components/strategy/room/AIExecutiveBrief.tsx:291
src/components/strategy/room/AIExecutiveBrief.tsx:295
src/components/strategy/room/AIExecutiveBrief.tsx:305
src/components/strategy/room/AIExecutiveBrief.tsx:379
src/components/strategy/room/AIExecutiveBrief.tsx:383
src/components/strategy/room/AIExecutiveBrief.tsx:444
src/components/strategy/room/AIExecutiveBrief.tsx:452
src/components/project-hub/settings/TypesTab.tsx:199
src/components/strategy/themes/ThemeDetailDrawer.tsx:187
src/components/project-hub/settings/MembersTab.tsx:189
src/components/project-hub/settings/ArchiveConfirmModal.tsx:51
src/components/project-hub/dashboard/widgets/ItemsByStatusWidget.tsx:259
src/components/project-hub/dashboard/widgets/ItemsByStatusWidget.tsx:301
src/components/strategy/intelligence/AIStrategyIntelligencePanel.tsx:256
src/components/strategy/intelligence/AIStrategyIntelligencePanel.tsx:391
src/components/strategy/intelligence/AIStrategyIntelligencePanel.tsx:400
src/components/project-hub/dashboard/widgets/ReleaseConfidenceWidget.tsx:132
src/components/project-hub/dashboard/widgets/ReleaseConfidenceWidget.tsx:219
src/components/strategy/themes/ThemeStatsStrip.tsx:105
src/components/reqAssist/RAEpicDraftDrawer.tsx:268
src/components/reqAssist/RAEpicDraftDrawer.tsx:297
src/components/project-hub/sdlc/PHBoardView.tsx:294
src/components/strategy/widgets/ActivityFeed.tsx:75
src/components/r360/R360DrawerShared.tsx:225
src/components/project-hub/work-items/CreateWorkItemModal.tsx:330
src/components/project-hub/dashboard/widgets/OnHoldWidget.tsx:300
src/components/testhub/reports/ReportInsightCard.tsx:91
src/components/project-hub/dashboard/GadgetSettingsPanel.tsx:538
src/components/project-hub/dashboard/GadgetSettingsPanel.tsx:1438
src/components/project-hub/dashboard/widgets/ScopeChangeWidget.tsx:252
src/components/strategy/widgets/OkrHeatmap.tsx:191
src/components/project-hub/sdlc/PHDetailDrawer.tsx:86
src/components/project-hub/sdlc/PHDetailDrawer.tsx:102
src/components/project-hub/dashboard/widgets/BrPulseMapWidget.tsx:167
src/components/project-hub/dashboard/widgets/TeamWorkloadWidget.tsx:372
src/components/project-hub/dashboard/widgets/OverdueWidget.tsx:304
src/components/project-hub/dashboard/widgets/ReleaseHealthWidget.tsx:284
src/stories/fixtures/DuplicateCard.tsx:254
src/modules/workhub/admin/components/SchedulingRules.tsx:117
src/modules/workhub/admin/components/SchedulingRules.tsx:169
src/modules/workhub/admin/components/ReadOnlyBanner.tsx:11
src/modules/workhub/admin/components/DataScope.tsx:221
src/modules/workhub/admin/components/StatusMapping.tsx:165
src/lib/catalystFlag.tsx:158
src/modules/tasks/components/workstreams/WorkstreamDrawer.tsx:539
src/modules/tasks/components/workstreams/WorkstreamDrawer.tsx:616
src/modules/tasks/components/workstreams/WorkstreamDrawer.tsx:628
src/modules/tasks/components/workstreams/WorkstreamDrawer.tsx:632
src/modules/tasks/components/workstreams/WorkstreamDrawer.tsx:670
src/modules/tasks/components/workstreams/WorkstreamDrawer.tsx:690
src/modules/tasks/components/workstreams/WorkstreamSummaryCard.tsx:34
src/modules/workhub/admin/components/SyncConfigPanel.tsx:739
src/modules/workhub/admin/components/SyncConfigPanel.tsx:747
src/modules/tasks/widgets/BlockedTasksWidget.tsx:164
src/modules/project-work-hub/components/dialogs/story-detail-modules/RichTextCommentEditor.tsx:278
src/modules/tasks/widgets/OverdueTasksWidget.tsx:189
src/modules/tasks/views/TasksTaskListView.tsx:998
src/modules/tasks/views/TasksTaskListView.tsx:1003
src/modules/tasks/views/TasksTaskListView.tsx:1009
src/modules/tasks/views/TasksTaskListView.tsx:1014
src/modules/project-work-hub/components/ProjectChromeBand.tsx:320
src/modules/tasks/widgets/TasksByStatusWidget.tsx:154
src/modules/project-work-hub/components/dialogs/MoveIssueDialog.tsx:139
src/modules/project-work-hub/components/dialogs/story-detail-modules/ConfirmDialog.tsx:34
src/lib/catalyst-rules/CatalystRules.ts:676
src/lib/catalyst-rules/CatalystRules.ts:699
src/modules/work-hub/views/AllWorkView.tsx:108
src/modules/work-hub/views/AllWorkView.tsx:126
src/modules/work-hub/views/AllWorkView.tsx:148
src/modules/work-hub/views/AllWorkView.tsx:658
src/modules/work-hub/views/AllWorkView.tsx:661
src/modules/work-hub/views/AllWorkView.tsx:664
src/modules/work-hub/views/AllWorkView.tsx:667
src/modules/work-hub/views/AllWorkView.tsx:673
src/modules/task10/components/week/T10WeekViewV3.tsx:649
src/modules/task10/components/week/T10WeekViewV3.tsx:663
src/modules/workhub/admin/components/UserMapping.tsx:286
src/modules/task10/components/panel/T10EnterpriseSidePanel.tsx:435
src/modules/task10/components/panel/T10EnterpriseSidePanel.tsx:956
src/modules/product-roadmap/components/RoadmapDetailPanel.tsx:152
src/modules/product-roadmap/components/RoadmapDetailPanel.tsx:302
src/pages/ResourceListingPage.tsx:452
src/pages/ReqAssistGenerate.tsx:265
src/pages/ReqAssistGenerate.tsx:282
src/pages/ReqAssistGenerate.tsx:294
src/pages/ReqAssistGenerate.tsx:305
src/pages/ReqAssistGenerate.tsx:369
src/pages/ReqAssistGenerate.tsx:373
src/pages/ReqAssistGenerate.tsx:481
src/pages/ReqAssistGenerate.tsx:529
src/pages/ReqAssistGenerate.tsx:557
src/modules/project-work-hub/components/dialogs/ArchiveConfirmDialog.tsx:138
src/pages/CleanupPage.tsx:580
src/pages/CleanupPage.tsx:1439
src/modules/project-work-hub/components/dialogs/story-detail-modules/LinkedIssuesSection.tsx:244
src/pages/ReqAssistLibrary.tsx:643
src/pages/r360-member/QuickSearchInput.tsx:40
src/modules/project-work-hub/pages/BacklogPage.atlaskit.tsx:7586
src/modules/project-work-hub/pages/BacklogPage.atlaskit.tsx:7591
src/modules/project-work-hub/pages/BacklogPage.atlaskit.tsx:7597
src/modules/project-work-hub/pages/BacklogPage.atlaskit.tsx:7602
src/pages/DeactivatedPage.tsx:38
src/pages/DeactivatedPage.tsx:46
src/pages/R360MemberDetail.tsx:432
src/pages/r360-member/RingView.tsx:258
src/pages/r360-member/RingView.tsx:353
src/pages/r360-member/RingView.tsx:470
src/pages/r360-member/RingView.tsx:513
src/pages/r360-member/RingView.tsx:527
src/pages/admin/FieldLayoutPage.tsx:79
src/pages/admin/FieldLayoutPage.tsx:104
src/pages/admin/FieldLayoutPage.tsx:418
src/pages/admin/FieldLayoutPage.tsx:448
src/modules/work-hub/views/ReleasesView.tsx:46
src/modules/work-hub/views/ReleasesView.tsx:58
src/modules/work-hub/views/ReleasesView.tsx:108
src/modules/work-hub/views/ReleasesView.tsx:186
src/modules/work-hub/views/ReleasesView.tsx:272
src/pages/admin/workflows/WorkflowAdminPage.tsx:340
src/pages/admin/workflows/WorkflowAdminPage.tsx:386
src/pages/admin/workflows/WorkflowAdminPage.tsx:603
src/pages/admin/workflows/WorkflowAdminPage.tsx:621
src/pages/admin/workflows/WorkflowAdminPage.tsx:656
src/pages/producthub/IdeasRoadmapPage.tsx:141
src/pages/admin/AdminAccessPage.tsx:548
src/pages/admin/AdminAccessPage.tsx:605
src/pages/admin/AdminAccessPage.tsx:1416
src/pages/admin/FieldRegistryPage.tsx:120
src/pages/admin/RoutingTaxonomyPage.tsx:161
src/pages/admin/components/ComponentsAdminPage.tsx:1073
src/pages/admin/AdminOverview.tsx:289
src/pages/admin/connections/VercelConnectionPage.tsx:503
src/pages/admin/connections/VercelConnectionPage.tsx:2147
src/pages/admin/AdminStorybookPage.tsx:26
src/pages/admin/AdminStorybookPage.tsx:498
src/pages/admin/test/TestCaseStatusesPage.tsx:112
src/modules/priorities/components/PriLabelBadge.tsx:25
src/pages/admin/connections/JiraSyncPage.tsx:641
src/pages/releases/AllReleasesPage.tsx:868
src/pages/releases/AllReleasesPage.tsx:912
src/pages/admin/connections/NotionConnectionPage.tsx:269
src/pages/admin/connections/NotionConnectionPage.tsx:1057
src/pages/product/ideas/IdeasRoadmapPage.tsx:254
src/pages/producthub/IdeasThemePage.tsx:115
src/pages/releasehub/ReleaseCalendarPage.tsx:273
src/pages/releasehub/ReleaseSettingsPage.tsx:93
src/pages/admin/ReleaseOpsAdminPage.tsx:243
src/pages/admin/ReleaseOpsAdminPage.tsx:340
src/pages/dev/EvidenceToExecutionSimple.tsx:94
src/pages/dev/EvidenceToExecutionSimple.tsx:202
src/pages/dev/EvidenceToExecutionFull.tsx:307
src/pages/dev/EvidenceToExecutionFull.tsx:358
src/pages/dev/EvidenceToExecutionFull.tsx:595
src/pages/dev/EvidenceToExecutionFull.tsx:830
src/pages/admin/workflows/CatalystWorkflowBuilder.tsx:194
src/pages/admin/workflows/CatalystWorkflowBuilder.tsx:305
src/pages/incidenthub/IncidentInsightsPage.tsx:41
src/pages/testhub/reports/lab/ReportEmptyState.tsx:40
src/pages/testhub/cycles/ExecutionPage.tsx:866
src/pages/testhub/traceability/TraceabilityPage.tsx:258
src/pages/testhub/cycles/CyclesPage.tsx:409
src/pages/admin/test-ops/TestOpsPage.tsx:36
src/pages/testhub/reports/ReportsHubPage.tsx:152
src/pages/testhub/reports/ReportsHubPage.tsx:162
src/pages/testhub/reports/lab/ReportNavigator.tsx:104
src/pages/project-hub/FilterDashboardPage.tsx:98
src/pages/releasehub/CommandCenterPage.tsx:204
src/pages/testhub/cycles/CycleDetailPage.tsx:493
src/pages/testhub/cycles/CycleDetailPage.tsx:857
src/pages/testhub/reports/lab/ReportFormulaDrawer.tsx:48
src/pages/project-hub/ProjectBoardPage.tsx:144
```

## Appendix D — E3 CatalystPageHeader occurrences in src/pages (75 hits / 38 files)

```
src/pages/Features.tsx:120
src/pages/Features.tsx:2
src/pages/KBAdminSetup.tsx:3
src/pages/KBAdminSetup.tsx:71
src/pages/KanbanBoardView.tsx:245
src/pages/KanbanBoardView.tsx:25
src/pages/KnowledgeHubSpacePage.tsx:138
src/pages/KnowledgeHubSpacePage.tsx:2
src/pages/PIObjectives.tsx:148
src/pages/PIObjectives.tsx:2
src/pages/PortfolioRoadmap.tsx:2
src/pages/PortfolioRoadmap.tsx:262
src/pages/ResourceListingPage.tsx:17
src/pages/ResourceListingPage.tsx:259
src/pages/SearchPage.tsx:2
src/pages/SearchPage.tsx:309
src/pages/enterprise/BudgetGovernancePage.tsx:7
src/pages/enterprise/BudgetGovernancePage.tsx:89
src/pages/enterprise/BudgetPlannerPage.tsx:19
src/pages/enterprise/BudgetPlannerPage.tsx:244
src/pages/enterprise/EnterpriseEpics.tsx:109
src/pages/enterprise/EnterpriseEpics.tsx:2
src/pages/items/EpicEstimationPage.tsx:212
src/pages/items/EpicEstimationPage.tsx:3
src/pages/items/EpicsCanceledPage.tsx:2
src/pages/items/EpicsCanceledPage.tsx:69
src/pages/items/EpicsPage.tsx:511
src/pages/items/EpicsPage.tsx:7
src/pages/items/EpicsRecycleBinPage.tsx:2
src/pages/items/EpicsRecycleBinPage.tsx:98
src/pages/producthub/IdeationPage.tsx:12
src/pages/producthub/IdeationPage.tsx:141
src/pages/producthub/requirement-assist/compose.tsx:142
src/pages/producthub/requirement-assist/compose.tsx:2
src/pages/producthub/requirement-assist/index.tsx:12
src/pages/producthub/requirement-assist/index.tsx:4
src/pages/producthub/requirement-assist/output.tsx:2
src/pages/producthub/requirement-assist/output.tsx:46
src/pages/project-hub/FilterDashboardPage.tsx:23
src/pages/project-hub/FilterDashboardPage.tsx:278
src/pages/project-hub/HierarchyAllWorkPage.tsx:49
src/pages/project-hub/HierarchyAllWorkPage.tsx:9
src/pages/project-hub/HierarchyPage.tsx:388
src/pages/project-hub/HierarchyPage.tsx:8
src/pages/project-hub/IssueDetailPage.tsx:156
src/pages/project-hub/PhasePlaceholderPage.tsx:18
src/pages/project-hub/PhasePlaceholderPage.tsx:2
src/pages/project-hub/ProjectListPage.tsx:223
src/pages/project-hub/ProjectListPage.tsx:3
src/pages/project-hub/ProjectSettingsPage.tsx:2
src/pages/project-hub/ProjectSettingsPage.tsx:74
src/pages/project-hub/StoryDetailPage.tsx:164
src/pages/project-hub/StoryDetailPage.tsx:24
src/pages/project-hub/WorkItemsListPage.tsx:2
src/pages/project-hub/WorkItemsListPage.tsx:280
src/pages/release/CreateIncidentPage.tsx:2
src/pages/release/CreateIncidentPage.tsx:310
src/pages/release/IncidentDashboardPage.tsx:2
src/pages/release/IncidentDashboardPage.tsx:237
src/pages/release/IncidentViewPage.tsx:2
src/pages/release/IncidentViewPage.tsx:202
src/pages/release/IncidentsDashboard.tsx:2
src/pages/release/IncidentsDashboard.tsx:60
src/pages/release/IncidentsList.tsx:175
src/pages/release/IncidentsList.tsx:2
src/pages/release/IncidentsListPage.tsx:2
src/pages/release/IncidentsListPage.tsx:243
src/pages/releases/AllReleasesPage.tsx:544
src/pages/releases/AllReleasesPage.tsx:7
src/pages/releases/CommandCenterPage.tsx:19
src/pages/releases/CommandCenterPage.tsx:631
src/pages/releases/CoverageReportsPage.tsx:10
src/pages/releases/CoverageReportsPage.tsx:689
src/pages/releases/QualityGatesPage.tsx:659
src/pages/releases/QualityGatesPage.tsx:7
```

## Lane Summary

| Severity | Issues |
|---|---|
| Critical | 0 |
| High | 7 (0001, 0002, 0004, 0009, 0010, 0011, 0014) |
| Medium | 9 (0005, 0007, 0008, 0012, 0013, 0015, 0017, 0018, 0020) |
| Low | 4 (0003, 0006, 0016, 0019) |
| **Total issues** | **20** |

| Grid | Occurrences |
|---|---|
| F1 route params | 48 (42 hard + 6 sanctioned :filterId naming drift) |
| F3 raw URL concat | 115 (110 navigate incl. 1 dormant + 5 Link) |
| H2 line-height | 440 (3 in-scope violations + 437 repo-wide debt; 1 documented exception excluded) |
| E3 CatalystPageHeader | 75 hits / 38 files |
| E5 breadcrumbs | 8 (1 live nav + 3 direct @atlaskit/breadcrumbs + 4 dead/dormant) |
| G1/G4 avatar imports | 4 (1 avatar + 3 avatar-group) |
| G2 CDN URLs | 4 (test fixtures only, no product violation) |
| **Total occurrences** | **694** |

`npm run lint:cre` → PASS (gate does not cover audited grids — CAT-AUDIT-0020).
