# A2 — Canonical Screen Discovery
**Feature:** CAT-SPRINTS-NATIVE-20260702-002 · **Agent:** Canonical Screen Discovery · **Date:** 2026-07-02
**Ground truth read:** 13_COUNCIL_VERDICT.md · .claude/skills/cre/SKILL.md §"HUB NAVIGATION PATTERN — CANONICAL L1/L2"

---

## 1. L1 — `/project-hub/:key/sprints` (SprintsPage)

**File:** `src/pages/project-hub/SprintsPage.tsx` (route: `src/routes/FullAppRoutes.tsx:1062`)

**CRE L1 verdict: LAYOUT COMPLIANT, CONTENT NON-COMPLIANT.**

Compliant today:
- Uses `CatalystListPageLayout` (line 310) — correct L1 layout.
- `chromeBand={<ProjectPageHeader hubType="project" projectKey={projectKey} />}` (line 312) — **no `trail`, no `title`** → `deriveRouteWord()` auto-fills the "Sprints" crumb. Exactly per CRE.
- Count banner via `footer` prop.

Deviations (exact):
| # | Deviation | Evidence | CRE/council rule broken |
|---|---|---|---|
| D1 | Table body is **`ReleasesTable`** (`src/components/releases/ReleasesTable.tsx`) — a hand-rolled `<table>`/`<col>`/`<th>` (lines ~460–481), not `JiraTable` | SprintsPage line 326 | JiraTable rule; council flag "sprint list currently renders through ReleasesTable (hand-rolled `<table>`)" |
| D2 | Release status vocabulary: `toCellStatus()` maps everything to `released\|unreleased\|archived` (lines 47–51); StatusFilter offers Released/Unreleased/Archived | lines 250–257, 296 | Council decision #2 (sprint statuses planning\|active\|awaiting_approval\|completed\|canceled\|archived) |
| D3 | **Project dropdown** (`ProductFilter` relabelled "Project", lines 297–303) | Council list spec #10: "REMOVED: … Project dropdown" |
| D4 | **Density + hide/eye view-options menu** (`ToolbarMenuButton`, lines 259–287) | List spec #10: "REMOVED: … density/hide menu" |
| D5 | Group-by = none/status/product/release_date/start_date (`GroupFilter`) — no **Month** grouping | lines 159–178 | List spec #10: group-by Month + Status only |
| D6 | Columns come from ReleasesTable: Release-name, Status, Progress, Start date, **Release date**, Description, ⋯ (`hideSprintsColumn` hides the "Sprint / Iteration" col) | ReleasesTable lines 316–322, 467–481 | List spec #10 columns (Sprint+length lozenge · Status pill · Progress · Start · **Sprint end** · Release chip · Owner avatar · ⋯) |
| D7 | Sort/newest by `release_date` (lines 142–146); no red overdue end-dates, no contextual "Start/Complete sprint" quick action | Jira DOM probe adjustments (verdict §Plan adjustments) |
| D8 | Kebab actions are release lifecycle: Release/Archive/Merge/Edit/Delete via `ReleaseConfirmationModal`/`ReleaseArchiveDialog`/`ReleaseMergeDialog`/`ReleaseDeleteDialog` all passed `SPRINT_CONFIG` (lines 364–406) | Sprint lifecycle ≠ release lifecycle (council #2) |
| D9 | Create modal = `SprintCreateModal` (exists at `src/components/sprints/SprintCreateModal.tsx`) — pre-dates auto\|custom naming, 1W/2W length, DoD, release-link spec | Council decisions #1, #3, #5 |
| D10 | Loading/error states are bare `<div style={{padding:24}}>` strings (lines 291–292), not ADS empty-state/spinner | Hand-rolled UI ban |

Data source: `useEntities(SPRINT_CONFIG)` + `useEntityProgress(SPRINT_CONFIG)` → table `ph_jira_sprints`, progress view `vw_sprint_jira_progress`, `matchIssueByField: 'sprint_name'` (`src/lib/entity-hub/config.ts:128–160`).

---

## 2. L2 — `/project-hub/:key/sprints/:sprintSlug` (SprintDetailPage → ReleaseDetailPage)

**Files:** `src/pages/project-hub/SprintDetailPage.tsx` (thin wrapper, resolves slug via `useSprintBySlug`, passes `SPRINT_CONFIG` + `entityIdOverride` + `listHrefOverride`) → `src/pages/release-hub/ReleaseDetailPage.tsx` (route: FullAppRoutes.tsx:1063).

**CRE L2 verdict: HEADER COMPLIANT, SHELL NON-COMPLIANT.**

Compliant today (ReleaseDetailPage ~lines 309–345):
- `ProjectPageHeader` with `trail={[{ text: 'Sprints', href: listHrefOverride }]}` and `title={entity name (inline-editable)}` — trail+title exactly per CRE L2, no skip-level, ≤4 crumbs.
- `hubType='project'` + `projectKey` for sprint kind — correct root crumb.

Deviations:
| # | Deviation | Evidence |
|---|---|---|
| D11 | **No `AtlaskitPageShell flush`.** ReleaseDetailPage imports no shell/layout at all — it renders raw `<div style={{display:'flex'…}}>` scroll containers and mounts `ProjectPageHeader` *inside* the scrolling content with `paddingX={0}`, not in a `chromeBand` | grep of imports: only `ProjectPageHeader`; render tree lines ~306–318. CRE rule "L2 uses `AtlaskitPageShell flush`" |
| D12 | Entire surface is release-shaped: released/unreleased actions, "Release date" fields, `ReleaseSidePanel`, `WorkItemsSection` filtering `ph_issues.sprint_release` JSONB `.contains([{name}])` (WorkItemsSection lines 240–261), `AddWorkItemsModal`, summarize-release edge fn | Council: "sprints are a release wearing a costume" |
| D13 | `useSprintBySlug` (`src/hooks/useSprintBySlug.ts`) filters `.is('deleted_at', null)` — **column does not exist on staging `ph_jira_sprints`** (probe evidence). Broken today; S0.1 fix required. Also ignores `projectKey` narrowing (comment admits fallback to global slug match) |

`useSprintBySlug` consumers: only SprintDetailPage + SprintWorkNavigatorPage (safe to change).

---

## 3. `/project-hub/:key/sprints/:sprintSlug/work` (SprintWorkNavigatorPage)

**File:** `src/pages/project-hub/SprintWorkNavigatorPage.tsx` → `src/pages/release-hub/ReleaseWorkNavigatorPage.tsx` → mounts `BacklogPage.atlaskit` (`src/modules/project-work-hub/pages/BacklogPage.atlaskit.tsx`), which **does** use `AtlaskitPageShell` + `ProjectPageHeader` (lines 4153, 4198). Slug resolution via `useSprintBySlug` (same broken `deleted_at` filter). Work membership resolved through the release navigator's `sprint_release`/`RELEASE_CONFIG`-style matching. Verdict: shell-compliant by inheritance; data path release-shaped.

---

## 4. Regression blast radius — surfaces reading sprint data (MUST NOT REGRESS)

Legend: **N** = `ph_issues.sprint_name` (text; Jira sync overwrites), **R** = `ph_issues.sprint_release` (JSONB name-match), **FK** = `sprint_id`, **IT** = legacy `iterations`/`stories.sprint_id` tables, **OT** = other sprint tables.

| # | Surface | Path | Reads |
|---|---|---|---|
| 1 | CatalystSidebarDetails "Sprint/Iteration" field (ALL Catalyst detail views: story/defect/BR/incident/task/test-case/…) | `src/components/catalyst-detail-views/shared/sections/CatalystSidebarDetails.tsx` (lines 605–612, 680–695) via `EditableSprintReleases` in `src/modules/project-work-hub/components/dialogs/story-detail-modules/EditableFields.tsx` | **R** (read+write `issue.sprint_release`) |
| 2 | IssueContentView sprint dropdown (workhub issue view) | `src/components/workhub/issue-view/IssueContentView.tsx` (lines 278–330, 873–945) | **R** — updates `ph_issues.sprint_release`, writes changelog `field_name='sprint_release'` |
| 3 | BasicFilterBar "Sprint/Iteration" more-section | `src/components/filters/BasicFilterBar.tsx` (lines 552–560, `sprintReleases` prop) | **R** (option ids = names) |
| 4 | Kanban AdvancedFilterPanel sprint filter | `src/components/kanban/AdvancedFilterPanel.tsx` (lines 92–101) | **R** (distinct `sprint_release` pull) |
| 5 | Kanban board data | `src/features/kanban-board/data/useKanbanData.ts` (line 67 select; 105–126) | **N + R** (`sprint_name`, `sprint_release[0]`) |
| 6 | Board cards | `src/hooks/useBoardCards.ts` (lines 23, 74–78) | **R** |
| 7 | In-Jira scrum board | `src/modules/in-jira/hooks/useBoardData.ts` (lines 93, 104–113) | own `injira_sprints` table + `issue.sprint_id` — separate module, do not touch |
| 8 | ReleasesTable "Sprint / Iteration" column (release-hub + project-hub Releases lists) | `src/components/releases/ReleasesTable.tsx` (lines 295, 382–386, 481); fed by `sprint_names` from progress view in `src/pages/project-hub/ReleasesPage.tsx` (lines 141–168) | **N** (view aggregates `sprint_names`) |
| 9 | WorkItemRow sprint chip | `src/components/workhub/workitems/WorkItemRow.tsx` (lines 114–121) | **R** |
| 10 | Release/Sprint detail work-items list | `src/components/releases/detail/WorkItemsSection.tsx` (lines 240–261) | **R** (`.contains('sprint_release',[{name}])`) — council: repoint to FK in S0.2 |
| 11 | Sprint progress view consumers | `useEntityProgress(SPRINT_CONFIG)` → `vw_sprint_jira_progress` (config.ts:141) | **N** (view matches on sprint_name — council #1) |
| 12 | ActiveSprintsWidget (project dashboard) | `src/components/project-hub/dashboard/widgets/ActiveSprintsWidget.tsx` (lines 200–240) | **R** + `rh_releases` + `product_sprints` |
| 13 | Legacy `/sprints` page | `src/pages/Sprints.tsx` (route FullAppRoutes.tsx:888) | **IT** — `iterations` table (Tailwind-era UI) |
| 14 | Legacy `/sprint-board` page | `src/pages/SprintBoard.tsx` (route :889) | **IT** — `iterations` + `stories.sprint_id` |
| 15 | SprintSelector (work items) | `src/components/work-items/SprintSelector.tsx` (lines 44, 81–82) | **IT** — `iterations`, updates `stories.sprint_id` |
| 16 | AddWorkItemsModal / MoveToVersionModal / ReleaseSidePanel / ReleaseConfirmationModal / ReleaseMergeDialog | `src/components/releases/…` | **R** mutations (membership writes; must gain changelog instrumentation per council #9) |
| 17 | SprintLinker (orphaned chip UI, reuse target) | `src/components/releases/SprintLinker.tsx` | **N/R** — orphaned; council: retarget for release-link chip |
| 18 | Jira sync writer | `src/lib/jira-integration/useJiraSyncMutations.ts`, `src/modules/workhub/admin/hooks/useSyncEngine.ts` | **writes N** — the sync writer that reverted the 710-row backfill; S0.2 must neuter for native sprints |
| 19 | Caty/JQL/filters ecosystem (`applyCatyFilter`, `catyFilterToJql`, `jql/fieldMap`, `useJQLFilteredIssues`, FilterResultsPanel, FilterPreviewPage) | `src/lib/jql/*`, `src/components/caty/*`, `src/features/jql-filter/*` | **N/R** (field mappings for `sprint`) |
| 20 | TestHub sprint testing status report | `src/pages/testhub/reports/SprintTestingStatusPage.tsx` + `useSprintTestingStatus.ts` | **N** |
| 21 | UWV / backlog / health / replay / R360 readers (`useUWVData`, `backlogApi`, `useBacklogData`, `phIssueQueries`, health adapters, replay journey, r360Service, resource360Service, useForYouData, useProjectTimeline, csvExport) | various (full grep list retained in session log) | **N and/or R** read-only |

Full `sprint_name|sprint_release|sprint_id` grep = **~150 files**; the 21 clusters above are the behavioural surfaces. Any change to membership semantics (name-match → FK) regresses #1–#12 and #19–#21 unless reads are repointed in the same slice or dual-read shims kept.

---

## 5. Forbidden-list candidates (must NOT touch)

1. `src/modules/in-jira/**` — separate injira_sprints world.
2. Legacy `src/pages/Sprints.tsx`, `src/pages/SprintBoard.tsx`, `src/components/work-items/SprintSelector.tsx` + `iterations`/`stories` tables — out of scope (candidates for a separate deprecation feature).
3. `src/components/releases/ReleasesTable.tsx` and `src/pages/project-hub/ReleasesPage.tsx` / `src/pages/release-hub/*` **as release surfaces** — sprint work must fork/branch by config, never alter release behaviour (RELEASE_CONFIG and MILESTONE_CONFIG share ReleaseDetailPage/WorkItemsSection/dialogs — every shared-file edit must be `config.kind === 'sprint'`-gated).
4. `src/components/catalyst-detail-views/**`, `IssueContentView.tsx`, `WorkItemRow.tsx`, kanban/board hooks — read-only blast radius; no edits in v1 slices except adding FK dual-read where the Plan Lock says so.
5. Jira sync engine (`useSyncEngine.ts`, `useJiraSyncMutations.ts`) — only the surgical "skip sprint_name for native sprints" change in S0.2, nothing else.
6. Status-catalog files (defectWorkflow.ts, kanban columnConfig, workItem.types, project-hub.types, releasehub.design, ads/internal/status) — council split common-status injection to its own Feature ID.
7. `src/pages/testhub/**`, `src/features/health/**`, replay, R360, Caty/JQL mapping files.

---

## 6. Route builders — `src/lib/routes.ts`

Current (lines 35–39, under the project-hub group):
```ts
sprints:    (projectKey) => `/project-hub/${projectKey}/sprints`,
sprint:     (projectKey, sprintSlug) => `/project-hub/${projectKey}/sprints/${sprintSlug}`,
sprintWork: (projectKey, sprintSlug) => `/project-hub/${projectKey}/sprints/${sprintSlug}/work`,
```
Routes registered in `src/routes/FullAppRoutes.tsx:1062–1064`; all three use `:sprintSlug` — slug-contract compliant at the route level.

Gaps:
1. `SPRINT_CONFIG.buildDetailHref/buildWorkHref` (config.ts:145–148) **hand-concatenate URLs** instead of importing `Routes` — violates "never build URLs by string concatenation"; SprintsPage `handleOpenDetail` also falls back to raw `sprintId` (UUID) when slug is missing (line 218). Fix: route through `Routes.*` + guarantee slug (S0.1).
2. Slug exists on staging but in **no checked-in migration** (probe evidence) — codify; `useSprintBySlug` fix is the paired hook requirement of the slug contract.
3. No `UuidToSlugRedirect` mounted for legacy UUID sprint URLs — needed if any UUID links were ever shared (dual-mode hook currently covers it in-page; acceptable, note only).
4. Legacy top-level `/sprints` + `/sprint-board` routes (FullAppRoutes 888–889) collide semantically with the new module — flag for the Plan Lock's non-scope (redirect decision deferred).

---

## 7. Screen inventory summary

| Route | File(s) | CRE verdict |
|---|---|---|
| `/project-hub/:key/sprints` (L1) | SprintsPage.tsx | Layout ✔ (CatalystListPageLayout + headerless-crumb ProjectPageHeader) · Content ✘ (ReleasesTable hand-rolled, release vocabulary, D1–D10) |
| `/project-hub/:key/sprints/:slug` (L2) | SprintDetailPage → ReleaseDetailPage | Header ✔ (trail+title) · Shell ✘ (no AtlaskitPageShell flush, D11) · Data ✘ (sprint_release name-match, broken useSprintBySlug) |
| `/project-hub/:key/sprints/:slug/work` | SprintWorkNavigatorPage → ReleaseWorkNavigatorPage → BacklogPage.atlaskit | Shell ✔ (inherited) · Slug hook broken (D13) |
| `/sprints`, `/sprint-board` (legacy) | Sprints.tsx, SprintBoard.tsx | Non-CRE, Tailwind-era, `iterations` tables — forbidden/out of scope |
