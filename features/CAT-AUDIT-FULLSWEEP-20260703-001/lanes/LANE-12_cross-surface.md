# LANE-12 — Cross-Surface Consistency (hub-vs-hub inconsistency matrix)

Audit: CAT-AUDIT-FULLSWEEP-20260703-001 · Lane 12 · Captured 2026-07-03 · READ-ONLY sweep
Method: grep-driven import census per hub directory + targeted file sampling. Hubs compared: Project Hub (`src/pages/project-hub`, `src/modules/project-work-hub`), Product Hub (`src/pages/producthub`), Incident Hub (`src/pages/incidenthub`), TestHub (`src/pages/testhub`), Release Hub (`src/pages/release-hub`, `src/pages/releasehub`), Admin (`src/pages/admin`), Enterprise/OKR/Risks (`src/pages/enterprise`, `src/pages/risks`), For You (`src/components/for-you`).
Reference standards: CRE Grid E (ProjectPageHeader L1/L2 breadcrumb+H2), `JiraTable` (`src/components/shared/JiraTable`), `CatalystListPageLayout` (`src/components/shared/CatalystListPage/CatalystListPageLayout.tsx`).

---

## Inconsistency matrix (import census, counts = import statements found)

### D1 — Header / breadcrumb pattern

**Recommended standard: `ProjectPageHeader`** (`src/components/layout/ProjectPageHeader.tsx`) — CRE Grid E component; renders `Breadcrumbs` from `@/components/ads` + H2, canonical entity icons (file lines 2–43).

| Hub | ProjectPageHeader | CatalystPageHeader | ads PageHeader | No canonical header |
|---|---|---|---|---|
| project-hub | 13 | 8 | — | mixed (two systems in one hub) |
| project-work-hub | 1 | 2 | — | — |
| producthub | 0 | 5 | — | 6 pages (IdeasBacklog, IdeasBoard, IdeasRoadmap, IdeasTheme, IdeasAnalytics, Roadmap) |
| incidenthub | 4 | 0 | — | 10 pages (most delegate to canonical BacklogPage chrome) |
| testhub | 11 | 0 | — | detail/report surfaces |
| release-hub + releasehub | 13 | 0 | — | 7 pages (ReleaseCompare, TriageQueue, filters trio, canonical wrappers) |
| admin | 0 | 0 | 5 of 23 pages | 18 pages hand-rolled |
| enterprise | 0 | 3 | — | remainder |
| risks | 0 | 0 | — | all (RisksGridPage hand-rolled chrome) |
| for-you | 0 | 0 | — | hand-rolled `ForYouHeader` (documented Jira-parity exception) |

**Deviators: producthub, admin, enterprise, risks, project-hub (internal split).**

### D2 — Table implementation

**Recommended standard: `JiraTable`** (`src/components/shared/JiraTable`) — per CLAUDE.md JiraTable rule. Best adopter model: `src/pages/incidenthub/IncidentListPage.tsx` (delegates entirely to canonical `BacklogPage` + data adapter, header comment lines 1–17).

| Hub | JiraTable | @atlaskit/dynamic-table | Raw `<table>` | shadcn ui/table |
|---|---|---|---|---|
| project-hub | 2 (+toolbar/flags imports) | 0 | 2 files (AllWorkTable, BoardSettingsPage) | 0 |
| project-work-hub | 1 (+shared dynamic-table wrapper) | 1 | few (SubtasksPanelV2, ListTab) | 0 |
| producthub | 0 | 0 | IdeasBacklogPage:217, IdeationPage:358 | 0 |
| incidenthub | 0 (delegates to BacklogPage/JiraTable) | 0 | 0 | 0 |
| testhub | 4 | 1 | CycleDetailPage, SetDetailPage | 0 |
| releasehub | 4 | 0 | ReleaseCompare, AllReleases, TriageQueue | 0 |
| admin | 4 | 3 (test/* pages) | several | 0 |
| enterprise | 0 | 0 | DemandSummaryPage:546,589; EnterpriseObjectives:125 | 0 |
| risks | 0 | 0 | 0 | RisksGridPage (ui/table imports, lines 23–30) |
| for-you | 0 | 0 | ForYouTable.tsx:457 (`<table className="pb-table">`, 14 raw table/th/td tags) | 0 |

**Deviators: producthub, enterprise, risks, for-you (zero JiraTable adoption).**

### D3 — Empty state

**Recommended standard: `@atlaskit/empty-state`** (already used in project-work-hub ×2, testhub ×1, admin ×1, for-you ×1).

| Hub | @atlaskit/empty-state | Custom |
|---|---|---|
| project-hub | 0 | 0 explicit at page level |
| project-work-hub | 2 | local `EmptyState` in shared-components (3 imports) |
| producthub | 0 | inline emoji empty state (IdeasBacklogPage.tsx:210–214, `💡` div) |
| incidenthub | 0 | — |
| testhub | 1 | ReportEmptyState (reports/lab) |
| releasehub | 0 | custom `EmptyState`/`ErrorState` (`src/components/releasehub/EmptyState.tsx`) — 7 imports |
| admin | 1 | — |
| enterprise / risks | 0 | — |
| for-you | 1 | `ForYouEmptyState` (helpers) ×4 + `StarredEmptyState` ×2 |

**Deviators: releasehub (Tailwind custom), producthub (inline emoji), for-you (two bespoke variants).**

### D4 — Loading + error handling

**Recommended standard: `@atlaskit/spinner`** for loading (admin ×23, testhub ×11, project-work-hub ×10, for-you ×9, project-hub ×5, releasehub ×4) and `SectionMessage` for errors (admin ×11, project-hub ×5).

| Hub | Spinner | Skeleton variant | Text-only loading | SectionMessage errors |
|---|---|---|---|---|
| project-hub | 5 | SkeletonTable (SkeletonPulse) + TableSkeleton (hierarchy) | — | 5 |
| project-work-hub | 10 | SkeletonRows (shared-components) | — | — |
| producthub | **0** | **0** | "Loading ideas..." (IdeasBacklogPage:208), "Loading..." (IdeasRoadmapPage:77) | 0 |
| incidenthub | 1 | shadcn `@/components/ui/skeleton` ×2 | — | 0 |
| testhub | 11 | ReportSkeleton | — | 0 |
| releasehub | 4 | SkeletonRows (releasehub) | — | custom ErrorState |
| admin | 24 | — | — | 11 |
| enterprise | 0 | shadcn Skeleton ×1 + CapacityPlannerSkeleton | — | 0 |
| for-you | 9 | ForYouTableSkeleton | — | 0 |

At least **5 distinct skeleton implementations** coexist: `SkeletonPulse/SkeletonTable`, `hierarchy/TableSkeleton`, `project-work-hub shared-components SkeletonRows`, `releasehub/SkeletonRows`, `ForYouTableSkeleton`, plus shadcn `ui/skeleton`.

### D5 — Filter bar / toolbar

**65 files** named `*Toolbar*` / `*FilterBar*` exist under `src/` (excluding tests/stories/css). Recommended standard: `JiraBasicFilter` (`src/components/shared/JiraBasicFilter.tsx`) for Jira-style basic filtering + `CatalystListToolbar` (CatalystListPage family) for list screens. Notable: two **diverged copies** of JiraBasicFilter.css — `src/components/for-you/JiraBasicFilter.css` (12,219 B) vs `src/components/shared/JiraBasicFilter.css` (17,170 B); `diff -q` confirms they differ.

### D6 — Create-item entry point

**Recommended standard: `@atlaskit/modal-dialog` create modal** — best exemplar `src/components/releasehub/CreateReleaseModal.tsx` (rebuilt 2026-06-18 on @atlaskit/modal-dialog + @atlaskit/select, lines 4, 13).

| Hub | Create pattern | Foundation |
|---|---|---|
| project-hub | CreateWorkItemModal, CreateProjectModal, SprintCreateModal, ReleaseCreateModal | mixed |
| producthub | CreateRequestDrawer (×5) | Drawer, not Modal |
| releasehub | CreateReleaseModal, CreateChgModal, CreateFreezeWindowModal, CreateSopTemplateModal | @atlaskit/modal-dialog |
| admin | CreateEditRoleModal | — |
| enterprise/OKR | CreateObjectiveDialogV2 (okr-v2) | dialog v2 variant |
| risks | CreateEditRiskDialog | **shadcn `@/components/ui/dialog`** (file lines 14–20) |

---

## Findings

### CAT-AUDIT-1050 — Three parallel page-header systems across hubs
- **Category**: Cross-surface consistency / Header
- **Severity**: High
- **Surface**: All hubs
- **Route**: hub-wide
- **Component**: ProjectPageHeader vs CatalystPageHeader vs ads PageHeader
- **File Path**: `src/components/layout/ProjectPageHeader.tsx`, `src/components/shared/CatalystPageHeader.tsx`, `src/components/ads/PageHeader.tsx`
- **Mode**: both
- **CRE**: Grid E defines ProjectPageHeader L1/L2 as the header standard; CatalystPageHeader and ads PageHeader are parallel non-Grid-E systems
- **ADS**: all three token-based; inconsistency is structural not color
- **Typography**: heading size/weight differs between the three (breadcrumb+H2 vs title-only)
- **Performance**: n/a
- **Accessibility**: breadcrumb nav landmark present only on ProjectPageHeader surfaces
- **Evidence**: import census — project-hub 13×PPH + 8×CPH (two systems inside one hub); producthub 5×CPH/0×PPH; admin 5×ads PageHeader; enterprise 3×CPH
- **Why**: users get different breadcrumb/header anatomy per hub; violates CRE Grid E
- **Recommended Fix**: declare ProjectPageHeader the single standard; migrate CatalystPageHeader and ads PageHeader call-sites or formally wrap them over PPH
- **Regression Risk**: Medium — header spacing shifts on ~30 pages
- **Validation Required**: screenshot per migrated hub landing page, light+dark
- **Suggested PR**: `chore(headers): converge producthub/enterprise/admin on ProjectPageHeader`

### CAT-AUDIT-1051 — Product Hub Ideas pages have no canonical header at all
- **Category**: Header · **Severity**: High · **Surface**: Product Hub
- **Route**: /product-hub/ideas/* · **Component**: page-local header divs
- **File Path**: `src/pages/producthub/IdeasBacklogPage.tsx`, `IdeasBoardPage.tsx`, `IdeasRoadmapPage.tsx`, `IdeasThemePage.tsx`, `IdeasAnalyticsPage.tsx`, `RoadmapPage.tsx`
- **Mode**: both · **CRE**: Grid E violation (no L1/L2) · **ADS**: pages use local `dk = isDark ? DK : LK` constant maps (IdeasBacklogPage.tsx:68) instead of ds tokens · **Typography**: ad-hoc · **Performance**: n/a · **Accessibility**: no breadcrumb nav
- **Evidence**: grep — 6/11 producthub pages match no `PageHeader` import
- **Why**: Ideas suite is visually orphaned from every other hub
- **Recommended Fix**: mount ProjectPageHeader with product-hub breadcrumbs on the 6 pages
- **Regression Risk**: Low–Medium · **Validation Required**: screenshots of all 6 pages
- **Suggested PR**: `feat(producthub): ProjectPageHeader on Ideas suite`

### CAT-AUDIT-1052 — Admin: 18 of 23 top-level pages hand-roll their header
- **Category**: Header · **Severity**: Medium · **Surface**: Admin
- **Route**: /admin/* · **Component**: hand-rolled headings · **File Path**: `src/pages/admin/*.tsx` (only 5 files import a PageHeader)
- **Mode**: both · **CRE**: no Grid E header · **ADS**: varies per page · **Typography**: inconsistent H1/H2 sizing · **Performance**: n/a · **Accessibility**: inconsistent heading hierarchy
- **Evidence**: `grep -rln "PageHeader" src/pages/admin | wc -l` → 5; `ls src/pages/admin/*.tsx | wc -l` → 23
- **Why**: enterprise admin is the surface CLAUDE.md flags for canonical-first; least consistent hub
- **Recommended Fix**: sweep admin pages onto ads PageHeader (or PPH if Grid E extended to admin)
- **Regression Risk**: Low · **Validation Required**: screenshot sample (AdminOverview, UserAccessPage, FeatureFlagsPage)
- **Suggested PR**: `chore(admin): canonical PageHeader sweep`

### CAT-AUDIT-1053 — RisksGridPage: fully bespoke chrome (shadcn table + lucide icons + ui/input)
- **Category**: Header+Table+Toolbar · **Severity**: High · **Surface**: Risks
- **Route**: /risks · **Component**: RisksGridPage · **File Path**: `src/pages/risks/RisksGridPage.tsx`
- **Mode**: both · **CRE**: violates Grid E + JiraTable rule · **ADS**: `import { Search } from "lucide-react"` (line 6) bypasses `@/lib/atlaskit-icons`; shadcn Input/Checkbox/DropdownMenu · **Typography**: shadcn defaults · **Performance**: n/a · **Accessibility**: shadcn table semantics differ from JiraTable keyboard nav
- **Evidence**: lines 5–36 — `Table/TableBody/TableCell...` from `@/components/ui/table`, `Input` from `@/components/ui/input`, lucide `Search`
- **Why**: risks is a work-item list surface — JiraTable is mandatory per CLAUDE.md
- **Recommended Fix**: rebuild on BacklogPage-adapter pattern (see IncidentListPage) or JiraTable
- **Regression Risk**: Medium — ROAM badge/detail-panel wiring must be preserved
- **Validation Required**: DOM probe of sort/filter + screenshots
- **Suggested PR**: `feat(risks): migrate RisksGridPage to JiraTable`

### CAT-AUDIT-1054 — ForYouTable is a 31K hand-rolled `<table>`
- **Category**: Table · **Severity**: High · **Surface**: For You
- **Route**: /for-you · **Component**: ForYouTable · **File Path**: `src/components/for-you/ForYouTable.tsx`
- **Mode**: both · **CRE**: JiraTable rule violation (work-item list) · **ADS**: styled via `pb-table` CSS class, not component-owned · **Typography**: bespoke · **Performance**: 31.1K single component, no virtualization evidence · **Accessibility**: hand-rolled th/td (14 raw tags), keyboard nav not inherited from JiraTable
- **Evidence**: line 457 `<table className="pb-table" style={{...minWidth: 1100}}>`; 0 JiraTable/DynamicTable imports
- **Why**: For You lists Jira work items — the exact surface JiraTable is mandatory for
- **Recommended Fix**: adapter onto JiraTable (columns/lozenges already exist in shared/JiraTable)
- **Regression Risk**: High — Jira-parity styling was hand-tuned (see ForYouHeader parity notes); needs PO sign-off
- **Validation Required**: side-by-side screenshot vs Jira /jira/for-you
- **Suggested PR**: `refactor(for-you): ForYouTable on JiraTable`

### CAT-AUDIT-1055 — Product Hub Ideas list surfaces use raw `<table>`
- **Category**: Table · **Severity**: High · **Surface**: Product Hub
- **Route**: /product-hub/ideas · **Component**: IdeasBacklogPage, IdeationPage
- **File Path**: `src/pages/producthub/IdeasBacklogPage.tsx:217`, `src/pages/producthub/IdeationPage.tsx:358`
- **Mode**: both (theme via local DK/LK maps) · **CRE**: JiraTable rule violation · **ADS**: inline styles + `dk.*` constants, e.g. line 216 nested `var(--cp-bg-elevated, var(--cp-bg-elevated, ...))` (broken fallback nesting) · **Typography**: inline font sizes · **Performance**: no pagination/virtualization evidence · **Accessibility**: no sort semantics
- **Evidence**: `<table style={{ width: '100%', borderCollapse: 'collapse' }}>` at both cited lines
- **Why**: ideas backlog is a backlog — sibling of /project-hub backlog which is canonical
- **Recommended Fix**: BacklogPage data-adapter pattern (proven by IncidentListPage) or JiraTable
- **Regression Risk**: Medium · **Validation Required**: DOM probe sort/filter + screenshots
- **Suggested PR**: `feat(producthub): Ideas backlog on canonical BacklogPage adapter`

### CAT-AUDIT-1056 — Enterprise pages use raw Tailwind tables
- **Category**: Table · **Severity**: Medium · **Surface**: Enterprise
- **Route**: /enterprise/* · **Component**: DemandSummaryPage, EnterpriseObjectives
- **File Path**: `src/pages/enterprise/DemandSummaryPage.tsx:546,589`, `src/pages/enterprise/EnterpriseObjectives.tsx:125`
- **Mode**: both · **CRE**: JiraTable-first for enterprise admin lists · **ADS**: `className="w-full text-xs"` — Tailwind sizing utility · **Typography**: text-xs off ADS scale · **Performance**: n/a · **Accessibility**: unmanaged table semantics
- **Evidence**: `<table className="w-full text-xs">` ×2, `<table className="w-full">` ×1
- **Why**: enterprise admin lists are first-candidate JiraTable surfaces per CLAUDE.md
- **Recommended Fix**: JiraTable or ads DynamicTable
- **Regression Risk**: Low–Medium · **Validation Required**: screenshots · **Suggested PR**: `chore(enterprise): canonical tables for demand/objectives`

### CAT-AUDIT-1057 — Admin mixes JiraTable and raw @atlaskit/dynamic-table
- **Category**: Table · **Severity**: Low · **Surface**: Admin
- **Route**: /admin/test/* vs /admin/quarters · **Component**: TestCaseTypesPage, TestPrioritiesPage, TestRunStatusesPage (DynamicTable) vs QuartersAdminPage etc. (JiraTable)
- **File Path**: `src/pages/admin/test/*.tsx`, `src/pages/admin/QuartersAdminPage.tsx`
- **Mode**: both · **CRE**: two canonical-ish tables in one hub · **ADS**: both compliant · **Typography**: differs (DynamicTable default vs JiraTable Jira-parity) · **Performance**: n/a · **Accessibility**: both acceptable
- **Evidence**: import census — 4×JiraTable + 3×`DynamicTable from '@atlaskit/dynamic-table'` in src/pages/admin
- **Why**: same hub, two table looks; pick one per surface class
- **Recommended Fix**: document rule — JiraTable for work-item-like lists, ads DynamicTable acceptable for small config lists — then align the outliers
- **Regression Risk**: Low · **Validation Required**: screenshots · **Suggested PR**: `docs(cre): admin table rule + align test/* pages`

### CAT-AUDIT-1058 — Incident Hub adapter pattern is the model; not reused by sibling hubs
- **Category**: Table / Architecture · **Severity**: Medium (opportunity) · **Surface**: Incident Hub (positive) vs Product Hub/Risks/For You (negative)
- **Route**: /incident-hub · **Component**: IncidentListPage → BacklogPage + useIncidentsBacklogSource
- **File Path**: `src/pages/incidenthub/IncidentListPage.tsx` (header comment lines 1–17), `src/modules/project-work-hub/pages/BacklogPage.atlaskit.tsx`
- **Mode**: both · **CRE**: exemplary Grid E/JiraTable adoption · **ADS**: inherits canonical · **Typography**: inherited · **Performance**: inherited pagination · **Accessibility**: inherited keyboard nav
- **Evidence**: file documents "switched from bespoke chrome + JiraTable to the canonical BacklogPage with an incidents data adapter" (2026-06-16)
- **Why**: proves the adapter pattern works; Ideas backlog, Risks grid, For You table did not adopt it
- **Recommended Fix**: designate BacklogPage+adapter as the standard for all work-item list hubs
- **Regression Risk**: n/a (documentation/standardization) · **Validation Required**: n/a · **Suggested PR**: `docs(cre): BacklogPage adapter as list-surface standard`

### CAT-AUDIT-1059 — Release Hub ships its own Tailwind EmptyState/ErrorState
- **Category**: Empty state · **Severity**: Medium · **Surface**: Release Hub
- **Route**: /release-hub/* · **Component**: releasehub EmptyState
- **File Path**: `src/components/releasehub/EmptyState.tsx` (7 imports across src/pages/releasehub)
- **Mode**: both · **CRE**: hand-rolled empty state (banned category in CLAUDE.md) · **ADS**: `text-white` (line 14, bare Tailwind color), `text-[14px] font-bold` hard-coded, `RH.fontDisplay`/`RH.ink2` constants from `src/constants/releasehub.design.ts` · **Typography**: off-token 14px bold · **Performance**: n/a · **Accessibility**: aria-live="polite" present (good)
- **Evidence**: VARIANT_CLASSES includes `text-white`; heading styled via RH constant object
- **Why**: `@atlaskit/empty-state` is already in the codebase (project-work-hub, testhub, admin)
- **Recommended Fix**: replace with `@atlaskit/empty-state`, retire RH color constants from this component
- **Regression Risk**: Low · **Validation Required**: dark-mode screenshot of an empty release list
- **Suggested PR**: `chore(releasehub): @atlaskit/empty-state adoption`

### CAT-AUDIT-1060 — Product Hub inline emoji empty state
- **Category**: Empty state · **Severity**: Low · **Surface**: Product Hub
- **Route**: /product-hub/ideas backlog · **Component**: IdeasBacklogPage inline JSX
- **File Path**: `src/pages/producthub/IdeasBacklogPage.tsx:209–214`
- **Mode**: both · **CRE**: hand-rolled empty state · **ADS**: uses ds font-size tokens but `dk.t1/dk.t3` custom color map · **Typography**: ok-ish · **Performance**: n/a · **Accessibility**: emoji `💡` unlabelled
- **Evidence**: `<div style={{ fontSize: '48px' }}>💡</div>` + "No ideas yet"
- **Why**: no other hub uses emoji empty states; visual outlier
- **Recommended Fix**: `@atlaskit/empty-state` with proper illustration or none
- **Regression Risk**: Low · **Validation Required**: screenshot · **Suggested PR**: fold into 1055 PR

### CAT-AUDIT-1061 — For You maintains two bespoke empty-state components alongside atlaskit
- **Category**: Empty state · **Severity**: Low · **Surface**: For You
- **Route**: /for-you · **Component**: ForYouEmptyState (helpers) ×4 imports, StarredEmptyState ×2, plus 1× `@atlaskit/empty-state`
- **File Path**: `src/components/for-you/helpers.tsx`, `src/components/for-you/StarredEmptyState.tsx`
- **Mode**: both · **CRE**: mixed pattern within one surface · **ADS**: not audited per-file here · **Typography**: bespoke · **Performance**: n/a · **Accessibility**: unverified
- **Evidence**: import census in D3 table
- **Why**: three empty-state systems on one page family
- **Recommended Fix**: converge on one (atlaskit, or the Jira-parity bespoke if PO requires parity — document the choice)
- **Regression Risk**: Low · **Validation Required**: screenshots per tab · **Suggested PR**: `chore(for-you): single empty-state system`

### CAT-AUDIT-1062 — Product Hub has zero Spinner/Skeleton: text-only loading
- **Category**: Loading · **Severity**: Medium · **Surface**: Product Hub
- **Route**: /product-hub/ideas/* · **Component**: inline text
- **File Path**: `src/pages/producthub/IdeasBacklogPage.tsx:208` ("Loading ideas..."), `src/pages/producthub/IdeasRoadmapPage.tsx:77` ("Loading...")
- **Mode**: both · **CRE**: spinner/skeleton is a banned hand-roll category · **ADS**: text color via `dk.t3` custom map · **Typography**: ad-hoc · **Performance**: perceived-perf regression vs skeletons elsewhere · **Accessibility**: no busy/role indication
- **Evidence**: grep — 0 Spinner/Skeleton imports in src/pages/producthub; cited lines
- **Why**: every other hub uses @atlaskit/spinner or a skeleton
- **Recommended Fix**: `@atlaskit/spinner` minimum; SkeletonRows if adopting BacklogPage
- **Regression Risk**: Low · **Validation Required**: throttled-network screenshot · **Suggested PR**: fold into 1055 PR

### CAT-AUDIT-1063 — Five-plus divergent skeleton implementations across hubs
- **Category**: Loading · **Severity**: Medium · **Surface**: cross-hub
- **Route**: various · **Component**: SkeletonTable/SkeletonPulse (project-hub), TableSkeleton (hierarchy), SkeletonRows (project-work-hub shared-components), SkeletonRows (releasehub — same name, different file), ForYouTableSkeleton, shadcn ui/skeleton (incidenthub, enterprise)
- **File Path**: `src/components/project-hub/shared/SkeletonPulse.tsx`, `src/components/hierarchy/TableSkeleton.tsx`, `src/modules/project-work-hub/.../shared-components`, `src/components/releasehub/SkeletonRows.tsx`, `src/components/for-you/ForYouTableSkeleton.tsx`, `src/components/ui/skeleton.tsx`
- **Mode**: both · **CRE**: no canonical skeleton exists — root cause · **ADS**: shadcn skeleton uses Tailwind pulse defaults · **Typography**: n/a · **Performance**: n/a · **Accessibility**: none announce loading state consistently
- **Evidence**: D4 census; two unrelated components both named `SkeletonRows`
- **Why**: identical loading UX rebuilt per hub; name collision invites wrong-import bugs
- **Recommended Fix**: promote one table-skeleton to `src/components/shared/` and register in CRE; deprecate the rest
- **Regression Risk**: Low · **Validation Required**: loading-state screenshots per hub · **Suggested PR**: `refactor(shared): canonical TableSkeleton`

### CAT-AUDIT-1064 — Error handling absent or bespoke outside admin/project-hub
- **Category**: Error handling · **Severity**: Medium · **Surface**: producthub, testhub, incidenthub, enterprise, for-you
- **Route**: hub-wide · **Component**: SectionMessage adoption gap
- **File Path**: census — SectionMessage imports: admin 11, project-hub 5, all other hubs 0; releasehub uses custom `ErrorState` (`src/components/releasehub/EmptyState.tsx`)
- **Mode**: both · **CRE**: no declared error-state standard · **ADS**: custom ErrorState shares 1059's Tailwind issues · **Typography**: n/a · **Performance**: n/a · **Accessibility**: query errors likely render nothing (silent failure) in producthub/testhub
- **Evidence**: `grep "import SectionMessage|import { SectionMessage"` per hub (D4 table)
- **Why**: fetch failures present inconsistently — banner in admin, custom card in releasehub, nothing in producthub/testhub
- **Recommended Fix**: standard = ads `SectionMessage` (appearance=error) with retry; add to CRE rulebook
- **Regression Risk**: Low · **Validation Required**: forced-error DOM probe per hub · **Suggested PR**: `feat(shared): standard query-error SectionMessage`

### CAT-AUDIT-1065 — 65 distinct Toolbar/FilterBar files; no declared standard
- **Category**: Filter bar · **Severity**: High · **Surface**: cross-hub
- **Route**: various · **Component**: 65 files matching `*Toolbar*`/`*FilterBar*` under src/ (excl. tests/stories/css) — incl. ProjectToolbar, WorkItemsToolbar, AllProjectsToolbar, ForYouToolbar, ReleasesToolbar, FacetFilterBar, KanbanToolbar (×2 paths), BoardToolbar, StoriesToolbar, GoalsToolbar, ScopeFilterBar, ReportFilterBar, ListScreenToolbar, CatalystListToolbar, unified-toolbar, BasicFilterBar…
- **File Path**: see D5; canonical candidates `src/components/shared/JiraBasicFilter.tsx`, `src/components/shared/CatalystListPage/CatalystListToolbar.tsx`
- **Mode**: both · **CRE**: no toolbar rule registered · **ADS**: varies per file · **Typography**: varies · **Performance**: n/a · **Accessibility**: varies
- **Evidence**: `find src -iname "*Toolbar*" -o -iname "*FilterBar*" | grep -v tests/stories/css | wc -l` → 65
- **Why**: highest-entropy dimension in this lane; every new surface hand-rolls a toolbar
- **Recommended Fix**: declare JiraBasicFilter (filter row) + CatalystListToolbar (list-screen actions) the standards in CATALYST_CANONICAL_RULEBOOK; new toolbars require unsuitability proof
- **Regression Risk**: n/a (rule first, migrations per-slice) · **Validation Required**: n/a · **Suggested PR**: `docs(cre): toolbar/filterbar canonical rule`

### CAT-AUDIT-1066 — Diverged fork of JiraBasicFilter.css in for-you
- **Category**: Filter bar / Dead-code risk · **Severity**: Medium · **Surface**: For You
- **Route**: /for-you · **Component**: JiraBasicFilter styling fork
- **File Path**: `src/components/for-you/JiraBasicFilter.css` (12,219 B) vs `src/components/shared/JiraBasicFilter.css` (17,170 B)
- **Mode**: both · **CRE**: single-source-of-truth violation · **ADS**: unaudited fork drifts from shared fixes · **Typography**: fork frozen at copy date · **Performance**: duplicate CSS shipped · **Accessibility**: fixes to shared copy don't reach for-you
- **Evidence**: `diff -q` → "Files ... differ"; sizes 12.2K vs 17.2K
- **Why**: shared JiraBasicFilter.css gained ~5K of fixes the for-you copy never received (or vice versa)
- **Recommended Fix**: diff the two, merge deltas into shared, delete the for-you copy, import shared
- **Regression Risk**: Medium — for-you filter chips styling · **Validation Required**: for-you filter row screenshot before/after
- **Suggested PR**: `fix(for-you): dedupe JiraBasicFilter.css`

### CAT-AUDIT-1067 — Create-item entry points split across three foundations
- **Category**: Create entry point · **Severity**: Medium · **Surface**: cross-hub
- **Route**: various · **Component**: releasehub modals (@atlaskit/modal-dialog — `CreateReleaseModal.tsx:13`), producthub `CreateRequestDrawer` (drawer pattern, 5 imports), risks `CreateEditRiskDialog` (shadcn `@/components/ui/dialog`, lines 14–20), okr-v2 `CreateObjectiveDialogV2`
- **File Path**: `src/components/releasehub/CreateReleaseModal.tsx`, `src/components/producthub/shared/CreateRequestDrawer.tsx`, `src/components/risks/CreateEditRiskDialog.tsx`, `src/modules/okr-v2/components/CreateObjectiveDialogV2.tsx`
- **Mode**: both · **CRE**: modal pattern rule exists in CATALYST_CANONICAL_RULEBOOK; risks violates via shadcn · **ADS**: shadcn dialog styling off-system · **Typography**: differs per foundation · **Performance**: n/a · **Accessibility**: @atlaskit/modal-dialog focus-trap vs shadcn differences
- **Evidence**: import census D6
- **Why**: "create X" feels different in every hub; risks is on a banned primitive
- **Recommended Fix**: standard = @atlaskit/modal-dialog create modal (CreateReleaseModal as exemplar); migrate CreateEditRiskDialog first (shadcn), then decide drawer-vs-modal policy for producthub with PO
- **Regression Risk**: Medium (form state) · **Validation Required**: create-flow CRUD probe per migrated dialog
- **Suggested PR**: `chore(risks): CreateEditRiskDialog on @atlaskit/modal-dialog`

### CAT-AUDIT-1068 — CatalystListPageLayout adopted by only ~7 surfaces
- **Category**: Layout · **Severity**: Medium · **Surface**: cross-hub
- **Route**: adopted: project-hub filters/roadmaps/sprints/releases, product-hub milestones, incidents analytics report, board manager. Not adopted: releasehub AllReleases/filters, testhub FiltersListPage, incidenthub IncidentFiltersListPage, producthub lists
- **Component**: CatalystListPageLayout · **File Path**: `src/components/shared/CatalystListPage/CatalystListPageLayout.tsx`; adopters per grep: `src/pages/project-hub/{filters/FiltersListPage,roadmaps/RoadmapsListPage,SprintsPage,ReleasesPage}.tsx`, `src/pages/product-hub/MilestonesPage.tsx`, `src/modules/incidents/analytics/pages/IncidentReportPage.tsx`, `src/components/boards/BoardManagerPage.tsx`
- **Mode**: both · **CRE**: listed in RULE_TABLE.md yet siblings ignore it · **ADS**: compliant · **Typography**: n/a · **Performance**: n/a · **Accessibility**: consistent landmarks where adopted
- **Evidence**: `grep -rln "CatalystListPageLayout" src` → 11 files (4 infra/docs + 7 surfaces)
- **Why**: near-identical "filters list" pages exist in project-hub (canonical), testhub, incidenthub, releasehub — only project-hub uses the layout
- **Recommended Fix**: migrate the three sibling FiltersListPage surfaces onto CatalystListPageLayout
- **Regression Risk**: Low · **Validation Required**: screenshots of 3 filters-list pages
- **Suggested PR**: `chore(list-pages): CatalystListPageLayout for testhub/incidenthub/releasehub filters lists`

### CAT-AUDIT-1069 — Incident Hub / Enterprise loading uses shadcn Skeleton
- **Category**: Loading · **Severity**: Low · **Surface**: Incident Hub, Enterprise
- **Route**: /incident-hub timeline+insights, /enterprise · **Component**: shadcn Skeleton
- **File Path**: imports of `@/components/ui/skeleton` — 2 files in `src/pages/incidenthub`, 1 in `src/pages/enterprise`
- **Mode**: both · **CRE**: shadcn banned in new code (eslint §20.2 warn-only, per LANE-04) · **ADS**: Tailwind pulse styling · **Typography**: n/a · **Performance**: n/a · **Accessibility**: no aria-busy
- **Evidence**: D4 census rows
- **Why**: contributes to skeleton fragmentation (see 1063) with a banned primitive
- **Recommended Fix**: swap to the canonical skeleton chosen in 1063
- **Regression Risk**: Low · **Validation Required**: loading screenshots · **Suggested PR**: fold into 1063 PR

### CAT-AUDIT-1070 — Project Hub itself runs two header systems (13 PPH vs 8 CPH)
- **Category**: Header · **Severity**: Medium · **Surface**: Project Hub
- **Route**: /project-hub/* · **Component**: ProjectPageHeader (13 imports) + CatalystPageHeader (8 imports) in the same hub
- **File Path**: `src/pages/project-hub/**` (import census)
- **Mode**: both · **CRE**: Grid E says PPH; 8 pages drifted · **ADS**: both token-based · **Typography**: breadcrumb+H2 vs title-only mismatch within one nav tree · **Performance**: n/a · **Accessibility**: breadcrumb present on some sibling pages, absent on others
- **Evidence**: D1 census row
- **Why**: even the reference hub is internally split — blocks using it as the exemplar until fixed
- **Recommended Fix**: enumerate the 8 CPH call-sites, migrate to PPH
- **Regression Risk**: Low · **Validation Required**: screenshots of migrated pages · **Suggested PR**: `chore(project-hub): PPH on remaining 8 pages`

---

## Lane Summary

**21 findings recorded (CAT-AUDIT-1050…1070, 4 High / 12 Medium / 5 Low across the numbered set).** No hub is fully consistent with any other on any of the six dimensions.

**Recommended standards (best existing implementations):**
1. **Header**: `ProjectPageHeader` (CRE Grid E) — deviators: producthub (0 uses), admin (own ads PageHeader, 18/23 hand-rolled), enterprise (CPH), risks/for-you (none), project-hub itself (8 CPH strays).
2. **Table**: `JiraTable`, delivered via the **BacklogPage + data-adapter pattern proven by `IncidentListPage`** — deviators: for-you (hand-rolled 31K table), producthub (raw `<table>` ×2), risks (shadcn table), enterprise (Tailwind tables).
3. **Empty state**: `@atlaskit/empty-state` — deviators: releasehub (custom Tailwind EmptyState with `text-white`), producthub (inline emoji), for-you (2 bespoke variants).
4. **Loading/error**: `@atlaskit/spinner` + canonical skeleton + `SectionMessage` errors — deviators: producthub (text-only loading, no error UI), incidenthub/enterprise (shadcn Skeleton), 5+ skeleton forks incl. a `SkeletonRows` name collision; SectionMessage exists only in admin+project-hub.
5. **Filter bar**: `JiraBasicFilter` + `CatalystListToolbar` — 65 Toolbar/FilterBar files exist; for-you carries a diverged 12K fork of JiraBasicFilter.css.
6. **Create entry**: `@atlaskit/modal-dialog` create modal (exemplar `CreateReleaseModal`) — deviators: risks (shadcn dialog), producthub (drawer), okr-v2 (DialogV2 variant).

**Highest-leverage fixes**: (a) publish the six standards in CATALYST_CANONICAL_RULEBOOK so drift becomes lintable; (b) migrate Risks grid and Product Hub Ideas backlog onto the IncidentListPage adapter pattern — each removes 3–4 findings in one slice; (c) dedupe JiraBasicFilter.css before the fork drifts further.
